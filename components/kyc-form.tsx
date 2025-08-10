"use client"

import { useEffect, useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import type { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { AlertCircle, Check, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { riskFromFlags, computePepRiskScore, deriveFinalPep } from "@/lib/risk-utils"
import { KycSchema, type KycClient } from "@/lib/kyc-schema"
import { cn } from "@/lib/utils"

const countries = [
  "United States",
  "United Kingdom",
  "Canada",
  "Germany",
  "France",
  "Switzerland",
  "Singapore",
  "Hong Kong",
  "UAE",
  "India",
  "China",
  "Japan",
  "Australia",
  "Brazil",
  "Cayman Islands",
  "Bermuda",
  "Luxembourg",
  "Netherlands",
  "Spain",
  "Italy",
  "Mexico",
  "South Africa",
  "Saudi Arabia",
  "Qatar",
  "Russia",
  "Venezuela",
  "Nigeria",
  "Iran",
  "Syria",
  "Myanmar",
  "North Korea",
]

const redFlagOptions = [
  "Adverse media",
  "High-risk jurisdiction",
  "Unusual transaction patterns",
  "Shell company risk",
  "Cash intensive business",
  "Complex ownership structure",
  "Negative reputation",
  "Sanctions proximity",
  "Negative KYC history",
  "Other risk indicator",
]

type FormValues = z.infer<typeof KycSchema>

export function KycForm({ mode, initialData }: { mode: "create" | "edit"; initialData?: KycClient }) {
  const { toast } = useToast()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [pepFactors, setPepFactors] = useState<string[]>([])

  const form = useForm<FormValues>({
    resolver: zodResolver(KycSchema),
    defaultValues: initialData ?? {
      id: "",
      fullName: "",
      dateOfBirth: "",
      placeOfBirth: "",
      nationality: "",
      residencyCountry: "",
      isPep: false,
      pepOriginal: false,
      pepOverride: "none",
      pepRiskScore: 0,
      pepRole: "",
      pepCountry: "",
      tin: "",
      tinCountry: "",
      fatcaStatus: "Non-US person",
      giin: "",
      hasUsIndicia: false,
      redFlags: [],
      redFlagsNotes: "",
      sanctionsStatus: "none",
      kycStatus: "pending",
      lastReviewedAt: "",
      nextReviewDueAt: "",
      createdAt: "",
      updatedAt: "",
    },
  })

  const values = form.watch()
  const computedRisk = useMemo(() => {
    return riskFromFlags({
      isPep: values.isPep,
      fatcaStatus: values.fatcaStatus,
      hasUsIndicia: values.hasUsIndicia,
      redFlagCount: values.redFlags?.length ?? 0,
      sanctionsStatus: values.sanctionsStatus,
      tinPresent: !!values.tin,
    })
  }, [values])

  // When override changes, recompute final PEP immediately from the latest known original
  useEffect(() => {
    const finalPep = deriveFinalPep(form.getValues("pepOriginal"), form.getValues("pepOverride"))
    if (finalPep !== form.getValues("isPep")) {
      form.setValue("isPep", finalPep, { shouldValidate: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.getValues("pepOverride")])

  async function onSubmit(data: FormValues) {
    startTransition(async () => {
      const payload = { ...data }
      let res: Response
      if (mode === "create") {
        res = await fetch("/api/kyc", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
      } else {
        res = await fetch(`/api/kyc/${initialData?.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
      }
      if (!res.ok) {
        toast({ title: "Save failed", description: "Please check the form and try again.", variant: "destructive" })
        return
      }
      const json = (await res.json()) as any
      const id = mode === "create" ? json.id : initialData?.id
      toast({ title: "KYC saved", description: "Changes have been stored." })
      router.push(`/kyc/${id}`)
    })
  }

  function handleCalculatePep() {
    const { score, originalPep, factors } = computePepRiskScore({
      placeOfBirth: form.getValues("placeOfBirth"),
      residencyCountry: form.getValues("residencyCountry"),
    })
    setPepFactors(factors)
    form.setValue("pepRiskScore", score, { shouldValidate: true })
    form.setValue("pepOriginal", originalPep, { shouldValidate: true })
    const finalPep = deriveFinalPep(originalPep, form.getValues("pepOverride"))
    form.setValue("isPep", finalPep, { shouldValidate: true })

    toast({
      title: "PEP risk calculated",
      description: `Score: ${score} • Original PEP: ${originalPep ? "Yes" : "No"} • Final PEP: ${
        finalPep ? "Yes" : "No"
      }`,
    })
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6" noValidate aria-label="KYC form">
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">Identity</h2>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="gap-1">
              Risk:{" "}
              <span
                className={cn(
                  computedRisk.level === "High"
                    ? "text-red-600"
                    : computedRisk.level === "Medium"
                      ? "text-amber-600"
                      : "text-green-600",
                  "font-medium",
                )}
              >
                {computedRisk.level}
              </span>
            </Badge>
            <Badge variant="outline">Score: {computedRisk.score}</Badge>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="fullName">Full name</Label>
            <Input id="fullName" placeholder="First Middle Last" {...form.register("fullName")} />
            <FormError name="fullName" message={form.formState.errors.fullName?.message} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dateOfBirth">Date of birth</Label>
            <Input id="dateOfBirth" type="date" {...form.register("dateOfBirth")} />
            <FormError name="dateOfBirth" message={form.formState.errors.dateOfBirth?.message} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="placeOfBirth">Place of birth</Label>
            <Select
              value={form.getValues("placeOfBirth")}
              onValueChange={(v) => form.setValue("placeOfBirth", v, { shouldValidate: true })}
            >
              <SelectTrigger id="placeOfBirth">
                <SelectValue placeholder="Select place of birth" />
              </SelectTrigger>
              <SelectContent>
                {countries.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormError name="placeOfBirth" message={form.formState.errors.placeOfBirth as any} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="nationality">Nationality</Label>
            <Select
              value={form.getValues("nationality")}
              onValueChange={(v) => form.setValue("nationality", v, { shouldValidate: true })}
            >
              <SelectTrigger id="nationality">
                <SelectValue placeholder="Select nationality" />
              </SelectTrigger>
              <SelectContent>
                {countries.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormError name="nationality" message={form.formState.errors.nationality?.message} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="residencyCountry">Residency country</Label>
            <Select
              value={form.getValues("residencyCountry")}
              onValueChange={(v) => form.setValue("residencyCountry", v, { shouldValidate: true })}
            >
              <SelectTrigger id="residencyCountry">
                <SelectValue placeholder="Select residency" />
              </SelectTrigger>
              <SelectContent>
                {countries.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormError name="residencyCountry" message={form.formState.errors.residencyCountry?.message} />
          </div>
        </div>
      </section>

      <Separator />

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">PEP Screening</h2>
          <div className="flex items-center gap-2">
            <Badge variant="outline">PEP risk score: {values.pepRiskScore ?? 0}</Badge>
            <Badge variant={values.pepOriginal ? "destructive" : "secondary"}>
              Original PEP: {values.pepOriginal ? "Yes" : "No"}
            </Badge>
            <Badge className={values.isPep ? "bg-red-600 hover:bg-red-600" : ""}>
              Final PEP: {values.isPep ? "Yes" : "No"}
            </Badge>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="space-y-1">
              <Label htmlFor="isPep">Final PEP decision</Label>
              <p className="text-xs text-muted-foreground">
                Calculated from the original PEP assessment with optional ops override.
              </p>
            </div>
            <Switch id="isPep" checked={form.getValues("isPep")} onCheckedChange={(v) => form.setValue("isPep", v)} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="pepOverride">Ops override</Label>
            <Select
              value={form.getValues("pepOverride")}
              onValueChange={(v) => form.setValue("pepOverride", v as FormValues["pepOverride"])}
            >
              <SelectTrigger id="pepOverride">
                <SelectValue placeholder="Select override" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None (use original)</SelectItem>
                <SelectItem value="force_pep">Force PEP</SelectItem>
                <SelectItem value="force_not_pep">Force Not PEP</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Override is applied after calculating the original PEP from birth/residency.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="pepCountry">PEP country (if applicable)</Label>
            <Input id="pepCountry" placeholder="Country of public function" {...form.register("pepCountry")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pepRole">PEP role/title</Label>
            <Input id="pepRole" placeholder="e.g., Minister of Finance" {...form.register("pepRole")} />
          </div>
        </div>

        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <p className="text-xs text-muted-foreground">
            Original PEP is derived from place of birth and residency. Update those fields, then press Calculate.
          </p>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" onClick={handleCalculatePep}>
              Calculate PEP risk
            </Button>
          </div>
        </div>

        {pepFactors.length > 0 && (
          <div className="rounded-md border p-3">
            <p className="mb-1 text-sm font-medium">PEP risk factors</p>
            <ul className="list-inside list-disc text-sm text-muted-foreground">
              {pepFactors.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <Separator />

      <section className="space-y-4">
        <h2 className="text-lg font-medium">Tax and FATCA</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="fatcaStatus">FATCA status</Label>
            <Select
              value={form.getValues("fatcaStatus")}
              onValueChange={(v) =>
                form.setValue("fatcaStatus", v as FormValues["fatcaStatus"], { shouldValidate: true })
              }
            >
              <SelectTrigger id="fatcaStatus">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="US Person">US Person</SelectItem>
                <SelectItem value="Non-US person">Non-US person</SelectItem>
                <SelectItem value="Exempt">Exempt</SelectItem>
                <SelectItem value="Recalcitrant">Recalcitrant</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="space-y-1">
              <Label htmlFor="hasUsIndicia">US indicia present</Label>
              <p className="text-xs text-muted-foreground">
                e.g., US place of birth, address, phone, or standing instructions.
              </p>
            </div>
            <Switch
              id="hasUsIndicia"
              checked={form.getValues("hasUsIndicia")}
              onCheckedChange={(v) => form.setValue("hasUsIndicia", v)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tin">Tax Identification Number (TIN)</Label>
            <Input id="tin" placeholder="e.g., SSN/ITIN or local TIN" {...form.register("tin")} />
            <FormError name="tin" message={form.formState.errors.tin?.message} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tinCountry">TIN country</Label>
            <Select value={form.getValues("tinCountry")} onValueChange={(v) => form.setValue("tinCountry", v)}>
              <SelectTrigger id="tinCountry">
                <SelectValue placeholder="Jurisdiction issuing TIN" />
              </SelectTrigger>
              <SelectContent>
                {countries.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormError name="tinCountry" message={form.formState.errors.tinCountry?.message} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="giin">GIIN (if applicable)</Label>
            <Input id="giin" placeholder="For financial institutions" {...form.register("giin")} />
          </div>
        </div>
      </section>

      <Separator />

      <section className="space-y-4">
        <h2 className="text-lg font-medium">Sanctions and Red Flags</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="sanctionsStatus">Sanctions screening</Label>
            <Select
              value={form.getValues("sanctionsStatus")}
              onValueChange={(v) => form.setValue("sanctionsStatus", v as FormValues["sanctionsStatus"])}
            >
              <SelectTrigger id="sanctionsStatus">
                <SelectValue placeholder="Screening result" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="cleared">Cleared</SelectItem>
                <SelectItem value="match_pending">Potential match (pending)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Common red flags</Label>
            <div className="grid grid-cols-1 gap-2">
              {redFlagOptions.map((rf) => {
                const checked = form.getValues("redFlags")?.includes(rf) ?? false
                return (
                  <label
                    key={rf}
                    className="flex cursor-pointer items-center justify-between rounded-md border p-2 text-sm"
                  >
                    <span className="pr-2">{rf}</span>
                    <input
                      type="checkbox"
                      className="h-4 w-4"
                      checked={checked}
                      onChange={(e) => {
                        const current = new Set(form.getValues("redFlags") ?? [])
                        if (e.target.checked) current.add(rf)
                        else current.delete(rf)
                        form.setValue("redFlags", Array.from(current), { shouldValidate: true })
                      }}
                    />
                  </label>
                )
              })}
            </div>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="redFlagsNotes">Notes</Label>
          <Textarea
            id="redFlagsNotes"
            placeholder="Describe red flags, mitigations, and EDD (if any)."
            {...form.register("redFlagsNotes")}
          />
        </div>
      </section>

      <Separator />

      <section className="space-y-4">
        <h2 className="text-lg font-medium">Review and Status</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="kycStatus">KYC status</Label>
            <Select
              value={form.getValues("kycStatus")}
              onValueChange={(v) => form.setValue("kycStatus", v as FormValues["kycStatus"])}
            >
              <SelectTrigger id="kycStatus">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="requires_update">Requires Update</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastReviewedAt">Last reviewed</Label>
            <Input id="lastReviewedAt" type="date" {...form.register("lastReviewedAt")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="nextReviewDueAt">Next review due</Label>
            <Input id="nextReviewDueAt" type="date" {...form.register("nextReviewDueAt")} />
          </div>
        </div>
        {computedRisk.level === "High" && (
          <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            <AlertCircle className="mt-0.5 h-4 w-4" />
            <p>
              High risk detected. Consider Enhanced Due Diligence (EDD) and senior management approval before onboarding
              or continuing the relationship.
            </p>
          </div>
        )}
      </section>

      <div className="flex items-center justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => history.back()}>
          Cancel
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
          Save KYC
        </Button>
      </div>
    </form>
  )
}

function FormError({ name, message }: { name: string; message?: string }) {
  if (!message) return null
  return (
    <p id={`${name}-error`} className="text-xs text-red-600">
      {message}
    </p>
  )
}
