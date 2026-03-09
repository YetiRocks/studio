import { createFileRoute, Outlet, Link } from '@tanstack/react-router'

export const Route = createFileRoute('/telemetry')({
  component: TelemetryLayout,
})

function TelemetryLayout() {
  return (
    <>
      <nav className="demos-subnav">
        <Link to="/telemetry/metrics" className="subnav-link" activeProps={{ className: 'subnav-link active' }}>Metrics</Link>
        <Link to="/telemetry/logs" className="subnav-link" activeProps={{ className: 'subnav-link active' }}>Logs</Link>
        <Link to="/telemetry/traces" className="subnav-link" activeProps={{ className: 'subnav-link active' }}>Traces</Link>
      </nav>
      <div className="telemetry-content">
        <Outlet />
      </div>
    </>
  )
}
