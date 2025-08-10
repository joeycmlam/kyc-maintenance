import { NextResponse } from "next/server"
import { deleteClient, getClient, updateClient } from "@/lib/kyc-store"

type Params = { params: { id: string } }

export async function GET(_req: Request, { params }: Params) {
  const client = getClient(params.id)
  if (!client) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json({ client })
}

export async function PUT(req: Request, { params }: Params) {
  try {
    const body = await req.json()
    const { ok } = updateClient(params.id, body)
    if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 })
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  const { ok } = deleteClient(params.id)
  if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json({ ok: true })
}
