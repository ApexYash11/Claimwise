export interface BackendChatLog {
  id: string
  policy_id?: string
  question: string
  answer: string
  created_at: string
  chat_type?: string
}

export interface HistoryPagination {
  has_more_chat_logs?: boolean
}

export interface BackendHistoryResponse {
  chat_logs?: BackendChatLog[]
  pagination?: HistoryPagination
}
