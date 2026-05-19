import { cn } from '@/lib/utils'

interface ChatBubbleProps {
  role: 'user' | 'assistant'
  content: string
  agentName?: string
  agentRole?: string
  isStreaming?: boolean
}

export function ChatBubble({ role, content, agentName, agentRole, isStreaming }: ChatBubbleProps) {
  const isUser = role === 'user'

  return (
    <div className={cn('flex animate-fade-up', isUser ? 'justify-end' : 'justify-start')}>
      <div className={cn('max-w-[80%]', isUser ? 'items-end' : 'items-start', 'flex flex-col gap-1')}>
        {!isUser && (agentName || agentRole) && (
          <div className="flex items-center gap-1.5 px-1">
            <div className="w-5 h-5 bg-[#E8590C] rounded-full flex items-center justify-center">
              <span className="text-white text-[9px] font-bold">AI</span>
            </div>
            <span className="text-[12px] text-[rgba(60,60,67,0.6)]">
              {agentName}{agentRole ? ` · ${agentRole}` : ''}
            </span>
          </div>
        )}

        <div
          className={cn(
            'px-4 py-3 text-[17px] leading-[1.5]',
            isUser
              ? 'bg-[#E8590C] text-white rounded-[18px] rounded-br-[4px]'
              : 'bg-white text-black rounded-[18px] rounded-bl-[4px] border border-[rgba(60,60,67,0.08)]'
          )}
        >
          {content}
          {isStreaming && (
            <span className="inline-block w-1.5 h-4 bg-current opacity-70 ml-0.5 animate-pulse rounded-sm" />
          )}
        </div>
      </div>
    </div>
  )
}

export function TypingIndicator({ agentName }: { agentName?: string }) {
  return (
    <div className="flex items-start gap-2 animate-fade-up">
      <div className="flex flex-col gap-1 items-start">
        {agentName && (
          <div className="flex items-center gap-1.5 px-1">
            <div className="w-5 h-5 bg-[#E8590C] rounded-full flex items-center justify-center">
              <span className="text-white text-[9px] font-bold">AI</span>
            </div>
            <span className="text-[12px] text-[rgba(60,60,67,0.6)]">{agentName}</span>
          </div>
        )}
        <div className="bg-white border border-[rgba(60,60,67,0.08)] rounded-[18px] rounded-bl-[4px] px-4 py-3 flex items-center gap-1.5">
          {[0, 1, 2].map(i => (
            <div
              key={i}
              className="w-2 h-2 rounded-full bg-[rgba(60,60,67,0.4)]"
              style={{ animation: `typingBounce 1.2s ease-in-out ${i * 0.2}s infinite` }}
            />
          ))}
          <span className="text-[12px] text-[rgba(60,60,67,0.4)] ml-1">Typing…</span>
        </div>
      </div>
    </div>
  )
}
