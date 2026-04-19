const BASE = 'http://localhost:3001';

export async function fetchConfig() {
  const res = await fetch(`${BASE}/api/config`);
  return res.json();
}

export async function fetchSettings() {
  const res = await fetch(`${BASE}/api/settings`);
  return res.json();
}

export async function saveSettings(settings: any) {
  const res = await fetch(`${BASE}/api/settings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
  });
  return res.json();
}

export async function checkLmStudioStatus(): Promise<boolean> {
  try {
    const res = await fetch(`${BASE}/api/lm-studio-status`, { signal: AbortSignal.timeout(2000) });
    const data = await res.json();
    return data.running;
  } catch {
    return false;
  }
}

export async function fetchModels() {
  const res = await fetch(`${BASE}/api/lm-studio-models`, { signal: AbortSignal.timeout(4000) });
  if (!res.ok) throw new Error('Could not fetch models');
  return res.json();
}

export async function browseFolder(): Promise<string | null> {
  const res = await fetch(`${BASE}/api/browse`, { method: 'POST' });
  const data = await res.json();
  return data.success ? data.path : null;
}

export async function fetchMcpStatus() {
  const res = await fetch(`${BASE}/api/mcp-status`);
  return res.json();
}

export async function uploadFile(base64: string, extension: string): Promise<{ filename: string }> {
  const res = await fetch(`${BASE}/api/upload-file`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ base64, extension }),
  });
  if (!res.ok) throw new Error('Upload failed');
  return res.json();
}
