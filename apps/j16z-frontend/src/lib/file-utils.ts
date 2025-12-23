import { saveAs } from "file-saver";
import Papa from "papaparse";

/**
 * Export data as CSV file
 */
export function exportToCSV<T extends Record<string, unknown>>(
  data: T[],
  filename: string,
  headers?: string[]
): void {
  const csv = Papa.unparse(data, {
    columns: headers,
  });
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  saveAs(blob, filename);
}

/**
 * Export data as JSON file
 */
export function exportToJSON<T>(data: T, filename: string): void {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  saveAs(blob, filename);
}

/**
 * Export text content as file
 */
export function exportTextFile(content: string, filename: string, mimeType: string = "text/plain"): void {
  const blob = new Blob([content], { type: mimeType });
  saveAs(blob, filename);
}
