import { z } from "zod"

export const KycSchema = z.object({
  id: z.string().optional(),
  fullName: z.string().min(2, "Full name is required"),
  dateOfBirth: z.string().min(4, "Date of birth is required"),
  placeOfBirth: z.string().optional().default(""),
  nationality: z.string().min(2, "Nationality is required"),
  residencyCountry: z.string().min(2, "Residency is required"),

  // PEP fields
  isPep: z.boolean().default(false), // final PEP decision saved on record
  pepOriginal: z.boolean().default(false), // computed from birth/residency via button
  pepOverride: z.enum(["none", "force_pep", "force_not_pep"]).default("none"),
  pepRiskScore: z.number().nonnegative().max(100).default(0),
  pepRole: z.string().optional().default(""),
  pepCountry: z.string().optional().default(""),

  // Tax/FATCA
  tin: z
    .string()
    .optional()
    .refine((v) => v === undefined || v === "" || /^[A-Za-z0-9\- ]{5,30}$/.test(v), "Invalid TIN format"),
  tinCountry: z.string().optional().default(""),
  fatcaStatus: z.enum(["US Person", "Non-US person", "Exempt", "Recalcitrant"]).default("Non-US person"),
  giin: z.string().optional().default(""),
  hasUsIndicia: z.boolean().default(false),

  // Risk flags
  redFlags: z.array(z.string()).default([]),
  redFlagsNotes: z.string().optional().default(""),
  sanctionsStatus: z.enum(["none", "cleared", "match_pending"]).default("none"),

  // Status
  kycStatus: z.enum(["pending", "approved", "requires_update", "rejected"]).default("pending"),
  lastReviewedAt: z.string().optional().default(""),
  nextReviewDueAt: z.string().optional().default(""),

  // audit
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
})

export type KycClient = z.infer<typeof KycSchema> & {
  id: string
  riskLevel: "Low" | "Medium" | "High"
}
