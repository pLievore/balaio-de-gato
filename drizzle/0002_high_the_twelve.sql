CREATE TABLE "rate_limit_counters" (
	"scope" varchar(40) NOT NULL,
	"bucket" char(64) NOT NULL,
	"window_start" timestamp with time zone NOT NULL,
	"hits" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "rate_limit_counters_scope_bucket_window_start_pk" PRIMARY KEY("scope","bucket","window_start"),
	CONSTRAINT "rate_limit_counters_hits_chk" CHECK ("rate_limit_counters"."hits" >= 0),
	CONSTRAINT "rate_limit_counters_bucket_chk" CHECK ("rate_limit_counters"."bucket" ~ '^[0-9a-f]{64}$')
);
--> statement-breakpoint
CREATE INDEX "rate_limit_counters_window_idx" ON "rate_limit_counters" USING btree ("window_start");