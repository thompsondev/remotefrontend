import { BrowserConnectSession } from "@/components/connect/BrowserConnectSession"

type PageProps = {
  params: Promise<{ code: string }>
}

export default async function ConnectPage({ params }: PageProps) {
  const { code } = await params
  return <BrowserConnectSession code={code} />
}
