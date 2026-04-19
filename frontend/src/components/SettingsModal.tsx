import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, X, Cpu, RefreshCw, Moon, Sun, Zap, Bot, Shield, Loader2 } from 'lucide-react';
import { saveSettings, fetchModels } from '../lib/api';

interface SettingsType {
  persona: 'senior_partner' | 'helpful' | 'minimalist';
  showThoughts: boolean;
  autoExecute: boolean;
  theme: 'dark' | 'light';
  modelId: string;
  maxHistoryMessages: number;
}

interface Props {
  isOpen: boolean;
  settings: SettingsType;
  onClose: () => void;
  onSave: (s: SettingsType) => void;
}

export function SettingsModal({ isOpen, settings, onClose, onSave }: Props) {
  const [local, setLocal] = useState(settings);
  const [models, setModels] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => { setLocal(settings); }, [settings]);
  useEffect(() => {
    if (isOpen) loadModels();
  }, [isOpen]);

  const loadModels = async () => {
    setLoading(true);
    try {
      const data = await fetchModels();
      setModels(data.data || []);
    } catch {
      setModels([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    await saveSettings(local);
    document.documentElement.setAttribute('data-theme', local.theme);
    onSave(local);
    onClose();
  };

  const Toggle = ({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) => (
    <button
      onClick={() => onChange(!value)}
      style={{
        width: '44px', height: '24px', borderRadius: '12px',
        background: value ? 'var(--accent-cyan)' : 'rgba(255,255,255,0.1)',
        border: 'none', cursor: 'pointer', position: 'relative',
        transition: 'background 0.2s', flexShrink: 0,
        boxShadow: value ? 'var(--shadow-cyan)' : 'none',
      }}
    >
      <div style={{
        position: 'absolute', top: '4px',
        left: value ? '24px' : '4px',
        width: '16px', height: '16px',
        borderRadius: '50%', background: '#fff',
        transition: 'left 0.2s',
      }} />
    </button>
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            position: 'absolute', inset: 0, zIndex: 50,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(12px)',
            padding: '20px',
          }}
          onClick={e => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            initial={{ scale: 0.9, y: 24 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 24 }}
            style={{
              background: 'var(--bg-overlay)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '24px',
              padding: '36px',
              maxWidth: '600px', width: '100%',
              maxHeight: '85vh', overflowY: 'auto',
              boxShadow: 'var(--shadow-deep)',
              position: 'relative',
            }}
          >
            <button
              onClick={onClose}
              style={{
                position: 'absolute', top: '20px', right: '20px',
                background: 'none', border: 'none',
                cursor: 'pointer', color: 'var(--text-muted)',
                transition: 'color 0.2s',
              }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
            >
              <X size={20} />
            </button>

            {/* Header */}
            <div style={{ marginBottom: '32px' }}>
              <h2 style={{
                fontSize: '22px', fontWeight: 800,
                letterSpacing: '0.15em', textTransform: 'uppercase',
                color: 'var(--accent-cyan)',
                display: 'flex', alignItems: 'center', gap: '10px',
              }}>
                <Settings size={22} /> Kontrollpanel
              </h2>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                Anpassa Lelles beteende och systemparametrar
              </p>
            </div>

            {/* Persona */}
            <Section title="Personlighet" icon={<Zap size={14} />}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                {([
                  { id: 'senior_partner', name: 'Senior Partner', desc: 'Proaktiv, tar initiativ', icon: <Zap size={18} /> },
                  { id: 'helpful', name: 'Hjälpsam', desc: 'Pedagogisk och vänlig', icon: <Bot size={18} /> },
                  { id: 'minimalist', name: 'Minimalist', desc: 'Ren kod, få ord', icon: <Shield size={18} /> },
                ] as const).map(p => (
                  <div
                    key={p.id}
                    onClick={() => setLocal({ ...local, persona: p.id })}
                    style={{
                      padding: '14px',
                      borderRadius: '14px',
                      border: local.persona === p.id
                        ? '1px solid rgba(0,243,255,0.4)'
                        : '1px solid var(--border-subtle)',
                      background: local.persona === p.id
                        ? 'rgba(0,243,255,0.07)'
                        : 'rgba(255,255,255,0.02)',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      display: 'flex', flexDirection: 'column', gap: '8px',
                    }}
                  >
                    <span style={{ color: local.persona === p.id ? 'var(--accent-cyan)' : 'var(--text-muted)' }}>
                      {p.icon}
                    </span>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: local.persona === p.id ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                      {p.name}
                    </div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{p.desc}</div>
                  </div>
                ))}
              </div>
            </Section>

            {/* Toggles */}
            <Section title="System" icon={<Cpu size={14} />}>
              <ToggleRow
                label="Visa Tankeprocess"
                desc="Visa modellens resonemang i chatten"
                value={local.showThoughts}
                onChange={v => setLocal({ ...local, showThoughts: v })}
                Toggle={Toggle}
              />
              <ToggleRow
                label="Auto-Execute"
                desc="Kör MCP-kommandon utan bekräftelse"
                value={local.autoExecute}
                onChange={v => setLocal({ ...local, autoExecute: v })}
                Toggle={Toggle}
                danger
              />
              {/* Memory depth */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 600 }}>Konversationsminne</div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Antal lokala meddelanden att behålla</div>
                  </div>
                  <span style={{
                    padding: '2px 10px', borderRadius: '6px',
                    background: 'rgba(0,243,255,0.1)',
                    color: 'var(--accent-cyan)',
                    fontFamily: 'var(--font-mono)', fontSize: '12px',
                  }}>
                    {local.maxHistoryMessages}
                  </span>
                </div>
                <input
                  type="range" min={10} max={500} step={10}
                  value={local.maxHistoryMessages}
                  onChange={e => setLocal({ ...local, maxHistoryMessages: parseInt(e.target.value) })}
                  style={{ accentColor: 'var(--accent-cyan)', cursor: 'pointer' }}
                />
              </div>
            </Section>

            {/* Model */}
            <Section title="Modell" icon={<RefreshCw size={14} />}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Laddade modeller i LM Studio</span>
                <button
                  onClick={loadModels}
                  disabled={loading}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px' }}
                >
                  {loading ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <RefreshCw size={12} />}
                  Uppdatera
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '160px', overflowY: 'auto' }}>
                {models.map(m => (
                  <div
                    key={m.id}
                    onClick={() => setLocal({ ...local, modelId: m.id })}
                    style={{
                      padding: '10px 14px', borderRadius: '10px', cursor: 'pointer',
                      border: local.modelId === m.id ? '1px solid rgba(0,243,255,0.35)' : '1px solid var(--border-subtle)',
                      background: local.modelId === m.id ? 'rgba(0,243,255,0.07)' : 'transparent',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      transition: 'all 0.15s',
                    }}
                  >
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: local.modelId === m.id ? 'var(--accent-cyan)' : 'var(--text-secondary)' }}>
                      {m.id.split('/').pop()}
                    </span>
                    {local.modelId === m.id && (
                      <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'var(--accent-cyan)', boxShadow: 'var(--shadow-cyan)' }} />
                    )}
                  </div>
                ))}
                {models.length === 0 && !loading && (
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center', padding: '20px 0' }}>
                    Inga modeller hittades. Är LM Studio startat?
                  </p>
                )}
              </div>
              <input
                type="text"
                value={local.modelId}
                onChange={e => setLocal({ ...local, modelId: e.target.value })}
                placeholder="Eller ange modell-ID manuellt"
                style={{
                  width: '100%', padding: '10px 14px', marginTop: '10px',
                  background: 'var(--bg-input)', border: '1px solid var(--border-subtle)',
                  borderRadius: '10px', color: 'var(--text-code)',
                  fontFamily: 'var(--font-mono)', fontSize: '12px', outline: 'none',
                }}
              />
            </Section>

            {/* Theme */}
            <Section title="Tema" icon={<Moon size={14} />}>
              <div style={{ display: 'flex', gap: '8px' }}>
                {[
                  { id: 'dark', label: 'Neon Dark', icon: <Moon size={14} /> },
                  { id: 'light', label: 'Cyber Light', icon: <Sun size={14} /> },
                ].map(t => (
                  <button
                    key={t.id}
                    onClick={() => setLocal({ ...local, theme: t.id as any })}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '10px', border: 'none', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: '6px',
                      fontSize: '12px', fontWeight: 600,
                      background: local.theme === t.id
                        ? 'rgba(0,243,255,0.1)' : 'rgba(255,255,255,0.04)',
                      color: local.theme === t.id ? 'var(--accent-cyan)' : 'var(--text-muted)',
                      border: local.theme === t.id
                        ? '1px solid rgba(0,243,255,0.3)' : '1px solid transparent',
                      transition: 'all 0.2s',
                    }}
                  >
                    {t.icon} {t.label}
                  </button>
                ))}
              </div>
            </Section>

            {/* Save */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px', paddingTop: '20px', borderTop: '1px solid var(--border-subtle)' }}>
              <motion.button
                onClick={handleSave}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                style={{
                  padding: '12px 32px', borderRadius: '999px',
                  background: 'var(--accent-cyan)', color: '#000',
                  border: 'none', cursor: 'pointer',
                  fontWeight: 800, fontSize: '13px',
                  letterSpacing: '0.1em', textTransform: 'uppercase',
                  boxShadow: 'var(--shadow-cyan)',
                }}
              >
                Spara Ändringar
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Helper components
function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '28px' }}>
      <h3 style={{
        fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.2em',
        color: 'var(--accent-magenta)', marginBottom: '14px',
        display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700,
      }}>
        {icon} {title}
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {children}
      </div>
    </div>
  );
}

function ToggleRow({ label, desc, value, onChange, Toggle, danger }: {
  label: string; desc: string; value: boolean;
  onChange: (v: boolean) => void;
  Toggle: any; danger?: boolean;
}) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '12px 14px', borderRadius: '12px',
      background: danger && value ? 'rgba(255,51,102,0.05)' : 'rgba(255,255,255,0.02)',
      border: `1px solid ${danger && value ? 'rgba(255,51,102,0.2)' : 'var(--border-subtle)'}`,
    }}>
      <div>
        <div style={{ fontSize: '13px', fontWeight: 600, color: danger && value ? 'var(--accent-red)' : 'var(--text-primary)' }}>
          {label}
        </div>
        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{desc}</div>
      </div>
      <Toggle value={value} onChange={onChange} />
    </div>
  );
}
