export function timeAgo(date: Date | null): string {
  if (!date) return "not checked yet";
  const secs = Math.round((Date.now() - date.getTime()) / 1000);
  if (secs < 10) return "updated just now";
  if (secs < 60) return `checked ${secs}s ago`;
  const mins = Math.round(secs / 60);
  return `checked ${mins}m ago`;
}
