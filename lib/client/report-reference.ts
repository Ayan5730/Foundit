const REPORT_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Accept an ID or a report page on this site, never a third-party URL. */
export function reportIdFromReference(value: string, origin: string): string | null {
  const input = value.trim();
  if (REPORT_ID.test(input)) return input.toLowerCase();
  let url: URL;
  try { url = new URL(input, origin); }
  catch { return null; }
  if (url.origin !== origin) return null;
  const match = /^\/reports\/([^/]+)\/?$/.exec(url.pathname);
  return match && REPORT_ID.test(match[1]) ? match[1].toLowerCase() : null;
}
