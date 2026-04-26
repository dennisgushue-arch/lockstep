type ExpoDeviceModule = typeof import("expo-device");
type ExpoNotificationsModule = typeof import("expo-notifications");

export type PactNotificationInput = {
  pactId: string;
  actionText: string;
  scheduledDate: string; // ISO
};

let expoModulesPromise: Promise<
  { Device: ExpoDeviceModule; Notifications: ExpoNotificationsModule } | null
> | null = null;
let notificationHandlerConfigured = false;

function isNativePlatform() {
  if (typeof window === "undefined") return false;
  return Boolean((window as any).Capacitor?.isNativePlatform?.());
}

async function getExpoModules() {
  if (!isNativePlatform()) return null;

  if (!expoModulesPromise) {
    expoModulesPromise = Promise.all([
      import("expo-device"),
      import("expo-notifications"),
    ])
      .then(([Device, Notifications]) => ({ Device, Notifications }))
      .catch((error) => {
        console.warn("[PactNotifications] Expo modules unavailable", error);
        return null;
      });
  }

  return expoModulesPromise;
}

async function ensureNotificationHandler() {
  const modules = await getExpoModules();
  if (!modules) return null;

  const { Notifications } = modules;
  if (notificationHandlerConfigured) return Notifications;

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });

  notificationHandlerConfigured = true;
  return Notifications;
}

function isAndroidPlatform() {
  if (typeof navigator === "undefined") return false;
  return /Android/i.test(navigator.userAgent);
}

export async function ensureNotificationPermission() {
  const modules = await getExpoModules();
  if (!modules) return false;

  const { Device, Notifications } = modules;
  await ensureNotificationHandler();

  if (!Device.isDevice) return false;

  const existing = await Notifications.getPermissionsAsync();
  let status = existing.status;

  if (status !== "granted") {
    const requested = await Notifications.requestPermissionsAsync();
    status = requested.status;
  }

  if (status !== "granted") {
    return false;
  }

  if (isAndroidPlatform()) {
    await Notifications.setNotificationChannelAsync("pacts", {
      name: "Pacts",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 200, 100, 200],
      sound: "default",
    });
  }

  return true;
}

function clampMs(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function preFailureBody(actionText: string) {
  return `Pact pending: ${actionText}`;
}

function finalBody() {
  return "Your pact deadline is getting close.";
}

function missedBody() {
  return "Your pact deadline passed.";
}

export async function schedulePactNotifications(input: PactNotificationInput) {
  const granted = await ensureNotificationPermission();
  if (!granted) return [];

  const modules = await getExpoModules();
  if (!modules) return [];
  const { Notifications } = modules;

  const now = Date.now();
  const deadline = new Date(input.scheduledDate).getTime();
  const totalDuration = deadline - now;

  if (totalDuration <= 0) return [];

  const scheduledIds: string[] = [];

  const scheduleAt = async (dateMs: number, body: string, mode: "act" | "missed") => {
    if (dateMs <= Date.now()) return;

    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: "Lockstep",
        body,
        sound: "default",
        data: {
          url: `lockstep://pact/${input.pactId}?mode=${mode}`,
          pactId: input.pactId,
        },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: new Date(dateMs),
        channelId: isAndroidPlatform() ? "pacts" : undefined,
      },
    });

    scheduledIds.push(id);
  };

  const preFailureMs = clampMs(totalDuration * 0.25, 45 * 60 * 1000, 90 * 60 * 1000);
  const preFailureAt = deadline - preFailureMs;
  const finalAt = deadline - 30 * 60 * 1000;
  const missedAt = deadline;

  await scheduleAt(preFailureAt, preFailureBody(input.actionText), "act");
  await scheduleAt(finalAt, finalBody(), "act");
  await scheduleAt(missedAt, missedBody(), "missed");

  return scheduledIds;
}

export async function cancelPactNotifications(notificationIds: string[] = []) {
  const modules = await getExpoModules();
  if (!modules) return;
  const { Notifications } = modules;

  await Promise.all(
    notificationIds.map((id) => Notifications.cancelScheduledNotificationAsync(id))
  );
}
