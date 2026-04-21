import express from "express";
import type {Express} from "express";
import jose from "node-jose";
import {PRIVATE_KEY, PUBLIC_KEY} from "./common/utils/cert";
import path from "node:path";
import db from "./db";
import {usersTable} from "./db/schema";
import {eq} from "drizzle-orm";
import crypto from "node:crypto";
import {JWTClaims} from "./common/utils/user-token";
import jwt from "jsonwebtoken";

export function createApp(): Express {
  const app = express();
  app.use(express.json());

  const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

  app.get("/health-route", (req, res) => {
    return res.status(200).json({message: "Server is running", healthy: true});
  });

  app.get("/.well-known/openid-configuration", (req, res) => {
    const ISSUER = `http://localhost:${PORT}`;
    return res.json({
      issuer: ISSUER,
      authorization_endpoint: `${ISSUER}/o/authenticate`,
      userinfo_endpoint: `${ISSUER}/o/userinfo`,
      jwks_uri: `${ISSUER}/.well-known/jwks.json`,
    });
  });

  app.get("/.well-known/jwks.json", async (req, res) => {
    const key = await jose.JWK.asKey(PUBLIC_KEY, "pem");
    return res.json({keys: [key.toJSON()]});
  });

  app.get("/o/authenticate", async (req, res) => {
    return res.sendFile(path.resolve("public", "authenticate.html"));
  });

  app.post("/o/authenticate/sign-in", async (req, res) => {
    const {email, password} = req.body;

    if (!email || !password) {
      return res.status(400).json({eroor: {message: "Not a valid user"}});
    }

    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, email))
      .limit(1);

    if (!user) {
      return res.status(401).json({error: {message: "User already exist"}});
    }

    const hash = crypto
      .createHash("sha256")
      .update(password + user.salt)
      .digest("hex");

    const ISSUER = `http://localhost:${PORT}`;
    const now = Math.floor(Date.now() / 1000);

    const claims: JWTClaims = {
      iss: ISSUER,
      sub: user.id,
      email: user.email,
      email_verified: String(user.emailVerified),
      exp: now + 3600,
      given_name: user.firstName ?? "",
      family_name: user.lastName ?? undefined,
      name: [user.firstName, user.lastName].filter(Boolean).join(" "),
      picture: user.profileImage ?? undefined,
    };

    const token = jwt.sign(claims, PRIVATE_KEY, {algorithm: "RS256"});

    res.json({token});
  });

  return app;
}
