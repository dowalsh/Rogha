import sharp from "sharp";

const CLEAR_SIZE = 48;
const TEASER_SIZE = 8;

async function toDataUri(buffer: Buffer): Promise<string> {
  return `data:image/jpeg;base64,${buffer.toString("base64")}`;
}

// Generates two square inline thumbnails from a hero image: a small, clear
// one for published posts, and a tiny, heavily blurred "teaser" for posts
// that are only submitted (not yet published). Returns null on any failure
// so callers can treat thumbnailing as best-effort.
export async function generateHeroThumbnails(
  heroImageUrl: string,
): Promise<{ thumb: string; thumbBlur: string } | null> {
  try {
    const res = await fetch(heroImageUrl);
    if (!res.ok) return null;
    const source = Buffer.from(await res.arrayBuffer());

    const [thumbBuffer, blurBuffer] = await Promise.all([
      sharp(source)
        .resize(CLEAR_SIZE, CLEAR_SIZE, { fit: "cover" })
        .jpeg({ quality: 60 })
        .toBuffer(),
      sharp(source)
        .resize(TEASER_SIZE, TEASER_SIZE, { fit: "cover" })
        .blur(1.5)
        .jpeg({ quality: 40 })
        .toBuffer(),
    ]);

    return {
      thumb: await toDataUri(thumbBuffer),
      thumbBlur: await toDataUri(blurBuffer),
    };
  } catch (e) {
    console.error("[generateHeroThumbnails] failed", e);
    return null;
  }
}
