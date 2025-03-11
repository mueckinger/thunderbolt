import { sql } from 'drizzle-orm'
import { customType, sqliteTable, text } from 'drizzle-orm/sqlite-core'

export const float32Array = customType<{
  data: number[]
  config: { dimensions: number }
  configRequired: true
  driverData: Buffer
}>({
  dataType(config) {
    return `F32_BLOB(${config.dimensions})`
  },
  fromDriver(value: Buffer) {
    return Array.from(new Float32Array(value.buffer))
  },
  toDriver(value: number[]) {
    return sql`vector32(${JSON.stringify(value)})`
  },
})

// Example of how to use the float32Array custom type for embeddings
// export const settings = sqliteTable('example', {
//   id: integer('id').primaryKey().unique(),
//   value: text('value'),
//   updated_at: text('updated_at').default('CURRENT_TIMESTAMP'),
//   // embedding: sqliteVector('embedding', 3),
//   embedding: float32Array('embedding', { dimensions: 3 }),
// })

export const settingsTable = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value', { mode: 'json' }),
  updated_at: text().default(sql`(CURRENT_DATE)`),
})
