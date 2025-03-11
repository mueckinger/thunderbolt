import { inArray } from 'drizzle-orm'
import { settingsTable } from './db/schema'
import { DrizzleContextType, Settings } from './types'
export const setSettings = async (db: DrizzleContextType['db'], settings: Partial<Settings>) => {
  const entries = Object.entries(settings)

  if (entries.length === 0) return

  const batch = entries.map(([key, value]) =>
    db
      .insert(settingsTable)
      .values({
        key,
        value: JSON.stringify(value),
        updated_at: new Date().toISOString(),
      })
      .onConflictDoUpdate({
        target: settingsTable.key,
        set: {
          value: JSON.stringify(value),
          updated_at: new Date().toISOString(),
        },
      })
  )

  for (const operation of batch) {
    await operation
  }
}

export const getSettings = async (db: DrizzleContextType['db'], keys: string[]): Promise<Partial<Settings>> => {
  if (keys.length === 0) return {}

  const res = await db.select().from(settingsTable).where(inArray(settingsTable.key, keys))

  return res.reduce((acc, item) => {
    acc[item.key as keyof Settings] = JSON.parse(item.value as string)
    return acc
  }, {} as Partial<Settings>)
}
