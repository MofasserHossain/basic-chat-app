export interface ChatMessage {
  id: string
  content: string
  senderId: string
  conversationId: string
  createdAt: string
  sender: {
    id: string
    name: string
    username: string
  }
}

export interface SocketUserData {
  userId: string
  username: string
  email: string
}
