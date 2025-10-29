# Comp_Blogpost_Researcher

Custom GPT Actions + Vercel APIs that:
- Crawl approved competitor posts (`/api/crawl`)
- Fetch related EDIFY posts from your sitemap (`/api/related`)
- Feed results to a Custom GPT that outputs HTML in your house format

## Quick start
1. `cp .env.example .env` and keep the defaults or adjust as needed.
2. `yarn` or `npm i`
3. `yarn dev` or `npm run dev`

## Environment
- `EDIFY_SITE_URL` https://edifyscreening.com
- `EDIFY_SITEMAP_URL` https://www.edifyscreening.com/post-sitemap.xml
- `ALLOWED_COMPETITORS` fadv.com, hireright.com, goodhire.com, checkr.com
- `CRAWL_MAX_POSTS` default 5
- `CRAWL_USER_AGENT` default EdifyContentBot/1.0

## Deploy to Vercel
- Push this repo to GitHub then import into Vercel.
- Add the same environment variables in Vercel.
- Node 18 or higher is fine.
- Base URL will be `https://<your-vercel-app>.vercel.app`.

## Custom GPT Actions (OpenAPI excerpt)
Use this when creating your Actions.

```yaml
openapi: 3.1.0
info:
  title: EDIFY Content Pipeline
  version: 1.1.0
servers:
  - url: https://<your-vercel-app>.vercel.app/api
paths:
  /crawl:
    post:
      operationId: crawlLatest
      summary: Fetch latest competitor posts
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                domain: { type: string, description: "fadv.com" }
                maxPosts: { type: integer, default: 5 }
      responses:
        "200":
          description: OK
  /related:
    post:
      operationId: relatedPosts
      summary: Get related EDIFY posts from sitemap by topic
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                sitemapUrl: { type: string, default: "${EDIFY_SITEMAP_URL}" }
                topic: { type: string }
                maxItems: { type: integer, default: 5 }
      responses:
        "200":
          description: OK
