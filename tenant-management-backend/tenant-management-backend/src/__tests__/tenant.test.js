import { jest } from "@jest/globals";
import request from "supertest";
import mongoose from "mongoose";

const mockedCloudinary = {
  uploader: {
    upload: jest.fn().mockResolvedValue({ secure_url: "https://mock.cloud/doc" }),
  },
};
const sendWelcomeEmailMock = jest.fn().mockResolvedValue();
const ledgerMock = { postJournalEntry: jest.fn().mockResolvedValue({ transaction: {}, ledgerEntries: [] }) };
const createCamMock = jest.fn().mockResolvedValue({ success: true });
const createSdMock = jest.fn().mockResolvedValue({ success: true });

jest.unstable_mockModule("../config/cloudinary.js", () => ({
  default: mockedCloudinary,
}));
jest.unstable_mockModule("../config/nodemailer.js", () => ({
  sendEmail: jest.fn().mockResolvedValue(),
  sendWelcomeEmail: sendWelcomeEmailMock,
  sendPaymentReceiptEmail: jest.fn().mockResolvedValue(),
}));
jest.unstable_mockModule("../modules/ledger/ledger.service.js", () => ({
  ledgerService: ledgerMock,
}));
jest.unstable_mockModule("../modules/tenant/cam/cam.service.js", () => ({
  createCam: createCamMock,
}));
jest.unstable_mockModule(
  "../modules/tenant/securityDeposits/sd.service.js",
  () => ({
    createSd: createSdMock,
  })
);
jest.unstable_mockModule("../middleware/protect.js", () => ({
  protect: (req, _res, next) => {
    req.admin = { id: new mongoose.Types.ObjectId().toString(), role: "admin" };
    next();
  },
}));

const { default: app } = await import("../app.js");
const { Tenant } = await import("../modules/tenant/Tenant.Model.js");
const { Rent } = await import("../modules/rents/rent.Model.js");
const { Unit } = await import("../modules/tenant/units/unit.model.js");
const Property = (await import("../modules/tenant/Property.Model.js")).default;
const Block = (await import("../modules/tenant/Block.Model.js")).default;
const InnerBlock = (await import("../modules/tenant/InnerBlock.Model.js"))
  .default;

describe("POST /api/tenant/create-tenant", () => {
  it("creates tenant, marks unit occupied, and seeds rent + CAM/SD records", async () => {
    const property = await Property.create({ name: "Test Property" });
    const block = await Block.create({ name: "Block A", property: property._id });
    const innerBlock = await InnerBlock.create({
      name: "Inner A1",
      block: block._id,
      property: property._id,
    });
    const unit = await Unit.create({
      name: "Unit 1",
      property: property._id,
      block: block._id,
      innerBlock: innerBlock._id,
    });

    const today = new Date().toISOString();

    const response = await request(app)
      .post("/api/tenant/create-tenant")
      .set("Authorization", "Bearer faketoken")
      .field("name", "John Doe")
      .field("email", "john@example.com")
      .field("phone", "9812345678")
      .field("address", "Sample Street")
      .field("pricePerSqft", "100")
      .field("leasedSquareFeet", "10")
      .field("camRatePerSqft", "5")
      .field("dateOfAgreementSigned", today)
      .field("leaseStartDate", today)
      .field("leaseEndDate", today)
      .field("keyHandoverDate", today)
      .field("securityDeposit", "5000")
      .field("block", block._id.toString())
      .field("innerBlock", innerBlock._id.toString())
      .field("property", property._id.toString())
      .field("units[]", unit._id.toString())
      .attach("citizenShip", Buffer.from("dummy"), "citizen.pdf");

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);

    const tenant = await Tenant.findOne({ email: "john@example.com" });
    expect(tenant).toBeTruthy();
    expect(tenant.units).toHaveLength(1);

    const updatedUnit = await Unit.findById(unit._id);
    expect(updatedUnit?.isOccupied).toBe(true);

    const rent = await Rent.findOne({ tenant: tenant._id });
    expect(rent).toBeTruthy();

    expect(ledgerMock.postJournalEntry).toHaveBeenCalled();
    expect(createCamMock).toHaveBeenCalled();
    expect(createSdMock).toHaveBeenCalled();
  });

  it("returns 400 when required documents are missing", async () => {
    const property = await Property.create({ name: "Test Property 2" });
    const block = await Block.create({ name: "Block B", property: property._id });
    const innerBlock = await InnerBlock.create({
      name: "Inner B1",
      block: block._id,
      property: property._id,
    });
    const unit = await Unit.create({
      name: "Unit 2",
      property: property._id,
      block: block._id,
      innerBlock: innerBlock._id,
    });

    const today = new Date().toISOString();

    const response = await request(app)
      .post("/api/tenant/create-tenant")
      .set("Authorization", "Bearer faketoken")
      .field("name", "Jane Doe")
      .field("email", "jane@example.com")
      .field("phone", "9812345679")
      .field("address", "Another Street")
      .field("pricePerSqft", "120")
      .field("leasedSquareFeet", "8")
      .field("camRatePerSqft", "4")
      .field("dateOfAgreementSigned", today)
      .field("leaseStartDate", today)
      .field("leaseEndDate", today)
      .field("keyHandoverDate", today)
      .field("securityDeposit", "4000")
      .field("block", block._id.toString())
      .field("innerBlock", innerBlock._id.toString())
      .field("property", property._id.toString())
      .field("units[]", unit._id.toString());

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe("At least one document is required");

    const createdTenant = await Tenant.findOne({ email: "jane@example.com" });
    expect(createdTenant).toBeNull();
  });
});
