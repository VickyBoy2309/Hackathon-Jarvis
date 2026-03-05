const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true },
    profilePhoto: { type: String, default: "" },
    watchedMovies: [{ type: mongoose.Schema.Types.ObjectId, ref: "Movie" }],
    wishlistMovies: [{ type: mongoose.Schema.Types.ObjectId, ref: "Movie" }],
    resetPasswordToken: { type: String, default: null },
    resetPasswordExpire: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);