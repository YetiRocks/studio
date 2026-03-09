import { useState, useEffect, useCallback, useRef } from 'react'
import { BENCHMARKS_BASE } from '../../api'
import BenchmarkChart from './BenchmarkChart'

interface TestDef {
  id: string
  name: string
  binary: string
  duration: number
  vus: number
  category: string
  mode: string
}

const TESTS: TestDef[] = [
  // Throughput tests (30s baseline)
  { id: 'rest-read', name: 'REST Reads', binary: 'load-rest', duration: 30, vus: 100, category: 'throughput', mode: 'standard' },
  { id: 'rest-write', name: 'REST Writes', binary: 'load-rest', duration: 30, vus: 25, category: 'throughput', mode: 'standard' },
  { id: 'rest-update', name: 'REST Update', binary: 'load-rest', duration: 30, vus: 350, category: 'throughput', mode: 'standard' },
  { id: 'rest-join', name: 'REST Join', binary: 'load-rest', duration: 30, vus: 25, category: 'throughput', mode: 'standard' },
  { id: 'graphql-read', name: 'GraphQL Reads', binary: 'load-graphql', duration: 30, vus: 100, category: 'throughput', mode: 'standard' },
  { id: 'graphql-mutation', name: 'GraphQL Mutations', binary: 'load-graphql', duration: 30, vus: 15, category: 'throughput', mode: 'standard' },
  { id: 'graphql-join', name: 'GraphQL Join', binary: 'load-graphql', duration: 30, vus: 100, category: 'throughput', mode: 'standard' },
  { id: 'vector-embed', name: 'Vector Embed', binary: 'load-vector', duration: 30, vus: 10, category: 'throughput', mode: 'standard' },
  { id: 'vector-search', name: 'Vector Search', binary: 'load-vector', duration: 30, vus: 12, category: 'throughput', mode: 'standard' },
  { id: 'blob-retrieval', name: '150k Blob Retrieval', binary: 'load-blob', duration: 30, vus: 35, category: 'throughput', mode: 'standard' },
  { id: 'ws', name: 'WebSocket', binary: 'load-realtime', duration: 30, vus: 1000, category: 'throughput', mode: 'standard' },
  { id: 'sse', name: 'SSE Streaming', binary: 'load-realtime', duration: 30, vus: 1000, category: 'throughput', mode: 'standard' },
  // Connection ramp tests
  { id: 'rest-read-ramp', name: 'REST Read Ramp', binary: 'load-rest', duration: 120, vus: 10, category: 'connections', mode: 'ramp' },
  { id: 'rest-write-ramp', name: 'REST Write Ramp', binary: 'load-rest', duration: 120, vus: 10, category: 'connections', mode: 'ramp' },
  { id: 'graphql-read-ramp', name: 'GraphQL Read Ramp', binary: 'load-graphql', duration: 120, vus: 10, category: 'connections', mode: 'ramp' },
  { id: 'ws-ramp', name: 'WebSocket Ramp', binary: 'load-realtime', duration: 120, vus: 1000, category: 'connections', mode: 'ramp' },
  { id: 'sse-ramp', name: 'SSE Ramp', binary: 'load-realtime', duration: 120, vus: 1000, category: 'connections', mode: 'ramp' },
  // Sustained tests (300s stability proof)
  { id: 'rest-read-sustained', name: 'REST Read Sustained', binary: 'load-rest', duration: 300, vus: 100, category: 'sustained', mode: 'standard' },
  { id: 'rest-write-sustained', name: 'REST Write Sustained', binary: 'load-rest', duration: 300, vus: 25, category: 'sustained', mode: 'standard' },
  { id: 'graphql-read-sustained', name: 'GraphQL Read Sustained', binary: 'load-graphql', duration: 300, vus: 100, category: 'sustained', mode: 'standard' },
]

const SECTIONS: { category: string; label: string; description: string }[] = [
  { category: 'throughput', label: 'Throughput', description: '30s, optimized VUs — baseline across REST, GraphQL, vectors, realtime, and blobs' },
  { category: 'connections', label: 'Connections', description: '120s progressive ramp — extrapolates to 1M clients' },
  { category: 'sustained', label: 'Sustained', description: '300s, optimized VUs — stability proof under continuous load' },
]

interface LatestResult {
  name: string
  throughput: number
  run: Record<string, unknown>
  results: {
    throughput?: number
    p50?: number
    p95?: number
    p99?: number
    p999?: number
    total?: number
    errors?: number
    cv?: number
    extrapolatedThroughput?: string
    summary?: string
    peakConnections?: number
    connectionFailures?: number
    published?: number
  } | null
}

interface RunnerState {
  status: 'idle' | 'seeding' | 'warming' | 'running' | 'cleaning'
  phase?: 'idle' | 'seeding' | 'warming' | 'running' | 'cleaning'
  test?: string
  startedAt?: number
  warmupSecs?: number
  elapsedSecs?: number
  configuredDuration?: number
  lastResult?: unknown
  error?: string
}

interface HistoryRun {
  id: string
  testName: string
  timestamp: string
  durationSecs: number
  results: string
  summary: string
  extrapolatedThroughput: string
  snapshots?: string
}

interface Snapshot {
  second: number
  rps: number
  p50_ms: number
  p95_ms: number
  p99_ms: number
  p999_ms: number
  errors: number
  active_vus: number
}

function formatNumber(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M'
  if (n >= 1000) return (n / 1000).toFixed(n >= 10000 ? 0 : 1) + 'k'
  return n.toFixed(0)
}

function formatMs(n: number): string {
  if (n === 0) return '-'
  return n.toFixed(2)
}

function formatDate(timestamp: string): string {
  const d = new Date(timestamp)
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')
  return `${month}.${day} ${hours}:${minutes}`
}

function ListIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <line x1="5" y1="3" x2="14" y2="3" />
      <line x1="5" y1="8" x2="14" y2="8" />
      <line x1="5" y1="13" x2="14" y2="13" />
      <circle cx="2" cy="3" r="1" fill="currentColor" stroke="none" />
      <circle cx="2" cy="8" r="1" fill="currentColor" stroke="none" />
      <circle cx="2" cy="13" r="1" fill="currentColor" stroke="none" />
    </svg>
  )
}

export default function BenchmarksPanel() {
  const [latestResults, setLatestResults] = useState<Record<string, LatestResult>>({})
  const [runner, setRunner] = useState<RunnerState>({ status: 'idle' })
  const [historyModal, setHistoryModal] = useState<{ testId: string; testName: string; isRealtimeTest: boolean } | null>(null)
  const [history, setHistory] = useState<HistoryRun[]>([])
  const [error, setError] = useState<string | null>(null)
  const [showDeleteAll, setShowDeleteAll] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [historyView, setHistoryView] = useState<'table' | 'chart'>('table')
  const [chartSnapshots, setChartSnapshots] = useState<Snapshot[]>([])
  const pollRef = useRef<number | null>(null)

  const fetchLatestResults = useCallback(async () => {
    try {
      const resp = await fetch(`${BENCHMARKS_BASE}/bestresults`, { credentials: 'same-origin' })
      if (resp.ok) {
        const data = await resp.json()
        const map: Record<string, LatestResult> = {}
        for (const t of data.tests || []) {
          map[t.name] = t
        }
        setLatestResults(map)
      }
    } catch {
      // Server may not be ready yet
    }
  }, [])

  const fetchRunnerState = useCallback(async () => {
    try {
      const resp = await fetch(`${BENCHMARKS_BASE}/runner`, { credentials: 'same-origin' })
      if (resp.ok) {
        const data = await resp.json()
        const phase = data.phase || data.status || 'idle'
        const state: RunnerState = {
          status: data.status || 'idle',
          phase: phase,
          test: data.testName,
          warmupSecs: data.warmupSecs,
          elapsedSecs: data.elapsedSecs,
          configuredDuration: data.configuredDuration,
          error: data.lastError,
        }

        const isOverdue = state.phase === 'running'
          && (state.configuredDuration ?? 0) > 0
          && (state.elapsedSecs ?? 0) > (state.configuredDuration ?? 0) + 10
        if (isOverdue) {
          state.status = 'idle'
          state.phase = 'idle'
        }

        setRunner(state)

        if (state.status === 'idle') {
          if (pollRef.current) {
            clearInterval(pollRef.current)
            pollRef.current = null
            fetchLatestResults()
            if (historyModal) fetchHistory(historyModal.testId)
            if (state.error) setError(state.error)
          }
        } else if (!pollRef.current) {
          pollRef.current = window.setInterval(fetchRunnerState, 1000)
        }
      }
    } catch {
      // Server may not be ready yet
    }
  }, [fetchLatestResults, historyModal])

  const fetchHistory = useCallback(async (testName: string) => {
    try {
      const resp = await fetch(`${BENCHMARKS_BASE}/TestRun?testName==${testName}`, { credentials: 'same-origin' })
      if (resp.ok) {
        const data = await resp.json()
        const runs: HistoryRun[] = Array.isArray(data) ? data : data.data || []
        runs.sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''))
        setHistory(runs)
      }
    } catch {
      setHistory([])
    }
  }, [])

  useEffect(() => {
    fetchLatestResults()
    fetchRunnerState()
  }, [fetchLatestResults, fetchRunnerState])

  const startTest = async (testId: string) => {
    setError(null)
    try {
      const resp = await fetch(`${BENCHMARKS_BASE}/runner`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ test: testId }),
        credentials: 'same-origin',
      })
      if (resp.ok) {
        setRunner({ status: 'warming', test: testId, startedAt: Date.now() / 1000 })
        if (pollRef.current) clearInterval(pollRef.current)
        pollRef.current = window.setInterval(fetchRunnerState, 1000)
      } else {
        const text = await resp.text()
        setError(text || 'Failed to start test')
      }
    } catch (e) {
      setError(`Connection error: ${e}`)
    }
  }

  const openHistory = (testId: string, testName: string, isRealtimeTest: boolean) => {
    setHistoryModal({ testId, testName, isRealtimeTest })
    setHistoryView('table')
    fetchHistory(testId)
  }

  const closeHistory = () => {
    setHistoryModal(null)
    setHistory([])
    setChartSnapshots([])
  }

  const showChart = (run: HistoryRun) => {
    try {
      const snaps: Snapshot[] = JSON.parse(run.snapshots || '[]')
      setChartSnapshots(snaps)
      setHistoryView('chart')
    } catch {
      setChartSnapshots([])
    }
  }

  const deleteAllResults = async () => {
    setDeleting(true)
    try {
      const resp = await fetch(`${BENCHMARKS_BASE}/bestresults`, { method: 'DELETE', credentials: 'same-origin' })
      if (resp.ok) {
        setLatestResults({})
        setShowDeleteAll(false)
      }
    } catch {
      // silent
    } finally {
      setDeleting(false)
    }
  }

  const effectivePhase = runner.phase ?? runner.status
  const isBusy = effectivePhase !== 'idle'
  const runningTest = isBusy ? runner.test : null

  return (
    <div className="panel benchmarks-panel">
      <div className="demos-subnav">
        <span className="subnav-label">{Object.keys(latestResults).length} of {TESTS.length} tests with results</span>
        <span className="subnav-spacer" />
        <button
          className="btn btn-sm nav-action-btn"
          disabled={isBusy || Object.keys(latestResults).length === 0}
          onClick={() => setShowDeleteAll(true)}
        >
          Delete All
        </button>
      </div>
      <div className="benchmarks-content">
        {error && <div className="bench-error">{error}</div>}

        {SECTIONS.map(section => (
          <div key={section.category} className="bench-section">
            <div className="bench-section-header">
              <div className="bench-section-label">{section.label}</div>
              <div className="bench-section-desc">{section.description}</div>
            </div>
            <div className="metrics-grid bench-grid">
              {TESTS.filter(t => t.category === section.category).map(test => {
                const isThisTest = runningTest === test.id
                return (
                  <TestCard
                    key={test.id}
                    test={test}
                    latest={latestResults[test.id]}
                    phase={isThisTest ? (runner.phase ?? runner.status) : 'idle'}
                    isDisabled={isBusy && !isThisTest}
                    warmupSecs={isThisTest ? (runner.warmupSecs ?? 0) : 0}
                    elapsedSecs={isThisTest ? (runner.elapsedSecs ?? 0) : 0}
                    configuredDuration={isThisTest ? (runner.configuredDuration ?? 0) : 0}
                    onRun={() => startTest(test.id)}
                    onOpenHistory={() => openHistory(test.id, test.name, test.binary === 'load-realtime')}
                  />
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {historyModal && (
        <HistoryModal
          testName={historyModal.testName}
          testCategory={TESTS.find(t => t.id === historyModal.testId)?.category || 'throughput'}
          isRealtimeTest={historyModal.isRealtimeTest}
          runs={history}
          view={historyView}
          chartSnapshots={chartSnapshots}
          onShowChart={showChart}
          onBackToTable={() => setHistoryView('table')}
          onClose={closeHistory}
        />
      )}

      {showDeleteAll && (
        <div className="modal-overlay" onClick={() => !deleting && setShowDeleteAll(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2 className="modal-title">Delete All Results?</h2>
            <p className="modal-message">This will permanently delete all benchmark results across every test. This cannot be undone.</p>
            <div className="modal-actions">
              <button className="btn" disabled={deleting} onClick={() => setShowDeleteAll(false)}>Cancel</button>
              <button className="btn btn-delete" disabled={deleting} onClick={deleteAllResults}>
                {deleting ? 'Deleting...' : 'Delete All'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

interface TestCardProps {
  test: TestDef
  latest?: LatestResult
  phase: 'idle' | 'seeding' | 'warming' | 'running' | 'cleaning'
  isDisabled: boolean
  warmupSecs: number
  elapsedSecs: number
  configuredDuration: number
  onRun: () => void
  onOpenHistory: () => void
}

function TestCard({ test, latest, phase, isDisabled, warmupSecs, elapsedSecs, configuredDuration, onRun, onOpenHistory }: TestCardProps) {
  const results = latest?.results
  const hasData = results && results.throughput
  const isRealtimeTest = test.binary === 'load-realtime'
  const isRamp = test.mode === 'ramp'

  const isOverdue = phase === 'running' && configuredDuration > 0 && elapsedSecs > configuredDuration

  const cardClass = [
    'metric-card bench-card',
    phase === 'seeding' ? 'bench-seeding' : '',
    phase === 'warming' ? 'bench-warming' : '',
    phase === 'running' && !isOverdue ? 'bench-running' : '',
    phase === 'cleaning' ? 'bench-cleaning' : '',
    isOverdue ? 'bench-overdue' : '',
  ].filter(Boolean).join(' ')

  return (
    <div className={cardClass}>
      <div className="bench-card-header">
        <div className="metric-name">{test.name}</div>
        <div className="bench-card-actions">
          {hasData && (
            <button
              className="bench-history-btn"
              onClick={(e) => { e.stopPropagation(); onOpenHistory(); }}
              title="View run history"
            >
              <ListIcon />
            </button>
          )}
          {phase === 'seeding' ? (
            <span className="bench-timer bench-timer-seeding">
              <span className="bench-spinner" />
              Seeding...
            </span>
          ) : phase === 'warming' ? (
            <span className="bench-timer bench-timer-warming">
              <span className="bench-spinner" />
              Warming {warmupSecs.toFixed(0)}s
            </span>
          ) : phase === 'running' ? (
            <span className={`bench-timer ${isOverdue ? 'bench-timer-overdue' : ''}`}>
              <span className="bench-spinner" />
              {elapsedSecs.toFixed(0)}s / {configuredDuration}s
            </span>
          ) : phase === 'cleaning' ? (
            <span className="bench-timer bench-timer-cleaning">
              <span className="bench-spinner" />
              Cleaning...
            </span>
          ) : (
            <button
              className="btn btn-sm btn-primary"
              disabled={isDisabled}
              onClick={(e) => { e.stopPropagation(); onRun(); }}
            >
              Run
            </button>
          )}
        </div>
      </div>

      <div className="bench-card-stats">
        <div className="bench-stat">
          <span className={`bench-stat-value${hasData ? '' : ' bench-stat-empty'}`}>{
            hasData && results.peakConnections != null
              ? formatNumber(results.peakConnections)
              : (isRamp ? '-' : formatNumber(test.vus))
          }</span>
          <span className="bench-stat-label">clients</span>
        </div>
        <div className="bench-stat">
          <span className={`bench-stat-value${hasData ? '' : ' bench-stat-empty'}`}>{
            hasData
              ? isRealtimeTest
                ? formatNumber(
                    results.peakConnections && results.throughput
                      ? Math.round(results.throughput / results.peakConnections)
                      : 0
                  )
                : formatNumber(
                    results.extrapolatedThroughput ? parseFloat(results.extrapolatedThroughput)
                    : latest?.run?.extrapolatedThroughput ? parseFloat(String(latest.run.extrapolatedThroughput))
                    : results.throughput!
                  )
              : '-'
          }</span>
          <span className="bench-stat-label">{isRealtimeTest ? 'events/s' : 'RPS'}</span>
        </div>
        <div className="bench-stat">
          <span className={`bench-stat-value${hasData ? '' : ' bench-stat-empty'}`}>{
            hasData
              ? isRealtimeTest
                ? formatNumber(results.throughput ?? 0)
                : formatMs(results.p95 ?? 0)
              : '-'
          }</span>
          <span className="bench-stat-label">{isRealtimeTest ? 'total/s' : 'ms p95'}</span>
        </div>
      </div>
    </div>
  )
}

interface HistoryModalProps {
  testName: string
  testCategory: string
  isRealtimeTest: boolean
  runs: HistoryRun[]
  view: 'table' | 'chart'
  chartSnapshots: Snapshot[]
  onShowChart: (run: HistoryRun) => void
  onBackToTable: () => void
  onClose: () => void
}

function HistoryModal({ testName, testCategory, isRealtimeTest, runs, view, chartSnapshots, onShowChart, onBackToTable, onClose }: HistoryModalProps) {
  const chartMode = testCategory === 'connections' ? 'ramp' : 'stability'

  return (
    <div className="bench-modal-overlay" onClick={onClose}>
      <div className="bench-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: view === 'chart' ? '750px' : undefined }}>
        <div className="bench-modal-header">
          <span className="bench-modal-title">{testName} — {view === 'chart' ? 'Chart' : `Run History (${runs.length})`}</span>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {view === 'chart' && (
              <button className="btn btn-sm" onClick={onBackToTable}>Back</button>
            )}
            <button className="bench-modal-close" onClick={onClose}>&times;</button>
          </div>
        </div>
        <div className="bench-modal-body">
          {view === 'chart' ? (
            <BenchmarkChart snapshots={chartSnapshots} mode={chartMode} width={680} height={300} />
          ) : runs.length === 0 ? (
            <div className="empty-state">No runs recorded yet</div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Clients</th>
                  <th>{isRealtimeTest ? 'Events/s' : 'RPS'}</th>
                  <th>p95</th>
                  <th>CV %</th>
                  <th>Chart</th>
                </tr>
              </thead>
              <tbody>
                {runs.map(run => {
                  let parsed: Record<string, number> = {}
                  try { parsed = JSON.parse(run.results || '{}') } catch { /* ignore */ }
                  const hasSnapshots = !!run.snapshots
                  const rps = run.extrapolatedThroughput
                    ? parseFloat(run.extrapolatedThroughput)
                    : (parsed.throughput ?? 0)

                  return (
                    <tr key={run.id}>
                      <td>{formatDate(run.timestamp)}</td>
                      <td>{parsed.peakConnections != null ? formatNumber(parsed.peakConnections) : '-'}</td>
                      <td>{formatNumber(rps)}</td>
                      <td>{parsed.p95 != null ? formatMs(parsed.p95) : '-'}</td>
                      <td>{parsed.cv != null ? parsed.cv.toFixed(1) : '-'}</td>
                      <td>
                        {hasSnapshots ? (
                          <button className="btn btn-sm" onClick={() => onShowChart(run)}>View</button>
                        ) : '-'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
