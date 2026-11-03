export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: {
          extensions?: Json;
          operationName?: string;
          query?: string;
          variables?: Json;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      announcements: {
        Row: {
          author_id: string | null;
          body: string;
          created_at: string;
          id: string;
          posted_as: string;
          published_at: string;
          scholarship_id: string | null;
          title: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          author_id?: string | null;
          body: string;
          created_at?: string;
          id?: string;
          posted_as?: string;
          published_at?: string;
          scholarship_id?: string | null;
          title: string;
          updated_at?: string;
        };
        Update: {
          author_id?: string | null;
          body?: string;
          created_at?: string;
          id?: string;
          posted_as?: string;
          published_at?: string;
          scholarship_id?: string | null;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "announcements_author_id_fkey";
            columns: ["author_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "announcements_scholarship_id_fkey";
            columns: ["scholarship_id"];
            isOneToOne: false;
            referencedRelation: "scholarships";
            referencedColumns: ["id"];
          },
        ];
      };
      application_documents: {
        Row: {
          application_id: string;
          checked_at: string;
          document_id: string;
        };
        ComputedFields: never;
        Insert: {
          application_id: string;
          checked_at?: string;
          document_id: string;
        };
        Update: {
          application_id?: string;
          checked_at?: string;
          document_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "application_documents_application_id_fkey";
            columns: ["application_id"];
            isOneToOne: false;
            referencedRelation: "applications";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "application_documents_document_id_fkey";
            columns: ["document_id"];
            isOneToOne: false;
            referencedRelation: "scholarship_documents";
            referencedColumns: ["id"];
          },
        ];
      };
      applications: {
        Row: {
          created_at: string;
          id: string;
          result: Database["public"]["Enums"]["application_result"];
          scholarship_id: string;
          stage: Database["public"]["Enums"]["application_stage"];
          student_id: string;
          submitted_at: string | null;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id?: string;
          result?: Database["public"]["Enums"]["application_result"];
          scholarship_id: string;
          stage?: Database["public"]["Enums"]["application_stage"];
          student_id: string;
          submitted_at?: string | null;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          result?: Database["public"]["Enums"]["application_result"];
          scholarship_id?: string;
          stage?: Database["public"]["Enums"]["application_stage"];
          student_id?: string;
          submitted_at?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "applications_scholarship_id_fkey";
            columns: ["scholarship_id"];
            isOneToOne: false;
            referencedRelation: "scholarships";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "applications_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      audit_logs: {
        Row: {
          action: string;
          actor_id: string | null;
          actor_role: Database["public"]["Enums"]["app_role"] | null;
          after: Json | null;
          before: Json | null;
          created_at: string;
          entity_id: string | null;
          entity_type: string;
          id: number;
          ip: unknown;
          user_agent: string | null;
        };
        ComputedFields: never;
        Insert: {
          action: string;
          actor_id?: string | null;
          actor_role?: Database["public"]["Enums"]["app_role"] | null;
          after?: Json | null;
          before?: Json | null;
          created_at?: string;
          entity_id?: string | null;
          entity_type: string;
          id?: never;
          ip?: unknown;
          user_agent?: string | null;
        };
        Update: {
          action?: string;
          actor_id?: string | null;
          actor_role?: Database["public"]["Enums"]["app_role"] | null;
          after?: Json | null;
          before?: Json | null;
          created_at?: string;
          entity_id?: string | null;
          entity_type?: string;
          id?: never;
          ip?: unknown;
          user_agent?: string | null;
        };
        Relationships: [];
      };
      deadline_changes: {
        Row: {
          changed_at: string;
          changed_by: string | null;
          id: string;
          new_closes_on: string | null;
          new_opens_on: string | null;
          notified_at: string | null;
          old_closes_on: string | null;
          old_opens_on: string | null;
          scholarship_id: string;
        };
        ComputedFields: never;
        Insert: {
          changed_at?: string;
          changed_by?: string | null;
          id?: string;
          new_closes_on?: string | null;
          new_opens_on?: string | null;
          notified_at?: string | null;
          old_closes_on?: string | null;
          old_opens_on?: string | null;
          scholarship_id: string;
        };
        Update: {
          changed_at?: string;
          changed_by?: string | null;
          id?: string;
          new_closes_on?: string | null;
          new_opens_on?: string | null;
          notified_at?: string | null;
          old_closes_on?: string | null;
          old_opens_on?: string | null;
          scholarship_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "deadline_changes_changed_by_fkey";
            columns: ["changed_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "deadline_changes_scholarship_id_fkey";
            columns: ["scholarship_id"];
            isOneToOne: false;
            referencedRelation: "scholarships";
            referencedColumns: ["id"];
          },
        ];
      };
      inquiries: {
        Row: {
          created_at: string;
          id: string;
          question: string;
          scholarship_id: string | null;
          status: Database["public"]["Enums"]["inquiry_status"];
          student_context: string | null;
          student_id: string | null;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id?: string;
          question: string;
          scholarship_id?: string | null;
          status?: Database["public"]["Enums"]["inquiry_status"];
          student_context?: string | null;
          student_id?: string | null;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          question?: string;
          scholarship_id?: string | null;
          status?: Database["public"]["Enums"]["inquiry_status"];
          student_context?: string | null;
          student_id?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "inquiries_scholarship_id_fkey";
            columns: ["scholarship_id"];
            isOneToOne: false;
            referencedRelation: "scholarships";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "inquiries_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      inquiry_replies: {
        Row: {
          author_id: string | null;
          body: string;
          created_at: string;
          id: string;
          inquiry_id: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          author_id?: string | null;
          body: string;
          created_at?: string;
          id?: string;
          inquiry_id: string;
          updated_at?: string;
        };
        Update: {
          author_id?: string | null;
          body?: string;
          created_at?: string;
          id?: string;
          inquiry_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "inquiry_replies_author_id_fkey";
            columns: ["author_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "inquiry_replies_inquiry_id_fkey";
            columns: ["inquiry_id"];
            isOneToOne: false;
            referencedRelation: "inquiries";
            referencedColumns: ["id"];
          },
        ];
      };
      notification_preferences: {
        Row: {
          changes: boolean;
          email: boolean;
          lead_days: number;
          new_matches: boolean;
          push: boolean;
          site: boolean;
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          changes?: boolean;
          email?: boolean;
          lead_days?: number;
          new_matches?: boolean;
          push?: boolean;
          site?: boolean;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          changes?: boolean;
          email?: boolean;
          lead_days?: number;
          new_matches?: boolean;
          push?: boolean;
          site?: boolean;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notification_preferences_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      notifications: {
        Row: {
          body: string;
          created_at: string;
          dedupe_key: string;
          email_attempts: number;
          email_error: string | null;
          email_status: Database["public"]["Enums"]["delivery_status"];
          emailed_at: string | null;
          id: string;
          kind: Database["public"]["Enums"]["notification_kind"];
          link: string | null;
          push_error: string | null;
          push_status: Database["public"]["Enums"]["delivery_status"];
          read_at: string | null;
          title: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          body?: string;
          created_at?: string;
          dedupe_key: string;
          email_attempts?: number;
          email_error?: string | null;
          email_status?: Database["public"]["Enums"]["delivery_status"];
          emailed_at?: string | null;
          id?: string;
          kind: Database["public"]["Enums"]["notification_kind"];
          link?: string | null;
          push_error?: string | null;
          push_status?: Database["public"]["Enums"]["delivery_status"];
          read_at?: string | null;
          title: string;
          user_id: string;
        };
        Update: {
          body?: string;
          created_at?: string;
          dedupe_key?: string;
          email_attempts?: number;
          email_error?: string | null;
          email_status?: Database["public"]["Enums"]["delivery_status"];
          emailed_at?: string | null;
          id?: string;
          kind?: Database["public"]["Enums"]["notification_kind"];
          link?: string | null;
          push_error?: string | null;
          push_status?: Database["public"]["Enums"]["delivery_status"];
          read_at?: string | null;
          title?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          created_at: string;
          deactivated_at: string | null;
          deactivated_by: string | null;
          email: string | null;
          full_name: string | null;
          id: string;
          role: Database["public"]["Enums"]["app_role"];
          status: Database["public"]["Enums"]["account_status"];
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          deactivated_at?: string | null;
          deactivated_by?: string | null;
          email?: string | null;
          full_name?: string | null;
          id: string;
          role?: Database["public"]["Enums"]["app_role"];
          status?: Database["public"]["Enums"]["account_status"];
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          deactivated_at?: string | null;
          deactivated_by?: string | null;
          email?: string | null;
          full_name?: string | null;
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          status?: Database["public"]["Enums"]["account_status"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_deactivated_by_fkey";
            columns: ["deactivated_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      providers: {
        Row: {
          abbr: string;
          color: string;
          created_at: string;
          id: string;
          is_sample: boolean;
          name: string;
          short_name: string | null;
          type: Database["public"]["Enums"]["provider_type"];
          updated_at: string;
          website: string | null;
        };
        ComputedFields: never;
        Insert: {
          abbr: string;
          color?: string;
          created_at?: string;
          id?: string;
          is_sample?: boolean;
          name: string;
          short_name?: string | null;
          type: Database["public"]["Enums"]["provider_type"];
          updated_at?: string;
          website?: string | null;
        };
        Update: {
          abbr?: string;
          color?: string;
          created_at?: string;
          id?: string;
          is_sample?: boolean;
          name?: string;
          short_name?: string | null;
          type?: Database["public"]["Enums"]["provider_type"];
          updated_at?: string;
          website?: string | null;
        };
        Relationships: [];
      };
      push_subscriptions: {
        Row: {
          auth: string;
          created_at: string;
          endpoint: string;
          id: string;
          p256dh: string;
          user_agent: string | null;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          auth: string;
          created_at?: string;
          endpoint: string;
          id?: string;
          p256dh: string;
          user_agent?: string | null;
          user_id: string;
        };
        Update: {
          auth?: string;
          created_at?: string;
          endpoint?: string;
          id?: string;
          p256dh?: string;
          user_agent?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      rate_limits: {
        Row: {
          hits: number;
          key: string;
          window_start: string;
        };
        ComputedFields: never;
        Insert: {
          hits?: number;
          key: string;
          window_start: string;
        };
        Update: {
          hits?: number;
          key?: string;
          window_start?: string;
        };
        Relationships: [];
      };
      scholarship_benefits: {
        Row: {
          id: string;
          position: number;
          scholarship_id: string;
          text: string;
        };
        ComputedFields: never;
        Insert: {
          id?: string;
          position: number;
          scholarship_id: string;
          text: string;
        };
        Update: {
          id?: string;
          position?: number;
          scholarship_id?: string;
          text?: string;
        };
        Relationships: [
          {
            foreignKeyName: "scholarship_benefits_scholarship_id_fkey";
            columns: ["scholarship_id"];
            isOneToOne: false;
            referencedRelation: "scholarships";
            referencedColumns: ["id"];
          },
        ];
      };
      scholarship_criteria: {
        Row: {
          fields: Database["public"]["Enums"]["course_field"][] | null;
          gwa_max: number | null;
          income_max: number | null;
          regions: Database["public"]["Enums"]["region"][] | null;
          requires_four_ps: boolean;
          requires_ofw: boolean;
          scholarship_id: string;
          updated_at: string;
          year_levels: number[] | null;
        };
        ComputedFields: never;
        Insert: {
          fields?: Database["public"]["Enums"]["course_field"][] | null;
          gwa_max?: number | null;
          income_max?: number | null;
          regions?: Database["public"]["Enums"]["region"][] | null;
          requires_four_ps?: boolean;
          requires_ofw?: boolean;
          scholarship_id: string;
          updated_at?: string;
          year_levels?: number[] | null;
        };
        Update: {
          fields?: Database["public"]["Enums"]["course_field"][] | null;
          gwa_max?: number | null;
          income_max?: number | null;
          regions?: Database["public"]["Enums"]["region"][] | null;
          requires_four_ps?: boolean;
          requires_ofw?: boolean;
          scholarship_id?: string;
          updated_at?: string;
          year_levels?: number[] | null;
        };
        Relationships: [
          {
            foreignKeyName: "scholarship_criteria_scholarship_id_fkey";
            columns: ["scholarship_id"];
            isOneToOne: true;
            referencedRelation: "scholarships";
            referencedColumns: ["id"];
          },
        ];
      };
      scholarship_documents: {
        Row: {
          id: string;
          name: string;
          position: number;
          scholarship_id: string;
          where_to_get: string;
        };
        ComputedFields: never;
        Insert: {
          id?: string;
          name: string;
          position: number;
          scholarship_id: string;
          where_to_get?: string;
        };
        Update: {
          id?: string;
          name?: string;
          position?: number;
          scholarship_id?: string;
          where_to_get?: string;
        };
        Relationships: [
          {
            foreignKeyName: "scholarship_documents_scholarship_id_fkey";
            columns: ["scholarship_id"];
            isOneToOne: false;
            referencedRelation: "scholarships";
            referencedColumns: ["id"];
          },
        ];
      };
      scholarship_notes: {
        Row: {
          id: string;
          position: number;
          scholarship_id: string;
          text: string;
        };
        ComputedFields: never;
        Insert: {
          id?: string;
          position: number;
          scholarship_id: string;
          text: string;
        };
        Update: {
          id?: string;
          position?: number;
          scholarship_id?: string;
          text?: string;
        };
        Relationships: [
          {
            foreignKeyName: "scholarship_notes_scholarship_id_fkey";
            columns: ["scholarship_id"];
            isOneToOne: false;
            referencedRelation: "scholarships";
            referencedColumns: ["id"];
          },
        ];
      };
      scholarship_steps: {
        Row: {
          detail: string;
          id: string;
          position: number;
          scholarship_id: string;
          title: string;
        };
        ComputedFields: never;
        Insert: {
          detail?: string;
          id?: string;
          position: number;
          scholarship_id: string;
          title: string;
        };
        Update: {
          detail?: string;
          id?: string;
          position?: number;
          scholarship_id?: string;
          title?: string;
        };
        Relationships: [
          {
            foreignKeyName: "scholarship_steps_scholarship_id_fkey";
            columns: ["scholarship_id"];
            isOneToOne: false;
            referencedRelation: "scholarships";
            referencedColumns: ["id"];
          },
        ];
      };
      scholarships: {
        Row: {
          amount_num: number | null;
          amount_text: string;
          assigned_coordinator_id: string | null;
          closes_on: string | null;
          created_at: string;
          created_by: string | null;
          duration: string | null;
          id: string;
          is_sample: boolean;
          last_verified_at: string | null;
          last_verified_by: string | null;
          listing_status: Database["public"]["Enums"]["listing_status"];
          location_label: string | null;
          name: string;
          obligations: string | null;
          opens_on: string | null;
          provider_id: string;
          published_at: string | null;
          renewal: string | null;
          search_doc: unknown;
          slug: string;
          source_label: string;
          source_url: string | null;
          summary: string;
          updated_at: string;
          verification: Database["public"]["Enums"]["verification_status"];
        };
        ComputedFields: never;
        Insert: {
          amount_num?: number | null;
          amount_text: string;
          assigned_coordinator_id?: string | null;
          closes_on?: string | null;
          created_at?: string;
          created_by?: string | null;
          duration?: string | null;
          id?: string;
          is_sample?: boolean;
          last_verified_at?: string | null;
          last_verified_by?: string | null;
          listing_status?: Database["public"]["Enums"]["listing_status"];
          location_label?: string | null;
          name: string;
          obligations?: string | null;
          opens_on?: string | null;
          provider_id: string;
          published_at?: string | null;
          renewal?: string | null;
          search_doc?: unknown;
          slug: string;
          source_label: string;
          source_url?: string | null;
          summary?: string;
          updated_at?: string;
          verification?: Database["public"]["Enums"]["verification_status"];
        };
        Update: {
          amount_num?: number | null;
          amount_text?: string;
          assigned_coordinator_id?: string | null;
          closes_on?: string | null;
          created_at?: string;
          created_by?: string | null;
          duration?: string | null;
          id?: string;
          is_sample?: boolean;
          last_verified_at?: string | null;
          last_verified_by?: string | null;
          listing_status?: Database["public"]["Enums"]["listing_status"];
          location_label?: string | null;
          name?: string;
          obligations?: string | null;
          opens_on?: string | null;
          provider_id?: string;
          published_at?: string | null;
          renewal?: string | null;
          search_doc?: unknown;
          slug?: string;
          source_label?: string;
          source_url?: string | null;
          summary?: string;
          updated_at?: string;
          verification?: Database["public"]["Enums"]["verification_status"];
        };
        Relationships: [
          {
            foreignKeyName: "scholarships_assigned_coordinator_id_fkey";
            columns: ["assigned_coordinator_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "scholarships_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "scholarships_last_verified_by_fkey";
            columns: ["last_verified_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "scholarships_provider_id_fkey";
            columns: ["provider_id"];
            isOneToOne: false;
            referencedRelation: "providers";
            referencedColumns: ["id"];
          },
        ];
      };
      student_profiles: {
        Row: {
          answered_family: boolean;
          created_at: string;
          field: Database["public"]["Enums"]["course_field"] | null;
          four_ps: Database["public"]["Enums"]["tri_answer"] | null;
          gwa: number | null;
          gwa_unknown: boolean;
          income_bracket: Database["public"]["Enums"]["income_bracket"] | null;
          ofw: boolean | null;
          program: string | null;
          region: Database["public"]["Enums"]["region"] | null;
          updated_at: string;
          user_id: string;
          year_level: number | null;
        };
        ComputedFields: never;
        Insert: {
          answered_family?: boolean;
          created_at?: string;
          field?: Database["public"]["Enums"]["course_field"] | null;
          four_ps?: Database["public"]["Enums"]["tri_answer"] | null;
          gwa?: number | null;
          gwa_unknown?: boolean;
          income_bracket?: Database["public"]["Enums"]["income_bracket"] | null;
          ofw?: boolean | null;
          program?: string | null;
          region?: Database["public"]["Enums"]["region"] | null;
          updated_at?: string;
          user_id: string;
          year_level?: number | null;
        };
        Update: {
          answered_family?: boolean;
          created_at?: string;
          field?: Database["public"]["Enums"]["course_field"] | null;
          four_ps?: Database["public"]["Enums"]["tri_answer"] | null;
          gwa?: number | null;
          gwa_unknown?: boolean;
          income_bracket?: Database["public"]["Enums"]["income_bracket"] | null;
          ofw?: boolean | null;
          program?: string | null;
          region?: Database["public"]["Enums"]["region"] | null;
          updated_at?: string;
          user_id?: string;
          year_level?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "student_profiles_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      admin_set_role: {
        Args: {
          p_role: Database["public"]["Enums"]["app_role"];
          p_user: string;
        };
        Returns: undefined;
      };
      admin_soft_delete_user: { Args: { p_user: string }; Returns: undefined };
      assert_admin: { Args: Record<PropertyKey, never>; Returns: undefined };
      batch_scholarships: {
        Args: { p_action: string; p_ids: string[] };
        Returns: {
          error: string;
          id: string;
          ok: boolean;
        }[];
      };
      batch_users_status: {
        Args: {
          p_ids: string[];
          p_status: Database["public"]["Enums"]["account_status"];
        };
        Returns: {
          error: string;
          id: string;
          ok: boolean;
        }[];
      };
      can_edit_scholarship: {
        Args: { p_scholarship: string };
        Returns: boolean;
      };
      check_rate_limit: {
        Args: { p_key: string; p_max: number; p_window_seconds: number };
        Returns: boolean;
      };
      custom_access_token_hook: { Args: { event: Json }; Returns: Json };
      eligibility_counts: {
        Args: { p_student: string };
        Returns: {
          maybe: number;
          no: number;
          yes: number;
        }[];
      };
      eligibility_for_scholarships: {
        Args: { p_student: string };
        Returns: {
          first_gap: Json;
          items: Json;
          met: number;
          not_met: number;
          scholarship_id: string;
          total: number;
          unknown: number;
          verdict: string;
        }[];
      };
      eligibility_items: {
        Args: {
          c: Omit<
            Database["public"]["Tables"]["scholarship_criteria"]["Row"],
            Database["public"]["Tables"]["scholarship_criteria"]["ComputedFields"]
          >;
          sp: Omit<
            Database["public"]["Tables"]["student_profiles"]["Row"],
            Database["public"]["Tables"]["student_profiles"]["ComputedFields"]
          >;
        };
        Returns: Json;
      };
      eligibility_summary: {
        Args: { has_profile: boolean; items: Json };
        Returns: Record<string, unknown>;
      };
      evaluate_eligibility: {
        Args: { p_scholarship: string; p_student: string };
        Returns: Json;
      };
      income_bracket_max: {
        Args: { b: Database["public"]["Enums"]["income_bracket"] };
        Returns: number;
      };
      income_bracket_min: {
        Args: { b: Database["public"]["Enums"]["income_bracket"] };
        Returns: number;
      };
      is_active_user: { Args: Record<PropertyKey, never>; Returns: boolean };
      is_admin: { Args: Record<PropertyKey, never>; Returns: boolean };
      is_privileged: { Args: Record<PropertyKey, never>; Returns: boolean };
      is_staff: { Args: Record<PropertyKey, never>; Returns: boolean };
      is_student: { Args: Record<PropertyKey, never>; Returns: boolean };
      jsonb_changed_keys: { Args: { a: Json; b: Json }; Returns: string[] };
      jsonb_pick: { Args: { j: Json; keys: string[] }; Returns: Json };
      listing_stats: { Args: Record<PropertyKey, never>; Returns: Json };
      log_audit: {
        Args: {
          p_action: string;
          p_actor?: string;
          p_after?: Json;
          p_before?: Json;
          p_entity_id: string;
          p_entity_type: string;
        };
        Returns: undefined;
      };
      mark_notifications_read: { Args: { p_ids?: string[] }; Returns: number };
      my_role: {
        Args: Record<PropertyKey, never>;
        Returns: Database["public"]["Enums"]["app_role"];
      };
      my_student_profile: {
        Args: Record<PropertyKey, never>;
        Returns: {
          answered_family: boolean;
          created_at: string;
          field: Database["public"]["Enums"]["course_field"] | null;
          four_ps: Database["public"]["Enums"]["tri_answer"] | null;
          gwa: number | null;
          gwa_unknown: boolean;
          income_bracket: Database["public"]["Enums"]["income_bracket"] | null;
          ofw: boolean | null;
          program: string | null;
          region: Database["public"]["Enums"]["region"] | null;
          updated_at: string;
          user_id: string;
          year_level: number | null;
        }[];
        SetofOptions: {
          from: "*";
          to: "student_profiles";
          isOneToOne: false;
          isSetofReturn: true;
        };
      };
      other_active_admin_exists: { Args: { p_user: string }; Returns: boolean };
      request_header: { Args: { p_name: string }; Returns: string };
      request_ip: { Args: Record<PropertyKey, never>; Returns: unknown };
      scholarship_search_doc: {
        Args: { p_name: string; p_provider_id: string; p_summary: string };
        Returns: unknown;
      };
      scholarship_status: {
        Args: { p_closes: string; p_opens: string };
        Returns: string;
      };
      search_scholarships: {
        Args: {
          p_eligible_only?: boolean;
          p_field?: Database["public"]["Enums"]["course_field"];
          p_page?: number;
          p_page_size?: number;
          p_q?: string;
          p_region?: Database["public"]["Enums"]["region"];
          p_sort?: string;
          p_status?: string;
          p_type?: Database["public"]["Enums"]["provider_type"];
          p_year?: number;
        };
        Returns: {
          amount_num: number;
          amount_text: string;
          closes_on: string;
          days_left: number;
          days_to_open: number;
          first_gap: Json;
          id: string;
          is_sample: boolean;
          last_verified_at: string;
          location_label: string;
          name: string;
          not_met_count: number;
          opens_on: string;
          provider_abbr: string;
          provider_color: string;
          provider_name: string;
          provider_short_name: string;
          provider_type: Database["public"]["Enums"]["provider_type"];
          published_at: string;
          slug: string;
          status: string;
          summary: string;
          total_count: number;
          unknown_count: number;
          verdict: string;
          verification: Database["public"]["Enums"]["verification_status"];
        }[];
      };
      to_prefix_tsquery: { Args: { q: string }; Returns: unknown };
      today_ph: { Args: Record<PropertyKey, never>; Returns: string };
      write_audit: {
        Args: {
          p_action: string;
          p_actor: string;
          p_after: Json;
          p_before: Json;
          p_entity_id: string;
          p_entity_type: string;
        };
        Returns: undefined;
      };
    };
    Enums: {
      account_status: "active" | "deactivated" | "deleted";
      app_role: "student" | "coordinator" | "admin";
      application_result: "pending" | "approved" | "rejected";
      application_stage: "saved" | "preparing" | "submitted";
      course_field:
        | "science_math"
        | "engineering"
        | "it_cs"
        | "agriculture_fisheries"
        | "health_sciences"
        | "education"
        | "business_accountancy"
        | "arts_humanities_social";
      delivery_status: "skipped" | "pending" | "sent" | "failed";
      income_bracket:
        "below_150k" | "150k_250k" | "250k_400k" | "400k_800k" | "above_800k";
      inquiry_status: "open" | "answered" | "closed";
      listing_status: "draft" | "in_review" | "published" | "archived";
      notification_kind: "deadline" | "change" | "new" | "announce";
      provider_type: "government" | "local_government" | "private" | "school";
      region:
        | "ncr"
        | "car"
        | "ilocos"
        | "cagayan_valley"
        | "central_luzon"
        | "calabarzon"
        | "mimaropa"
        | "bicol"
        | "western_visayas"
        | "central_visayas"
        | "eastern_visayas"
        | "zamboanga_peninsula"
        | "northern_mindanao"
        | "davao"
        | "soccsksargen"
        | "caraga"
        | "barmm";
      tri_answer: "yes" | "no" | "unsure";
      verification_status: "unverified" | "verified";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      account_status: ["active", "deactivated", "deleted"],
      app_role: ["student", "coordinator", "admin"],
      application_result: ["pending", "approved", "rejected"],
      application_stage: ["saved", "preparing", "submitted"],
      course_field: [
        "science_math",
        "engineering",
        "it_cs",
        "agriculture_fisheries",
        "health_sciences",
        "education",
        "business_accountancy",
        "arts_humanities_social",
      ],
      delivery_status: ["skipped", "pending", "sent", "failed"],
      income_bracket: [
        "below_150k",
        "150k_250k",
        "250k_400k",
        "400k_800k",
        "above_800k",
      ],
      inquiry_status: ["open", "answered", "closed"],
      listing_status: ["draft", "in_review", "published", "archived"],
      notification_kind: ["deadline", "change", "new", "announce"],
      provider_type: ["government", "local_government", "private", "school"],
      region: [
        "ncr",
        "car",
        "ilocos",
        "cagayan_valley",
        "central_luzon",
        "calabarzon",
        "mimaropa",
        "bicol",
        "western_visayas",
        "central_visayas",
        "eastern_visayas",
        "zamboanga_peninsula",
        "northern_mindanao",
        "davao",
        "soccsksargen",
        "caraga",
        "barmm",
      ],
      tri_answer: ["yes", "no", "unsure"],
      verification_status: ["unverified", "verified"],
    },
  },
} as const;
