const axios = require("axios");
const Movie = require("../models/Movie");
const User = require("../models/User");

const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/w500";
const TMDB_LOGO_BASE = "https://image.tmdb.org/t/p/w92";
const FALLBACK_WATCH_LINK = (tmdbId) =>
  `https://www.themoviedb.org/movie/${tmdbId}/watch?locale=IN`;

async function tmdbRequest(endpoint, params = {}) {
  const response = await axios.get(`${process.env.TMDB_BASE_URL}${endpoint}`, {
    params,
    headers: { Authorization: `Bearer ${process.env.TMDB_API_KEY}` },
  });

  return response.data;
}

function posterUrl(path) {
  return path ? `${TMDB_IMAGE_BASE}${path}` : "";
}

function buildOttInfo(tmdbId, watchProviders) {
  const region = watchProviders?.results?.IN;
  const streamingProviders = [
    ...(region?.flatrate || []),
    ...(region?.free || []),
    ...(region?.ads || []),
  ];
  const watchLink = region?.link || FALLBACK_WATCH_LINK(tmdbId);

  const providers = Array.from(
    new Map(
      streamingProviders.map((provider) => [
        provider.provider_id,
        {
          name: provider.provider_name,
          logo: provider.logo_path ? `${TMDB_LOGO_BASE}${provider.logo_path}` : "",
          url: watchLink,
        },
      ])
    ).values()
  );

  if (!providers.length) {
    return {
      providers: [],
      provider: "Streaming information not available",
      url: watchLink,
    };
  }

  return {
    providers,
    provider: providers.map((item) => item.name).join(", "),
    url: watchLink,
  };
}

function transformMovieDetails(movie, watchProviders) {
  const ott = buildOttInfo(movie.id, watchProviders);

  return {
    id: movie.id,
    tmdbId: String(movie.id),
    title: movie.title,
    poster: posterUrl(movie.poster_path),
    backdrop: posterUrl(movie.backdrop_path),
    year: movie.release_date ? movie.release_date.slice(0, 4) : "N/A",
    releaseYear: movie.release_date ? movie.release_date.slice(0, 4) : "N/A",
    genres: movie.genres?.map((genre) => genre.name) || [],
    runtime: movie.runtime || null,
    rating: movie.vote_average ? Number(movie.vote_average.toFixed(1)) : null,
    overview: movie.overview || "",
    ottProviders: ott.providers,
    ottPlatform: ott.provider,
    ottLink: ott.url,
  };
}

async function fetchDetailedMovie(tmdbId) {
  const movie = await tmdbRequest(`/movie/${tmdbId}`, {
    append_to_response: "watch/providers",
  });
  return transformMovieDetails(movie, movie["watch/providers"]);
}

async function fetchDetailedList(endpoint) {
  const list = await tmdbRequest(endpoint);
  const topResults = list.results.slice(0, 12);

  const movies = await Promise.all(
    topResults.map(async (item) => {
      try {
        return await fetchDetailedMovie(item.id);
      } catch (_error) {
        return {
          id: item.id,
          tmdbId: String(item.id),
          title: item.title,
          poster: posterUrl(item.poster_path),
          backdrop: posterUrl(item.backdrop_path),
          year: item.release_date ? item.release_date.slice(0, 4) : "N/A",
          releaseYear: item.release_date ? item.release_date.slice(0, 4) : "N/A",
          genres: [],
          runtime: null,
          rating: item.vote_average ? Number(item.vote_average.toFixed(1)) : null,
          overview: item.overview || "",
          ottProviders: [],
          ottPlatform: "Streaming information not available",
          ottLink: FALLBACK_WATCH_LINK(item.id),
        };
      }
    })
  );

  return movies;
}

async function persistMovieForUser(userId, tmdbId, status) {
  const movieData = await fetchDetailedMovie(tmdbId);

  const payload = {
    user: userId,
    tmdbId: movieData.tmdbId,
    title: movieData.title,
    poster: movieData.poster,
    year: movieData.releaseYear,
    rating: movieData.rating ? String(movieData.rating) : "",
    runtime: movieData.runtime || 0,
    genres: movieData.genres,
    ottProviders: movieData.ottProviders || [],
    ottLink: movieData.ottLink || "",
    status,
    watchedAt: status === "watched" ? new Date() : null,
  };

  const trackedMovie = await Movie.findOneAndUpdate(
    { user: userId, tmdbId: movieData.tmdbId },
    payload,
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  if (status === "watched") {
    await User.findByIdAndUpdate(userId, {
      $addToSet: { watchedMovies: trackedMovie._id },
      $pull: { wishlistMovies: trackedMovie._id },
    });
  } else {
    await User.findByIdAndUpdate(userId, {
      $addToSet: { wishlistMovies: trackedMovie._id },
      $pull: { watchedMovies: trackedMovie._id },
    });
  }

  return trackedMovie;
}

async function generatePersonalizedRecommendations(userId) {
  const watched = await Movie.find({ user: userId, status: "watched" }).select("tmdbId genres");
  if (!watched.length) {
    return { movies: [], topGenres: [] };
  }

  const genreFrequency = watched
    .flatMap((movie) => movie.genres || [])
    .reduce((acc, genre) => {
      acc[genre] = (acc[genre] || 0) + 1;
      return acc;
    }, {});

  const topGenres = Object.entries(genreFrequency)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([name]) => name);

  if (!topGenres.length) {
    return { movies: [], topGenres: [] };
  }

  const genreResponse = await tmdbRequest("/genre/movie/list");
  const genreIdByName = new Map(
    genreResponse.genres.map((genre) => [genre.name.toLowerCase(), genre.id])
  );

  const topGenreIds = topGenres
    .map((name) => genreIdByName.get(name.toLowerCase()))
    .filter(Boolean);

  if (!topGenreIds.length) {
    return { movies: [], topGenres };
  }

  const watchedIds = new Set(watched.map((movie) => String(movie.tmdbId)));

  const recommendationPages = await Promise.all(
    topGenreIds.map((genreId) =>
      tmdbRequest("/discover/movie", {
        with_genres: genreId,
        sort_by: "popularity.desc",
        include_adult: false,
        page: 1,
      })
    )
  );

  const movieScoreMap = new Map();
  const genreWeight = Object.fromEntries(Object.entries(genreFrequency));

  recommendationPages.forEach((page) => {
    page.results.forEach((movie) => {
      const tmdbId = String(movie.id);
      if (watchedIds.has(tmdbId)) {
        return;
      }

      const existing = movieScoreMap.get(tmdbId) || { movie, score: 0 };
      const genreScore = (movie.genre_ids || []).reduce((sum, genreId) => {
        const genreName = genreResponse.genres.find((genre) => genre.id === genreId)?.name;
        if (!genreName) {
          return sum;
        }

        return sum + (genreWeight[genreName] || 0);
      }, 0);

      existing.score += genreScore + (movie.vote_average || 0) * 0.2;
      movieScoreMap.set(tmdbId, existing);
    });
  });

  const baseRecommendations = Array.from(movieScoreMap.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, 12)
    .map(({ movie }) => ({
      tmdbId: String(movie.id),
      id: movie.id,
      title: movie.title,
      poster: posterUrl(movie.poster_path),
      year: movie.release_date ? movie.release_date.slice(0, 4) : "N/A",
      rating: movie.vote_average ? Number(movie.vote_average.toFixed(1)) : null,
      genres: (movie.genre_ids || [])
        .map((genreId) => genreResponse.genres.find((genre) => genre.id === genreId)?.name)
        .filter(Boolean),
    }));

  const movies = await Promise.all(
    baseRecommendations.map(async (movie) => {
      try {
        const detailed = await fetchDetailedMovie(movie.tmdbId);
        return {
          ...movie,
          runtime: detailed.runtime,
          ottProviders: detailed.ottProviders,
          ottLink: detailed.ottLink,
        };
      } catch (_error) {
        return {
          ...movie,
          ottProviders: [],
          ottLink: FALLBACK_WATCH_LINK(movie.tmdbId),
        };
      }
    })
  );

  return { movies, topGenres };
}

exports.getPopularMovies = async (_req, res) => {
  try {
    const movies = await fetchDetailedList("/movie/popular");
    res.json({ movies });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch popular movies", error: error.message });
  }
};

exports.getUpcomingMovies = async (_req, res) => {
  try {
    const movies = await fetchDetailedList("/movie/upcoming");
    res.json({ movies });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch upcoming movies", error: error.message });
  }
};

exports.getMovieDetails = async (req, res) => {
  try {
    const movie = await fetchDetailedMovie(req.params.id);
    res.json({ movie });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch movie details", error: error.message });
  }
};

exports.addWatchedMovie = async (req, res) => {
  try {
    const { tmdbId } = req.body;
    if (!tmdbId) {
      return res.status(400).json({ message: "tmdbId is required" });
    }

    await persistMovieForUser(req.userId, tmdbId, "watched");
    res.status(201).json({ message: "Movie added to watched list" });
  } catch (error) {
    res.status(500).json({ message: "Failed to add watched movie", error: error.message });
  }
};

exports.addWishlistMovie = async (req, res) => {
  try {
    const { tmdbId } = req.body;
    if (!tmdbId) {
      return res.status(400).json({ message: "tmdbId is required" });
    }

    await persistMovieForUser(req.userId, tmdbId, "wishlist");
    res.status(201).json({ message: "Movie added to wishlist" });
  } catch (error) {
    res.status(500).json({ message: "Failed to add wishlist movie", error: error.message });
  }
};

exports.discoverMovies = async (req, res) => {
  try {
    const query = req.query.q || "popular";
    const endpoint = query === "popular" ? "/movie/popular" : "/search/movie";
    const params = query === "popular" ? {} : { query };

    const response = await tmdbRequest(endpoint, params);

    const movies = response.results.map((movie) => ({
      tmdbId: String(movie.id),
      title: movie.title,
      poster: posterUrl(movie.poster_path),
      year: movie.release_date ? movie.release_date.slice(0, 4) : "N/A",
      rating: movie.vote_average ? Number(movie.vote_average.toFixed(1)) : null,
      genres: [],
    }));

    res.json({ movies });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.trackMovie = async (req, res) => {
  try {
    const { tmdbId, status } = req.body;
    if (!["wishlist", "watched"].includes(status)) {
      return res.status(400).json({ message: "Status must be wishlist or watched" });
    }

    await persistMovieForUser(req.userId, tmdbId, status);

    res.json({ message: "Movie tracked" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getMyList = async (req, res) => {
  try {
    const movies = await Movie.find({ user: req.userId }).sort({ createdAt: -1 });
    const wishlist = movies.filter((movie) => movie.status === "wishlist");
    const watched = movies.filter((movie) => movie.status === "watched");

    res.json({ wishlist, watched });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getRecommendations = async (req, res) => {
  try {
    const recommendations = await generatePersonalizedRecommendations(req.userId);
    res.json(recommendations);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.removeTrackedMovie = async (req, res) => {
  try {
    const { tmdbId } = req.params;
    const { status } = req.query;

    if (!["wishlist", "watched"].includes(status)) {
      return res.status(400).json({ message: "Status query must be wishlist or watched" });
    }

    const movie = await Movie.findOne({ user: req.userId, tmdbId: String(tmdbId), status });
    if (!movie) {
      return res.status(404).json({ message: "Movie not found in this list" });
    }

    await Movie.deleteOne({ _id: movie._id });

    if (status === "watched") {
      await User.findByIdAndUpdate(req.userId, { $pull: { watchedMovies: movie._id } });
    } else {
      await User.findByIdAndUpdate(req.userId, { $pull: { wishlistMovies: movie._id } });
    }

    res.json({ message: `Movie removed from ${status}` });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};