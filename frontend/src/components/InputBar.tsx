import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Paperclip, X } from 'lucide-react';

interface Props {
  onSend: (message: string) => void;
  onFileUpload: (file: File) => void;
  disabled?: boolean;
}

export function InputBar({ onSend, onFileUpload, disabled }: Props) {
  const [input, setInput] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSend = () => {
    const msg = input.trim();
    if (!msg || disabled) return;
    onSend(msg);
    setInput('');
    setAttachedFile(null);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    // Auto-resize
    const ta = e.target;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 180) + 'px';
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => setIsDragging(false), []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      setAttachedFile(file);
      onFileUpload(file);
    }
  }, [onFileUpload]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAttachedFile(file);
      onFileUpload(file);
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      style={{
        padding: '16px 24px 20px',
        borderTop: '1px solid var(--border-subtle)',
        background: 'var(--bg-surface)',
        flexShrink: 0,
      }}
    >
      {/* Attached file indicator */}
      <AnimatePresence>
        {attachedFile && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            style={{
              marginBottom: '10px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '11px',
              color: 'var(--accent-cyan)',
              fontFamily: 'var(--font-mono)',
            }}
          >
            <Paperclip size={12} />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {attachedFile.name}
            </span>
            <button
              onClick={() => setAttachedFile(null)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', flexShrink: 0 }}
            >
              <X size={12} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div style={{
        display: 'flex',
        gap: '10px',
        alignItems: 'flex-end',
        background: isDragging ? 'rgba(0,243,255,0.05)' : 'var(--bg-input)',
        border: isDragging
          ? '1px solid var(--accent-cyan)'
          : '1px solid var(--border-subtle)',
        borderRadius: '16px',
        padding: '10px 14px',
        transition: 'all 0.2s',
        boxShadow: isDragging ? 'var(--shadow-cyan)' : 'none',
      }}>
        {/* File attach button */}
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled}
          title="Bifoga fil"
          style={{
            background: 'none',
            border: 'none',
            cursor: disabled ? 'not-allowed' : 'pointer',
            color: 'var(--text-muted)',
            padding: '4px',
            borderRadius: '6px',
            flexShrink: 0,
            transition: 'color 0.2s',
            opacity: disabled ? 0.4 : 1,
          }}
          onMouseEnter={e => !disabled && (e.currentTarget.style.color = 'var(--accent-cyan)')}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
        >
          <Paperclip size={18} />
        </button>
        <input ref={fileInputRef} type="file" style={{ display: 'none' }} onChange={handleFileSelect} />

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={input}
          onChange={handleTextareaChange}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={isDragging ? 'Släpp filen här...' : 'Skriv ett meddelande... (Shift+Enter för ny rad)'}
          rows={1}
          style={{
            flex: 1,
            background: 'none',
            border: 'none',
            outline: 'none',
            color: 'var(--text-primary)',
            font: '14px var(--font-sans)',
            resize: 'none',
            lineHeight: '1.5',
            maxHeight: '180px',
            overflowY: 'auto',
            padding: '4px 0',
          }}
        />

        {/* Send button */}
        <motion.button
          onClick={handleSend}
          disabled={disabled || !input.trim()}
          whileHover={{ scale: disabled || !input.trim() ? 1 : 1.05 }}
          whileTap={{ scale: disabled || !input.trim() ? 1 : 0.95 }}
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            border: 'none',
            cursor: disabled || !input.trim() ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            background: disabled || !input.trim()
              ? 'rgba(255,255,255,0.05)'
              : 'linear-gradient(135deg, var(--accent-cyan), #0090aa)',
            color: disabled || !input.trim() ? 'var(--text-muted)' : '#000',
            transition: 'all 0.2s',
            boxShadow: !disabled && input.trim() ? 'var(--shadow-cyan)' : 'none',
          }}
        >
          <Send size={15} />
        </motion.button>
      </div>

      <p style={{
        textAlign: 'center',
        fontSize: '10px',
        color: 'var(--text-muted)',
        marginTop: '8px',
        opacity: 0.6,
      }}>
        Dra-och-släpp filer • Enter för att skicka • Shift+Enter för ny rad
      </p>
    </div>
  );
}
