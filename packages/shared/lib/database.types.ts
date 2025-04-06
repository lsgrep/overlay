export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      auth_details: {
        Row: {
          access_token: string;
          created_at: string;
          email: string;
          expiry_date: number | null;
          id: number;
          id_token: string | null;
          metadata: Json | null;
          refresh_token: string | null;
          scopes: string[] | null;
          uid: string;
          updated_at: string;
          user_info: Json | null;
          vendor: string;
        };
        Insert: {
          access_token: string;
          created_at?: string;
          email: string;
          expiry_date?: number | null;
          id?: number;
          id_token?: string | null;
          metadata?: Json | null;
          refresh_token?: string | null;
          scopes?: string[] | null;
          uid: string;
          updated_at?: string;
          user_info?: Json | null;
          vendor: string;
        };
        Update: {
          access_token?: string;
          created_at?: string;
          email?: string;
          expiry_date?: number | null;
          id?: number;
          id_token?: string | null;
          metadata?: Json | null;
          refresh_token?: string | null;
          scopes?: string[] | null;
          uid?: string;
          updated_at?: string;
          user_info?: Json | null;
          vendor?: string;
        };
        Relationships: [];
      };
      completions: {
        Row: {
          completion_id: string;
          created_at: string;
          id: number;
          is_public: boolean;
          metadata: Json | null;
          mode: string | null;
          model_display_name: string | null;
          model_name: string | null;
          model_provider: string | null;
          prompt: Json | null;
          prompt_content: string;
          prompt_timestamp: number | null;
          question_id: string | null;
          response_content: string;
          response_timestamp: number | null;
          source_url: string | null;
          uid: string;
        };
        Insert: {
          completion_id?: string;
          created_at?: string;
          id?: number;
          is_public?: boolean;
          metadata?: Json | null;
          mode?: string | null;
          model_display_name?: string | null;
          model_name?: string | null;
          model_provider?: string | null;
          prompt?: Json | null;
          prompt_content: string;
          prompt_timestamp?: number | null;
          question_id?: string | null;
          response_content: string;
          response_timestamp?: number | null;
          source_url?: string | null;
          uid: string;
        };
        Update: {
          completion_id?: string;
          created_at?: string;
          id?: number;
          is_public?: boolean;
          metadata?: Json | null;
          mode?: string | null;
          model_display_name?: string | null;
          model_name?: string | null;
          model_provider?: string | null;
          prompt?: Json | null;
          prompt_content?: string;
          prompt_timestamp?: number | null;
          question_id?: string | null;
          response_content?: string;
          response_timestamp?: number | null;
          source_url?: string | null;
          uid?: string;
        };
        Relationships: [];
      };
      note_attachments: {
        Row: {
          created_at: string;
          file_name: string;
          file_path: string;
          file_size: number;
          file_type: string;
          id: string;
          metadata: Json | null;
          note_id: string;
          storage_path: string;
        };
        Insert: {
          created_at?: string;
          file_name: string;
          file_path: string;
          file_size: number;
          file_type: string;
          id?: string;
          metadata?: Json | null;
          note_id: string;
          storage_path: string;
        };
        Update: {
          created_at?: string;
          file_name?: string;
          file_path?: string;
          file_size?: number;
          file_type?: string;
          id?: string;
          metadata?: Json | null;
          note_id?: string;
          storage_path?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'note_attachments_note_id_fkey';
            columns: ['note_id'];
            isOneToOne: false;
            referencedRelation: 'notes';
            referencedColumns: ['id'];
          },
        ];
      };
      notes: {
        Row: {
          content: string | null;
          created_at: string;
          id: string;
          is_archived: boolean | null;
          is_favorite: boolean | null;
          metadata: Json | null;
          source_url: string | null;
          tags: string[] | null;
          title: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          content?: string | null;
          created_at?: string;
          id?: string;
          is_archived?: boolean | null;
          is_favorite?: boolean | null;
          metadata?: Json | null;
          source_url?: string | null;
          tags?: string[] | null;
          title?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          content?: string | null;
          created_at?: string;
          id?: string;
          is_archived?: boolean | null;
          is_favorite?: boolean | null;
          metadata?: Json | null;
          source_url?: string | null;
          tags?: string[] | null;
          title?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      user_preferences: {
        Row: {
          created_at: string;
          default_model: string | null;
          default_task_list: string | null;
          id: string;
          language: string | null;
          theme: string | null;
          timezone: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          default_model?: string | null;
          default_task_list?: string | null;
          id?: string;
          language?: string | null;
          theme?: string | null;
          timezone?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          default_model?: string | null;
          default_task_list?: string | null;
          id?: string;
          language?: string | null;
          theme?: string | null;
          timezone?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type PublicSchema = Database[Extract<keyof Database, 'public'>];

export type Tables<
  PublicTableNameOrOptions extends keyof (PublicSchema['Tables'] & PublicSchema['Views']) | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions['schema']]['Tables'] &
        Database[PublicTableNameOrOptions['schema']]['Views'])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions['schema']]['Tables'] &
      Database[PublicTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema['Tables'] & PublicSchema['Views'])
    ? (PublicSchema['Tables'] & PublicSchema['Views'])[PublicTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  PublicTableNameOrOptions extends keyof PublicSchema['Tables'] | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions['schema']]['Tables']
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema['Tables']
    ? PublicSchema['Tables'][PublicTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  PublicTableNameOrOptions extends keyof PublicSchema['Tables'] | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions['schema']]['Tables']
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema['Tables']
    ? PublicSchema['Tables'][PublicTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  PublicEnumNameOrOptions extends keyof PublicSchema['Enums'] | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions['schema']]['Enums'][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema['Enums']
    ? PublicSchema['Enums'][PublicEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends keyof PublicSchema['CompositeTypes'] | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema['CompositeTypes']
    ? PublicSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;
