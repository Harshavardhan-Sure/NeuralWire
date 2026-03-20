# AI News Aggregator

A lightweight AI news dashboard built with Node.js, Express, `rss-parser`, and vanilla JavaScript. It collects stories from multiple AI-focused RSS feeds, deduplicates overlapping coverage, highlights featured stories, and serves a simple frontend for browsing the latest updates.

## Features

- Aggregates AI news from multiple RSS sources
- Deduplicates similar headlines across publishers
- Supports search, source filtering, featured stories, and saved stories
- Uses in-memory caching to reduce repeated feed fetches
- Includes a Vercel-friendly deployment setup for free hosting

## Project Structure

```text
client/         Original frontend source files
public/         Static files served by Vercel
server/         Express server and RSS aggregation logic
package.json    App metadata and dependencies
vercel.json     Vercel routing/build configuration
```

## Local Development

### Requirements

- Node.js 18 or newer

### Install

```bash
npm install
```

### Run

```bash
npm start
```

The app will start on `http://localhost:3000`.

## How It Works

- The Express server exposes `/api/news` and `/api/news/refresh`.
- RSS feeds are fetched server-side in `server/rssService.js`.
- Articles are normalized, deduplicated, sorted, and cached in memory.
- Static frontend assets are served from `public/` on Vercel and fall back to `client/` for local runs.

## Vercel Deployment

This project is prepared for Vercel free-tier deployment.

### Deploy Steps

1. Push the project to GitHub.
2. Import the repository into Vercel.
3. Choose the `Other` framework preset if Vercel asks.
4. Leave build/output settings empty unless Vercel auto-detects them.
5. Deploy.

### Notes

- `vercel.json` routes `/api/*` requests to the Express server.
- Static files are served from `public/`.
- No environment variables are currently required.

## Public Deploy Safety Check

The app was reviewed for obvious sensitive data before deployment.

- No hardcoded API keys, secrets, bearer tokens, passwords, or private keys were found in the app code.
- `.gitignore` excludes `node_modules/`, `.vercel/`, and `.env*` files from accidental commits.
- The current app stores saved stories and settings only in the browser using `localStorage` and `sessionStorage`.

## Performance Notes

The RSS aggregation path was tuned for free serverless hosting:

- Feed timeout reduced to 7 seconds per source
- Per-source items capped to reduce cold-start work
- Image fallback scraping limited and throttled
- Concurrent requests share one in-flight fetch
- Stale cache can be served if feeds temporarily fail

These changes improve reliability on Vercel Hobby without changing the visible UI behavior.

## Tech Stack

- Node.js
- Express
- rss-parser
- Vanilla JavaScript
- HTML/CSS

## License

MIT
