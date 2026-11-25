CREATE TABLE "scoreboards" (
	"match_date" text PRIMARY KEY NOT NULL,
	"instance" uuid DEFAULT gen_random_uuid() NOT NULL,
	"revision" integer DEFAULT 0 NOT NULL,
	"mode" text DEFAULT 'auto' NOT NULL,
	"manual" jsonb DEFAULT '{"home":0,"away":0,"status":"Scheduled","minute":null}'::jsonb NOT NULL,
	"live" jsonb,
	"fixture_id" text,
	"checked_at" timestamp with time zone,
	"finished" boolean DEFAULT false NOT NULL,
	"next_check_at" timestamp with time zone DEFAULT now() NOT NULL,
	"error" text,
	"remaining" integer,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
