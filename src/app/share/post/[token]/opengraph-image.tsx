import { ImageResponse } from "next/og";
import { getPostByShareToken } from "@/lib/access/publicShareAccess";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({
  params,
}: {
  params: { token: string };
}) {
  const post = await getPostByShareToken(params.token);
  if (!post) return new Response("Not found", { status: 404 });

  const title = post.title ?? "Untitled Post";
  const authorName = post.author?.name ?? null;

  return new ImageResponse(
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
              opacity: 0.55,
            }}
          />
        )}

        {/* gradient overlay so text is always readable */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background:
              "linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.3) 55%, transparent 100%)",
          }}
        />

        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            padding: "48px 56px",
            display: "flex",
            flexDirection: "column",
            gap: "14px",
          }}
        >
          <div
            style={{
              fontSize: 58,
              fontWeight: 700,
              color: "white",
              lineHeight: 1.15,
              letterSpacing: "-0.5px",
            }}
          >
            {title}
          </div>
          {authorName && (
            <div
              style={{
                fontSize: 28,
                color: "rgba(255,255,255,0.65)",
                fontWeight: 400,
              }}
            >
              {authorName}
            </div>
          )}
        </div>
      </div>
    ),
    { ...size },
  );
}
