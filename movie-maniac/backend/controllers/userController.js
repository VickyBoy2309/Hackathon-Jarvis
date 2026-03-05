const Movie = require("../models/Movie");

exports.getStats = async (req, res) => {
  try {
    const movies = await Movie.find({ user: req.userId });
    const watchlistCount = movies.filter((movie) => movie.status === "wishlist").length;
    const watchedMovies = movies.filter((movie) => movie.status === "watched");
    const watchedCount = watchedMovies.length;

    const genreMap = watchedMovies
      .flatMap((movie) => movie.genres)
      .reduce((acc, genre) => {
        acc[genre] = (acc[genre] || 0) + 1;
        return acc;
      }, {});

    const topGenres = Object.entries(genreMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([genre, count]) => ({ genre, count }));

    const totalMinutesWatched = watchedMovies.reduce(
      (sum, movie) => sum + (Number(movie.runtime) || 0),
      0
    );

    const today = new Date();
    const dayOfWeek = today.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const weekStart = new Date(today);
    weekStart.setHours(0, 0, 0, 0);
    weekStart.setDate(today.getDate() + mondayOffset);

    const dayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const weeklyWatchedMinutes = dayLabels.map((label, index) => {
      const start = new Date(weekStart);
      start.setDate(weekStart.getDate() + index);

      const end = new Date(start);
      end.setDate(start.getDate() + 1);

      const minutes = watchedMovies
        .filter((movie) => {
          const watchedDate = movie.watchedAt || movie.updatedAt || movie.createdAt;
          return watchedDate >= start && watchedDate < end;
        })
        .reduce((sum, movie) => sum + (Number(movie.runtime) || 0), 0);

      return { label, minutes };
    });

    res.json({
      watchlistCount,
      watchedCount,
      totalMinutesWatched,
      totalHoursWatched: Number((totalMinutesWatched / 60).toFixed(1)),
      weeklyWatchedMinutes,
      topGenres,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};