import { invoke } from '@tauri-apps/api/core'
import { appDataDir } from '@tauri-apps/api/path'
import { Stronghold } from '@tauri-apps/plugin-stronghold'

// Initialize Stronghold with keyring-managed password
export async function initializeSecureStorage() {
  console.log('Initilizing secure storage')
  try {
    // App identity for the keyring
    const appName = 'my-tauri-app'
    const userIdentifier = 'stronghold-master' // Unique identifier in keyring

    // Get or create password from system keyring
    const vaultPassword = await invoke<string>('get_or_create_stronghold_password', {
      serviceName: appName,
      username: userIdentifier,
    })

    console.log('vaultPassword', vaultPassword)

    // Initialize Stronghold with the password from keyring
    const vaultPath = `${await appDataDir()}/vault.hold`

    console.log('vaultPath', vaultPath)

    const stronghold = await Stronghold.load(vaultPath, vaultPassword)

    console.log('1111111')

    // Create or load a client
    let client
    try {
      client = await stronghold.loadClient('main-client')
    } catch {
      client = await stronghold.createClient('main-client')
    }

    console.log('0000')

    // Get the store for saving/retrieving secrets
    const store = client.getStore()

    return {
      saveSecret: async (key: string, value: string) => {
        const data = Array.from(new TextEncoder().encode(value))
        await store.insert(key, data)
        await stronghold.save() // Save to disk
      },

      getSecret: async (key: string) => {
        try {
          const data = await store.get(key)
          return data ? new TextDecoder().decode(new Uint8Array(data)) : null
        } catch (e) {
          return null // Key not found
        }
      },

      deleteSecret: async (key: string) => {
        await store.remove(key)
        await stronghold.save() // Save to disk
      },
    }
  } catch (error) {
    console.error('Failed to initialize secure storage:', error)
    throw error
  }
}

export async function createVault() {
  console.log('yyyy')
  const secureStorage = await initializeSecureStorage()
  console.log('zzzz')
  // Store secrets in Stronghold
  // await secureStorage.saveSecret('api_key', 'my-secret-api-key')
  // await secureStorage.saveSecret('jwt_token', 'LOL_OOPS...')

  console.log('xxxxx')

  // Retrieve secrets
  const apiKey = await secureStorage.getSecret('api_key')

  console.log('dddd')

  console.log('API Key:', apiKey)
}
