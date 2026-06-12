import { AgentEnrollFlow } from "@/components/enroll/AgentEnrollFlow"

type PageProps = {
  params: Promise<{ code: string }>
}

export default async function EnrollPage({ params }: PageProps) {
  const { code } = await params
  return <AgentEnrollFlow code={code} />
}
