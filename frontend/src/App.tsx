import { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { FolderOpen, Cpu } from 'lucide-react';
import { socket } from './lib/socket';
import { fetchConfig, fetchSettings, checkLmStudioStatus, browseFolder, fetchMcpStatus, uploadFile } from './lib/api';
import { ChatPanel, type Message } from './components/ChatPanel';
import { InputBar } from './components/InputBar';
import { Sidebar } from './components/Sidebar';
import { SystemCheck } from './components/SystemCheck';
import { SettingsModal } from './components/SettingsModal';
import './index.css';

let msgCounter = 0;
const newId = () => `msg-${++msgCounter}`;

interface SystemConfig {
  modelId: string;
  workingDirectory: string;
  baseUrl: string;
  hasMcp: boolean;
  mcpServers: string[];
  conversationId: string | null;
}

interface Settings {
  persona: 'senior_partner' | 'helpful' | 'minimalist';
  showThoughts: boolean;
  autoExecute: boolean;
  theme: 'dark' | 'light';
  modelId: string;
  maxHistoryMessages: number;
}

function App() {
  // ── Connection state ─────────────────────────────────────────────────────
  const [isConnected, setIsConnected] = useState(false);
  const [isLmStudioRunning, setIsLmStudioRunning] = useState(false);
  const [systemConfig, setSystemConfig] = useState<SystemConfig | null>(null);
  const [settings, setSettings] = useState<Settings>({
    persona: 'senior_partner',
    showThoughts: true,
    autoExecute: false,
    theme: 'dark',
    modelId: 'google/gemma-4-e4b',
    maxHistoryMessages: 100,
  });

  // ── UI state ─────────────────────────────────────────────────────────────
  const [showWizard, setShowWizard] = useState(true);
  const [showSettings, setShowSettings] = useState(false);

  // ── Chat state ───────────────────────────────────────────────────────────
  const [messages, setMessages] = useState<Message[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [streamingThought, setStreamingThought] = useState('');
  const [currentRound, setCurrentRound] = useState(0);

  // Keep latest thought for attaching to complete message
  const thoughtRef = useRef('');
  const thoughtDurationRef = useRef<number | undefined>(undefined);

  // ─── Load initial data ───────────────────────────────────────────────────
  useEffect(() => {
    fetchSettings()
      .then(s => {
        setSettings(s);
        document.documentElement.setAttribute('data-theme', s.theme);
      })
      .catch(console.error);

    fetchConfig()
      .then(c => setSystemConfig(c))
      .catch(console.error);

    const checkLms = async () => setIsLmStudioRunning(await checkLmStudioStatus());
    checkLms();
    const interval = setInterval(checkLms, 4000);
    return () => clearInterval(interval);
  }, []);

  // ── Socket.io events ─────────────────────────────────────────────────────
  useEffect(() => {
    if (socket.connected) {
      setIsConnected(true);
    }

    socket.on('connect', () => setIsConnected(true));
    socket.on('disconnect', () => setIsConnected(false));

    socket.on('user-message', (msg: string) => {
      setMessages(prev => [...prev, { id: newId(), role: 'user', content: msg }]);
      setIsProcessing(true);
      setStreamingContent('');
      setStreamingThought('');
      thoughtRef.current = '';
      thoughtDurationRef.current = undefined;
      setCurrentRound(0);
      setShowWizard(false);
    });

    socket.on('token', (token: string) => {
      setStreamingContent(prev => prev + token);
    });

    socket.on('thought-token', (token: string) => {
      setStreamingThought(prev => prev + token);
      thoughtRef.current += token;
    });

    socket.on('thought-start', () => {
      // Ny tanke-block börjar
    });

    socket.on('thought-end', (data: { duration?: number }) => {
      if (data?.duration) thoughtDurationRef.current = data.duration;
    });

    socket.on('round', (num: number) => {
      setCurrentRound(num);
    });

    socket.on('tool-call', (call: any) => {
      setMessages(prev => [...prev, {
        id: newId(),
        role: 'tool',
        content: '',
        toolCall: call,
      }]);
    });

    socket.on('complete', (data: { message: string }) => {
      const content = data?.message || '';
      // Flush streaming → final message
      setMessages(prev => [...prev, {
        id: newId(),
        role: 'assistant',
        content,
        thought: thoughtRef.current || undefined,
        thoughtDuration: thoughtDurationRef.current,
      }]);
      setIsProcessing(false);
      setStreamingContent('');
      setStreamingThought('');
      setCurrentRound(0);
      thoughtRef.current = '';
      thoughtDurationRef.current = undefined;

      // Refresh conversation_id from backend
      fetchConfig().then(c => setSystemConfig(c)).catch(() => {});
    });

    socket.on('error', (err: string) => {
      setMessages(prev => [...prev, { id: newId(), role: 'system', content: `❌ ${err}` }]);
      setIsProcessing(false);
    });

    socket.on('warning', (msg: string) => {
      setMessages(prev => [...prev, { id: newId(), role: 'system', content: `⚠️ ${msg}` }]);
    });

    socket.on('config-updated', (cfg: Partial<SystemConfig>) => {
      setSystemConfig(prev => prev ? { ...prev, ...cfg } : null);
    });

    socket.on('history-cleared', () => {
      setMessages([]);
      setStreamingContent('');
      setStreamingThought('');
      setIsProcessing(false);
      setShowWizard(true);
    });

    return () => {
      socket.off('connect'); socket.off('disconnect');
      socket.off('user-message'); socket.off('token');
      socket.off('thought-token'); socket.off('thought-start'); socket.off('thought-end');
      socket.off('round'); socket.off('tool-call'); socket.off('complete');
      socket.off('error'); socket.off('warning');
      socket.off('config-updated'); socket.off('history-cleared');
    };
  }, []);

  // ── Actions ──────────────────────────────────────────────────────────────
  const handleSend = useCallback((message: string) => {
    if (!message.trim() || isProcessing) return;
    socket.emit('chat-message', message);
  }, [isProcessing]);

  const handleFileUpload = useCallback(async (file: File) => {
    setMessages(prev => [...prev, { id: newId(), role: 'system', content: `📎 Laddar upp: ${file.name}...` }]);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const { filename } = await uploadFile(base64, file.name.split('.').pop() || 'bin');
      socket.emit('chat-message', `Jag har laddat upp en fil: ${filename}. Kan du titta på den?`);
    } catch (err: any) {
      setMessages(prev => [...prev, { id: newId(), role: 'system', content: `❌ Uppladdning misslyckades: ${err.message}` }]);
    }
  }, []);

  const handleBrowse = useCallback(async () => {
    await browseFolder();
  }, []);

  const handleClear = useCallback(() => {
    socket.emit('clear-history');
  }, []);

  // Apply theme changes from settings
  const handleSettingsSave = (newSettings: Settings) => {
    setSettings(newSettings);
    document.documentElement.setAttribute('data-theme', newSettings.theme);
  };

  const folderLabel = systemConfig?.workingDirectory?.split('\\').pop() || '...';
  const hasMcp = systemConfig?.hasMcp ?? false;
  const mcpServers = systemConfig?.mcpServers ?? [];

  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      background: 'var(--bg-base)',
      color: 'var(--text-primary)',
      overflow: 'hidden',
      fontFamily: 'var(--font-sans)',
    }} className="bg-animated scanline">

      {/* Sidebar */}
      <Sidebar
        isConnected={isConnected}
        isLmStudioRunning={isLmStudioRunning}
        mcpServers={mcpServers}
        workingDirectory={systemConfig?.workingDirectory || ''}
        onBrowse={handleBrowse}
        onClear={handleClear}
        onSettings={() => setShowSettings(true)}
      />

      {/* Main */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        minWidth: 0,
      }}>
        {/* System Check Overlay */}
        <SystemCheck
          isVisible={showWizard}
          isConnected={isConnected}
          isLmStudioRunning={isLmStudioRunning}
          hasMcp={hasMcp}
          mcpServers={mcpServers}
          modelId={settings.modelId}
          onDismiss={() => setShowWizard(false)}
        />

        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: showWizard ? 0 : 1, y: 0 }}
          transition={{ duration: 0.3 }}
          style={{
            height: '54px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 20px',
            borderBottom: '1px solid var(--border-subtle)',
            background: 'var(--bg-surface)',
            zIndex: 10,
            flexShrink: 0,
            opacity: showWizard ? 0 : 1,
            pointerEvents: showWizard ? 'none' : 'all',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <h1 style={{
              fontSize: '13px',
              fontWeight: 800,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: 'var(--accent-cyan)',
              display: 'flex', alignItems: 'center', gap: '8px',
            }}>
              Lelle Agent
              <span style={{
                fontSize: '9px', padding: '2px 7px',
                borderRadius: '999px',
                background: 'rgba(255,0,255,0.1)',
                color: 'var(--accent-magenta)',
                border: '1px solid rgba(255,0,255,0.25)',
                letterSpacing: '0.1em',
              }}>v2</span>
            </h1>

            {/* Folder badge */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: '5px',
              fontSize: '11px', color: 'var(--text-muted)',
              padding: '3px 10px',
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '999px',
            }}>
              <FolderOpen size={10} />
              <span>{folderLabel}</span>
            </div>

            {/* Conversation ID badge */}
            {systemConfig?.conversationId && (
              <div style={{
                fontSize: '10px', color: 'var(--text-muted)',
                fontFamily: 'var(--font-mono)',
                opacity: 0.5,
              }}>
                #{systemConfig.conversationId.slice(-8)}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '11px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <div style={{
                width: '7px', height: '7px', borderRadius: '50%',
                background: isConnected ? 'var(--accent-green)' : 'var(--accent-red)',
                boxShadow: isConnected ? '0 0 6px var(--accent-green)' : 'none',
              }} />
              <span style={{ color: 'var(--text-muted)' }}>Node: {isConnected ? 'Online' : 'Offline'}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--text-muted)' }}>
              <Cpu size={13} style={{ color: isLmStudioRunning ? 'var(--accent-green)' : 'var(--text-muted)' }} />
              <span>{settings.modelId?.split('/').pop() || '—'}</span>
            </div>
          </div>
        </motion.header>

        {/* Chat Panel */}
        <ChatPanel
          messages={messages}
          streamingContent={streamingContent}
          streamingThought={settings.showThoughts ? streamingThought : ''}
          isProcessing={isProcessing}
          currentRound={currentRound}
        />

        {/* Input Bar */}
        <InputBar
          onSend={handleSend}
          onFileUpload={handleFileUpload}
          disabled={isProcessing || !isConnected}
        />
      </div>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={showSettings}
        settings={settings}
        onClose={() => setShowSettings(false)}
        onSave={handleSettingsSave}
      />
    </div>
  );
}

export default App;
