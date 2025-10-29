import * as cheerio from "cheerio";

export const UA = process.env.CRAWL_USER_AGENT || "EdifyContentBot/1.0";

export function normalizeUrl(u: string) {
  try {
    const url = new URL(u);
    url.hash = "";
    return url.toString();
  } catch {
    return u;
  }
}

export async function fetchHtml(url: string) {
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) return "";
  return await res.text();
}

export function extractDocBasics(html: string) {
  const $ = cheerio.load(html);
  const title = $("title").first().text().trim();
  const h1 = $("h1").first().text().trim();
  const metaDesc = $('meta[name="description"]').attr("content") || "";
  const headings = $("h2, h3").map((_, el) => $(el).text()).get().join(" ");
  const firstParas = $("p").slice(0, 5).map((_, el) => $(el).text()).get().join(" ");
  const text = [title, h1, metaDesc, headings, firstParas].join(" ").replace(/\s+/g, " ").trim();
  return { title, h1, metaDesc, text };
}

const STOP = new Set([
  "the","and","for","with","that","this","you","your","from","are","was","were","but","not","have","has","had","can",
  "how","why","what","when","where","which","into","about","will","they","them","their","our","out","use","using"
]);

export function tokenize(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(t => t.length > 2 && !STOP.has(t));
}

export function jaccard(a: Set<string>, b: Set<string>) {
  let inter = 0;
  for (const t of a) if (b.has(t)) inter++;
  const union = a.size + b.size - inter;
  return union ? inter / union : 0;
}

export function pick<T>(arr: T[], n: number) {
  return arr.slice(0, n);
}
