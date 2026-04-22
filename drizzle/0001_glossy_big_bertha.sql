CREATE TABLE "auth_codes" (
	"code" varchar(100) PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"client_id" varchar(100) NOT NULL,
	"expires_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "clients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" varchar(100) NOT NULL,
	"client_secret" varchar(100) NOT NULL,
	"name" varchar(100),
	"redirect_uri" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "clients_client_id_unique" UNIQUE("client_id")
);
