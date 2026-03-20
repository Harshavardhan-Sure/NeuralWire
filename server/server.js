const express = require("express");
const path = require("path");
const { getAggregatedNews, CACHE_TTL_MS, clearCache } = require("./rssService");

const app = express();
const PORT = process.env.PORT || 3000;
const staticDir = path.join(__dirname, "..", "public");
const fallbackStaticDir = path.join(__dirname, "..", "client");

app.use(express.json());
app.use(express.static(staticDir));
app.use(express.static(fallbackStaticDir));

app.get("/api/news", async (req, res) => {
  try {
    const data = await getAggregatedNews({
      page: req.query.page,
      limit: req.query.limit,
      search: req.query.search || "",
      source: req.query.source || "All",
      forceRefresh: req.query.refresh === "1"
    });

    res.json({
      articles: data.articles,
      featuredArticles: data.featuredArticles,
      meta: {
        ...data.meta,
        cacheDurationMs: CACHE_TTL_MS
      }
    });
  } catch {
    res.status(500).json({
      articles: [],
      featuredArticles: [],
      error: "Unable to fetch news right now."
    });
  }
});

app.post("/api/news/refresh", async (req, res) => {
  try {
    clearCache();
    const data = await getAggregatedNews({ page: 1, limit: 18, forceRefresh: true });
    res.json({
      ok: true,
      fetchedAt: data.meta.fetchedAt,
      failedSources: data.meta.failedSources || []
    });
  } catch {
    res.status(500).json({ ok: false, error: "Unable to refresh feeds right now." });
  }
});

app.get("*", (req, res) => {
  const indexPath = require("fs").existsSync(path.join(staticDir, "index.html"))
    ? path.join(staticDir, "index.html")
    : path.join(fallbackStaticDir, "index.html");

  res.sendFile(indexPath);
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`AI News Aggregator running at http://localhost:${PORT}`);
  });
}

module.exports = app;
