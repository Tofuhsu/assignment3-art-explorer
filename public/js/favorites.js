const FAVORITES_STORAGE_KEY = "art-explorer-favorites";

function readFavorites() {
  try {
    const raw = localStorage.getItem(FAVORITES_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeFavorites(favorites) {
  localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favorites));
  updateFavoritesBadge();
}

function favoriteKey(item) {
  return `${item.source}:${item.id}`;
}

function sanitizeFavorite(item) {
  return {
    source: item.source,
    id: item.id,
    title: item.title || "Untitled",
    artist: item.artist || "Unknown Artist",
    date: item.date || "",
    image: item.image || "",
    imageLarge: item.imageLarge || item.image || "",
    objectURL: item.objectURL || "",
    museum: item.museum || "",
    museumLocation: item.museumLocation || null
  };
}

function isFavorite(item) {
  const key = favoriteKey(item);
  return readFavorites().some((fav) => favoriteKey(fav) === key);
}

function addFavorite(item) {
  const favorites = readFavorites();
  const key = favoriteKey(item);

  if (!favorites.some((fav) => favoriteKey(fav) === key)) {
    favorites.unshift(sanitizeFavorite(item));
    writeFavorites(favorites);
  }
}

function removeFavorite(source, id) {
  const key = `${source}:${id}`;
  const favorites = readFavorites().filter((fav) => favoriteKey(fav) !== key);
  writeFavorites(favorites);
}

function toggleFavorite(item) {
  if (isFavorite(item)) {
    removeFavorite(item.source, item.id);
    return false;
  }

  addFavorite(item);
  return true;
}

function updateFavoritesBadge() {
  const badge = document.getElementById("favoritesBadge");
  if (!badge) return;

  const count = readFavorites().length;
  badge.textContent = String(count);

  if (count > 0) {
    badge.classList.remove("d-none");
  } else {
    badge.classList.add("d-none");
  }
}

function renderFavoritesView() {
  const grid = document.getElementById("favoritesGrid");
  const empty = document.getElementById("favoritesEmpty");
  if (!grid || !empty) return;

  const favorites = readFavorites();
  updateFavoritesBadge();

  if (!favorites.length) {
    grid.innerHTML = "";
    empty.classList.remove("d-none");
    return;
  }

  empty.classList.add("d-none");

  grid.innerHTML = favorites
    .map((item, index) => {
      const img = item.image
        ? `<img src="${item.image}" class="card-img-top art-thumb" alt="${item.title}">`
        : `<div class="art-thumb d-flex align-items-center justify-content-center text-muted">No Image Available</div>`;

      return `
        <div class="col-12 col-sm-6 col-lg-3">
          <div class="card card-art h-100 position-relative" data-favorite-index="${index}">
            <button
              type="button"
              class="btn btn-sm btn-danger position-absolute top-0 end-0 m-2"
              data-favorite-remove="true"
              aria-label="Remove from favorites"
            >
              ×
            </button>
            ${img}
            <div class="card-body">
              <span class="badge ${item.source === "met" ? "bg-danger" : "bg-success"} mb-2">
                ${item.source === "met" ? "Met" : "Harvard"}
              </span>
              <h6 class="card-title mb-1">${item.title}</h6>
              <div class="text-muted small">${item.artist}</div>
              <div class="text-muted small">${item.date || ""}</div>
            </div>
          </div>
        </div>
      `;
    })
    .join("");

  const cards = grid.querySelectorAll("[data-favorite-index]");
  cards.forEach((card) => {
    const index = Number(card.getAttribute("data-favorite-index"));
    const item = favorites[index];

    card.addEventListener("click", () => {
      if (typeof window.openDetail === "function") {
        window.openDetail(item, "favorites");
      }
    });

    const removeBtn = card.querySelector("[data-favorite-remove]");
    if (removeBtn) {
      removeBtn.addEventListener("click", (event) => {
        event.stopPropagation();
        removeFavorite(item.source, item.id);
        renderFavoritesView();
      });
    }
  });
}

window.ArtFavorites = {
  readFavorites,
  writeFavorites,
  isFavorite,
  addFavorite,
  removeFavorite,
  toggleFavorite,
  updateFavoritesBadge,
  renderFavoritesView
};

document.addEventListener("DOMContentLoaded", updateFavoritesBadge);