CREATE TABLE "funnel_counters" (
	"day" date NOT NULL,
	"metric" varchar(16) NOT NULL,
	"key" varchar(140) NOT NULL,
	"total" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "funnel_counters_day_metric_key_pk" PRIMARY KEY("day","metric","key"),
	CONSTRAINT "funnel_counters_total_chk" CHECK ("funnel_counters"."total" >= 0),
	CONSTRAINT "funnel_counters_metric_chk" CHECK ("funnel_counters"."metric" in ('step', 'source', 'location', 'product'))
);
--> statement-breakpoint
CREATE INDEX "funnel_counters_metric_day_idx" ON "funnel_counters" USING btree ("metric","day");