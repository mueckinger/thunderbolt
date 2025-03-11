import { Route, Router } from '@solidjs/router'
import { createSignal, onMount, Show } from 'solid-js'
import { DrizzleProvider } from './components/drizzle'
import { initializeDrizzleDatabase } from './db/database'
import Home from './home'
import Layout from './layout'
import { createAppDataDir } from './lib/fs'
import { createTray } from './lib/tray'
import NotFound from './not-found'
import Settings from './settings'
import AccountsSettings from './settings/accounts'
import { DrizzleContextType } from './types'
import { render } from 'solid-js/web'

const init = async () => {
  createTray()
  createAppDataDir()

  const { db, sqlite } = await initializeDrizzleDatabase()

  return {
    db,
    sqlite,
  }
  // console.log('11111')

  // const libsql = await Database.load('data/local.db')
  // console.log('🚀 ~ db:', libsql)

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

export const App = () => {
  const [context, setContext] = createSignal<DrizzleContextType>()

  onMount(async () => {
    const { db, sqlite } = await init()
    setContext({ db, sqlite })
  })

  return (
    <Show when={context()} fallback={<div>Loading...</div>}>
      <DrizzleProvider context={context()!}>
        <Router root={Layout}>
          <Route path="/" component={Home} />
          <Route path="/settings" component={Settings}>
            <Route
              path="/accounts"
              component={() => {
                return <AccountsSettings />
              }}
            />
          </Route>
          <Route path="*404" component={NotFound} />
        </Router>
      </DrizzleProvider>
    </Show>
  )
}

render(App, document.getElementById('root') as HTMLElement)
