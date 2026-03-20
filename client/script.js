const SOURCE_META = {
  "TechCrunch AI": { favicon: "https://techcrunch.com/favicon.ico" },
  "AI News": { favicon: "https://www.artificialintelligence-news.com/favicon.ico" },
  "VentureBeat AI": { favicon: "https://venturebeat.com/favicon.ico" },
  "Google AI Blog": { favicon: "https://blog.google/favicon.ico" },
  "Towards AI": { favicon: "https://towardsai.net/favicon.ico" },
  "Hugging Face": { favicon: "https://huggingface.co/favicon.ico" },
  "OpenAI Blog": { favicon: "https://openai.com/favicon.ico" },
  "DeepMind Blog": { favicon: "https://deepmind.google/favicon.ico" },
  "Meta AI Blog": { favicon: "https://ai.meta.com/favicon.ico" },
  "KDnuggets": { favicon: "https://www.kdnuggets.com/favicon.ico" },
  "Machine Learning Mastery": { favicon: "https://machinelearningmastery.com/favicon.ico" },
  "The Decoder": { favicon: "https://the-decoder.com/favicon.ico" },
  "MarkTechPost": { favicon: "https://www.marktechpost.com/favicon.ico" },
  "Analytics Vidhya": { favicon: "https://www.analyticsvidhya.com/favicon.ico" },
  "MIT News AI": { favicon: "https://news.mit.edu/favicon.ico" },
  "AI Business": { favicon: "https://aibusiness.com/favicon.ico" },
  "AWS ML Blog": { favicon: "https://aws.amazon.com/favicon.ico" },
  "The Rundown AI": { favicon: "https://www.therundown.ai/favicon.ico" },
  "Superhuman AI": { favicon: "https://www.superhuman.ai/favicon.ico" },
  "Ben's Bites": { favicon: "https://www.bensbites.co/favicon.ico" },
  "ZDNET AI": { favicon: "https://www.zdnet.com/favicon.ico" },
  "WIRED AI": { favicon: "https://www.wired.com/favicon.ico" },
  "The Verge AI": { favicon: "https://www.theverge.com/favicon.ico" }
};

const SOURCE_PALETTE = {
  "TechCrunch AI": ["#8bffc9", "#149e5a"],
  "AI News": ["#d5f0ff", "#3b82f6"],
  "VentureBeat AI": ["#ffd7ce", "#ff6b57"],
  "Google AI Blog": ["#ffe6b8", "#f9ab00"],
  "Towards AI": ["#d5f6ff", "#00a3c8"],
  "Hugging Face": ["#ffe497", "#ffaf1c"],
  "OpenAI Blog": ["#9ef7d5", "#16a085"],
  "DeepMind Blog": ["#bfd2ff", "#4a6fff"],
  "Meta AI Blog": ["#d7dcff", "#4760ff"],
  "KDnuggets": ["#e0d6ff", "#6f54ff"],
  "Machine Learning Mastery": ["#c8ebff", "#1d7ed6"],
  "The Decoder": ["#c4f6ff", "#3795d8"],
  "MarkTechPost": ["#ffe0f0", "#ff4f8b"],
  "Analytics Vidhya": ["#bce7ff", "#2563eb"],
  "MIT News AI": ["#ffc9c9", "#a11a2b"],
  "AI Business": ["#d4d1ff", "#5b4dff"],
  "AWS ML Blog": ["#ffe0a8", "#ff9900"],
  "The Rundown AI": ["#d7ffee", "#1f9d72"],
  "Superhuman AI": ["#ffe4c7", "#ff8f3d"],
  "Ben's Bites": ["#fff0b3", "#e2a400"],
  "ZDNET AI": ["#d1f0ff", "#1591d6"],
  "WIRED AI": ["#d4ddff", "#6a7cff"],
  "The Verge AI": ["#ffd7c6", "#ff5e3a"]
};

const TREND_STOP_WORDS = new Set([
  "the", "and", "for", "with", "from", "that", "this", "into", "will", "your", "their", "about",
  "have", "more", "than", "after", "over", "under", "latest", "review", "just", "gets", "make",
  "makes", "says", "say", "best", "first", "guide", "hands", "hand", "new", "you", "are", "which"
]);

const state = {
  articles: [],
  featuredArticles: [],
  page: 1,
  limit: 18,
  hasMore: true,
  isLoading: false,
  selectedSource: "All",
  searchTerm: "",
  fetchedAt: "",
  sourceCounts: {},
  knownSources: Object.keys(SOURCE_META),
  failedSources: [],
  savedArticles: [],
  hiddenSources: [],
  settings: {
    sort: "newest",
    cardsPerBatch: 18,
    stickySidebar: true,
    showFeatured: true
  }
};

let currentController = null;
let searchTimer = null;

const elements = {
  newsGrid: document.getElementById("newsGrid"),
  featuredGrid: document.getElementById("featuredGrid"),
  featuredSection: document.getElementById("featuredSection"),
  trendingTopics: document.getElementById("trendingTopics"),
  loadingState: document.getElementById("loadingState"),
  skeletonGrid: document.getElementById("skeletonGrid"),
  emptyState: document.getElementById("emptyState"),
  endState: document.getElementById("endState"),
  scrollSentinel: document.getElementById("scrollSentinel"),
  searchToggleBtn: document.getElementById("searchToggleBtn"),
  searchPanel: document.getElementById("searchPanel"),
  searchInput: document.getElementById("searchInput"),
  sourceFilters: document.getElementById("sourceFilters"),
  sourceSelect: document.getElementById("sourceSelect"),
  clearFilterBtn: document.getElementById("clearFilterBtn"),
  themeToggle: document.getElementById("themeToggle"),
  refreshFeedsBtn: document.getElementById("refreshFeedsBtn"),
  backToTopBtn: document.getElementById("backToTopBtn"),
  scrollTopBtn: document.getElementById("scrollTopBtn"),
  settingsBtn: document.getElementById("settingsBtn"),
  settingsPanel: document.getElementById("settingsPanel"),
  savedBtn: document.getElementById("savedBtn"),
  diagnosticsBtn: document.getElementById("diagnosticsBtn"),
  sortSelect: document.getElementById("sortSelect"),
  cardsPerBatchSelect: document.getElementById("cardsPerBatchSelect"),
  stickySidebarToggle: document.getElementById("stickySidebarToggle"),
  showFeaturedToggle: document.getElementById("showFeaturedToggle"),
  openFeaturedBtn: document.getElementById("openFeaturedBtn"),
  feedStatus: document.getElementById("feedStatus"),
  resultsTitle: document.getElementById("resultsTitle"),
  articleCardTemplate: document.getElementById("articleCardTemplate"),
  featuredCardTemplate: document.getElementById("featuredCardTemplate"),
  modalOverlay: document.getElementById("modalOverlay"),
  modalContent: document.getElementById("modalContent"),
  modalCloseBtn: document.getElementById("modalCloseBtn")
};

function formatDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Unknown date"
    : new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function formatRelativeTime(value) {
  const now = Date.now();
  const diffMs = now - new Date(value).getTime();
  const diffMinutes = Math.max(1, Math.round(diffMs / 60000));

  if (diffMinutes < 60) return `${diffMinutes}m ago`;

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  return `${Math.round(diffHours / 24)}d ago`;
}

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function highlightText(value, query) {
  const safeValue = escapeHtml(value);
  if (!query) return safeValue;

  const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return safeValue.replace(new RegExp(`(${escapedQuery})`, "ig"), "<mark>$1</mark>");
}

function tokenize(value = "") {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token && token.length > 2 && !TREND_STOP_WORDS.has(token));
}

function buildTrendPhrases(article) {
  const tokens = tokenize(`${article.title} ${article.description}`);
  const phrases = [];

  for (let index = 0; index < tokens.length; index += 1) {
    const pair = tokens.slice(index, index + 2);
    const triple = tokens.slice(index, index + 3);

    if (triple.length === 3) {
      phrases.push(triple.join(" "));
    }

    if (pair.length === 2) {
      phrases.push(pair.join(" "));
    }
  }

  return Array.from(new Set(phrases)).filter((phrase) => /[a-z]/.test(phrase) && phrase.length >= 7 && phrase.length <= 40);
}

function formatTrendLabel(phrase) {
  return phrase.replace(/\b(ai|ios|macos|ipad|api|gpu|cpu|usb|ssd|openai|android)\b/gi, (match) => match.toUpperCase())
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

function computeTrending(articles) {
  const counts = new Map();

  articles.forEach((article) => {
    buildTrendPhrases(article).slice(0, 12).forEach((phrase) => {
      counts.set(phrase, (counts.get(phrase) || 0) + 1);
    });
  });

  return Array.from(counts.entries())
    .filter(([, count]) => count > 1)
    .sort((a, b) => b[1] - a[1] || a[0].length - b[0].length)
    .slice(0, 10)
    .map(([phrase, count]) => [formatTrendLabel(phrase), count]);
}

function getSourceMeta(source) {
  return SOURCE_META[source] || { favicon: "" };
}

function sourceInitials(source) {
  return source
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 3)
    .toUpperCase();
}

function articleMeta(article) {
  const sourceList = article.relatedSources?.length > 1 ? article.relatedSources.join(", ") : article.source;
  const duplicateText = article.duplicateCount ? ` • ${article.duplicateCount + 1} sources` : "";
  return `${sourceList} • ${formatRelativeTime(article.publishedAt)} • ${formatDate(article.publishedAt)}${duplicateText}`;
}

function iconMarkup(name) {
  switch (name) {
    case "preview":
      return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.8-6 10-6 10 6 10 6-3.8 6-10 6-10-6-10-6Z" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>';
    case "save":
      return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3.5h10a1.5 1.5 0 0 1 1.5 1.5v15.2L12 16.5l-6.5 3.7V5A1.5 1.5 0 0 1 7 3.5Z" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>';
    case "saved":
      return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3.5h10a1.5 1.5 0 0 1 1.5 1.5v15.2L12 16.5l-6.5 3.7V5A1.5 1.5 0 0 1 7 3.5Z" fill="currentColor" stroke="currentColor" stroke-width="1.5"/></svg>';
    case "hide":
      return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3l18 18" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M10.6 5.8A11.8 11.8 0 0 1 12 5.7c6.1 0 9.9 6.3 9.9 6.3a17.9 17.9 0 0 1-3.8 4.3" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M6.1 7.4A18.2 18.2 0 0 0 2.1 12s3.8 6.3 9.9 6.3c1.3 0 2.6-.2 3.7-.7" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M10 10a3.2 3.2 0 0 0 4 4" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>';
    case "show":
      return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.8-6 10-6 10 6 10 6-3.8 6-10 6-10-6-10-6Z" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>';
    case "search":
      return '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="5.8" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M15 15l5.2 5.2" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>';
    case "refresh":
      return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 5.5v5h-5" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M19.4 10.5A7.5 7.5 0 1 0 20 13.4" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>';
    case "saved-list":
      return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3.5h10a1.5 1.5 0 0 1 1.5 1.5v15.2L12 16.5l-6.5 3.7V5A1.5 1.5 0 0 1 7 3.5Z" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M9 8.2h6" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>';
    case "diagnostics":
      return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 19V9M12 19V5M19 19v-8" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="5" cy="7" r="2" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="3" r="2" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="19" cy="9" r="2" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>';
    case "settings":
      return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 3.8h4l.7 2.4 2.4 1.1 2.3-1.1 2 3.5-1.8 1.8.2 1.4-.2 1.4 1.8 1.8-2 3.5-2.3-1.1-2.4 1.1-.7 2.4h-4l-.7-2.4-2.4-1.1-2.3 1.1-2-3.5 1.8-1.8-.2-1.4.2-1.4-1.8-1.8 2-3.5 2.3 1.1 2.4-1.1.7-2.4Z" fill="none" stroke="currentColor" stroke-width="1.4"/><circle cx="12" cy="12" r="3.1" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>';
    case "sun":
      return '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M12 2.5v2.5M12 19v2.5M21.5 12H19M5 12H2.5M18.7 5.3l-1.8 1.8M7.1 16.9l-1.8 1.8M18.7 18.7l-1.8-1.8M7.1 7.1 5.3 5.3" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>';
    case "moon":
      return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18.5 14.6A7.7 7.7 0 0 1 9.4 5.5a8.6 8.6 0 1 0 9.1 9.1Z" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>';
    case "reset":
      return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 4.5V9h4.5" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M5 9a7 7 0 1 1-1 3.6" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>';
    case "launch":
      return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 5h5v5" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M10 14 19 5" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M19 13v5a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>';
    case "up":
      return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 18V6" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M6.5 11.5 12 6l5.5 5.5" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>';
    case "close":
      return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 7l10 10M17 7 7 17" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>';
    default:
      return "";
  }
}

function setIconButton(button, iconName, label) {
  button.innerHTML = iconMarkup(iconName);
  button.setAttribute("aria-label", label);
  button.setAttribute("title", label);
}
function saveState() {
  sessionStorage.setItem("neuralwire-hidden-sources", JSON.stringify(state.hiddenSources));
  sessionStorage.setItem("neuralwire-saved-articles", JSON.stringify(state.savedArticles));
  localStorage.setItem("neuralwire-settings", JSON.stringify(state.settings));
}

function loadPersistedState() {
  try {
    state.hiddenSources = JSON.parse(sessionStorage.getItem("neuralwire-hidden-sources") || "[]");
    state.savedArticles = JSON.parse(sessionStorage.getItem("neuralwire-saved-articles") || "[]");
    const settings = JSON.parse(localStorage.getItem("neuralwire-settings") || "{}");
    state.settings = { ...state.settings, ...settings };
    state.limit = state.settings.cardsPerBatch;
  } catch {
    state.hiddenSources = [];
    state.savedArticles = [];
  }
}

function hydrateFromUrl() {
  const params = new URLSearchParams(window.location.search);
  state.searchTerm = params.get("search") || "";
  state.selectedSource = params.get("source") || "All";
  state.page = Math.max(1, Number(params.get("page") || 1));

  if (params.get("sort")) {
    state.settings.sort = params.get("sort");
  }

  elements.searchInput.value = state.searchTerm;
}

function syncUrl() {
  const params = new URLSearchParams(window.location.search);

  state.searchTerm ? params.set("search", state.searchTerm) : params.delete("search");
  state.selectedSource !== "All" ? params.set("source", state.selectedSource) : params.delete("source");
  state.page > 1 ? params.set("page", String(state.page)) : params.delete("page");
  state.settings.sort !== "newest" ? params.set("sort", state.settings.sort) : params.delete("sort");

  const nextUrl = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ""}`;
  window.history.replaceState({}, "", nextUrl);
}

function setThemeLabel(theme) {
  setIconButton(elements.themeToggle, theme === "night" ? "sun" : "moon", theme === "night" ? "Day edition" : "Night edition");
}

function updateControlButtons() {
  setIconButton(elements.searchToggleBtn, "search", "Search stories");
  setIconButton(elements.refreshFeedsBtn, "refresh", "Refresh feeds");
  setIconButton(elements.savedBtn, "saved-list", "Saved stories");
  setIconButton(elements.diagnosticsBtn, "diagnostics", "Feed details");
  setIconButton(elements.settingsBtn, "settings", "Settings");
  setIconButton(elements.clearFilterBtn, "reset", "Reset filters");
  setIconButton(elements.openFeaturedBtn, "launch", "Open all featured stories");
  setIconButton(elements.scrollTopBtn, "up", "Back to top");
  setIconButton(elements.backToTopBtn, "up", "Back to top");
  setIconButton(elements.modalCloseBtn, "close", "Close");
}

function applySettingsToUi() {
  elements.sortSelect.value = state.settings.sort;
  elements.cardsPerBatchSelect.value = String(state.settings.cardsPerBatch);
  elements.stickySidebarToggle.checked = state.settings.stickySidebar;
  elements.showFeaturedToggle.checked = state.settings.showFeatured;
  document.body.classList.toggle("no-sticky-sidebar", !state.settings.stickySidebar);
  elements.featuredSection.classList.toggle("hidden", !state.settings.showFeatured);
  updateControlButtons();
}

function scrollPageToTop() {
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function setContainerHtml(element, markup) {
  element.innerHTML = markup;
}

function clearFeedDom() {
  elements.newsGrid.innerHTML = "";
  elements.featuredGrid.innerHTML = "";
}

function isSaved(articleId) {
  return state.savedArticles.some((article) => article.id === articleId);
}

function syncSaveButtons(articleId = null) {
  const selector = articleId ? `[data-article-id="${articleId}"]` : "[data-article-id]";
  document.querySelectorAll(selector).forEach((button) => {
    const buttonArticleId = button.dataset.articleId;
    const saved = isSaved(buttonArticleId);
    setIconButton(button, saved ? "saved" : "save", saved ? "Saved" : "Save story");
  });
}

function toggleSaveArticle(article) {
  state.savedArticles = isSaved(article.id)
    ? state.savedArticles.filter((saved) => saved.id !== article.id)
    : [{ ...article }, ...state.savedArticles];

  saveState();
  applySettingsToUi();
  syncSaveButtons(article.id);

  if (!elements.modalOverlay.classList.contains("hidden") && elements.modalContent.querySelector(".saved-list")) {
    openSavedModal();
  }
}

function sortArticles(articles) {
  const sorted = [...articles];

  switch (state.settings.sort) {
    case "source":
      return sorted.sort((a, b) => a.source.localeCompare(b.source) || a.title.localeCompare(b.title));
    case "duplicated":
      return sorted.sort(
        (a, b) => (b.duplicateCount || 0) - (a.duplicateCount || 0) || new Date(b.publishedAt) - new Date(a.publishedAt)
      );
    case "newest":
    default:
      return sorted.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
  }
}

function isArticleHidden(article) {
  return article.relatedSources?.some((source) => state.hiddenSources.includes(source));
}

function getVisibleArticles() {
  return sortArticles(state.articles.filter((article) => !isArticleHidden(article)));
}

function getVisibleFeatured() {
  return sortArticles(state.featuredArticles.filter((article) => !isArticleHidden(article))).slice(0, 4);
}

function getFilteredArticles() {
  const articles = getVisibleArticles();
  return state.selectedSource === "All"
    ? articles
    : articles.filter((article) => article.relatedSources?.includes(state.selectedSource));
}

function applyPlaceholder(node, source, title, className) {
  const [start, end] = SOURCE_PALETTE[source] || ["#e8ecf8", "#6f82ff"];
  node.className = className;
  node.style.setProperty("--placeholder-start", start);
  node.style.setProperty("--placeholder-end", end);
  node.innerHTML = `<span>${sourceInitials(source)}</span><small>${escapeHtml(title)}</small>`;
  node.classList.remove("hidden");
}

function attachImageOrPlaceholder(imageNode, placeholderNode, article, placeholderClass) {
  const showPlaceholder = () => {
    imageNode.classList.add("hidden");
    applyPlaceholder(placeholderNode, article.source, article.title, placeholderClass);
  };

  if (!article.image) {
    showPlaceholder();
    return;
  }

  imageNode.src = article.image;
  imageNode.alt = `${article.title} preview image`;
  imageNode.classList.remove("hidden");
  imageNode.addEventListener("error", showPlaceholder, { once: true });
}

function renderSourceIcon(source, className = "") {
  const { favicon } = getSourceMeta(source);
  const fallback = sourceInitials(source).slice(0, 2);
  const classAttribute = className ? ` class="${className}"` : "";

  return favicon
    ? `<img${classAttribute} src="${favicon}" alt="" onerror="this.replaceWith(Object.assign(document.createElement('span'), { className: 'source-icon-fallback', textContent: '${fallback}' }))" />`
    : `<span class="source-icon-fallback">${fallback}</span>`;
}

function setSourceBadge(container, source) {
  container.innerHTML = `${renderSourceIcon(source)}<span>${escapeHtml(source)}</span>`;
}

function buildCard(template, article, config) {
  const fragment = template.content.cloneNode(true);
  const image = fragment.querySelector(config.imageSelector);
  const placeholder = fragment.querySelector(config.placeholderSelector);
  const badge = fragment.querySelector(config.badgeSelector);
  const meta = fragment.querySelector(config.metaSelector);
  const title = fragment.querySelector(config.titleSelector);
  const description = fragment.querySelector(config.descriptionSelector);
  const previewBtn = fragment.querySelector(config.previewSelector);
  const saveBtn = fragment.querySelector(config.saveSelector);
  const link = fragment.querySelector(config.linkSelector);

  attachImageOrPlaceholder(image, placeholder, article, config.placeholderClass);
  setSourceBadge(badge, article.source);
  meta.textContent = articleMeta(article);
  title.innerHTML = highlightText(article.title, state.searchTerm);
  description.innerHTML = highlightText(article.description || "Open the story to read the full article.", state.searchTerm);
  setIconButton(previewBtn, "preview", "Preview story");
  previewBtn.addEventListener("click", () => openArticleModal(article));
  saveBtn.dataset.articleId = article.id;
  setIconButton(saveBtn, isSaved(article.id) ? "saved" : "save", isSaved(article.id) ? "Saved" : "Save story");
  saveBtn.addEventListener("click", () => toggleSaveArticle(article));
  link.href = article.link;

  return fragment;
}

function createArticleCard(article) {
  return buildCard(elements.articleCardTemplate, article, {
    imageSelector: ".news-card__image",
    placeholderSelector: ".news-card__placeholder",
    badgeSelector: ".news-card__source-badge",
    metaSelector: ".news-card__meta",
    titleSelector: ".news-card__title",
    descriptionSelector: ".news-card__description",
    previewSelector: ".card-preview-btn",
    saveSelector: ".card-save-btn",
    linkSelector: ".news-card__link",
    placeholderClass: "news-card__placeholder"
  });
}

function createFeaturedCard(article) {
  return buildCard(elements.featuredCardTemplate, article, {
    imageSelector: ".featured-card__image",
    placeholderSelector: ".featured-card__placeholder",
    badgeSelector: ".featured-card__badge",
    metaSelector: ".featured-card__meta",
    titleSelector: ".featured-card__title",
    descriptionSelector: ".featured-card__description",
    previewSelector: ".featured-preview-btn",
    saveSelector: ".featured-save-btn",
    linkSelector: ".news-card__link",
    placeholderClass: "featured-card__placeholder"
  });
}

function selectSource(source) {
  state.selectedSource = source;
  resetAndReload();
}

function toggleHiddenSource(source) {
  const hidden = state.hiddenSources.includes(source);

  state.hiddenSources = hidden
    ? state.hiddenSources.filter((entry) => entry !== source)
    : Array.from(new Set([...state.hiddenSources, source]));

  if (!hidden && state.selectedSource === source) {
    state.selectedSource = "All";
  }

  saveState();
  renderCurrentView();
  syncUrl();
}

function renderSourceRow(source, count, hidden = false) {
  const row = document.createElement("div");
  row.className = `source-row${hidden ? " is-hidden-source" : ""}`;

  if (source === "All") {
    row.innerHTML = `<button type="button" class="filter-chip${state.selectedSource === "All" ? " active" : ""}"><span>All</span><strong>${count}</strong></button>`;
    row.querySelector("button").addEventListener("click", () => selectSource("All"));
    return row;
  }

  const { favicon } = getSourceMeta(source);
  row.innerHTML = `
    <button type="button" class="filter-chip${state.selectedSource === source ? " active" : ""}" ${hidden ? "disabled" : ""}>
      <span class="source-chip__main">${renderSourceIcon(source)}<span>${escapeHtml(source)}</span></span>
      <strong>${count}</strong>
    </button>
    <button type="button" class="source-toggle-btn icon-button" aria-label="${hidden ? "Show source" : "Hide source"}" title="${hidden ? "Show source" : "Hide source"}">${iconMarkup(hidden ? "show" : "hide")}</button>
  `;

  row.querySelector(".filter-chip").addEventListener("click", () => selectSource(source));
  row.querySelector(".source-toggle-btn").addEventListener("click", () => toggleHiddenSource(source));
  return row;
}

function renderMobileSourceSelect() {
  const options = [
    `<option value="All">All (${getVisibleArticles().length})</option>`, 
    ...state.knownSources
      .filter((source) => !state.hiddenSources.includes(source))
      .map((source) => `<option value="${escapeHtml(source)}">${escapeHtml(source)} (${Number(state.sourceCounts[source] || 0)})</option>`)
  ];

  elements.sourceSelect.innerHTML = options.join("");
  elements.sourceSelect.value = options.some((option) => option.includes(`value="${escapeHtml(state.selectedSource)}"`)) ? state.selectedSource : "All";
}

function renderSourceFilters() {
  elements.sourceFilters.innerHTML = "";
  const fragment = document.createDocumentFragment();

  fragment.appendChild(renderSourceRow("All", getVisibleArticles().length));

  state.knownSources.forEach((source) => {
    fragment.appendChild(
      renderSourceRow(source, Number(state.sourceCounts[source] || 0), state.hiddenSources.includes(source))
    );
  });

  elements.sourceFilters.appendChild(fragment);
  renderMobileSourceSelect();
}

function renderSkeletons() {
  const cards = Array.from({ length: 6 }, () => (
    '<div class="skeleton-card"><div class="skeleton-card__media"></div><div class="skeleton-card__line skeleton-card__line--short"></div><div class="skeleton-card__line"></div><div class="skeleton-card__line"></div></div>'
  ));
  setContainerHtml(elements.skeletonGrid, cards.join(""));
}

function renderTrendingTopics() {
  const topics = computeTrending(getVisibleArticles());
  setContainerHtml(
    elements.trendingTopics,
    topics.length
      ? topics
          .map(
            ([topic, count]) =>
              `<button type="button" class="trend-chip" data-topic="${escapeHtml(topic)}">${escapeHtml(topic)} <strong>${count}</strong></button>`
          )
          .join("")
      : '<p class="state-inline">No strong topic clusters yet.</p>'
  );

  elements.trendingTopics.querySelectorAll(".trend-chip").forEach((button) => {
    button.addEventListener("click", () => {
      state.searchTerm = button.dataset.topic || "";
      elements.searchInput.value = state.searchTerm;
      resetAndReload();
    });
  });
}

function diagnosticsMarkup() {
  const activeSources = state.knownSources.length - state.hiddenSources.length - state.failedSources.length;
  const items = [
    [getVisibleArticles().length, "Loaded"],
    [activeSources, "Active sources"],
    [state.failedSources.length, "Failed"],
    [state.fetchedAt ? formatRelativeTime(state.fetchedAt) : "-", "Last refresh"],
    [state.hiddenSources.length, "Hidden sources"]
  ];

  return `
    <section>
      <p class="eyebrow">Feed details</p>
      <h2 id="modalTitle">Coverage snapshot</h2>
      <div class="diagnostics-grid">
        ${items.map(([value, label]) => `<div class="diagnostic-pill"><strong>${value}</strong><span>${label}</span></div>`).join("")}
      </div>
    </section>
  `;
}

function openDiagnosticsModal() {
  openModal(diagnosticsMarkup());
}

function renderCardCollection(container, articles, createCard) {
  container.innerHTML = "";
  const fragment = document.createDocumentFragment();
  articles.forEach((article) => fragment.appendChild(createCard(article)));
  container.appendChild(fragment);
}

function renderCurrentView() {
  const featuredArticles = getVisibleFeatured();
  const filteredArticles = getFilteredArticles();

  renderCardCollection(elements.newsGrid, filteredArticles, createArticleCard);
  renderCardCollection(elements.featuredGrid, featuredArticles, createFeaturedCard);

  elements.featuredSection.classList.toggle("hidden", !state.settings.showFeatured || featuredArticles.length === 0);
  elements.emptyState.classList.toggle("hidden", filteredArticles.length !== 0);
  elements.resultsTitle.textContent = state.selectedSource === "All" ? "Top stories" : `${state.selectedSource} stories`;

  renderSourceFilters();
  renderTrendingTopics();

}

function buildApiUrl({ page = state.page, refresh = false } = {}) {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(state.limit),
    search: state.searchTerm,
    source: state.selectedSource
  });

  if (refresh) {
    params.set("refresh", "1");
  }

  return `/api/news?${params.toString()}`;
}

function abortCurrentRequest() {
  if (!currentController) {
    return;
  }

  currentController.abort();
  currentController = null;
}

function setLoadingState(message, { show = true } = {}) {
  elements.loadingState.textContent = message;
  elements.loadingState.classList.toggle("hidden", !show);
}

async function loadNews({ append = false, pageOverride = null, refresh = false } = {}) {
  if (state.isLoading || (!state.hasMore && append && !refresh)) {
    return;
  }

  state.isLoading = true;
  currentController = new AbortController();
  setLoadingState(append ? "Loading more stories..." : refresh ? "Refreshing feeds..." : "Fetching the latest articles...");
  elements.skeletonGrid.classList.remove("hidden");
  renderSkeletons();

  if (!append) {
    elements.endState.classList.add("hidden");
  }

  try {
    const response = await fetch(buildApiUrl({ page: pageOverride ?? state.page, refresh }), {
      signal: currentController.signal
    });

    if (!response.ok) {
      throw new Error("Request failed");
    }

    const data = await response.json();
    const incomingArticles = Array.isArray(data.articles) ? data.articles : [];
    const incomingFeatured = Array.isArray(data.featuredArticles) ? data.featuredArticles : [];
    const pagination = data.meta?.pagination || {};

    state.articles = append ? state.articles.concat(incomingArticles) : incomingArticles;
    state.featuredArticles = incomingFeatured;
    state.hasMore = Boolean(pagination.hasMore);
    state.fetchedAt = data.meta?.fetchedAt || "";
    state.sourceCounts = data.meta?.sourceCounts || {};
    state.failedSources = data.meta?.failedSources || [];
    state.knownSources = data.meta?.sources || state.knownSources;
    state.page = Number(pagination.page) || state.page;

    elements.feedStatus.textContent = state.failedSources.length
      ? `Updated ${formatDate(state.fetchedAt)}. Some feeds were unavailable: ${state.failedSources.join(", ")}.`
      : `Updated ${formatDate(state.fetchedAt)}${data.meta?.cached ? " from cache" : ""}.`;

    renderCurrentView();
    syncUrl();
  } catch (error) {
    if (error.name === "AbortError") {
      return;
    }

    if (!append) {
      state.articles = [];
      state.featuredArticles = [];
      clearFeedDom();
    }

    elements.feedStatus.textContent = "Unable to load feeds right now. Please try refreshing in a moment.";
    setLoadingState("Something went wrong while fetching the latest articles.");
  } finally {
    state.isLoading = false;
    currentController = null;
    elements.loadingState.classList.add("hidden");
    elements.skeletonGrid.classList.add("hidden");
    elements.endState.classList.toggle("hidden", state.hasMore || getVisibleArticles().length === 0);
  }
}

async function hydratePagedState() {
  const targetPage = state.page;
  state.page = 1;
  state.hasMore = true;

  for (let page = 1; page <= targetPage; page += 1) {
    await loadNews({ append: page > 1, pageOverride: page });

    if (!state.hasMore && page < targetPage) {
      break;
    }
  }
}

function resetAndReload({ refresh = false } = {}) {
  abortCurrentRequest();
  scrollPageToTop();
  state.page = 1;
  state.hasMore = true;
  state.articles = [];
  state.featuredArticles = [];
  clearFeedDom();
  syncUrl();
  loadNews({ refresh });
}

function toggleSearchPanel(forceOpen = null) {
  const shouldOpen = forceOpen ?? elements.searchPanel.classList.contains("hidden");
  elements.searchPanel.classList.toggle("hidden", !shouldOpen);
  elements.searchToggleBtn.classList.toggle("is-active", shouldOpen);
  if (shouldOpen) {
    elements.searchInput.focus();
  }
}

function openModal(markup) {
  elements.modalContent.innerHTML = markup;
  elements.modalOverlay.classList.remove("hidden");
}

function openArticleModal(article) {
  const { favicon } = getSourceMeta(article.source);
  openModal(`
    <article class="modal-article">
      ${article.image ? `<img class="modal-article__image" src="${article.image}" alt="${escapeHtml(article.title)}" />` : ""}
      <p class="eyebrow">Preview</p>
      <h2 id="modalTitle">${escapeHtml(article.title)}</h2>
      <p class="modal-meta">${escapeHtml(articleMeta(article))}</p>
      <p class="modal-source">${renderSourceIcon(article.source)}<span>${escapeHtml(article.source)}</span></p>
      <p class="modal-description">${escapeHtml(article.description || "Open the article to read the full story.")}</p>
      <div class="modal-actions">
        <button id="modalSaveBtn" class="text-button icon-button" type="button" data-article-id="${article.id}" aria-label="${isSaved(article.id) ? "Saved" : "Save for later"}" title="${isSaved(article.id) ? "Saved" : "Save for later"}">${iconMarkup(isSaved(article.id) ? "saved" : "save")}</button>
        <a class="news-card__link" href="${article.link}" target="_blank" rel="noopener noreferrer">Open original</a>
      </div>
    </article>
  `);

  document.getElementById("modalSaveBtn").addEventListener("click", () => {
    toggleSaveArticle(article);
    openArticleModal(article);
  });
}

function openFeaturedModal() {
  const featuredArticles = getVisibleFeatured();
  const content = featuredArticles.length
    ? featuredArticles
        .map(
          (article) => `<div class="saved-row"><button class="saved-open" data-id="${escapeHtml(article.id)}" type="button">${escapeHtml(article.title)}</button><a class="text-button saved-remove" href="${article.link}" target="_blank" rel="noopener noreferrer">Open</a></div>`
        )
        .join("")
    : '<p class="state-inline">No featured stories available right now.</p>';

  openModal(`
    <section>
      <p class="eyebrow">Featured</p>
      <div class="saved-header">
        <h2 id="modalTitle">Featured stories</h2>
        <span class="saved-count-pill">${featuredArticles.length}</span>
      </div>
      <div class="saved-list">${content}</div>
    </section>
  `);

  elements.modalContent.querySelectorAll(".saved-open").forEach((button) => {
    button.addEventListener("click", () => {
      const article = featuredArticles.find((entry) => entry.id === button.dataset.id);
      if (article) {
        openArticleModal(article);
      }
    });
  });
}
function openSavedModal() {
  const content = state.savedArticles.length
    ? state.savedArticles
        .map(
          (article) =>
            `<div class="saved-row"><button class="saved-open" data-id="${escapeHtml(article.id)}" type="button">${escapeHtml(article.title)}</button><button class="text-button saved-remove" data-id="${escapeHtml(article.id)}" type="button">Remove</button></div>`
        )
        .join("")
    : '<p class="state-inline">No saved stories yet.</p>';

  openModal(`
    <section>
      <p class="eyebrow">Read later</p>
      <div class="saved-header">
        <h2 id="modalTitle">Saved stories</h2>
        <span class="saved-count-pill">${state.savedArticles.length}</span>
      </div>
      <div class="saved-list">${content}</div>
    </section>
  `);

  elements.modalContent.querySelectorAll(".saved-open").forEach((button) => {
    button.addEventListener("click", () => {
      const article = state.savedArticles.find((entry) => entry.id === button.dataset.id);
      if (article) {
        openArticleModal(article);
      }
    });
  });

  elements.modalContent.querySelectorAll(".saved-remove").forEach((button) => {
    button.addEventListener("click", () => {
      state.savedArticles = state.savedArticles.filter((entry) => entry.id !== button.dataset.id);
      saveState();
      applySettingsToUi();
      renderCurrentView();
      openSavedModal();
    });
  });
}

function closeModal() {
  elements.modalOverlay.classList.add("hidden");
  elements.modalContent.innerHTML = "";
}

function applyTheme(theme) {
  document.body.classList.toggle("night", theme === "night");
  localStorage.setItem("neuralwire-theme", theme);
  setThemeLabel(theme);
}

function bindScrollToTop(button) {
  button.addEventListener("click", scrollPageToTop);
}

const observer = new IntersectionObserver(
  (entries) => {
    const [entry] = entries;
    if (!entry.isIntersecting || state.isLoading || !state.hasMore) {
      return;
    }

    state.page += 1;
    loadNews({ append: true });
  },
  { rootMargin: "500px 0px" }
);

elements.searchInput.addEventListener("input", (event) => {
  state.searchTerm = event.target.value.trim();
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => resetAndReload(), 250);
});

elements.searchToggleBtn.addEventListener("click", () => toggleSearchPanel());

elements.clearFilterBtn.addEventListener("click", () => {
  state.selectedSource = "All";
  state.searchTerm = "";
  elements.searchInput.value = "";
  elements.sourceSelect.value = "All";
  toggleSearchPanel(false);
  resetAndReload();
});

elements.sourceSelect.addEventListener("change", (event) => {
  selectSource(event.target.value || "All");
});

elements.themeToggle.addEventListener("click", () => {
  applyTheme(document.body.classList.contains("night") ? "light" : "night");
});

elements.refreshFeedsBtn.addEventListener("click", async () => {
  elements.refreshFeedsBtn.disabled = true;

  try {
    await fetch("/api/news/refresh", { method: "POST" });
  } catch {
  } finally {
    elements.refreshFeedsBtn.disabled = false;
  }

  resetAndReload({ refresh: true });
});

elements.savedBtn.addEventListener("click", openSavedModal);
elements.diagnosticsBtn.addEventListener("click", openDiagnosticsModal);
elements.settingsBtn.addEventListener("click", () => elements.settingsPanel.classList.toggle("hidden"));
bindScrollToTop(elements.backToTopBtn);
bindScrollToTop(elements.scrollTopBtn);
elements.openFeaturedBtn.addEventListener("click", openFeaturedModal);
elements.modalCloseBtn.addEventListener("click", closeModal);
elements.modalOverlay.addEventListener("click", (event) => {
  if (event.target === elements.modalOverlay) {
    closeModal();
  }
});

elements.sortSelect.addEventListener("change", () => {
  state.settings.sort = elements.sortSelect.value;
  saveState();
  renderCurrentView();
  syncUrl();
});

elements.cardsPerBatchSelect.addEventListener("change", () => {
  state.settings.cardsPerBatch = Number(elements.cardsPerBatchSelect.value);
  state.limit = state.settings.cardsPerBatch;
  saveState();
  resetAndReload();
});

elements.stickySidebarToggle.addEventListener("change", () => {
  state.settings.stickySidebar = elements.stickySidebarToggle.checked;
  saveState();
  applySettingsToUi();
});

elements.showFeaturedToggle.addEventListener("change", () => {
  state.settings.showFeatured = elements.showFeaturedToggle.checked;
  saveState();
  applySettingsToUi();
  renderCurrentView();
});

window.addEventListener("scroll", () => {
  elements.backToTopBtn.classList.toggle("hidden", window.scrollY < 600);
});

window.addEventListener("keydown", (event) => {
  const tag = document.activeElement?.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || document.activeElement?.isContentEditable) {
    return;
  }

  if (event.key === "/") {
    event.preventDefault();
    elements.searchInput.focus();
  }

  if (event.key.toLowerCase() === "t") {
    scrollPageToTop();
  }

  if (event.key.toLowerCase() === "d") {
    elements.themeToggle.click();
  }

  if (event.key === "Escape") {
    closeModal();
  }
});

loadPersistedState();
applySettingsToUi();
updateControlButtons();
applyTheme(localStorage.getItem("neuralwire-theme") === "night" ? "night" : "light");
hydrateFromUrl();
if (state.searchTerm) {
  toggleSearchPanel(true);
}
observer.observe(elements.scrollSentinel);
hydratePagedState();






















