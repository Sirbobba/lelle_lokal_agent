import { Wrench } from 'lucide-react';

interface Props {
  name: string;
  args?: any;
  mcpServer?: string;
  round?: number;
}

export function ToolCallBadge({ name, mcpServer, round }: Props) {
  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '8px',
      padding: '5px 12px',
      background: 'rgba(0,243,255,0.06)',
      border: '1px solid rgba(0,243,255,0.18)',
      borderRadius: '999px',
      fontSize: '11px',
      fontFamily: 'var(--font-mono)',
      color: 'var(--accent-cyan)',
      maxWidth: '100%',
    }}>
      <Wrench size={12} style={{ flexShrink: 0, opacity: 0.8 }} />
      <span style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {mcpServer && (
          <span style={{ color: 'var(--text-muted)', marginRight: '4px', fontSize: '10px' }}>
            [{mcpServer}]
          </span>
        )}
        {name}
      </span>
      {round && round > 1 && (
        <span style={{
          fontSize: '10px',
          color: 'var(--text-muted)',
          background: 'rgba(255,255,255,0.05)',
          padding: '1px 6px',
          borderRadius: '4px',
          flexShrink: 0,
        }}>
          R{round}
        </span>
      )}
    </div>
  );
}
