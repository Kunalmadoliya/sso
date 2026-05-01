import crypto from "node:crypto";
import express, {application} from "express";
import path from "node:path";
import {eq, and} from "drizzle-orm";
import JWT from "jsonwebtoken";
import jose from "node-jose";
import {
  authCodesTable,
  clientsTable,
  usersTable,
  consentsTable,
} from "./db/schema.js";
import {PRIVATE_KEY, PUBLIC_KEY} from "./common/utils/cert.js";
import type {JWTClaims} from "./common/utils/user-token.js";
import db from "./db/index.js";
import cors from "cors";
import cookieParser from "cookie-parser";

/* ================== ✅ GLOBAL TYPES + HELPER ================== */

type OAuthQuery = {
  client_id?: string;
  redirect_uri?: string;
  response_type?: string;
  state?: string;
};

const q = (v: unknown): string | undefined =>
  typeof v === "string" ? v : undefined;

/* ================== APP ================== */

export function createApp() {
  const app = express();
  app.use(express.json());
  const PORT = process.env.PORT ?? 3000;

  app.use(
    cors({
      origin: "https://kunal-auth.vercel.app",
      credentials: true,
      methods: ["GET", "POST", "OPTIONS"],
      allowedHeaders: ["Content-Type"],
    }),
  );

  app.use(cookieParser());

  app.use(express.static(path.resolve("public")));

  app.get("/", (req, res) => res.json({message: "Hello from Auth Server"}));

  app.get("/health", (req, res) =>
    res.json({message: "Server is healthy", healthy: true}),
  );

  app.get("/.well-known/openid-configuration", (req, res) => {
    const ISSUER = process.env.BASE_URL;

    return res.json({
      issuer: ISSUER,
      authorization_endpoint: `${ISSUER}/oauth/authorize`,
      userinfo_endpoint: `${ISSUER}/o/userinfo`,
      jwks_uri: `${ISSUER}/.well-known/jwks.json`,
    });
  });

  app.get("/.well-known/jwks.json", async (_, res) => {
    const key = await jose.JWK.asKey(PUBLIC_KEY, "pem");
    return res.json({keys: [key.toJSON()]});
  });

  app.get("/o/authenticate", (req, res) => {
    return res.sendFile(path.resolve("public", "authenticate.html"));
  });

  app.post("/o/authenticate/sign-in", async (req, res) => {
    const {email, password, client_id, redirect} = req.body;

    console.log("Sign-in attempt:", {email, client_id, redirect});

    // =========================
    // 🔐 AUTH CHECK
    // =========================
    if (!email || !password) {
      return res
        .status(400)
        .json({message: "Email and password are required."});
    }

    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, email))
      .limit(1);

    if (!user || !user.password || !user.salt) {
      return res.status(401).json({message: "Invalid email or password."});
    }

    const hash = crypto
      .createHash("sha256")
      .update(password + user.salt)
      .digest("hex");

    if (hash !== user.password) {
      return res.status(401).json({message: "Invalid email or password."});
    }

    // =========================
    // 🎟 TOKEN
    // =========================
    const accessToken = JWT.sign(
      {
        sub: user.id,
        email: user.email,
      },
      PRIVATE_KEY,
      {algorithm: "RS256"},
    );

    // ✅ FIX: Set cookie properly
    res.cookie("accessToken", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production", // ✅ Only secure in production
      sameSite: "lax", // ✅ Changed from "none" to "lax"
      path: "/",
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    });

    console.log("Cookie set. Redirect:", redirect);

    // =========================
    // 🔥 FLOW HANDLING - Return JSON instead of redirect
    // =========================

    // ✅ OAuth / external app - return JSON with redirect URL
    if (client_id && redirect && redirect.startsWith("http")) {
      return res.status(200).json({
        ok: true,
        redirect: redirect, // ✅ Frontend handles redirect
      });
    }

    // ✅ Internal dashboard
    return res.status(200).json({
      ok: true,
      redirect: "/", // ✅ Frontend handles redirect
    });
  });

  app.post("/o/authenticate/sign-up", async (req, res) => {
    const {firstName, lastName, email, password} = req.body;

    if (!email || !password || !firstName) {
      res
        .status(400)
        .json({message: "First name, email, and password are required."});
      return;
    }

    const [existing] = await db
      .select({id: usersTable.id})
      .from(usersTable)
      .where(eq(usersTable.email, email))
      .limit(1);

    if (existing) {
      res
        .status(409)
        .json({message: "An account with this email already exists."});
      return;
    }

    const salt = crypto.randomBytes(16).toString("hex");
    const hash = crypto
      .createHash("sha256")
      .update(password + salt)
      .digest("hex");

    await db.insert(usersTable).values({
      firstName,
      lastName: lastName ?? null,
      email,
      password: hash,
      salt,
    });

    res.status(201).json({ok: true});
  });

  app.get("/o/userinfo", async (req, res) => {
    const authHeader = req.headers.cookie;

    if (!authHeader?.startsWith("accessToken")) {
      return res.status(401).json({error: {message: "Not authenticated"}});
    }
    const token = authHeader.split("=")[1];

    if (!token) {
      return res.status(401).json({error: {message: "Not authenticated"}});
    }

    let claims: JWTClaims;
    try {
      claims = JWT.verify(token, PUBLIC_KEY, {
        algorithms: ["RS256"],
      }) as JWTClaims;
    } catch {
      res.status(401).json({message: "Invalid or expired token."});
      return;
    }

    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, claims.sub))
      .limit(1);

    if (!user) {
      res.status(404).json({message: "User not found."});
      return;
    }

    res.json({
      sub: user.id,
      email: user.email,
      email_verified: user.emailVerified,
      given_name: user.firstName,
      family_name: user.lastName,
      name: [user.firstName, user.lastName].filter(Boolean).join(" "),
      picture: user.profileImage,
    });
  });

  app.get("/client-info", async (req, res) => {});

  app.get("/me", async (req, res) => {
    const token = req.cookies?.accessToken;

    if (!token) {
      return res.status(401).json({isAuth: false});
    }

    try {
      JWT.verify(token, PUBLIC_KEY);
      return res.json({isAuth: true});
    } catch {
      return res.status(401).json({isAuth: false});
    }
  });

  app.post("/logout", async (req, res) => {
    res.clearCookie("accessToken");
    return res.status(200).json({message: "Successfully logout"});
  });

  app.post("/register-company", async (req, res) => {
    const {name, applicationURL, redirectUri} = req.body;

    if (!name || !applicationURL || !redirectUri) {
      return res.status(401).json({error: {message: "Enter all feilds"}});
    }

    const token = req.cookies?.accessToken;
    if (!token) return res.status(401).json({error: "Not logged in"});

    const decoded = JWT.verify(token, PRIVATE_KEY) as {
      sub: string;
    };

    const [existingCompany] = await db
      .select()
      .from(clientsTable)
      .where(
        and(
          eq(clientsTable.applicationURL, applicationURL),
          eq(clientsTable.redirectUri, redirectUri),
        ),
      )
      .limit(1);

    if (existingCompany) {
      return res.status(409).json({error: {message: "App already registerd"}});
    }

    const client_id = crypto.randomBytes(16).toString("hex");
    const client_secret = crypto.randomBytes(32).toString("hex");

    await db.insert(clientsTable).values({
      clientId: client_id,
      clientSecret: client_secret,
      name: name,
      userId: decoded.sub,
      applicationURL: applicationURL,
      redirectUri: redirectUri,
    });

    res.status(200).json({client_id, client_secret});
  });

  app.get("/oauth/authorize", async (req, res) => {
    const client_id = q(req.query.client_id);
    const redirect_uri = q(req.query.redirect_uri);
    const response_type = q(req.query.response_type);
    const state = q(req.query.state);

    if (!client_id || !redirect_uri || response_type !== "code") {
      return res.status(400).json({error: "Invalid request"});
    }

    const [client] = await db
      .select()
      .from(clientsTable)
      .where(eq(clientsTable.clientId, client_id));

    if (!client || client.redirectUri !== redirect_uri) {
      return res.status(400).json({error: "Invalid client"});
    }

    const token = req.cookies?.accessToken;

    if (!token) {
      const redirect = `/oauth/authorize?client_id=${client_id}&redirect_uri=${encodeURIComponent(
        redirect_uri,
      )}&response_type=code${state ? `&state=${state}` : ""}`;

      return res.redirect(
        `/o/authenticate?redirect=${encodeURIComponent(redirect)}`,
      );
    }

    const decoded = JWT.verify(token, PUBLIC_KEY) as {sub: string};

    const [consent] = await db
      .select()
      .from(consentsTable)
      .where(
        and(
          eq(consentsTable.userId, decoded.sub),
          eq(consentsTable.clientId, client_id),
        ),
      );

    if (consent?.isVerified) {
      const code = crypto.randomBytes(16).toString("hex");

      await db.insert(authCodesTable).values({
        code,
        clientId: client_id,
        userId: decoded.sub,
        redirectUri: redirect_uri,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      });

      const url = new URL(redirect_uri);
      url.searchParams.set("code", code);
      if (state) url.searchParams.set("state", state);

      return res.redirect(url.toString());
    }

    return res.redirect(
      `/consent?client_id=${client_id}&redirect_uri=${redirect_uri}&state=${state}`,
    );
  });

  app.post("/oauth/consent", async (req, res) => {
    const {client_id, redirect_uri, state} = req.body;

    const token = req.cookies?.accessToken;
    if (!token) return res.status(401).json({error: "Not logged in"});

    const decoded = JWT.verify(token, PUBLIC_KEY) as {sub: string};

    // ✅ SAVE CONSENT
    await db
      .insert(consentsTable)
      .values({
        userId: decoded.sub,
        clientId: client_id,
        isVerified: true,
      })
      .onConflictDoNothing();

    const code = crypto.randomBytes(16).toString("hex");

    await db.insert(authCodesTable).values({
      code,
      clientId: client_id,
      userId: decoded.sub,
      redirectUri: redirect_uri,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    });

    const url = new URL(redirect_uri);
    url.searchParams.set("code", code);
    if (state) url.searchParams.set("state", state);

    res.json({redirect: url.toString()});
  });

  app.post("/token", async (req, res) => {
    const {code, client_id, client_secret, redirect_uri} = req.body;

    if (!code || !client_id || !client_secret || !redirect_uri) {
      return res.status(400).json({error: "Missing fields"});
    }

    const [client] = await db
      .select()
      .from(clientsTable)
      .where(eq(clientsTable.clientId, client_id))
      .limit(1);

    if (!client || client.clientSecret !== client_secret) {
      return res.status(401).json({error: "Invalid client"});
    }

    const [authCode] = await db
      .select()
      .from(authCodesTable)
      .where(eq(authCodesTable.code, code))
      .limit(1);

    if (!authCode || authCode.consumed) {
      return res.status(400).json({error: "Invalid code"});
    }

    await db
      .update(authCodesTable)
      .set({consumed: true})
      .where(eq(authCodesTable.code, code));

    if (authCode.redirectUri !== redirect_uri) {
      return res.status(400).json({error: "redirect_uri mismatch"});
    }

    if (new Date() > authCode.expiresAt) {
      return res.status(400).json({error: "Code expired"});
    }

    const access_token = crypto.randomBytes(32).toString("hex");

    const id_token = JWT.sign(
      {
        sub: authCode.userId,
        iss: "https://sso-production-d29b.up.railway.app",
        aud: client_id,
      },
      PRIVATE_KEY,
      {algorithm: "RS256", expiresIn: "1h"},
    );

    res.json({
      access_token,
      id_token,
      token_type: "Bearer",
      expires_in: 3600,
    });
  });

  app.get("/consent", (req, res) => {
    return res.sendFile(path.resolve("public", "consent.html"));
  });

  app.get("/getall-apps", async (req, res) => {
    const authHeader = req.headers.cookie;

    if (!authHeader?.startsWith("accessToken")) {
      return res.status(401).json({error: {message: "Not authenticated"}});
    }
    const token = authHeader.split("=")[1];

    if (!token) {
      return res.status(401).json({error: {message: "Not authenticated"}});
    }

    let claims: JWTClaims;
    try {
      claims = JWT.verify(token, PUBLIC_KEY, {
        algorithms: ["RS256"],
      }) as JWTClaims;
    } catch {
      res.status(401).json({message: "Invalid or expired token."});
      return;
    }

    const results = await db
      .select({
        userId: usersTable.id,
        email: usersTable.email,
        firstName: usersTable.firstName,
        lastName: usersTable.lastName,

        clientId: clientsTable.clientId,
        appName: clientsTable.name,
        redirectUri: clientsTable.redirectUri,
        applicationURL: clientsTable.applicationURL,
      })
      .from(usersTable)
      .leftJoin(clientsTable, eq(usersTable.id, clientsTable.userId))
      .where(eq(usersTable.id, claims.sub));

    if (!results) {
      return res.status(401).json({error: {message: "User not found"}});
    }

    res.status(200).json({results});
  });
  return app;
}
