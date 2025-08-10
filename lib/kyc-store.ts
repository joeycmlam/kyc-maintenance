import { KycSchema, type KycClient } from "./kyc-schema"
import { riskFromFlags } from "./risk-utils"

type StoreState = {
  clients: Map<string, KycClient>
  seeded: boolean
}

const state: StoreState = {
  clients: new Map<string, KycClient>(),
  seeded: false,
}

function seed() {
  if (state.seeded) return
  const now = new Date()
  const base = [
    {
      fullName: "Alice Johnson",
      dateOfBirth: "1985-04-12",
      placeOfBirth: "United States",
      nationality: "United States",
      residencyCountry: "United Kingdom",
      isPep: false,
      pepOriginal: false,
      pepOverride: "none" as const,
      pepRiskScore: 0,
      pepRole: "",
      pepCountry: "",
      tin: "123-45-6789",
      tinCountry: "United States",
      fatcaStatus: "US Person" as const,
      giin: "",
      hasUsIndicia: true,
      redFlags: ["Complex ownership structure"],
      redFlagsNotes: "",
      sanctionsStatus: "cleared" as const,
      kycStatus: "approved" as const,
      lastReviewedAt: "2025-06-15",
      nextReviewDueAt: "2026-06-15",
    },
    {
      fullName: "Mohammed Al Rahman",
      dateOfBirth: "1979-11-03",
      placeOfBirth: "Qatar",
      nationality: "Qatar",
      residencyCountry: "Qatar",
      isPep: true,
      pepOriginal: true,
      pepOverride: "none" as const,
      pepRiskScore: 35,
      pepRole: "Senior government advisor",
      pepCountry: "Qatar",
      tin: "QA-778899",
      tinCountry: "Qatar",
      fatcaStatus: "Non-US person" as const,
      giin: "",
      hasUsIndicia: false,
      redFlags: ["Adverse media", "High-risk jurisdiction"],
      redFlagsNotes: "Negative media needs review and independent verification.",
      sanctionsStatus: "none" as const,
      kycStatus: "pending" as const,
      lastReviewedAt: "2025-07-01",
      nextReviewDueAt: "2025-12-01",
    },
    {
      fullName: "Chen Wei",
      dateOfBirth: "1990-02-28",
      placeOfBirth: "Singapore",
      nationality: "Singapore",
      residencyCountry: "Singapore",
      isPep: false,
      pepOriginal: false,
      pepOverride: "none" as const,
      pepRiskScore: 0,
      pepRole: "",
      pepCountry: "",
      tin: "SG-TIN-5566",
      tinCountry: "Singapore",
      fatcaStatus: "Exempt" as const,
      giin: "A1B2C3.00000.LE.702",
      hasUsIndicia: false,
      redFlags: [],
      redFlagsNotes: "",
      sanctionsStatus: "cleared" as const,
      kycStatus: "approved" as const,
      lastReviewedAt: "2025-04-10",
      nextReviewDueAt: "2026-04-10",
    },
  ]
  for (const b of base) {
    const id = crypto.randomUUID()
    const times = { createdAt: now.toISOString(), updatedAt: now.toISOString() }
    const parsed = KycSchema.parse({ ...b, ...times, id })
    const risk = riskFromFlags({
      isPep: parsed.isPep,
      fatcaStatus: parsed.fatcaStatus,
      hasUsIndicia: parsed.hasUsIndicia,
      redFlagCount: parsed.redFlags.length,
      sanctionsStatus: parsed.sanctionsStatus,
      tinPresent: !!parsed.tin,
    })
    state.clients.set(id, { ...parsed, id, riskLevel: risk.level })
  }
  state.seeded = true
}

export function listClients(): KycClient[] {
  seed()
  return Array.from(state.clients.values())
}

export function getClient(id: string): KycClient | undefined {
  seed()
  return state.clients.get(id)
}

export function createClient(input: unknown): { id: string } {
  seed()
  const now = new Date()
  const id = crypto.randomUUID()
  const parsed = KycSchema.parse({ ...(input as any), id, createdAt: now.toISOString(), updatedAt: now.toISOString() })
  const risk = riskFromFlags({
    isPep: parsed.isPep,
    fatcaStatus: parsed.fatcaStatus,
    hasUsIndicia: parsed.hasUsIndicia,
    redFlagCount: parsed.redFlags.length,
    sanctionsStatus: parsed.sanctionsStatus,
    tinPresent: !!parsed.tin,
  })
  const client: KycClient = { ...parsed, id, riskLevel: risk.level }
  state.clients.set(id, client)
  return { id }
}

export function updateClient(id: string, input: unknown): { ok: boolean } {
  seed()
  const existing = state.clients.get(id)
  if (!existing) return { ok: false }
  const now = new Date()
  const parsed = KycSchema.parse({ ...existing, ...(input as any), id, updatedAt: now.toISOString() })
  const risk = riskFromFlags({
    isPep: parsed.isPep,
    fatcaStatus: parsed.fatcaStatus,
    hasUsIndicia: parsed.hasUsIndicia,
    redFlagCount: parsed.redFlags.length,
    sanctionsStatus: parsed.sanctionsStatus,
    tinPresent: !!parsed.tin,
  })
  const client: KycClient = { ...parsed, id, riskLevel: risk.level }
  state.clients.set(id, client)
  return { ok: true }
}

export function deleteClient(id: string): { ok: boolean } {
  seed()
  const ok = state.clients.delete(id)
  return { ok }
}
