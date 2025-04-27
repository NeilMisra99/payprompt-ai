export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          updated_at: string | null;
          username: string | null;
          full_name: string | null;
          avatar_url: string | null;
          company_name: string | null;
          company_logo: string | null;
          company_address: string | null;
        };
        Insert: {
          id: string;
          updated_at?: string | null;
          username?: string | null;
          full_name?: string | null;
          avatar_url?: string | null;
          company_name?: string | null;
          company_logo?: string | null;
          company_address?: string | null;
        };
        Update: {
          id?: string;
          updated_at?: string | null;
          username?: string | null;
          full_name?: string | null;
          avatar_url?: string | null;
          company_name?: string | null;
          company_logo?: string | null;
          company_address?: string | null;
        };
      };
      clients: {
        Row: {
          id: string;
          created_at: string;
          name: string;
          email: string;
          phone: string | null;
          address: string | null;
          contact_person: string | null;
          user_id: string;
        };
        Insert: {
          id?: string;
          created_at?: string;
          name: string;
          email: string;
          phone?: string | null;
          address?: string | null;
          contact_person?: string | null;
          user_id: string;
        };
        Update: {
          id?: string;
          created_at?: string;
          name?: string;
          email?: string;
          phone?: string | null;
          address?: string | null;
          contact_person?: string | null;
          user_id?: string;
        };
      };
      invoices: {
        Row: {
          id: string;
          created_at: string;
          user_id: string;
          client_id: string;
          invoice_number: string;
          issue_date: string;
          due_date: string;
          subtotal: number;
          tax: number;
          discount: number;
          total: number;
          status: "draft" | "sent" | "paid" | "overdue";
          notes: string | null;
          payment_terms: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          user_id: string;
          client_id: string;
          invoice_number: string;
          issue_date: string;
          due_date: string;
          subtotal: number;
          tax: number;
          discount: number;
          total: number;
          status?: "draft" | "sent" | "paid" | "overdue";
          notes?: string | null;
          payment_terms?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          user_id?: string;
          client_id?: string;
          invoice_number?: string;
          issue_date?: string;
          due_date?: string;
          subtotal?: number;
          tax?: number;
          discount?: number;
          total?: number;
          status?: "draft" | "sent" | "paid" | "overdue";
          notes?: string | null;
          payment_terms?: string | null;
        };
      };
      invoice_items: {
        Row: {
          id: string;
          created_at: string;
          invoice_id: string;
          description: string;
          quantity: number;
          price: number;
          amount: number;
        };
        Insert: {
          id?: string;
          created_at?: string;
          invoice_id: string;
          description: string;
          quantity: number;
          price: number;
          amount: number;
        };
        Update: {
          id?: string;
          created_at?: string;
          invoice_id?: string;
          description?: string;
          quantity?: number;
          price?: number;
          amount?: number;
        };
      };
      reminders: {
        Row: {
          id: string;
          created_at: string;
          invoice_id: string;
          sent_at: string | null;
          type: "upcoming" | "overdue";
          message: string;
          status: "pending" | "sent" | "failed";
        };
        Insert: {
          id?: string;
          created_at?: string;
          invoice_id: string;
          sent_at?: string | null;
          type: "upcoming" | "overdue";
          message: string;
          status?: "pending" | "sent" | "failed";
        };
        Update: {
          id?: string;
          created_at?: string;
          invoice_id?: string;
          sent_at?: string | null;
          type?: "upcoming" | "overdue";
          message?: string;
          status?: "pending" | "sent" | "failed";
        };
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
  };
}
