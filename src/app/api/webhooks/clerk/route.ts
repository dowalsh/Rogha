import { Webhook } from "svix";
import { headers } from "next/headers";
import { upsertClerkUser } from "@/actions/user.action";

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;
  if (!WEBHOOK_SECRET) {
    return new Response("Missing Clerk webhook secret", { status: 500 });
  }

  // Validate signature
  const payload = await req.text();
  const headerPayload = headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response("Missing Svix headers", { status: 400 });
  }

  const wh = new Webhook(WEBHOOK_SECRET);
  let evt: any;

  try {
    evt = wh.verify(payload, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    });
  } catch (err) {
    console.error("Webhook signature verification failed.", err);
    return new Response("Invalid signature", { status: 400 });
  }

  const eventType = evt.type;
  const data = evt.data;

  if (eventType === "user.created" || eventType === "user.updated") {
    await upsertClerkUser(data); // reuse your function
  }

  return new Response("OK", { status: 200 });
}
