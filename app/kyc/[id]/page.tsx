"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { KycForm } from "@/components/kyc-form"
import type { KycClient } from "@/lib/kyc-schema"

export default function EditKycPage() {
  const params = useParams()
  const id = Array.isArray(params?.id) ? params?.id[0] : (params?.id as string | undefined)
  const [client, setClient] = useState<KycClient | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    async function run() {
      if (!id) return
      const res = await fetch(`/api/kyc/${id}`, { cache: "no-store" })
      if (res.ok) {
        const data = (await res.json()) as { client: KycClient }
        setClient(data.client)
      }
      setLoaded(true)
    }
    void run()
  }, [id])

  if (!loaded) {
    return (
      <main className="mx-auto max-w-4xl p-4 md:p-8">
        <div className="rounded-lg border p-8 text-center text-sm text-muted-foreground">Loading...</div>
      </main>
    )
  }

  if (!client) {
    return (
      <main className="mx-auto max-w-4xl p-4 md:p-8">
        <div className="rounded-lg border p-8 text-center text-sm text-muted-foreground">Client not found</div>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-4xl p-4 md:p-8">
      <Card>
        <CardHeader>
          <CardTitle>Edit KYC: {client.fullName}</CardTitle>
          <CardDescription>Update KYC information and review status.</CardDescription>
        </CardHeader>
        <CardContent>
          <KycForm mode="edit" initialData={client} />
        </CardContent>
      </Card>
    </main>
  )
}
