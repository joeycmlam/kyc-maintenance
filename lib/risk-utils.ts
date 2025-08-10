export function riskFromFlags(args: {
  isPep: boolean
  fatcaStatus: "US Person" | "Non-US person" | "Exempt" | "Recalcitrant"
  hasUsIndicia: boolean
  redFlagCount: number
  sanctionsStatus: "none" | "cleared" | "match_pending"
  tinPresent: boolean
}): { score: number; level: "Low" | "Medium" | "High" } {
  let score = 0
  if (args.isPep) score += 40
  if (args.fatcaStatus === "Recalcitrant") score += 25
  if (args.fatcaStatus === "US Person" && args.hasUsIndicia) score += 10
  if (args.redFlagCount >= 3) score += 30
  else if (args.redFlagCount === 2) score += 20
  else if (args.redFlagCount === 1) score += 10
  if (args.sanctionsStatus === "match_pending") score += 50
  if (!args.tinPresent) score += 10

  let level: "Low" | "Medium" | "High" = "Low"
  if (score >= 60) level = "High"
  else if (score >= 25) level = "Medium"
  return { score, level }
}

/**
 * Demo-only sample list to illustrate how a firm might flag jurisdictions that
 * require heightened PEP scrutiny. Replace with your firm's policy/FATF lists.
 */
export const PEP_EXPOSURE_COUNTRIES: string[] = [
  "Russia",
  "Venezuela",
  "Nigeria",
  "Saudi Arabia",
  "Qatar",
  "China",
  "Iran",
  "North Korea",
  "Syria",
  "Myanmar",
]

/**
 * Compute a simple PEP risk score from place of birth and residency.
 * - Residency in a PEP-exposure list: +20
 * - Birth in a PEP-exposure list: +15
 * - Cross-border scenario (birth != residency and both provided): +5
 * Threshold: score >= 25 => originalPep = true
 */
export function computePepRiskScore(args: {
  placeOfBirth?: string
  residencyCountry?: string
}): { score: number; originalPep: boolean; factors: string[] } {
  const pob = (args.placeOfBirth || "").trim()
  const res = (args.residencyCountry || "").trim()
  let score = 0
  const factors: string[] = []

  if (pob && PEP_EXPOSURE_COUNTRIES.includes(pob)) {
    score += 15
    factors.push(`Place of birth in exposure list (+15)`)
  }
  if (res && PEP_EXPOSURE_COUNTRIES.includes(res)) {
    score += 20
    factors.push(`Residency in exposure list (+20)`)
  }
  if (pob && res && pob !== res) {
    score += 5
    factors.push(`Cross-border birth/residency (+5)`)
  }

  const originalPep = score >= 25
  return { score, originalPep, factors }
}

/**
 * Apply override to original PEP to get final decision.
 */
export function deriveFinalPep(originalPep: boolean, override: "none" | "force_pep" | "force_not_pep"): boolean {
  if (override === "force_pep") return true
  if (override === "force_not_pep") return false
  return originalPep
}
