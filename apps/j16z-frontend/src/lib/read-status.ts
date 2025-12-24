/**
 * Read/Unread Status Management
 * Tracks which events have been read by the analyst
 */

const READ_STATUS_KEY = "inbox_read_events";

export function getReadEvents(): Set<string> {
  if (typeof window === "undefined") return new Set();

  try {
    const stored = localStorage.getItem(READ_STATUS_KEY);
    return stored ? new Set(JSON.parse(stored)) : new Set();
  } catch (error) {
    console.error("Failed to load read events:", error);
    return new Set();
  }
}

export function markEventAsRead(eventId: string): void {
  if (typeof window === "undefined") return;

  try {
    const readEvents = getReadEvents();
    readEvents.add(eventId);
    localStorage.setItem(READ_STATUS_KEY, JSON.stringify([...readEvents]));
  } catch (error) {
    console.error("Failed to mark event as read:", error);
  }
}

export function markAllEventsAsRead(eventIds: string[]): void {
  if (typeof window === "undefined") return;

  try {
    const readEvents = getReadEvents();
    eventIds.forEach((id) => readEvents.add(id));
    localStorage.setItem(READ_STATUS_KEY, JSON.stringify([...readEvents]));
  } catch (error) {
    console.error("Failed to mark all events as read:", error);
  }
}

export function isEventRead(eventId: string): boolean {
  return getReadEvents().has(eventId);
}

export function getUnreadCount(allEventIds: string[]): number {
  const readEvents = getReadEvents();
  return allEventIds.filter((id) => !readEvents.has(id)).length;
}
