export interface Snippet {
  id: string
  user_id: string | null
  title: string
  description: string | null
  language: "cpp" | "python" | "java" | string
  category: "templates" | "data_structures" | "graphs" | "math" | "techniques" | string
  code: string
  complexity: string | null
  usage_notes: string | null
  is_official: boolean
  is_favorited: boolean
  created_at: string
  updated_at: string
}

export interface SnippetListResponse {
  items: Snippet[]
  total: number
  limit: number
  offset: number
}

export interface SnippetCreate {
  title: string
  description?: string
  language: string
  category: string
  code: string
  complexity?: string
  usage_notes?: string
}

export interface SnippetUpdate {
  title?: string
  description?: string
  language?: string
  category?: string
  code?: string
  complexity?: string
  usage_notes?: string
}
