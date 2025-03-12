import { useDrizzle } from '@/db/provider'
import { chatMessagesTable } from '@/db/schema'
import { useSettings } from '@/settings/provider'
import { ChatMessagePart } from '@/types'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Message } from 'ai'
import { eq } from 'drizzle-orm'
import { useEffect } from 'react'
import { useParams } from 'react-router'
import Chat from './chat'

export default function ChatDetailPage() {
  const params = useParams()
  const { db } = useDrizzle()
  const settingsContext = useSettings()
  const queryClient = useQueryClient()

  // Use React Query to fetch messages
  const {
    data: messages,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['chatMessages', params.chatThreadId],
    queryFn: async () => {
      if (!params.chatThreadId) return null

      try {
        const chatMessages = await db.select().from(chatMessagesTable).where(eq(chatMessagesTable.chat_thread_id, params.chatThreadId)).orderBy(chatMessagesTable.id)

        return chatMessages.map((message) => ({
          id: message.id,
          parts: message.parts,
          role: message.role,
          content: message.content,
          createdAt: new Date(message.id),
        }))
      } catch (error) {
        console.error('Error fetching messages:', error)
        throw error
      }
    },
    enabled: !!params.chatThreadId,
  })

  const addMessageMutation = useMutation({
    mutationFn: async (lastMessage: Message) => {
      if (!params.chatThreadId) throw new Error('No chat thread ID')

      return await db.insert(chatMessagesTable).values({
        id: lastMessage.id,
        parts: lastMessage.parts || [],
        role: lastMessage.role,
        content: lastMessage.content,
        chat_thread_id: params.chatThreadId,
        model: 'gpt-4o',
        provider: 'openai',
      })
    },
    onSuccess: () => {
      // Invalidate and refetch messages after adding a new one
      queryClient.invalidateQueries({ queryKey: ['chatMessages', params.chatThreadId] })
    },
  })

  const onFinish = async (response: { readonly messages: Array<Message> }) => {
    if (!params.chatThreadId) return

    const lastMessage = response.messages[response.messages.length - 1]

    const parts: ChatMessagePart[] = typeof lastMessage.content === 'object' ? lastMessage.content : []
    const content = lastMessage.content ? lastMessage.content : parts.find((part) => part.type === 'text')?.text || ''

    await addMessageMutation.mutateAsync({
      ...lastMessage,
      parts,
      content,
    })
  }

  useEffect(() => {
    console.log('messages A', messages)
  }, [messages])

  return (
    <>
      <div className="h-full w-full">
        {isLoading ? (
          <div>Loading chat...</div>
        ) : isError ? (
          <div>Error loading chat</div>
        ) : messages ? (
          <Chat key={params.chatThreadId} apiKey={settingsContext.settings.models?.openai_api_key!} initialMessages={messages} onFinish={onFinish} />
        ) : (
          <div>Error loading chat</div>
        )}
      </div>
    </>
  )
}
