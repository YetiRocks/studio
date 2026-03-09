import { useState, useCallback } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { api, APPS_BASE } from '../../api'
import { AppSummary } from '../../types'
import { NewAppModal } from '../../components/NewAppModal'

export const Route = createFileRoute('/applications/')({
  loader: () => api<AppSummary[]>(`${APPS_BASE}/apps`),
  component: ApplicationsList,
})

function ApplicationsList() {
  const apps = Route.useLoaderData()
  const navigate = useNavigate()
  const [filter, setFilter] = useState('')
  const [showNewApp, setShowNewApp] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return
    try {
      await api(`${APPS_BASE}/apps/${encodeURIComponent(deleteTarget)}`, { method: 'DELETE' })
      setDeleteTarget(null)
      navigate({ to: '/applications' })
    } catch {
      setDeleteTarget(null)
    }
  }, [deleteTarget, navigate])

  const sorted = [...apps]
    .filter(app => !app.is_extension)
    .sort((a, b) => a.app_id.localeCompare(b.app_id))

  const filtered = filter
    ? sorted.filter(app => app.app_id.toLowerCase().includes(filter.toLowerCase()))
    : sorted

  return (
    <>
      <nav className="demos-subnav" style={{ position: 'relative' }}>
        <input
          type="text"
          className="filter-input"
          placeholder="Filter applications..."
          value={filter}
          onChange={e => setFilter(e.target.value)}
        />
        <div style={{ position: 'absolute', right: 'var(--space-8)' }}>
          <button className="btn btn-primary btn-sm nav-action-btn" onClick={() => setShowNewApp(true)}>
            New Application
          </button>
        </div>
      </nav>
      <div className="panel">
        {filtered.length === 0 ? (
          <div className="empty-state">No applications found</div>
        ) : (
          <table className="data-table actions-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>App ID</th>
                <th>Status</th>
                <th style={{ textAlign: 'center' }}>Resources</th>
                <th style={{ textAlign: 'center' }}>Tables</th>
                <th className="col-actions">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(app => (
                <tr key={app.app_id}>
                  <td style={{ color: '#fff', fontFamily: 'var(--font-family-base)', fontWeight: 500 }}>{app.name}</td>
                  <td>{app.app_id}</td>
                  <td>
                    <span className={`badge ${app.enabled ? 'badge-success' : 'badge-error'}`}>
                      {app.enabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </td>
                  <td style={{ textAlign: 'center' }}>{app.resource_count}</td>
                  <td style={{ textAlign: 'center' }}>{app.table_count}</td>
                  <td className="col-actions">
                    <div className="btn-group">
                      <button
                        className="btn btn-sm"
                        onClick={() => navigate({ to: '/applications/$appId', params: { appId: app.app_id } })}
                      >
                        Manage
                      </button>
                      <button
                        className="btn btn-sm"
                        onClick={() => setDeleteTarget(app.app_id)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {showNewApp && (
        <NewAppModal
          installedApps={new Set(apps.map(a => a.app_id))}
          onClose={() => setShowNewApp(false)}
        />
      )}
      {deleteTarget && (
        <div className="modal-overlay" onClick={() => setDeleteTarget(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2 className="modal-title">Delete Application?</h2>
            <p className="modal-message">Are you sure you want to delete "{deleteTarget}"? This cannot be undone.</p>
            <div className="modal-actions">
              <button className="btn" onClick={() => setDeleteTarget(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleDelete}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
