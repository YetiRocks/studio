import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { MetricsPanel } from '../../components/telemetry/MetricsPanel'

export const Route = createFileRoute('/telemetry/metrics')({
  component: () => {
    const [paused, setPaused] = useState(false)
    return <MetricsPanel paused={paused} onTogglePause={() => setPaused(p => !p)} />
  },
})
