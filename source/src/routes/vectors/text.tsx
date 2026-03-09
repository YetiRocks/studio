import { createFileRoute } from '@tanstack/react-router'
import { ModelsTable } from '../../components/vectors/ModelsTable'

export const Route = createFileRoute('/vectors/text')({
  component: () => <ModelsTable type="text" />,
})
