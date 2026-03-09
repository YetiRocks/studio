import { useState, useEffect } from 'react'
import { BASE_URL } from '../../hooks/useSSE'

/** Fetch all app IDs from the telemetry status endpoint. */
export function useAppIds(): string[] {
  const [appIds, setAppIds] = useState<string[]>([])

  useEffect(() => {
    fetch(`${BASE_URL}/telemetry`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data.apps)) {
          setAppIds(data.apps.map((a: { id: string }) => a.id).sort())
        }
      })
      .catch(() => {})
  }, [])

  return appIds
}
