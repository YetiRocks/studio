import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { SpansPanel } from '../../components/telemetry/SpansPanel'

export const Route = createFileRoute('/telemetry/traces')({
  component: () => {
    const [paused, setPaused] = useState(false)
    return <SpansPanel paused={paused} onTogglePause={() => setPaused(p => !p)} />
  },
})
