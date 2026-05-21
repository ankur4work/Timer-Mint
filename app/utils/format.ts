// Shared utility functions that can be used on both client and server

export function formatTimerDate(date: Date | string | null): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  const month = d.toLocaleString("en-US", { month: "short", timeZone: "UTC" });
  const day = d.getUTCDate();
  const year = d.getUTCFullYear();
  const hours = d.getUTCHours().toString().padStart(2, "0");
  const minutes = d.getUTCMinutes().toString().padStart(2, "0");
  return `${month} ${day}, ${year}, ${hours}:${minutes}`;
}

export function formatDateForInput(date: string | Date | null): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  // Use UTC methods to avoid timezone differences between server and client (hydration mismatch)
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}
