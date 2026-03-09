import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/vectors/')({
  beforeLoad: () => {
    throw redirect({ to: '/vectors/text' })
  },
})
