import { NextResponse } from "next/server"
import { createClient, listClients } from "@/lib/kyc-store"

export async function GET() {
  const clients = listClients()
  return NextResponse.json({ clients })
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { id } = createClient(body)
    return NextResponse.json({ id }, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 })
  }
}
