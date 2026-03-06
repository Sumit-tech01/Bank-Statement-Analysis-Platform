export const NOTIFICATION_STORAGE_KEY = "bsa_notifications";

const normalizeList = (items) => {
  const list = Array.isArray(items) ? items : [];

  return list
    .filter((item) => item && typeof item === "object")
    .map((item) => ({
      id: String(item.id || `${item.type || "info"}-${Date.now()}`),
      type: item.type || "info",
      title: String(item.title || "Notification"),
      message: String(item.message || ""),
      createdAt: item.createdAt || new Date().toISOString(),
    }))
    .sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt))
    .slice(0, 25);
};

const emitChange = () => {
  window.dispatchEvent(new CustomEvent("bsa-notifications-updated"));
};

export const readNotifications = () => {
  try {
    const raw = localStorage.getItem(NOTIFICATION_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    return normalizeList(JSON.parse(raw));
  } catch (_error) {
    return [];
  }
};

export const saveNotifications = (notifications) => {
  const normalized = normalizeList(notifications);
  localStorage.setItem(NOTIFICATION_STORAGE_KEY, JSON.stringify(normalized));
  emitChange();
  return normalized;
};

export const upsertNotification = (notification) => {
  const current = readNotifications();
  const id = String(notification?.id || `${notification?.type || "info"}-${Date.now()}`);

  const existingIndex = current.findIndex((item) => item.id === id);
  const nextItem = {
    id,
    type: notification?.type || "info",
    title: String(notification?.title || "Notification"),
    message: String(notification?.message || ""),
    createdAt: notification?.createdAt || new Date().toISOString(),
  };

  if (existingIndex >= 0) {
    current[existingIndex] = nextItem;
  } else {
    current.unshift(nextItem);
  }

  return saveNotifications(current);
};

export const removeNotification = (id) => {
  const current = readNotifications();
  const next = current.filter((item) => item.id !== id);
  return saveNotifications(next);
};

export const removeNotificationsByPrefix = (prefix) => {
  const current = readNotifications();
  const next = current.filter((item) => !item.id.startsWith(prefix));
  return saveNotifications(next);
};
