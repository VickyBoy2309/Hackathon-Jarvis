import { useState, useEffect } from 'react';
import {
  Search,
  Star,
  Heart,
  Eye,
  Calendar,
  BarChart3,
  User,
  LogOut,
  Mail,
  Lock,
  EyeOff,
  Play,
  Plus,
  X,
  TrendingUp,
  Clock,
  Check,
  Send,
  Film,
  Menu,
  Home
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

// Movie type definitions
interface Movie {
  id: number;
  title: string;
  poster_path: string | null;
  backdrop_path: string | null;
  overview: string;
  release_date: string;
  vote_average: number;
  genre_ids: number[];
  runtime?: number;
  genres?: { id: number; name: string }[];
}

interface UserData {
  id: string;
  email: string;
  name: string;
  watched: number[];
  wishlist: number[];
  ratings: { movieId: number; rating: number }[];
}

// Genre mapping for TMDB
const genreMap: { [key: number]: string } = {
  28: 'Action',
  12: 'Adventure',
  16: 'Animation',
  35: 'Comedy',
  80: 'Crime',
  99: 'Documentary',
  18: 'Drama',
  10751: 'Family',
  14: 'Fantasy',
  36: 'History',
  27: 'Horror',
  10402: 'Music',
  9648: 'Mystery',
  10749: 'Romance',
  878: 'Science Fiction',
  53: 'Thriller',
  10752: 'War',
  37: 'Western'
};

// Mock backend service (simulating Node.js/Express/MongoDB)
const mockBackend = {
  users: [] as UserData[],
  resetTokens: new Map<string, { email: string; expires: number }>(),
  
  async register(name: string, email: string, _password: string): Promise<{ success: boolean; token?: string; user?: UserData; error?: string }> {
    await new Promise(r => setTimeout(r, 500));
    if (this.users.find(u => u.email === email)) {
      return { success: false, error: 'User already exists' };
    }
    const user: UserData = {
      id: Math.random().toString(36).substr(2, 9),
      email,
      name,
      watched: [],
      wishlist: [],
      ratings: []
    };
    this.users.push(user);
    const token = btoa(JSON.stringify({ userId: user.id, exp: Date.now() + 86400000 }));
    return { success: true, token, user };
  },

  async login(email: string, _password: string): Promise<{ success: boolean; token?: string; user?: UserData; error?: string }> {
    await new Promise(r => setTimeout(r, 500));
    const user = this.users.find(u => u.email === email);
    if (!user) {
      return { success: false, error: 'Invalid credentials' };
    }
    const token = btoa(JSON.stringify({ userId: user.id, exp: Date.now() + 86400000 }));
    return { success: true, token, user };
  },

  async requestPasswordReset(email: string): Promise<{ success: boolean; message?: string }> {
    await new Promise(r => setTimeout(r, 500));
    const user = this.users.find(u => u.email === email);
    if (user) {
      const token = Math.random().toString(36).substr(2, 12);
      this.resetTokens.set(token, { email, expires: Date.now() + 3600000 });
      console.log(`Password reset token for ${email}: ${token}`);
      return { success: true, message: 'Reset link sent to your email' };
    }
    return { success: true, message: 'If the email exists, a reset link has been sent' };
  },

  async resetPassword(token: string, _newPassword: string): Promise<{ success: boolean; error?: string }> {
    await new Promise(r => setTimeout(r, 500));
    const resetData = this.resetTokens.get(token);
    if (!resetData || resetData.expires < Date.now()) {
      return { success: false, error: 'Invalid or expired token' };
    }
    this.resetTokens.delete(token);
    return { success: true };
  },

  async updateUser(userId: string, updates: Partial<UserData>): Promise<{ success: boolean; user?: UserData }> {
    await new Promise(r => setTimeout(r, 200));
    const userIndex = this.users.findIndex(u => u.id === userId);
    if (userIndex !== -1) {
      this.users[userIndex] = { ...this.users[userIndex], ...updates };
      return { success: true, user: this.users[userIndex] };
    }
    return { success: false };
  }
};

const TMDB_API_KEY = '2dca580c2a14b55200e784d157207b4d';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p';

export default function App() {
  const [currentView, setCurrentView] = useState<'auth' | 'home' | 'discover' | 'dashboard' | 'watchlist' | 'watched' | 'reset-password'>('auth');
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [isLoading, setIsLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const [user, setUser] = useState<UserData | null>(null);
  const [_token, setToken] = useState<string | null>(null);

  const [movies, setMovies] = useState<Movie[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [recommendations, setRecommendations] = useState<Movie[]>([]);
  const [trendingMovies, setTrendingMovies] = useState<Movie[]>([]);
  const [popularMovies, setPopularMovies] = useState<Movie[]>([]);
  const [topRatedMovies, setTopRatedMovies] = useState<Movie[]>([]);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchMovies = async (endpoint: string, params: string = '') => {
    try {
      const response = await fetch(`${TMDB_BASE_URL}${endpoint}?api_key=${TMDB_API_KEY}${params}`);
      const data = await response.json();
      return data.results || [];
    } catch (error) {
      console.error('Error fetching movies:', error);
      return [];
    }
  };

  

  useEffect(() => {
    const loadInitialData = async () => {
      setIsLoading(true);
      const [trending, popular, topRated] = await Promise.all([
        fetchMovies('/trending/movie/week'),
        fetchMovies('/movie/popular'),
        fetchMovies('/movie/top_rated')
      ]);
      setTrendingMovies(trending);
      setPopularMovies(popular);
      setTopRatedMovies(topRated);
      setMovies(trending);
      setIsLoading(false);
    };
    loadInitialData();
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      let result;
      if (authMode === 'login') {
        result = await mockBackend.login(email, password);
      } else {
        result = await mockBackend.register(name, email, password);
      }

      if (result.success && result.token && result.user) {
        setToken(result.token);
        setUser(result.user);
        setCurrentView('home');
        showToast(`${authMode === 'login' ? 'Welcome back!' : 'Account created successfully!'}`, 'success');
      } else {
        showToast(result.error || 'Something went wrong', 'error');
      }
    } catch (error) {
      showToast('An error occurred', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const result = await mockBackend.requestPasswordReset(email);
    showToast(result.message || 'Reset email sent', 'success');
    setIsLoading(false);
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const result = await mockBackend.resetPassword(resetToken, newPassword);
    if (result.success) {
      showToast('Password reset successful! Please login.', 'success');
      setCurrentView('auth');
      setAuthMode('login');
    } else {
      showToast(result.error || 'Reset failed', 'error');
    }
    setIsLoading(false);
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    
    setIsLoading(true);
    const results = await fetchMovies('/search/movie', `&query=${encodeURIComponent(searchQuery)}`);
    setMovies(results);
    setCurrentView('discover');
    setIsLoading(false);
  };

  const toggleWatched = async (movieId: number) => {
    if (!user) return;
    
    const isWatched = user.watched.includes(movieId);
    let newWishlist = [...user.wishlist];
    let newWatched: number[];
    
    if (isWatched) {
      newWatched = user.watched.filter(id => id !== movieId);
    } else {
      newWatched = [...user.watched, movieId];
      newWishlist = newWishlist.filter(id => id !== movieId);
    }
    
    const result = await mockBackend.updateUser(user.id, { watched: newWatched, wishlist: newWishlist });
    if (result.user) {
      setUser(result.user);
      showToast(isWatched ? 'Removed from watched' : 'Added to watched', 'success');
    }
  };

  const toggleWishlist = async (movieId: number) => {
    if (!user) return;
    
    const isWishlisted = user.wishlist.includes(movieId);
    let newWatched = [...user.watched];
    let newWishlist: number[];
    
    if (isWishlisted) {
      newWishlist = user.wishlist.filter(id => id !== movieId);
    } else {
      newWishlist = [...user.wishlist, movieId];
      newWatched = newWatched.filter(id => id !== movieId);
    }
    
    const result = await mockBackend.updateUser(user.id, { wishlist: newWishlist, watched: newWatched });
    if (result.user) {
      setUser(result.user);
      showToast(isWishlisted ? 'Removed from wishlist' : 'Added to wishlist', 'success');
    }
  };

  const rateMovie = async (movieId: number, rating: number) => {
    if (!user) return;
    
    const existingRating = user.ratings.find(r => r.movieId === movieId);
    let newRatings: { movieId: number; rating: number }[];
    
    if (existingRating) {
      newRatings = user.ratings.map(r => r.movieId === movieId ? { ...r, rating } : r);
    } else {
      newRatings = [...user.ratings, { movieId, rating }];
    }
    
    const result = await mockBackend.updateUser(user.id, { ratings: newRatings });
    if (result.user) {
      setUser(result.user);
      showToast('Rating saved!', 'success');
    }
  };

  const getMovieById = (movieId: number) => {
    const allMovies = [...trendingMovies, ...popularMovies, ...topRatedMovies, ...movies];
    return allMovies.find(m => m.id === movieId);
  };

  const getDashboardStats = () => {
    if (!user) return { watched: 0, wishlist: 0, ratings: 0, genres: [], activity: [] };
    
    const genreCount: { [key: string]: number } = {};
    user.watched.forEach(id => {
      const movie = getMovieById(id);
      if (movie) {
        movie.genre_ids.forEach(gid => {
          const genre = genreMap[gid] || 'Other';
          genreCount[genre] = (genreCount[genre] || 0) + 1;
        });
      }
    });

    const genres = Object.entries(genreCount).slice(0, 5).map(([name, value]) => ({ name, value }));
    
    const activity = [
      { month: 'Jan', movies: Math.floor(Math.random() * 10) },
      { month: 'Feb', movies: Math.floor(Math.random() * 15) },
      { month: 'Mar', movies: user.watched.length > 5 ? 8 : 3 },
      { month: 'Apr', movies: user.watched.length > 10 ? 12 : 5 },
      { month: 'May', movies: user.watched.length > 15 ? 15 : 7 },
      { month: 'Jun', movies: user.watched.length },
    ];

    return {
      watched: user.watched.length,
      wishlist: user.wishlist.length,
      ratings: user.ratings.length,
      genres,
      activity
    };
  };

  const getRecommendations = async () => {
    if (!user || user.watched.length === 0) {
      return popularMovies.slice(0, 12);
    }

    const watchedGenres: { [key: number]: number } = {};
    user.watched.forEach(id => {
      const movie = getMovieById(id);
      if (movie) {
        movie.genre_ids.forEach(gid => {
          watchedGenres[gid] = (watchedGenres[gid] || 0) + 1;
        });
      }
    });

    const topGenre = Object.entries(watchedGenres).sort((a, b) => b[1] - a[1])[0];
    if (topGenre) {
      const recommendations = await fetchMovies('/discover/movie', `&with_genres=${topGenre[0]}&sort_by=vote_average.desc`);
      return recommendations.filter((m: Movie) => !user.watched.includes(m.id)).slice(0, 12);
    }
    
    return popularMovies.slice(0, 12);
  };

  useEffect(() => {
    if (currentView === 'home' && user) {
      getRecommendations().then(recs => setRecommendations(recs));
    }
  }, [currentView, user]);

  const logout = () => {
    setUser(null);
    setToken(null);
    setCurrentView('auth');
    showToast('Logged out successfully', 'success');
  };

  const MovieCard = ({ movie, size = 'normal' }: { movie: Movie; size?: 'normal' | 'large' }) => {
    const isWatched = user?.watched.includes(movie.id);
    const isWishlisted = user?.wishlist.includes(movie.id);
    const userRating = user?.ratings.find(r => r.movieId === movie.id);

    return (
      <div 
        className={`bg-gray-900 rounded-lg overflow-hidden shadow-lg hover:shadow-yellow-500/20 transition-all duration-300 cursor-pointer transform hover:-translate-y-1 ${size === 'large' ? 'md:flex' : ''}`}
        onClick={() => setSelectedMovie(movie)}
      >
        <div className={`relative ${size === 'large' ? 'md:w-48 flex-shrink-0' : ''}`}>
          <img
            src={movie.poster_path ? `${TMDB_IMAGE_BASE}/w342${movie.poster_path}` : 'https://picsum.photos/300/450?random'}
            alt={movie.title}
            className={`w-full object-cover ${size === 'large' ? 'h-72 md:h-full' : 'h-64'}`}
          />
          <div className="absolute top-2 right-2 bg-black/80 px-2 py-1 rounded flex items-center gap-1">
            <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
            <span className="text-sm font-bold text-white">{movie.vote_average.toFixed(1)}</span>
          </div>
          {isWatched && (
            <div className="absolute top-2 left-2 bg-green-600 p-1 rounded-full">
              <Eye className="w-4 h-4 text-white" />
            </div>
          )}
        </div>
        <div className="p-4">
          <h3 className="font-bold text-white text-lg mb-2 line-clamp-2">{movie.title}</h3>
          <p className="text-gray-400 text-sm mb-3">{movie.release_date?.split('-')[0] || 'N/A'}</p>
          <p className="text-gray-300 text-sm line-clamp-2 mb-4">{movie.overview}</p>
          <div className="flex flex-wrap gap-1 mb-4">
            {movie.genre_ids.slice(0, 3).map(gid => (
              <span key={gid} className="text-xs bg-gray-800 text-yellow-500 px-2 py-1 rounded">
                {genreMap[gid] || 'Other'}
              </span>
            ))}
          </div>
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <button
                onClick={(e) => { e.stopPropagation(); toggleWatched(movie.id); }}
                className={`p-2 rounded-lg transition-colors ${isWatched ? 'bg-green-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}
              >
                <Eye className="w-5 h-5" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); toggleWishlist(movie.id); }}
                className={`p-2 rounded-lg transition-colors ${isWishlisted ? 'bg-red-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}
              >
                <Heart className="w-5 h-5" />
              </button>
            </div>
            {userRating && (
              <div className="flex items-center gap-1">
                <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                <span className="text-white font-bold">{userRating.rating}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const COLORS = ['#F5C518', '#3B82F6', '#10B981', '#EF4444', '#8B5CF6'];

  const renderAuthForm = () => (
    <div className="min-h-screen bg-[#121212] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-yellow-500 rounded-xl mb-4">
            <Film className="w-10 h-10 text-black" />
          </div>
          <h1 className="text-3xl font-bold text-white">Movie Maniac</h1>
          <p className="text-gray-400 mt-2">Track, discover, and share your favorite movies</p>
        </div>

        <div className="bg-gray-900 rounded-2xl p-8 shadow-xl">
          {currentView === 'reset-password' ? (
            <>
              <h2 className="text-2xl font-bold text-white mb-6">Reset Password</h2>
              <form onSubmit={resetToken ? handleResetPassword : handlePasswordReset} className="space-y-4">
                {!resetToken ? (
                  <div>
                    <label className="block text-gray-400 text-sm mb-2">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full bg-gray-800 text-white pl-12 pr-4 py-3 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:outline-none"
                        placeholder="Enter your email"
                        required
                      />
                    </div>
                  </div>
                ) : (
                  <>
                    <div>
                      <label className="block text-gray-400 text-sm mb-2">Reset Token</label>
                      <input
                        type="text"
                        value={resetToken}
                        onChange={(e) => setResetToken(e.target.value)}
                        className="w-full bg-gray-800 text-white px-4 py-3 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:outline-none"
                        placeholder="Enter token from email"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-gray-400 text-sm mb-2">New Password</label>
                      <div className="relative">
                        <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="w-full bg-gray-800 text-white pl-12 pr-12 py-3 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:outline-none"
                          placeholder="Enter new password"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-300"
                        >
                          {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>
                  </>
                )}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-3 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <><Send className="w-5 h-5" /> {resetToken ? 'Reset Password' : 'Send Reset Link'}</>
                  )}
                </button>
              </form>
              <button
                onClick={() => { setCurrentView('auth'); setResetToken(''); }}
                className="w-full text-center text-yellow-500 hover:text-yellow-400 mt-4"
              >
                Back to Login
              </button>
            </>
          ) : (
            <>
              <div className="flex gap-4 mb-6">
                <button
                  onClick={() => setAuthMode('login')}
                  className={`flex-1 py-2 font-semibold rounded-lg transition-colors ${authMode === 'login' ? 'bg-yellow-500 text-black' : 'bg-gray-800 text-gray-400 hover:text-white'}`}
                >
                  Login
                </button>
                <button
                  onClick={() => setAuthMode('register')}
                  className={`flex-1 py-2 font-semibold rounded-lg transition-colors ${authMode === 'register' ? 'bg-yellow-500 text-black' : 'bg-gray-800 text-gray-400 hover:text-white'}`}
                >
                  Register
                </button>
              </div>

              <form onSubmit={handleAuth} className="space-y-4">
                {authMode === 'register' && (
                  <div>
                    <label className="block text-gray-400 text-sm mb-2">Full Name</label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full bg-gray-800 text-white pl-12 pr-4 py-3 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:outline-none"
                        placeholder="Enter your name"
                        required
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-gray-400 text-sm mb-2">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-gray-800 text-white pl-12 pr-4 py-3 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:outline-none"
                      placeholder="Enter your email"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-gray-400 text-sm mb-2">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-gray-800 text-white pl-12 pr-12 py-3 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:outline-none"
                      placeholder="Enter your password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-300"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {authMode === 'login' && (
                  <button
                    type="button"
                    onClick={() => setCurrentView('reset-password')}
                    className="text-yellow-500 text-sm hover:underline"
                  >
                    Forgot password?
                  </button>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-3 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  ) : (
                    authMode === 'login' ? 'Sign In' : 'Create Account'
                  )}
                </button>
              </form>
            </>
          )}
        </div>

        <p className="text-center text-gray-500 text-sm mt-8">
          © 2024 Movie Maniac. All rights reserved.
        </p>
      </div>
    </div>
  );

  const renderNavbar = () => (
    <nav className="bg-[#1a1a1a] border-b border-gray-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setCurrentView('home')}
              className="flex items-center gap-2"
            >
              <div className="bg-yellow-500 p-2 rounded-lg">
                <Film className="w-6 h-6 text-black" />
              </div>
              <span className="text-xl font-bold text-white hidden sm:block">Movie Maniac</span>
            </button>

            <form onSubmit={handleSearch} className="flex-1 max-w-xl hidden md:block">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-gray-800 text-white pl-10 pr-4 py-2 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:outline-none"
                  placeholder="Search movies..."
                />
              </div>
            </form>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden text-gray-400 hover:text-white"
            >
              <Menu className="w-6 h-6" />
            </button>

            <div className="hidden md:flex items-center gap-2">
              <button
                onClick={() => setCurrentView('home')}
                className={`px-3 py-2 rounded-lg transition-colors ${currentView === 'home' ? 'bg-yellow-500 text-black' : 'text-gray-400 hover:text-white'}`}
              >
                <Home className="w-5 h-5" />
              </button>
              <button
                onClick={() => setCurrentView('discover')}
                className={`px-3 py-2 rounded-lg transition-colors ${currentView === 'discover' ? 'bg-yellow-500 text-black' : 'text-gray-400 hover:text-white'}`}
              >
                <Search className="w-5 h-5" />
              </button>
              <button
                onClick={() => setCurrentView('watchlist')}
                className={`px-3 py-2 rounded-lg transition-colors relative ${currentView === 'watchlist' ? 'bg-yellow-500 text-black' : 'text-gray-400 hover:text-white'}`}
              >
                <Heart className="w-5 h-5" />
                {user?.wishlist.length ? (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                    {user.wishlist.length}
                  </span>
                ) : null}
              </button>
              <button
                onClick={() => setCurrentView('watched')}
                className={`px-3 py-2 rounded-lg transition-colors ${currentView === 'watched' ? 'bg-yellow-500 text-black' : 'text-gray-400 hover:text-white'}`}
              >
                <Eye className="w-5 h-5" />
              </button>
              <button
                onClick={() => setCurrentView('dashboard')}
                className={`px-3 py-2 rounded-lg transition-colors ${currentView === 'dashboard' ? 'bg-yellow-500 text-black' : 'text-gray-400 hover:text-white'}`}
              >
                <BarChart3 className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center">
                <span className="text-black font-bold">{user?.name?.charAt(0).toUpperCase() || 'U'}</span>
              </div>
              <button
                onClick={logout}
                className="text-gray-400 hover:text-white"
                title="Logout"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        <div className="md:hidden pb-4">
          <form onSubmit={handleSearch} className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-gray-800 text-white pl-10 pr-4 py-2 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:outline-none"
                placeholder="Search movies..."
              />
            </div>
          </form>

          {mobileMenuOpen && (
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => { setCurrentView('home'); setMobileMenuOpen(false); }}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${currentView === 'home' ? 'bg-yellow-500 text-black' : 'bg-gray-800 text-gray-400'}`}
              >
                <Home className="w-4 h-4" /> Home
              </button>
              <button
                onClick={() => { setCurrentView('discover'); setMobileMenuOpen(false); }}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${currentView === 'discover' ? 'bg-yellow-500 text-black' : 'bg-gray-800 text-gray-400'}`}
              >
                <Search className="w-4 h-4" /> Discover
              </button>
              <button
                onClick={() => { setCurrentView('watchlist'); setMobileMenuOpen(false); }}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${currentView === 'watchlist' ? 'bg-yellow-500 text-black' : 'bg-gray-800 text-gray-400'}`}
              >
                <Heart className="w-4 h-4" /> Wishlist ({user?.wishlist.length || 0})
              </button>
              <button
                onClick={() => { setCurrentView('watched'); setMobileMenuOpen(false); }}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${currentView === 'watched' ? 'bg-yellow-500 text-black' : 'bg-gray-800 text-gray-400'}`}
              >
                <Eye className="w-4 h-4" /> Watched ({user?.watched.length || 0})
              </button>
              <button
                onClick={() => { setCurrentView('dashboard'); setMobileMenuOpen(false); }}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${currentView === 'dashboard' ? 'bg-yellow-500 text-black' : 'bg-gray-800 text-gray-400'}`}
              >
                <BarChart3 className="w-4 h-4" /> Dashboard
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );

  const renderMovieModal = () => {
    if (!selectedMovie) return null;

    const isWatched = user?.watched.includes(selectedMovie.id);
    const isWishlisted = user?.wishlist.includes(selectedMovie.id);
    const userRating = user?.ratings.find(r => r.movieId === selectedMovie.id);

    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50" onClick={() => setSelectedMovie(null)}>
        <div className="bg-gray-900 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
          <div className="relative">
            <img
              src={selectedMovie.backdrop_path ? `${TMDB_IMAGE_BASE}/original${selectedMovie.backdrop_path}` : selectedMovie.poster_path ? `${TMDB_IMAGE_BASE}/original${selectedMovie.poster_path}` : 'https://picsum.photos/1280/720'}
              alt={selectedMovie.title}
              className="w-full h-64 md:h-96 object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-transparent to-transparent" />
            <button
              onClick={() => setSelectedMovie(null)}
              className="absolute top-4 right-4 bg-black/50 p-2 rounded-full text-white hover:bg-black/70"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="p-6 -mt-20 relative">
            <div className="flex flex-col md:flex-row gap-6">
              <img
                src={selectedMovie.poster_path ? `${TMDB_IMAGE_BASE}/w342${selectedMovie.poster_path}` : 'https://picsum.photos/300/450'}
                alt={selectedMovie.title}
                className="w-40 h-60 object-cover rounded-xl shadow-xl hidden md:block"
              />

              <div className="flex-1">
                <h2 className="text-3xl font-bold text-white mb-2">{selectedMovie.title}</h2>
                <div className="flex items-center gap-4 mb-4">
                  <span className="text-gray-400 flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {selectedMovie.release_date || 'N/A'}
                  </span>
                  <div className="flex items-center gap-1">
                    <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                    <span className="text-xl font-bold text-white">{selectedMovie.vote_average.toFixed(1)}</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mb-4">
                  {selectedMovie.genre_ids.map(gid => (
                    <span key={gid} className="bg-gray-800 text-yellow-500 px-3 py-1 rounded-full text-sm">
                      {genreMap[gid] || 'Other'}
                    </span>
                  ))}
                </div>

                <p className="text-gray-300 mb-6 leading-relaxed">{selectedMovie.overview}</p>

                <div className="flex flex-wrap gap-4 mb-6">
                  <button
                    onClick={() => toggleWatched(selectedMovie.id)}
                    className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-colors ${isWatched ? 'bg-green-600 text-white' : 'bg-gray-800 text-white hover:bg-gray-700'}`}
                  >
                    <Eye className="w-5 h-5" />
                    {isWatched ? 'Watched' : 'Mark as Watched'}
                  </button>
                  <button
                    onClick={() => toggleWishlist(selectedMovie.id)}
                    className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-colors ${isWishlisted ? 'bg-red-600 text-white' : 'bg-gray-800 text-white hover:bg-gray-700'}`}
                  >
                    <Heart className="w-5 h-5" />
                    {isWishlisted ? 'In Wishlist' : 'Add to Wishlist'}
                  </button>
                </div>

                <div className="bg-gray-800 rounded-xl p-4">
                  <h3 className="text-white font-semibold mb-3">Rate this movie</h3>
                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(rating => (
                      <button
                        key={rating}
                        onClick={() => rateMovie(selectedMovie.id, rating)}
                        className={`w-10 h-10 rounded-lg font-bold transition-colors ${userRating?.rating === rating ? 'bg-yellow-500 text-black' : 'bg-gray-700 text-gray-400 hover:bg-gray-600 hover:text-white'}`}
                      >
                        {rating}
                      </button>
                    ))}
                  </div>
                  {userRating && (
                    <p className="text-yellow-500 mt-2">You rated: {userRating.rating}/10</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderHome = () => {
    const stats = getDashboardStats();
    
    return (
      <div className="min-h-screen bg-[#121212]">
        {renderNavbar()}

        <div className="relative h-96 overflow-hidden">
          <img
            src={trendingMovies[0]?.backdrop_path ? `${TMDB_IMAGE_BASE}/original${trendingMovies[0].backdrop_path}` : 'https://picsum.photos/1920/600'}
            alt="Featured"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#121212] via-[#121212]/80 to-transparent" />
          <div className="absolute bottom-0 left-0 p-8 max-w-xl">
            <span className="text-yellow-500 font-semibold flex items-center gap-2 mb-2">
              <TrendingUp className="w-5 h-5" /> Trending Now
            </span>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">{trendingMovies[0]?.title}</h1>
            <p className="text-gray-300 mb-6 line-clamp-3">{trendingMovies[0]?.overview}</p>
            <div className="flex gap-4">
              <button
                onClick={() => setSelectedMovie(trendingMovies[0])}
                className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold px-6 py-3 rounded-lg flex items-center gap-2 transition-colors"
              >
                <Play className="w-5 h-5" /> View Details
              </button>
              <button
                onClick={() => toggleWishlist(trendingMovies[0]?.id)}
                className="bg-gray-800 hover:bg-gray-700 text-white font-bold px-6 py-3 rounded-lg flex items-center gap-2 transition-colors"
              >
                <Plus className="w-5 h-5" /> Add to Wishlist
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-gray-900 rounded-xl p-6">
              <div className="flex items-center gap-4">
                <div className="bg-yellow-500/20 p-3 rounded-lg">
                  <Eye className="w-6 h-6 text-yellow-500" />
                </div>
                <div>
                  <p className="text-3xl font-bold text-white">{stats.watched}</p>
                  <p className="text-gray-400 text-sm">Movies Watched</p>
                </div>
              </div>
            </div>
            <div className="bg-gray-900 rounded-xl p-6">
              <div className="flex items-center gap-4">
                <div className="bg-red-500/20 p-3 rounded-lg">
                  <Heart className="w-6 h-6 text-red-500" />
                </div>
                <div>
                  <p className="text-3xl font-bold text-white">{stats.wishlist}</p>
                  <p className="text-gray-400 text-sm">In Wishlist</p>
                </div>
              </div>
            </div>
            <div className="bg-gray-900 rounded-xl p-6">
              <div className="flex items-center gap-4">
                <div className="bg-blue-500/20 p-3 rounded-lg">
                  <Star className="w-6 h-6 text-blue-500" />
                </div>
                <div>
                  <p className="text-3xl font-bold text-white">{stats.ratings}</p>
                  <p className="text-gray-400 text-sm">Ratings Given</p>
                </div>
              </div>
            </div>
            <div className="bg-gray-900 rounded-xl p-6">
              <div className="flex items-center gap-4">
                <div className="bg-green-500/20 p-3 rounded-lg">
                  <Clock className="w-6 h-6 text-green-500" />
                </div>
                <div>
                  <p className="text-3xl font-bold text-white">{stats.watched * 2}h</p>
                  <p className="text-gray-400 text-sm">Watch Time (est.)</p>
                </div>
              </div>
            </div>
          </div>

          <section className="mb-12">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <TrendingUp className="w-6 h-6 text-yellow-500" /> Trending This Week
              </h2>
              <button
                onClick={() => setCurrentView('discover')}
                className="text-yellow-500 hover:text-yellow-400 font-semibold"
              >
                View All →
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {trendingMovies.slice(0, 6).map(movie => (
                <div
                  key={movie.id}
                  onClick={() => setSelectedMovie(movie)}
                  className="bg-gray-900 rounded-lg overflow-hidden cursor-pointer hover:ring-2 hover:ring-yellow-500 transition-all"
                >
                  <div className="relative">
                    <img
                      src={movie.poster_path ? `${TMDB_IMAGE_BASE}/w342${movie.poster_path}` : 'https://picsum.photos/300/450'}
                      alt={movie.title}
                      className="w-full h-48 object-cover"
                    />
                    <div className="absolute top-2 right-2 bg-black/80 px-2 py-1 rounded flex items-center gap-1">
                      <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                      <span className="text-xs font-bold text-white">{movie.vote_average.toFixed(1)}</span>
                    </div>
                  </div>
                  <div className="p-3">
                    <h3 className="text-white font-semibold text-sm line-clamp-1">{movie.title}</h3>
                    <p className="text-gray-400 text-xs">{movie.release_date?.split('-')[0]}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="mb-12">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <Star className="w-6 h-6 text-yellow-500 fill-yellow-500" /> Top Rated Movies
              </h2>
              <button
                onClick={() => setCurrentView('discover')}
                className="text-yellow-500 hover:text-yellow-400 font-semibold"
              >
                View All →
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {topRatedMovies.slice(0, 6).map(movie => (
                <div
                  key={movie.id}
                  onClick={() => setSelectedMovie(movie)}
                  className="bg-gray-900 rounded-lg overflow-hidden cursor-pointer hover:ring-2 hover:ring-yellow-500 transition-all"
                >
                  <div className="relative">
                    <img
                      src={movie.poster_path ? `${TMDB_IMAGE_BASE}/w342${movie.poster_path}` : 'https://picsum.photos/300/450'}
                      alt={movie.title}
                      className="w-full h-48 object-cover"
                    />
                    <div className="absolute top-2 right-2 bg-black/80 px-2 py-1 rounded flex items-center gap-1">
                      <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                      <span className="text-xs font-bold text-white">{movie.vote_average.toFixed(1)}</span>
                    </div>
                  </div>
                  <div className="p-3">
                    <h3 className="text-white font-semibold text-sm line-clamp-1">{movie.title}</h3>
                    <p className="text-gray-400 text-xs">{movie.release_date?.split('-')[0]}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {recommendations.length > 0 && (
            <section className="mb-12">
              <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                <Check className="w-6 h-6 text-yellow-500" /> Recommended For You
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {recommendations.slice(0, 6).map(movie => (
                  <MovieCard key={movie.id} movie={movie} />
                ))}
              </div>
            </section>
          )}
        </div>

        {renderMovieModal()}
      </div>
    );
  };

  const renderDiscover = () => (
    <div className="min-h-screen bg-[#121212]">
      {renderNavbar()}
      
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-4">Discover Movies</h1>
          <div className="flex flex-wrap gap-4">
            <button
              onClick={() => setMovies(trendingMovies)}
              className="px-4 py-2 bg-yellow-500 text-black font-semibold rounded-lg"
            >
              Trending
            </button>
            <button
              onClick={() => setMovies(popularMovies)}
              className="px-4 py-2 bg-gray-800 text-white font-semibold rounded-lg hover:bg-gray-700"
            >
              Popular
            </button>
            <button
              onClick={() => setMovies(topRatedMovies)}
              className="px-4 py-2 bg-gray-800 text-white font-semibold rounded-lg hover:bg-gray-700"
            >
              Top Rated
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-12 h-12 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {movies.map(movie => (
              <MovieCard key={movie.id} movie={movie} />
            ))}
          </div>
        )}

        {!isLoading && movies.length === 0 && (
          <div className="text-center py-20">
            <Film className="w-16 h-16 text-gray-700 mx-auto mb-4" />
            <p className="text-gray-500 text-xl">No movies found</p>
          </div>
        )}
      </div>

      {renderMovieModal()}
    </div>
  );

  const renderWatchlist = () => {
    const watchlistMovies = user?.wishlist.map(id => getMovieById(id)).filter(Boolean) as Movie[];

    return (
      <div className="min-h-screen bg-[#121212]">
        {renderNavbar()}
        
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
              <Heart className="w-8 h-8 text-red-500 fill-red-500" />
              My Wishlist
            </h1>
            <p className="text-gray-400">{watchlistMovies?.length || 0} movies saved</p>
          </div>

          {watchlistMovies?.length ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {watchlistMovies.map(movie => (
                <MovieCard key={movie.id} movie={movie} />
              ))}
            </div>
          ) : (
            <div className="text-center py-20">
              <Heart className="w-16 h-16 text-gray-700 mx-auto mb-4" />
              <p className="text-gray-500 text-xl mb-4">Your wishlist is empty</p>
              <button
                onClick={() => setCurrentView('discover')}
                className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold px-6 py-3 rounded-lg"
              >
                Discover Movies
              </button>
            </div>
          )}
        </div>

        {renderMovieModal()}
      </div>
    );
  };

  const renderWatched = () => {
    const watchedMovies = user?.watched.map(id => getMovieById(id)).filter(Boolean) as Movie[];

    return (
      <div className="min-h-screen bg-[#121212]">
        {renderNavbar()}
        
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
              <Eye className="w-8 h-8 text-green-500" />
              Watched Movies
            </h1>
            <p className="text-gray-400">{watchedMovies?.length || 0} movies watched</p>
          </div>

          {watchedMovies?.length ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {watchedMovies.map(movie => (
                <MovieCard key={movie.id} movie={movie} />
              ))}
            </div>
          ) : (
            <div className="text-center py-20">
              <Eye className="w-16 h-16 text-gray-700 mx-auto mb-4" />
              <p className="text-gray-500 text-xl mb-4">No movies marked as watched yet</p>
              <button
                onClick={() => setCurrentView('discover')}
                className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold px-6 py-3 rounded-lg"
              >
                Discover Movies
              </button>
            </div>
          )}
        </div>

        {renderMovieModal()}
      </div>
    );
  };

  const renderDashboard = () => {
    const stats = getDashboardStats();

    return (
      <div className="min-h-screen bg-[#121212]">
        {renderNavbar()}
        
        <div className="max-w-7xl mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold text-white mb-8">Dashboard Analytics</h1>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-gray-900 rounded-xl p-6">
              <div className="flex items-center gap-4">
                <div className="bg-yellow-500/20 p-3 rounded-lg">
                  <Eye className="w-6 h-6 text-yellow-500" />
                </div>
                <div>
                  <p className="text-3xl font-bold text-white">{stats.watched}</p>
                  <p className="text-gray-400 text-sm">Movies Watched</p>
                </div>
              </div>
            </div>
            <div className="bg-gray-900 rounded-xl p-6">
              <div className="flex items-center gap-4">
                <div className="bg-red-500/20 p-3 rounded-lg">
                  <Heart className="w-6 h-6 text-red-500" />
                </div>
                <div>
                  <p className="text-3xl font-bold text-white">{stats.wishlist}</p>
                  <p className="text-gray-400 text-sm">In Wishlist</p>
                </div>
              </div>
            </div>
            <div className="bg-gray-900 rounded-xl p-6">
              <div className="flex items-center gap-4">
                <div className="bg-blue-500/20 p-3 rounded-lg">
                  <Star className="w-6 h-6 text-blue-500" />
                </div>
                <div>
                  <p className="text-3xl font-bold text-white">{stats.ratings}</p>
                  <p className="text-gray-400 text-sm">Ratings Given</p>
                </div>
              </div>
            </div>
            <div className="bg-gray-900 rounded-xl p-6">
              <div className="flex items-center gap-4">
                <div className="bg-green-500/20 p-3 rounded-lg">
                  <Clock className="w-6 h-6 text-green-500" />
                </div>
                <div>
                  <p className="text-3xl font-bold text-white">{stats.watched * 2}h</p>
                  <p className="text-gray-400 text-sm">Watch Time (est.)</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <div className="bg-gray-900 rounded-xl p-6">
              <h2 className="text-xl font-bold text-white mb-6">Monthly Activity</h2>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={stats.activity}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="month" stroke="#9CA3AF" />
                    <YAxis stroke="#9CA3AF" />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '8px' }}
                      labelStyle={{ color: '#F3F4F6' }}
                    />
                    <Line
                      type="monotone"
                      dataKey="movies"
                      stroke="#F5C518"
                      strokeWidth={3}
                      dot={{ fill: '#F5C518', strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-gray-900 rounded-xl p-6">
              <h2 className="text-xl font-bold text-white mb-6">Genre Distribution</h2>
              <div className="h-64">
                {stats.genres.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={stats.genres}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {stats.genres.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '8px' }}
                        labelStyle={{ color: '#F3F4F6' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-500">
                    Watch more movies to see genre distribution
                  </div>
                )}
              </div>
              <div className="flex flex-wrap gap-4 mt-4 justify-center">
                {stats.genres.map((genre, index) => (
                  <div key={genre.name} className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <span className="text-gray-400 text-sm">{genre.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-gray-900 rounded-xl p-6">
            <h2 className="text-xl font-bold text-white mb-6">Recent Activity</h2>
            <div className="space-y-4">
              {user?.watched.slice(-5).reverse().map((movieId, index) => {
                const movie = getMovieById(movieId);
                return movie ? (
                  <div key={movieId} className="flex items-center gap-4 p-4 bg-gray-800 rounded-lg">
                    <img
                      src={movie.poster_path ? `${TMDB_IMAGE_BASE}/w92${movie.poster_path}` : 'https://picsum.photos/92/138'}
                      alt={movie.title}
                      className="w-12 h-18 object-cover rounded"
                    />
                    <div className="flex-1">
                      <p className="text-white font-semibold">{movie.title}</p>
                      <p className="text-gray-400 text-sm">Marked as watched</p>
                    </div>
                    <div className="text-gray-500 text-sm">
                      {index === 0 ? 'Today' : `${index + 1} days ago`}
                    </div>
                  </div>
                ) : null;
              })}
              {(!user?.watched.length) && (
                <p className="text-center text-gray-500 py-8">No recent activity</p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderContent = () => {
    if (currentView === 'auth' || currentView === 'reset-password') {
      return renderAuthForm();
    }

    switch (currentView) {
      case 'home':
        return renderHome();
      case 'discover':
        return renderDiscover();
      case 'watchlist':
        return renderWatchlist();
      case 'watched':
        return renderWatched();
      case 'dashboard':
        return renderDashboard();
      default:
        return renderHome();
    }
  };

  return (
    <div className="min-h-screen bg-[#121212]">
      {renderContent()}
      
      {toast && (
        <div className={`fixed bottom-4 right-4 px-6 py-3 rounded-lg shadow-lg flex items-center gap-3 z-50 ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'} text-white`}>
          {toast.type === 'success' ? <Check className="w-5 h-5" /> : <X className="w-5 h-5" />}
          {toast.message}
        </div>
      )}
    </div>
  );
}