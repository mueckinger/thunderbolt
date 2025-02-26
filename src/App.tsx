import { createOpenAI } from '@ai-sdk/openai'
import { useChat } from '@ai-sdk/react'
import { fetch as tauriFetch } from '@tauri-apps/plugin-http'
import { streamText } from 'ai'
// Configure AI SDK to use Tauri's fetch
// const customFetch = async (url, options) => {
//   // Use tauriFetch instead of window.fetch
//   return tauriFetch(url, options)
// }

const debugFetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  console.log('fetch', input, init)

  const options = init as RequestInit & { body: string }
  const body = JSON.parse(options.body)

  try {
    // Make a direct request to Ollama using Tauri's fetch
    const response = await tauriFetch('http://localhost:11434/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama3.2',
        messages: body.messages,
        stream: true,
      }),
    })

    console.log('Response status:', response.status)
    console.log('Response body:', response.body)

    // Return the raw response stream
    return new Response(response.body, {
      headers: response.headers,
      status: response.status,
    })
  } catch (error) {
    console.log('Error details:', error)
    console.error('Error calling Ollama:', error)
    throw error
  }
}

const openai = createOpenAI({
  baseURL: 'http://localhost:11434/api/chat',
  fetch: async (input: RequestInfo | URL, init?: RequestInit) => {
    console.log('tauri fetch', input, init)
    return tauriFetch(input, init)
  },
})

const fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  console.log('fetch', input, init)

  const options = init as RequestInit & { body: string }
  const body = JSON.parse(options.body)

  try {
    console.log('aaaa')

    // Use streamText with openai model
    const result = await streamText({
      model: openai('llama3.2'),
      messages: body.messages,
    })

    console.log('bbbb', result)

    // Return the data stream response
    return result.toDataStreamResponse()
  } catch (error) {
    console.log('cccc')
    console.error('Error calling Ollama:', error)
    throw error
  }
}

export default function App() {
  const { messages, input, handleInputChange, handleSubmit } = useChat({
    // api: 'http://localhost:11434/api/chat',
    fetch: debugFetch,
  })

  return (
    <div className="chat-container">
      <div className="messages">
        {messages.map((message, i) => (
          <div key={i} className={`message ${message.role}`}>
            {message.content}
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit}>
        <input value={input} onChange={handleInputChange} placeholder="Say something..." />
        <button type="submit">Send</button>
      </form>
    </div>
  )
}
