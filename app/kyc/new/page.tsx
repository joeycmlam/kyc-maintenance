"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { KycForm } from "@/components/kyc-form"

export default function NewKycPage() {
  return (
    <main className="mx-auto max-w-4xl p-4 md:p-8">
      <Card>
        <CardHeader>
          <CardTitle>New KYC Client</CardTitle>
          <CardDescription>Create a client profile and capture KYC details.</CardDescription>
        </CardHeader>
        <CardContent>
          <KycForm mode="create" />
        </CardContent>
      </Card>
    </main>
  )
}
