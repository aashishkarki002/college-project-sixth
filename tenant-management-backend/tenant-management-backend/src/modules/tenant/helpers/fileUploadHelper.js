// helpers/fileUploadHelper.js
import { uploadFiles, uploadSingleFile } from "../uploads/upload.service.js";

/**
 * Process document uploads from multipart form
 * ✅ Now includes 'type' field required by Mongoose schema
 */
export default async function buildDocumentsFromFiles(files) {
  if (!files) return [];

  const documents = [];

  const fieldMap = {
    image: { folder: "tenants/images", label: "Profile Image" },
    pdfAgreement: { folder: "tenants/agreements", label: "Agreement" },
    citizenShip: { folder: "tenants/citizenship", label: "Citizenship" },
    bank_guarantee: {
      folder: "tenants/bank-guarantees",
      label: "Bank Guarantee",
    },
    cheque: { folder: "tenants/cheques", label: "Cheque" },
    company_docs: {
      folder: "tenants/company-docs",
      label: "Company Documents",
    },
    tax_certificate: {
      folder: "tenants/tax-certificates",
      label: "Tax Certificate",
    },
    other: { folder: "tenants/other", label: "Other Documents" },
  };

  const uploadOptions = {
    imageTransform: [{ width: 1500, height: 1500, crop: "limit" }],
  };

  for (const [fieldName, config] of Object.entries(fieldMap)) {
    if (files[fieldName]) {
      try {
        const fileArray = Array.isArray(files[fieldName])
          ? files[fieldName]
          : [files[fieldName]];

        const uploaded = await uploadFiles(fileArray, {
          ...uploadOptions,
          folder: config.folder,
        });

        // ✅ Schema expects documents[].files[].url (not documents[].url)
        documents.push({
          type: fieldName,
          files: uploaded.map((file) => ({
            url: file.url,
            uploadedAt: file.uploadedAt,
          })),
        });
      } catch (error) {
        console.error(`[${fieldName}] Upload failed:`, error.message);
        throw new Error(`Failed to upload ${fieldName}: ${error.message}`);
      }
    }
  }

  return documents;
}

export { uploadSingleFile };
