export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          full_name: string
          email: string
          role: 'admin' | 'user'
          is_locked: boolean
          created_at: string
        }
        Insert: Partial<Database['public']['Tables']['profiles']['Row']> & { id: string }
        Update: Partial<Database['public']['Tables']['profiles']['Row']>
      }
      companies: {
        Row: {
          id: string
          name: string
          status: 'Prospect' | 'Client'
          website: string | null
          industry: string | null
          notes: string | null
          created_at: string
          created_by: string | null
        }
        Insert: Omit<Database['public']['Tables']['companies']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['companies']['Insert']>
      }
      company_contacts: {
        Row: {
          id: string
          company_id: string
          name: string
          title: string | null
          email: string | null
          phone: string | null
          linkedin: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['company_contacts']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['company_contacts']['Insert']>
      }
      candidates: {
        Row: {
          id: string
          name: string
          email: string | null
          phone: string | null
          linkedin: string | null
          current_title: string | null
          current_company: string | null
          current_company_url: string | null
          time_in_current_role: string | null
          previous_title: string | null
          previous_company: string | null
          previous_dates: string | null
          tags: string[]
          source_list: string | null
          created_at: string
          created_by: string | null
        }
        Insert: Omit<Database['public']['Tables']['candidates']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['candidates']['Insert']>
      }
      jobs: {
        Row: {
          id: string
          title: string
          description: string | null
          salary_min: number | null
          salary_max: number | null
          location: string | null
          status: 'Active' | 'On Hold' | 'Filled' | 'Cancelled'
          company_id: string
          contact_id: string | null
          created_at: string
          created_by: string | null
        }
        Insert: Omit<Database['public']['Tables']['jobs']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['jobs']['Insert']>
      }
      pipeline: {
        Row: {
          id: string
          candidate_id: string
          job_id: string
          stage: string
          added_at: string
          added_by: string | null
        }
        Insert: Omit<Database['public']['Tables']['pipeline']['Row'], 'id' | 'added_at'>
        Update: Partial<Database['public']['Tables']['pipeline']['Insert']>
      }
      activities: {
        Row: {
          id: string
          candidate_id: string
          job_id: string | null
          type: 'note' | 'called' | 'voicemail' | 'emailed' | 'linkedin' | 'texted' | 'stage_change' | 'added'
          content: string | null
          created_at: string
          created_by: string | null
          created_by_name: string
        }
        Insert: Omit<Database['public']['Tables']['activities']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['activities']['Insert']>
      }
    }
  }
}

// Convenience types
export type Profile = Database['public']['Tables']['profiles']['Row']
export type Company = Database['public']['Tables']['companies']['Row']
export type CompanyContact = Database['public']['Tables']['company_contacts']['Row']
export type Candidate = Database['public']['Tables']['candidates']['Row']
export type Job = Database['public']['Tables']['jobs']['Row']
export type Pipeline = Database['public']['Tables']['pipeline']['Row']
export type Activity = Database['public']['Tables']['activities']['Row']
