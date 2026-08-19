export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type ProductStatus = 'draft' | 'active' | 'archived';
export type OrderStatus = 'pending' | 'paid' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';
export type AddressType = 'shipping' | 'billing';
export type AdminRole = 'admin' | 'viewer';
export type InventoryReason =
  | 'order_paid'
  | 'order_cancelled'
  | 'order_refunded'
  | 'manual_adjustment'
  | 'restock';

export interface Database {
  public: {
    Tables: {
      products: {
        Row: {
          id: string;
          slug: string;
          name: string;
          description: string | null;
          status: ProductStatus;
          is_featured: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          name: string;
          description?: string | null;
          status?: ProductStatus;
          is_featured?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['products']['Insert']>;
        Relationships: [];
      };
      product_variants: {
        Row: {
          id: string;
          product_id: string;
          sku: string;
          name: string;
          price_cents: number;
          compare_at_price_cents: number | null;
          stock_qty: number;
          low_stock_threshold: number;
          weight_grams: number | null;
          attributes: Json;
          is_default: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          product_id: string;
          sku: string;
          name: string;
          price_cents: number;
          compare_at_price_cents?: number | null;
          stock_qty?: number;
          low_stock_threshold?: number;
          weight_grams?: number | null;
          attributes?: Json;
          is_default?: boolean;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['product_variants']['Insert']>;
        Relationships: [];
      };
      product_images: {
        Row: {
          id: string;
          product_id: string;
          url: string;
          alt: string | null;
          sort_order: number;
        };
        Insert: {
          id?: string;
          product_id: string;
          url: string;
          alt?: string | null;
          sort_order?: number;
        };
        Update: Partial<Database['public']['Tables']['product_images']['Insert']>;
        Relationships: [];
      };
      categories: {
        Row: {
          id: string;
          slug: string;
          name: string;
          parent_id: string | null;
          sort_order: number;
        };
        Insert: {
          id?: string;
          slug: string;
          name: string;
          parent_id?: string | null;
          sort_order?: number;
        };
        Update: Partial<Database['public']['Tables']['categories']['Insert']>;
        Relationships: [];
      };
      product_categories: {
        Row: {
          product_id: string;
          category_id: string;
        };
        Insert: {
          product_id: string;
          category_id: string;
        };
        Update: Partial<Database['public']['Tables']['product_categories']['Insert']>;
        Relationships: [];
      };
      customers: {
        Row: {
          id: string;
          auth_user_id: string | null;
          email: string;
          full_name: string | null;
          phone: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          auth_user_id?: string | null;
          email: string;
          full_name?: string | null;
          phone?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['customers']['Insert']>;
        Relationships: [];
      };
      addresses: {
        Row: {
          id: string;
          customer_id: string;
          type: AddressType;
          line1: string;
          line2: string | null;
          city: string;
          state: string;
          postal_code: string;
          country: string;
          is_default: boolean;
        };
        Insert: {
          id?: string;
          customer_id: string;
          type?: AddressType;
          line1: string;
          line2?: string | null;
          city: string;
          state: string;
          postal_code: string;
          country?: string;
          is_default?: boolean;
        };
        Update: Partial<Database['public']['Tables']['addresses']['Insert']>;
        Relationships: [];
      };
      orders: {
        Row: {
          id: string;
          order_number: number;
          customer_id: string | null;
          email: string;
          status: OrderStatus;
          square_checkout_id: string | null;
          square_order_id: string | null;
          square_payment_id: string | null;
          subtotal_cents: number;
          tax_cents: number;
          shipping_cents: number;
          total_cents: number;
          shipping_address: Json | null;
          billing_address: Json | null;
          notes: string | null;
          created_at: string;
          paid_at: string | null;
          shipped_at: string | null;
        };
        Insert: {
          id?: string;
          order_number?: number;
          customer_id?: string | null;
          email: string;
          status?: OrderStatus;
          square_checkout_id?: string | null;
          square_order_id?: string | null;
          square_payment_id?: string | null;
          subtotal_cents: number;
          tax_cents?: number;
          shipping_cents?: number;
          total_cents: number;
          shipping_address?: Json | null;
          billing_address?: Json | null;
          notes?: string | null;
          created_at?: string;
          paid_at?: string | null;
          shipped_at?: string | null;
        };
        Update: Partial<Database['public']['Tables']['orders']['Insert']>;
        Relationships: [];
      };
      order_items: {
        Row: {
          id: string;
          order_id: string;
          variant_id: string | null;
          product_name: string;
          variant_name: string;
          sku: string;
          unit_price_cents: number;
          quantity: number;
          line_total_cents: number;
        };
        Insert: {
          id?: string;
          order_id: string;
          variant_id?: string | null;
          product_name: string;
          variant_name: string;
          sku: string;
          unit_price_cents: number;
          quantity: number;
          line_total_cents: number;
        };
        Update: Partial<Database['public']['Tables']['order_items']['Insert']>;
        Relationships: [];
      };
      admin_users: {
        Row: {
          id: string;
          auth_user_id: string;
          email: string;
          full_name: string | null;
          role: AdminRole;
          created_at: string;
        };
        Insert: {
          id?: string;
          auth_user_id: string;
          email: string;
          full_name?: string | null;
          role?: AdminRole;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['admin_users']['Insert']>;
        Relationships: [];
      };
      inventory_movements: {
        Row: {
          id: string;
          variant_id: string;
          delta: number;
          reason: InventoryReason;
          reference_id: string | null;
          notes: string | null;
          created_at: string;
          created_by: string | null;
        };
        Insert: {
          id?: string;
          variant_id: string;
          delta: number;
          reason: InventoryReason;
          reference_id?: string | null;
          notes?: string | null;
          created_at?: string;
          created_by?: string | null;
        };
        Update: Partial<Database['public']['Tables']['inventory_movements']['Insert']>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      mark_order_paid: {
        Args: {
          p_checkout_id: string;
          p_payment_id: string;
        };
        Returns: Json;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
