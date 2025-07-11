import { UIMessage } from 'ai'
import { ReasoningPart } from './reasoning-part'
import { SyntheticLoadingPart } from './synthetic-loading-part'
import { TextPart } from './text-part'
import { ToolInvocationPart } from './tool-invocation-part'

interface AssistantMessageProps {
  message: UIMessage
  isStreaming: boolean
}

export const AssistantMessage = ({ message, isStreaming }: AssistantMessageProps) => {
  return (
    <div className="flex flex-col gap-2 max-w-full">
      <SyntheticLoadingPart isStreaming={message.parts.length === 0} />

      {message.parts.map((part, partIdx) => {
        const isLastPart = partIdx === message.parts.length - 1
        const isPartStreaming = isStreaming && isLastPart

        switch (part.type) {
          case 'step-start':
            return null
          case 'text':
            return <TextPart key={partIdx} part={part} isStreaming={isPartStreaming} />
          case 'tool-invocation':
            return <ToolInvocationPart key={partIdx} part={part} isStreaming={isPartStreaming} />
          case 'reasoning':
            return <ReasoningPart key={partIdx} part={part} isStreaming={isPartStreaming} />
          default:
            console.warn('Unknown part type', part)
            return null
        }
      })}
    </div>
  )
}
