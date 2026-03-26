import apn from "@parse/node-apn";
import { prisma } from "@/lib/prisma";

const APP_BUNDLE_ID = "ie.dylanwalsh.rogha";

function getProvider(): apn.Provider | null {
  const key = process.env.APNS_KEY;
  const keyId = process.env.APNS_KEY_ID;
  const teamId = process.env.APNS_TEAM_ID;
  if (!key || !keyId || !teamId) return null;

  return new apn.Provider({
    token: { key, keyId, teamId },
    production: process.env.NODE_ENV === "production",
  });
}

export async function sendPushToUser(
  userId: string,
  payload: { title: string; body: string }
) {
  const provider = getProvider();
  if (!provider) {
    console.warn("[PUSH] APNs credentials not configured — skipping");
    return;
  }

  const devices = await prisma.pushDevice.findMany({
    where: { userId, enabled: true },
    select: { id: true, token: true },
  });

  if (!devices.length) {
    provider.shutdown();
    return;
  }

  const note = new apn.Notification();
  note.alert = { title: payload.title, body: payload.body };
  note.sound = "default";
  note.topic = APP_BUNDLE_ID;

  for (const device of devices) {
    try {
      const result = await provider.send(note, device.token);
      console.log("[PUSH_RESULT]", {
        userId,
        sent: result.sent.length,
        failed: result.failed.map((f) => ({
          token: f.device,
          reason: f.response?.reason,
        })),
      });
      for (const failed of result.failed) {
        if (
          failed.response?.reason === "BadDeviceToken" ||
          failed.response?.reason === "Unregistered"
        ) {
          await prisma.pushDevice.update({
            where: { id: device.id },
            data: { enabled: false },
          });
        }
      }
    } catch (err) {
      console.error("[PUSH_SEND_ERROR]", { userId, err });
    }
  }

  provider.shutdown();
}
