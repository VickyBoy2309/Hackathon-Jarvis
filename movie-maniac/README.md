# Movie Maniac

Full-stack movie tracking and recommendation app using:

- Frontend: HTML, CSS, Vanilla JS
- Backend: Node.js + Express
- DB: MongoDB + Mongoose
- Auth: JWT + bcrypt
- Email: Nodemailer
- Movie data: TMDB API (real data)

## 1) Required Environment Variables

Create `movie-maniac/.env`:

```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/movie_maniac
JWT_SECRET=replace_with_a_long_random_secret

FRONTEND_URL=http://localhost:5000

TMDB_BASE_URL=https://api.themoviedb.org/3
TMDB_API_KEY=replace_with_tmdb_bearer_token

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_email@example.com
SMTP_PASS=your_email_app_password
FROM_EMAIL="Movie Maniac <no-reply@moviemaniac.com>"
```

## 2) MongoDB Setup Instructions

### Local MongoDB
1. Install MongoDB Community Edition.
2. Start MongoDB service.
3. Use `MONGO_URI=mongodb://127.0.0.1:27017/movie_maniac`.

### MongoDB Atlas (optional)
1. Create a free cluster in Atlas.
2. Create DB user + allow your IP.
3. Copy connection string to `MONGO_URI`.

## 3) TMDB API Setup Instructions

1. Create an account at https://www.themoviedb.org/
2. Go to **Settings -> API**.
3. Generate a **v4 API Read Access Token**.
4. Put it into `.env` as `TMDB_API_KEY`.

`TMDB_BASE_URL` should stay `https://api.themoviedb.org/3`.

## 4) Commands to Run the Project

From the `movie-maniac/` folder:

```bash
npm install
npm run dev
```

Open:

- `http://localhost:5000` -> Home page
- `http://localhost:5000/dashboard.html` -> Dashboard

## Main API Endpoints

### Auth
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/forgot-password`
- `POST /api/auth/reset-password/:token`
- `GET /api/auth/me` (Bearer token)

### Movies
- `GET /api/movies/popular`
- `GET /api/movies/upcoming`
- `GET /api/movies/details/:id`
- `POST /api/movies/watched` (Bearer token)
- `POST /api/movies/wishlist` (Bearer token)
- `GET /api/movies/my-list` (Bearer token)
- `GET /api/movies/recommendations` (Bearer token)

### User
- `GET /api/users/stats` (Bearer token)

## What is Connected End-to-End

- Authentication: Register/Login/JWT
- Password reset: email token -> reset page -> password updated
- TMDB data: popular/upcoming/details (no mock data)
- Watched/Wishlist: saved to MongoDB user record
- Dashboard stats: watched count, watched hours, weekly watched-minutes chart
- Recommendations: based on watched-genre frequency and TMDB discover