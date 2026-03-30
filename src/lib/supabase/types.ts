export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      birds: {
        Row: {
          id: string
          name_da: string
          name_en: string
          scientific_name: string
          category: string
          is_common: boolean
          is_easy: boolean
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name_da: string
          name_en: string
          scientific_name: string
          category: string
          is_common?: boolean
          is_easy?: boolean
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name_da?: string
          name_en?: string
          scientific_name?: string
          category?: string
          is_common?: boolean
          is_easy?: boolean
          is_active?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      similarity_groups: {
        Row: {
          id: string
          slug: string
          name_da: string
          name_en: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          slug: string
          name_da: string
          name_en: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          slug?: string
          name_da?: string
          name_en?: string
          updated_at?: string
        }
        Relationships: []
      }
      bird_similarity_group: {
        Row: {
          bird_id: string
          group_id: string
        }
        Insert: {
          bird_id: string
          group_id: string
        }
        Update: {
          bird_id?: string
          group_id?: string
        }
        Relationships: []
      }
      bird_images: {
        Row: {
          id: string
          bird_id: string
          image_url: string | null
          storage_path: string | null
          source: string
          status: string
          is_primary: boolean
          quality_score: number | null
          flag_reason: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          bird_id: string
          image_url?: string | null
          storage_path?: string | null
          source?: string
          status?: string
          is_primary?: boolean
          quality_score?: number | null
          flag_reason?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          bird_id?: string
          image_url?: string | null
          storage_path?: string | null
          source?: string
          status?: string
          is_primary?: boolean
          quality_score?: number | null
          flag_reason?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          id: string
          display_name: string | null
          role: string
          tier: string
          total_quizzes: number
          total_correct: number
          total_answered: number
          best_streak: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          display_name?: string | null
          role?: string
          tier?: string
          total_quizzes?: number
          total_correct?: number
          total_answered?: number
          best_streak?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          display_name?: string | null
          role?: string
          tier?: string
          total_quizzes?: number
          total_correct?: number
          total_answered?: number
          best_streak?: number
          updated_at?: string
        }
        Relationships: []
      }
      user_bird_weights: {
        Row: {
          id: string
          user_id: string
          bird_id: string
          weight: number
          times_seen: number
          times_correct: number
          last_seen_at: string | null
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          bird_id: string
          weight?: number
          times_seen?: number
          times_correct?: number
          last_seen_at?: string | null
          updated_at?: string
        }
        Update: {
          weight?: number
          times_seen?: number
          times_correct?: number
          last_seen_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      quiz_sessions: {
        Row: {
          id: string
          user_id: string | null
          guest_id: string | null
          guest_name: string | null
          difficulty: string
          mode: string
          question_count: number
          score: number | null
          points: number | null
          duration_ms: number | null
          completed: boolean
          created_at: string
          completed_at: string | null
        }
        Insert: {
          id?: string
          user_id?: string | null
          guest_id?: string | null
          guest_name?: string | null
          difficulty: string
          mode: string
          question_count: number
          score?: number | null
          points?: number | null
          duration_ms?: number | null
          completed?: boolean
          created_at?: string
          completed_at?: string | null
        }
        Update: {
          user_id?: string | null
          guest_name?: string | null
          score?: number | null
          points?: number | null
          duration_ms?: number | null
          completed?: boolean
          completed_at?: string | null
        }
        Relationships: []
      }
      quiz_answers: {
        Row: {
          id: string
          session_id: string
          question_number: number
          bird_id: string
          chosen_bird_id: string | null
          is_correct: boolean
          response_time_ms: number | null
          mode: string
          created_at: string
        }
        Insert: {
          id?: string
          session_id: string
          question_number: number
          bird_id: string
          chosen_bird_id?: string | null
          is_correct: boolean
          response_time_ms?: number | null
          mode: string
          created_at?: string
        }
        Update: {
          is_correct?: boolean
          response_time_ms?: number | null
        }
        Relationships: []
      }
      bird_difficulty_stats: {
        Row: {
          bird_id: string
          times_shown: number
          times_correct: number
          difficulty_score: number | null
          avg_response_ms: number | null
          most_confused_with: string | null
          updated_at: string
        }
        Insert: {
          bird_id: string
          times_shown?: number
          times_correct?: number
          difficulty_score?: number | null
          avg_response_ms?: number | null
          most_confused_with?: string | null
          updated_at?: string
        }
        Update: {
          times_shown?: number
          times_correct?: number
          difficulty_score?: number | null
          avg_response_ms?: number | null
          most_confused_with?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          id: string
          user_id: string | null
          action: string
          entity_type: string
          entity_id: string | null
          old_data: Json | null
          new_data: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          action: string
          entity_type: string
          entity_id?: string | null
          old_data?: Json | null
          new_data?: Json | null
          created_at?: string
        }
        Update: Record<string, never>
        Relationships: []
      }
      distractor_overrides: {
        Row: {
          id: string
          bird_id: string
          target_bird_id: string
          rule: string
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          bird_id: string
          target_bird_id: string
          rule: string
          created_by?: string | null
          created_at?: string
        }
        Update: {
          rule?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          id: string
          user_id: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          status: string
          plan: string | null
          current_period_start: string | null
          current_period_end: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          status?: string
          plan?: string | null
          current_period_start?: string | null
          current_period_end?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          status?: string
          plan?: string | null
          current_period_start?: string | null
          current_period_end?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      payment_events: {
        Row: {
          id: string
          stripe_event_id: string
          event_type: string
          data: Json
          processed: boolean
          created_at: string
        }
        Insert: {
          id?: string
          stripe_event_id: string
          event_type: string
          data: Json
          processed?: boolean
          created_at?: string
        }
        Update: {
          processed?: boolean
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      refresh_bird_difficulty_stats: {
        Args: Record<string, never>
        Returns: undefined
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

// Convenience types
export type Bird = Database['public']['Tables']['birds']['Row']
export type BirdInsert = Database['public']['Tables']['birds']['Insert']
export type SimilarityGroup = Database['public']['Tables']['similarity_groups']['Row']
export type BirdImage = Database['public']['Tables']['bird_images']['Row']
export type Profile = Database['public']['Tables']['profiles']['Row']
export type UserBirdWeight = Database['public']['Tables']['user_bird_weights']['Row']
export type QuizSession = Database['public']['Tables']['quiz_sessions']['Row']
export type QuizAnswer = Database['public']['Tables']['quiz_answers']['Row']
export type AuditLogEntry = Database['public']['Tables']['audit_log']['Row']
export type DistractorOverride = Database['public']['Tables']['distractor_overrides']['Row']
