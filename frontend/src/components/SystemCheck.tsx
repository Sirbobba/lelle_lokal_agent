import { motion, AnimatePresence } from 'framer-motion';
import { Bot, CheckCircle2, ServerCrash, Plug, Play, AlertTriangle } from 'lucide-react';

interface Props {
  isVisible: boolean;
  isConnected: boolean;
  isLmStudioRunning: boolean;
  hasMcp: boolean;
  mcpServers: string[];
  modelId: string;
  onDismiss: () => void;
}

export function SystemCheck({ isVisible, isConnected, isLmStudioRunning, hasMcp, mcpServers, modelId, onDismiss }: Props) {
  const allReady = isConnected && isLmStudioRunning;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.04, filter: 'blur(10px)' }}
          transition={{ duration: 0.35 }}
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 30,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(8,8,16,0.92)',
            backdropFilter: 'blur(16px)',
          }}
        >
          <div style={{
            padding: '52px',
            borderRadius: '28px',
            maxWidth: '460px',
            width: '100%',
            background: 'var(--bg-overlay)',
            border: '1px solid var(--border-subtle)',
            boxShadow: 'var(--shadow-deep)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '32px',
          }}>
            {/* Logo */}
            <div style={{
              width: '88px',
              height: '88px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(0,243,255,0.08)',
              border: '1px solid rgba(0,243,255,0.2)',
              boxShadow: 'var(--shadow-cyan)',
            }}>
              <Bot size={44} style={{ color: 'var(--accent-cyan)' }} />
            </div>

            <div style={{ textAlign: 'center' }}>
              <h1 style={{
                fontSize: '26px',
                fontWeight: 800,
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                background: 'linear-gradient(to right, var(--accent-cyan), var(--accent-magenta))',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                marginBottom: '6px',
              }}>
                Lelle v2
              </h1>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', letterSpacing: '0.1em' }}>
                SYSTEM CHECK
              </p>
            </div>

            {/* Status items */}
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <StatusRow
                label="Agent Motor"
                sub="Node.js server på port 3001"
                ok={isConnected}
                okLabel="Ansluten"
                failLabel="Offline"
              />
              <StatusRow
                label="LM Studio"
                sub={`Modell: ${modelId}`}
                ok={isLmStudioRunning}
                okLabel="Aktiv"
                failLabel="Inte startat"
              />
              <StatusRow
                label="MCP Verktyg"
                sub={hasMcp ? mcpServers.join(', ') : 'Konfigurera mcp.json'}
                ok={hasMcp}
                okLabel={`${mcpServers.length} server${mcpServers.length !== 1 ? 's' : ''}`}
                failLabel="Inga servrar"
                warning
              />
            </div>

            {!hasMcp && (
              <div style={{
                width: '100%',
                padding: '12px 16px',
                background: 'rgba(255,215,0,0.05)',
                border: '1px solid rgba(255,215,0,0.2)',
                borderRadius: '12px',
                fontSize: '11px',
                color: 'var(--accent-yellow)',
                display: 'flex',
                gap: '8px',
                lineHeight: '1.5',
              }}>
                <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: '1px' }} />
                <span>
                  Utan MCP-servrar kan agenten inte hantera filer eller köra kommandon.
                  Kopiera <code style={{ fontFamily: 'var(--font-mono)' }}>mcp-config-example.json</code> till LM Studio.
                </span>
              </div>
            )}

            <motion.button
              onClick={onDismiss}
              disabled={!allReady}
              whileHover={{ scale: allReady ? 1.02 : 1 }}
              whileTap={{ scale: allReady ? 0.98 : 1 }}
              style={{
                width: '100%',
                padding: '16px',
                borderRadius: '999px',
                border: allReady
                  ? '1px solid rgba(0,243,255,0.4)'
                  : '1px solid var(--border-subtle)',
                background: allReady
                  ? 'rgba(0,243,255,0.1)'
                  : 'rgba(255,255,255,0.03)',
                color: allReady ? 'var(--accent-cyan)' : 'var(--text-muted)',
                cursor: allReady ? 'pointer' : 'not-allowed',
                fontSize: '13px',
                fontWeight: 700,
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                boxShadow: allReady ? 'var(--shadow-cyan)' : 'none',
                transition: 'all 0.2s',
              }}
            >
              {allReady ? (
                <>
                  <Play size={16} />
                  Starta Agenten
                </>
              ) : (
                'Inväntar system...'
              )}
            </motion.button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ── Helper ────────────────────────────────────────────────────────────────────
function StatusRow({ label, sub, ok, okLabel, failLabel, warning }: {
  label: string; sub: string; ok: boolean;
  okLabel: string; failLabel: string; warning?: boolean;
}) {
  const isWarn = warning && !ok;
  const statusColor = ok
    ? 'var(--accent-green)'
    : isWarn ? 'var(--accent-yellow)' : 'var(--accent-red)';

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '12px 16px',
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid var(--border-subtle)',
      borderRadius: '12px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{
          width: '10px', height: '10px', borderRadius: '50%',
          background: statusColor,
          boxShadow: `0 0 8px ${statusColor}`,
          flexShrink: 0,
        }} />
        <div>
          <div style={{ fontWeight: 600, fontSize: '13px' }}>{label}</div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{sub}</div>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', fontWeight: 700, color: statusColor }}>
        {ok ? <CheckCircle2 size={13} /> : (isWarn ? <AlertTriangle size={13} /> : <ServerCrash size={13} />)}
        {ok ? okLabel : failLabel}
      </div>
    </div>
  );
}
