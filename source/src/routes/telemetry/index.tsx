import { createFileRoute, Navigate } from '@tanstack/react-router'

export const Route = createFileRoute('/telemetry/')({
  component: () => <Navigate to="/telemetry/metrics" />,
})
