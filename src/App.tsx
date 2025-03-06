import { createSignal, JSXElement, onMount } from 'solid-js'

import { createTray } from './lib/tray'

import './App.css'
import { createAppDataDir } from './lib/fs'
import { createVault } from './lib/vault'

export default function App({ children }: { children?: JSXElement }) {
  const [vaultCreated, setVaultCreated] = createSignal(false)
  const [elapsedTime, setElapsedTime] = createSignal(0)
  let startTime: number

  onMount(() => {
    startTime = performance.now()
    createTray()
    createAppDataDir()
    createVault().then(() => {
      const endTime = performance.now()
      setElapsedTime((endTime - startTime) / 1000) // Convert to seconds
      setVaultCreated(true)
    })
  })

  return (
    <div>
      <div>{vaultCreated() ? `Vault created in ${elapsedTime().toFixed(2)} seconds` : 'Vault not created'}</div>
      {children}
    </div>
  )
}
