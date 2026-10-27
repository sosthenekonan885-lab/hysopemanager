export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      agencies: {
        Row: {
          created_at: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          action: string
          at: string
          id: number
          new_data: Json | null
          old_data: Json | null
          record_id: string | null
          table_name: string
          user_id: string | null
        }
        Insert: {
          action: string
          at?: string
          id?: number
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name: string
          user_id?: string | null
        }
        Update: {
          action?: string
          at?: string
          id?: number
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name?: string
          user_id?: string | null
        }
        Relationships: []
      }
      cash_closings: {
        Row: {
          closed_at: string | null
          closed_by: string | null
          counted: number
          date: string
          gap: number
          id: string
          opening: number
          reason: string | null
          theoretical: number
        }
        Insert: {
          closed_at?: string | null
          closed_by?: string | null
          counted: number
          date: string
          gap: number
          id?: string
          opening: number
          reason?: string | null
          theoretical: number
        }
        Update: {
          closed_at?: string | null
          closed_by?: string | null
          counted?: number
          date?: string
          gap?: number
          id?: string
          opening?: number
          reason?: string | null
          theoretical?: number
        }
        Relationships: []
      }
      cash_movements: {
        Row: {
          amount: number
          created_at: string | null
          created_by: string | null
          date: string
          description: string | null
          id: string
          kind: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          created_by?: string | null
          date?: string
          description?: string | null
          id?: string
          kind: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          created_by?: string | null
          date?: string
          description?: string | null
          id?: string
          kind?: string
        }
        Relationships: []
      }
      clients: {
        Row: {
          address: string | null
          agency_id: string | null
          contact_person: string | null
          contact_phone: string | null
          created_at: string | null
          created_by: string | null
          delivery_eligible: boolean
          establishment_type: string | null
          id: string
          is_pro: boolean
          name: string
          notes: string | null
          phone: string | null
          quartier: string | null
          title: string | null
          whatsapp: string | null
        }
        Insert: {
          address?: string | null
          agency_id?: string | null
          contact_person?: string | null
          contact_phone?: string | null
          created_at?: string | null
          created_by?: string | null
          delivery_eligible?: boolean
          establishment_type?: string | null
          id?: string
          is_pro?: boolean
          name: string
          notes?: string | null
          phone?: string | null
          quartier?: string | null
          title?: string | null
          whatsapp?: string | null
        }
        Update: {
          address?: string | null
          agency_id?: string | null
          contact_person?: string | null
          contact_phone?: string | null
          created_at?: string | null
          created_by?: string | null
          delivery_eligible?: boolean
          establishment_type?: string | null
          id?: string
          is_pro?: boolean
          name?: string
          notes?: string | null
          phone?: string | null
          quartier?: string | null
          title?: string | null
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      complaints: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          final_comment: string | null
          id: string
          item: string | null
          order_id: string
          solution: string | null
          status: string
          type: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          final_comment?: string | null
          id?: string
          item?: string | null
          order_id: string
          solution?: string | null
          status?: string
          type: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          final_comment?: string | null
          id?: string
          item?: string | null
          order_id?: string
          solution?: string | null
          status?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "complaints_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "order_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "complaints_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_categories: {
        Row: {
          id: string
          name: string
        }
        Insert: {
          id?: string
          name: string
        }
        Update: {
          id?: string
          name?: string
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount: number
          category_id: string | null
          created_at: string | null
          created_by: string | null
          date: string
          description: string | null
          id: string
          method: Database["public"]["Enums"]["pay_method"]
        }
        Insert: {
          amount: number
          category_id?: string | null
          created_at?: string | null
          created_by?: string | null
          date?: string
          description?: string | null
          id?: string
          method?: Database["public"]["Enums"]["pay_method"]
        }
        Update: {
          amount?: number
          category_id?: string | null
          created_at?: string | null
          created_by?: string | null
          date?: string
          description?: string | null
          id?: string
          method?: Database["public"]["Enums"]["pay_method"]
        }
        Relationships: [
          {
            foreignKeyName: "expenses_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "expense_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          order_id: string | null
          read: boolean
          title: string
          treated: boolean
          type: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          order_id?: string | null
          read?: boolean
          title: string
          treated?: boolean
          type: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          order_id?: string | null
          read?: boolean
          title?: string
          treated?: boolean
          type?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          colors: string[]
          designation: string
          id: string
          observation: string | null
          order_id: string
          quantity: number
          ready: boolean
          service_id: string | null
          unit_price: number
        }
        Insert: {
          colors?: string[]
          designation: string
          id?: string
          observation?: string | null
          order_id: string
          quantity?: number
          ready?: boolean
          service_id?: string | null
          unit_price: number
        }
        Update: {
          colors?: string[]
          designation?: string
          id?: string
          observation?: string | null
          order_id?: string
          quantity?: number
          ready?: boolean
          service_id?: string | null
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "order_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      order_requests: {
        Row: {
          amount: number | null
          decided_at: string | null
          decided_by: string | null
          final_total: number | null
          id: string
          initial_total: number | null
          kind: string
          order_id: string
          percent: number | null
          reason: string | null
          requested_at: string
          requested_by: string | null
          status: Database["public"]["Enums"]["request_status"]
        }
        Insert: {
          amount?: number | null
          decided_at?: string | null
          decided_by?: string | null
          final_total?: number | null
          id?: string
          initial_total?: number | null
          kind: string
          order_id: string
          percent?: number | null
          reason?: string | null
          requested_at?: string
          requested_by?: string | null
          status?: Database["public"]["Enums"]["request_status"]
        }
        Update: {
          amount?: number | null
          decided_at?: string | null
          decided_by?: string | null
          final_total?: number | null
          id?: string
          initial_total?: number | null
          kind?: string
          order_id?: string
          percent?: number | null
          reason?: string | null
          requested_at?: string
          requested_by?: string | null
          status?: Database["public"]["Enums"]["request_status"]
        }
        Relationships: [
          {
            foreignKeyName: "order_requests_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "order_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_requests_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          agency_id: string | null
          bag_code: string | null
          cancel_reason: string | null
          client_id: string
          created_at: string
          created_by: string | null
          delivered_at: string | null
          deliverer: string | null
          delivery_mode: string
          discount: number
          id: string
          legacy: boolean
          locker_code: string | null
          notes: string | null
          number: number
          pickup_date: string | null
          ready_at: string | null
          receipt_presented: boolean | null
          receipt_type: string
          status: Database["public"]["Enums"]["order_status"]
          total: number
          withdrawn_at: string | null
          withdrawn_by: string | null
        }
        Insert: {
          agency_id?: string | null
          bag_code?: string | null
          cancel_reason?: string | null
          client_id: string
          created_at?: string
          created_by?: string | null
          delivered_at?: string | null
          deliverer?: string | null
          delivery_mode?: string
          discount?: number
          id?: string
          legacy?: boolean
          locker_code?: string | null
          notes?: string | null
          number?: number
          pickup_date?: string | null
          ready_at?: string | null
          receipt_presented?: boolean | null
          receipt_type?: string
          status?: Database["public"]["Enums"]["order_status"]
          total?: number
          withdrawn_at?: string | null
          withdrawn_by?: string | null
        }
        Update: {
          agency_id?: string | null
          bag_code?: string | null
          cancel_reason?: string | null
          client_id?: string
          created_at?: string
          created_by?: string | null
          delivered_at?: string | null
          deliverer?: string | null
          delivery_mode?: string
          discount?: number
          id?: string
          legacy?: boolean
          locker_code?: string | null
          notes?: string | null
          number?: number
          pickup_date?: string | null
          ready_at?: string | null
          receipt_presented?: boolean | null
          receipt_type?: string
          status?: Database["public"]["Enums"]["order_status"]
          total?: number
          withdrawn_at?: string | null
          withdrawn_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          cash_confirmed_at: string | null
          cash_confirmed_by: string | null
          context: string
          created_at: string
          created_by: string | null
          deliverer: string | null
          id: string
          method: Database["public"]["Enums"]["pay_method"]
          order_id: string
        }
        Insert: {
          amount: number
          cash_confirmed_at?: string | null
          cash_confirmed_by?: string | null
          context?: string
          created_at?: string
          created_by?: string | null
          deliverer?: string | null
          id?: string
          method: Database["public"]["Enums"]["pay_method"]
          order_id: string
        }
        Update: {
          amount?: number
          cash_confirmed_at?: string | null
          cash_confirmed_by?: string | null
          context?: string
          created_at?: string
          created_by?: string | null
          deliverer?: string | null
          id?: string
          method?: Database["public"]["Enums"]["pay_method"]
          order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "order_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      price_categories: {
        Row: {
          active: boolean
          id: string
          name: string
          sort: number
        }
        Insert: {
          active?: boolean
          id?: string
          name: string
          sort?: number
        }
        Update: {
          active?: boolean
          id?: string
          name?: string
          sort?: number
        }
        Relationships: []
      }
      price_history: {
        Row: {
          changed_at: string | null
          changed_by: string | null
          id: string
          new_price: number | null
          old_price: number | null
          service_id: string
        }
        Insert: {
          changed_at?: string | null
          changed_by?: string | null
          id?: string
          new_price?: number | null
          old_price?: number | null
          service_id: string
        }
        Update: {
          changed_at?: string | null
          changed_by?: string | null
          id?: string
          new_price?: number | null
          old_price?: number | null
          service_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "price_history_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          active: boolean
          agency_id: string | null
          created_at: string | null
          failed_attempts: number
          full_name: string
          id: string
          locked: boolean
          username: string
        }
        Insert: {
          active?: boolean
          agency_id?: string | null
          created_at?: string | null
          failed_attempts?: number
          full_name: string
          id: string
          locked?: boolean
          username: string
        }
        Update: {
          active?: boolean
          agency_id?: string | null
          created_at?: string | null
          failed_attempts?: number
          full_name?: string
          id?: string
          locked?: boolean
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          active: boolean
          category_id: string
          id: string
          name: string
          price: number | null
          price_max: number | null
          sort: number
          variable: boolean
        }
        Insert: {
          active?: boolean
          category_id: string
          id?: string
          name: string
          price?: number | null
          price_max?: number | null
          sort?: number
          variable?: boolean
        }
        Update: {
          active?: boolean
          category_id?: string
          id?: string
          name?: string
          price?: number | null
          price_max?: number | null
          sort?: number
          variable?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "services_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "price_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      settings: {
        Row: {
          key: string
          value: Json
        }
        Insert: {
          key: string
          value: Json
        }
        Update: {
          key?: string
          value?: Json
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      withdrawals: {
        Row: {
          amount: number
          client_name: string
          created_at: string
          created_by: string | null
          date: string
          id: string
          order_id: string | null
          receipt_no: number
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          amount?: number
          client_name: string
          created_at?: string
          created_by?: string | null
          date?: string
          id?: string
          order_id?: string | null
          receipt_no: number
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          amount?: number
          client_name?: string
          created_at?: string
          created_by?: string | null
          date?: string
          id?: string
          order_id?: string | null
          receipt_no?: number
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "withdrawals_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "order_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "withdrawals_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      order_summary: {
        Row: {
          agency_id: string | null
          bag_code: string | null
          balance: number | null
          cancel_reason: string | null
          client_address: string | null
          client_id: string | null
          client_name: string | null
          client_phone: string | null
          client_quartier: string | null
          created_at: string | null
          created_by: string | null
          delivered_at: string | null
          deliverer: string | null
          delivery_mode: string | null
          discount: number | null
          final_total: number | null
          id: string | null
          locker_code: string | null
          number: number | null
          paid: number | null
          pickup_date: string | null
          ready_at: string | null
          receipt_presented: boolean | null
          status: Database["public"]["Enums"]["order_status"] | null
          total: number | null
          withdrawn_at: string | null
          withdrawn_by: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      is_staff: { Args: never; Returns: boolean }
      next_bag_code: { Args: never; Returns: string }
    }
    Enums: {
      app_role: "admin" | "gerante"
      order_status:
        | "en_cours"
        | "pret"
        | "retire"
        | "a_livrer"
        | "livre"
        | "annule"
      pay_method: "especes" | "wave" | "orange_money"
      request_status: "en_attente" | "approuvee" | "refusee"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "gerante"],
      order_status: [
        "en_cours",
        "pret",
        "retire",
        "a_livrer",
        "livre",
        "annule",
      ],
      pay_method: ["especes", "wave", "orange_money"],
      request_status: ["en_attente", "approuvee", "refusee"],
    },
  },
} as const
