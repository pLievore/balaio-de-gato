CREATE TYPE "public"."admin_role" AS ENUM('admin', 'catalog_manager', 'order_operator', 'support');--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('draft', 'awaiting_payment_link', 'payment_link_sent', 'paid', 'preparing', 'out_for_delivery', 'delivered', 'cancelled', 'manual_review');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('not_started', 'awaiting_link', 'link_sent', 'authorized', 'declined', 'expired', 'cancelled', 'refunded', 'manual_review');--> statement-breakpoint
CREATE TABLE "admin_users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(254) NOT NULL,
	"full_name" varchar(160) NOT NULL,
	"role" "admin_role" NOT NULL,
	"auth_subject" text,
	"password_hash" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_login_at" timestamp with time zone,
	"disabled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "admin_users_email_nonempty_chk" CHECK (length(trim("admin_users"."email")) > 3),
	CONSTRAINT "admin_users_auth_method_chk" CHECK ("admin_users"."auth_subject" is not null or "admin_users"."password_hash" is not null)
);
--> statement-breakpoint
CREATE TABLE "audit_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_kind" text NOT NULL,
	"actor_admin_user_id" uuid,
	"action" varchar(160) NOT NULL,
	"resource_type" varchar(100) NOT NULL,
	"resource_id" uuid NOT NULL,
	"reason" text,
	"before" jsonb,
	"after" jsonb,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"idempotency_key" text,
	"correlation_id" uuid NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "audit_events_actor_kind_chk" CHECK ("audit_events"."actor_kind" in ('admin', 'customer', 'system')),
	CONSTRAINT "audit_events_actor_consistency_chk" CHECK (("audit_events"."actor_kind" = 'admin' and "audit_events"."actor_admin_user_id" is not null) or ("audit_events"."actor_kind" <> 'admin' and "audit_events"."actor_admin_user_id" is null)),
	CONSTRAINT "audit_events_action_nonempty_chk" CHECK (length(trim("audit_events"."action")) > 0),
	CONSTRAINT "audit_events_resource_type_nonempty_chk" CHECK (length(trim("audit_events"."resource_type")) > 0),
	CONSTRAINT "audit_events_before_object_chk" CHECK ("audit_events"."before" is null or jsonb_typeof("audit_events"."before") = 'object'),
	CONSTRAINT "audit_events_after_object_chk" CHECK ("audit_events"."after" is null or jsonb_typeof("audit_events"."after") = 'object'),
	CONSTRAINT "audit_events_metadata_object_chk" CHECK (jsonb_typeof("audit_events"."metadata") = 'object')
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(100) NOT NULL,
	"name" varchar(160) NOT NULL,
	"short_name" varchar(80) NOT NULL,
	"description" text NOT NULL,
	"tone" varchar(32),
	"parent_id" uuid,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "categories_slug_format_chk" CHECK ("categories"."slug" ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
	CONSTRAINT "categories_sort_order_chk" CHECK ("categories"."sort_order" >= 0),
	CONSTRAINT "categories_parent_not_self_chk" CHECK ("categories"."parent_id" is null or "categories"."parent_id" <> "categories"."id")
);
--> statement-breakpoint
CREATE TABLE "inventory_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"variant_id" uuid NOT NULL,
	"on_hand" integer DEFAULT 0 NOT NULL,
	"reserved" integer DEFAULT 0 NOT NULL,
	"low_stock_threshold" integer DEFAULT 5 NOT NULL,
	"version" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "inventory_items_on_hand_chk" CHECK ("inventory_items"."on_hand" >= 0),
	CONSTRAINT "inventory_items_reserved_chk" CHECK ("inventory_items"."reserved" >= 0),
	CONSTRAINT "inventory_items_available_chk" CHECK ("inventory_items"."reserved" <= "inventory_items"."on_hand"),
	CONSTRAINT "inventory_items_low_stock_threshold_chk" CHECK ("inventory_items"."low_stock_threshold" >= 0),
	CONSTRAINT "inventory_items_version_chk" CHECK ("inventory_items"."version" >= 0)
);
--> statement-breakpoint
CREATE TABLE "inventory_movements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"inventory_item_id" uuid NOT NULL,
	"reservation_id" uuid,
	"order_item_id" uuid,
	"type" text NOT NULL,
	"on_hand_delta" integer DEFAULT 0 NOT NULL,
	"reserved_delta" integer DEFAULT 0 NOT NULL,
	"resulting_on_hand" integer NOT NULL,
	"resulting_reserved" integer NOT NULL,
	"reason" text NOT NULL,
	"actor_admin_user_id" uuid,
	"idempotency_key" text NOT NULL,
	"correlation_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "inventory_movements_type_chk" CHECK ("inventory_movements"."type" in ('opening', 'receipt', 'reserve', 'release', 'consume', 'return', 'adjustment')),
	CONSTRAINT "inventory_movements_nonzero_chk" CHECK ("inventory_movements"."type" = 'opening' or "inventory_movements"."on_hand_delta" <> 0 or "inventory_movements"."reserved_delta" <> 0),
	CONSTRAINT "inventory_movements_result_on_hand_chk" CHECK ("inventory_movements"."resulting_on_hand" >= 0),
	CONSTRAINT "inventory_movements_result_reserved_chk" CHECK ("inventory_movements"."resulting_reserved" >= 0),
	CONSTRAINT "inventory_movements_result_available_chk" CHECK ("inventory_movements"."resulting_reserved" <= "inventory_movements"."resulting_on_hand"),
	CONSTRAINT "inventory_movements_reason_nonempty_chk" CHECK (length(trim("inventory_movements"."reason")) > 0)
);
--> statement-breakpoint
CREATE TABLE "inventory_reservations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"inventory_item_id" uuid NOT NULL,
	"order_item_id" uuid NOT NULL,
	"quantity" integer NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	"released_at" timestamp with time zone,
	"release_reason" text,
	"idempotency_key" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "inventory_reservations_quantity_chk" CHECK ("inventory_reservations"."quantity" > 0),
	CONSTRAINT "inventory_reservations_status_chk" CHECK ("inventory_reservations"."status" in ('active', 'consumed', 'released', 'expired')),
	CONSTRAINT "inventory_reservations_expiry_chk" CHECK ("inventory_reservations"."expires_at" > "inventory_reservations"."created_at"),
	CONSTRAINT "inventory_reservations_lifecycle_chk" CHECK (("inventory_reservations"."status" = 'active' and "inventory_reservations"."consumed_at" is null and "inventory_reservations"."released_at" is null) or ("inventory_reservations"."status" = 'consumed' and "inventory_reservations"."consumed_at" is not null and "inventory_reservations"."released_at" is null) or ("inventory_reservations"."status" in ('released', 'expired') and "inventory_reservations"."released_at" is not null and "inventory_reservations"."consumed_at" is null))
);
--> statement-breakpoint
CREATE TABLE "order_access_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"token_hash" char(64) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"last_used_at" timestamp with time zone,
	CONSTRAINT "order_access_tokens_hash_chk" CHECK ("order_access_tokens"."token_hash" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "order_access_tokens_expiration_chk" CHECK ("order_access_tokens"."expires_at" is null or "order_access_tokens"."expires_at" > "order_access_tokens"."created_at")
);
--> statement-breakpoint
CREATE TABLE "order_addresses" (
	"order_id" uuid PRIMARY KEY NOT NULL,
	"postal_code" char(8) NOT NULL,
	"street" varchar(160) NOT NULL,
	"number" varchar(20) NOT NULL,
	"complement" varchar(80),
	"district" varchar(80) NOT NULL,
	"city" varchar(80) NOT NULL,
	"state" char(2) NOT NULL,
	"country" char(2) DEFAULT 'BR' NOT NULL,
	"review_status" text DEFAULT 'pending' NOT NULL,
	"review_reason" text,
	"reviewed_at" timestamp with time zone,
	"reviewed_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "order_addresses_postal_code_chk" CHECK ("order_addresses"."postal_code" ~ '^[0-9]{8}$'),
	CONSTRAINT "order_addresses_state_chk" CHECK ("order_addresses"."state" ~ '^[A-Z]{2}$'),
	CONSTRAINT "order_addresses_country_chk" CHECK ("order_addresses"."country" = 'BR'),
	CONSTRAINT "order_addresses_review_status_chk" CHECK ("order_addresses"."review_status" in ('pending', 'approved', 'rejected', 'manual_review')),
	CONSTRAINT "order_addresses_review_consistency_chk" CHECK (("order_addresses"."review_status" = 'pending' and "order_addresses"."reviewed_at" is null and "order_addresses"."reviewed_by" is null) or ("order_addresses"."review_status" <> 'pending' and "order_addresses"."reviewed_at" is not null))
);
--> statement-breakpoint
CREATE TABLE "order_consents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"policy_key" varchar(100) NOT NULL,
	"policy_version" varchar(80) NOT NULL,
	"document_hash" char(64) NOT NULL,
	"accepted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "order_consents_document_hash_chk" CHECK ("order_consents"."document_hash" ~ '^[0-9a-f]{64}$')
);
--> statement-breakpoint
CREATE TABLE "order_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"event_type" varchar(100) NOT NULL,
	"from_status" "order_status",
	"to_status" "order_status" NOT NULL,
	"actor_kind" text NOT NULL,
	"actor_admin_user_id" uuid,
	"reason" text,
	"public_message" text,
	"visible_to_customer" boolean DEFAULT false NOT NULL,
	"idempotency_key" text NOT NULL,
	"correlation_id" uuid NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "order_events_actor_kind_chk" CHECK ("order_events"."actor_kind" in ('admin', 'customer', 'system')),
	CONSTRAINT "order_events_actor_consistency_chk" CHECK (("order_events"."actor_kind" = 'admin' and "order_events"."actor_admin_user_id" is not null) or ("order_events"."actor_kind" <> 'admin' and "order_events"."actor_admin_user_id" is null)),
	CONSTRAINT "order_events_transition_chk" CHECK ("order_events"."from_status" is null or "order_events"."from_status" <> "order_events"."to_status"),
	CONSTRAINT "order_events_metadata_object_chk" CHECK (jsonb_typeof("order_events"."metadata") = 'object')
);
--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"line_number" smallint NOT NULL,
	"product_id" uuid NOT NULL,
	"variant_id" uuid NOT NULL,
	"program_item_id" uuid NOT NULL,
	"product_slug" varchar(120) NOT NULL,
	"product_name" varchar(240) NOT NULL,
	"variant_name" varchar(160) NOT NULL,
	"sku" varchar(100) NOT NULL,
	"brand" varchar(160) NOT NULL,
	"program_item_code" varchar(120) NOT NULL,
	"program_item_description" text NOT NULL,
	"unit_price_cents" integer NOT NULL,
	"quantity" integer NOT NULL,
	"line_total_cents" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "order_items_line_number_chk" CHECK ("order_items"."line_number" > 0),
	CONSTRAINT "order_items_unit_price_chk" CHECK ("order_items"."unit_price_cents" >= 0),
	CONSTRAINT "order_items_quantity_chk" CHECK ("order_items"."quantity" > 0),
	CONSTRAINT "order_items_line_total_chk" CHECK ("order_items"."line_total_cents" = "order_items"."unit_price_cents" * "order_items"."quantity")
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sequence" bigint GENERATED ALWAYS AS IDENTITY (sequence name "orders_sequence_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"public_code" varchar(9) NOT NULL,
	"checkout_idempotency_key" uuid NOT NULL,
	"commerce_mode" varchar(32) DEFAULT 'sme_duepay' NOT NULL,
	"status" "order_status" DEFAULT 'awaiting_payment_link' NOT NULL,
	"program_catalog_id" uuid NOT NULL,
	"school_stage_id" uuid NOT NULL,
	"responsible_name" varchar(160) NOT NULL,
	"responsible_cpf_encrypted" text NOT NULL,
	"responsible_cpf_hash" char(64) NOT NULL,
	"responsible_cpf_masked" char(14) NOT NULL,
	"email" varchar(254) NOT NULL,
	"phone" varchar(11) NOT NULL,
	"currency" char(3) DEFAULT 'BRL' NOT NULL,
	"subtotal_cents" integer NOT NULL,
	"shipping_cents" integer DEFAULT 0 NOT NULL,
	"total_cents" integer NOT NULL,
	"benefit_reference_cents" integer NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"paid_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"delivered_at" timestamp with time zone,
	CONSTRAINT "orders_public_code_format_chk" CHECK ("orders"."public_code" ~ '^BG-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$'),
	CONSTRAINT "orders_commerce_mode_chk" CHECK ("orders"."commerce_mode" = 'sme_duepay'),
	CONSTRAINT "orders_currency_chk" CHECK ("orders"."currency" = 'BRL'),
	CONSTRAINT "orders_subtotal_chk" CHECK ("orders"."subtotal_cents" >= 0),
	CONSTRAINT "orders_shipping_free_chk" CHECK ("orders"."shipping_cents" = 0),
	CONSTRAINT "orders_total_chk" CHECK ("orders"."total_cents" = "orders"."subtotal_cents" + "orders"."shipping_cents"),
	CONSTRAINT "orders_benefit_reference_chk" CHECK ("orders"."benefit_reference_cents" >= 0),
	CONSTRAINT "orders_phone_chk" CHECK ("orders"."phone" ~ '^[0-9]{10,11}$'),
	CONSTRAINT "orders_cpf_hash_chk" CHECK ("orders"."responsible_cpf_hash" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "orders_timestamp_status_chk" CHECK (("orders"."status" not in ('paid', 'preparing', 'out_for_delivery', 'delivered') or "orders"."paid_at" is not null) and ("orders"."status" <> 'cancelled' or "orders"."cancelled_at" is not null) and ("orders"."status" <> 'delivered' or "orders"."delivered_at" is not null))
);
--> statement-breakpoint
CREATE TABLE "payment_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"attempt_number" smallint NOT NULL,
	"provider" varchar(40) DEFAULT 'duepay_manual' NOT NULL,
	"provider_reference" varchar(80) NOT NULL,
	"status" "payment_status" DEFAULT 'awaiting_link' NOT NULL,
	"amount_cents" integer NOT NULL,
	"currency" char(3) DEFAULT 'BRL' NOT NULL,
	"sent_channel" text,
	"link_sent_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"external_reference" varchar(240),
	"authorized_at" timestamp with time zone,
	"declined_at" timestamp with time zone,
	"expired_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"refunded_at" timestamp with time zone,
	"idempotency_key" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payment_attempts_attempt_number_chk" CHECK ("payment_attempts"."attempt_number" > 0),
	CONSTRAINT "payment_attempts_provider_chk" CHECK ("payment_attempts"."provider" = 'duepay_manual'),
	CONSTRAINT "payment_attempts_amount_chk" CHECK ("payment_attempts"."amount_cents" >= 0),
	CONSTRAINT "payment_attempts_currency_chk" CHECK ("payment_attempts"."currency" = 'BRL'),
	CONSTRAINT "payment_attempts_channel_chk" CHECK ("payment_attempts"."sent_channel" is null or "payment_attempts"."sent_channel" in ('email', 'sms', 'whatsapp', 'other')),
	CONSTRAINT "payment_attempts_link_sent_chk" CHECK ("payment_attempts"."status" not in ('link_sent', 'authorized', 'declined', 'expired', 'refunded') or "payment_attempts"."link_sent_at" is not null),
	CONSTRAINT "payment_attempts_expiration_chk" CHECK ("payment_attempts"."expires_at" is null or ("payment_attempts"."link_sent_at" is not null and "payment_attempts"."expires_at" > "payment_attempts"."link_sent_at")),
	CONSTRAINT "payment_attempts_authorized_chk" CHECK ("payment_attempts"."status" not in ('authorized', 'refunded') or "payment_attempts"."authorized_at" is not null),
	CONSTRAINT "payment_attempts_terminal_timestamp_chk" CHECK (("payment_attempts"."status" <> 'declined' or "payment_attempts"."declined_at" is not null) and ("payment_attempts"."status" <> 'expired' or "payment_attempts"."expired_at" is not null) and ("payment_attempts"."status" <> 'cancelled' or "payment_attempts"."cancelled_at" is not null) and ("payment_attempts"."status" <> 'refunded' or "payment_attempts"."refunded_at" is not null))
);
--> statement-breakpoint
CREATE TABLE "payment_reconciliations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"payment_attempt_id" uuid NOT NULL,
	"result" "payment_status" NOT NULL,
	"source" varchar(40) DEFAULT 'provider_portal' NOT NULL,
	"confirmed_amount_cents" integer NOT NULL,
	"authorization_code" varchar(160),
	"provider_nsu" varchar(160),
	"acquirer_nsu" varchar(160),
	"external_reference" varchar(240),
	"deduplication_key" char(64) NOT NULL,
	"checked_by" uuid NOT NULL,
	"checked_at" timestamp with time zone DEFAULT now() NOT NULL,
	"notes" text,
	"evidence" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"idempotency_key" text NOT NULL,
	"correlation_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payment_reconciliations_result_chk" CHECK ("payment_reconciliations"."result" in ('authorized', 'declined', 'cancelled', 'refunded', 'manual_review')),
	CONSTRAINT "payment_reconciliations_source_chk" CHECK ("payment_reconciliations"."source" = 'provider_portal'),
	CONSTRAINT "payment_reconciliations_confirmed_amount_chk" CHECK ("payment_reconciliations"."confirmed_amount_cents" >= 0),
	CONSTRAINT "payment_reconciliations_deduplication_key_chk" CHECK ("payment_reconciliations"."deduplication_key" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "payment_reconciliations_authorized_refs_chk" CHECK ("payment_reconciliations"."result" <> 'authorized' or ("payment_reconciliations"."authorization_code" is not null and ("payment_reconciliations"."provider_nsu" is not null or "payment_reconciliations"."acquirer_nsu" is not null))),
	CONSTRAINT "payment_reconciliations_evidence_object_chk" CHECK (jsonb_typeof("payment_reconciliations"."evidence") = 'object')
);
--> statement-breakpoint
CREATE TABLE "product_categories" (
	"product_id" uuid NOT NULL,
	"category_id" uuid NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "product_categories_pk" PRIMARY KEY("product_id","category_id"),
	CONSTRAINT "product_categories_sort_order_chk" CHECK ("product_categories"."sort_order" >= 0)
);
--> statement-breakpoint
CREATE TABLE "product_media" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"variant_id" uuid,
	"object_key" text NOT NULL,
	"alt_text" varchar(320),
	"mime_type" varchar(100) NOT NULL,
	"width" integer,
	"height" integer,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "product_media_sort_order_chk" CHECK ("product_media"."sort_order" >= 0),
	CONSTRAINT "product_media_width_chk" CHECK ("product_media"."width" is null or "product_media"."width" > 0),
	CONSTRAINT "product_media_height_chk" CHECK ("product_media"."height" is null or "product_media"."height" > 0)
);
--> statement-breakpoint
CREATE TABLE "product_variants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"sku" varchar(100) NOT NULL,
	"name" varchar(160) DEFAULT 'Padrão' NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"price_cents" integer NOT NULL,
	"compare_at_price_cents" integer,
	"unit_of_measure" varchar(32) DEFAULT 'un' NOT NULL,
	"max_per_order" integer DEFAULT 1 NOT NULL,
	"weight_grams" integer,
	"attributes" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"archived_at" timestamp with time zone,
	CONSTRAINT "product_variants_sku_nonempty_chk" CHECK (length(trim("product_variants"."sku")) > 0),
	CONSTRAINT "product_variants_status_chk" CHECK ("product_variants"."status" in ('draft', 'active', 'archived')),
	CONSTRAINT "product_variants_price_chk" CHECK ("product_variants"."price_cents" >= 0),
	CONSTRAINT "product_variants_compare_price_chk" CHECK ("product_variants"."compare_at_price_cents" is null or "product_variants"."compare_at_price_cents" > "product_variants"."price_cents"),
	CONSTRAINT "product_variants_max_per_order_chk" CHECK ("product_variants"."max_per_order" > 0),
	CONSTRAINT "product_variants_weight_chk" CHECK ("product_variants"."weight_grams" is null or "product_variants"."weight_grams" >= 0),
	CONSTRAINT "product_variants_attributes_object_chk" CHECK (jsonb_typeof("product_variants"."attributes") = 'object'),
	CONSTRAINT "product_variants_archive_consistency_chk" CHECK (("product_variants"."status" = 'archived') = ("product_variants"."archived_at" is not null))
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(120) NOT NULL,
	"name" varchar(240) NOT NULL,
	"brand" varchar(160) NOT NULL,
	"tagline" varchar(240) NOT NULL,
	"description" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"illustration_key" varchar(80),
	"keywords" text[] DEFAULT array[]::text[] NOT NULL,
	"specifications" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"seo_title" varchar(240),
	"seo_description" varchar(320),
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"archived_at" timestamp with time zone,
	CONSTRAINT "products_slug_format_chk" CHECK ("products"."slug" ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
	CONSTRAINT "products_name_nonempty_chk" CHECK (length(trim("products"."name")) > 0),
	CONSTRAINT "products_sort_order_chk" CHECK ("products"."sort_order" >= 0),
	CONSTRAINT "products_status_chk" CHECK ("products"."status" in ('draft', 'active', 'archived')),
	CONSTRAINT "products_specifications_array_chk" CHECK (jsonb_typeof("products"."specifications") = 'array'),
	CONSTRAINT "products_archive_consistency_chk" CHECK (("products"."status" = 'archived') = ("products"."archived_at" is not null))
);
--> statement-breakpoint
CREATE TABLE "program_catalog_stages" (
	"catalog_id" uuid NOT NULL,
	"stage_id" uuid NOT NULL,
	"benefit_amount_cents" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "program_catalog_stages_pk" PRIMARY KEY("catalog_id","stage_id"),
	CONSTRAINT "program_catalog_stages_benefit_chk" CHECK ("program_catalog_stages"."benefit_amount_cents" >= 0)
);
--> statement-breakpoint
CREATE TABLE "program_catalogs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"year" integer NOT NULL,
	"version" varchar(80) NOT NULL,
	"name" varchar(240) NOT NULL,
	"source_url" text NOT NULL,
	"source_kind" text DEFAULT 'official' NOT NULL,
	"source_obtained_at" timestamp with time zone NOT NULL,
	"valid_from" date,
	"valid_until" date,
	"status" text DEFAULT 'draft' NOT NULL,
	"published_at" timestamp with time zone,
	"published_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "program_catalogs_year_chk" CHECK ("program_catalogs"."year" between 2000 and 2100),
	CONSTRAINT "program_catalogs_status_chk" CHECK ("program_catalogs"."status" in ('draft', 'published', 'archived')),
	CONSTRAINT "program_catalogs_source_kind_chk" CHECK ("program_catalogs"."source_kind" in ('official', 'development_seed')),
	CONSTRAINT "program_catalogs_seed_never_published_chk" CHECK ("program_catalogs"."source_kind" <> 'development_seed' or "program_catalogs"."status" <> 'published'),
	CONSTRAINT "program_catalogs_validity_chk" CHECK ("program_catalogs"."valid_from" is null or "program_catalogs"."valid_until" is null or "program_catalogs"."valid_until" >= "program_catalogs"."valid_from"),
	CONSTRAINT "program_catalogs_publication_chk" CHECK (("program_catalogs"."status" = 'published' and "program_catalogs"."published_at" is not null and "program_catalogs"."published_by" is not null) or ("program_catalogs"."status" <> 'published'))
);
--> statement-breakpoint
CREATE TABLE "program_item_stages" (
	"program_item_id" uuid NOT NULL,
	"stage_id" uuid NOT NULL,
	"recommended_quantity" integer NOT NULL,
	"max_quantity" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "program_item_stages_pk" PRIMARY KEY("program_item_id","stage_id"),
	CONSTRAINT "program_item_stages_quantity_chk" CHECK ("program_item_stages"."recommended_quantity" > 0),
	CONSTRAINT "program_item_stages_max_quantity_chk" CHECK ("program_item_stages"."max_quantity" is null or "program_item_stages"."max_quantity" >= "program_item_stages"."recommended_quantity")
);
--> statement-breakpoint
CREATE TABLE "program_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"catalog_id" uuid NOT NULL,
	"code" varchar(120) NOT NULL,
	"official_name" varchar(320) NOT NULL,
	"official_description" text NOT NULL,
	"specifications" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"unit_of_measure" varchar(32) NOT NULL,
	"max_unit_price_cents" integer,
	"source_reference" varchar(240),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "program_items_code_nonempty_chk" CHECK (length(trim("program_items"."code")) > 0),
	CONSTRAINT "program_items_max_price_chk" CHECK ("program_items"."max_unit_price_cents" is null or "program_items"."max_unit_price_cents" >= 0),
	CONSTRAINT "program_items_specifications_object_chk" CHECK (jsonb_typeof("program_items"."specifications") = 'object')
);
--> statement-breakpoint
CREATE TABLE "school_stages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(100) NOT NULL,
	"short_name" varchar(160) NOT NULL,
	"name" varchar(240) NOT NULL,
	"range_label" varchar(160) NOT NULL,
	"accent" varchar(32),
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "school_stages_slug_format_chk" CHECK ("school_stages"."slug" ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
	CONSTRAINT "school_stages_sort_order_chk" CHECK ("school_stages"."sort_order" >= 0)
);
--> statement-breakpoint
CREATE TABLE "variant_program_items" (
	"variant_id" uuid NOT NULL,
	"program_item_id" uuid NOT NULL,
	"is_approved" boolean DEFAULT false NOT NULL,
	"approved_at" timestamp with time zone,
	"approved_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "variant_program_items_pk" PRIMARY KEY("variant_id","program_item_id"),
	CONSTRAINT "variant_program_items_approval_chk" CHECK (("variant_program_items"."is_approved" = true and "variant_program_items"."approved_at" is not null and "variant_program_items"."approved_by" is not null) or ("variant_program_items"."is_approved" = false and "variant_program_items"."approved_at" is null and "variant_program_items"."approved_by" is null))
);
--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_actor_admin_user_id_admin_users_id_fk" FOREIGN KEY ("actor_admin_user_id") REFERENCES "public"."admin_users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_parent_id_categories_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_inventory_item_id_inventory_items_id_fk" FOREIGN KEY ("inventory_item_id") REFERENCES "public"."inventory_items"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_reservation_id_inventory_reservations_id_fk" FOREIGN KEY ("reservation_id") REFERENCES "public"."inventory_reservations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_order_item_id_order_items_id_fk" FOREIGN KEY ("order_item_id") REFERENCES "public"."order_items"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_actor_admin_user_id_admin_users_id_fk" FOREIGN KEY ("actor_admin_user_id") REFERENCES "public"."admin_users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_reservations" ADD CONSTRAINT "inventory_reservations_inventory_item_id_inventory_items_id_fk" FOREIGN KEY ("inventory_item_id") REFERENCES "public"."inventory_items"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_reservations" ADD CONSTRAINT "inventory_reservations_order_item_id_order_items_id_fk" FOREIGN KEY ("order_item_id") REFERENCES "public"."order_items"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_access_tokens" ADD CONSTRAINT "order_access_tokens_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_addresses" ADD CONSTRAINT "order_addresses_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_addresses" ADD CONSTRAINT "order_addresses_reviewed_by_admin_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."admin_users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_consents" ADD CONSTRAINT "order_consents_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_events" ADD CONSTRAINT "order_events_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_events" ADD CONSTRAINT "order_events_actor_admin_user_id_admin_users_id_fk" FOREIGN KEY ("actor_admin_user_id") REFERENCES "public"."admin_users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_program_item_id_program_items_id_fk" FOREIGN KEY ("program_item_id") REFERENCES "public"."program_items"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_variant_program_item_fk" FOREIGN KEY ("variant_id","program_item_id") REFERENCES "public"."variant_program_items"("variant_id","program_item_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_program_catalog_stage_fk" FOREIGN KEY ("program_catalog_id","school_stage_id") REFERENCES "public"."program_catalog_stages"("catalog_id","stage_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_attempts" ADD CONSTRAINT "payment_attempts_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_reconciliations" ADD CONSTRAINT "payment_reconciliations_payment_attempt_id_payment_attempts_id_fk" FOREIGN KEY ("payment_attempt_id") REFERENCES "public"."payment_attempts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_reconciliations" ADD CONSTRAINT "payment_reconciliations_checked_by_admin_users_id_fk" FOREIGN KEY ("checked_by") REFERENCES "public"."admin_users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_categories" ADD CONSTRAINT "product_categories_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_categories" ADD CONSTRAINT "product_categories_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_media" ADD CONSTRAINT "product_media_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_media" ADD CONSTRAINT "product_media_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "program_catalog_stages" ADD CONSTRAINT "program_catalog_stages_catalog_id_program_catalogs_id_fk" FOREIGN KEY ("catalog_id") REFERENCES "public"."program_catalogs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "program_catalog_stages" ADD CONSTRAINT "program_catalog_stages_stage_id_school_stages_id_fk" FOREIGN KEY ("stage_id") REFERENCES "public"."school_stages"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "program_catalogs" ADD CONSTRAINT "program_catalogs_published_by_admin_users_id_fk" FOREIGN KEY ("published_by") REFERENCES "public"."admin_users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "program_item_stages" ADD CONSTRAINT "program_item_stages_program_item_id_program_items_id_fk" FOREIGN KEY ("program_item_id") REFERENCES "public"."program_items"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "program_item_stages" ADD CONSTRAINT "program_item_stages_stage_id_school_stages_id_fk" FOREIGN KEY ("stage_id") REFERENCES "public"."school_stages"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "program_items" ADD CONSTRAINT "program_items_catalog_id_program_catalogs_id_fk" FOREIGN KEY ("catalog_id") REFERENCES "public"."program_catalogs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "variant_program_items" ADD CONSTRAINT "variant_program_items_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "variant_program_items" ADD CONSTRAINT "variant_program_items_program_item_id_program_items_id_fk" FOREIGN KEY ("program_item_id") REFERENCES "public"."program_items"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "variant_program_items" ADD CONSTRAINT "variant_program_items_approved_by_admin_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."admin_users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "admin_users_email_uidx" ON "admin_users" USING btree (lower("email"));--> statement-breakpoint
CREATE UNIQUE INDEX "admin_users_auth_subject_uidx" ON "admin_users" USING btree ("auth_subject") WHERE "admin_users"."auth_subject" is not null;--> statement-breakpoint
CREATE INDEX "admin_users_active_role_idx" ON "admin_users" USING btree ("is_active","role");--> statement-breakpoint
CREATE UNIQUE INDEX "audit_events_idempotency_uidx" ON "audit_events" USING btree ("idempotency_key") WHERE "audit_events"."idempotency_key" is not null;--> statement-breakpoint
CREATE INDEX "audit_events_resource_time_idx" ON "audit_events" USING btree ("resource_type","resource_id","occurred_at","id");--> statement-breakpoint
CREATE INDEX "audit_events_actor_time_idx" ON "audit_events" USING btree ("actor_admin_user_id","occurred_at");--> statement-breakpoint
CREATE INDEX "audit_events_correlation_idx" ON "audit_events" USING btree ("correlation_id");--> statement-breakpoint
CREATE UNIQUE INDEX "categories_slug_uidx" ON "categories" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "categories_navigation_idx" ON "categories" USING btree ("is_active","sort_order","name");--> statement-breakpoint
CREATE INDEX "categories_parent_idx" ON "categories" USING btree ("parent_id");--> statement-breakpoint
CREATE UNIQUE INDEX "inventory_items_variant_uidx" ON "inventory_items" USING btree ("variant_id");--> statement-breakpoint
CREATE INDEX "inventory_items_available_idx" ON "inventory_items" USING btree (("on_hand" - "reserved"));--> statement-breakpoint
CREATE INDEX "inventory_items_low_stock_idx" ON "inventory_items" USING btree (("on_hand" - "reserved")) WHERE ("inventory_items"."on_hand" - "inventory_items"."reserved") <= "inventory_items"."low_stock_threshold";--> statement-breakpoint
CREATE UNIQUE INDEX "inventory_movements_idempotency_uidx" ON "inventory_movements" USING btree ("idempotency_key");--> statement-breakpoint
CREATE INDEX "inventory_movements_item_time_idx" ON "inventory_movements" USING btree ("inventory_item_id","created_at","id");--> statement-breakpoint
CREATE INDEX "inventory_movements_order_item_idx" ON "inventory_movements" USING btree ("order_item_id");--> statement-breakpoint
CREATE INDEX "inventory_movements_reservation_idx" ON "inventory_movements" USING btree ("reservation_id");--> statement-breakpoint
CREATE INDEX "inventory_movements_correlation_idx" ON "inventory_movements" USING btree ("correlation_id");--> statement-breakpoint
CREATE UNIQUE INDEX "inventory_reservations_idempotency_uidx" ON "inventory_reservations" USING btree ("idempotency_key");--> statement-breakpoint
CREATE UNIQUE INDEX "inventory_reservations_active_order_item_uidx" ON "inventory_reservations" USING btree ("order_item_id") WHERE "inventory_reservations"."status" = 'active';--> statement-breakpoint
CREATE INDEX "inventory_reservations_active_expiry_idx" ON "inventory_reservations" USING btree ("expires_at","inventory_item_id") WHERE "inventory_reservations"."status" = 'active';--> statement-breakpoint
CREATE INDEX "inventory_reservations_inventory_status_idx" ON "inventory_reservations" USING btree ("inventory_item_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "order_access_tokens_hash_uidx" ON "order_access_tokens" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "order_access_tokens_order_active_idx" ON "order_access_tokens" USING btree ("order_id","expires_at") WHERE "order_access_tokens"."revoked_at" is null;--> statement-breakpoint
CREATE INDEX "order_addresses_review_idx" ON "order_addresses" USING btree ("review_status","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "order_consents_order_policy_uidx" ON "order_consents" USING btree ("order_id","policy_key");--> statement-breakpoint
CREATE INDEX "order_consents_policy_version_idx" ON "order_consents" USING btree ("policy_key","policy_version");--> statement-breakpoint
CREATE UNIQUE INDEX "order_events_idempotency_uidx" ON "order_events" USING btree ("idempotency_key");--> statement-breakpoint
CREATE INDEX "order_events_order_time_idx" ON "order_events" USING btree ("order_id","occurred_at","id");--> statement-breakpoint
CREATE INDEX "order_events_customer_timeline_idx" ON "order_events" USING btree ("order_id","occurred_at") WHERE "order_events"."visible_to_customer" = true;--> statement-breakpoint
CREATE INDEX "order_events_correlation_idx" ON "order_events" USING btree ("correlation_id");--> statement-breakpoint
CREATE UNIQUE INDEX "order_items_order_line_uidx" ON "order_items" USING btree ("order_id","line_number");--> statement-breakpoint
CREATE INDEX "order_items_variant_idx" ON "order_items" USING btree ("variant_id");--> statement-breakpoint
CREATE INDEX "order_items_program_item_idx" ON "order_items" USING btree ("program_item_id");--> statement-breakpoint
CREATE UNIQUE INDEX "orders_sequence_uidx" ON "orders" USING btree ("sequence");--> statement-breakpoint
CREATE UNIQUE INDEX "orders_public_code_uidx" ON "orders" USING btree ("public_code");--> statement-breakpoint
CREATE UNIQUE INDEX "orders_checkout_idempotency_uidx" ON "orders" USING btree ("checkout_idempotency_key");--> statement-breakpoint
CREATE INDEX "orders_status_created_idx" ON "orders" USING btree ("status","created_at","id");--> statement-breakpoint
CREATE INDEX "orders_stage_created_idx" ON "orders" USING btree ("school_stage_id","created_at");--> statement-breakpoint
CREATE INDEX "orders_cpf_hash_idx" ON "orders" USING btree ("responsible_cpf_hash","created_at");--> statement-breakpoint
CREATE INDEX "orders_email_created_idx" ON "orders" USING btree (lower("email"),"created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "payment_attempts_order_number_uidx" ON "payment_attempts" USING btree ("order_id","attempt_number");--> statement-breakpoint
CREATE UNIQUE INDEX "payment_attempts_provider_reference_uidx" ON "payment_attempts" USING btree ("provider","provider_reference");--> statement-breakpoint
CREATE UNIQUE INDEX "payment_attempts_idempotency_uidx" ON "payment_attempts" USING btree ("idempotency_key");--> statement-breakpoint
CREATE UNIQUE INDEX "payment_attempts_active_order_uidx" ON "payment_attempts" USING btree ("order_id") WHERE "payment_attempts"."status" in ('not_started', 'awaiting_link', 'link_sent', 'manual_review');--> statement-breakpoint
CREATE UNIQUE INDEX "payment_attempts_successful_order_uidx" ON "payment_attempts" USING btree ("order_id") WHERE "payment_attempts"."status" in ('authorized', 'refunded');--> statement-breakpoint
CREATE INDEX "payment_attempts_status_created_idx" ON "payment_attempts" USING btree ("status","created_at","id");--> statement-breakpoint
CREATE INDEX "payment_attempts_link_expiry_idx" ON "payment_attempts" USING btree ("expires_at","order_id") WHERE "payment_attempts"."status" = 'link_sent';--> statement-breakpoint
CREATE UNIQUE INDEX "payment_reconciliations_deduplication_uidx" ON "payment_reconciliations" USING btree ("deduplication_key");--> statement-breakpoint
CREATE UNIQUE INDEX "payment_reconciliations_idempotency_uidx" ON "payment_reconciliations" USING btree ("idempotency_key");--> statement-breakpoint
CREATE INDEX "payment_reconciliations_attempt_time_idx" ON "payment_reconciliations" USING btree ("payment_attempt_id","checked_at","id");--> statement-breakpoint
CREATE INDEX "payment_reconciliations_correlation_idx" ON "payment_reconciliations" USING btree ("correlation_id");--> statement-breakpoint
CREATE UNIQUE INDEX "product_categories_primary_uidx" ON "product_categories" USING btree ("product_id") WHERE "product_categories"."is_primary" = true;--> statement-breakpoint
CREATE INDEX "product_categories_category_idx" ON "product_categories" USING btree ("category_id","product_id");--> statement-breakpoint
CREATE UNIQUE INDEX "product_media_object_key_uidx" ON "product_media" USING btree ("object_key");--> statement-breakpoint
CREATE UNIQUE INDEX "product_media_product_order_uidx" ON "product_media" USING btree ("product_id","sort_order");--> statement-breakpoint
CREATE INDEX "product_media_variant_idx" ON "product_media" USING btree ("variant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "product_variants_sku_uidx" ON "product_variants" USING btree (lower("sku"));--> statement-breakpoint
CREATE UNIQUE INDEX "product_variants_default_uidx" ON "product_variants" USING btree ("product_id") WHERE "product_variants"."is_default" = true;--> statement-breakpoint
CREATE INDEX "product_variants_product_status_idx" ON "product_variants" USING btree ("product_id","status");--> statement-breakpoint
CREATE INDEX "product_variants_active_price_idx" ON "product_variants" USING btree ("price_cents","id") WHERE "product_variants"."status" = 'active';--> statement-breakpoint
CREATE UNIQUE INDEX "products_slug_uidx" ON "products" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "products_status_sort_idx" ON "products" USING btree ("status","sort_order","id");--> statement-breakpoint
CREATE INDEX "products_status_name_idx" ON "products" USING btree ("status","name","id");--> statement-breakpoint
CREATE INDEX "products_keywords_idx" ON "products" USING gin ("keywords");--> statement-breakpoint
CREATE INDEX "program_catalog_stages_stage_idx" ON "program_catalog_stages" USING btree ("stage_id","catalog_id");--> statement-breakpoint
CREATE UNIQUE INDEX "program_catalogs_year_version_uidx" ON "program_catalogs" USING btree ("year","version");--> statement-breakpoint
CREATE UNIQUE INDEX "program_catalogs_published_year_uidx" ON "program_catalogs" USING btree ("year") WHERE "program_catalogs"."status" = 'published';--> statement-breakpoint
CREATE INDEX "program_catalogs_status_validity_idx" ON "program_catalogs" USING btree ("status","valid_from","valid_until");--> statement-breakpoint
CREATE INDEX "program_item_stages_stage_idx" ON "program_item_stages" USING btree ("stage_id","program_item_id");--> statement-breakpoint
CREATE UNIQUE INDEX "program_items_catalog_code_uidx" ON "program_items" USING btree ("catalog_id","code");--> statement-breakpoint
CREATE INDEX "program_items_catalog_name_idx" ON "program_items" USING btree ("catalog_id","official_name");--> statement-breakpoint
CREATE UNIQUE INDEX "school_stages_slug_uidx" ON "school_stages" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "school_stages_active_order_idx" ON "school_stages" USING btree ("is_active","sort_order");--> statement-breakpoint
CREATE INDEX "variant_program_items_program_item_idx" ON "variant_program_items" USING btree ("program_item_id","variant_id");--> statement-breakpoint
CREATE INDEX "variant_program_items_approved_variant_idx" ON "variant_program_items" USING btree ("variant_id","program_item_id") WHERE "variant_program_items"."is_approved" = true;