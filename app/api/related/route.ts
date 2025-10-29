import { NextRequest, NextResponse } from "next/server";
import { UA, fetchHtml, extractDocBasics, tokenize, jaccard, pick } from "@/lib/utils";

export const runtime = "nodejs";

async function getSitemapUrls(sitemapUrl: string) {
  const res = await fetch(sitemapUrl, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error("Unable to fetch sitemap");
  const xml = await res.text();

  // extract <loc> items
  const locs = Array.from(xml.matchAll(/<loc>(.*?)<\/loc>/g)).map(m => m[1]);

  // split index sitemaps vs leaf sitemaps
  const nested = locs.filter(u => u.endsWith(".xml"));
  const leaves = locs.filter(u => !u.endsWith(".xml"));

  const pageUrls: string[] = [...leaves];

  // fetch a few nested indexes if present
  for (const idxUrl of nested.slice(0, 10)) {
    try {
      const r = await fetch(idxUrl, { headers: { "User-Agent": UA } });
      if (!r.ok) continue;
      const x = await r.text();
      const nestedLocs = Array.from(x.matchAll(/<loc>(.*?)<\/loc>/g)).map(m => m[1]).filter(u => !u.endsWith(".xml"));
      pageUrls.push(...nestedLocs);
    } catch {}
  }

  return Array.from(new Set(pageUrls));
}

export async function POST(req: NextRequest) {
  try {
    const { sitemapUrl = process.env.EDIFY_SITEMAP_URL, topic = "", maxItems = 5 } = await req.json();

    if (!sitemapUrl || !topic) {
      return NextResponse.json({ error: "Missing sitemapUrl or topic" }, { status: 400 });
    }

    const urls = await getSitemapUrls(sitemapUrl);
    const topicTokens = new Set(tokenize(topic));
    const results: { url: string; title: string; score: number }[] = [];

    // limit for speed
    const sample = pick(urls, 200);

    await Promise.all(
      sample.map(async (u) => {
        try {
          const html = await fetchHtml(u);
          if (!html) return;
          const { title, text } = extractDocBasics(html);
          const tokens = new Set(tokenize(text));
          const score = jaccard(topicTokens, tokens);
          if (score > 0) results.push({ url: u, title: title || u, score });
        } catch {}
      })
    );

    results.sort((a, b) => b.score - a.score);
    const related = results.slice(0, maxItems).map(r => ({ url: r.url, title: r.title }));

    return NextResponse.json({ related, topic });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Server error" }, { status: 500 });
  }
}
