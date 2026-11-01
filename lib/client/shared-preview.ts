import { LIMITS } from "../../shared/api.ts";

// Re-encoding on a canvas removes the upload's embedded metadata. The reporter
// must still inspect the visible pixels before choosing to share the image.
export async function createSharedPreview(photo: File): Promise<File> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(photo);
  } catch {
    throw new Error("This photo could not be prepared for sharing. Choose another image or keep it private.");
  }
  try {
    const canvas = document.createElement("canvas");
    for (const [edge, quality] of [[720, 0.78], [560, 0.66], [440, 0.55]]) {
      const scale = Math.min(1, edge / Math.max(bitmap.width, bitmap.height));
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      const context = canvas.getContext("2d");
      if (!context) break;
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
      if (blob && blob.size > 0 && blob.size <= LIMITS.shared_preview_bytes)
        return new File([blob], "item-preview.jpg", { type: "image/jpeg" });
    }
    throw new Error("This photo could not be made small enough to share. Keep it private or choose another.");
  } finally {
    bitmap.close();
  }
}
