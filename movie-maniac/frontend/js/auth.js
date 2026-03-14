const { apiRequest, setToken, clearToken, getToken } = window.MovieManiacAPI;

const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");
const forgotForm = document.getElementById("forgotForm");
const resetForm = document.getElementById("resetForm");
const logoutBtn = document.getElementById("logoutBtn");

if (loginForm) {
  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    try {
      const data = await apiRequest("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      setToken(data.token);
      window.location.href = "./dashboard.html";
    } catch (error) {
      alert(error.message);
    }
  });
}

if (registerForm) {
  registerForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const name = document.getElementById("name").value;
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    try {
      const data = await apiRequest("/auth/register", {
        method: "POST",
        body: JSON.stringify({ name, email, password }),
      });
      setToken(data.token);
      window.location.href = "./dashboard.html";
    } catch (error) {
      alert(error.message);
    }
  });
}

if (forgotForm) {
  forgotForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const email = document.getElementById("email").value;

    try {
      await apiRequest("/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      alert("Password reset email sent.");
    } catch (error) {
      alert(error.message);
    }
  });
}

if (resetForm) {
  resetForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const password = document.getElementById("password").value;
    const token = new URLSearchParams(window.location.search).get("token");

    try {
      await apiRequest(`/auth/reset-password/${token}`, {
        method: "POST",
        body: JSON.stringify({ password }),
      });
      alert("Password updated successfully.");
      window.location.href = "./login.html";
    } catch (error) {
      alert(error.message);
    }
  });
}

if (logoutBtn) {
  logoutBtn.addEventListener("click", () => {
    clearToken();
    window.location.href = "./login.html";
  });
}

if (window.location.pathname.includes("dashboard") && !getToken()) {
  window.location.href = "./login.html";
}