import { jest } from "@jest/globals";
import request from "supertest";
import mongoose from "mongoose";

const applyPaymentToBankMock = jest.fn().mockResolvedValue({ _id: "bank-id" });
const ledgerMock = { postJournalEntry: jest.fn().mockResolvedValue({ transaction: {}, ledgerEntries: [] }) };
const revenueMock = {
  recordRentRevenue: jest.fn().mockResolvedValue(),
  createRevenue: jest.fn().mockResolvedValue(),
  getRevenue: jest.fn().mockResolvedValue({}),
  getAllRevenue: jest.fn().mockResolvedValue([]),
};

const emitPaymentNotificationMock = jest.fn().mockResolvedValue();
const handleReceiptSideEffectsMock = jest.fn().mockResolvedValue();
const sendEmailMock = jest.fn().mockResolvedValue();

jest.unstable_mockModule("../modules/banks/bank.domain.js", () => ({
  applyPaymentToBank: applyPaymentToBankMock,
}));
jest.unstable_mockModule("../modules/ledger/ledger.service.js", () => ({
  ledgerService: ledgerMock,
}));
jest.unstable_mockModule("../modules/revenue/revenue.service.js", () => revenueMock);
jest.unstable_mockModule("../utils/payment.Notification.js", () => ({
  emitPaymentNotification: emitPaymentNotificationMock,
}));
jest.unstable_mockModule("../reciepts/reciept.service.js", () => ({
  handleReceiptSideEffects: handleReceiptSideEffectsMock,
}));
jest.unstable_mockModule("../utils/rentGenrator.js", () => ({
  generatePDFToBuffer: jest.fn().mockResolvedValue(Buffer.from("pdf")),
  uploadPDFBufferToCloudinary: jest
    .fn()
    .mockResolvedValue({ secure_url: "https://mock/receipt.pdf" }),
}));
jest.unstable_mockModule("../config/nodemailer.js", () => ({
  sendEmail: sendEmailMock,
  sendPaymentReceiptEmail: jest.fn().mockResolvedValue(),
  transporter: {
    sendMail: jest.fn().mockResolvedValue(),
    verify: jest.fn(),
  },
}));

jest.unstable_mockModule("../middleware/protect.js", () => ({
  protect: (req, _res, next) => {
    req.admin = { id: new mongoose.Types.ObjectId().toString(), role: "admin" };
    next();
  },
}));

const { default: app } = await import("../app.js");
const { Tenant } = await import("../modules/tenant/Tenant.Model.js");
const { Rent } = await import("../modules/rents/rent.Model.js");
const { Payment } = await import("../modules/payment/payment.model.js");
const { Unit } = await import("../modules/tenant/units/unit.model.js");
const Property = (await import("../modules/tenant/Property.Model.js")).default;
const Block = (await import("../modules/tenant/Block.Model.js")).default;
const InnerBlock = (await import("../modules/tenant/InnerBlock.Model.js"))
  .default;

describe("POST /api/payment/pay-rent", () => {
  it("records payment, updates rent totals, and stores payment record", async () => {
    const property = await Property.create({ name: "Payment Property" });
    const block = await Block.create({ name: "Block B", property: property._id });
    const innerBlock = await InnerBlock.create({
      name: "Inner B1",
      block: block._id,
      property: property._id,
    });
    const unit = await Unit.create({
      name: "Unit B1",
      property: property._id,
      block: block._id,
      innerBlock: innerBlock._id,
    });

    const tenant = await Tenant.create({
      name: "Paying Tenant",
      email: "pay@example.com",
      phone: "9800000000",
      address: "Payment Street",
      documents: [],
      units: [unit._id],
      pricePerSqft: 100,
      leasedSquareFeet: 10,
      camRatePerSqft: 5,
      dateOfAgreementSigned: new Date(),
      leaseStartDate: new Date(),
      leaseEndDate: new Date(),
      keyHandoverDate: new Date(),
      securityDeposit: 1000,
      block: block._id,
      innerBlock: innerBlock._id,
      property: property._id,
    });

    const rent = await Rent.create({
      tenant: tenant._id,
      innerBlock: innerBlock._id,
      block: block._id,
      property: property._id,
      englishMonth: 1,
      englishYear: 2024,
      rentAmount: 1000,
      paidAmount: 0,
      tdsAmount: 0,
      units: [unit._id],
      nepaliMonth: 1,
      nepaliYear: 2080,
      nepaliDate: new Date(),
      createdBy: new mongoose.Types.ObjectId(),
      lateFee: 0,
      lateFeeDate: null,
      lateFeeApplied: false,
      lateFeeStatus: "pending",
      lastPaidDate: null,
      englishDueDate: new Date(),
      nepaliDueDate: new Date(),
      emailReminderSent: false,
    });

    const paymentPayload = {
      rentId: rent._id.toString(),
      tenantId: tenant._id.toString(),
      amount: 600,
      paymentDate: new Date().toISOString(),
      nepaliDate: new Date().toISOString(),
      paymentMethod: "bank_transfer",
      paymentStatus: "paid",
      note: "partial payment",
      receivedBy: new mongoose.Types.ObjectId().toString(),
      bankAccountId: new mongoose.Types.ObjectId().toString(),
    };

    const response = await request(app)
      .post("/api/payment/pay-rent")
      .set("Authorization", "Bearer faketoken")
      .send(paymentPayload);

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);

    const updatedRent = await Rent.findById(rent._id);
    expect(updatedRent?.paidAmount).toBe(600);
    expect(updatedRent?.status).toBe("partially_paid");

    const payment = await Payment.findOne({ rent: rent._id });
    expect(payment).toBeTruthy();
    expect(payment?.amount).toBe(600);
    expect(payment?.paymentMethod).toBe("bank_transfer");

    expect(applyPaymentToBankMock).toHaveBeenCalled();
    expect(ledgerMock.postJournalEntry).toHaveBeenCalled();
    expect(revenueMock.recordRentRevenue).toHaveBeenCalled();
    expect(emitPaymentNotificationMock).toHaveBeenCalled();
    expect(handleReceiptSideEffectsMock).toHaveBeenCalled();
  });

  it("returns 400 when rent does not exist", async () => {
    const paymentPayload = {
      rentId: new mongoose.Types.ObjectId().toString(), // non-existent rent
      tenantId: new mongoose.Types.ObjectId().toString(),
      amount: 500,
      paymentDate: new Date().toISOString(),
      nepaliDate: new Date().toISOString(),
      paymentMethod: "bank_transfer",
      paymentStatus: "paid",
      note: "invalid rent test",
      receivedBy: new mongoose.Types.ObjectId().toString(),
      bankAccountId: new mongoose.Types.ObjectId().toString(),
    };

    const response = await request(app)
      .post("/api/payment/pay-rent")
      .set("Authorization", "Bearer faketoken")
      .send(paymentPayload);

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe("Rent not found");
  });
});
