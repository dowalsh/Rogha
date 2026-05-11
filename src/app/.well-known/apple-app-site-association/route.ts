import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json(
    {
      applinks: {
        details: [
          {
            appIDs: ["K8J558UJAV.ie.dylanwalsh.rogha"],
            components: [
              { "/": "/open/*" },
            ],
          },
        ],
      },
    },
    {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=3600",
      },
    }
  );
}
