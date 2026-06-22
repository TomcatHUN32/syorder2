import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Database = {
  public: {
    Tables: {
      tenants: {
        Row: {
          id: string;
          slug: string;
          name: string;
          logo_url: string | null;
          primary_color: string;
          secondary_color: string;
          accent_color: string;
          address: string | null;
          phone: string | null;
          email: string | null;
          is_active: boolean;
          subscription_plan: string;
          subscription_ends_at: string | null;
          settings: Record<string, unknown>;
          delivery_cities: string[];
          cuisines: string[];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          name: string;
          logo_url?: string | null;
          primary_color?: string;
          secondary_color?: string;
          accent_color?: string;
          address?: string | null;
          phone?: string | null;
          email?: string | null;
          is_active?: boolean;
          subscription_plan?: string;
          subscription_ends_at?: string | null;
          settings?: Record<string, unknown>;
          delivery_cities?: string[];
          cuisines?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          name?: string;
          logo_url?: string | null;
          primary_color?: string;
          secondary_color?: string;
          accent_color?: string;
          address?: string | null;
          phone?: string | null;
          email?: string | null;
          is_active?: boolean;
          subscription_plan?: string;
          subscription_ends_at?: string | null;
          settings?: Record<string, unknown>;
          delivery_cities?: string[];
          cuisines?: string[];
          created_at?: string;
          updated_at?: string;
        };
      };
      users: {
        Row: {
          id: string;
          tenant_id: string;
          email: string;
          full_name: string | null;
          role: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          email: string;
          full_name?: string | null;
          role?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          email?: string;
          full_name?: string | null;
          role?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      menu_categories: {
        Row: {
          id: string;
          tenant_id: string;
          name: string;
          description: string | null;
          display_order: number;
          is_active: boolean;
          image_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          name: string;
          description?: string | null;
          display_order?: number;
          is_active?: boolean;
          image_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          name?: string;
          description?: string | null;
          display_order?: number;
          is_active?: boolean;
          image_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      menu_items: {
        Row: {
          id: string;
          tenant_id: string;
          category_id: string | null;
          name: string;
          description: string | null;
          price: number;
          image_url: string | null;
          is_available: boolean;
          preparation_time_minutes: number;
          display_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          category_id?: string | null;
          name: string;
          description?: string | null;
          price: number;
          image_url?: string | null;
          is_available?: boolean;
          preparation_time_minutes?: number;
          display_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          category_id?: string | null;
          name?: string;
          description?: string | null;
          price?: number;
          image_url?: string | null;
          is_available?: boolean;
          preparation_time_minutes?: number;
          display_order?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      ingredients: {
        Row: {
          id: string;
          tenant_id: string;
          name: string;
          unit: string;
          current_stock: number;
          min_stock_threshold: number;
          cost_per_unit: number | null;
          supplier: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          name: string;
          unit: string;
          current_stock?: number;
          min_stock_threshold?: number;
          cost_per_unit?: number | null;
          supplier?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          name?: string;
          unit?: string;
          current_stock?: number;
          min_stock_threshold?: number;
          cost_per_unit?: number | null;
          supplier?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      recipe_ingredients: {
        Row: {
          id: string;
          tenant_id: string;
          menu_item_id: string;
          ingredient_id: string;
          quantity: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          menu_item_id: string;
          ingredient_id: string;
          quantity: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          menu_item_id?: string;
          ingredient_id?: string;
          quantity?: number;
          created_at?: string;
        };
      };
      customers: {
        Row: {
          id: string;
          tenant_id: string;
          email: string | null;
          phone: string | null;
          name: string | null;
          loyalty_points: number;
          total_spent: number;
          total_orders: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          email?: string | null;
          phone?: string | null;
          name?: string | null;
          loyalty_points?: number;
          total_spent?: number;
          total_orders?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          email?: string | null;
          phone?: string | null;
          name?: string | null;
          loyalty_points?: number;
          total_spent?: number;
          total_orders?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      orders: {
        Row: {
          id: string;
          tenant_id: string;
          customer_id: string | null;
          order_number: string;
          status: string;
          order_type: string;
          table_number: string | null;
          subtotal: number;
          tax: number;
          discount: number;
          total: number;
          notes: string | null;
          loyalty_points_earned: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          customer_id?: string | null;
          order_number: string;
          status?: string;
          order_type?: string;
          table_number?: string | null;
          subtotal: number;
          tax?: number;
          discount?: number;
          total: number;
          notes?: string | null;
          loyalty_points_earned?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          customer_id?: string | null;
          order_number?: string;
          status?: string;
          order_type?: string;
          table_number?: string | null;
          subtotal?: number;
          tax?: number;
          discount?: number;
          total?: number;
          notes?: string | null;
          loyalty_points_earned?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      order_items: {
        Row: {
          id: string;
          tenant_id: string;
          order_id: string;
          menu_item_id: string | null;
          quantity: number;
          unit_price: number;
          total_price: number;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          order_id: string;
          menu_item_id?: string | null;
          quantity: number;
          unit_price: number;
          total_price: number;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          order_id?: string;
          menu_item_id?: string | null;
          quantity?: number;
          unit_price?: number;
          total_price?: number;
          notes?: string | null;
          created_at?: string;
        };
      };
      loyalty_transactions: {
        Row: {
          id: string;
          tenant_id: string;
          customer_id: string;
          order_id: string | null;
          points: number;
          transaction_type: string;
          description: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          customer_id: string;
          order_id?: string | null;
          points: number;
          transaction_type: string;
          description?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          customer_id?: string;
          order_id?: string | null;
          points?: number;
          transaction_type?: string;
          description?: string | null;
          created_at?: string;
        };
      };
      inventory_transactions: {
        Row: {
          id: string;
          tenant_id: string;
          ingredient_id: string;
          quantity: number;
          transaction_type: string;
          reference_type: string | null;
          reference_id: string | null;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          ingredient_id: string;
          quantity: number;
          transaction_type: string;
          reference_type?: string | null;
          reference_id?: string | null;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          ingredient_id?: string;
          quantity?: number;
          transaction_type?: string;
          reference_type?: string | null;
          reference_id?: string | null;
          notes?: string | null;
          created_at?: string;
        };
      };
      daily_stats: {
        Row: {
          id: string;
          tenant_id: string;
          date: string;
          total_orders: number;
          total_revenue: number;
          total_customers: number;
          new_customers: number;
          avg_order_value: number | null;
          top_selling_items: Record<string, unknown>;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          date: string;
          total_orders?: number;
          total_revenue?: number;
          total_customers?: number;
          new_customers?: number;
          avg_order_value?: number | null;
          top_selling_items?: Record<string, unknown>;
          created_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          date?: string;
          total_orders?: number;
          total_revenue?: number;
          total_customers?: number;
          new_customers?: number;
          avg_order_value?: number | null;
          top_selling_items?: Record<string, unknown>;
          created_at?: string;
        };
      };
      restaurant_requests: {
        Row: {
          id: string;
          business_name: string;
          contact_name: string;
          email: string;
          phone: string | null;
          address: string | null;
          city: string | null;
          message: string | null;
          status: string;
          subdomain: string | null;
          notes: string | null;
          plan: string | null;
          billing_period: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_name: string;
          contact_name: string;
          email: string;
          phone?: string | null;
          address?: string | null;
          city?: string | null;
          message?: string | null;
          status?: string;
          subdomain?: string | null;
          notes?: string | null;
          plan?: string | null;
          billing_period?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          business_name?: string;
          contact_name?: string;
          email?: string;
          phone?: string | null;
          address?: string | null;
          city?: string | null;
          message?: string | null;
          status?: string;
          subdomain?: string | null;
          notes?: string | null;
          plan?: string | null;
          billing_period?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      platform_reviews: {
        Row: {
          id: string;
          tenant_id: string | null;
          rating: number;
          comment: string | null;
          reviewer_name: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id?: string | null;
          rating: number;
          comment?: string | null;
          reviewer_name?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string | null;
          rating?: number;
          comment?: string | null;
          reviewer_name?: string;
          created_at?: string;
        };
      };
      subscriptions: {
        Row: {
          id: string;
          tenant_id: string;
          plan_name: string;
          status: string;
          starts_at: string;
          expires_at: string | null;
          billing_period: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          plan_name?: string;
          status?: string;
          starts_at?: string;
          expires_at?: string | null;
          billing_period?: string | null;
        };
        Update: {
          plan_name?: string;
          status?: string;
          expires_at?: string | null;
          billing_period?: string | null;
        };
      };
    };
  };
};

export type Tenant = Database['public']['Tables']['tenants']['Row'];
export type User = Database['public']['Tables']['users']['Row'];
export type MenuCategory = Database['public']['Tables']['menu_categories']['Row'];
export type MenuItem = Database['public']['Tables']['menu_items']['Row'];
export type Ingredient = Database['public']['Tables']['ingredients']['Row'];
export type RecipeIngredient = Database['public']['Tables']['recipe_ingredients']['Row'];
export type Customer = Database['public']['Tables']['customers']['Row'];
export type Order = Database['public']['Tables']['orders']['Row'];
export type OrderItem = Database['public']['Tables']['order_items']['Row'];
export type LoyaltyTransaction = Database['public']['Tables']['loyalty_transactions']['Row'];
export type InventoryTransaction = Database['public']['Tables']['inventory_transactions']['Row'];
export type DailyStat = Database['public']['Tables']['daily_stats']['Row'];
export type RestaurantRequest = Database['public']['Tables']['restaurant_requests']['Row'];
export type PlatformReview = Database['public']['Tables']['platform_reviews']['Row'];
export type Subscription = Database['public']['Tables']['subscriptions']['Row'];

export type OrderWithItems = Order & { order_items: (OrderItem & { menu_item: MenuItem | null })[] };
export type MenuItemWithCategory = MenuItem & { category: MenuCategory | null };
export type IngredientWithAlert = Ingredient & { is_low_stock: boolean; stock_percentage: number };
