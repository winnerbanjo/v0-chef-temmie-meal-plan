/**
 * Cloudinary helper.
 * Configured only when CLOUDINARY_* env vars are present. Used to upload
 * product images and meal-plan files. The app falls back to seeded URLs
 * (local public assets) when Cloudinary is not configured, so the flow
 * works in preview without keys.
 */
export async function uploadToCloudinary(
  file: string,
  options: { folder?: string; resourceType?: "image" | "raw" | "auto" } = {},
): Promise<string | null> {
  const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
    console.log("[v0] Cloudinary not configured, skipping upload")
    return null
  }

  try {
    const { v2: cloudinary } = await import("cloudinary")
    cloudinary.config({
      cloud_name: CLOUDINARY_CLOUD_NAME,
      api_key: CLOUDINARY_API_KEY,
      api_secret: CLOUDINARY_API_SECRET,
    })
    const res = await cloudinary.uploader.upload(file, {
      folder: options.folder ?? "chef-temmie",
      resource_type: options.resourceType ?? "auto",
    })
    return res.secure_url
  } catch (err) {
    console.log("[v0] Cloudinary upload error:", err)
    return null
  }
}
