import { Capacitor } from "@capacitor/core";
import {
  LocalNotifications,
  type LocalNotificationSchema,
  type PendingLocalNotificationSchema,
} from "@capacitor/local-notifications";
import type { PressureNotificationDraft } from "@/lib/pressure-notifications";
import { buildPactDeepLink } from "@/lib/deeplink";

const CHANNEL_ID = "lockstep-consequence";
const MANAGED_ID_BASE = 410_000_000;
const MANAGED_ID_RANGE = 90_000_000;

type ManagedNotification = LocalNotificationSchema & {
  schedule: NonNullable<LocalNotificationSchema["schedule"]>;
};

let permissionsRequested = false;
let channelReady = false;

function isNativeRuntime() {
  return Capacitor.isNativePlatform();
}

function isManagedNotificationId(id: number) {
  return id >= MANAGED_ID_BASE && id < MANAGED_ID_BASE + MANAGED_ID_RANGE;
}

function hashString(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
}

export function buildNativeNotificationPayloadPreview(
  notification: PressureNotificationDraft,
): ManagedNotification {
  const mode =
    notification.type === "pre-failure-warning" || notification.type === "deadline-pressure"
      ? "act"
      : notification.type === "missed-outcome"
        ? "missed"
        : "recovery";

  return {
    id: notification.id,
    channelId: CHANNEL_ID,
    title: notification.title,
    body: notification.body,
    schedule: {
      at: notification.at,
      allowWhileIdle: true,
    },
    extra: {
      lockstep: true,
      type: notification.type,
      commitmentId: notification.commitmentId,
      deepLink: buildPactDeepLink(notification.commitmentId, mode),
    },
  };
}

async function ensurePermissions() {
  const permissions = await LocalNotifications.checkPermissions();
  if (permissions.display === "granted") {
    return true;
  }

  if (permissions.display === "denied" || permissions.display === "prompt-with-rationale") {
    if (permissionsRequested) {
      return false;
    }

    permissionsRequested = true;
    const requested = await LocalNotifications.requestPermissions();
    return requested.display === "granted";
  }

  if (!permissionsRequested) {
    permissionsRequested = true;
    const requested = await LocalNotifications.requestPermissions();
    return requested.display === "granted";
  }

  return false;
}

async function ensureChannel() {
  if (channelReady || Capacitor.getPlatform() !== "android") {
    return;
  }

  await LocalNotifications.createChannel({
    id: CHANNEL_ID,
    name: "Lockstep consequence alerts",
    description: "Deadline and recovery notifications for active pacts",
    importance: 5,
    visibility: 1,
  });

  channelReady = true;
}

function mapPendingIds(notifications: PendingLocalNotificationSchema[]) {
  return notifications
    .map((notification) => notification.id)
    .filter((id): id is number => typeof id === "number" && isManagedNotificationId(id));
}

export async function syncNativeConsequenceNotifications(notifications: PressureNotificationDraft[]) {
  if (!isNativeRuntime()) {
    return { synced: false, reason: "not-native" as const, scheduledCount: 0 };
  }

  try {
    const permissionGranted = await ensurePermissions();
    if (!permissionGranted) {
      return { synced: false, reason: "permission-denied" as const, scheduledCount: 0 };
    }

    await ensureChannel();

    const pending = await LocalNotifications.getPending();
    const pendingIds = mapPendingIds(pending.notifications);
    if (pendingIds.length > 0) {
      await LocalNotifications.cancel({
        notifications: pendingIds.map((id) => ({ id })),
      });
    }

    const managedNotifications = notifications.map((notification) => buildNativeNotificationPayloadPreview(notification));
    if (managedNotifications.length > 0) {
      await LocalNotifications.schedule({ notifications: managedNotifications });
    }

    return {
      synced: true,
      reason: "scheduled" as const,
      scheduledCount: managedNotifications.length,
    };
  } catch (error) {
    console.warn("[Notifications] Failed to sync native consequence notifications", error);
    return { synced: false, reason: "error" as const, scheduledCount: 0 };
  }
}
