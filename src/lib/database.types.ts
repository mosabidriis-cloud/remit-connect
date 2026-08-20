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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      assignments: {
        Row: {
          assigned_at: string | null
          assigned_branch_id: string | null
          assigned_branch_name: string | null
          assigned_by: string | null
          batch_reference: string
          created_at: string
          id: string
          invalid_count: number
          manual_review_count: number
          ready_transaction_count: number
          shared_batch_id: string
          status: string
        }
        Insert: {
          assigned_at?: string | null
          assigned_branch_id?: string | null
          assigned_branch_name?: string | null
          assigned_by?: string | null
          batch_reference: string
          created_at?: string
          id: string
          invalid_count?: number
          manual_review_count?: number
          ready_transaction_count?: number
          shared_batch_id: string
          status: string
        }
        Update: {
          assigned_at?: string | null
          assigned_branch_id?: string | null
          assigned_branch_name?: string | null
          assigned_by?: string | null
          batch_reference?: string
          created_at?: string
          id?: string
          invalid_count?: number
          manual_review_count?: number
          ready_transaction_count?: number
          shared_batch_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "assignments_shared_batch_id_fkey"
            columns: ["shared_batch_id"]
            isOneToOne: false
            referencedRelation: "shared_batches"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_events: {
        Row: {
          action: string
          actor_role: string
          actor_user_id: string
          branch_id: string | null
          created_at: string
          details: string
          entity_id: string
          entity_type: string
          id: string
          performed_at: string
        }
        Insert: {
          action: string
          actor_role: string
          actor_user_id: string
          branch_id?: string | null
          created_at?: string
          details: string
          entity_id: string
          entity_type: string
          id: string
          performed_at: string
        }
        Update: {
          action?: string
          actor_role?: string
          actor_user_id?: string
          branch_id?: string | null
          created_at?: string
          details?: string
          entity_id?: string
          entity_type?: string
          id?: string
          performed_at?: string
        }
        Relationships: []
      }
      batch_requests: {
        Row: {
          branch_id: string
          created_at: string
          fulfilled_by_shared_batch_id: string | null
          id: string
          note: string | null
          requested_by_user_id: string
          resolved_at: string | null
          resolved_by_user_id: string | null
          status: string
        }
        Insert: {
          branch_id: string
          created_at?: string
          fulfilled_by_shared_batch_id?: string | null
          id: string
          note?: string | null
          requested_by_user_id: string
          resolved_at?: string | null
          resolved_by_user_id?: string | null
          status?: string
        }
        Update: {
          branch_id?: string
          created_at?: string
          fulfilled_by_shared_batch_id?: string | null
          id?: string
          note?: string | null
          requested_by_user_id?: string
          resolved_at?: string | null
          resolved_by_user_id?: string | null
          status?: string
        }
        Relationships: []
      }
      beneficiaries: {
        Row: {
          account_number: string | null
          amount: number
          bank_name: string | null
          beneficiary_name: string
          created_at: string
          currency: string
          destination_country: string | null
          direct_remit_reference: string
          id: string
          manual_review_reason: string | null
          manual_review_required: boolean
          processing_status_id: string
          receipt_uploaded: boolean
          return_reason_id: string | null
          shared_batch_id: string
          transaction_date: string | null
        }
        Insert: {
          account_number?: string | null
          amount: number
          bank_name?: string | null
          beneficiary_name: string
          created_at?: string
          currency: string
          destination_country?: string | null
          direct_remit_reference: string
          id: string
          manual_review_reason?: string | null
          manual_review_required?: boolean
          processing_status_id: string
          receipt_uploaded?: boolean
          return_reason_id?: string | null
          shared_batch_id: string
          transaction_date?: string | null
        }
        Update: {
          account_number?: string | null
          amount?: number
          bank_name?: string | null
          beneficiary_name?: string
          created_at?: string
          currency?: string
          destination_country?: string | null
          direct_remit_reference?: string
          id?: string
          manual_review_reason?: string | null
          manual_review_required?: boolean
          processing_status_id?: string
          receipt_uploaded?: boolean
          return_reason_id?: string | null
          shared_batch_id?: string
          transaction_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "beneficiaries_shared_batch_id_fkey"
            columns: ["shared_batch_id"]
            isOneToOne: false
            referencedRelation: "shared_batches"
            referencedColumns: ["id"]
          },
        ]
      }
      branch_processing_queue_items: {
        Row: {
          assignment_id: string
          beneficiary_id: string
          branch_id: string
          completed_at: string | null
          completed_by_user_id: string | null
          created_at: string
          held_at: string | null
          held_by_user_id: string | null
          hold_comment: string | null
          hold_reason_id: string | null
          id: string
          payout_account_id: string | null
          return_comment: string | null
          return_reason_id: string | null
          returned_at: string | null
          returned_by_user_id: string | null
          started_at: string | null
          status: string
        }
        Insert: {
          assignment_id: string
          beneficiary_id: string
          branch_id: string
          completed_at?: string | null
          completed_by_user_id?: string | null
          created_at?: string
          held_at?: string | null
          held_by_user_id?: string | null
          hold_comment?: string | null
          hold_reason_id?: string | null
          id: string
          payout_account_id?: string | null
          return_comment?: string | null
          return_reason_id?: string | null
          returned_at?: string | null
          returned_by_user_id?: string | null
          started_at?: string | null
          status: string
        }
        Update: {
          assignment_id?: string
          beneficiary_id?: string
          branch_id?: string
          completed_at?: string | null
          completed_by_user_id?: string | null
          created_at?: string
          held_at?: string | null
          held_by_user_id?: string | null
          hold_comment?: string | null
          hold_reason_id?: string | null
          id?: string
          payout_account_id?: string | null
          return_comment?: string | null
          return_reason_id?: string | null
          returned_at?: string | null
          returned_by_user_id?: string | null
          started_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "branch_processing_queue_items_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branch_processing_queue_items_beneficiary_id_fkey"
            columns: ["beneficiary_id"]
            isOneToOne: false
            referencedRelation: "beneficiaries"
            referencedColumns: ["id"]
          },
        ]
      }
      branch_processing_status: {
        Row: {
          branch_id: string
          created_at: string
          status: string
        }
        Insert: {
          branch_id: string
          created_at?: string
          status: string
        }
        Update: {
          branch_id?: string
          created_at?: string
          status?: string
        }
        Relationships: []
      }
      funding_entries: {
        Row: {
          account_id: string
          funding_amount: number
          funding_event_id: string
          id: number
          new_balance: number
          previous_balance: number
        }
        Insert: {
          account_id: string
          funding_amount: number
          funding_event_id: string
          id?: never
          new_balance: number
          previous_balance: number
        }
        Update: {
          account_id?: string
          funding_amount?: number
          funding_event_id?: string
          id?: never
          new_balance?: number
          previous_balance?: number
        }
        Relationships: [
          {
            foreignKeyName: "funding_entries_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "payout_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "funding_entries_funding_event_id_fkey"
            columns: ["funding_event_id"]
            isOneToOne: false
            referencedRelation: "funding_events"
            referencedColumns: ["id"]
          },
        ]
      }
      funding_events: {
        Row: {
          branch_id: string
          created_at: string
          id: string
          notes: string | null
          reference: string | null
          total_amount: number
          updated_at: string
          updated_by_user_id: string
        }
        Insert: {
          branch_id: string
          created_at?: string
          id: string
          notes?: string | null
          reference?: string | null
          total_amount: number
          updated_at: string
          updated_by_user_id: string
        }
        Update: {
          branch_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          reference?: string | null
          total_amount?: number
          updated_at?: string
          updated_by_user_id?: string
        }
        Relationships: []
      }
      import_batches: {
        Row: {
          batch_reference: string
          business_date_max: string | null
          business_date_min: string | null
          created_at: string
          currency: string | null
          duplicate_status: string
          file_checksum: string
          file_name: string
          id: string
          invalid_record_count: number | null
          manual_review_record_count: number | null
          replaces_batch_id: string | null
          reporting_period: string
          source: string
          total_amount: number | null
          transaction_count: number
          upload_timestamp: string
          uploaded_by_user_id: string
          valid_record_count: number | null
        }
        Insert: {
          batch_reference: string
          business_date_max?: string | null
          business_date_min?: string | null
          created_at?: string
          currency?: string | null
          duplicate_status?: string
          file_checksum: string
          file_name: string
          id?: string
          invalid_record_count?: number | null
          manual_review_record_count?: number | null
          replaces_batch_id?: string | null
          reporting_period: string
          source?: string
          total_amount?: number | null
          transaction_count?: number
          upload_timestamp?: string
          uploaded_by_user_id?: string
          valid_record_count?: number | null
        }
        Update: {
          batch_reference?: string
          business_date_max?: string | null
          business_date_min?: string | null
          created_at?: string
          currency?: string | null
          duplicate_status?: string
          file_checksum?: string
          file_name?: string
          id?: string
          invalid_record_count?: number | null
          manual_review_record_count?: number | null
          replaces_batch_id?: string | null
          reporting_period?: string
          source?: string
          total_amount?: number | null
          transaction_count?: number
          upload_timestamp?: string
          uploaded_by_user_id?: string
          valid_record_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "import_batches_replaces_batch_id_fkey"
            columns: ["replaces_batch_id"]
            isOneToOne: false
            referencedRelation: "import_batches"
            referencedColumns: ["id"]
          },
        ]
      }
      import_beneficiaries: {
        Row: {
          account_number: string | null
          amount: number
          bank_name: string | null
          beneficiary_name: string
          business_date: string | null
          created_at: string
          currency: string
          destination_country: string | null
          direct_remit_reference: string
          id: string
          import_batch_id: string
          processing_status_id: string
        }
        Insert: {
          account_number?: string | null
          amount: number
          bank_name?: string | null
          beneficiary_name: string
          business_date?: string | null
          created_at?: string
          currency: string
          destination_country?: string | null
          direct_remit_reference: string
          id?: string
          import_batch_id: string
          processing_status_id: string
        }
        Update: {
          account_number?: string | null
          amount?: number
          bank_name?: string | null
          beneficiary_name?: string
          business_date?: string | null
          created_at?: string
          currency?: string
          destination_country?: string | null
          direct_remit_reference?: string
          id?: string
          import_batch_id?: string
          processing_status_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "import_beneficiaries_import_batch_id_fkey"
            columns: ["import_batch_id"]
            isOneToOne: false
            referencedRelation: "import_batches"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          branch_id: string
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          is_read: boolean
          message: string
          recipient_user_id: string
          title: string
          type: string
        }
        Insert: {
          branch_id: string
          created_at?: string
          entity_id: string
          entity_type: string
          id: string
          is_read?: boolean
          message: string
          recipient_user_id: string
          title: string
          type: string
        }
        Update: {
          branch_id?: string
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          is_read?: boolean
          message?: string
          recipient_user_id?: string
          title?: string
          type?: string
        }
        Relationships: []
      }
      payout_accounts: {
        Row: {
          account_number: string
          bank: string
          branch_id: string
          created_at: string
          currency: string
          current_balance: number
          id: string
          last_updated_at: string
          last_updated_by_user_id: string
          minimum_threshold: number
          status: string
        }
        Insert: {
          account_number: string
          bank: string
          branch_id: string
          created_at?: string
          currency: string
          current_balance: number
          id: string
          last_updated_at: string
          last_updated_by_user_id: string
          minimum_threshold: number
          status: string
        }
        Update: {
          account_number?: string
          bank?: string
          branch_id?: string
          created_at?: string
          currency?: string
          current_balance?: number
          id?: string
          last_updated_at?: string
          last_updated_by_user_id?: string
          minimum_threshold?: number
          status?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          account: string
          account_locked: boolean
          branch_id: string | null
          created_at: string
          created_by: string | null
          employee_id: string
          force_password_change: boolean
          full_name: string
          id: string
          last_login_at: string | null
          last_updated_at: string
          last_updated_by: string | null
          organization: string
          role: string
          status: string
          username: string
        }
        Insert: {
          account?: string
          account_locked?: boolean
          branch_id?: string | null
          created_at?: string
          created_by?: string | null
          employee_id: string
          force_password_change?: boolean
          full_name: string
          id: string
          last_login_at?: string | null
          last_updated_at?: string
          last_updated_by?: string | null
          organization?: string
          role: string
          status?: string
          username: string
        }
        Update: {
          account?: string
          account_locked?: boolean
          branch_id?: string | null
          created_at?: string
          created_by?: string | null
          employee_id?: string
          force_password_change?: boolean
          full_name?: string
          id?: string
          last_login_at?: string | null
          last_updated_at?: string
          last_updated_by?: string | null
          organization?: string
          role?: string
          status?: string
          username?: string
        }
        Relationships: []
      }
      proofs: {
        Row: {
          created_at: string
          expires_at: string
          file_name: string
          file_size: number
          file_type: string
          id: string
          queue_item_id: string
          status: string
          storage_path: string
          uploaded_at: string
          uploaded_by_user_id: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          file_name: string
          file_size: number
          file_type: string
          id: string
          queue_item_id: string
          status: string
          storage_path: string
          uploaded_at: string
          uploaded_by_user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          file_name?: string
          file_size?: number
          file_type?: string
          id?: string
          queue_item_id?: string
          status?: string
          storage_path?: string
          uploaded_at?: string
          uploaded_by_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "proofs_queue_item_id_fkey"
            columns: ["queue_item_id"]
            isOneToOne: false
            referencedRelation: "branch_processing_queue_items"
            referencedColumns: ["id"]
          },
        ]
      }
      shared_batches: {
        Row: {
          assigned_at: string | null
          assigned_beneficiaries: number
          assigned_branch_id: string | null
          assigned_by_user_id: string | null
          assignment_status: string
          completed_beneficiaries: number
          created_at: string
          duplicate_reference_count: number
          file_name: string
          id: string
          is_locked: boolean
          last_reassigned_at: string | null
          last_reassigned_by_user_id: string | null
          last_reassignment_reason: string | null
          lifecycle_status: string
          manual_review_count: number
          reference: string
          returned_beneficiaries: number
          total_beneficiaries: number
          upload_date: string
          uploaded_by_user_id: string
        }
        Insert: {
          assigned_at?: string | null
          assigned_beneficiaries?: number
          assigned_branch_id?: string | null
          assigned_by_user_id?: string | null
          assignment_status: string
          completed_beneficiaries?: number
          created_at?: string
          duplicate_reference_count?: number
          file_name: string
          id: string
          is_locked?: boolean
          last_reassigned_at?: string | null
          last_reassigned_by_user_id?: string | null
          last_reassignment_reason?: string | null
          lifecycle_status: string
          manual_review_count?: number
          reference: string
          returned_beneficiaries?: number
          total_beneficiaries?: number
          upload_date: string
          uploaded_by_user_id: string
        }
        Update: {
          assigned_at?: string | null
          assigned_beneficiaries?: number
          assigned_branch_id?: string | null
          assigned_by_user_id?: string | null
          assignment_status?: string
          completed_beneficiaries?: number
          created_at?: string
          duplicate_reference_count?: number
          file_name?: string
          id?: string
          is_locked?: boolean
          last_reassigned_at?: string | null
          last_reassigned_by_user_id?: string | null
          last_reassignment_reason?: string | null
          lifecycle_status?: string
          manual_review_count?: number
          reference?: string
          returned_beneficiaries?: number
          total_beneficiaries?: number
          upload_date?: string
          uploaded_by_user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      clear_force_password_change: { Args: never; Returns: undefined }
      current_user_branch_id: { Args: never; Returns: string }
      current_user_role: { Args: never; Returns: string }
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
    Enums: {},
  },
} as const
