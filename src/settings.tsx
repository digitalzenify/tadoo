import { useEffect, useState } from 'react'
import { Check, Copy, Key, Plus, SignOut, Sparkle, Trash, Warning } from '@phosphor-icons/react'
import { api, type ApiKeyRecord, type ProviderStatus, type User, type WorkspaceSettings } from './api'
import { buildAgentPrompt } from './agent'

type SavePatch = Record<string, string | null>

type Props = {
  token: string
  user: User
  settings: WorkspaceSettings | null
  providers: ProviderStatus | null
  onSave: (patch: SavePatch) => Promise<void>
  onOpenDocs: () => void
  onSignOut: () => void
}

const TEXT_SIZES: Array<{ value: WorkspaceSettings['textSize']; label: string }> = [
  { value: 'small', label: 'Small' },
  { value: 'default', label: 'Default' },
  { value: 'large', label: 'Large' },
  { value: 'xlarge', label: 'Extra large' },
]

const providerSource = (source: string | undefined, fallback: string) => source === 'workspace' ? 'your key' : source === 'server' ? 'server key' : fallback

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return <section className="settings-section"><div className="settings-head"><h2>{title}</h2>{hint && <p>{hint}</p>}</div><div className="settings-body">{children}</div></section>
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return <label className="settings-field"><span className="field-label">{label}</span>{children}{hint && <small>{hint}</small>}</label>
}

function Badge({ on, children }: { on: boolean; children: React.ReactNode }) {
  return <span className={on ? 'badge on' : 'badge off'}>{children}</span>
}

function CopyButton({ text, label = 'Copy' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false)
  return <button className="ghost-button" onClick={async () => { try { await navigator.clipboard.writeText(text); setCopied(true); window.setTimeout(() => setCopied(false), 2500) } catch { setCopied(false) } }}>{copied ? <Check size={15} /> : <Copy size={15} />} {copied ? 'Copied' : label}</button>
}

export function SettingsView({ token, user, settings, providers, onSave, onOpenDocs, onSignOut }: Props) {
  const [keys, setKeys] = useState<ApiKeyRecord[]>([])
  const [keyName, setKeyName] = useState('')
  const [freshKey, setFreshKey] = useState('')
  const [notice, setNotice] = useState('')
  const [providerStatus, setProviderStatus] = useState('')
  const [form, setForm] = useState({ opencodeApiKey: '', opencodeBaseUrl: '', opencodeModel: '', groqApiKey: '', groqWhisperModel: '', hindsightUrl: '', hindsightApiKey: '', hindsightBank: '' })

  const theme = settings?.theme || 'light'
  const textSize = settings?.textSize || 'default'
  const agentPrompt = freshKey ? buildAgentPrompt({ apiKey: freshKey, email: user.email }) : ''

  useEffect(() => { api.keys(token).then(result => setKeys(result.keys)).catch(() => setNotice('Could not load your API keys')) }, [token])
  useEffect(() => { if (!settings) return; setForm(current => ({ ...current, opencodeBaseUrl: settings.opencodeBaseUrl, opencodeModel: settings.opencodeModel, groqWhisperModel: settings.groqWhisperModel, hindsightUrl: settings.hindsightUrl, hindsightBank: settings.hindsightBank })) }, [settings])

  async function saveProviders(patch: SavePatch, message: string) {
    setProviderStatus('Saving...')
    try { await onSave(patch); setForm(current => ({ ...current, opencodeApiKey: '', groqApiKey: '', hindsightApiKey: '' })); setProviderStatus(message) }
    catch (cause) { setProviderStatus(cause instanceof Error ? cause.message : 'Could not save settings') }
  }

  async function submitProviders() {
    const patch: SavePatch = {}
    for (const [key, value] of Object.entries(form)) if (String(value).trim()) patch[key] = String(value).trim()
    if (!Object.keys(patch).length) { setProviderStatus('Nothing to save yet'); return }
    await saveProviders(patch, 'Provider settings saved')
  }

  async function mintKey(name: string) {
    if (!name.trim()) { setNotice('Give the key a name first'); return }
    setNotice('')
    try { const result = await api.createKey(token, name.trim()); setFreshKey(result.key); setKeys(current => [{ id: result.id, name: name.trim(), createdAt: new Date().toISOString() }, ...current]); setKeyName('') }
    catch (cause) { setNotice(cause instanceof Error ? cause.message : 'Could not create the key') }
  }

  async function revokeKey(id: string) {
    try { await api.deleteKey(token, id); setKeys(current => current.filter(key => key.id !== id)); setNotice('Key revoked') }
    catch (cause) { setNotice(cause instanceof Error ? cause.message : 'Could not revoke the key') }
  }

  return <div className="settings">
    <Section title="Appearance" hint="Saved to your account, so it follows you to every device.">
      <div className="settings-row"><span className="settings-label">Theme</span><div className="segmented">{(['light', 'dark'] as const).map(value => <button key={value} className={theme === value ? 'segment active' : 'segment'} onClick={() => onSave({ theme: value })}>{value === 'light' ? 'Light' : 'Dark'}</button>)}</div></div>
      <div className="settings-row"><span className="settings-label">Text size</span><div className="segmented">{TEXT_SIZES.map(option => <button key={option.value} className={textSize === option.value ? 'segment active' : 'segment'} onClick={() => onSave({ textSize: option.value })}>{option.label}</button>)}</div></div>
      <p className="settings-muted">Text size scales the whole workspace, like a browser zoom.</p>
    </Section>

    <Section title="AI providers" hint="Your keys stay on the server, are never sent back to the browser, and are used only for your own AI calls. Without them, Tadoo falls back to its local rules.">
      <div className="provider-card">
        <div className="provider-head"><strong>OpenCode Go</strong><Badge on={Boolean(providers?.opencode)}>{providerSource(providers?.opencodeSource, 'local fallback')}</Badge></div>
        <Field label="API key" hint={settings?.opencodeApiKeySet ? 'A key is stored. Leave blank to keep it.' : 'Used for Ramble parsing, breakdown and estimates.'}><input type="password" autoComplete="off" value={form.opencodeApiKey} onChange={event => setForm({ ...form, opencodeApiKey: event.target.value })} placeholder={settings?.opencodeApiKeySet ? 'Stored, hidden' : 'sk-...'} /></Field>
        <Field label="Base URL"><input value={form.opencodeBaseUrl} onChange={event => setForm({ ...form, opencodeBaseUrl: event.target.value })} placeholder="https://api.opencode.ai/v1" /></Field>
        <Field label="Model"><input value={form.opencodeModel} onChange={event => setForm({ ...form, opencodeModel: event.target.value })} placeholder="opencode-go" /></Field>
        {settings?.opencodeApiKeySet && <button className="ghost-button danger" onClick={() => saveProviders({ opencodeApiKey: null }, 'OpenCode key cleared')}>Clear stored key</button>}
      </div>
      <div className="provider-card">
        <div className="provider-head"><strong>Groq Whisper</strong><Badge on={Boolean(providers?.groq)}>{providerSource(providers?.groqSource, 'text input only')}</Badge></div>
        <Field label="API key" hint={settings?.groqApiKeySet ? 'A key is stored. Leave blank to keep it.' : 'Transcribes recorded Rambles.'}><input type="password" autoComplete="off" value={form.groqApiKey} onChange={event => setForm({ ...form, groqApiKey: event.target.value })} placeholder={settings?.groqApiKeySet ? 'Stored, hidden' : 'gsk_...'} /></Field>
        <Field label="Whisper model"><input value={form.groqWhisperModel} onChange={event => setForm({ ...form, groqWhisperModel: event.target.value })} placeholder="whisper-large-v3-turbo" /></Field>
        {settings?.groqApiKeySet && <button className="ghost-button danger" onClick={() => saveProviders({ groqApiKey: null }, 'Groq key cleared')}>Clear stored key</button>}
      </div>
      <div className="provider-card">
        <div className="provider-head"><strong>Hindsight memory</strong><Badge on={Boolean(providers?.hindsight)}>{providerSource(providers?.hindsightSource, 'no context')}</Badge></div>
        <Field label="Base URL" hint="Recalled before every AI operation so suggestions know your context."><input value={form.hindsightUrl} onChange={event => setForm({ ...form, hindsightUrl: event.target.value })} placeholder="http://hindsight:8888" /></Field>
        <Field label="API key"><input type="password" autoComplete="off" value={form.hindsightApiKey} onChange={event => setForm({ ...form, hindsightApiKey: event.target.value })} placeholder={settings?.hindsightApiKeySet ? 'Stored, hidden' : 'optional'} /></Field>
        <Field label="Bank"><input value={form.hindsightBank} onChange={event => setForm({ ...form, hindsightBank: event.target.value })} placeholder="tadoo" /></Field>
        {settings?.hindsightApiKeySet && <button className="ghost-button danger" onClick={() => saveProviders({ hindsightApiKey: null }, 'Hindsight key cleared')}>Clear stored key</button>}
      </div>
      <div className="settings-actions"><button className="primary" onClick={submitProviders}>Save provider settings</button>{providerStatus && <span className="settings-status">{providerStatus}</span>}</div>
    </Section>

    <Section title="Tadoo API keys" hint="Keys let agents and scripts read and write your tasks. The raw key is shown once, then only its hash is kept.">
      <div className="key-create"><input value={keyName} onChange={event => setKeyName(event.target.value)} placeholder="Key name, e.g. Hermes agent" onKeyDown={event => event.key === 'Enter' && mintKey(keyName)} /><button className="primary" onClick={() => mintKey(keyName)}><Plus size={16} /> Create key</button></div>
      {freshKey && <div className="fresh-key"><div><strong>Copy this key now</strong><p>It will not be shown again. Revoke it any time below.</p><code>{freshKey}</code></div><CopyButton text={freshKey} label="Copy key" /></div>}
      {keys.length > 0 && <ul className="key-list">{keys.map(key => <li key={key.id}><Key size={17} /><span>{key.name}</span><small>created {new Date(key.createdAt).toLocaleDateString()}</small><button className="ghost-button danger" onClick={() => revokeKey(key.id)}><Trash size={15} /> Revoke</button></li>)}</ul>}
      {keys.length === 0 && <p className="settings-muted">No keys yet.</p>}
    </Section>

    <Section title="Connect your AI agent" hint="Hand your agent this prompt and it knows how to work with Tadoo: what the endpoints are, what the fields mean, and how to behave.">
      {agentPrompt ? <>
        <p className="settings-muted">This prompt contains the key you just created. Paste it into your agent once, then keep it somewhere safe.</p>
        <pre className="prompt-block">{agentPrompt}</pre>
        <div className="settings-actions"><CopyButton text={agentPrompt} label="Copy prompt" /></div>
      </> : <>
        <p className="settings-muted">A key is needed so the prompt can carry it. Mint one here and the prompt appears with the key already filled in.</p>
        <div className="settings-actions"><button className="primary" onClick={() => mintKey('AI agent')}><Sparkle size={16} weight="fill" /> Create a key for my agent</button></div>
      </>}
      <div className="callout"><Warning size={16} /><span>Treat the key like a password: anyone holding it can read and change your tasks. Revoke it here if it leaks.</span></div>
    </Section>

    <Section title="Documentation" hint="The full API surface, with the call shapes an agent or script can use.">
      <div className="settings-actions"><button className="ghost-button" onClick={onOpenDocs}>Open the API documentation</button></div>
    </Section>

    <Section title="Account">
      <div className="settings-row"><span className="settings-label">Signed in as</span><strong>{user.email}</strong></div>
      <div className="settings-actions"><button className="ghost-button danger" onClick={onSignOut}><SignOut size={16} /> Sign out</button></div>
    </Section>

    {notice && <p className="settings-status">{notice}</p>}
  </div>
}
