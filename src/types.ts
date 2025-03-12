import { ReasoningUIPart, SourceUIPart, TextUIPart, ToolInvocationUIPart } from '@ai-sdk/ui-utils'
import { SqliteRemoteDatabase } from 'drizzle-orm/sqlite-proxy'
import * as schema from './db/schema'
import Database from './lib/libsql'
import { Settings as SettingsType } from './types'

export type InitData = {
  db: SqliteRemoteDatabase<typeof schema>
  sqlite: Database
  settings: SettingsType
}

export type ChatMessagePart = TextUIPart | ReasoningUIPart | ToolInvocationUIPart | SourceUIPart
export type ChatMessageRole = 'system' | 'user' | 'assistant' | 'data'

export type AccountsSettings = {
  hostname: string
  port: number
  username: string
  password: string
}

export type ModelsSettings = {
  openai_api_key: string
}

export type Settings = {
  account?: AccountsSettings
  models?: ModelsSettings
}

export type DrizzleContextType = {
  db: SqliteRemoteDatabase<typeof schema>
  sqlite: Database
}
