import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.dennisgushue.lockstepbeta",
  appName: "Lockstep",
  webDir: "public",
  bundledWebRuntime: false,
  server: {
    androidScheme: "https",
  },
};

export default config;
