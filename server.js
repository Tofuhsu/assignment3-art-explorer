require("dotenv").config();

const express = require("express");
const path = require("path");
const fetch = require("node-fetch");

const app = express();
const PORT = process.env.PORT || 8080;
const HARVARD_API_KEY = process.env.HARVARD_API_KEY;

const PAGE_SIZE = 12;
const MET_CONCURRENCY = 10;
const HARVARD_PAGE_SIZE = 100;
const SEARCH_CACHE_TTL_MS = 5 * 60 * 1000;

const metCache = new Map();
const harvardCache = new Map();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

function normalizeSource(source) {
  const s = String(source || "both").trim().toLowerCase();
  if (s === "met" || s.includes("met")) return "met";
  if (s === "harvard" || s.includes("harv")) return "harvard";
  return "both";
}

function museumLocation(source) {
  if (source === "harvard") {
    return {
      museum: "Harvard Art Museums",
      latitude: 42.3744,
      longitude: -71.1143,
      address: "32 Quincy St, Cambridge, MA 02138",
    };
  }

  return {
    museum: "The Metropolitan Museum of Art",
    latitude: 40.7794,
    longitude: -73.9632,
    address: "1000 5th Ave, New York, NY 10028",
  };
}

async function fetchJsonSafe(url) {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        Accept: "application/json",
      },
    });

    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

function normalizeMetObject(obj) {
  if (!obj) return null;

  return {
    source: "met",
    id: String(obj.objectID),
    title: obj.title || "Untitled",
    artist: obj.artistDisplayName || "Unknown Artist",
    date: obj.objectDate || "",
    medium: obj.medium || "",
    dimensions: obj.dimensions || "",
    department: obj.department || "",
    image: obj.primaryImageSmall || obj.primaryImage || "",
    imageLarge: obj.primaryImage || obj.primaryImageSmall || "",
    objectURL: obj.objectURL || "",
    museum: "The Metropolitan Museum of Art",
    museumLocation: museumLocation("met"),
  };
}

function normalizeHarvardObject(obj) {
  if (!obj) return null;

  const image =
    obj.primaryimageurl ||
    (Array.isArray(obj.images) && obj.images.length > 0
      ? obj.images[0].baseimageurl
      : "") ||
    "";

  const artist =
    Array.isArray(obj.people) && obj.people.length > 0 && obj.people[0].name
      ? obj.people[0].name
      : "Unknown Artist";

  return {
    source: "harvard",
    id: String(obj.id),
    title: obj.title || "Untitled",
    artist,
    date: obj.dated || obj.date || "",
    medium: obj.medium || "",
    dimensions: obj.dimensions || "",
    department: obj.department || "",
    image,
    imageLarge: image,
    objectURL: obj.url || "",
    museum: "Harvard Art Museums",
    museumLocation: museumLocation("harvard"),
  };
}

function itemHasImage(item) {
  return Boolean(
    item &&
      (
        (item.image && String(item.image).trim() !== "") ||
        (item.imageLarge && String(item.imageLarge).trim() !== "")
      )
  );
}

function makeCacheKey(query, hasImageFlag) {
  return `${String(query || "").trim().toLowerCase()}|${hasImageFlag ? "1" : "0"}`;
}

function getCached(map, key) {
  const entry = map.get(key);
  if (!entry) return null;

  if (Date.now() - entry.timestamp > SEARCH_CACHE_TTL_MS) {
    map.delete(key);
    return null;
  }

  return entry.results;
}

function setCached(map, key, results) {
  map.set(key, {
    timestamp: Date.now(),
    results,
  });
}

function dedupeResults(items) {
  const deduped = [];
  const seen = new Set();

  for (const item of items) {
    const key = `${item.source}:${item.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(item);
  }

  return deduped;
}

async function mapWithConcurrency(items, concurrency, iterator) {
  const results = new Array(items.length);
  let index = 0;

  async function worker() {
    while (index < items.length) {
      const currentIndex = index++;
      try {
        results[currentIndex] = await iterator(items[currentIndex], currentIndex);
      } catch {
        results[currentIndex] = null;
      }
    }
  }

  const workers = Array.from(
    { length: Math.min(concurrency, items.length) },
    () => worker()
  );

  await Promise.all(workers);
  return results;
}

async function fetchMetSearchIds(query, hasImageFlag) {
  const url = new URL(
    "https://collectionapi.metmuseum.org/public/collection/v1/search"
  );
  url.searchParams.set("q", query);

  // 這裡只影響 Met 官方搜尋 API 的第一層搜尋結果
  if (hasImageFlag) {
    url.searchParams.set("hasImages", "true");
  }

  const data = await fetchJsonSafe(url);
  return Array.isArray(data?.objectIDs) ? data.objectIDs : [];
}

async function fetchMetObjectById(id) {
  const data = await fetchJsonSafe(
    `https://collectionapi.metmuseum.org/public/collection/v1/objects/${id}`
  );
  return normalizeMetObject(data);
}

async function fetchAllMetSearchResults(query, hasImageFlag) {
  const cacheKey = makeCacheKey(query, hasImageFlag);
  const cached = getCached(metCache, cacheKey);
  if (cached) return cached;

  const ids = await fetchMetSearchIds(query, hasImageFlag);
  if (!ids.length) {
    setCached(metCache, cacheKey, []);
    return [];
  }

  const objects = await mapWithConcurrency(ids, MET_CONCURRENCY, async (id) => {
    const obj = await fetchMetObjectById(id);
    return obj || null;
  });

  const results = objects.filter(Boolean).filter((item) => {
    // 勾選 = 只顯示有 image
    // 不勾 = 只顯示沒有 image
    return hasImageFlag ? itemHasImage(item) : !itemHasImage(item);
  });

  const deduped = dedupeResults(results);
  setCached(metCache, cacheKey, deduped);
  return deduped;
}

async function fetchAllHarvardSearchResults(query, hasImageFlag) {
  if (!HARVARD_API_KEY) return [];

  const cacheKey = makeCacheKey(query, hasImageFlag);
  const cached = getCached(harvardCache, cacheKey);
  if (cached) return cached;

  const results = [];
  let page = 1;
  let totalRecords = Infinity;

  while ((page - 1) * HARVARD_PAGE_SIZE < totalRecords) {
    const url = new URL("https://api.harvardartmuseums.org/object");
    url.searchParams.set("apikey", HARVARD_API_KEY);
    url.searchParams.set("keyword", query);
    url.searchParams.set("page", String(page));
    url.searchParams.set("size", String(HARVARD_PAGE_SIZE));
    if (hasImageFlag) url.searchParams.set("hasimage", "1");

    const data = await fetchJsonSafe(url);
    const records = Array.isArray(data?.records) ? data.records : [];

    totalRecords = Number(data?.info?.totalrecords || 0);
    if (!records.length) break;

    const normalized = records
      .map(normalizeHarvardObject)
      .filter(Boolean)
      .filter((item) => {
        return hasImageFlag ? itemHasImage(item) : !itemHasImage(item);
      });

    results.push(...normalized);

    if (records.length < HARVARD_PAGE_SIZE) break;
    page += 1;
  }

  const deduped = dedupeResults(results);
  setCached(harvardCache, cacheKey, deduped);
  return deduped;
}

async function getAllSearchResults(query, source, hasImageFlag) {
  const normalizedSource = normalizeSource(source);
  const all = [];

  if (normalizedSource === "met" || normalizedSource === "both") {
    const metResults = await fetchAllMetSearchResults(query, hasImageFlag);
    all.push(...metResults);
  }

  if (normalizedSource === "harvard" || normalizedSource === "both") {
    const harvardResults = await fetchAllHarvardSearchResults(query, hasImageFlag);
    all.push(...harvardResults);
  }

  return dedupeResults(all);
}

app.get("/api/search", async (req, res) => {
  try {
    const q = String(req.query.q || "").trim();
    const page = Math.max(parseInt(req.query.page || "1", 10), 1);
    const source = normalizeSource(req.query.source);
    const hasImageFlag = String(req.query.hasImage || "false") === "true";

    if (!q) {
      return res.json({
        page: 1,
        total: 0,
        totalPages: 0,
        results: [],
      });
    }

    const allResults = await getAllSearchResults(q, source, hasImageFlag);

    const total = allResults.length;
    const totalPages = total > 0 ? Math.ceil(total / PAGE_SIZE) : 0;
    const safePage = totalPages > 0 ? Math.min(page, totalPages) : 1;

    const start = (safePage - 1) * PAGE_SIZE;
    const results = allResults.slice(start, start + PAGE_SIZE);

    res.json({
      page: safePage,
      total,
      totalPages,
      results,
    });
  } catch (error) {
    console.error("API /search error:", error);
    res.status(500).json({ error: error.message || "Search failed" });
  }
});

app.get("/api/artwork/:source/:id", async (req, res) => {
  try {
    const source = normalizeSource(req.params.source);
    const id = String(req.params.id || "").trim();

    if (!source || !id) {
      return res.status(400).json({ error: "Missing source or id" });
    }

    if (source === "met") {
      const data = await fetchJsonSafe(
        `https://collectionapi.metmuseum.org/public/collection/v1/objects/${encodeURIComponent(id)}`
      );
      const item = normalizeMetObject(data);
      if (!item) return res.status(404).json({ error: "Artwork not found" });
      return res.json(item);
    }

    if (source === "harvard") {
      if (!HARVARD_API_KEY) {
        return res.status(500).json({ error: "HARVARD_API_KEY is not set" });
      }

      const data = await fetchJsonSafe(
        `https://api.harvardartmuseums.org/object/${encodeURIComponent(
          id
        )}?apikey=${encodeURIComponent(HARVARD_API_KEY)}`
      );
      const item = normalizeHarvardObject(data);
      if (!item) return res.status(404).json({ error: "Artwork not found" });
      return res.json(item);
    }

    return res.status(400).json({ error: "Invalid source" });
  } catch (error) {
    console.error("API /artwork error:", error);
    res.status(500).json({ error: error.message || "Artwork fetch failed" });
  }
});

app.get("/api/artist/:name", async (req, res) => {
  try {
    const name = decodeURIComponent(req.params.name || "")
      .replace(/_/g, " ")
      .trim();

    if (!name) {
      return res.status(400).json({ error: "Missing artist name" });
    }

    const data = await fetchJsonSafe(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(
        name
      )}`
    );

    res.json({
      name: data?.title || name,
      extract: data?.extract || "",
      description: data?.description || "",
      wikipediaUrl: data?.content_urls?.desktop?.page || "",
      thumbnail: data?.thumbnail?.source || "",
    });
  } catch (error) {
    console.error("API /artist error:", error);
    res.status(500).json({
      error: error.message || "Biography fetch failed",
      name: decodeURIComponent(req.params.name || "").replace(/_/g, " "),
      extract: "",
      description: "",
      wikipediaUrl: "",
      thumbnail: "",
    });
  }
});

async function fetchMetArtistWorks(artistName) {
  const url = new URL(
    "https://collectionapi.metmuseum.org/public/collection/v1/search"
  );
  url.searchParams.set("q", artistName);
  url.searchParams.set("artistOrCulture", "true");

  const data = await fetchJsonSafe(url);
  const ids = Array.isArray(data?.objectIDs) ? data.objectIDs : [];

  const objects = await Promise.all(
    ids.slice(0, 12).map(async (id) => {
      const obj = await fetchMetObjectById(id);
      return obj || null;
    })
  );

  return objects.filter(Boolean);
}

async function fetchHarvardArtistWorks(artistName) {
  if (!HARVARD_API_KEY) return [];

  const url = new URL("https://api.harvardartmuseums.org/object");
  url.searchParams.set("apikey", HARVARD_API_KEY);
  url.searchParams.set("keyword", artistName);
  url.searchParams.set("page", "1");
  url.searchParams.set("size", "12");

  const data = await fetchJsonSafe(url);
  const records = Array.isArray(data?.records) ? data.records : [];

  return records.map(normalizeHarvardObject).filter(Boolean);
}

app.get("/api/artist/:name/works", async (req, res) => {
  try {
    const name = decodeURIComponent(req.params.name || "")
      .replace(/_/g, " ")
      .trim();

    if (!name) {
      return res.status(400).json({ error: "Missing artist name" });
    }

    const [metWorks, harvardWorks] = await Promise.all([
      fetchMetArtistWorks(name).catch(() => []),
      fetchHarvardArtistWorks(name).catch(() => []),
    ]);

    const merged = [...metWorks, ...harvardWorks];
    const deduped = dedupeResults(merged);

    res.json({
      artist: name,
      results: deduped.slice(0, 12),
    });
  } catch (error) {
    console.error("API /artist/works error:", error);
    res.status(500).json({
      error: error.message || "Related works fetch failed",
      artist: decodeURIComponent(req.params.name || "").replace(/_/g, " "),
      results: [],
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});