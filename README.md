# 🚀 Kunal Auth — OAuth 2.0 + OpenID Connect Server

> A fully functional authentication server built from scratch to deeply understand how modern identity systems actually work.

---

## ✨ Overview

**Kunal Auth** is a custom-built **OAuth 2.0 + OpenID Connect (OIDC)** server designed to replicate real-world authentication flows — not just in theory, but in actual working code.

Instead of relying on third-party providers, this project implements the **entire auth lifecycle**:

* 🔐 Login & Sessions
* 🧾 Consent Screens
* 🔑 Authorization Codes
* 🎫 Access Tokens & ID Tokens
* 🔁 Refresh Tokens
* 🔄 Redirect-based flows

---

## 🎯 Why I Built This

I wanted to go beyond tutorials and **truly understand authentication systems** by building one from scratch.

Questions I explored:

* How does state persist across redirects?
* Where do PKCE and nonce fit in real flows?
* How do multiple auth requests work simultaneously?
* What actually happens between `/authorize` → `/token` → `/userinfo`?

This project is the answer.

---

## ⚙️ Features

### 🔐 Core Authentication

* Authorization Code Flow (OIDC-first)
* Secure login with hashed passwords + salt
* Session management

### 🛡️ Security

* PKCE (Proof Key for Code Exchange)
* State & Nonce validation
* HTTP-only cookies
* JWT-based authentication

### 🎟️ Token System

* ID Tokens (identity layer)
* Access Tokens (API access)
* Refresh Tokens (session renewal)

### 🔎 OIDC Support

* `/.well-known/openid-configuration`
* `/userinfo` endpoint

### 👤 User Control

* View authorized apps
* Revoke access anytime
* Manage profile

### 🧩 Client Features

* App registration system
* Consent-based access control
* Multi-client support

---

## 🔄 Authentication Flow

```text
1. Client registers → gets client_id
2. Redirect user → /authorization
3. User logs in (if needed)
4. Consent screen shown (if needed)
5. Server issues authorization code
6. Client exchanges code → /token
7. Receives:
   - ID Token
   - Access Token
   - Refresh Token
8. Client calls → /userinfo
```

---

## 🏗️ Architecture

* **Backend:** Node.js + Express
* **Database:** PostgreSQL (Drizzle ORM)
* **Auth:** JWT (RS256 + HS256)
* **Sessions:** Stored server-side
* **Frontend:** HTML + TailwindCSS

---

## 🧠 Key Learnings

* OAuth ≠ Authentication → OIDC adds identity layer
* Redirect-based systems are state-heavy
* PKCE is critical for public clients
* Sessions + tokens must work together
* Security ≠ just JWT → it’s flow design

---

## ⚠️ Limitations

* Sessions stored in Postgres (not Redis)
* No rate limiting / abuse protection
* Static signing keys (no rotation)
* Client registration is open
* Secrets stored in `.env`

---

## 🔮 Future Improvements

* Redis-based session store ⚡
* JWKS key rotation 🔑
* Rate limiting & security hardening 🛡️
* Admin dashboard 📊
* Social login providers 🌐

---

## 🧪 Demo

Includes a **demo client application** that:

* Runs full OAuth + OIDC flow
* Displays user profile data
* Handles token exchange

---

## 📂 Project Structure

```
/backend
  /src
    /routes
    /db
    /auth
/public
  index.html
  authenticate.html
  signup.html
  client-page.html
  /js
    auth.js
```

---

## 🚀 Getting Started

```bash
git clone https://github.com/your-username/kunal-auth
cd kunal-auth
npm install
npm run dev
```

Create `.env`:

```
PORT=3000
JWT_SECRET=your_secret
```

---

## ❤️ Motivation

> “I wanted to learn the system by building the system.”

This project is not just code — it’s a deep dive into how identity powers the modern web.

---

## 👨‍💻 Author

**Kunal Madoliya**
B.Tech IT | Backend & System Design Enthusiast

---

## ⭐ If you found this useful

Give it a star ⭐ and share your feedback!
