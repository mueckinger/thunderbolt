import { SqliteRemoteDatabase } from 'drizzle-orm/sqlite-proxy'
import * as schema from './db/schema'
import Database from './lib/libsql'

export type Settings = {
  hostname: string
  port: number
  username: string
  password: string
}

export type DrizzleContextType = {
  db: SqliteRemoteDatabase<typeof schema>
  sqlite: Database
}
