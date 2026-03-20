const Parser = require("rss-parser");

const parser = new Parser({
  customFields: {
    item: [
      ["media:content", "mediaContent", { keepArray: true }],
      ["media:thumbnail", "mediaThumbnail", { keepArray: true }],
      ["content:encoded", "contentEncoded"],
      ["description", "description"]
    ]
  },
  requestOptions: {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0 Safari/537.36"
    }
  }
});

const CACHE_TTL_MS = 5 * 60 * 1000;
const STALE_CACHE_TTL_MS = 60 * 60 * 1000;
const IMAGE_FALLBACK_LIMIT = 8;
const IMAGE_FALLBACK_CONCURRENCY = 2;
const FEATURED_LIMIT = 4;
const SOURCE_TIMEOUT_MS = 7000;
const MAX_ITEMS_PER_SOURCE = 12;

const RSS_SOURCES = [
  { name: "TechCrunch AI", url: "https://techcrunch.com/category/artificial-intelligence/feed/" },
  { name: "AI News", url: "https://www.artificialintelligence-news.com/feed/" },
  { name: "MIT News AI", url: "https://news.mit.edu/rss/topic/artificial-intelligence2", fallbackUrl: "https://news.mit.edu/topic/artificial-intelligence2" },
  { name: "Analytics Vidhya", url: "https://www.analyticsvidhya.com/feed/" },
  { name: "WIRED AI", url: "https://www.wired.com/feed/tag/ai/latest/rss" },
  { name: "The Verge AI", url: "https://www.theverge.com/rss/ai-artificial-intelligence/index.xml" },
  { name: "Google AI Blog", url: "https://blog.google/technology/ai/rss/" },
  { name: "Towards AI", url: "https://towardsai.net/feed" },
  { name: "Hugging Face", url: "https://huggingface.co/blog/feed.xml", fallbackUrl: "https://huggingface.co/blog" },
  { name: "KDnuggets", url: "https://feeds.feedburner.com/kdnuggets-data-mining-analytics" },
  { name: "Machine Learning Mastery", url: "https://machinelearningmastery.com/blog/feed/" },
  { name: "The Decoder", url: "https://the-decoder.com/feed/" },
  { name: "MarkTechPost", url: "https://www.marktechpost.com/feed/" },
  { name: "AI Business", url: "https://aibusiness.com/rss.xml", fallbackUrl: "https://aibusiness.com/" },
  { name: "AWS ML Blog", url: "https://aws.amazon.com/blogs/machine-learning/feed/" }
];

const cache = {
  articles: [],
  fetchedAt: 0,
  failedSources: []
};

let inflightFetch = null;

function stripHtml(value = "") {
  return String(value).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function truncateText(value = "", maxLength = 180) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 1).trim()}...`;
}

function firstNonEmpty(values = []) {
  return values.find((value) => typeof value === "string" && value.trim()) || "";
}

function toAbsoluteUrl(value, baseUrl) {
  if (!value) {
    return "";
  }

  try {
    return new URL(value, baseUrl).toString();
  } catch {
    return "";
  }
}

function flattenJsonLd(node, collection = []) {
  if (!node) {
    return collection;
  }

  if (Array.isArray(node)) {
    node.forEach((entry) => flattenJsonLd(entry, collection));
    return collection;
  }

  if (typeof node !== "object") {
    return collection;
  }

  collection.push(node);
  Object.values(node).forEach((value) => flattenJsonLd(value, collection));
  return collection;
}

function parseJsonLdArticles(html, source) {
  const scripts = Array.from(html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi));
  const entries = [];

  scripts.forEach((match) => {
    const raw = match[1]?.trim();
    if (!raw) {
      return;
    }

    try {
      const parsed = JSON.parse(raw);
      flattenJsonLd(parsed).forEach((node) => {
        const type = String(node["@type"] || "").toLowerCase();
        const headline = firstNonEmpty([node.headline, node.name]);
        const url = toAbsoluteUrl(
          firstNonEmpty([node.url, node.mainEntityOfPage?.["@id"], node.mainEntityOfPage]),
          source.fallbackUrl || source.url
        );
        const image = Array.isArray(node.image)
          ? firstNonEmpty(node.image.map((entry) => (typeof entry === "string" ? entry : entry?.url)))
          : typeof node.image === "string"
            ? node.image
            : node.image?.url;

        if (!headline || !url || (type && !type.includes("article") && !type.includes("news"))) {
          return;
        }

        entries.push({
          title: headline,
          link: url,
          pubDate: firstNonEmpty([node.datePublished, node.dateCreated, node.dateModified]),
          description: firstNonEmpty([node.description]),
          image: toAbsoluteUrl(image, source.fallbackUrl || source.url)
        });
      });
    } catch {
    }
  });

  return entries;
}

function normalizeFallbackArticle(item, sourceName) {
  return {
    id: item.link || `${sourceName}-${item.title || Date.now()}`,
    title: stripHtml(item.title || "Untitled Article"),
    normalizedTitle: normalizeTitle(item.title || "Untitled Article"),
    link: item.link || "",
    source: sourceName,
    publishedAt: toIsoDate(item.pubDate || Date.now()),
    description: truncateText(stripHtml(item.description || ""), 220),
    image: item.image || "",
    relatedSources: [sourceName],
    duplicateCount: 0
  };
}

function toIsoDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date(0).toISOString() : date.toISOString();
}

function normalizeTitle(value = "") {
  return stripHtml(value)
    .toLowerCase()
    .replace(/&#8217;|&#39;/g, "'")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\b(update|live|report|review|hands on|hands on review|podcast|video)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractImage(item) {
  const mediaContent = Array.isArray(item.mediaContent) ? item.mediaContent : [];
  const mediaThumbnail = Array.isArray(item.mediaThumbnail) ? item.mediaThumbnail : [];
  const mediaUrl =
    mediaContent.find((entry) => entry.$?.url)?.$?.url ||
    mediaThumbnail.find((entry) => entry.$?.url)?.$?.url;

  if (mediaUrl) {
    return mediaUrl;
  }

  const directImage = firstNonEmpty([
    item.enclosure?.url,
    item.thumbnail,
    item.image?.url,
    item.image?.href,
    item["media:thumbnail"]?.url,
    item["media:content"]?.url
  ]);

  if (directImage) {
    return directImage;
  }

  const htmlSources = [item.contentEncoded, item.content, item.summary, item.description].filter(Boolean);

  for (const value of htmlSources) {
    const html = String(value);
    const match = html.match(
      /(?:<img[^>]+(?:src|data-src)=["']([^"' >]+)[^"']*["']|<source[^>]+srcset=["']([^"' >,]+)|poster=["']([^"']+)["'])/i
    );
    const image = match?.[1] || match?.[2] || match?.[3];
    if (image) {
      return image;
    }
  }

  return "";
}

async function fetchHtml(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": parser.options.requestOptions.headers["User-Agent"]
      }
    });

    if (!response.ok) {
      return "";
    }

    return await response.text();
  } catch {
    return "";
  } finally {
    clearTimeout(timeout);
  }
}

function extractImageFromHtml(html) {
  if (!html) {
    return "";
  }

  const patterns = [
    /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["']/i,
    /<img[^>]+(?:data-src|src)=["']([^"']+)["']/i
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) {
      return match[1];
    }
  }

  return "";
}

async function enrichMissingImages(articles) {
  const candidates = articles.filter((article) => !article.image && article.link).slice(0, IMAGE_FALLBACK_LIMIT);
  const workers = Array.from({ length: Math.min(IMAGE_FALLBACK_CONCURRENCY, candidates.length) }, async (_, workerIndex) => {
    for (let index = workerIndex; index < candidates.length; index += IMAGE_FALLBACK_CONCURRENCY) {
      const article = candidates[index];
      const html = await fetchHtml(article.link);
      const image = extractImageFromHtml(html);
      if (image) {
        article.image = image;
      }
    }
  });

  await Promise.all(workers);

  return articles;
}

function normalizeArticle(item, sourceName) {
  const rawDescription = item.contentSnippet || item.summary || item.description || item.contentEncoded || "";

  return {
    id: item.guid || item.id || item.link || `${sourceName}-${item.title || Date.now()}`,
    title: stripHtml(item.title || "Untitled Article"),
    normalizedTitle: normalizeTitle(item.title || "Untitled Article"),
    link: item.link || "",
    source: sourceName,
    publishedAt: toIsoDate(item.isoDate || item.pubDate || Date.now()),
    description: truncateText(stripHtml(rawDescription), 220),
    image: extractImage(item),
    relatedSources: [sourceName],
    duplicateCount: 0
  };
}

async function fetchSource(source) {
  try {
    const feed = await parser.parseURL(source.url);
    const items = Array.isArray(feed.items) ? feed.items.slice(0, MAX_ITEMS_PER_SOURCE) : [];

    return items
      .map((item) => normalizeArticle(item, source.name))
      .filter((article) => article.title && article.link);
  } catch (error) {
    if (!source.fallbackUrl) {
      throw error;
    }

    const html = await fetchHtml(source.fallbackUrl);
    const fallbackItems = parseJsonLdArticles(html, source)
      .map((item) => normalizeFallbackArticle(item, source.name))
      .filter((article) => article.title && article.link);

    if (fallbackItems.length === 0) {
      throw error;
    }

    return fallbackItems;
  }
}

function withTimeout(promise, timeoutMs, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`${label} timed out`)), timeoutMs);
    })
  ]);
}

function hasFreshCache(now = Date.now()) {
  return cache.articles.length > 0 && now - cache.fetchedAt < CACHE_TTL_MS;
}

function hasStaleCache(now = Date.now()) {
  return cache.articles.length > 0 && now - cache.fetchedAt < STALE_CACHE_TTL_MS;
}

function buildCacheResponse({ cached, failedSources = cache.failedSources } = {}) {
  return {
    articles: cache.articles,
    meta: {
      cached,
      fetchedAt: new Date(cache.fetchedAt).toISOString(),
      sources: RSS_SOURCES.map((source) => source.name),
      failedSources,
      stale: cached && failedSources.length > 0
    }
  };
}

function dedupeArticles(articles) {
  const clusters = new Map();

  for (const article of articles) {
    const key = article.normalizedTitle || article.title.toLowerCase();
    const existing = clusters.get(key);

    if (!existing) {
      clusters.set(key, { ...article });
      continue;
    }

    existing.relatedSources = Array.from(new Set([...existing.relatedSources, article.source]));
    existing.duplicateCount += 1;

    if (new Date(article.publishedAt) > new Date(existing.publishedAt)) {
      existing.title = article.title;
      existing.link = article.link;
      existing.source = article.source;
      existing.publishedAt = article.publishedAt;
      existing.description = article.description || existing.description;
      existing.image = article.image || existing.image;
      existing.id = article.id;
    } else if (!existing.image && article.image) {
      existing.image = article.image;
    }
  }

  return Array.from(clusters.values()).sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
}

async function getAllArticles(forceRefresh = false) {
  const now = Date.now();

  if (!forceRefresh && hasFreshCache(now)) {
    return buildCacheResponse({ cached: true });
  }

  if (inflightFetch) {
    return inflightFetch;
  }

  inflightFetch = (async () => {
    try {
      const results = await Promise.allSettled(
        RSS_SOURCES.map((source) => withTimeout(fetchSource(source), SOURCE_TIMEOUT_MS, source.name))
      );
      const rawArticles = results
        .filter((result) => result.status === "fulfilled")
        .flatMap((result) => result.value)
        .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));

      const failedSources = results
        .map((result, index) => (result.status === "rejected" ? RSS_SOURCES[index].name : null))
        .filter(Boolean);

      if (rawArticles.length === 0 && hasStaleCache(now)) {
        cache.failedSources = failedSources.length ? failedSources : cache.failedSources;
        return buildCacheResponse({ cached: true, failedSources: cache.failedSources });
      }

      const articles = dedupeArticles(rawArticles);
      await enrichMissingImages(articles);

      cache.articles = articles;
      cache.fetchedAt = Date.now();
      cache.failedSources = failedSources;

      return buildCacheResponse({ cached: false, failedSources });
    } finally {
      inflightFetch = null;
    }
  })();

  return inflightFetch;
}

function countBySource(articles) {
  return Object.fromEntries(
    RSS_SOURCES.map((source) => [
      source.name,
      articles.filter((article) => article.relatedSources.includes(source.name)).length
    ])
  );
}

function queryArticles(articles, { search = "", source = "All", page = 1, limit = 18 } = {}) {
  const normalizedSearch = String(search).trim().toLowerCase();
  const normalizedSource = String(source).trim();
  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.min(50, Math.max(1, Number(limit) || 18));

  const searched = articles.filter((article) => {
    const haystack = [article.title, article.description, article.source, article.relatedSources.join(" ")]
      .join(" ")
      .toLowerCase();
    return !normalizedSearch || haystack.includes(normalizedSearch);
  });

  const sourceCounts = countBySource(searched);

  const filtered = searched.filter((article) => {
    return !normalizedSource || normalizedSource === "All" || article.relatedSources.includes(normalizedSource);
  });

  const start = (safePage - 1) * safeLimit;
  const pagedArticles = filtered.slice(start, start + safeLimit);
  const featuredArticles = filtered.slice(0, FEATURED_LIMIT);

  return {
    articles: pagedArticles,
    featuredArticles,
    sourceCounts,
    pagination: {
      page: safePage,
      limit: safeLimit,
      totalArticles: filtered.length,
      totalPages: Math.max(1, Math.ceil(filtered.length / safeLimit)),
      hasMore: start + safeLimit < filtered.length
    }
  };
}

async function getAggregatedNews(options = {}) {
  const base = await getAllArticles(Boolean(options.forceRefresh));
  const queried = queryArticles(base.articles, options);

  return {
    articles: queried.articles,
    featuredArticles: queried.featuredArticles,
    meta: {
      ...base.meta,
      sourceCounts: queried.sourceCounts,
      pagination: queried.pagination
    }
  };
}

function clearCache() {
  cache.articles = [];
  cache.fetchedAt = 0;
  cache.failedSources = [];
}

module.exports = {
  CACHE_TTL_MS,
  RSS_SOURCES,
  getAggregatedNews,
  clearCache
};

