const express = require("express");
const {
  getPopularMovies,
  getUpcomingMovies,
  getMovieDetails,
  addWatchedMovie,
  addWishlistMovie,
  discoverMovies,
  trackMovie,
  getMyList,
  getRecommendations,
  removeTrackedMovie,
} = require("../controllers/movieController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/popular", getPopularMovies);
router.get("/upcoming", getUpcomingMovies);
router.get("/details/:id", getMovieDetails);
router.post("/watched", protect, addWatchedMovie);
router.post("/wishlist", protect, addWishlistMovie);

router.get("/discover", protect, discoverMovies);
router.post("/track", protect, trackMovie);
router.get("/my-list", protect, getMyList);
router.get("/recommendations", protect, getRecommendations);
router.delete("/:tmdbId", protect, removeTrackedMovie);

module.exports = router;