import './index.css'

import { JSXElement, onMount } from 'solid-js'

import { initializeDrizzleDatabase } from './db/database'
import { migrate } from './db/migrate'
import { createAppDataDir } from './lib/fs'
import { createTray } from './lib/tray'

const init = async () => {
  createTray()
  createAppDataDir()

  // console.log('11111')

  // const libsql = await Database.load('data/local.db')
  // console.log('🚀 ~ db:', libsql)

  const { sqlite } = await initializeDrizzleDatabase()

  await migrate({ sqlite })

  // // Create the setting table if it doesn't exist
  // await libsql.execute(`
  //   CREATE TABLE IF NOT EXISTS \`setting\` (
  //     \`id\` integer PRIMARY KEY NOT NULL,
  //     \`value\` text,
  //     \`updated_at\` text DEFAULT 'CURRENT_TIMESTAMP',
  //     \`embedding\` vector(32)
  //   );
  // `)

  // // Create the unique index if it doesn't exist
  // await libsql.execute(`
  //   CREATE UNIQUE INDEX IF NOT EXISTS \`setting_id_unique\` ON \`setting\` (\`id\`);
  // `)

  // console.log('00000')

  // await db.insert(settings).values([{ embedding: sql`vector32(${JSON.stringify([1.1, 2.2, 3.3])})` }])

  // console.log('aaaa')

  // const res = await db
  //   .select({
  //     id: settings.id,
  //     distance: sql<number>`vector_distance_cos(${settings.embedding}, vector32(${JSON.stringify([2.2, 3.3, 4.4])}))`,
  //   })
  //   .from(settings)

  // console.log('bbbb')

  // console.log(res)
}

export default function App({ children }: { children?: JSXElement }) {
  onMount(() => {
    init()
  })

  return <main class="flex h-screen w-screen">{children}</main>
}
