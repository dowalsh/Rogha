import type { CapacitorConfig } from "@capacitor/cli";

const serverUrl = process.env.CAP_SERVER_URL || "https://rogha.dylanwalsh.ie";

const config: CapacitorConfig = {
  appId: "ie.dylanwalsh.rogha",
  appName: "Rogha",
  webDir: "public",
  server: {
    url: serverUrl,
    cleartext: false,
    allowNavigation: ["*"], // TODO: update to be a real limited list
  },
};

export default config;
