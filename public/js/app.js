const state = {
  query: "",
  page: 1,
  source: "both",
  hasImage: false,
  results: [],
  total: 0,
  totalPages: 0,
  currentView: "search",
  currentItem: null,
  returnView: "search",
  debounceTimer: null,
};

const searchView = document.getElementById("searchView");
const favoritesView = document.getElementById("favoritesView");
const detailView = document.getElementById("detailView");

const navSearch = document.getElementById("navSearch");
const navFavorites = document.getElementById("navFavorites");

const searchForm = document.getElementById("searchForm");
const searchInput = document.getElementById("searchInput");
const sourceFilter = document.getElementById("sourceFilter");
const hasImage = document.getElementById("hasImage");

const messageArea = document.getElementById("messageArea");
const totalCountArea = document.getElementById("totalCountArea");
const loadingArea = document.getElementById("loadingArea");
const resultsArea = document.getElementById("resultsArea");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");
const pageIndicator = document.getElementById("pageIndicator");

const backBtn = document.getElementById("backBtn");
const overviewTab = document.getElementById("overviewTab");
const bioTab = document.getElementById("bioTab");
const relatedTab = document.getElementById("relatedTab");
const mapTabButton = document.getElementById("mapTabButton");

function normalizeSourceValue(value) {
  const s = String(value || "both").trim().toLowerCase();

  if (s === "met" || s.startsWith("met")) return "met";
  if (s === "harvard" || s.startsWith("harv")) return "harvard";
  return "both";
}

function showMessage(type, text) {
  if (!text) {
    messageArea.innerHTML = "";
    return;
  }

  messageArea.innerHTML = `
    <div class="alert alert-${type} mb-0">${text}</div>
  `;
}

function updateTotalCount(total) {
  if (!totalCountArea) return;

  if (!searchInput.value.trim()) {
    totalCountArea.textContent = "";
    return;
  }

  totalCountArea.textContent = `${Number(total || 0).toLocaleString()} works found`;
}

function showView(view) {
  state.currentView = view;
  searchView.classList.toggle("d-none", view !== "search");
  favoritesView.classList.toggle("d-none", view !== "favorites");
  detailView.classList.toggle("d-none", view !== "detail");

  if (view === "favorites" && window.ArtFavorites) {
    window.ArtFavorites.renderFavoritesView();
  }
}

function getSourceBadge(source) {
  return source === "met"
    ? `<span class="badge bg-danger">Met</span>`
    : `<span class="badge bg-success">Harvard</span>`;
}

function renderSkeletons() {
  loadingArea.classList.remove("d-none");
  loadingArea.innerHTML = Array.from({ length: 8 })
    .map(
      () => `
        <div class="col-12 col-sm-6 col-lg-3">
          <div class="card skeleton h-100">
            <div class="skeleton-box skeleton-img"></div>
            <div class="card-body">
              <div class="skeleton-box skeleton-line w-75"></div>
              <div class="skeleton-box skeleton-line w-50"></div>
              <div class="skeleton-box skeleton-line w-25"></div>
            </div>
          </div>
        </div>
      `
    )
    .join("");
}

function hideSkeletons() {
  loadingArea.classList.add("d-none");
  loadingArea.innerHTML = "";
}

function buildArtworkCard(item) {
  const image = item.image
    ? `<img src="${item.image}" class="card-img-top art-thumb" alt="${item.title}">`
    : `<div class="art-thumb d-flex align-items-center justify-content-center text-muted">No Image Available</div>`;

  return `
    <div class="col-12 col-sm-6 col-lg-3">
      <div class="card card-art h-100 position-relative">
        <div class="position-absolute top-0 start-0 m-2">
          ${getSourceBadge(item.source)}
        </div>
        ${image}
        <div class="card-body">
          <h6 class="card-title mb-1">${item.title}</h6>
          <div class="text-muted small">${item.artist || ""}</div>
          <div class="text-muted small">${item.date || ""}</div>
        </div>
      </div>
    </div>
  `;
}

function renderResults(items) {
  if (!items.length) {
    resultsArea.innerHTML = `
      <div class="col-12">
        <div class="alert alert-secondary mb-0">No results</div>
      </div>
    `;
    return;
  }

  resultsArea.innerHTML = items.map((item) => buildArtworkCard(item)).join("");

  const cards = resultsArea.querySelectorAll(".card-art");
  cards.forEach((card, index) => {
    card.addEventListener("click", () => {
      openDetail(items[index], "search");
    });
  });
}

function updatePagination(page, totalPages, items) {
  if (!items.length) {
    pageIndicator.textContent = "No results";
    prevBtn.disabled = true;
    nextBtn.disabled = true;
    return;
  }

  pageIndicator.textContent = `Page ${page} of ${totalPages}`;
  prevBtn.disabled = page <= 1;
  nextBtn.disabled = page >= totalPages;
}

async function performSearch(page = 1) {
  const query = searchInput.value.trim();

  if (!query) {
    showMessage("danger", "Please enter a keyword.");
    resultsArea.innerHTML = "";
    updateTotalCount(0);
    updatePagination(0, 0, []);
    return;
  }

  state.query = query;
  state.page = page;
  state.source = normalizeSourceValue(sourceFilter.value);
  state.hasImage = hasImage.checked;

  renderSkeletons();

  try {
    const data = await apiGet(
      `/api/search?q=${encodeURIComponent(state.query)}&page=${state.page}&source=${state.source}&hasImage=${state.hasImage}`
    );

    state.results = Array.isArray(data.results) ? data.results : [];
    state.total = Number(data.total || 0);
    state.totalPages = Number(data.totalPages || 0);

    hideSkeletons();
    showMessage("", "");
    updateTotalCount(state.total);
    renderResults(state.results);
    updatePagination(state.page, state.totalPages, state.results);
  } catch (error) {
    hideSkeletons();
    resultsArea.innerHTML = "";
    showMessage("danger", error.message || "Search failed.");
    updateTotalCount(0);
    updatePagination(0, 0, []);
  }
}

function debounceSearch() {
  clearTimeout(state.debounceTimer);
  state.debounceTimer = setTimeout(() => {
    if (searchInput.value.trim()) {
      performSearch(1);
    }
  }, 300);
}

function setFavoriteButtonState(item) {
  const btn = document.getElementById("favoriteToggleBtn");
  if (!btn || !window.ArtFavorites) return;

  const favorite = window.ArtFavorites.isFavorite(item);
  btn.textContent = favorite ? "Remove from Favorites" : "Add to Favorites";
  btn.classList.toggle("btn-outline-danger", !favorite);
  btn.classList.toggle("btn-danger", favorite);
}

function renderOverview(item) {
  const image = item.imageLarge || item.image || "";
  const museumLink = item.objectURL
    ? `<a href="${item.objectURL}" target="_blank" rel="noopener noreferrer" class="btn btn-outline-primary">View on Museum Website</a>`
    : "";

  overviewTab.innerHTML = `
    <div class="row g-4">
      <div class="col-12 col-lg-6">
        ${
          image
            ? `<img src="${image}" class="img-fluid rounded shadow-sm w-100" alt="${item.title}">`
            : `<div class="art-thumb d-flex align-items-center justify-content-center text-muted rounded">No Image Available</div>`
        }
      </div>
      <div class="col-12 col-lg-6">
        <h3 class="h4 mb-3">${item.title}</h3>
        <p class="mb-1"><strong>Artist:</strong> ${item.artist || ""}</p>
        <p class="mb-1"><strong>Date:</strong> ${item.date || ""}</p>
        <p class="mb-1"><strong>Medium:</strong> ${item.medium || ""}</p>
        <p class="mb-1"><strong>Dimensions:</strong> ${item.dimensions || ""}</p>
        <p class="mb-1"><strong>Department:</strong> ${item.department || ""}</p>
        <p class="mb-1"><strong>Museum:</strong> ${item.museum || ""}</p>
        <div class="mt-3 d-flex gap-2 flex-wrap">
          <button id="favoriteToggleBtn" class="btn btn-outline-danger" type="button">Add to Favorites</button>
          ${museumLink}
        </div>
      </div>
    </div>
  `;

  const favoriteToggleBtn = document.getElementById("favoriteToggleBtn");
  favoriteToggleBtn.addEventListener("click", () => {
    if (!window.ArtFavorites) return;

    window.ArtFavorites.toggleFavorite(item);
    window.ArtFavorites.updateFavoritesBadge();
    setFavoriteButtonState(item);

    if (state.currentView === "favorites") {
      window.ArtFavorites.renderFavoritesView();
    }
  });

  setFavoriteButtonState(item);
}

async function renderBiography(item) {
  bioTab.innerHTML = `<div class="text-muted">Loading biography...</div>`;

  try {
    const bio = await apiGet(`/api/artist/${encodeURIComponent(item.artist)}`);
    bioTab.innerHTML = `
      <div class="row g-3">
        <div class="col-12 col-md-3">
          ${
            bio.thumbnail
              ? `<img src="${bio.thumbnail}" class="img-fluid rounded shadow-sm" alt="${bio.name}">`
              : `<div class="art-thumb d-flex align-items-center justify-content-center text-muted rounded">No Image</div>`
          }
        </div>
        <div class="col-12 col-md-9">
          <h4 class="h5 mb-2">${bio.name}</h4>
          <p class="mb-2 text-muted">${bio.description || ""}</p>
          <p>${bio.extract || "No biography available."}</p>
          ${
            bio.wikipediaUrl
              ? `<a href="${bio.wikipediaUrl}" target="_blank" rel="noopener noreferrer">Read on Wikipedia</a>`
              : ""
          }
        </div>
      </div>
    `;
  } catch {
    bioTab.innerHTML = `<div class="alert alert-secondary mb-0">No biography found.</div>`;
  }
}

function showOverviewTab() {
  const overviewBtn = document.querySelector(
    '#detailTabs button[data-bs-target="#overviewTab"]'
  );

  if (overviewBtn && window.bootstrap) {
    bootstrap.Tab.getOrCreateInstance(overviewBtn).show();
  }
}

async function renderRelatedWorks(item) {
  relatedTab.innerHTML = `<div class="text-muted">Loading related works...</div>`;

  try {
    const related = await apiGet(
      `/api/artist/${encodeURIComponent(item.artist)}/works`
    );

    const results = Array.isArray(related.results) ? related.results : [];

    if (!results.length) {
      relatedTab.innerHTML = `<div class="alert alert-secondary mb-0">No related works found.</div>`;
      return;
    }

    relatedTab.innerHTML = `
      <div class="row g-3">
        ${results
          .map((work, index) => {
            const image = work.image
              ? `<img src="${work.image}" class="card-img-top art-thumb" alt="${work.title}">`
              : `<div class="art-thumb d-flex align-items-center justify-content-center text-muted">No Image Available</div>`;

            return `
              <div class="col-12 col-sm-6 col-lg-3">
                <div class="card card-art h-100" data-related-index="${index}">
                  ${image}
                  <div class="card-body">
                    <span class="badge ${work.source === "met" ? "bg-danger" : "bg-success"} mb-2">
                      ${work.source === "met" ? "Met" : "Harvard"}
                    </span>
                    <h6 class="card-title mb-1">${work.title}</h6>
                    <div class="text-muted small">${work.artist || ""}</div>
                    <div class="text-muted small">${work.date || ""}</div>
                  </div>
                </div>
              </div>
            `;
          })
          .join("")}
      </div>
    `;

    const cards = relatedTab.querySelectorAll("[data-related-index]");
    cards.forEach((card) => {
      const index = Number(card.getAttribute("data-related-index"));
      const relatedItem = results[index];

      card.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        openDetail(relatedItem, state.returnView);
      });
    });
  } catch {
    relatedTab.innerHTML = `<div class="alert alert-secondary mb-0">No related works found.</div>`;
  }
}

function renderMuseumLocation(item) {
  const museum =
    item.museumLocation ||
    (item.source === "met"
      ? {
          museum: "The Metropolitan Museum of Art",
          latitude: 40.7794,
          longitude: -73.9632,
          address: "1000 5th Ave, New York, NY 10028",
        }
      : {
          museum: "Harvard Art Museums",
          latitude: 42.3744,
          longitude: -71.1143,
          address: "32 Quincy St, Cambridge, MA 02138",
        });

  setTimeout(() => {
    renderMap(
      museum.latitude,
      museum.longitude,
      museum.museum,
      museum.address
    );
  }, 100);
}

function openDetail(item, returnView = "search") {
  state.currentItem = item;
  state.returnView = returnView;

  showView("detail");
  renderOverview(item);
  renderBiography(item);
  renderRelatedWorks(item);

  requestAnimationFrame(() => {
    showOverviewTab();
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  if (mapTabButton) {
    mapTabButton.addEventListener(
      "shown.bs.tab",
      () => renderMuseumLocation(item),
      { once: true }
    );
  }
}

window.openDetail = openDetail;

backBtn.addEventListener("click", () => {
  if (state.returnView === "favorites") {
    showView("favorites");
    if (window.ArtFavorites) {
      window.ArtFavorites.renderFavoritesView();
    }
  } else {
    showView("search");
  }
});

navSearch.addEventListener("click", () => {
  showView("search");
});

navFavorites.addEventListener("click", () => {
  showView("favorites");
  if (window.ArtFavorites) {
    window.ArtFavorites.renderFavoritesView();
  }
});

searchForm.addEventListener("submit", (event) => {
  event.preventDefault();
  performSearch(1);
});

searchInput.addEventListener("input", debounceSearch);

sourceFilter.addEventListener("change", () => {
  if (searchInput.value.trim()) {
    performSearch(1);
  }
});

hasImage.addEventListener("change", () => {
  if (searchInput.value.trim()) {
    performSearch(1);
  }
});

prevBtn.addEventListener("click", () => {
  if (state.page > 1) {
    performSearch(state.page - 1);
  }
});

nextBtn.addEventListener("click", () => {
  if (!nextBtn.disabled) {
    performSearch(state.page + 1);
  }
});

showView("search");
showMessage("info", "Enter a keyword to search artworks.");
updateTotalCount(0);
if (window.ArtFavorites) {
  window.ArtFavorites.updateFavoritesBadge();
}