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
    const current = window.location.href;
    window.location.href = `/authenticate.html?redirect=${encodeURIComponent(current)}`;
  }
}
export async function redirectIfLoggedIn() {
  const isAuth = await isAuthenticated();

  if (isAuth) {
    const params = new URLSearchParams(window.location.search);
    const redirect = params.get("redirect");

    // 🔥 OAuth user
    if (redirect && redirect.startsWith("http")) {
      window.location.href = redirect;
      return;
    }

    // ✅ Internal user
    window.location.href = "/";
  }
}