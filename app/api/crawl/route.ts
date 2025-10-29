import { NextRequest, NextResponse } from "next/server";
import * as cheerio from "cheerio";
import { UA, fetchHtml } from "@/lib/utils";

export const runtime = "nodejs";

function isAllowedCompetitor(domain: string) {
  const allowed = (process.env.ALLOWED_COMPETITORS || "")
    .split(",")
    .map(s => s.trim().toLowerCase())
    .filter(Boolean);
  return allowed.some(d => domain.endsWith(d));
}

async function fetchSitemapOrFeed(domain: string) {
  const base = `https://${domain}`;
  const endpoints = [
    `${base}/sitemap.xml`,
    `${base}/blog/sitemap.xml`,
    `${base}/feed`,
    `${base}/rss.xml`
  ];
  for (const url of endpoints) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": UA } });
      if (res.ok) {
        const text = await res.text();
        return { url, text };
      }
    } catch {}
  }
  throw new Error("No sitemap or feed found");
}

function extractLinksFromXml(xml: string, domain: string) {
  // prefer <loc>
  const locs = Array.from(xml.matchAll(/<loc>(.*?)<\/loc>/g)).map(m => m[1]);
  const items = locs.length ? locs : Array.from(xml.matchAll(/<link>(.*?)<\/link>/g)).map(m => m[1]);
  return items.filter(u => /^https?:\/\//.test(u) && u.includes(domain));
}

function cleanArticle(html: string) {
  const $ = cheerio.load(html);
  ["nav", "footer", "aside", "script", "style", "noscript"].forEach(sel => $(sel).remove());
  const title = $("h1").first().text().trim() || $("title").first().text().trim();
  const paragraphs = $("p").map((_, el) => $(el).text().trim()).get().filter(Boolean);
  const text = paragraphs.join("\n").slice(0, 15000);
  // attempt to find a publish time meta
  const published = $('meta[property="article:published_time"]').attr("content") ||
                    $('meta[name="date"]').attr("content") ||
                    undefined;
  return { title, text, published };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const input = (body.domain || "").toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*/, "");
    const domain = input;
    const maxPosts = Number(process.env.CRAWL_MAX_POSTS || body.maxPosts || 5);

    if (!domain) return NextResponse.json({ error: "Missing domain" }, { status: 400 });
    if (!isAllowedCompetitor(domain)) return NextResponse.json({ error: "Domain not allowed" }, { status: 403 });

    const { url: sourceUrl, text: xml } = await fetchSitemapOrFeed(domain);
    const links = extractLinksFromXml(xml, domain);
    const latest = links.slice(0, maxPosts);

    const articles: Array<{ url: string; title: string; published?: string; text: string }> = [];

    for (const u of latest) {
      try {
        const html = await fetchHtml(u);
        if (!html) continue;
        const { title, text, published } = cleanArticle(html);
        articles.push({ url: u, title, published, text });
      } catch {}
    }

    return NextResponse.json({ sourceUrl, count: articles.length, articles });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Server error" }, { status: 500 });
  }
}
