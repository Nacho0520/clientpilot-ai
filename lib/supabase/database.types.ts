// Auto-generated types from Supabase schema.
// Do NOT edit manually — regenerate with: pnpm run db:types

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      appointments: {
        Row: {
          business_id: string
          conversation_id: string | null
          created_at: string
          customer_name: string | null
          customer_phone: string
          duration_minutes: number
          google_event_id: string | null
          id: string
          notes: string | null
          scheduled_at: string
          service_id: string | null
          status: string
        }
        Insert: {
          business_id: string
          conversation_id?: string | null
          created_at?: string
          customer_name?: string | null
          customer_phone: string
          duration_minutes: number
          google_event_id?: string | null
          id?: string
          notes?: string | null
          scheduled_at: string
          service_id?: string | null
          status?: string
        }
        Update: {
          business_id?: string
          conversation_id?: string | null
          created_at?: string
          customer_name?: string | null
          customer_phone?: string
          duration_minutes?: number
          google_event_id?: string | null
          id?: string
          notes?: string | null
          scheduled_at?: string
          service_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_business_id_fkey"
            columns: ["business_id"]
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_conversation_id_fkey"
            columns: ["conversation_id"]
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_service_id_fkey"
            columns: ["service_id"]
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      business_hours: {
        Row: {
          business_id: string
          close_time: string | null
          closed: boolean
          day_of_week: number
          id: string
          open_time: string | null
        }
        Insert: {
          business_id: string
          close_time?: string | null
          closed?: boolean
          day_of_week: number
          id?: string
          open_time?: string | null
        }
        Update: {
          business_id?: string
          close_time?: string | null
          closed?: boolean
          day_of_week?: number
          id?: string
          open_time?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "business_hours_business_id_fkey"
            columns: ["business_id"]
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      business_settings: {
        Row: {
          ai_name: string
          business_id: string
          created_at: string
          custom_instructions: string | null
          notification_email: string | null
          review_link_url: string | null
          review_request_delay_hours: number
          tone: string
          updated_at: string
        }
        Insert: {
          ai_name?: string
          business_id: string
          created_at?: string
          custom_instructions?: string | null
          notification_email?: string | null
          review_link_url?: string | null
          review_request_delay_hours?: number
          tone?: string
          updated_at?: string
        }
        Update: {
          ai_name?: string
          business_id?: string
          created_at?: string
          custom_instructions?: string | null
          notification_email?: string | null
          review_link_url?: string | null
          review_request_delay_hours?: number
          tone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_settings_business_id_fkey"
            columns: ["business_id"]
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      businesses: {
        Row: {
          address: string | null
          ai_responses_month_resets_at: string | null
          ai_responses_this_month: number
          billing_active: boolean
          created_at: string
          google_maps_url: string | null
          google_oauth_tokens_encrypted: string | null
          id: string
          meta_phone_number_id: string | null
          meta_waba_id: string | null
          name: string
          onboarding_complete: boolean
          owner_id: string
          phone: string | null
          plan: string | null
          sector: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          twilio_whatsapp_number: string | null
          updated_at: string
          whatsapp_provider: string | null
        }
        Insert: {
          address?: string | null
          ai_responses_month_resets_at?: string | null
          ai_responses_this_month?: number
          billing_active?: boolean
          created_at?: string
          google_maps_url?: string | null
          google_oauth_tokens_encrypted?: string | null
          id?: string
          meta_phone_number_id?: string | null
          meta_waba_id?: string | null
          name: string
          onboarding_complete?: boolean
          owner_id: string
          phone?: string | null
          plan?: string | null
          sector?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          twilio_whatsapp_number?: string | null
          updated_at?: string
          whatsapp_provider?: string | null
        }
        Update: {
          address?: string | null
          ai_responses_month_resets_at?: string | null
          ai_responses_this_month?: number
          billing_active?: boolean
          created_at?: string
          google_maps_url?: string | null
          google_oauth_tokens_encrypted?: string | null
          id?: string
          meta_phone_number_id?: string | null
          meta_waba_id?: string | null
          name?: string
          onboarding_complete?: boolean
          owner_id?: string
          phone?: string | null
          plan?: string | null
          sector?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          twilio_whatsapp_number?: string | null
          updated_at?: string
          whatsapp_provider?: string | null
        }
        Relationships: []
      }
      conversations: {
        Row: {
          business_id: string
          created_at: string
          customer_name: string | null
          customer_phone: string
          follow_ups_sent: number
          id: string
          last_message_at: string
          notes: string | null
          pending_service_id: string | null
          pending_slots: Json | null
          status: string
        }
        Insert: {
          business_id: string
          created_at?: string
          customer_name?: string | null
          customer_phone: string
          follow_ups_sent?: number
          id?: string
          last_message_at?: string
          notes?: string | null
          pending_service_id?: string | null
          pending_slots?: Json | null
          status?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          customer_name?: string | null
          customer_phone?: string
          follow_ups_sent?: number
          id?: string
          last_message_at?: string
          notes?: string | null
          pending_service_id?: string | null
          pending_slots?: Json | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_business_id_fkey"
            columns: ["business_id"]
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_pending_service_id_fkey"
            columns: ["pending_service_id"]
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      follow_up_queue: {
        Row: {
          business_id: string
          conversation_id: string
          created_at: string
          id: string
          scheduled_at: string
          sent_at: string | null
          status: string
          template_type: string
        }
        Insert: {
          business_id: string
          conversation_id: string
          created_at?: string
          id?: string
          scheduled_at: string
          sent_at?: string | null
          status?: string
          template_type: string
        }
        Update: {
          business_id?: string
          conversation_id?: string
          created_at?: string
          id?: string
          scheduled_at?: string
          sent_at?: string | null
          status?: string
          template_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "follow_up_queue_business_id_fkey"
            columns: ["business_id"]
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follow_up_queue_conversation_id_fkey"
            columns: ["conversation_id"]
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          business_id: string
          content: string
          conversation_id: string
          direction: string
          id: string
          metadata: Json
          sent_at: string
        }
        Insert: {
          business_id: string
          content: string
          conversation_id: string
          direction: string
          id?: string
          metadata?: Json
          sent_at?: string
        }
        Update: {
          business_id?: string
          content?: string
          conversation_id?: string
          direction?: string
          id?: string
          metadata?: Json
          sent_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_business_id_fkey"
            columns: ["business_id"]
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          active: boolean
          business_id: string
          created_at: string
          description: string | null
          duration_minutes: number
          id: string
          name: string
          price_cents: number
        }
        Insert: {
          active?: boolean
          business_id: string
          created_at?: string
          description?: string | null
          duration_minutes: number
          id?: string
          name: string
          price_cents: number
        }
        Update: {
          active?: boolean
          business_id?: string
          created_at?: string
          description?: string | null
          duration_minutes?: number
          id?: string
          name?: string
          price_cents?: number
        }
        Relationships: [
          {
            foreignKeyName: "services_business_id_fkey"
            columns: ["business_id"]
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
