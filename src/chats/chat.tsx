import { useDrizzle } from '@/db/provider'
import { modelsTable, settingsTable } from '@/db/tables'
import { Model, SaveMessagesFunction, Setting } from '@/types'
import { useQuery } from '@tanstack/react-query'
import { UIMessage } from 'ai'
import ChatState from './chat-state'

interface ChatProps {
  id: string
  initialMessages: UIMessage[] | undefined
  saveMessages: SaveMessagesFunction
}

export default function Chat({ id, initialMessages, saveMessages }: ChatProps) {
  const { db } = useDrizzle()

  const { data: models = [] } = useQuery<Model[]>({
    queryKey: ['models'],
    queryFn: async () => {
      return await db.select().from(modelsTable)
    },
  })

  const { data: settings = [] } = useQuery<Setting[]>({
    queryKey: ['settings'],
    queryFn: async () => {
      return await db.select().from(settingsTable)
    },
  })

  if (!models || !settings) {
    return <div>Loading...</div>
  }

  return <ChatState id={id} models={models} initialMessages={initialMessages} saveMessages={saveMessages} />
}
