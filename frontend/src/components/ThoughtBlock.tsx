import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Cpu } from 'lucide-react';

interface Props {
  thought: string;
  duration?: number;
}

export function ThoughtBlock({ thought, duration }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  if (!thought?.trim()) return null;

  const lines = thought.split('\n').length;

  return (
    <div style={{
      margin: '12px 0',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: '12px',
      overflow: 'hidden',
      background: 'rgba(0,0,0,0.4)',
    }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '100%',
          padding: '8px 14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--text-muted)',
          fontSize: '10px',
          textTransform: 'uppercase',
          letterSpacing: '0.18em',
          fontFamily: 'var(--font-sans)',
          transition: 'color 0.2s',
        }}
        onMouseEnter={e => (e.currentTarget.style.color = 'var(--accent-cyan)')}
        onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}>
          <Cpu size={11} />
          Thought{duration ? ` · ${duration}s` : ''} · {isOpen ? 'Dölj' : 'Visa'}
        </span>
        <span style={{ opacity: 0.4 }}>{lines} rader</span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{
              padding: '12px 16px',
              borderTop: '1px solid rgba(255,255,255,0.05)',
              background: '#050508',
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              color: 'var(--text-secondary)',
              whiteSpace: 'pre-wrap',
              lineHeight: 1.6,
              maxHeight: '260px',
              overflowY: 'auto',
              borderLeft: '2px solid rgba(0,243,255,0.2)',
              marginLeft: '8px',
            }}>
              {thought}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
