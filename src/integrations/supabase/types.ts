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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      club_games: {
        Row: {
          actions: Json
          category: string
          club_id: string
          court_time_ms: Json
          created_at: string
          current_quarter: string
          date: string
          game_start_timestamp: number | null
          id: string
          is_home: boolean | null
          last_timer_snapshot: number | null
          leg: string | null
          on_court_player_ids: Json
          opponent_name: string
          opponent_scores: Json
          opponent_team_id: string | null
          roster: Json
          shots: Json
          substitutions: Json
          tournament_id: string | null
          user_id: string
        }
        Insert: {
          actions?: Json
          category?: string
          club_id: string
          court_time_ms?: Json
          created_at?: string
          current_quarter?: string
          date?: string
          game_start_timestamp?: number | null
          id?: string
          is_home?: boolean | null
          last_timer_snapshot?: number | null
          leg?: string | null
          on_court_player_ids?: Json
          opponent_name: string
          opponent_scores?: Json
          opponent_team_id?: string | null
          roster?: Json
          shots?: Json
          substitutions?: Json
          tournament_id?: string | null
          user_id: string
        }
        Update: {
          actions?: Json
          category?: string
          club_id?: string
          court_time_ms?: Json
          created_at?: string
          current_quarter?: string
          date?: string
          game_start_timestamp?: number | null
          id?: string
          is_home?: boolean | null
          last_timer_snapshot?: number | null
          leg?: string | null
          on_court_player_ids?: Json
          opponent_name?: string
          opponent_scores?: Json
          opponent_team_id?: string | null
          roster?: Json
          shots?: Json
          substitutions?: Json
          tournament_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      club_players: {
        Row: {
          club_id: string
          created_at: string
          id: string
          name: string
          number: number
          user_id: string
        }
        Insert: {
          club_id: string
          created_at?: string
          id?: string
          name: string
          number: number
          user_id: string
        }
        Update: {
          club_id?: string
          created_at?: string
          id?: string
          name?: string
          number?: number
          user_id?: string
        }
        Relationships: []
      }
      club_rival_teams: {
        Row: {
          city: string
          club_id: string
          club_name: string
          created_at: string
          id: string
          region: string
          user_id: string
        }
        Insert: {
          city?: string
          club_id: string
          club_name: string
          created_at?: string
          id?: string
          region?: string
          user_id: string
        }
        Update: {
          city?: string
          club_id?: string
          club_name?: string
          created_at?: string
          id?: string
          region?: string
          user_id?: string
        }
        Relationships: []
      }
      club_tournaments: {
        Row: {
          club_id: string
          created_at: string
          date: string
          id: string
          name: string
          user_id: string
        }
        Insert: {
          club_id: string
          created_at?: string
          date?: string
          id?: string
          name: string
          user_id: string
        }
        Update: {
          club_id?: string
          created_at?: string
          date?: string
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      global_ads: {
        Row: {
          active: boolean
          created_at: string
          destination_link: string
          id: string
          image_url: string
          priority: number
        }
        Insert: {
          active?: boolean
          created_at?: string
          destination_link?: string
          id?: string
          image_url: string
          priority?: number
        }
        Update: {
          active?: boolean
          created_at?: string
          destination_link?: string
          id?: string
          image_url?: string
          priority?: number
        }
        Relationships: []
      }
      organizations: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          logo_url: string | null
          max_staff: number
          name: string
          plan: Database["public"]["Enums"]["org_plan"]
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          logo_url?: string | null
          max_staff?: number
          name: string
          plan?: Database["public"]["Enums"]["org_plan"]
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          logo_url?: string | null
          max_staff?: number
          name?: string
          plan?: Database["public"]["Enums"]["org_plan"]
        }
        Relationships: []
      }
      page_views: {
        Row: {
          created_at: string
          duration_seconds: number | null
          id: string
          is_public_view: boolean
          page: string
          referrer: string | null
          session_id: string
          share_id: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          duration_seconds?: number | null
          id?: string
          is_public_view?: boolean
          page: string
          referrer?: string | null
          session_id: string
          share_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          duration_seconds?: number | null
          id?: string
          is_public_view?: boolean
          page?: string
          referrer?: string | null
          session_id?: string
          share_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "page_views_share_id_fkey"
            columns: ["share_id"]
            isOneToOne: false
            referencedRelation: "shared_stats"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          club_id: string
          created_at: string
          full_name: string | null
          id: string
          my_team_logo: string
          my_team_name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          club_id?: string
          created_at?: string
          full_name?: string | null
          id?: string
          my_team_logo?: string
          my_team_name?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          club_id?: string
          created_at?: string
          full_name?: string | null
          id?: string
          my_team_logo?: string
          my_team_name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      shared_stats: {
        Row: {
          club_id: string
          created_at: string
          data: Json
          expires_at: string | null
          id: string
          title: string
          user_id: string
        }
        Insert: {
          club_id: string
          created_at?: string
          data: Json
          expires_at?: string | null
          id?: string
          title?: string
          user_id: string
        }
        Update: {
          club_id?: string
          created_at?: string
          data?: Json
          expires_at?: string | null
          id?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      tournament_matches: {
        Row: {
          away_score: number
          away_team_id: string
          created_at: string
          home_score: number
          home_team_id: string
          id: string
          played_at: string
          recorded_by: string | null
          tournament_id: string
        }
        Insert: {
          away_score?: number
          away_team_id: string
          created_at?: string
          home_score?: number
          home_team_id: string
          id?: string
          played_at?: string
          recorded_by?: string | null
          tournament_id: string
        }
        Update: {
          away_score?: number
          away_team_id?: string
          created_at?: string
          home_score?: number
          home_team_id?: string
          id?: string
          played_at?: string
          recorded_by?: string | null
          tournament_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tournament_matches_away_team_id_fkey"
            columns: ["away_team_id"]
            isOneToOne: false
            referencedRelation: "tournament_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_matches_home_team_id_fkey"
            columns: ["home_team_id"]
            isOneToOne: false
            referencedRelation: "tournament_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_teams: {
        Row: {
          created_at: string
          id: string
          team_name: string
          tournament_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          team_name: string
          tournament_id: string
        }
        Update: {
          created_at?: string
          id?: string
          team_name?: string
          tournament_id?: string
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_list_users: {
        Args: never
        Returns: {
          club_id: string
          created_at: string
          email: string
          email_confirmed_at: string
          full_name: string
          last_sign_in_at: string
          role: string
          user_id: string
        }[]
      }
      club_assign_user: {
        Args: { _email: string; _role: Database["public"]["Enums"]["app_role"] }
        Returns: Json
      }
      club_list_users: {
        Args: never
        Returns: {
          club_id: string
          created_at: string
          email: string
          email_confirmed_at: string
          full_name: string
          last_sign_in_at: string
          role: string
          user_id: string
        }[]
      }
      club_remove_user: { Args: { _target_user_id: string }; Returns: Json }
      get_user_club_id: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_global_role: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role:
        | "super_admin"
        | "club_admin"
        | "coach"
        | "fan"
        | "system_operator"
        | "club_admin_elite"
        | "club_admin_pro"
        | "club_staff"
      org_plan: "free" | "pro" | "elite"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
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
      app_role: [
        "super_admin",
        "club_admin",
        "coach",
        "fan",
        "system_operator",
        "club_admin_elite",
        "club_admin_pro",
        "club_staff",
      ],
      org_plan: ["free", "pro", "elite"],
    },
  },
} as const
