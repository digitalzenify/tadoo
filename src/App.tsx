import { useEffect, useMemo, useRef, useState } from 'react'
import { Alarm, ArrowRight, CaretDown, Check, CheckCircle, Circle, Clock, DotsThree, Funnel, GearSix, Lightning, MagnifyingGlass, Microphone, Moon, Plus, Sparkle, Sun, Tag, X } from '@phosphor-icons/react'
import { api, ApiError, session, type ApiTask, type RambleResult, type User } from './api'

type Task = { id: string; title: string; project: string; label?: string; estimate: string; priority: 'high' | 'medium' | 'low'; completed?: boolean; due?: string; subtasks?: string[] }
const priorityName = (priority: number): Task['priority'] => priority === 1 ? 'high' : priority === 3 ? 'low' : 'medium'
const toTask = (task: ApiTask): Task => ({ id: task.id, title: task.title, project: task.project, estimate: `${task.durationMinutes} min`, priority: priorityName(task.priority), completed: task.completed, due: task.dueDate ? (task.dueDate === new Date().toISOString().slice(0, 10) ? 'Today' : task.dueDate) : undefined })
const cacheKey = (userId: string) => `tadoo:tasks:${userId}`

function App() {
  const [token, setToken] = useState(() => session.read())
  const [user, setUser] = useState<User | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [activeNav, setActiveNav] = useState('Today')
  const [query, setQuery] = useState('')
  const [showRamble, setShowRamble] = useState(false)
  const [showAssist, setShowAssist] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [newTask, setNewTask] = useState('')
  const [dark, setDark] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [sync, setSync] = useState<'syncing' | 'synced' | 'offline'>('syncing')
  const [error, setError] = useState('')
  const [schedule, setSchedule] = useState<Array<{ taskId: string; title: string; start?: string; end?: string; unscheduled?: boolean; reason: string }>>([])

  useEffect(() => {
    if (!token) return
    let cancelled = false
    setSync('syncing')
    api.me(token).then(({ user: nextUser }) => {
      if (cancelled) return
      setUser(nextUser)
      const cached = localStorage.getItem(cacheKey(nextUser.id)); if (cached) setTasks(JSON.parse(cached))
      return api.tasks(token)
    }).then(result => { if (!result || cancelled) return; setTasks(result.tasks.map(toTask)); setSync('synced') }).catch((cause: unknown) => {
      if (cancelled) return
      if (cause instanceof ApiError && cause.status === 401) { session.clear(); setToken(null); setUser(null); return }
      setSync('offline'); setError(cause instanceof Error ? cause.message : 'Could not sync tasks')
    })
    return () => { cancelled = true }
  }, [token])

  useEffect(() => { if (user) localStorage.setItem(cacheKey(user.id), JSON.stringify(tasks)) }, [tasks, user])

  function finishAuth(nextToken: string, nextUser: User) { session.write(nextToken); setToken(nextToken); setUser(nextUser); setError('') }
  async function logout() { if (token) await api.logout(token).catch(() => undefined); session.clear(); setToken(null); setUser(null); setTasks([]) }
  async function toggle(id: string) {
    const task = tasks.find(item => item.id === id); if (!task) return
    setTasks(prev => prev.map(item => item.id === id ? { ...item, completed: !item.completed } : item))
    try { await api.updateTask(token!, id, { completed: !task.completed }); setSync('synced') } catch { setSync('offline'); setError('Saved locally. We will retry when the API is available.') }
  }
  async function addTask() {
    const title = newTask.trim(); if (!title || !token) return
    setError('')
    try { const result = await api.createTask(token, { title, project: 'Inbox', priority: 2, durationMinutes: 15, dueDate: new Date().toISOString().slice(0, 10) }); setTasks(prev => [toTask(result.task), ...prev]); setSync('synced'); setNewTask(''); setShowAdd(false); setActiveNav('Today') }
    catch (cause) { setSync('offline'); setError(cause instanceof Error ? cause.message : 'Could not create task') }
  }
  async function previewRamble(payload: { text?: string; audio?: Blob }): Promise<RambleResult> {
    if (!token) throw new Error('You need to be signed in')
    setError('')
    return api.ramblePreview(token, payload)
  }
  async function approveRamble(suggestions: ApiTask[]) {
    if (!token) return
    try { const created = await Promise.all(suggestions.map(suggestion => api.createTask(token, { title: suggestion.title, project: suggestion.project, priority: suggestion.priority, durationMinutes: suggestion.durationMinutes, dueDate: suggestion.dueDate, notes: suggestion.notes }))); setTasks(prev => [...created.map(result => toTask(result.task)), ...prev]); setShowRamble(false); setSync('synced') }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not save Ramble tasks') }
  }
  async function breakdown(task: Task) {
    try { const result = await api.breakdown(token!, task.id); setTasks(prev => prev.map(item => item.id === task.id ? { ...item, subtasks: result.items } : item)) }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not break down task') }
  }
  async function estimate(task: Task) {
    try { const result = await api.estimate(token!, task.id); setTasks(prev => prev.map(item => item.id === task.id ? { ...item, estimate: `${result.task.durationMinutes} min` } : item)) }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not estimate task') }
  }
  async function deleteTask(task: Task) {
    if (!window.confirm(`Delete “${task.title}”?`)) return
    try { await api.deleteTask(token!, task.id); setTasks(prev => prev.filter(item => item.id !== task.id)); setSync('synced') }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not delete task') }
  }
  async function remind(task: Task) {
    const remindAt = new Date(Date.now() + 60 * 60 * 1000)
    try { await api.reminder(token!, task.id, remindAt.toISOString()); if ('Notification' in window && Notification.permission === 'default') await Notification.requestPermission(); if ('Notification' in window && Notification.permission === 'granted') window.setTimeout(() => new Notification('Tadoo reminder', { body: task.title }), 60 * 60 * 1000); setError('Reminder set for one hour from now') }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not set reminder') }
  }
  async function openAssist() {
    setShowAssist(true)
    try { const result = await api.schedule(token!); setSchedule(result.plan) } catch { setSchedule([]) }
  }

  if (!token || !user) return <AuthScreen onAuthenticated={finishAuth} />
  const visible = tasks.filter(task => { const matchesNav = activeNav === 'Today' ? task.due === 'Today' : activeNav === 'Upcoming' ? task.due !== 'Today' : activeNav === 'Inbox' ? task.project === 'Inbox' : true; return matchesNav && task.title.toLowerCase().includes(query.toLowerCase()) })
  const done = tasks.filter(task => task.completed).length
  const progress = tasks.length ? Math.round((done / tasks.length) * 100) : 0
  return <div className={dark ? 'app dark' : 'app'}>
    <aside className="sidebar"><div className="brand"><span className="brand-mark">t</span><span>tadoo</span><span className="beta">open</span></div><button className="quick-add" onClick={() => setShowAdd(true)}><Plus weight="bold" size={18} /> Add task <span>⌘ K</span></button>
      <nav className="nav" aria-label="Main navigation"><NavItem icon={<Circle />} label="Inbox" count={tasks.filter(task => task.project === 'Inbox' && !task.completed).length} active={activeNav === 'Inbox'} onClick={() => setActiveNav('Inbox')} /><NavItem icon={<CheckCircle weight="fill" />} label="Today" count={tasks.filter(task => task.due === 'Today' && !task.completed).length} active={activeNav === 'Today'} onClick={() => setActiveNav('Today')} /><NavItem icon={<Clock />} label="Upcoming" active={activeNav === 'Upcoming'} onClick={() => setActiveNav('Upcoming')} /></nav>
      <div className="side-section"><div className="side-heading">Projects <Plus size={16} onClick={() => setShowAdd(true)} /></div><Project color="coral" name="Tadoo" count={tasks.filter(task => task.project === 'Tadoo').length} /><Project color="blue" name="Work" count={tasks.filter(task => task.project === 'Work').length} /><Project color="green" name="Personal" count={tasks.filter(task => task.project === 'Personal').length} /></div>
      <div className="sidebar-bottom"><button className="side-link"><Tag size={18} /> Labels</button><button className="side-link"><Funnel size={18} /> Filters</button><button className="side-link" onClick={logout}><GearSix size={18} /> Sign out</button></div>
    </aside>
    <main className="main"><header className="topbar"><div className="breadcrumbs"><span>{user.email}</span><CaretDown size={14} /></div><div className="top-actions"><div className="search"><MagnifyingGlass size={18} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search tasks" aria-label="Search tasks" /><kbd>/</kbd></div><button className="icon-button" onClick={() => setDark(!dark)} aria-label="Toggle dark mode">{dark ? <Sun size={19} /> : <Moon size={19} />}</button><div className="avatar">{user.email.slice(0, 2).toUpperCase()}</div></div></header>
      <div className="content">{error && <div className="error-banner" role="alert"><span>{error}</span><button onClick={() => setError('')}><X size={15} /></button></div>}<div className="page-heading"><div><div className="eyebrow">{activeNav === 'Today' ? new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' }) : 'Your workspace'}</div><h1>{activeNav}</h1><p className="heading-note">{activeNav === 'Today' ? 'A short list is a kind list.' : 'Everything in one calm place.'}</p></div><button className="assist-trigger" onClick={openAssist}><Sparkle size={18} weight="fill" /> Task Assist</button></div>
        {activeNav === 'Today' && <section className="focus-card"><div className="focus-icon"><Lightning size={21} weight="fill" /></div><div className="focus-copy"><strong>Make room for one good hour</strong><span>AI picked a realistic focus block based on your energy and open time.</span></div><button className="focus-action" onClick={openAssist}>See plan <ArrowRight size={16} /></button></section>}
        <div className="list-toolbar"><span>{sync === 'offline' ? 'Offline mode' : sync === 'syncing' ? 'Syncing...' : `${visible.filter(task => !task.completed).length} tasks left`} </span><button><Funnel size={16} /> Filter <CaretDown size={13} /></button></div>
        <section className="task-list">{visible.map(task => <TaskRow key={task.id} task={task} expanded={expanded === task.id} onToggle={() => toggle(task.id)} onExpand={() => setExpanded(expanded === task.id ? null : task.id)} onBreakdown={() => breakdown(task)} onEstimate={() => estimate(task)} onDelete={() => deleteTask(task)} onReminder={() => remind(task)} />)}{visible.length === 0 && <div className="empty"><CheckCircle size={34} /><strong>Nothing here</strong><span>Try a different view or add a task.</span></div>}</section>
        <button className="add-task-row" onClick={() => setShowAdd(true)}><Plus size={19} /> Add a task <span>Press ⌘ K anywhere</span></button><div className="done-note"><Check size={14} weight="bold" /> {progress === 100 ? 'All clear for today.' : `${progress}% of your day is complete`}</div>
      </div>
    </main>
    <button className="ramble-fab" onClick={() => setShowRamble(true)}><Microphone size={23} weight="fill" /><span>Ramble</span></button>
    {showRamble && <RambleModal onClose={() => setShowRamble(false)} onCreate={previewRamble} onApprove={approveRamble} />}{showAssist && <AssistModal schedule={schedule} onClose={() => setShowAssist(false)} />}{showAdd && <AddModal value={newTask} setValue={setNewTask} onClose={() => setShowAdd(false)} onAdd={addTask} />}
  </div>
}

function AuthScreen({ onAuthenticated }: { onAuthenticated: (token: string, user: User) => void }) { const [mode, setMode] = useState<'login' | 'register'>('login'); const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [busy, setBusy] = useState(false); const [error, setError] = useState(''); async function submit(event: React.FormEvent) { event.preventDefault(); setBusy(true); setError(''); try { const result = mode === 'login' ? await api.login(email, password) : await api.register(email, password); onAuthenticated(result.token, result.user) } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not authenticate') } finally { setBusy(false) } } return <div className="auth-screen"><div className="auth-panel"><div className="brand auth-brand"><span className="brand-mark">t</span><span>tadoo</span></div><div className="eyebrow">A calm place for your next step</div><h1>{mode === 'login' ? 'Welcome back.' : 'Make space for what matters.'}</h1><p className="auth-copy">Short lists, realistic plans, and an AI that helps without taking over.</p><form onSubmit={submit}><label className="field-label" htmlFor="email">Email</label><input id="email" type="email" required autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="you@example.com" /><label className="field-label" htmlFor="password">Password</label><input id="password" type="password" required minLength={8} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} value={password} onChange={event => setPassword(event.target.value)} placeholder="At least 8 characters" />{error && <p className="auth-error">{error}</p>}<button className="primary full" disabled={busy}>{busy ? 'Working...' : mode === 'login' ? 'Sign in' : 'Create account'} <ArrowRight size={17} /></button></form><button className="auth-switch" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError('') }}>{mode === 'login' ? 'Need an account? Create one' : 'Already have an account? Sign in'}</button></div></div> }
function NavItem({ icon, label, count, active, onClick }: { icon: React.ReactNode; label: string; count?: number; active: boolean; onClick: () => void }) { return <button className={active ? 'nav-item active' : 'nav-item'} onClick={onClick}>{icon}<span>{label}</span>{count !== undefined && <em>{count}</em>}</button> }
function Project({ color, name, count }: { color: string; name: string; count: number }) { return <button className="project"><i className={color} /><span>{name}</span><em>{count}</em></button> }
function TaskRow({ task, onToggle, expanded, onExpand, onBreakdown, onEstimate, onDelete, onReminder }: { task: Task; onToggle: () => void; expanded: boolean; onExpand: () => void; onBreakdown: () => void; onEstimate: () => void; onDelete: () => void; onReminder: () => void }) { return <div className={task.completed ? 'task-row completed' : 'task-row'}><button className="check-button" onClick={onToggle} aria-label={`Mark ${task.title} complete`}>{task.completed ? <CheckCircle weight="fill" size={23} /> : <Circle size={23} />}</button><div className="task-main"><button className="task-title" onClick={onExpand}>{task.title}</button><div className="task-meta"><span className={`priority ${task.priority}`}>{task.priority === 'high' ? 'Priority 1' : task.priority === 'medium' ? 'Priority 2' : 'Priority 3'}</span><span>{task.project}</span>{task.label && <span>{task.label}</span>}{task.due && <span>{task.due}</span>}</div>{expanded && <div className="subtasks">{task.subtasks?.map(item => <label key={item}><input type="checkbox" />{item}</label>)}<button className="ai-breakdown" onClick={onBreakdown}><Sparkle size={14} /> {task.subtasks ? 'Refresh AI breakdown' : 'Break this down with AI'}</button><button className="ai-breakdown" onClick={onReminder}><Alarm size={14} /> Remind me in one hour</button></div>}</div><button className="task-time" onClick={onEstimate} title="Re-estimate with AI"><Clock size={15} /> {task.estimate}</button><button className="dots" aria-label="Delete task" onClick={onDelete}><DotsThree size={20} /></button></div> }
function ModalShell({ children, title, onClose }: { children: React.ReactNode; title: string; onClose: () => void }) { return <div className="modal-backdrop" onMouseDown={onClose}><div className="modal" onMouseDown={event => event.stopPropagation()}><div className="modal-head"><h2>{title}</h2><button onClick={onClose} aria-label="Close"><X size={20} /></button></div>{children}</div></div> }
function RambleModal({ onClose, onCreate, onApprove }: { onClose: () => void; onCreate: (payload: { text?: string; audio?: Blob }) => Promise<RambleResult>; onApprove: (tasks: ApiTask[]) => Promise<void> }) { const [recording, setRecording] = useState(false); const [text, setText] = useState(''); const [audio, setAudio] = useState<Blob>(); const [error, setError] = useState(''); const [busy, setBusy] = useState(false); const [preview, setPreview] = useState<RambleResult>(); const [selected, setSelected] = useState<string[]>([]); const recorder = useRef<MediaRecorder | undefined>(undefined); const stream = useRef<MediaStream | undefined>(undefined); const chunks = useRef<Blob[]>([]); useEffect(() => () => { stream.current?.getTracks().forEach(track => track.stop()) }, []); async function record() { if (recording) { recorder.current?.stop(); stream.current?.getTracks().forEach(track => track.stop()); setRecording(false); return } try { stream.current = await navigator.mediaDevices.getUserMedia({ audio: true }); const supported = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : undefined; recorder.current = new MediaRecorder(stream.current, supported ? { mimeType: supported } : undefined); chunks.current = []; recorder.current.ondataavailable = event => { if (event.data.size) chunks.current.push(event.data) }; recorder.current.onstop = () => setAudio(new Blob(chunks.current, { type: recorder.current?.mimeType || 'audio/webm' })); recorder.current.start(); setRecording(true); setError('') } catch { setError('Microphone access was not available. You can type your Ramble instead.') } } async function submit() { setBusy(true); try { const result = await onCreate(audio ? { audio } : { text }); setPreview(result); setSelected(result.tasks.map(task => task.id)) } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not understand the Ramble') } finally { setBusy(false) } } if (preview) return <ModalShell title="Review your tasks" onClose={onClose}><p className="modal-intro">{preview.transcript}</p><div className="preview-list">{preview.tasks.map(task => <label key={task.id} className="preview-task"><input type="checkbox" checked={selected.includes(task.id)} onChange={() => setSelected(current => current.includes(task.id) ? current.filter(id => id !== task.id) : [...current, task.id])} /><span><strong>{task.title}</strong><small>{task.project} · {task.durationMinutes} min</small></span></label>)}</div><button className="primary full" onClick={() => onApprove(preview.tasks.filter(task => selected.includes(task.id)))}>Add selected tasks <Check size={17} /></button><button className="auth-switch" onClick={() => setPreview(undefined)}>Record again</button></ModalShell>
 return <ModalShell title="Ramble" onClose={onClose}><p className="modal-intro">Say it messy. Tadoo will find the tasks, add context, and make them doable.</p><button className={recording ? 'record-button recording' : 'record-button'} onClick={record}><Microphone size={32} weight="fill" /><span>{recording ? 'Listening... tap to stop' : audio ? 'Recording ready' : 'Tap to start'}</span><small>{recording ? 'Your words stay on this device until you send them' : 'Voice is sent securely for transcription'}</small></button>{error && <p className="auth-error">{error}</p>}<div className="or-line"><span>or type a ramble</span></div><textarea value={text} onChange={event => setText(event.target.value)} placeholder="I need to..." rows={3} />{(text.trim() || audio) && <button className="primary full" disabled={busy} onClick={submit}>{busy ? 'Finding tasks...' : 'Turn into tasks'} <Sparkle size={17} /></button>}<div className="powered"><span>Groq Whisper when configured</span><span>+ your AI context</span></div></ModalShell> }
function AssistModal({ onClose, schedule }: { onClose: () => void; schedule: Array<{ taskId: string; title: string; start?: string; end?: string; unscheduled?: boolean; reason: string }> }) { return <ModalShell title="Task Assist" onClose={onClose}><div className="assist-hero"><div className="assist-mark"><Sparkle size={24} weight="fill" /></div><div><strong>Your realistic day</strong><p>{schedule.length ? `${schedule.filter(item => !item.unscheduled).length} tasks fit your open focus blocks.` : 'Add tasks to build a focus plan.'}</p></div></div><div className="suggestion"><div className="suggestion-title"><span>Suggested focus block</span><span className="pill">Auto-planned</span></div>{schedule.length ? schedule.slice(0, 4).map(item => <div className="suggestion-tasks" key={item.taskId}><span><CheckCircle size={16} /> {item.start && `${item.start} `}{item.title}</span></div>) : <strong>No plan yet</strong>}<button className="primary full" onClick={onClose}>Use this plan <ArrowRight size={17} /></button></div><div className="assist-links"><button><Clock size={17} /> Adjust energy levels</button><button><span className="calendar-icon">23</span> Connect calendar</button></div></ModalShell> }
function AddModal({ value, setValue, onClose, onAdd }: { value: string; setValue: (value: string) => void; onClose: () => void; onAdd: () => void }) { return <ModalShell title="New task" onClose={onClose}><label className="field-label" htmlFor="task-input">What needs doing?</label><input id="task-input" autoFocus value={value} onChange={event => setValue(event.target.value)} onKeyDown={event => event.key === 'Enter' && onAdd()} placeholder="e.g. Call the dentist" /><div className="quick-options"><button><Clock size={16} /> 15 min</button><button><Alarm size={16} /> Today</button><button><Tag size={16} /> Inbox</button></div><button className="primary full" onClick={onAdd}>Add task <Plus size={17} /></button><p className="ai-hint"><Sparkle size={15} /> AI will estimate the time and suggest a breakdown.</p></ModalShell> }

export default App
