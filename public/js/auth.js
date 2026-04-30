const BASE_URL = "https://sso-production-d29b.up.railway.app";


export async function isAuthenticated() {
  try {
    const res = await fetch(`${BASE_URL}/me`, { credentials: "include" });
    return res.ok;
  } catch {
    return false;
  }
}

export async function protectPage() {
  const isAuth = await isAuthenticated();
  if (!isAuth) {
    window.location.href = "/authenticate.html";
  }
}

export async function redirectIfLoggedIn() {
  const isAuth = await isAuthenticated();
  if (isAuth) {
    window.location.href = "/";
  }
}