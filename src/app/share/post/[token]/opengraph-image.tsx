import { ImageResponse } from "next/og";
import sharp from "sharp";
import { getPostByShareToken } from "@/lib/access/publicShareAccess";

export const size = { width: 1200, height: 630 };
export const contentType = "image/jpeg";

export default async function Image({
  params,
}: {
  params: { token: string };
}) {
  const post = await getPostByShareToken(params.token);
  if (!post) return new Response("Not found", { status: 404 });

  const png = await new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          backgroundColor: "#0a0a0a",
        }}
      >
        {post.heroImageUrl && (
          <img
            src={post.heroImageUrl}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
        )}
      </div>
    ),
    { ...size },
  ).arrayBuffer();

  const jpeg = await sharp(Buffer.from(png)).jpeg({ quality: 75 }).toBuffer();

  return new Response(new Uint8Array(jpeg), {
    headers: { "Content-Type": "image/jpeg" },
  });
}
