import { useState, useEffect, useCallback } from 'react'
import { api, VECTORS_BASE } from '../../api'
import { VectorsSubnav } from './VectorsSubnav'

interface ModelEntry {
  name: string
  modelCode: string
  dim: number
  description: string
  downloaded: boolean
  loaded: boolean
  sizeMb: number | null
  isDefault: boolean
}

interface ModelsResponse {
  modelsDir: string
  text: ModelEntry[]
  image: ModelEntry[]
}

export function ModelsTable({ type }: { type: 'text' | 'image' }) {
  const [data, setData] = useState<ModelsResponse | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const [filter, setFilter] = useState('')

  const fetchModels = useCallback(async () => {
    try {
      const resp = await api<ModelsResponse>(`${VECTORS_BASE}/models`)
      setData(resp)
      setError('')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }, [])

  useEffect(() => { fetchModels() }, [fetchModels])

  const installModel = async (modelCode: string) => {
    setBusy(modelCode)
    try {
      await api(`${VECTORS_BASE}/models`, {
        method: 'POST',
        body: JSON.stringify({ modelCode, type }),
      })
      await fetchModels()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(null)
    }
  }

  const uninstallModel = async (modelCode: string) => {
    setBusy(modelCode)
    try {
      await api(`${VECTORS_BASE}/models`, {
        method: 'DELETE',
        body: JSON.stringify({ modelCode, type }),
      })
      await fetchModels()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(null)
    }
  }

  const makeDefault = async (modelCode: string) => {
    setBusy(modelCode)
    try {
      await api(`${VECTORS_BASE}/models`, {
        method: 'PUT',
        body: JSON.stringify({ modelCode, type }),
      })
      await fetchModels()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(null)
    }
  }

  const raw = data ? (type === 'text' ? data.text : data.image) : []
  const lowerFilter = filter.toLowerCase()
  const models = [...raw]
    .filter(m => !filter || m.name.toLowerCase().includes(lowerFilter) || m.description.toLowerCase().includes(lowerFilter) || m.modelCode.toLowerCase().includes(lowerFilter))
    .sort((a, b) => {
      if (a.downloaded !== b.downloaded) return a.downloaded ? -1 : 1
      return a.name.localeCompare(b.name)
    })

  return (
    <>
      <VectorsSubnav
        left={
          <input
            type="text"
            className="filter-input"
            placeholder="Filter models..."
            value={filter}
            onChange={e => setFilter(e.target.value)}
          />
        }
        right={data?.modelsDir ? <code className="models-dir-inline">{data.modelsDir}</code> : undefined}
      />
      <div className="panel">
        {error && <div className="bench-error">{error}</div>}
        {data && models.length === 0 ? (
          <div className="empty-state">No models found</div>
        ) : data ? (
          <table className="data-table models-actions">
            <thead>
              <tr>
                <th className="models-col-name">Model</th>
                <th>Description</th>
                <th>Code</th>
                <th className="models-col-fixed">Dim</th>
                <th className="models-col-fixed">Size</th>
                <th className="col-actions">Actions</th>
              </tr>
            </thead>
            <tbody>
              {models.map(m => (
                <tr key={m.modelCode}>
                  <td className="models-col-name" style={{ color: '#fff', fontWeight: 500 }}>{m.name}</td>
                  <td>{m.description}</td>
                  <td><code className="models-code">{m.modelCode}</code></td>
                  <td className="models-col-fixed">{m.dim}</td>
                  <td className="models-col-fixed">{m.sizeMb != null ? `${m.sizeMb} MB` : '-'}</td>
                  <td className="col-actions">
                    <div className="btn-group">
                      {m.isDefault && m.downloaded ? (
                        <span className="models-badge-default">Default</span>
                      ) : m.downloaded ? (
                        <button
                          className="btn btn-sm"
                          disabled={busy !== null}
                          onClick={() => makeDefault(m.modelCode)}
                        >
                          Make Default
                        </button>
                      ) : <span style={{ width: '125px' }} />}
                      {m.downloaded ? (
                        <button
                          className="btn btn-sm"
                          disabled={busy !== null || m.isDefault}
                          onClick={() => uninstallModel(m.modelCode)}
                        >
                          {busy === m.modelCode ? <><span className="bench-spinner" /> Removing...</> : 'Uninstall'}
                        </button>
                      ) : (
                        <button
                          className="btn btn-sm btn-primary"
                          disabled={busy !== null}
                          onClick={() => installModel(m.modelCode)}
                        >
                          {busy === m.modelCode ? <><span className="bench-spinner" /> Installing...</> : 'Install'}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
      </div>
    </>
  )
}
