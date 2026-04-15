import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export { cloudinary };

export async function uploadBuffer(
  buffer: Buffer,
  options: { folder?: string; resource_type?: "image" | "video" | "raw" | "auto" } = {}
): Promise<{ url: string; publicId: string; originalFilename?: string }> {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: options.folder ?? "support-attachments",
        resource_type: options.resource_type ?? "auto",
        use_filename: true,
        unique_filename: true,
      },
      (error, result) => {
        if (error || !result) return reject(error ?? new Error("Upload failed"));
        resolve({ url: result.secure_url, publicId: result.public_id, originalFilename: result.original_filename });
      }
    );
    stream.end(buffer);
  });
}
