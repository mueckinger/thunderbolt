import {
  LanguageModelV2,
  LanguageModelV2CallOptions,
  LanguageModelV2CallWarning,
  LanguageModelV2Content,
  LanguageModelV2FinishReason,
  LanguageModelV2ResponseMetadata,
  LanguageModelV2StreamPart,
  LanguageModelV2Usage,
  NoSuchModelError,
  ProviderV2,
  SharedV2Headers,
  SharedV2ProviderMetadata,
  UnsupportedFunctionalityError,
} from '@ai-sdk/provider'
import { chatWithFlowerDirect, initializeFlowerIntelligence } from '../flower-direct'

export interface FlowerSettings {
  /**
   * Whether to use encryption for the chat (default: true for confidential models)
   */
  encrypt?: boolean

  /**
   * Base URL for the API (optional, uses default from settings)
   */
  baseURL?: string

  /**
   * Custom headers to include in requests
   */
  headers?: Record<string, string>
}

export interface FlowerModelSettings {
  /**
   * Whether to attempt encryption (will fallback if error 50003)
   */
  encrypt?: boolean
}

// Flower model IDs that are known to work
const FLOWER_MODELS = ['mistralai/mistral-small-3.1-24b', 'llama-3.1-70b-instruct', 'llama-3.1-8b-instruct', 'meta/llama3.2-1b/instruct-fp16'] as const

export type FlowerModelId = (typeof FLOWER_MODELS)[number]

export class FlowerLanguageModel implements LanguageModelV2 {
  readonly specificationVersion = 'v2' as const
  readonly provider = 'flower'
  readonly defaultObjectGenerationMode = undefined
  readonly supportsImageUrls = false
  readonly supportsStructuredOutputs = false
  readonly supportedUrls = {}

  readonly modelId: FlowerModelId
  readonly settings: FlowerModelSettings

  constructor(modelId: FlowerModelId, settings: FlowerModelSettings = {}) {
    this.modelId = modelId
    this.settings = settings
  }

  async doGenerate(options: LanguageModelV2CallOptions): Promise<{
    content: LanguageModelV2Content[]
    finishReason: LanguageModelV2FinishReason
    usage: LanguageModelV2Usage
    providerMetadata?: SharedV2ProviderMetadata
    request?: { body?: unknown }
    response?: LanguageModelV2ResponseMetadata & { headers?: SharedV2Headers; body?: unknown }
    warnings: LanguageModelV2CallWarning[]
  }> {
    const messages = options.prompt

    // Convert messages to Flower format, including tool calls and results
    const flowerMessages = messages.map((msg) => {
      let content: string

      if (typeof msg.content === 'string') {
        content = msg.content
      } else {
        content = msg.content
          .map((part) => {
            switch (part.type) {
              case 'text':
                return part.text
              case 'file':
                throw new UnsupportedFunctionalityError({
                  functionality: 'file-parts',
                })
              case 'reasoning':
                return `<thinking>${part.text}</thinking>`
              case 'tool-call':
                // Convert tool calls to a text representation
                return `\n[Tool Call: ${part.toolName}]\nArguments: ${JSON.stringify(part.args)}\n`
              case 'tool-result':
                // Convert tool results to a text representation
                return `\n[Tool Result: ${part.toolName}]\nResult: ${JSON.stringify(part.result)}\n`
              default:
                throw new UnsupportedFunctionalityError({
                  functionality: `${(part as any).type} parts`,
                })
            }
          })
          .join('')
      }

      return {
        role: msg.role,
        content,
      }
    })

    // If tools are provided, add them to the system prompt
    let systemPromptAddition = ''
    if (options.tools && options.tools.length > 0) {
      const functionTools = options.tools.filter((t) => t.type === 'function')
      if (functionTools.length > 0) {
        systemPromptAddition = '\n\nYou have access to the following tools:\n'
        functionTools.forEach((tool) => {
          systemPromptAddition += `\n### ${tool.name}\n`
          if (tool.description) {
            systemPromptAddition += `${tool.description}\n`
          }
          systemPromptAddition += `Parameters: ${JSON.stringify(tool.parameters)}\n`
        })
        systemPromptAddition += '\nTo use a tool, you must respond with a valid JSON object inside a code block. Format:\n'
        systemPromptAddition += '```json\n{\n  "tool": "tool_name",\n  "arguments": {\n    "param1": "value1",\n    "param2": "value2"\n  }\n}\n```\n'
        systemPromptAddition += 'Always ensure the JSON is valid and the tool name matches exactly.\n'
      }
    }

    // Add tool instructions to the system message if present
    if (systemPromptAddition && flowerMessages.length > 0 && flowerMessages[0].role === 'system') {
      flowerMessages[0].content += systemPromptAddition
    } else if (systemPromptAddition) {
      flowerMessages.unshift({
        role: 'system',
        content: systemPromptAddition.trim(),
      })
    }

    try {
      // Initialize Flower if needed
      await initializeFlowerIntelligence()

      // Try with encryption first, fallback if error 50003
      let response
      let encryptionUsed = this.settings.encrypt ?? true

      try {
        response = await chatWithFlowerDirect(flowerMessages, {
          model: this.modelId,
          stream: false,
          encrypt: encryptionUsed,
        })
      } catch (error: any) {
        if (encryptionUsed && (error.message?.includes('50003') || error.code === 50003)) {
          console.warn('Flower encryption failed with error 50003, retrying without encryption')
          encryptionUsed = false
          response = await chatWithFlowerDirect(flowerMessages, {
            model: this.modelId,
            stream: false,
            encrypt: false,
          })
        } else {
          throw error
        }
      }

      // Extract the text from the response
      const text = response?.content || response?.message || ''

      // Parse the response for tool calls
      const content: LanguageModelV2Content[] = []
      let finishReason: LanguageModelV2FinishReason = 'stop'

      // Check if the response contains a tool call
      const toolCallMatch = text.match(/```json\s*\n\s*(\{.*?"tool".*?\})\s*\n\s*```/s)

      if (toolCallMatch) {
        try {
          const toolCall = JSON.parse(toolCallMatch[1])
          if (toolCall.tool && toolCall.arguments) {
            // Add any text before the tool call
            const beforeToolCall = text.substring(0, text.indexOf(toolCallMatch[0])).trim()
            if (beforeToolCall) {
              content.push({ type: 'text', text: beforeToolCall })
            }

            // Add the tool call
            content.push({
              type: 'tool-call',
              toolCallType: 'function',
              toolCallId: `call_${Math.random().toString(36).substring(2, 11)}`,
              toolName: toolCall.tool,
              args: JSON.stringify(toolCall.arguments),
            } as LanguageModelV2Content)

            // Add any text after the tool call
            const afterToolCall = text.substring(text.indexOf(toolCallMatch[0]) + toolCallMatch[0].length).trim()
            if (afterToolCall) {
              content.push({ type: 'text', text: afterToolCall })
            }

            finishReason = 'tool-calls'
          } else {
            // Invalid tool call format, treat as regular text
            content.push({ type: 'text', text })
          }
        } catch (e) {
          // Failed to parse tool call, treat as regular text
          content.push({ type: 'text', text })
        }
      } else {
        // No tool call found, return as plain text
        content.push({ type: 'text', text })
      }

      return {
        content,
        usage: {
          inputTokens: undefined, // Flower doesn't provide token counts
          outputTokens: undefined,
          totalTokens: undefined,
        },
        finishReason,
        warnings: encryptionUsed
          ? []
          : [
              {
                type: 'other' as const,
                message: 'Encryption was disabled due to server limitations',
              } as LanguageModelV2CallWarning,
            ],
      }
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('does not exist')) {
          throw new NoSuchModelError({
            modelId: this.modelId,
            modelType: 'languageModel',
          })
        }
      }
      throw error
    }
  }

  async doStream(options: LanguageModelV2CallOptions): Promise<{
    stream: ReadableStream<LanguageModelV2StreamPart>
    rawCall?: { rawPrompt: unknown; rawSettings: Record<string, any> }
  }> {
    const messages = options.prompt

    // Convert messages to Flower format, reusing the same logic as doGenerate
    const flowerMessages = messages.map((msg) => {
      let content: string

      if (typeof msg.content === 'string') {
        content = msg.content
      } else {
        content = msg.content
          .map((part) => {
            switch (part.type) {
              case 'text':
                return part.text
              case 'file':
                throw new UnsupportedFunctionalityError({
                  functionality: 'file-parts',
                })
              case 'reasoning':
                return `<thinking>${part.text}</thinking>`
              case 'tool-call':
                // Convert tool calls to a text representation
                return `\n[Tool Call: ${part.toolName}]\nArguments: ${JSON.stringify(part.args)}\n`
              case 'tool-result':
                // Convert tool results to a text representation
                return `\n[Tool Result: ${part.toolName}]\nResult: ${JSON.stringify(part.result)}\n`
              default:
                throw new UnsupportedFunctionalityError({
                  functionality: `${(part as any).type} parts`,
                })
            }
          })
          .join('')
      }

      return {
        role: msg.role,
        content,
      }
    })

    // If tools are provided, add them to the system prompt
    let systemPromptAddition = ''
    if (options.tools && options.tools.length > 0) {
      const functionTools = options.tools.filter((t) => t.type === 'function')
      if (functionTools.length > 0) {
        systemPromptAddition = '\n\nYou have access to the following tools:\n'
        functionTools.forEach((tool) => {
          systemPromptAddition += `\n### ${tool.name}\n`
          if (tool.description) {
            systemPromptAddition += `${tool.description}\n`
          }
          systemPromptAddition += `Parameters: ${JSON.stringify(tool.parameters)}\n`
        })
        systemPromptAddition += '\nTo use a tool, you must respond with a valid JSON object inside a code block. Format:\n'
        systemPromptAddition += '```json\n{\n  "tool": "tool_name",\n  "arguments": {\n    "param1": "value1",\n    "param2": "value2"\n  }\n}\n```\n'
        systemPromptAddition += 'Always ensure the JSON is valid and the tool name matches exactly.\n'
      }
    }

    // Add tool instructions to the system message if present
    if (systemPromptAddition && flowerMessages.length > 0 && flowerMessages[0].role === 'system') {
      flowerMessages[0].content += systemPromptAddition
    } else if (systemPromptAddition) {
      flowerMessages.unshift({
        role: 'system',
        content: systemPromptAddition.trim(),
      })
    }

    // Initialize Flower if needed
    await initializeFlowerIntelligence()

    const self = this
    const stream = new ReadableStream<LanguageModelV2StreamPart>({
      async start(controller) {
        try {
          let fullText = ''
          let encryptionUsed = self.settings.encrypt ?? true

          const attemptChat = async (encrypt: boolean) => {
            fullText = '' // Reset on retry
            let isInToolCall = false
            let toolCallBuffer = ''
            let beforeToolCallText = ''

            await chatWithFlowerDirect(flowerMessages, {
              model: self.modelId,
              stream: true,
              encrypt,
              onStreamEvent: (event) => {
                if (event.chunk) {
                  fullText += event.chunk

                  // Check if we're entering a tool call
                  if (!isInToolCall && fullText.includes('```json')) {
                    isInToolCall = true
                    // Send any text before the tool call
                    const jsonStart = fullText.lastIndexOf('```json')
                    beforeToolCallText = fullText.substring(0, jsonStart).trim()
                    if (beforeToolCallText && beforeToolCallText !== fullText.substring(0, fullText.length - event.chunk.length).trim()) {
                      controller.enqueue({
                        type: 'text',
                        text: beforeToolCallText.substring(fullText.length - event.chunk.length - beforeToolCallText.length),
                      })
                    }
                    toolCallBuffer = fullText.substring(jsonStart)
                  } else if (isInToolCall) {
                    // Accumulate tool call data
                    toolCallBuffer += event.chunk

                    // Check if tool call is complete
                    if (toolCallBuffer.includes('```\n') || toolCallBuffer.includes('```')) {
                      const match = toolCallBuffer.match(/```json\s*\n\s*(\{.*?\})\s*\n?\s*```/s)
                      if (match) {
                        try {
                          const toolCall = JSON.parse(match[1])
                          if (toolCall.tool && toolCall.arguments) {
                            // Emit tool call
                            const toolCallId = `call_${Math.random().toString(36).substring(2, 11)}`
                            controller.enqueue({
                              type: 'tool-call',
                              toolCallType: 'function',
                              toolCallId,
                              toolName: toolCall.tool,
                              args: JSON.stringify(toolCall.arguments),
                            })
                          }
                        } catch (e) {
                          // Failed to parse, send as text
                          controller.enqueue({
                            type: 'text',
                            text: toolCallBuffer,
                          })
                        }
                      }
                      isInToolCall = false
                      toolCallBuffer = ''
                    }
                  } else {
                    // Regular text streaming
                    controller.enqueue({
                      type: 'text',
                      text: event.chunk,
                    })
                  }
                }
              },
            })
          }

          try {
            await attemptChat(encryptionUsed)
          } catch (error: any) {
            if (encryptionUsed && (error.message?.includes('50003') || error.code === 50003)) {
              console.warn('Flower encryption failed with error 50003, retrying without encryption')
              encryptionUsed = false
              await attemptChat(false)
            } else {
              throw error
            }
          }

          // Send finish event
          // Check if the full text contains tool calls to set the correct finish reason
          const hasToolCall = fullText.includes('```json') && fullText.match(/```json\s*\n\s*(\{.*?"tool".*?\})\s*\n\s*```/s)

          controller.enqueue({
            type: 'finish',
            finishReason: hasToolCall ? 'tool-calls' : 'stop',
            usage: {
              inputTokens: undefined,
              outputTokens: undefined,
              totalTokens: undefined,
            },
          })

          controller.close()
        } catch (error) {
          controller.enqueue({
            type: 'error',
            error,
          })
          controller.close()
        }
      },
    })

    return {
      stream,
      rawCall: { rawPrompt: flowerMessages, rawSettings: {} },
    }
  }
}

export interface FlowerProvider extends ProviderV2 {
  (modelId: FlowerModelId, settings?: FlowerModelSettings): FlowerLanguageModel
}

export function createFlower(options: FlowerSettings = {}): FlowerProvider {
  const createModel = (modelId: FlowerModelId, settings: FlowerModelSettings = {}) => {
    if (!FLOWER_MODELS.includes(modelId)) {
      throw new NoSuchModelError({
        modelId,
        modelType: 'languageModel',
      })
    }

    return new FlowerLanguageModel(modelId, {
      ...options,
      ...settings,
    })
  }

  const provider = Object.assign(createModel, {
    languageModel: createModel,
    textEmbeddingModel: (modelId: string) => {
      throw new NoSuchModelError({
        modelId,
        modelType: 'textEmbeddingModel',
      })
    },
    imageModel: (modelId: string) => {
      throw new NoSuchModelError({
        modelId,
        modelType: 'imageModel',
      })
    },
  })

  return provider as FlowerProvider
}

// Helper to check if a model ID is a valid Flower model
export function isFlowerModel(modelId: string): modelId is FlowerModelId {
  return FLOWER_MODELS.includes(modelId as FlowerModelId)
}
