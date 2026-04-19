import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, User } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { ThoughtBlock } from './ThoughtBlock';
import { ToolCallBadge } from './ToolCallBadge';

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  thought?: string;
  thoughtDuration?: number;
  toolCall?: { name: string; arguments: any; round: number; mcpServer?: string };
  isStreaming?: boolean;
}

interface Props {
  messages: Message[];
  streamingContent: string;
  streamingThought: string;
  isProcessing: boolean;
  currentRound: number;
}

export function ChatPanel({ messages, streamingContent, streamingThought, isProcessing, currentRound }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages, streamingContent, streamingThought]);

  return (
    <div
      ref={scrollRef}
      style={{
        flex: 1,
        overflowY: 'auto',
        padding: '24px 28px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
      }}
    >
      {messages.length === 0 && !isProcessing && (
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: 0.4,
          gap: '12px',
          paddingBottom: '80px',
        }}>
          <Bot size={48} style={{ color: 'var(--accent-cyan)' }} />
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', textAlign: 'center' }}>
            Skriv ett meddelande eller dra-och-släpp en fil för att börja.
          </p>
        </div>
      )}

      <AnimatePresence initial={false}>
        {messages.map((msg) => (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            {msg.role === 'tool' && msg.toolCall && (
              <div style={{ paddingLeft: '52px', marginBottom: '-8px' }}>
                <ToolCallBadge
                  name={msg.toolCall.name}
                  args={msg.toolCall.arguments}
                  mcpServer={msg.toolCall.mcpServer}
                  round={msg.toolCall.round}
                />
              </div>
            )}

            {(msg.role === 'user' || msg.role === 'assistant') && (
              <div style={{
                display: 'flex',
                gap: '14px',
                flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
                alignItems: 'flex-start',
              }}>
                {/* Avatar */}
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  background: msg.role === 'user'
                    ? 'rgba(255,0,255,0.12)'
                    : 'rgba(0,243,255,0.12)',
                  border: msg.role === 'user'
                    ? '1px solid rgba(255,0,255,0.25)'
                    : '1px solid rgba(0,243,255,0.25)',
                  color: msg.role === 'user' ? 'var(--accent-magenta)' : 'var(--accent-cyan)',
                }}>
                  {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                </div>

                {/* Bubble */}
                <div style={{ maxWidth: '82%', minWidth: '100px' }}>
                  {msg.role === 'assistant' && msg.thought && (
                    <ThoughtBlock thought={msg.thought} duration={msg.thoughtDuration} />
                  )}
                  <div style={{
                    padding: msg.role === 'user' ? '10px 14px' : '14px 18px',
                    borderRadius: msg.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                    background: msg.role === 'user'
                      ? 'linear-gradient(135deg, rgba(255,0,255,0.15), rgba(255,0,255,0.08))'
                      : 'var(--bg-card)',
                    border: msg.role === 'user'
                      ? '1px solid rgba(255,0,255,0.2)'
                      : '1px solid var(--border-subtle)',
                    fontSize: '13.5px',
                    lineHeight: '1.65',
                    color: 'var(--text-primary)',
                  }}>
                    {msg.role === 'assistant' ? (
                      <div className="prose">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                    ) : (
                      <span style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {msg.role === 'system' && (
              <div style={{
                textAlign: 'center',
                fontSize: '11px',
                color: 'var(--text-muted)',
                padding: '4px 0',
              }}>
                {msg.content}
              </div>
            )}
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Streaming Response */}
      {isProcessing && (streamingContent || streamingThought) && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}
        >
          <div style={{
            width: '36px', height: '36px', borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, background: 'rgba(0,243,255,0.12)',
            border: '1px solid rgba(0,243,255,0.25)', color: 'var(--accent-cyan)',
          }}>
            <Bot size={16} />
          </div>
          <div style={{ maxWidth: '82%' }}>
            {streamingThought && (
              <ThoughtBlock thought={streamingThought} />
            )}
            {streamingContent && (
              <div style={{
                padding: '14px 18px',
                borderRadius: '18px 18px 18px 4px',
                background: 'var(--bg-card)',
                border: '1px solid var(--border-subtle)',
                fontSize: '13.5px',
                lineHeight: '1.65',
              }}>
                <div className="prose cursor">
                  <ReactMarkdown>{streamingContent}</ReactMarkdown>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Thinking indicator */}
      {isProcessing && !streamingContent && !streamingThought && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{ display: 'flex', gap: '14px', alignItems: 'center' }}
        >
          <div style={{
            width: '36px', height: '36px', borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, background: 'rgba(0,243,255,0.12)',
            border: '1px solid rgba(0,243,255,0.25)', color: 'var(--accent-cyan)',
          }}>
            <Bot size={16} />
          </div>
          <div style={{ display: 'flex', gap: '5px', padding: '10px 0' }}>
            {[0, 1, 2].map(i => (
              <motion.div
                key={i}
                style={{
                  width: '7px', height: '7px', borderRadius: '50%',
                  background: 'var(--accent-cyan)',
                }}
                animate={{ opacity: [0.3, 1, 0.3], y: [0, -4, 0] }}
                transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
              />
            ))}
            {currentRound > 1 && (
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: '8px', alignSelf: 'center' }}>
                Runda {currentRound}
              </span>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
}
