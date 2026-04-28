/* 
    Unfortunately in current drizzle-kit version we can't automatically get name for primary key.
    We are working on making it available!

    Meanwhile you can:
        1. Check pk name in your database, by running
            SELECT constraint_name FROM information_schema.table_constraints
            WHERE table_schema = 'public'
                AND table_name = 'auth_codes'
                AND constraint_type = 'PRIMARY KEY';
        2. Uncomment code below and paste pk name manually
        
    Hope to release this update as soon as possible
*/

-- ALTER TABLE "auth_codes" DROP CONSTRAINT "<constraint_name>";--> statement-breakpoint
ALTER TABLE "auth_codes" ADD COLUMN "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL;--> statement-breakpoint
ALTER TABLE "auth_codes" ADD COLUMN "redirect_uri" varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE "auth_codes" ADD COLUMN "consumed" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "auth_codes" ADD CONSTRAINT "auth_codes_code_unique" UNIQUE("code");