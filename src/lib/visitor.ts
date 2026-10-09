// Small, dependency-free readers for the user agent and referrer.

export function isBot(ua: string) {
  return !ua || /bot|crawl|spider|slurp|preview|headless|lighthouse|pingdom|monitor|curl|wget|python-requests|axios|node-fetch/i.test(ua);
}

export function device(ua: string) {
  if (/ipad|tablet|(android(?!.*mobile))/i.test(ua)) return "Tablet";
  if (/mobi|iphone|ipod|android/i.test(ua)) return "Mobile";
  return "Desktop";
}

export function browser(ua: string) {
  if (/edg\//i.test(ua)) return "Edge";
  if (/opr\/|opera/i.test(ua)) return "Opera";
  if (/samsungbrowser/i.test(ua)) return "Samsung Internet";
  if (/firefox|fxios/i.test(ua)) return "Firefox";
  if (/chrome|crios/i.test(ua)) return "Chrome";
  if (/safari/i.test(ua)) return "Safari";
  return "Other";
}

export function os(ua: string) {
  if (/windows/i.test(ua)) return "Windows";
  if (/iphone|ipad|ipod/i.test(ua)) return "iOS";
  if (/android/i.test(ua)) return "Android";
  if (/mac os x|macintosh/i.test(ua)) return "macOS";
  if (/linux/i.test(ua)) return "Linux";
  return "Other";
}

const SOURCES: [RegExp, string][] = [
  [/google\./, "Google"],
  [/bing\.com/, "Bing"],
  [/duckduckgo/, "DuckDuckGo"],
  [/linkedin\.com|lnkd\.in/, "LinkedIn"],
  [/github\.com/, "GitHub"],
  [/facebook\.com|fb\.me|m\.facebook/, "Facebook"],
  [/instagram\.com/, "Instagram"],
  [/t\.co$|twitter\.com|x\.com/, "X"],
  [/whatsapp|wa\.me/, "WhatsApp"],
  [/t\.me|telegram/, "Telegram"],
  [/vercel\.com/, "Vercel"],
];

/** Turns a referrer URL (or utm_source) into a readable source name. */
export function source(referrer: string | null, utmSource: string | null, ownHost: string | null) {
  if (utmSource) return utmSource.slice(0, 40);
  if (!referrer) return "Direct";
  let host: string;
  try {
    host = new URL(referrer).hostname.replace(/^www\./, "");
  } catch {
    return "Direct";
  }
  if (ownHost && host === ownHost.replace(/^www\./, "")) return "Direct";
  for (const [re, name] of SOURCES) if (re.test(host)) return name;
  return host;
}
