import { Funnel, Sparkle, Tag } from '@phosphor-icons/react'
import { API_DOC_GROUPS, CURL_EXAMPLE } from './docs'
import type { TaskFilters } from './filters'

export function LabelsView({ labels, active, onSelect }: { labels: Array<{ name: string; count: number }>; active: string | null; onSelect: (name: string | null) => void }) {
  return <div className="panel-view">
    <p className="settings-muted">Labels live on tasks. Pick one to filter the list, pick it again to clear.</p>
    <div className="label-cloud">
      {labels.map(label => <button key={label.name} className={active === label.name ? 'label-chip active' : 'label-chip'} onClick={() => onSelect(active === label.name ? null : label.name)}><Tag size={14} /> {label.name} <em>{label.count}</em></button>)}
    </div>
    {!labels.length && <p className="empty-hint">No labels yet. Open a task and add labels in its details, or let a Ramble suggest them.</p>}
  </div>
}

export function FiltersView({ filters, projects, labels, matched, onChange, onReset }: { filters: TaskFilters; projects: string[]; labels: string[]; matched: number; onChange: (filters: TaskFilters) => void; onReset: () => void }) {
  return <div className="panel-view">
    <p className="settings-muted">Filters stack, so you can narrow the list to exactly what you want to see.</p>
    <div className="filter-grid">
      <label className="settings-field"><span className="field-label">Priority</span><select value={filters.priority} onChange={event => onChange({ ...filters, priority: event.target.value as TaskFilters['priority'] })}><option value="all">Any priority</option><option value="high">Priority 1</option><option value="medium">Priority 2</option><option value="low">Priority 3</option></select></label>
      <label className="settings-field"><span className="field-label">Status</span><select value={filters.status} onChange={event => onChange({ ...filters, status: event.target.value as TaskFilters['status'] })}><option value="all">Open and done</option><option value="open">Open only</option><option value="done">Done only</option></select></label>
      <label className="settings-field"><span className="field-label">Due</span><select value={filters.due} onChange={event => onChange({ ...filters, due: event.target.value as TaskFilters['due'] })}><option value="all">Any date</option><option value="today">Today</option><option value="upcoming">Later</option><option value="none">No date</option></select></label>
      <label className="settings-field"><span className="field-label">Project</span><select value={filters.project} onChange={event => onChange({ ...filters, project: event.target.value })}><option value="all">Any project</option>{projects.map(project => <option key={project} value={project}>{project}</option>)}</select></label>
      <label className="settings-field"><span className="field-label">Label</span><select value={filters.label} onChange={event => onChange({ ...filters, label: event.target.value })}><option value="all">Any label</option>{labels.map(label => <option key={label} value={label}>{label}</option>)}</select></label>
    </div>
    <div className="settings-actions"><button className="ghost-button" onClick={onReset}><Funnel size={15} /> Reset filters</button><span className="settings-muted">{matched} task{matched === 1 ? '' : 's'} match</span></div>
  </div>
}

export function DocsView({ onOpenSettings }: { onOpenSettings: () => void }) {
  return <div className="panel-view docs">
    <p className="settings-muted">Everything this workspace exposes over HTTP. Agents authenticate with a personal API key sent as <code>X-Tadoo-API-Key</code>, the browser uses a session token from signing in. All bodies and responses are JSON.</p>
    {API_DOC_GROUPS.map(group => <section className="docs-group" key={group.group}>
      <h3>{group.group}</h3>
      <p className="settings-muted">{group.blurb}</p>
      <div className="docs-table">{group.items.map(item => <div className="docs-row" key={`${item.method} ${item.path}`}>
        <span className={`method ${item.method.toLowerCase()}`}>{item.method}</span>
        <code>{item.path}</code>
        <span className="docs-summary">{item.summary}</span>
        {item.body && <pre className="docs-body">{item.body}</pre>}
      </div>)}</div>
    </section>)}
    <section className="docs-group"><h3>Examples</h3><pre className="prompt-block">{CURL_EXAMPLE}</pre></section>
    <div className="callout"><Sparkle size={16} /><span>Want an agent to drive this for you? Settings, Connect your AI agent, hands over a ready-made prompt.</span></div>
    <div className="settings-actions"><button className="ghost-button" onClick={onOpenSettings}>Open settings</button></div>
  </div>
}
