import { ParsedEmail, Setting } from '@/types'
import { invoke } from '@tauri-apps/api/core'
import { tool } from 'ai'
import { z } from 'zod'
import { getMessageIdFromParsedEmail, getSubjectFromParsedEmail } from './utils'

type toolContext = {
  settings: Setting[]
}

export const tools = {
  getForecast: {
    verb: 'Checking the weather...',
    tool: ({ settings }: toolContext) =>
      tool({
        description: 'Get the weather forecast.',
        parameters: z.object({
          // location: z.string().describe('The location to get the weather forecast for.').optional(),
        }),
        execute: async () => {
          try {
            let url = 'https://api.open-meteo.com/v1/forecast?hourly=temperature_2m,precipitation,cloud_cover'

            // Get location from settings if available
            const locationLat = settings.find((s) => s.key === 'location_lat')?.value
            const locationLng = settings.find((s) => s.key === 'location_lng')?.value

            if (locationLat && locationLng) {
              url = `${url}&latitude=${locationLat}&longitude=${locationLng}`
            } else {
              // Fallback to default coordinates if no settings found
              url = `${url}&latitude=52.52&longitude=13.41`
            }

            const response = await fetch(url)
            if (!response.ok) {
              throw new Error(`Weather API returned ${response.status}: ${response.statusText}`)
            }
            const forecast = await response.json()

            console.log('forecast', forecast)
            return forecast
          } catch (error) {
            console.error('Error fetching weather forecast:', error)
            throw new Error('Failed to get weather forecast')
          }
        },
      }),
  },
  searchInbox: {
    verb: 'Searching the inbox...',
    tool: ({ settings }: toolContext) =>
      tool({
        description: `A tool for searching the user's inbox.


       If you want to reference the results of this tool in your response when you call the "answer" tool, use the following format.
        {
          "text": "I found several Postmark receipts in your inbox. Here are the details of the receipts:",
          "results": [
            {
              "id": "bef3aad4-731f-48c8-acd9-799f82a5f106",
              "type": "message"
            },
            {
              "id": "29d52df1-2786-4f47-a53d-a23a33a07ebf",
              "type": "message"
            },
            {
              "id": "f98bc38a-53ab-48bc-a6d1-4b122358385a",
              "type": "thread"
            },
            {
              "id": "2026780c-8af3-4d02-91dc-36a62a7413e2",
              "type": "contact"
            }
          ]
        }
      `,
        parameters: z.object({
          query: z.string().describe("The query to search the user's inbox with."),
          originalUserMessage: z.string().describe('The original user message that triggered this tool call.'),
        }),
        execute: async () => {
          const messages = await invoke<ParsedEmail[]>('fetch_inbox', { mailbox: 'INBOX', count: 3 })
          console.log('messages', messages)
          return messages.map(
            (message) => `
            Type: Message
            Message ID: ${getMessageIdFromParsedEmail(message)}
            Subject: ${getSubjectFromParsedEmail(message)}
            Body: ${message.clean_text}
          `
          )
        },
      }),
  },
  listMailboxes: {
    verb: 'Listing mailboxes...',
    tool: ({ settings }: toolContext) =>
      tool({
        description: "List all mailboxes in the user's inbox.",
        parameters: z.object({}),
        execute: async () => {
          const mailboxes = await invoke<Record<string, number>>('list_mailboxes')

          return Object.entries(mailboxes).map(
            ([name, count]) => `
          Mailbox: ${name}
          Count: ${count}
        `
          )
        },
      }),
  },
  answer: {
    verb: 'Answering the user...',
    tool: ({ settings }: toolContext) =>
      tool({
        description: 'Provide your final response to the user.',
        parameters: z.object({
          text: z.string().describe('The verbal response to the user in plain text. Do not list anything here.'),
          results: z.array(z.string()),
        }),
        // Important: Do NOT have an execute function otherwise it will call this tool multiple times.
        // But: it is helpful for debugging :)
        execute: async ({ text, results }) => {
          console.log('answer', text, results)
        },
      }),
  },
}

export const toolset = (toolContext: toolContext) =>
  Object.entries(tools).reduce(
    (acc, [key, value]) => ({
      ...acc,
      [key]: value.tool(toolContext),
    }),
    {} as Record<keyof typeof tools, (typeof tools)[keyof typeof tools]['tool']>
  )
