import express from "express";
import type { Express } from "express";
import jose from "node-jose";
import { PRIVATE_KEY, PUBLIC_KEY } from "./common/utils/cert";
import path from "node:path";
import db from "./db";
import { authCodesTable, clientsTable, usersTable } from "./db/schema";
import { eq } from "drizzle-orm";
import crypto from "node:crypto";
import { JWTClaims } from "./common/utils/user-token";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

export function createApp(): Express {
  const app = express();
  app.use(express.json());
  app.use(express.static("public"));

  const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

  app.get("/health-route", (_, res) => {
    res.json({ message: "Server running" });
  });

  app.get("/callback", (req, res) => {
  res.sendFile(path.resolve("public", "callback.html"));
});

  app.get("/.well-known/openid-configuration", (_, res) => {
    const ISSUER = `http://localhost:${PORT}`;
    res.json({
      issuer: ISSUER,
      authorization_endpoint: `${ISSUER}/o/authenticate`,
      userinfo_endpoint: `${ISSUER}/o/userinfo`,
      jwks_uri: `${ISSUER}/.well-known/jwks.json`,
    });
  });

  app.get("/.well-known/jwks.json", async (_, res) => {
    const key = await jose.JWK.asKey(PUBLIC_KEY, "pem");
    res.json({ keys: [key.toJSON()] });
  });

  app.get("/o/authenticate", (_, res) => {
    res.sendFile(path.resolve("public", "authenticate.html"));
  });

  app.post("/auth/login", async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Invalid input" });
    }

    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, email))
      .limit(1);

    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    const hash = crypto
      .createHash("sha256")
      .update(password + user.salt)
      .digest("hex");

    if (hash !== user.password) {
      return res.status(401).json({ message: "Wrong password" });
    }

    const token = jwt.sign(
      { sub: user.id, email: user.email },
      PRIVATE_KEY,
      { algorithm: "RS256", expiresIn: "1h" }
    );

    return res.json({ token });
  });

  app.get("/o/authenticate/login", async (req, res) => {
    const { email, password, client_id, redirect_uri, state } = req.query;

    if (!email || !password || !client_id || !redirect_uri || !state) {
      return res.status(400).send("Invalid input");
    }



    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, email as string))
      .limit(1);

    if (!user) return res.status(401).send("User not found");
    
    const hash = crypto
      .createHash("sha256")
      .update(password + user.salt!)
      .digest("hex");

    if (hash !== user.password) {
      return res.status(401).send("Wrong password");
    }

    const code = crypto.randomBytes(20).toString("hex");

    await db.insert(authCodesTable).values({
      code,
      userId: user.id,
      clientId: client_id as string,
      expiresAt: new Date(Date.now() + 60 * 1000),
    });

    const url =
      `${redirect_uri}?code=${code}` +
      (state ? `&state=${state}` : "");

    return res.redirect(url);
  });

  app.post("/o/authenticate/register", async (req, res) => {
    const { firstName, lastName, email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Invalid input" });
    }

    const [existing] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, email))
      .limit(1);

    if (existing) {
      return res.status(400).json({ message: "User already exists" });
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

    res.json({ message: "User created" });
  });

  app.get("/o/userinfo", async (req, res) => {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Missing token" });
    }

    const token = authHeader.split(" ")[1];

    if(!token){
      return res.status(404).json({error : {message : "Token not found"}})
    }
    let claims: JWTClaims;

    try {
      const decoded = jwt.verify(token, PUBLIC_KEY, {
        algorithms: ["RS256"],
      });

      if (typeof decoded !== "object" || decoded === null) {
        throw new Error();
      }

      claims = decoded as JWTClaims;
    } catch {
      return res.status(401).json({ message: "Invalid token" });
    }

    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, claims.sub))
      .limit(1);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      sub: user.id,
      email: user.email,
      email_verified: user.emailVerified,
      given_name: user.firstName,
      family_name: user.lastName,
      name: [user.firstName, user.lastName].join(" "),
      picture: user.profileImage,
    });
  });

  app.post("/o/token", async (req, res) => {
    const { code, client_id, client_secret } = req.body;


  
    
    if (!code || !client_id || !client_secret) {
      return res.status(400).json({ message: "Invalid request" });
    }

    const [client] = await db
      .select()
      .from(clientsTable)
      .where(eq(clientsTable.clientId, client_id))
      .limit(1);

    if (!client) {
      return res.status(401).json({ message: "Invalid client" });
    }

    const isValid = await bcrypt.compare(client_secret, client.clientSecret);
    if (!isValid) {
      return res.status(401).json({ message: "Invalid secret" });
    }

    const [authCode] = await db
      .select()
      .from(authCodesTable)
      .where(eq(authCodesTable.code, code))
      .limit(1);

    if (!authCode) {
      return res.status(400).json({ message: "Invalid code" });
    }

    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, authCode.userId))
      .limit(1);

    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    const token = jwt.sign(
      { sub: user.id, email: user.email },
      PRIVATE_KEY,
      { algorithm: "RS256", expiresIn: "1h" }
    );

    return res.json({
      access_token: token,
      token_type: "Bearer",
    });
  });

  app.post("/register-client", async (req, res) => {
    const { name, redirectUri, appUrl } = req.body;

    if (!name || !redirectUri || !appUrl) {
      return res.status(400).json({ message: "Invalid input" });
    }

    const clientId = crypto.randomBytes(16).toString("hex");
    const rawSecret = crypto.randomBytes(32).toString("hex");

    const hashedSecret = await bcrypt.hash(rawSecret, 10);

    await db.insert(clientsTable).values({
      name,
      clientId,
      clientSecret: hashedSecret,
      applicationURL: appUrl,
      redirectUri,
    });

    return res.status(201).json({
      clientId,
      clientSecret: rawSecret,
    });
  });

  app.get("/o/client-info", async (req, res) => {
    const client_id = req.query.client_id;

    if (typeof client_id !== "string") {
      return res.status(400).json({ message: "Unauthorized service" });
    }

    const [client] = await db
      .select()
      .from(clientsTable)
      .where(eq(clientsTable.clientId, client_id))
      .limit(1);

    if (!client) {
      return res.status(404).json({ message: "Client not found" });
    }

    return res.status(200).json({ name: client.name });
  });

  return app;
}
