import {
  uuid,
  text,
  timestamp,
  boolean,
  pgTable,
  varchar,
} from "drizzle-orm/pg-core";


export const usersTable = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),

  firstName: varchar("first_name", {length: 25}),
  lastName: varchar("last_name", {length: 25}),

  profileImage: text("profile_Image"),

  email: varchar("email", {length: 322}).notNull(),
  emailVerified: boolean("email_verified").default(false).notNull(),

  password: varchar("password" , {length : 66}),
  salt: text("salt"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").$onUpdate(() => new Date()),
});

export const clientsTable = pgTable("clients", {
  id: uuid("id").primaryKey().defaultRandom(),

  clientId: varchar("client_id", { length: 100 }).notNull().unique(),
  clientSecret: varchar("client_secret", { length: 100 }).notNull(),

  name: varchar("name", { length: 100 }),
  applicationURL: text("application_url").notNull().unique(),
  redirectUri: text("redirect_uri").notNull().unique(),

  createdAt: timestamp("created_at").defaultNow().notNull(),
});


export const authCodesTable = pgTable("auth_codes", {
  code: varchar("code", { length: 100 }).primaryKey(),

  userId: uuid("user_id").notNull(),
  clientId: varchar("client_id", { length: 100 }).notNull(),

  expiresAt: timestamp("expires_at").notNull(),
});