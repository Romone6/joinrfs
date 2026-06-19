export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      admin_users: {
        Row: {
          id: string
          created_at: string
          email: string
          display_name: string | null
          role: "owner" | "operator" | "readonly"
          is_active: boolean
          last_login_at: string | null
        }
        Insert: {
          id: string
          created_at?: string
          email: string
          display_name?: string | null
          role?: "owner" | "operator" | "readonly"
          is_active?: boolean
          last_login_at?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          email?: string
          display_name?: string | null
          role?: "owner" | "operator" | "readonly"
          is_active?: boolean
          last_login_at?: string | null
        }
        Relationships: []
      }
      leads: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          first_name: string
          last_name: string | null
          email: string
          phone: string | null
          suburb: string | null
          postcode: string | null
          age_range: string | null
          interest_type: string | null
          joining_timeline: string | null
          preferred_contact_method: string | null
          source: string | null
          utm_source: string | null
          utm_medium: string | null
          utm_campaign: string | null
          consent_email: boolean
          consent_sms: boolean
          package_sent_at: string | null
          package_clicked_at: string | null
          status:
            | "New"
            | "Package Sent"
            | "Needs Follow-Up"
            | "Contacted"
            | "Warm Lead"
            | "Referred to Official Process"
            | "Applied"
            | "Joined"
            | "Not Interested"
            | "Bad Lead"
          priority: "High" | "Medium" | "Low"
          next_follow_up_at: string | null
          last_contacted_at: string | null
          notes: string | null
          sheet_synced_at: string | null
          sheet_sync_status: "not_synced" | "pending" | "success" | "failed"
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string
          first_name: string
          last_name?: string | null
          email: string
          phone?: string | null
          suburb?: string | null
          postcode?: string | null
          age_range?: string | null
          interest_type?: string | null
          joining_timeline?: string | null
          preferred_contact_method?: string | null
          source?: string | null
          utm_source?: string | null
          utm_medium?: string | null
          utm_campaign?: string | null
          consent_email?: boolean
          consent_sms?: boolean
          package_sent_at?: string | null
          package_clicked_at?: string | null
          status?:
            | "New"
            | "Package Sent"
            | "Needs Follow-Up"
            | "Contacted"
            | "Warm Lead"
            | "Referred to Official Process"
            | "Applied"
            | "Joined"
            | "Not Interested"
            | "Bad Lead"
          priority?: "High" | "Medium" | "Low"
          next_follow_up_at?: string | null
          last_contacted_at?: string | null
          notes?: string | null
          sheet_synced_at?: string | null
          sheet_sync_status?: "not_synced" | "pending" | "success" | "failed"
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          first_name?: string
          last_name?: string | null
          email?: string
          phone?: string | null
          suburb?: string | null
          postcode?: string | null
          age_range?: string | null
          interest_type?: string | null
          joining_timeline?: string | null
          preferred_contact_method?: string | null
          source?: string | null
          utm_source?: string | null
          utm_medium?: string | null
          utm_campaign?: string | null
          consent_email?: boolean
          consent_sms?: boolean
          package_sent_at?: string | null
          package_clicked_at?: string | null
          status?:
            | "New"
            | "Package Sent"
            | "Needs Follow-Up"
            | "Contacted"
            | "Warm Lead"
            | "Referred to Official Process"
            | "Applied"
            | "Joined"
            | "Not Interested"
            | "Bad Lead"
          priority?: "High" | "Medium" | "Low"
          next_follow_up_at?: string | null
          last_contacted_at?: string | null
          notes?: string | null
          sheet_synced_at?: string | null
          sheet_sync_status?: "not_synced" | "pending" | "success" | "failed"
        }
        Relationships: []
      }
      survey_responses: {
        Row: {
          id: string
          lead_id: string
          created_at: string
          question_key: string
          question_label: string
          answer: string | null
        }
        Insert: {
          id?: string
          lead_id: string
          created_at?: string
          question_key: string
          question_label: string
          answer?: string | null
        }
        Update: {
          id?: string
          lead_id?: string
          created_at?: string
          question_key?: string
          question_label?: string
          answer?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "survey_responses_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      email_logs: {
        Row: {
          id: string
          lead_id: string | null
          created_at: string
          email_type: string
          recipient: string
          subject: string | null
          status: "queued" | "sent" | "failed" | "opened" | "clicked" | "bounced" | "complained"
          provider_message_id: string | null
          error_message: string | null
          sent_at: string | null
          opened_at: string | null
          clicked_at: string | null
        }
        Insert: {
          id?: string
          lead_id?: string | null
          created_at?: string
          email_type: string
          recipient: string
          subject?: string | null
          status: "queued" | "sent" | "failed" | "opened" | "clicked" | "bounced" | "complained"
          provider_message_id?: string | null
          error_message?: string | null
          sent_at?: string | null
          opened_at?: string | null
          clicked_at?: string | null
        }
        Update: {
          id?: string
          lead_id?: string | null
          created_at?: string
          email_type?: string
          recipient?: string
          subject?: string | null
          status?: "queued" | "sent" | "failed" | "opened" | "clicked" | "bounced" | "complained"
          provider_message_id?: string | null
          error_message?: string | null
          sent_at?: string | null
          opened_at?: string | null
          clicked_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_logs_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_activities: {
        Row: {
          id: string
          lead_id: string
          created_at: string
          actor_user_id: string | null
          activity_type:
            | "lead_created"
            | "package_sent"
            | "package_send_failed"
            | "package_clicked"
            | "email_followup_opened"
            | "phone_call_clicked"
            | "sms_clicked"
            | "status_changed"
            | "note_added"
            | "followup_date_set"
            | "package_resent"
            | "sheet_sync_success"
            | "sheet_sync_failed"
          metadata: Json
        }
        Insert: {
          id?: string
          lead_id: string
          created_at?: string
          actor_user_id?: string | null
          activity_type:
            | "lead_created"
            | "package_sent"
            | "package_send_failed"
            | "package_clicked"
            | "email_followup_opened"
            | "phone_call_clicked"
            | "sms_clicked"
            | "status_changed"
            | "note_added"
            | "followup_date_set"
            | "package_resent"
            | "sheet_sync_success"
            | "sheet_sync_failed"
          metadata?: Json
        }
        Update: {
          id?: string
          lead_id?: string
          created_at?: string
          actor_user_id?: string | null
          activity_type?:
            | "lead_created"
            | "package_sent"
            | "package_send_failed"
            | "package_clicked"
            | "email_followup_opened"
            | "phone_call_clicked"
            | "sms_clicked"
            | "status_changed"
            | "note_added"
            | "followup_date_set"
            | "package_resent"
            | "sheet_sync_success"
            | "sheet_sync_failed"
          metadata?: Json
        }
        Relationships: [
          {
            foreignKeyName: "lead_activities_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_activities_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
        ]
      }
      site_settings: {
        Row: {
          id: string
          key:
            | "hero_headline"
            | "hero_subheadline"
            | "cta_text"
            | "popup_enabled"
            | "popup_delay_seconds"
            | "popup_title"
            | "popup_description"
            | "package_url"
            | "email_subject"
            | "email_body"
            | "success_message"
            | "notification_email"
          value: Json
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id?: string
          key:
            | "hero_headline"
            | "hero_subheadline"
            | "cta_text"
            | "popup_enabled"
            | "popup_delay_seconds"
            | "popup_title"
            | "popup_description"
            | "package_url"
            | "email_subject"
            | "email_body"
            | "success_message"
            | "notification_email"
          value: Json
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          id?: string
          key?:
            | "hero_headline"
            | "hero_subheadline"
            | "cta_text"
            | "popup_enabled"
            | "popup_delay_seconds"
            | "popup_title"
            | "popup_description"
            | "package_url"
            | "email_subject"
            | "email_body"
            | "success_message"
            | "notification_email"
          value?: Json
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "site_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
        ]
      }
      sheet_sync_logs: {
        Row: {
          id: string
          lead_id: string | null
          created_at: string
          status: "success" | "failed"
          error_message: string | null
          metadata: Json
        }
        Insert: {
          id?: string
          lead_id?: string | null
          created_at?: string
          status: "success" | "failed"
          error_message?: string | null
          metadata?: Json
        }
        Update: {
          id?: string
          lead_id?: string | null
          created_at?: string
          status?: "success" | "failed"
          error_message?: string | null
          metadata?: Json
        }
        Relationships: [
          {
            foreignKeyName: "sheet_sync_logs_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_admin: {
        Args: { required_roles?: string[] }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
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
    ? DatabaseWithoutInternals["public"]["Enums"][DefaultSchemaEnumNameOrOptions]
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
    ? DatabaseWithoutInternals["public"]["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
