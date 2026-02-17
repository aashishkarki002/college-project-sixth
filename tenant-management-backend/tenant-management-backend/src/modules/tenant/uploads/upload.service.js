// services/upload.service.js
import cloudinary from "../../../config/cloudinary.js";
import { Readable } from "stream";

/**
 * ✅ STREAM-BASED upload (no disk I/O)
 * Industry standard for handling file uploads in Node.js
 */
function bufferToStream(buffer) {
  const readable = new Readable();
  readable._read = () => {}; // Required by Node.js
  readable.push(buffer);
  readable.push(null);
  return readable;
}

function isPdfFile(file) {
  const mimeType = file.mimetype || "";
  const originalName = file.originalname || "";
  return (
    mimeType === "application/pdf" ||
    mimeType === "application/x-pdf" ||
    originalName.toLowerCase().endsWith(".pdf")
  );
}

/**
 * Upload single file with proper error handling
 */
export async function uploadSingleFile(file, options = {}) {
  const {
    folder = "uploads",
    imageTransform = [{ width: 1000, height: 1000, crop: "limit" }],
  } = options;

  const isPdf = isPdfFile(file);

  return new Promise((resolve, reject) => {
    const uploadOptions = {
      folder,
      use_filename: true,
      unique_filename: true,
    };
    if (isPdf) {
      // ✅ PDF-specific configuration
      uploadOptions.resource_type = "image"; // NOT "raw"!
      uploadOptions.format = "pdf"; // Preserve PDF format
      uploadOptions.flags = "attachment"; // Force download instead of inline display
      // No transformations for PDFs
    } else {
      // ✅ Image configuration
      uploadOptions.resource_type = "image";
      uploadOptions.transformation = imageTransform;
    }
    const uploadStream = cloudinary.uploader.upload_stream(
      uploadOptions,
      (error, result) => {
        if (error) {
          console.error(`[Cloudinary] Upload failed:`, error);
          return reject(new Error(`Upload failed: ${error.message}`));
        }
        const url = isPdf
          ? result.secure_url.replace(/\.(jpg|png|gif)$/, ".pdf") // Ensure .pdf extension
          : result.secure_url;

        console.log(`✅ Uploaded ${isPdf ? "PDF" : "Image"}: ${url}`);

        resolve({
          url,
          publicId: result.public_id,
          resourceType: result.resource_type,
          format: result.format,
          uploadedAt: new Date(),
        });
      },
    );

    // ✅ Pipe buffer directly (no disk I/O)
    bufferToStream(file.buffer).pipe(uploadStream);
  });
}

/**
 * Upload multiple files with parallel processing
 */
export async function uploadFiles(files, options = {}) {
  if (!files || files.length === 0) return [];

  try {
    // ✅ Parallel uploads (faster than sequential)
    const uploadPromises = files.map((file) =>
      uploadSingleFile(file, options).catch((err) => {
        console.error(`Failed to upload ${file.originalname}:`, err);
        return null; // Don't fail entire batch
      }),
    );

    const results = await Promise.all(uploadPromises);
    return results.filter((r) => r !== null); // Remove failed uploads
  } catch (error) {
    console.error("[uploadFiles] Batch upload error:", error);
    throw new Error(`Batch upload failed: ${error.message}`);
  }
}
