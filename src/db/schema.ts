import { sql } from 'drizzle-orm';
import {
  type AnyPgColumn,
  bigint,
  boolean,
  char,
  check,
  date,
  foreignKey,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

/**
 * PostgreSQL schema for the Balaio de Gato operation.
 *
 * Money is always stored as integer BRL cents. Timestamps use timestamptz and
 * are interpreted as UTC by the application. The schema deliberately has no
 * store/location/tenant dimension: the operation and inventory are singular.
 */

const createdAt = () => timestamp('created_at', { withTimezone: true }).defaultNow().notNull();
const updatedAt = () => timestamp('updated_at', { withTimezone: true }).defaultNow().notNull();

export const ORDER_STATUSES = [
  'draft',
  'awaiting_payment_link',
  'payment_link_sent',
  'paid',
  'preparing',
  'out_for_delivery',
  'delivered',
  'cancelled',
  'manual_review',
] as const;

export const PAYMENT_STATUSES = [
  'not_started',
  'awaiting_link',
  'link_sent',
  'authorized',
  'declined',
  'expired',
  'cancelled',
  'refunded',
  'manual_review',
] as const;

export const ADMIN_ROLES = ['admin', 'catalog_manager', 'order_operator', 'support'] as const;

export const orderStatusEnum = pgEnum('order_status', ORDER_STATUSES);
export const paymentStatusEnum = pgEnum('payment_status', PAYMENT_STATUSES);
export const adminRoleEnum = pgEnum('admin_role', ADMIN_ROLES);

export const PRODUCT_STATUSES = ['draft', 'active', 'archived'] as const;
export const PROGRAM_CATALOG_STATUSES = ['draft', 'published', 'archived'] as const;
export const PROGRAM_SOURCE_KINDS = ['official', 'development_seed'] as const;
export const RESERVATION_STATUSES = ['active', 'consumed', 'released', 'expired'] as const;
export const INVENTORY_MOVEMENT_TYPES = [
  'opening',
  'receipt',
  'reserve',
  'release',
  'consume',
  'return',
  'adjustment',
] as const;
export const AUDIT_ACTOR_KINDS = ['admin', 'customer', 'system'] as const;
export const PAYMENT_CHANNELS = ['email', 'sms', 'whatsapp', 'other'] as const;
export const ADDRESS_REVIEW_STATUSES = [
  'pending',
  'approved',
  'rejected',
  'manual_review',
] as const;

export type ProductStatus = (typeof PRODUCT_STATUSES)[number];
export type ProgramCatalogStatus = (typeof PROGRAM_CATALOG_STATUSES)[number];
export type ProgramSourceKind = (typeof PROGRAM_SOURCE_KINDS)[number];
export type ReservationStatus = (typeof RESERVATION_STATUSES)[number];
export type InventoryMovementType = (typeof INVENTORY_MOVEMENT_TYPES)[number];
export type AuditActorKind = (typeof AUDIT_ACTOR_KINDS)[number];
export type PaymentChannel = (typeof PAYMENT_CHANNELS)[number];
export type AddressReviewStatus = (typeof ADDRESS_REVIEW_STATUSES)[number];

export type ProductSpecification = {
  label: string;
  value: string;
};

export type JsonObject = Record<string, unknown>;

// ---------------------------------------------------------------------------
// Administrative identities
// ---------------------------------------------------------------------------

export const adminUsers = pgTable(
  'admin_users',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    email: varchar('email', { length: 254 }).notNull(),
    fullName: varchar('full_name', { length: 160 }).notNull(),
    role: adminRoleEnum('role').notNull(),
    authSubject: text('auth_subject'),
    passwordHash: text('password_hash'),
    isActive: boolean('is_active').default(true).notNull(),
    lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
    disabledAt: timestamp('disabled_at', { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex('admin_users_email_uidx').on(sql`lower(${table.email})`),
    uniqueIndex('admin_users_auth_subject_uidx')
      .on(table.authSubject)
      .where(sql`${table.authSubject} is not null`),
    index('admin_users_active_role_idx').on(table.isActive, table.role),
    check('admin_users_email_nonempty_chk', sql`length(trim(${table.email})) > 3`),
    check(
      'admin_users_auth_method_chk',
      sql`${table.authSubject} is not null or ${table.passwordHash} is not null`,
    ),
  ],
);

// ---------------------------------------------------------------------------
// Catalog
// ---------------------------------------------------------------------------

export const categories = pgTable(
  'categories',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    slug: varchar('slug', { length: 100 }).notNull(),
    name: varchar('name', { length: 160 }).notNull(),
    shortName: varchar('short_name', { length: 80 }).notNull(),
    description: text('description').notNull(),
    tone: varchar('tone', { length: 32 }),
    parentId: uuid('parent_id').references((): AnyPgColumn => categories.id, {
      onDelete: 'restrict',
    }),
    sortOrder: integer('sort_order').default(0).notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex('categories_slug_uidx').on(table.slug),
    index('categories_navigation_idx').on(table.isActive, table.sortOrder, table.name),
    index('categories_parent_idx').on(table.parentId),
    check('categories_slug_format_chk', sql`${table.slug} ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'`),
    check('categories_sort_order_chk', sql`${table.sortOrder} >= 0`),
    check(
      'categories_parent_not_self_chk',
      sql`${table.parentId} is null or ${table.parentId} <> ${table.id}`,
    ),
  ],
);

export const products = pgTable(
  'products',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    slug: varchar('slug', { length: 120 }).notNull(),
    name: varchar('name', { length: 240 }).notNull(),
    brand: varchar('brand', { length: 160 }).notNull(),
    tagline: varchar('tagline', { length: 240 }).notNull(),
    description: text('description').notNull(),
    status: text('status', { enum: PRODUCT_STATUSES }).default('draft').notNull(),
    illustrationKey: varchar('illustration_key', { length: 80 }),
    keywords: text('keywords')
      .array()
      .default(sql`array[]::text[]`)
      .notNull(),
    specifications: jsonb('specifications')
      .$type<ProductSpecification[]>()
      .default(sql`'[]'::jsonb`)
      .notNull(),
    seoTitle: varchar('seo_title', { length: 240 }),
    seoDescription: varchar('seo_description', { length: 320 }),
    sortOrder: integer('sort_order').default(0).notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    archivedAt: timestamp('archived_at', { withTimezone: true }),
  },
  (table) => [
    uniqueIndex('products_slug_uidx').on(table.slug),
    index('products_status_sort_idx').on(table.status, table.sortOrder, table.id),
    index('products_status_name_idx').on(table.status, table.name, table.id),
    index('products_keywords_idx').using('gin', table.keywords),
    check('products_slug_format_chk', sql`${table.slug} ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'`),
    check('products_name_nonempty_chk', sql`length(trim(${table.name})) > 0`),
    check('products_sort_order_chk', sql`${table.sortOrder} >= 0`),
    check('products_status_chk', sql`${table.status} in ('draft', 'active', 'archived')`),
    check(
      'products_specifications_array_chk',
      sql`jsonb_typeof(${table.specifications}) = 'array'`,
    ),
    check(
      'products_archive_consistency_chk',
      sql`(${table.status} = 'archived') = (${table.archivedAt} is not null)`,
    ),
  ],
);

export const productVariants = pgTable(
  'product_variants',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'restrict' }),
    sku: varchar('sku', { length: 100 }).notNull(),
    name: varchar('name', { length: 160 }).default('Padrão').notNull(),
    status: text('status', { enum: PRODUCT_STATUSES }).default('draft').notNull(),
    isDefault: boolean('is_default').default(false).notNull(),
    priceCents: integer('price_cents').notNull(),
    compareAtPriceCents: integer('compare_at_price_cents'),
    unitOfMeasure: varchar('unit_of_measure', { length: 32 }).default('un').notNull(),
    maxPerOrder: integer('max_per_order').default(1).notNull(),
    weightGrams: integer('weight_grams'),
    attributes: jsonb('attributes')
      .$type<JsonObject>()
      .default(sql`'{}'::jsonb`)
      .notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    archivedAt: timestamp('archived_at', { withTimezone: true }),
  },
  (table) => [
    uniqueIndex('product_variants_sku_uidx').on(sql`lower(${table.sku})`),
    uniqueIndex('product_variants_default_uidx')
      .on(table.productId)
      .where(sql`${table.isDefault} = true`),
    index('product_variants_product_status_idx').on(table.productId, table.status),
    index('product_variants_active_price_idx')
      .on(table.priceCents, table.id)
      .where(sql`${table.status} = 'active'`),
    check('product_variants_sku_nonempty_chk', sql`length(trim(${table.sku})) > 0`),
    check('product_variants_status_chk', sql`${table.status} in ('draft', 'active', 'archived')`),
    check('product_variants_price_chk', sql`${table.priceCents} >= 0`),
    check(
      'product_variants_compare_price_chk',
      sql`${table.compareAtPriceCents} is null or ${table.compareAtPriceCents} > ${table.priceCents}`,
    ),
    check('product_variants_max_per_order_chk', sql`${table.maxPerOrder} > 0`),
    check(
      'product_variants_weight_chk',
      sql`${table.weightGrams} is null or ${table.weightGrams} >= 0`,
    ),
    check(
      'product_variants_attributes_object_chk',
      sql`jsonb_typeof(${table.attributes}) = 'object'`,
    ),
    check(
      'product_variants_archive_consistency_chk',
      sql`(${table.status} = 'archived') = (${table.archivedAt} is not null)`,
    ),
  ],
);

export const productMedia = pgTable(
  'product_media',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'restrict' }),
    variantId: uuid('variant_id').references(() => productVariants.id, { onDelete: 'restrict' }),
    objectKey: text('object_key').notNull(),
    altText: varchar('alt_text', { length: 320 }),
    mimeType: varchar('mime_type', { length: 100 }).notNull(),
    width: integer('width'),
    height: integer('height'),
    sortOrder: integer('sort_order').default(0).notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex('product_media_object_key_uidx').on(table.objectKey),
    uniqueIndex('product_media_product_order_uidx').on(table.productId, table.sortOrder),
    index('product_media_variant_idx').on(table.variantId),
    check('product_media_sort_order_chk', sql`${table.sortOrder} >= 0`),
    check('product_media_width_chk', sql`${table.width} is null or ${table.width} > 0`),
    check('product_media_height_chk', sql`${table.height} is null or ${table.height} > 0`),
  ],
);

export const productCategories = pgTable(
  'product_categories',
  {
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'restrict' }),
    categoryId: uuid('category_id')
      .notNull()
      .references(() => categories.id, { onDelete: 'restrict' }),
    isPrimary: boolean('is_primary').default(false).notNull(),
    sortOrder: integer('sort_order').default(0).notNull(),
    createdAt: createdAt(),
  },
  (table) => [
    primaryKey({ name: 'product_categories_pk', columns: [table.productId, table.categoryId] }),
    uniqueIndex('product_categories_primary_uidx')
      .on(table.productId)
      .where(sql`${table.isPrimary} = true`),
    index('product_categories_category_idx').on(table.categoryId, table.productId),
    check('product_categories_sort_order_chk', sql`${table.sortOrder} >= 0`),
  ],
);

// ---------------------------------------------------------------------------
// Programa Material Escolar
// ---------------------------------------------------------------------------

export const schoolStages = pgTable(
  'school_stages',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    slug: varchar('slug', { length: 100 }).notNull(),
    shortName: varchar('short_name', { length: 160 }).notNull(),
    name: varchar('name', { length: 240 }).notNull(),
    rangeLabel: varchar('range_label', { length: 160 }).notNull(),
    accent: varchar('accent', { length: 32 }),
    sortOrder: integer('sort_order').default(0).notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex('school_stages_slug_uidx').on(table.slug),
    index('school_stages_active_order_idx').on(table.isActive, table.sortOrder),
    check('school_stages_slug_format_chk', sql`${table.slug} ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'`),
    check('school_stages_sort_order_chk', sql`${table.sortOrder} >= 0`),
  ],
);

export const programCatalogs = pgTable(
  'program_catalogs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    year: integer('year').notNull(),
    version: varchar('version', { length: 80 }).notNull(),
    name: varchar('name', { length: 240 }).notNull(),
    sourceUrl: text('source_url').notNull(),
    sourceKind: text('source_kind', { enum: PROGRAM_SOURCE_KINDS }).default('official').notNull(),
    sourceObtainedAt: timestamp('source_obtained_at', { withTimezone: true }).notNull(),
    validFrom: date('valid_from', { mode: 'string' }),
    validUntil: date('valid_until', { mode: 'string' }),
    status: text('status', { enum: PROGRAM_CATALOG_STATUSES }).default('draft').notNull(),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    publishedBy: uuid('published_by').references(() => adminUsers.id, { onDelete: 'restrict' }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex('program_catalogs_year_version_uidx').on(table.year, table.version),
    uniqueIndex('program_catalogs_published_year_uidx')
      .on(table.year)
      .where(sql`${table.status} = 'published'`),
    index('program_catalogs_status_validity_idx').on(
      table.status,
      table.validFrom,
      table.validUntil,
    ),
    check('program_catalogs_year_chk', sql`${table.year} between 2000 and 2100`),
    check(
      'program_catalogs_status_chk',
      sql`${table.status} in ('draft', 'published', 'archived')`,
    ),
    check(
      'program_catalogs_source_kind_chk',
      sql`${table.sourceKind} in ('official', 'development_seed')`,
    ),
    check(
      'program_catalogs_seed_never_published_chk',
      sql`${table.sourceKind} <> 'development_seed' or ${table.status} <> 'published'`,
    ),
    check(
      'program_catalogs_validity_chk',
      sql`${table.validFrom} is null or ${table.validUntil} is null or ${table.validUntil} >= ${table.validFrom}`,
    ),
    check(
      'program_catalogs_publication_chk',
      sql`(${table.status} = 'published' and ${table.publishedAt} is not null and ${table.publishedBy} is not null) or (${table.status} <> 'published')`,
    ),
  ],
);

export const programCatalogStages = pgTable(
  'program_catalog_stages',
  {
    catalogId: uuid('catalog_id')
      .notNull()
      .references(() => programCatalogs.id, { onDelete: 'restrict' }),
    stageId: uuid('stage_id')
      .notNull()
      .references(() => schoolStages.id, { onDelete: 'restrict' }),
    benefitAmountCents: integer('benefit_amount_cents').notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    primaryKey({ name: 'program_catalog_stages_pk', columns: [table.catalogId, table.stageId] }),
    index('program_catalog_stages_stage_idx').on(table.stageId, table.catalogId),
    check('program_catalog_stages_benefit_chk', sql`${table.benefitAmountCents} >= 0`),
  ],
);

export const programItems = pgTable(
  'program_items',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    catalogId: uuid('catalog_id')
      .notNull()
      .references(() => programCatalogs.id, { onDelete: 'restrict' }),
    code: varchar('code', { length: 120 }).notNull(),
    officialName: varchar('official_name', { length: 320 }).notNull(),
    officialDescription: text('official_description').notNull(),
    specifications: jsonb('specifications')
      .$type<JsonObject>()
      .default(sql`'{}'::jsonb`)
      .notNull(),
    unitOfMeasure: varchar('unit_of_measure', { length: 32 }).notNull(),
    maxUnitPriceCents: integer('max_unit_price_cents'),
    sourceReference: varchar('source_reference', { length: 240 }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex('program_items_catalog_code_uidx').on(table.catalogId, table.code),
    index('program_items_catalog_name_idx').on(table.catalogId, table.officialName),
    check('program_items_code_nonempty_chk', sql`length(trim(${table.code})) > 0`),
    check(
      'program_items_max_price_chk',
      sql`${table.maxUnitPriceCents} is null or ${table.maxUnitPriceCents} >= 0`,
    ),
    check(
      'program_items_specifications_object_chk',
      sql`jsonb_typeof(${table.specifications}) = 'object'`,
    ),
  ],
);

export const programItemStages = pgTable(
  'program_item_stages',
  {
    programItemId: uuid('program_item_id')
      .notNull()
      .references(() => programItems.id, { onDelete: 'restrict' }),
    stageId: uuid('stage_id')
      .notNull()
      .references(() => schoolStages.id, { onDelete: 'restrict' }),
    recommendedQuantity: integer('recommended_quantity').notNull(),
    maxQuantity: integer('max_quantity'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    primaryKey({ name: 'program_item_stages_pk', columns: [table.programItemId, table.stageId] }),
    index('program_item_stages_stage_idx').on(table.stageId, table.programItemId),
    check('program_item_stages_quantity_chk', sql`${table.recommendedQuantity} > 0`),
    check(
      'program_item_stages_max_quantity_chk',
      sql`${table.maxQuantity} is null or ${table.maxQuantity} >= ${table.recommendedQuantity}`,
    ),
  ],
);

export const variantProgramItems = pgTable(
  'variant_program_items',
  {
    variantId: uuid('variant_id')
      .notNull()
      .references(() => productVariants.id, { onDelete: 'restrict' }),
    programItemId: uuid('program_item_id')
      .notNull()
      .references(() => programItems.id, { onDelete: 'restrict' }),
    isApproved: boolean('is_approved').default(false).notNull(),
    approvedAt: timestamp('approved_at', { withTimezone: true }),
    approvedBy: uuid('approved_by').references(() => adminUsers.id, { onDelete: 'restrict' }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    primaryKey({
      name: 'variant_program_items_pk',
      columns: [table.variantId, table.programItemId],
    }),
    index('variant_program_items_program_item_idx').on(table.programItemId, table.variantId),
    index('variant_program_items_approved_variant_idx')
      .on(table.variantId, table.programItemId)
      .where(sql`${table.isApproved} = true`),
    check(
      'variant_program_items_approval_chk',
      sql`(${table.isApproved} = true and ${table.approvedAt} is not null and ${table.approvedBy} is not null) or (${table.isApproved} = false and ${table.approvedAt} is null and ${table.approvedBy} is null)`,
    ),
  ],
);

// ---------------------------------------------------------------------------
// Orders and immutable commercial snapshots
// ---------------------------------------------------------------------------

export const orders = pgTable(
  'orders',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    sequence: bigint('sequence', { mode: 'number' }).generatedAlwaysAsIdentity().notNull(),
    publicCode: varchar('public_code', { length: 9 }).notNull(),
    checkoutIdempotencyKey: uuid('checkout_idempotency_key').notNull(),
    commerceMode: varchar('commerce_mode', { length: 32 }).default('sme_duepay').notNull(),
    status: orderStatusEnum('status').default('awaiting_payment_link').notNull(),
    programCatalogId: uuid('program_catalog_id').notNull(),
    schoolStageId: uuid('school_stage_id').notNull(),

    responsibleName: varchar('responsible_name', { length: 160 }).notNull(),
    responsibleCpfEncrypted: text('responsible_cpf_encrypted').notNull(),
    responsibleCpfHash: char('responsible_cpf_hash', { length: 64 }).notNull(),
    responsibleCpfMasked: char('responsible_cpf_masked', { length: 14 }).notNull(),
    email: varchar('email', { length: 254 }).notNull(),
    phone: varchar('phone', { length: 11 }).notNull(),

    currency: char('currency', { length: 3 }).default('BRL').notNull(),
    subtotalCents: integer('subtotal_cents').notNull(),
    shippingCents: integer('shipping_cents').default(0).notNull(),
    totalCents: integer('total_cents').notNull(),
    benefitReferenceCents: integer('benefit_reference_cents').notNull(),
    notes: text('notes'),

    createdAt: createdAt(),
    updatedAt: updatedAt(),
    paidAt: timestamp('paid_at', { withTimezone: true }),
    cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
    deliveredAt: timestamp('delivered_at', { withTimezone: true }),
  },
  (table) => [
    uniqueIndex('orders_sequence_uidx').on(table.sequence),
    uniqueIndex('orders_public_code_uidx').on(table.publicCode),
    uniqueIndex('orders_checkout_idempotency_uidx').on(table.checkoutIdempotencyKey),
    index('orders_status_created_idx').on(table.status, table.createdAt, table.id),
    index('orders_stage_created_idx').on(table.schoolStageId, table.createdAt),
    index('orders_cpf_hash_idx').on(table.responsibleCpfHash, table.createdAt),
    index('orders_email_created_idx').on(sql`lower(${table.email})`, table.createdAt),
    foreignKey({
      name: 'orders_program_catalog_stage_fk',
      columns: [table.programCatalogId, table.schoolStageId],
      foreignColumns: [programCatalogStages.catalogId, programCatalogStages.stageId],
    }).onDelete('restrict'),
    check(
      'orders_public_code_format_chk',
      sql`${table.publicCode} ~ '^BG-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$'`,
    ),
    check('orders_commerce_mode_chk', sql`${table.commerceMode} = 'sme_duepay'`),
    check('orders_currency_chk', sql`${table.currency} = 'BRL'`),
    check('orders_subtotal_chk', sql`${table.subtotalCents} >= 0`),
    check('orders_shipping_free_chk', sql`${table.shippingCents} = 0`),
    check(
      'orders_total_chk',
      sql`${table.totalCents} = ${table.subtotalCents} + ${table.shippingCents}`,
    ),
    check('orders_benefit_reference_chk', sql`${table.benefitReferenceCents} >= 0`),
    check('orders_phone_chk', sql`${table.phone} ~ '^[0-9]{10,11}$'`),
    check('orders_cpf_hash_chk', sql`${table.responsibleCpfHash} ~ '^[0-9a-f]{64}$'`),
    check(
      'orders_timestamp_status_chk',
      sql`(${table.status} not in ('paid', 'preparing', 'out_for_delivery', 'delivered') or ${table.paidAt} is not null) and (${table.status} <> 'cancelled' or ${table.cancelledAt} is not null) and (${table.status} <> 'delivered' or ${table.deliveredAt} is not null)`,
    ),
  ],
);

export const orderAddresses = pgTable(
  'order_addresses',
  {
    orderId: uuid('order_id')
      .primaryKey()
      .references(() => orders.id, { onDelete: 'restrict' }),
    postalCode: char('postal_code', { length: 8 }).notNull(),
    street: varchar('street', { length: 160 }).notNull(),
    number: varchar('number', { length: 20 }).notNull(),
    complement: varchar('complement', { length: 80 }),
    district: varchar('district', { length: 80 }).notNull(),
    city: varchar('city', { length: 80 }).notNull(),
    state: char('state', { length: 2 }).notNull(),
    country: char('country', { length: 2 }).default('BR').notNull(),
    reviewStatus: text('review_status', { enum: ADDRESS_REVIEW_STATUSES })
      .default('pending')
      .notNull(),
    reviewReason: text('review_reason'),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
    reviewedBy: uuid('reviewed_by').references(() => adminUsers.id, { onDelete: 'restrict' }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    index('order_addresses_review_idx').on(table.reviewStatus, table.createdAt),
    check('order_addresses_postal_code_chk', sql`${table.postalCode} ~ '^[0-9]{8}$'`),
    check('order_addresses_state_chk', sql`${table.state} ~ '^[A-Z]{2}$'`),
    check('order_addresses_country_chk', sql`${table.country} = 'BR'`),
    check(
      'order_addresses_review_status_chk',
      sql`${table.reviewStatus} in ('pending', 'approved', 'rejected', 'manual_review')`,
    ),
    check(
      'order_addresses_review_consistency_chk',
      sql`(${table.reviewStatus} = 'pending' and ${table.reviewedAt} is null and ${table.reviewedBy} is null) or (${table.reviewStatus} <> 'pending' and ${table.reviewedAt} is not null)`,
    ),
  ],
);

export const orderConsents = pgTable(
  'order_consents',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    orderId: uuid('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'restrict' }),
    policyKey: varchar('policy_key', { length: 100 }).notNull(),
    policyVersion: varchar('policy_version', { length: 80 }).notNull(),
    documentHash: char('document_hash', { length: 64 }).notNull(),
    acceptedAt: timestamp('accepted_at', { withTimezone: true }).defaultNow().notNull(),
    createdAt: createdAt(),
  },
  (table) => [
    uniqueIndex('order_consents_order_policy_uidx').on(table.orderId, table.policyKey),
    index('order_consents_policy_version_idx').on(table.policyKey, table.policyVersion),
    check('order_consents_document_hash_chk', sql`${table.documentHash} ~ '^[0-9a-f]{64}$'`),
  ],
);

export const orderItems = pgTable(
  'order_items',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    orderId: uuid('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'restrict' }),
    lineNumber: smallint('line_number').notNull(),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'restrict' }),
    variantId: uuid('variant_id')
      .notNull()
      .references(() => productVariants.id, { onDelete: 'restrict' }),
    programItemId: uuid('program_item_id')
      .notNull()
      .references(() => programItems.id, { onDelete: 'restrict' }),

    productSlug: varchar('product_slug', { length: 120 }).notNull(),
    productName: varchar('product_name', { length: 240 }).notNull(),
    variantName: varchar('variant_name', { length: 160 }).notNull(),
    sku: varchar('sku', { length: 100 }).notNull(),
    brand: varchar('brand', { length: 160 }).notNull(),
    programItemCode: varchar('program_item_code', { length: 120 }).notNull(),
    programItemDescription: text('program_item_description').notNull(),
    unitPriceCents: integer('unit_price_cents').notNull(),
    quantity: integer('quantity').notNull(),
    lineTotalCents: integer('line_total_cents').notNull(),
    createdAt: createdAt(),
  },
  (table) => [
    uniqueIndex('order_items_order_line_uidx').on(table.orderId, table.lineNumber),
    index('order_items_variant_idx').on(table.variantId),
    index('order_items_program_item_idx').on(table.programItemId),
    foreignKey({
      name: 'order_items_variant_program_item_fk',
      columns: [table.variantId, table.programItemId],
      foreignColumns: [variantProgramItems.variantId, variantProgramItems.programItemId],
    }).onDelete('restrict'),
    check('order_items_line_number_chk', sql`${table.lineNumber} > 0`),
    check('order_items_unit_price_chk', sql`${table.unitPriceCents} >= 0`),
    check('order_items_quantity_chk', sql`${table.quantity} > 0`),
    check(
      'order_items_line_total_chk',
      sql`${table.lineTotalCents} = ${table.unitPriceCents} * ${table.quantity}`,
    ),
  ],
);

export const orderAccessTokens = pgTable(
  'order_access_tokens',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    orderId: uuid('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'restrict' }),
    tokenHash: char('token_hash', { length: 64 }).notNull(),
    createdAt: createdAt(),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
  },
  (table) => [
    uniqueIndex('order_access_tokens_hash_uidx').on(table.tokenHash),
    index('order_access_tokens_order_active_idx')
      .on(table.orderId, table.expiresAt)
      .where(sql`${table.revokedAt} is null`),
    check('order_access_tokens_hash_chk', sql`${table.tokenHash} ~ '^[0-9a-f]{64}$'`),
    check(
      'order_access_tokens_expiration_chk',
      sql`${table.expiresAt} is null or ${table.expiresAt} > ${table.createdAt}`,
    ),
  ],
);

export const orderEvents = pgTable(
  'order_events',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    orderId: uuid('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'restrict' }),
    eventType: varchar('event_type', { length: 100 }).notNull(),
    fromStatus: orderStatusEnum('from_status'),
    toStatus: orderStatusEnum('to_status').notNull(),
    actorKind: text('actor_kind', { enum: AUDIT_ACTOR_KINDS }).notNull(),
    actorAdminUserId: uuid('actor_admin_user_id').references(() => adminUsers.id, {
      onDelete: 'restrict',
    }),
    reason: text('reason'),
    publicMessage: text('public_message'),
    visibleToCustomer: boolean('visible_to_customer').default(false).notNull(),
    idempotencyKey: text('idempotency_key').notNull(),
    correlationId: uuid('correlation_id').notNull(),
    metadata: jsonb('metadata')
      .$type<JsonObject>()
      .default(sql`'{}'::jsonb`)
      .notNull(),
    occurredAt: timestamp('occurred_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('order_events_idempotency_uidx').on(table.idempotencyKey),
    index('order_events_order_time_idx').on(table.orderId, table.occurredAt, table.id),
    index('order_events_customer_timeline_idx')
      .on(table.orderId, table.occurredAt)
      .where(sql`${table.visibleToCustomer} = true`),
    index('order_events_correlation_idx').on(table.correlationId),
    check(
      'order_events_actor_kind_chk',
      sql`${table.actorKind} in ('admin', 'customer', 'system')`,
    ),
    check(
      'order_events_actor_consistency_chk',
      sql`(${table.actorKind} = 'admin' and ${table.actorAdminUserId} is not null) or (${table.actorKind} <> 'admin' and ${table.actorAdminUserId} is null)`,
    ),
    check(
      'order_events_transition_chk',
      sql`${table.fromStatus} is null or ${table.fromStatus} <> ${table.toStatus}`,
    ),
    check('order_events_metadata_object_chk', sql`jsonb_typeof(${table.metadata}) = 'object'`),
  ],
);

// ---------------------------------------------------------------------------
// Consolidated inventory, reservations and append-only movement ledger
// ---------------------------------------------------------------------------

export const inventoryItems = pgTable(
  'inventory_items',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    variantId: uuid('variant_id')
      .notNull()
      .references(() => productVariants.id, { onDelete: 'restrict' }),
    onHand: integer('on_hand').default(0).notNull(),
    reserved: integer('reserved').default(0).notNull(),
    lowStockThreshold: integer('low_stock_threshold').default(5).notNull(),
    version: integer('version').default(0).notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex('inventory_items_variant_uidx').on(table.variantId),
    index('inventory_items_available_idx').on(sql`(${table.onHand} - ${table.reserved})`),
    index('inventory_items_low_stock_idx')
      .on(sql`(${table.onHand} - ${table.reserved})`)
      .where(sql`(${table.onHand} - ${table.reserved}) <= ${table.lowStockThreshold}`),
    check('inventory_items_on_hand_chk', sql`${table.onHand} >= 0`),
    check('inventory_items_reserved_chk', sql`${table.reserved} >= 0`),
    check('inventory_items_available_chk', sql`${table.reserved} <= ${table.onHand}`),
    check('inventory_items_low_stock_threshold_chk', sql`${table.lowStockThreshold} >= 0`),
    check('inventory_items_version_chk', sql`${table.version} >= 0`),
  ],
);

export const inventoryReservations = pgTable(
  'inventory_reservations',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    inventoryItemId: uuid('inventory_item_id')
      .notNull()
      .references(() => inventoryItems.id, { onDelete: 'restrict' }),
    orderItemId: uuid('order_item_id')
      .notNull()
      .references(() => orderItems.id, { onDelete: 'restrict' }),
    quantity: integer('quantity').notNull(),
    status: text('status', { enum: RESERVATION_STATUSES }).default('active').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    consumedAt: timestamp('consumed_at', { withTimezone: true }),
    releasedAt: timestamp('released_at', { withTimezone: true }),
    releaseReason: text('release_reason'),
    idempotencyKey: text('idempotency_key').notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex('inventory_reservations_idempotency_uidx').on(table.idempotencyKey),
    uniqueIndex('inventory_reservations_active_order_item_uidx')
      .on(table.orderItemId)
      .where(sql`${table.status} = 'active'`),
    index('inventory_reservations_active_expiry_idx')
      .on(table.expiresAt, table.inventoryItemId)
      .where(sql`${table.status} = 'active'`),
    index('inventory_reservations_inventory_status_idx').on(table.inventoryItemId, table.status),
    check('inventory_reservations_quantity_chk', sql`${table.quantity} > 0`),
    check(
      'inventory_reservations_status_chk',
      sql`${table.status} in ('active', 'consumed', 'released', 'expired')`,
    ),
    check('inventory_reservations_expiry_chk', sql`${table.expiresAt} > ${table.createdAt}`),
    check(
      'inventory_reservations_lifecycle_chk',
      sql`(${table.status} = 'active' and ${table.consumedAt} is null and ${table.releasedAt} is null) or (${table.status} = 'consumed' and ${table.consumedAt} is not null and ${table.releasedAt} is null) or (${table.status} in ('released', 'expired') and ${table.releasedAt} is not null and ${table.consumedAt} is null)`,
    ),
  ],
);

export const inventoryMovements = pgTable(
  'inventory_movements',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    inventoryItemId: uuid('inventory_item_id')
      .notNull()
      .references(() => inventoryItems.id, { onDelete: 'restrict' }),
    reservationId: uuid('reservation_id').references(() => inventoryReservations.id, {
      onDelete: 'restrict',
    }),
    orderItemId: uuid('order_item_id').references(() => orderItems.id, { onDelete: 'restrict' }),
    type: text('type', { enum: INVENTORY_MOVEMENT_TYPES }).notNull(),
    onHandDelta: integer('on_hand_delta').default(0).notNull(),
    reservedDelta: integer('reserved_delta').default(0).notNull(),
    resultingOnHand: integer('resulting_on_hand').notNull(),
    resultingReserved: integer('resulting_reserved').notNull(),
    reason: text('reason').notNull(),
    actorAdminUserId: uuid('actor_admin_user_id').references(() => adminUsers.id, {
      onDelete: 'restrict',
    }),
    idempotencyKey: text('idempotency_key').notNull(),
    correlationId: uuid('correlation_id').notNull(),
    createdAt: createdAt(),
  },
  (table) => [
    uniqueIndex('inventory_movements_idempotency_uidx').on(table.idempotencyKey),
    index('inventory_movements_item_time_idx').on(table.inventoryItemId, table.createdAt, table.id),
    index('inventory_movements_order_item_idx').on(table.orderItemId),
    index('inventory_movements_reservation_idx').on(table.reservationId),
    index('inventory_movements_correlation_idx').on(table.correlationId),
    check(
      'inventory_movements_type_chk',
      sql`${table.type} in ('opening', 'receipt', 'reserve', 'release', 'consume', 'return', 'adjustment')`,
    ),
    check(
      'inventory_movements_nonzero_chk',
      sql`${table.type} = 'opening' or ${table.onHandDelta} <> 0 or ${table.reservedDelta} <> 0`,
    ),
    check('inventory_movements_result_on_hand_chk', sql`${table.resultingOnHand} >= 0`),
    check('inventory_movements_result_reserved_chk', sql`${table.resultingReserved} >= 0`),
    check(
      'inventory_movements_result_available_chk',
      sql`${table.resultingReserved} <= ${table.resultingOnHand}`,
    ),
    check('inventory_movements_reason_nonempty_chk', sql`length(trim(${table.reason})) > 0`),
  ],
);

// ---------------------------------------------------------------------------
// DUEPAY manual-link payment attempts and reconciliation
// ---------------------------------------------------------------------------

export const paymentAttempts = pgTable(
  'payment_attempts',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    orderId: uuid('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'restrict' }),
    attemptNumber: smallint('attempt_number').notNull(),
    provider: varchar('provider', { length: 40 }).default('duepay_manual').notNull(),
    providerReference: varchar('provider_reference', { length: 80 }).notNull(),
    status: paymentStatusEnum('status').default('awaiting_link').notNull(),
    amountCents: integer('amount_cents').notNull(),
    currency: char('currency', { length: 3 }).default('BRL').notNull(),
    sentChannel: text('sent_channel', { enum: PAYMENT_CHANNELS }),
    linkSentAt: timestamp('link_sent_at', { withTimezone: true }),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    externalReference: varchar('external_reference', { length: 240 }),
    authorizedAt: timestamp('authorized_at', { withTimezone: true }),
    declinedAt: timestamp('declined_at', { withTimezone: true }),
    expiredAt: timestamp('expired_at', { withTimezone: true }),
    cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
    refundedAt: timestamp('refunded_at', { withTimezone: true }),
    idempotencyKey: text('idempotency_key').notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex('payment_attempts_order_number_uidx').on(table.orderId, table.attemptNumber),
    uniqueIndex('payment_attempts_provider_reference_uidx').on(
      table.provider,
      table.providerReference,
    ),
    uniqueIndex('payment_attempts_idempotency_uidx').on(table.idempotencyKey),
    uniqueIndex('payment_attempts_active_order_uidx')
      .on(table.orderId)
      .where(
        sql`${table.status} in ('not_started', 'awaiting_link', 'link_sent', 'manual_review')`,
      ),
    uniqueIndex('payment_attempts_successful_order_uidx')
      .on(table.orderId)
      .where(sql`${table.status} in ('authorized', 'refunded')`),
    index('payment_attempts_status_created_idx').on(table.status, table.createdAt, table.id),
    index('payment_attempts_link_expiry_idx')
      .on(table.expiresAt, table.orderId)
      .where(sql`${table.status} = 'link_sent'`),
    check('payment_attempts_attempt_number_chk', sql`${table.attemptNumber} > 0`),
    check('payment_attempts_provider_chk', sql`${table.provider} = 'duepay_manual'`),
    check('payment_attempts_amount_chk', sql`${table.amountCents} >= 0`),
    check('payment_attempts_currency_chk', sql`${table.currency} = 'BRL'`),
    check(
      'payment_attempts_channel_chk',
      sql`${table.sentChannel} is null or ${table.sentChannel} in ('email', 'sms', 'whatsapp', 'other')`,
    ),
    check(
      'payment_attempts_link_sent_chk',
      sql`${table.status} not in ('link_sent', 'authorized', 'declined', 'expired', 'refunded') or ${table.linkSentAt} is not null`,
    ),
    check(
      'payment_attempts_expiration_chk',
      sql`${table.expiresAt} is null or (${table.linkSentAt} is not null and ${table.expiresAt} > ${table.linkSentAt})`,
    ),
    check(
      'payment_attempts_authorized_chk',
      sql`${table.status} not in ('authorized', 'refunded') or ${table.authorizedAt} is not null`,
    ),
    check(
      'payment_attempts_terminal_timestamp_chk',
      sql`(${table.status} <> 'declined' or ${table.declinedAt} is not null) and (${table.status} <> 'expired' or ${table.expiredAt} is not null) and (${table.status} <> 'cancelled' or ${table.cancelledAt} is not null) and (${table.status} <> 'refunded' or ${table.refundedAt} is not null)`,
    ),
  ],
);

export const paymentReconciliations = pgTable(
  'payment_reconciliations',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    paymentAttemptId: uuid('payment_attempt_id')
      .notNull()
      .references(() => paymentAttempts.id, { onDelete: 'restrict' }),
    result: paymentStatusEnum('result').notNull(),
    source: varchar('source', { length: 40 }).default('provider_portal').notNull(),
    confirmedAmountCents: integer('confirmed_amount_cents').notNull(),
    authorizationCode: varchar('authorization_code', { length: 160 }),
    providerNsu: varchar('provider_nsu', { length: 160 }),
    acquirerNsu: varchar('acquirer_nsu', { length: 160 }),
    externalReference: varchar('external_reference', { length: 240 }),
    deduplicationKey: char('deduplication_key', { length: 64 }).notNull(),
    checkedBy: uuid('checked_by')
      .notNull()
      .references(() => adminUsers.id, { onDelete: 'restrict' }),
    checkedAt: timestamp('checked_at', { withTimezone: true }).defaultNow().notNull(),
    notes: text('notes'),
    evidence: jsonb('evidence')
      .$type<JsonObject>()
      .default(sql`'{}'::jsonb`)
      .notNull(),
    idempotencyKey: text('idempotency_key').notNull(),
    correlationId: uuid('correlation_id').notNull(),
    createdAt: createdAt(),
  },
  (table) => [
    uniqueIndex('payment_reconciliations_deduplication_uidx').on(table.deduplicationKey),
    uniqueIndex('payment_reconciliations_idempotency_uidx').on(table.idempotencyKey),
    index('payment_reconciliations_attempt_time_idx').on(
      table.paymentAttemptId,
      table.checkedAt,
      table.id,
    ),
    index('payment_reconciliations_correlation_idx').on(table.correlationId),
    check(
      'payment_reconciliations_result_chk',
      sql`${table.result} in ('authorized', 'declined', 'cancelled', 'refunded', 'manual_review')`,
    ),
    check('payment_reconciliations_source_chk', sql`${table.source} = 'provider_portal'`),
    check('payment_reconciliations_confirmed_amount_chk', sql`${table.confirmedAmountCents} >= 0`),
    check(
      'payment_reconciliations_deduplication_key_chk',
      sql`${table.deduplicationKey} ~ '^[0-9a-f]{64}$'`,
    ),
    check(
      'payment_reconciliations_authorized_refs_chk',
      sql`${table.result} <> 'authorized' or (${table.authorizationCode} is not null and (${table.providerNsu} is not null or ${table.acquirerNsu} is not null))`,
    ),
    check(
      'payment_reconciliations_evidence_object_chk',
      sql`jsonb_typeof(${table.evidence}) = 'object'`,
    ),
  ],
);

// ---------------------------------------------------------------------------
// Cross-domain audit trail. Runtime repositories only append. Restricting
// UPDATE/DELETE with a dedicated application role remains a production gate.
// ---------------------------------------------------------------------------

export const auditEvents = pgTable(
  'audit_events',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    actorKind: text('actor_kind', { enum: AUDIT_ACTOR_KINDS }).notNull(),
    actorAdminUserId: uuid('actor_admin_user_id').references(() => adminUsers.id, {
      onDelete: 'restrict',
    }),
    action: varchar('action', { length: 160 }).notNull(),
    resourceType: varchar('resource_type', { length: 100 }).notNull(),
    resourceId: uuid('resource_id').notNull(),
    reason: text('reason'),
    before: jsonb('before').$type<JsonObject>(),
    after: jsonb('after').$type<JsonObject>(),
    metadata: jsonb('metadata')
      .$type<JsonObject>()
      .default(sql`'{}'::jsonb`)
      .notNull(),
    idempotencyKey: text('idempotency_key'),
    correlationId: uuid('correlation_id').notNull(),
    occurredAt: timestamp('occurred_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('audit_events_idempotency_uidx')
      .on(table.idempotencyKey)
      .where(sql`${table.idempotencyKey} is not null`),
    index('audit_events_resource_time_idx').on(
      table.resourceType,
      table.resourceId,
      table.occurredAt,
      table.id,
    ),
    index('audit_events_actor_time_idx').on(table.actorAdminUserId, table.occurredAt),
    index('audit_events_correlation_idx').on(table.correlationId),
    check(
      'audit_events_actor_kind_chk',
      sql`${table.actorKind} in ('admin', 'customer', 'system')`,
    ),
    check(
      'audit_events_actor_consistency_chk',
      sql`(${table.actorKind} = 'admin' and ${table.actorAdminUserId} is not null) or (${table.actorKind} <> 'admin' and ${table.actorAdminUserId} is null)`,
    ),
    check('audit_events_action_nonempty_chk', sql`length(trim(${table.action})) > 0`),
    check('audit_events_resource_type_nonempty_chk', sql`length(trim(${table.resourceType})) > 0`),
    check(
      'audit_events_before_object_chk',
      sql`${table.before} is null or jsonb_typeof(${table.before}) = 'object'`,
    ),
    check(
      'audit_events_after_object_chk',
      sql`${table.after} is null or jsonb_typeof(${table.after}) = 'object'`,
    ),
    check('audit_events_metadata_object_chk', sql`jsonb_typeof(${table.metadata}) = 'object'`),
  ],
);

export type AdminUser = typeof adminUsers.$inferSelect;
export type ProductRecord = typeof products.$inferSelect;
export type ProductVariantRecord = typeof productVariants.$inferSelect;
export type SchoolStageRecord = typeof schoolStages.$inferSelect;
export type ProgramCatalogRecord = typeof programCatalogs.$inferSelect;
export type OrderRecord = typeof orders.$inferSelect;
export type OrderItemRecord = typeof orderItems.$inferSelect;
export type InventoryItemRecord = typeof inventoryItems.$inferSelect;
export type PaymentAttemptRecord = typeof paymentAttempts.$inferSelect;
export type AuditEventRecord = typeof auditEvents.$inferSelect;

/**
 * Contadores do funil do site.
 *
 * Agregado por dia, sem cookie, identificador nem registro por visitante — a
 * tabela guarda apenas "quantas vezes isto aconteceu naquele dia". Mora no
 * PostgreSQL, e não num Redis à parte, porque o volume é de contadores diários
 * e o banco já está provisionado: uma dependência a menos para operar.
 *
 * `metric` diz qual é a dimensão e `key` o valor dentro dela:
 *
 * | metric     | key                                    |
 * | ---------- | -------------------------------------- |
 * | `step`     | etapa do funil (`session`, `add_to_cart`…) |
 * | `source`   | origem do tráfego (`instagram`, `direct`…) |
 * | `location` | cidade aproximada (`São Paulo, BR`)    |
 * | `product`  | `<slug-do-produto>:<etapa>`            |
 */
export const funnelCounters = pgTable(
  'funnel_counters',
  {
    day: date('day').notNull(),
    metric: varchar('metric', { length: 16 }).notNull(),
    key: varchar('key', { length: 140 }).notNull(),
    total: integer('total').default(0).notNull(),
    updatedAt: updatedAt(),
  },
  (table) => [
    primaryKey({ columns: [table.day, table.metric, table.key] }),
    index('funnel_counters_metric_day_idx').on(table.metric, table.day),
    check('funnel_counters_total_chk', sql`${table.total} >= 0`),
    check(
      'funnel_counters_metric_chk',
      sql`${table.metric} in ('step', 'source', 'location', 'product')`,
    ),
  ],
);

// ---------------------------------------------------------------------------
// Rate limiting
// ---------------------------------------------------------------------------

/**
 * Fixed-window request counters.
 *
 * Lives in the database on purpose: the site runs on serverless functions, so
 * an in-memory counter only limits whoever happens to land on the same warm
 * instance. The bucket key is already hashed by the caller — no raw address is
 * ever written here.
 */
export const rateLimitCounters = pgTable(
  'rate_limit_counters',
  {
    scope: varchar('scope', { length: 40 }).notNull(),
    bucket: char('bucket', { length: 64 }).notNull(),
    windowStart: timestamp('window_start', { withTimezone: true }).notNull(),
    hits: integer('hits').default(0).notNull(),
    updatedAt: updatedAt(),
  },
  (table) => [
    primaryKey({ columns: [table.scope, table.bucket, table.windowStart] }),
    // Sweeping expired windows is a range scan over this index.
    index('rate_limit_counters_window_idx').on(table.windowStart),
    check('rate_limit_counters_hits_chk', sql`${table.hits} >= 0`),
    check('rate_limit_counters_bucket_chk', sql`${table.bucket} ~ '^[0-9a-f]{64}$'`),
  ],
);
