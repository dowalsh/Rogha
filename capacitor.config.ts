import type { CapacitorConfig } from "@capacitor/cli";

const serverUrl = process.env.CAP_SERVER_URL || "https://rogha.dylanwalsh.ie";

const config: CapacitorConfig = {
  appId: "ie.dylanwalsh.rogha",
  appName: "Rogha",
  webDir: "public",
  server: {
    url: serverUrl,
    cleartext: false,
    allowNavigation: [
      "rogha.dylanwalsh.ie",
      "*.vercel.app",
      "*.clerk.accounts.dev",
      "*.clerk.dev",
      "*.clerk.com",
      "accounts.rogha.dylanwalsh.ie",
      "clerk.rogha.dylanwalsh.ie",
    ],
  },
};

export default config;
