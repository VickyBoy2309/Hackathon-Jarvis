const API_BASE_URL = "http://localhost:5000/api";

function getToken() {
  return localStorage.getItem("movie_maniac_token");
}

function setToken(token) {
  localStorage.setItem("movie_maniac_token", token);
}

function clearToken() {
  localStorage.removeItem("movie_maniac_token");
}

async function apiRequest(path, options = {}) {
  const token = getToken();
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || "Something went wrong");
  }

  return data;
}

window.MovieManiacAPI = {
  getToken,
  setToken,
  clearToken,
  apiRequest,
};