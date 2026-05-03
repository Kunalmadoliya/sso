# 🚀 Kunal Auth — OAuth 2.0 + OpenID Connect Server

A simple authentication server built from scratch to understand how login systems really work.

---

## ✨ Overview

Kunal Auth is a custom OAuth 2.0 + OpenID Connect (OIDC) server.

It shows how real authentication works behind the scenes:

- login
- consent
- tokens
- redirects

No third-party auth used — everything is built manually.

---

## 🎯 Why I Built This

I wanted to truly understand authentication by building it myself.

Things I explored:

- How login state works across redirects
- How authorization codes are used
- What happens between `/authorize → /token → /userinfo`
- How multiple users and requests are handled

---

## ⚙️ Features

### 🔐 Authentication

- Authorization Code Flow
- Secure login with hashed passwords
- Cookie-based sessions

### 🛡️ Security

- PKCE support
- State & nonce validation
- HTTP-only cookies
- JWT tokens

### 🎟️ Tokens

- ID Token (user info)
- Access Token (API access)
- Refresh Token (session renewal)

### 🔎 OIDC Support

- `/.well-known/openid-configuration`
- `/userinfo` endpoint

### 👤 User Features

- View connected apps
- Revoke access
- Basic profile support

### 🧩 Client Features

- Register apps
- Consent screen
- Multiple clients support

---

## 🔄 Authentication Flow

```
1. Client registers → gets client_id
2. User redirected → /authorize
3. User logs in
4. Consent screen shown
5. Server gives authorization code
6. Client exchanges code → /token
7. Gets tokens:
   - ID Token
   - Access Token
   - Refresh Token
8. Client calls → /userinfo
```

---

## 🏗️ Tech Stack

- Backend: Node.js + Express
- Database: PostgreSQL (Drizzle ORM)
- Auth: JWT (RS256 / HS256)
- Frontend: HTML + TailwindCSS

---

## 🧠 What I Learned

- OAuth is for access, OIDC adds identity
- Redirect systems need proper state handling
- PKCE is important for security
- Tokens and sessions must work together
- Security is about flow, not just JWT

---

## ⚠️ Limitations

- Sessions stored in database (not Redis)
- No rate limiting
- No key rotation
- Basic security setup

---

## 🔮 Future Plans

- Redis for sessions
- Key rotation (JWKS)
- Rate limiting
- Admin dashboard
- Social login

---

## 🧪 Demo

Includes a demo client app:

- Runs full OAuth flow
- Exchanges tokens
- Shows user data

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
```

---

## 🚀 Setup

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

## 👨‍💻 Author

Kunal Madoliya  
B.Tech IT — Backend & Systems

---

## ⭐ Support

If you found this helpful, give it a star ⭐
