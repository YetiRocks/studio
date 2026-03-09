import { Link } from '@tanstack/react-router'
import { ReactNode } from 'react'

export function VectorsSubnav({ left, right }: { left?: ReactNode; right?: ReactNode }) {
  return (
    <nav className="demos-subnav" style={{ position: 'relative' }}>
      {left && <div style={{ position: 'absolute', left: 'var(--space-8)' }}>{left}</div>}
      <Link to="/vectors/text" className="subnav-link" activeProps={{ className: 'subnav-link active' }}>
        Text Models
      </Link>
      <Link to="/vectors/image" className="subnav-link" activeProps={{ className: 'subnav-link active' }}>
        Image Models
      </Link>
      {right && <div style={{ position: 'absolute', right: 'var(--space-8)' }}>{right}</div>}
    </nav>
  )
}
