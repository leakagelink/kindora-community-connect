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
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      account_deletion_requests: {
        Row: {
          id: string
          processing_note: string | null
          requested_at: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          id?: string
          processing_note?: string | null
          requested_at?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          id?: string
          processing_note?: string | null
          requested_at?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_generations: {
        Row: {
          created_at: string
          error_message: string | null
          estimated_cost_usd: number
          id: string
          input: Json
          input_tokens: number | null
          model: string | null
          output: Json | null
          output_tokens: number | null
          output_url: string | null
          status: string
          tool: string
          user_id: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          estimated_cost_usd?: number
          id?: string
          input?: Json
          input_tokens?: number | null
          model?: string | null
          output?: Json | null
          output_tokens?: number | null
          output_url?: string | null
          status?: string
          tool: string
          user_id: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          estimated_cost_usd?: number
          id?: string
          input?: Json
          input_tokens?: number | null
          model?: string | null
          output?: Json | null
          output_tokens?: number | null
          output_url?: string | null
          status?: string
          tool?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_usage_limits: {
        Row: {
          daily_budget_usd: number
          daily_limit: number
          estimated_cost_per_run_usd: number
          global_daily_limit: number
          is_enabled: boolean
          tool: string
          updated_at: string
        }
        Insert: {
          daily_budget_usd?: number
          daily_limit?: number
          estimated_cost_per_run_usd?: number
          global_daily_limit?: number
          is_enabled?: boolean
          tool: string
          updated_at?: string
        }
        Update: {
          daily_budget_usd?: number
          daily_limit?: number
          estimated_cost_per_run_usd?: number
          global_daily_limit?: number
          is_enabled?: boolean
          tool?: string
          updated_at?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          metadata: Json
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          metadata?: Json
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          metadata?: Json
        }
        Relationships: []
      }
      blocked_users: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string
        }
        Relationships: []
      }
      campaign_applications: {
        Row: {
          campaign_key: string
          created_at: string
          id: string
          payload: Json
          review_note: string | null
          reviewed_by: string | null
          status: string
          terms_version: string
          updated_at: string
          user_id: string
        }
        Insert: {
          campaign_key?: string
          created_at?: string
          id?: string
          payload: Json
          review_note?: string | null
          reviewed_by?: string | null
          status?: string
          terms_version?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          campaign_key?: string
          created_at?: string
          id?: string
          payload?: Json
          review_note?: string | null
          reviewed_by?: string | null
          status?: string
          terms_version?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          description: string | null
          group_name: string
          id: string
          is_active: boolean
          name: string
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          group_name: string
          id?: string
          is_active?: boolean
          name: string
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          group_name?: string
          id?: string
          is_active?: boolean
          name?: string
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      community_tasks: {
        Row: {
          actions: string
          created_at: string
          eligibility: string
          id: string
          is_active: boolean
          kind: string
          privacy: string
          purpose: string
          reward: string
          title: string
          updated_at: string
          version: number
        }
        Insert: {
          actions: string
          created_at?: string
          eligibility: string
          id?: string
          is_active?: boolean
          kind: string
          privacy: string
          purpose: string
          reward?: string
          title: string
          updated_at?: string
          version?: number
        }
        Update: {
          actions?: string
          created_at?: string
          eligibility?: string
          id?: string
          is_active?: boolean
          kind?: string
          privacy?: string
          purpose?: string
          reward?: string
          title?: string
          updated_at?: string
          version?: number
        }
        Relationships: []
      }
      conversation_participants: {
        Row: {
          conversation_id: string
          last_read_at: string | null
          user_id: string
        }
        Insert: {
          conversation_id: string
          last_read_at?: string | null
          user_id: string
        }
        Update: {
          conversation_id?: string
          last_read_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_participants_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string
          created_by: string
          id: string
          last_message_at: string
          listing_id: string | null
          request_id: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          last_message_at?: string
          listing_id?: string | null
          request_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          last_message_at?: string
          listing_id?: string | null
          request_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversations_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "product_listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "help_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      donations: {
        Row: {
          amount_minor: number
          created_at: string
          currency: string
          id: string
          provider: string | null
          provider_reference: string | null
          status: string
          user_id: string | null
        }
        Insert: {
          amount_minor: number
          created_at?: string
          currency?: string
          id?: string
          provider?: string | null
          provider_reference?: string | null
          status?: string
          user_id?: string | null
        }
        Update: {
          amount_minor?: number
          created_at?: string
          currency?: string
          id?: string
          provider?: string | null
          provider_reference?: string | null
          status?: string
          user_id?: string | null
        }
        Relationships: []
      }
      feature_flags: {
        Row: {
          description: string | null
          is_enabled: boolean
          key: string
          updated_at: string
        }
        Insert: {
          description?: string | null
          is_enabled?: boolean
          key: string
          updated_at?: string
        }
        Update: {
          description?: string | null
          is_enabled?: boolean
          key?: string
          updated_at?: string
        }
        Relationships: []
      }
      help_requests: {
        Row: {
          attachments: string[]
          category_id: string | null
          complexity: string | null
          created_at: string
          deleted_at: string | null
          description: string
          expected_deliverables: string | null
          hosting_expectations: string | null
          id: string
          is_prototype: boolean | null
          is_remote: boolean
          language: string | null
          location: string | null
          moderation_note: string | null
          needed_by: string | null
          offers_count: number
          owner_id: string
          request_type: Database["public"]["Enums"]["request_type"]
          required_features: string | null
          status: Database["public"]["Enums"]["request_status"]
          title: string
          updated_at: string
        }
        Insert: {
          attachments?: string[]
          category_id?: string | null
          complexity?: string | null
          created_at?: string
          deleted_at?: string | null
          description: string
          expected_deliverables?: string | null
          hosting_expectations?: string | null
          id?: string
          is_prototype?: boolean | null
          is_remote?: boolean
          language?: string | null
          location?: string | null
          moderation_note?: string | null
          needed_by?: string | null
          offers_count?: number
          owner_id: string
          request_type: Database["public"]["Enums"]["request_type"]
          required_features?: string | null
          status?: Database["public"]["Enums"]["request_status"]
          title: string
          updated_at?: string
        }
        Update: {
          attachments?: string[]
          category_id?: string | null
          complexity?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string
          expected_deliverables?: string | null
          hosting_expectations?: string | null
          id?: string
          is_prototype?: boolean | null
          is_remote?: boolean
          language?: string | null
          location?: string | null
          moderation_note?: string | null
          needed_by?: string | null
          offers_count?: number
          owner_id?: string
          request_type?: Database["public"]["Enums"]["request_type"]
          required_features?: string | null
          status?: Database["public"]["Enums"]["request_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "help_requests_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "help_requests_owner_profile_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          attachment_url: string | null
          body: string
          conversation_id: string
          created_at: string
          deleted_at: string | null
          id: string
          read_at: string | null
          sender_id: string
        }
        Insert: {
          attachment_url?: string | null
          body: string
          conversation_id: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          read_at?: string | null
          sender_id: string
        }
        Update: {
          attachment_url?: string | null
          body?: string
          conversation_id?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          read_at?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_profile_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      moderation_actions: {
        Row: {
          action: string
          created_at: string
          id: string
          moderator_id: string
          note: string | null
          reason: Database["public"]["Enums"]["report_reason"] | null
          report_id: string | null
          target_id: string
          target_type: string
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          moderator_id: string
          note?: string | null
          reason?: Database["public"]["Enums"]["report_reason"] | null
          report_id?: string | null
          target_id: string
          target_type: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          moderator_id?: string
          note?: string | null
          reason?: Database["public"]["Enums"]["report_reason"] | null
          report_id?: string | null
          target_id?: string
          target_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "moderation_actions_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          link: string | null
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read_at?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      product_interests: {
        Row: {
          created_at: string
          id: string
          listing_id: string
          message: string | null
          status: Database["public"]["Enums"]["interest_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          listing_id: string
          message?: string | null
          status?: Database["public"]["Enums"]["interest_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          listing_id?: string
          message?: string | null
          status?: Database["public"]["Enums"]["interest_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_interests_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "product_listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_interests_user_profile_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      product_listings: {
        Row: {
          category_id: string | null
          condition: string
          created_at: string
          deleted_at: string | null
          delivery_available: boolean
          description: string
          giveaway_rules: string | null
          id: string
          location: string | null
          moderation_note: string | null
          owner_id: string
          photos: string[]
          pickup_available: boolean
          quantity: number
          size_note: string | null
          status: Database["public"]["Enums"]["listing_status"]
          title: string
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          condition?: string
          created_at?: string
          deleted_at?: string | null
          delivery_available?: boolean
          description: string
          giveaway_rules?: string | null
          id?: string
          location?: string | null
          moderation_note?: string | null
          owner_id: string
          photos?: string[]
          pickup_available?: boolean
          quantity?: number
          size_note?: string | null
          status?: Database["public"]["Enums"]["listing_status"]
          title: string
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          condition?: string
          created_at?: string
          deleted_at?: string | null
          delivery_available?: boolean
          description?: string
          giveaway_rules?: string | null
          id?: string
          location?: string | null
          moderation_note?: string | null
          owner_id?: string
          photos?: string[]
          pickup_available?: boolean
          quantity?: number
          size_note?: string | null
          status?: Database["public"]["Enums"]["listing_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_listings_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_listings_owner_profile_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          city: string | null
          completed_help_count: number
          country: string | null
          created_at: string
          deleted_at: string | null
          display_name: string
          id: string
          interests: string[]
          is_available: boolean
          is_public: boolean
          is_restricted: boolean
          languages: string[]
          portfolio_links: string[]
          show_location: boolean
          skills: string[]
          suspended_until: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          completed_help_count?: number
          country?: string | null
          created_at?: string
          deleted_at?: string | null
          display_name?: string
          id: string
          interests?: string[]
          is_available?: boolean
          is_public?: boolean
          is_restricted?: boolean
          languages?: string[]
          portfolio_links?: string[]
          show_location?: boolean
          skills?: string[]
          suspended_until?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          completed_help_count?: number
          country?: string | null
          created_at?: string
          deleted_at?: string | null
          display_name?: string
          id?: string
          interests?: string[]
          is_available?: boolean
          is_public?: boolean
          is_restricted?: boolean
          languages?: string[]
          portfolio_links?: string[]
          show_location?: boolean
          skills?: string[]
          suspended_until?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      reports: {
        Row: {
          created_at: string
          details: string | null
          id: string
          reason: Database["public"]["Enums"]["report_reason"]
          reporter_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["report_status"]
          target_id: string
          target_type: string
        }
        Insert: {
          created_at?: string
          details?: string | null
          id?: string
          reason: Database["public"]["Enums"]["report_reason"]
          reporter_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["report_status"]
          target_id: string
          target_type: string
        }
        Update: {
          created_at?: string
          details?: string | null
          id?: string
          reason?: Database["public"]["Enums"]["report_reason"]
          reporter_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["report_status"]
          target_id?: string
          target_type?: string
        }
        Relationships: []
      }
      request_applications: {
        Row: {
          created_at: string
          estimated_days: number | null
          helper_id: string
          id: string
          message: string
          no_payment_confirmed: boolean
          proposed_deliverables: string | null
          questions: string | null
          relevant_skills: string[]
          request_id: string
          status: Database["public"]["Enums"]["application_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          estimated_days?: number | null
          helper_id: string
          id?: string
          message: string
          no_payment_confirmed?: boolean
          proposed_deliverables?: string | null
          questions?: string | null
          relevant_skills?: string[]
          request_id: string
          status?: Database["public"]["Enums"]["application_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          estimated_days?: number | null
          helper_id?: string
          id?: string
          message?: string
          no_payment_confirmed?: boolean
          proposed_deliverables?: string | null
          questions?: string | null
          relevant_skills?: string[]
          request_id?: string
          status?: Database["public"]["Enums"]["application_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "request_applications_helper_profile_fkey"
            columns: ["helper_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "request_applications_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "help_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      restriction_appeals: {
        Row: {
          created_at: string
          id: string
          reason: string
          response: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          reason: string
          response?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          reason?: string
          response?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          is_hidden: boolean
          listing_id: string | null
          rating: number
          request_id: string | null
          reviewee_id: string
          reviewer_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          is_hidden?: boolean
          listing_id?: string | null
          rating: number
          request_id?: string | null
          reviewee_id: string
          reviewer_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          is_hidden?: boolean
          listing_id?: string | null
          rating?: number
          request_id?: string | null
          reviewee_id?: string
          reviewer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "product_listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "help_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_reviewee_profile_fkey"
            columns: ["reviewee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_reviewer_profile_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reward_events: {
        Row: {
          created_at: string
          credits: number
          id: string
          provider: string
          provider_event_id: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          credits?: number
          id?: string
          provider: string
          provider_event_id: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          credits?: number
          id?: string
          provider?: string
          provider_event_id?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      service_offers: {
        Row: {
          availability: string | null
          category_ids: string[]
          created_at: string
          deleted_at: string | null
          experience: Database["public"]["Enums"]["experience_level"]
          headline: string
          id: string
          intro: string | null
          is_active: boolean
          is_remote: boolean
          languages: string[]
          location: string | null
          portfolio_links: string[]
          skills: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          availability?: string | null
          category_ids?: string[]
          created_at?: string
          deleted_at?: string | null
          experience?: Database["public"]["Enums"]["experience_level"]
          headline: string
          id?: string
          intro?: string | null
          is_active?: boolean
          is_remote?: boolean
          languages?: string[]
          location?: string | null
          portfolio_links?: string[]
          skills?: string[]
          updated_at?: string
          user_id: string
        }
        Update: {
          availability?: string | null
          category_ids?: string[]
          created_at?: string
          deleted_at?: string | null
          experience?: Database["public"]["Enums"]["experience_level"]
          headline?: string
          id?: string
          intro?: string | null
          is_active?: boolean
          is_remote?: boolean
          languages?: string[]
          location?: string | null
          portfolio_links?: string[]
          skills?: string[]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_offers_user_profile_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      socilet_offer_applications: {
        Row: {
          awarded_at: string | null
          created_at: string
          id: string
          offer_key: string
          payload: Json
          review_note: string | null
          reviewed_by: string | null
          status: string
          terms_version: string
          updated_at: string
          user_id: string
        }
        Insert: {
          awarded_at?: string | null
          created_at?: string
          id?: string
          offer_key: string
          payload: Json
          review_note?: string | null
          reviewed_by?: string | null
          status?: string
          terms_version?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          awarded_at?: string | null
          created_at?: string
          id?: string
          offer_key?: string
          payload?: Json
          review_note?: string | null
          reviewed_by?: string | null
          status?: string
          terms_version?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      task_submissions: {
        Row: {
          created_at: string
          entity_key: string
          evidence: Json
          id: string
          review_note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          task_id: string
          task_version: number
          user_id: string
        }
        Insert: {
          created_at?: string
          entity_key?: string
          evidence?: Json
          id?: string
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status: string
          task_id: string
          task_version: number
          user_id: string
        }
        Update: {
          created_at?: string
          entity_key?: string
          evidence?: Json
          id?: string
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          task_id?: string
          task_version?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_submissions_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "community_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
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
      can_create_conversation_member: {
        Args: { p_id: string; p_user: string }
        Returns: boolean
      }
      can_view_listing_photo: { Args: { p_name: string }; Returns: boolean }
      ensure_goodivo_conversation: {
        Args: {
          p_listing_id?: string
          p_other_user: string
          p_request_id?: string
        }
        Returns: string
      }
      finish_ai_generation: {
        Args: {
          p_error: string
          p_id: string
          p_input_tokens: number
          p_output: Json
          p_output_tokens: number
          p_user: string
        }
        Returns: undefined
      }
      goodivo_public_ai_limits: {
        Args: never
        Returns: {
          daily_limit: number
          is_enabled: boolean
          tool: string
        }[]
      }
      goodivo_public_flags: {
        Args: never
        Returns: {
          is_enabled: boolean
          key: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_conversation_participant: {
        Args: { _conversation_id: string; _user_id: string }
        Returns: boolean
      }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
      manage_product: {
        Args: { p_interest_id?: string; p_listing_id: string; p_status: string }
        Returns: undefined
      }
      platform_operational_metrics: { Args: never; Returns: Json }
      record_verified_deletion_request: {
        Args: { p_user: string }
        Returns: string
      }
      request_goodivo_account_deletion: { Args: never; Returns: string }
      reserve_ai_generation: {
        Args: { p_input: Json; p_tool: string }
        Returns: Json
      }
      review_goodivo_report: {
        Args: { p_action: string; p_note?: string; p_report: string }
        Returns: undefined
      }
      review_platform_submission: {
        Args: {
          p_approved: boolean
          p_id: string
          p_note: string
          p_type: string
        }
        Returns: undefined
      }
      review_socilet_application: {
        Args: { p_id: string; p_note: string; p_status: string }
        Returns: undefined
      }
      review_socilet_offer: {
        Args: { p_id: string; p_note: string; p_status: string }
        Returns: undefined
      }
      save_ai_budget: {
        Args: {
          p_budget: number
          p_estimate: number
          p_global_limit: number
          p_tool: string
        }
        Returns: undefined
      }
      save_community_task: { Args: { p_definition: Json }; Returns: undefined }
      submit_community_task: {
        Args: { p_evidence: Json; p_task_id: string }
        Returns: Json
      }
      submit_restriction_appeal: {
        Args: { p_reason: string }
        Returns: undefined
      }
      submit_socilet_application: { Args: { p_payload: Json }; Returns: Json }
      submit_socilet_offer: {
        Args: { p_offer: string; p_payload: Json }
        Returns: Json
      }
      withdraw_goodivo_account: { Args: never; Returns: undefined }
    }
    Enums: {
      app_role: "member" | "moderator" | "admin"
      application_status: "pending" | "accepted" | "declined" | "withdrawn"
      experience_level:
        | "beginner"
        | "intermediate"
        | "experienced"
        | "professional"
      interest_status: "pending" | "reserved" | "declined" | "completed"
      listing_status:
        | "pending_review"
        | "published"
        | "reserved"
        | "given_away"
        | "expired"
        | "removed"
      report_reason:
        | "spam"
        | "scam_fraud"
        | "illegal_goods"
        | "harassment"
        | "hate_abuse"
        | "sexual_content"
        | "dangerous_activity"
        | "misleading_offer"
        | "privacy_violation"
        | "other"
      report_status: "open" | "under_review" | "resolved" | "dismissed"
      request_status:
        | "draft"
        | "pending_review"
        | "published"
        | "receiving_offers"
        | "in_progress"
        | "completed"
        | "cancelled"
        | "rejected"
        | "closed"
      request_type: "digital_service" | "skill_knowledge" | "product"
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
      app_role: ["member", "moderator", "admin"],
      application_status: ["pending", "accepted", "declined", "withdrawn"],
      experience_level: [
        "beginner",
        "intermediate",
        "experienced",
        "professional",
      ],
      interest_status: ["pending", "reserved", "declined", "completed"],
      listing_status: [
        "pending_review",
        "published",
        "reserved",
        "given_away",
        "expired",
        "removed",
      ],
      report_reason: [
        "spam",
        "scam_fraud",
        "illegal_goods",
        "harassment",
        "hate_abuse",
        "sexual_content",
        "dangerous_activity",
        "misleading_offer",
        "privacy_violation",
        "other",
      ],
      report_status: ["open", "under_review", "resolved", "dismissed"],
      request_status: [
        "draft",
        "pending_review",
        "published",
        "receiving_offers",
        "in_progress",
        "completed",
        "cancelled",
        "rejected",
        "closed",
      ],
      request_type: ["digital_service", "skill_knowledge", "product"],
    },
  },
} as const
