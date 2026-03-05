const statsGrid = document.getElementById("statsGrid");
const watchlistGrid = document.getElementById("watchlistGrid");
const watchedGrid = document.getElementById("watchedGrid");
const profilePhoto = document.getElementById("profilePhoto");
const profileName = document.getElementById("profileName");
const profileEmail = document.getElementById("profileEmail");
const profileMemberSince = document.getElementById("profileMemberSince");
const weeklyChart = document.getElementById("weeklyChart");
const recommendationsGrid = document.getElementById("recommendationsGrid");
const topGenresText = document.getElementById("topGenres");

let chartInstance;

function posterFallback(title) {
  const encoded = encodeURIComponent(title || "Movie");
  return `https://via.placeholder.com/300x450?text=${encoded}`;
}

function formatMemberSince(value) {
  if (!value) {
    return "Member since -";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Member since -";
  }

  return `Member since ${date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  })}`;
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
            `<a class="ott-logo-link" href="${provider.url || link}" target="_blank" rel="noopener noreferrer" title="${provider.name}" aria-label="Watch on ${provider.name}">${
              provider.logo
                ? `<img class="ott-logo" src="${provider.logo}" alt="${provider.name}" loading="lazy" />`
                : `<span class="ott-logo-fallback">${provider.name}</span>`
            }</a>`
        )
        .join("")}
    </div>
  `;
}

function card(movie, listType) {
  const year = movie.year || movie.releaseYear || "N/A";
  const genres = (movie.genres || []).slice(0, 2).join(", ") || "Genre N/A";
  return `
    <article class="movie-card">
      <img src="${movie.poster || posterFallback(movie.title)}" alt="${movie.title}" />
      <div class="movie-body">
        <h3>${movie.title}</h3>
        <p class="movie-meta">${year} • ★ ${movie.rating || "N/A"}</p>
        <p class="movie-meta">${genres}</p>
        <div class="ott-section">
          <p class="ott-title">Available On:</p>
          ${renderOttProviders(movie)}
        </div>
        ${
          listType
            ? `<div class="card-actions"><button type="button" class="remove-btn" data-status="${listType}" data-tmdb-id="${movie.tmdbId}">Remove</button></div>`
            : ""
        }
      </div>
    </article>
  `;
}

function renderRecommendations(data) {
  if (!recommendationsGrid || !topGenresText) {
    return;
  }

  const genres = data.topGenres || [];
  topGenresText.textContent = genres.length
    ? `Based on your watched genres: ${genres.join(", ")}`
    : "Watch more movies to unlock personalized recommendations.";

  recommendationsGrid.innerHTML =
    (data.movies || []).map((movie) => card(movie)).join("") || "<p>No recommendations yet.</p>";
}

function renderWeeklyChart(weeklyData) {
  if (!weeklyChart || typeof Chart === "undefined") {
    return;
  }

  if (chartInstance) {
    chartInstance.destroy();
  }

  chartInstance = new Chart(weeklyChart, {
    type: "line",
    data: {
      labels: weeklyData.map((day) => day.label),
      datasets: [
        {
          label: "Minutes",
          data: weeklyData.map((day) => day.minutes),
          borderColor: "#F5C518",
          backgroundColor: "rgba(245, 197, 24, 0.2)",
          fill: true,
          tension: 0.35,
          pointRadius: 3,
          pointBackgroundColor: "#F5C518",
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          labels: {
            color: "#e8e8e8",
          },
        },
      },
      scales: {
        x: {
          ticks: { color: "#b3b3b3" },
          grid: { color: "rgba(255,255,255,0.08)" },
        },
        y: {
          beginAtZero: true,
          ticks: { color: "#b3b3b3" },
          grid: { color: "rgba(255,255,255,0.08)" },
        },
      },
    },
  });
}

function renderTrackedMovies(tracked) {
  watchlistGrid.innerHTML =
    tracked.wishlist.map((movie) => card(movie, "wishlist")).join("") ||
    "<p>No wishlist movies yet.</p>";
  watchedGrid.innerHTML =
    tracked.watched.map((movie) => card(movie, "watched")).join("") ||
    "<p>No watched movies yet.</p>";
}

async function handleRemoveMovie(event) {
  const button = event.target.closest(".remove-btn");
  if (!button) {
    return;
  }

  const { tmdbId, status } = button.dataset;
  if (!tmdbId || !status) {
    return;
  }

  button.disabled = true;

  try {
    await window.MovieManiacAPI.apiRequest(`/movies/${tmdbId}?status=${status}`, {
      method: "DELETE",
    });
    await loadDashboard();
  } catch (error) {
    alert(error.message);
    button.disabled = false;
  }
}

async function loadDashboard() {
  try {
    const [me, stats, tracked] = await Promise.all([
      window.MovieManiacAPI.apiRequest("/auth/me"),
      window.MovieManiacAPI.apiRequest("/users/stats"),
      window.MovieManiacAPI.apiRequest("/movies/my-list"),
    ]);

    profileName.textContent = me.user.name;
    profileEmail.textContent = me.user.email;
    profilePhoto.src =
      me.user.profilePhoto ||
      "https://ui-avatars.com/api/?name=Movie+Maniac&background=1f1f1f&color=f5c518&size=256";
    profileMemberSince.textContent = formatMemberSince(me.user.createdAt);

    statsGrid.innerHTML = `
      <article class="stat"><span class="label">Total Movies Watched</span><span class="value">${stats.watchedCount}</span></article>
      <article class="stat"><span class="label">Total Hours Watched</span><span class="value">${stats.totalHoursWatched}</span></article>
      <article class="stat"><span class="label">Total Movies in Wishlist</span><span class="value">${stats.watchlistCount}</span></article>
    `;
    renderWeeklyChart(stats.weeklyWatchedMinutes || []);

    renderTrackedMovies(tracked);

    const recommendations = await window.MovieManiacAPI.apiRequest("/movies/recommendations");
    renderRecommendations(recommendations);
  } catch (error) {
    if (error.message.toLowerCase().includes("not authorized")) {
      window.MovieManiacAPI.clearToken();
      window.location.href = "./login.html";
      return;
    }

    statsGrid.innerHTML = `<p class="error">${error.message}</p>`;
  }
}

if (statsGrid) {
  watchlistGrid?.addEventListener("click", handleRemoveMovie);
  watchedGrid?.addEventListener("click", handleRemoveMovie);
  loadDashboard();
}