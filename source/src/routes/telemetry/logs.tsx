import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { LogsPanel } from '../../components/telemetry/LogsPanel'

export const Route = createFileRoute('/telemetry/logs')({
  component: () => {
    const [paused, setPaused] = useState(false)
    return <LogsPanel paused={paused} onTogglePause={() => setPaused(p => !p)} />
  },
})
