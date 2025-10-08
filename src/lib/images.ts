import Compressor from "compressorjs";
import heic2any from "heic2any";

/**
 * Normalize an image before upload:
 * - Converts HEIC/HEIF → JPEG
 * - Compresses large images (downsample + quality)
 */
export async function normalizeImage(file: File): Promise<File> {
  let workingFile = file;

  // Step 1: Convert HEIC/HEIF to JPEG (for iPhone uploads)
  if (
    file.type === "image/heic" ||
    file.type === "image/heif" ||
    file.name.toLowerCase().endsWith(".heic") ||
    file.name.toLowerCase().endsWith(".heif")
  ) {
    try {
      const convertedBlob = (await heic2any({
        blob: file,
        toType: "image/jpeg",
        quality: 0.9,
      })) as Blob;

      workingFile = new File(
        [convertedBlob],
        file.name.replace(/\.(heic|heif)$/i, ".jpg"),
        { type: "image/jpeg" }
      );
    } catch (err) {
      console.error("HEIC → JPEG conversion failed:", err);
      // fallback to original file if conversion fails
    }
  } // Step 2: Compress the image
  return new Promise<File>((resolve, reject) => {
    new Compressor(workingFile, {
      quality: 0.7, // balance quality/size
      maxWidth: 2000, // downsample large images
      maxHeight: 2000,
      convertSize: 1000000, // convert >1MB PNGs to JPEG
      success: (result) => resolve(result as File),
      error: (err) => {
        console.error("Compression failed:", err);
        resolve(workingFile); // fallback to uncompressed file
      },
    });
  });
}
