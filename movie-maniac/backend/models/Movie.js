const mongoose = require("mongoose");

const movieSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    tmdbId: { type: String, required: true },
    title: { type: String, required: true },
    poster: { type: String, default: "" },
    year: { type: String, default: "" },
    rating: { type: String, default: "" },
    runtime: { type: Number, default: 0 },
    genres: { type: [String], default: [] },
    ottProviders: {
      type: [
        {
          name: { type: String, required: true },
          logo: { type: String, default: "" },
          url: { type: String, default: "" },
        },
      ],
      default: [],
    },
    ottLink: { type: String, default: "" },
    status: { type: String, enum: ["wishlist", "watched"], required: true },
    watchedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

movieSchema.index({ user: 1, tmdbId: 1 }, { unique: true });

module.exports = mongoose.model("Movie", movieSchema);