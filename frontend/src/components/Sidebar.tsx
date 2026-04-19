import { motion } from 'framer-motion';
import { Bot, FolderOpen, Trash2, Settings, Plug } from 'lucide-react';

interface Props {
  isConnected: boolean;
  isLmStudioRunning: boolean;
  mcpServers: string[];
  workingDirectory: string;
  onBrowse: () => void;
  onClear: () => void;
  onSettings: () => void;
}

export function Sidebar({ isConnected, isLmStudioRunning, mcpServers, workingDirectory, onBrowse, onClear, onSettings }: Props) {
  const folderName = workingDirectory?.split('\\').pop() || '...';
  const hasMcp = mcpServers.length > 0;

  return (
    <div style={{
      width: '64px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '20px 0',
      borderRight: '1px solid var(--border-subtle)',
      background: 'var(--bg-surface)',
      gap: '4px',
      zIndex: 20,
      flexShrink: 0,
    }}>
      {/* Logo */}
      <div style={{ marginBottom: '24px', position: 'relative' }}>
        <Bot size={30} className="glow-cyan" style={{ color: 'var(--accent-cyan)' }} />
        {/* Status dot */}
        <div style={{
          position: 'absolute',
          bottom: 0,
          right: -2,
          width: '10px',
          height: '10px',
          borderRadius: '50%',
          background: isConnected && isLmStudioRunning ? 'var(--accent-green)' : 'var(--accent-yellow)',
          border: '2px solid var(--bg-surface)',
          boxShadow: isConnected && isLmStudioRunning
            ? '0 0 8px var(--accent-green)'
            : '0 0 8px var(--accent-yellow)',
        }} />
      </div>

      <SidebarBtn icon={<FolderOpen size={20} />} label={`Projekt: ${folderName}`} onClick={onBrowse} />
      <SidebarBtn icon={<Trash2 size={20} />} label="Rensa historik" onClick={onClear} hoverColor="var(--accent-red)" />

      {/* MCP indicator */}
      <div style={{ position: 'relative' }} title={hasMcp ? `MCP: ${mcpServers.join(', ')}` : 'Inga MCP-servrar'}>
        <div style={{
          width: '40px',
          height: '40px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '10px',
          color: hasMcp ? 'var(--accent-green)' : 'var(--text-muted)',
          opacity: hasMcp ? 1 : 0.4,
        }}>
          <Plug size={20} />
        </div>
        {hasMcp && (
          <div style={{
            position: 'absolute',
            top: '4px',
            right: '4px',
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: 'var(--accent-green)',
            boxShadow: '0 0 6px var(--accent-green)',
          }} />
        )}
      </div>

      {/* Push settings to bottom */}
      <div style={{ flex: 1 }} />
      <SidebarBtn icon={<Settings size={20} />} label="Inställningar" onClick={onSettings} />
    </div>
  );
}

// ── Helper ────────────────────────────────────────────────────────────────────
function SidebarBtn({
  icon,
  label,
  onClick,
  hoverColor = 'var(--accent-cyan)',
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  hoverColor?: string;
}) {
  return (
    <motion.button
      whileHover={{ scale: 1.08 }}
      whileTap={{ scale: 0.93 }}
      onClick={onClick}
      title={label}
      style={{
        width: '40px',
        height: '40px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: '10px',
        border: 'none',
        background: 'none',
        cursor: 'pointer',
        color: 'var(--text-muted)',
        transition: 'color 0.2s, background 0.2s',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.color = hoverColor;
        e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.color = 'var(--text-muted)';
        e.currentTarget.style.background = 'none';
      }}
    >
      {icon}
    </motion.button>
  );
}
