const popularGrid = document.getElementById("popularGrid");
const upcomingGrid = document.getElementById("upcomingGrid");
const detailsModal = document.getElementById("detailsModal");
const detailsContent = document.getElementById("detailsContent");
const closeModalBtn = document.getElementById("closeModalBtn");
const featuredBanner = document.getElementById("featuredBanner");
const featuredTitle = document.getElementById("featuredTitle");
const featuredMeta = document.getElementById("featuredMeta");
const featuredOverview = document.getElementById("featuredOverview");
const featuredWatchedBtn = document.getElementById("featuredWatchedBtn");
const featuredWishlistBtn = document.getElementById("featuredWishlistBtn");
const authLink = document.getElementById("authLink");

function escapeHtml(text) {
  return String(text || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function renderOttProviders(movie) {
  const providers = movie.ottProviders || [];
  if (!providers.length) {
    return `<p class="ott-empty">Streaming information not available</p>`;
  }

  const link = movie.ottLink || "#";

  return `
    <div class="ott-providers ott-platforms">
      ${providers
        .map(
          (provider) =>
            `<a class="ott-logo-link" href="${provider.url || link}" target="_blank" rel="noopener noreferrer" title="${escapeHtml(provider.name)}" aria-label="Watch on ${escapeHtml(provider.name)}">${
              provider.logo
                ? `<img class="ott-logo" src="${provider.logo}" alt="${escapeHtml(provider.name)}" loading="lazy" />`
                : `<span class="ott-logo-fallback">${escapeHtml(provider.name)}</span>`
            }</a>`
        )
        .join("")}
    </div>
  `;
}

function renderMovieCard(movie) {
  const genreText = movie.genres?.length ? movie.genres.join(", ") : "N/A";
  const ratingText = movie.rating ?? "N/A";
  const runtimeText = movie.runtime ? `${movie.runtime} min` : "N/A";
  return `
    <article class="movie-card" data-id="${movie.tmdbId}">
      <img src="${movie.poster || "https://via.placeholder.com/300x450?text=No+Image"}" alt="${escapeHtml(movie.title)}" />
      <div class="movie-body">
        <h3>${escapeHtml(movie.title)}</h3>
        <p class="movie-meta">${movie.releaseYear || "N/A"} | ⭐ ${ratingText}</p>
        <p class="movie-meta">Genre: ${escapeHtml(genreText)}</p>
        <p class="movie-meta">Runtime: ${runtimeText}</p>
        <div class="ott-section">
          <p class="ott-title">Available On:</p>
          ${renderOttProviders(movie)}
        </div>
        <div class="card-actions">
          <button data-action="wishlist" data-id="${movie.tmdbId}">Wishlist</button>
          <button data-action="watched" data-id="${movie.tmdbId}">Watched</button>
        </div>
      </div>
    </article>
  `;
}

function renderInGrid(grid, movies) {
  grid.innerHTML = movies.map(renderMovieCard).join("");
}

async function loadMovieSection(endpoint, grid) {
  try {
    const { movies } = await window.MovieManiacAPI.apiRequest(endpoint);
    renderInGrid(grid, movies);
    return movies;
  } catch (error) {
    grid.innerHTML = `<p class="error">${error.message}</p>`;
    return [];
  }
}

function setFeaturedMovie(movie) {
  if (!movie || !featuredBanner || !featuredTitle || !featuredMeta || !featuredOverview || !featuredWatchedBtn || !featuredWishlistBtn) {
    return;
  }

  const year = movie.releaseYear || "N/A";
  const rating = movie.rating ?? "N/A";
  const genres = movie.genres?.length ? movie.genres.join(" • ") : "N/A";

  if (movie.backdrop) {
    featuredBanner.style.backgroundImage = `url(${movie.backdrop})`;
  }

  featuredTitle.textContent = movie.title;
  featuredMeta.textContent = `${year} • ⭐ ${rating} • ${genres}`;
  featuredOverview.textContent = movie.overview || "Explore this movie on Movie Maniac.";

  featuredWatchedBtn.dataset.id = movie.tmdbId;
  featuredWishlistBtn.dataset.id = movie.tmdbId;
}

function setupAuthLink() {
  if (!authLink) {
    return;
  }

  if (window.MovieManiacAPI.getToken()) {
    authLink.textContent = "Logout";
    authLink.href = "#";
    authLink.addEventListener("click", (event) => {
      event.preventDefault();
      window.MovieManiacAPI.clearToken();
      window.location.reload();
    });
    return;
  }

  authLink.textContent = "Login";
  authLink.href = "./login.html";
}

async function updateMovieStatus(tmdbId, listType) {
  const token = window.MovieManiacAPI.getToken();
  if (!token) {
    alert("Please login first to track movies.");
    window.location.href = "./login.html";
    return;
  }

  try {
    await window.MovieManiacAPI.apiRequest(`/movies/${listType}`, {
      method: "POST",
      body: JSON.stringify({ tmdbId }),
    });
    alert(`Movie added to ${listType}.`);
  } catch (error) {
    alert(error.message);
  }
}

async function showMovieDetails(tmdbId) {
  try {
    const { movie } = await window.MovieManiacAPI.apiRequest(`/movies/details/${tmdbId}`);
    const genres = movie.genres?.length ? movie.genres.join(", ") : "N/A";
    const runtime = movie.runtime ? `${movie.runtime} min` : "N/A";
    const rating = movie.rating ?? "N/A";

    detailsContent.innerHTML = `
      <h2>${escapeHtml(movie.title)}</h2>
      <p class="movie-meta">${movie.releaseYear} | ⭐ ${rating} | ${runtime}</p>
      <p class="movie-meta">Genres: ${escapeHtml(genres)}</p>
      <div class="ott-section">
        <p class="ott-title">Available On:</p>
        ${renderOttProviders(movie)}
      </div>
      <p>${escapeHtml(movie.overview || "No overview available.")}</p>
    `;

    detailsModal.classList.remove("hidden");
  } catch (error) {
    alert(error.message);
  }
}

function bindMovieActions(grid) {
  grid.addEventListener("click", (event) => {
    const actionTarget = event.target.closest("[data-action]");
    const cardTarget = event.target.closest(".movie-card");
    const action = actionTarget?.getAttribute("data-action");
    const tmdbId = actionTarget?.getAttribute("data-id") || cardTarget?.getAttribute("data-id");

    if (!action || !tmdbId) {
      if (cardTarget) {
        showMovieDetails(cardTarget.getAttribute("data-id"));
      }
      return;
    }

    if (action === "wishlist" || action === "watched") {
      updateMovieStatus(tmdbId, action);
    }
  });
}

function bindFeaturedActions() {
  if (!featuredBanner) {
    return;
  }

  featuredBanner.addEventListener("click", (event) => {
    const actionTarget = event.target.closest("[data-action]");
    if (!actionTarget) {
      return;
    }

    const action = actionTarget.getAttribute("data-action");
    const tmdbId = actionTarget.getAttribute("data-id");
    if (!action || !tmdbId) {
      return;
    }

    updateMovieStatus(tmdbId, action);
  });
}

if (popularGrid && upcomingGrid) {
  setupAuthLink();
  bindFeaturedActions();

  loadMovieSection("/movies/popular", popularGrid).then((movies) => {
    if (movies.length) {
      setFeaturedMovie(movies[0]);
    }
  });

  loadMovieSection("/movies/upcoming", upcomingGrid);
  bindMovieActions(popularGrid);
  bindMovieActions(upcomingGrid);

  closeModalBtn.addEventListener("click", () => {
    detailsModal.classList.add("hidden");
  });

  detailsModal.addEventListener("click", (event) => {
    if (event.target === detailsModal) {
      detailsModal.classList.add("hidden");
    }
  });
}