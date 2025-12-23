import { format, formatDistanceToNow, differenceInDays, parseISO } from "date-fns";

/**
 * Format date for display (e.g., "Dec 23, 2025")
 */
export function formatDate(date: string | Date): string {
  const dateObj = typeof date === "string" ? parseISO(date) : date;
  return format(dateObj, "MMM d, yyyy");
}

/**
 * Format date and time (e.g., "Dec 23, 2025, 10:30 PM")
 */
export function formatDateTime(date: string | Date): string {
  const dateObj = typeof date === "string" ? parseISO(date) : date;
  return format(dateObj, "MMM d, yyyy, h:mm a");
}

/**
 * Format time only (e.g., "10:30 PM")
 */
export function formatTime(date: string | Date): string {
  const dateObj = typeof date === "string" ? parseISO(date) : date;
  return format(dateObj, "h:mm a");
}

/**
 * Format time in 24-hour format (e.g., "22:30")
 */
export function formatTime24(date: string | Date): string {
  const dateObj = typeof date === "string" ? parseISO(date) : date;
  return format(dateObj, "HH:mm");
}

/**
 * Format time with seconds (e.g., "10:30:45 PM")
 */
export function formatTimeWithSeconds(date: string | Date): string {
  const dateObj = typeof date === "string" ? parseISO(date) : date;
  return format(dateObj, "h:mm:ss a");
}

/**
 * Format for file names (e.g., "2025-12-23")
 */
export function formatDateForFilename(): string {
  return format(new Date(), "yyyy-MM-dd");
}

/**
 * Calculate days until a future date
 */
export function daysUntil(date: string | Date): number {
  const dateObj = typeof date === "string" ? parseISO(date) : date;
  return differenceInDays(dateObj, new Date());
}

/**
 * Format relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(date: string | Date): string {
  const dateObj = typeof date === "string" ? parseISO(date) : date;
  return formatDistanceToNow(dateObj, { addSuffix: true });
}

/**
 * Get ISO date string for today
 */
export function getTodayISO(): string {
  return format(new Date(), "yyyy-MM-dd");
}

/**
 * Add days to current date and return ISO string
 */
export function addDaysToToday(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return format(date, "yyyy-MM-dd");
}
