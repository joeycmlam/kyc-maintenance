"use client"

import { useEffect, useMemo, useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Plus, Search, ShieldAlert, Trash2, UserRound } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import type { KycClient } from "@/lib/kyc-schema"

export default function HomePage() {
  const [clients, setClients] = useState<KycClient[]>([])
  const [query, setQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "approved" | "rejected" | "requires_update">(
    "all",
  )
  const [isPending, startTransition] = useTransition()
  const { toast } = useToast()
  const router = useRouter()

  async function fetchClients() {
    const res = await fetch("/api/kyc", { cache: "no-store" })
    if (res.ok) {
      const data = (await res.json()) as { clients: KycClient[] }
      setClients(data.clients)
    }
  }

  useEffect(() => {
    void fetchClients()
  }, [])

  const filtered = useMemo(() => {
    return clients
      .filter((c) => {
        if (statusFilter !== "all" && c.kycStatus !== statusFilter) return false
        const q = query.trim().toLowerCase()
        if (!q) return true
        return (
          c.fullName.toLowerCase().includes(q) ||
          c.id.toLowerCase().includes(q) ||
          (c.tin || "").toLowerCase().includes(q) ||
          (c.nationality || "").toLowerCase().includes(q) ||
          (c.residencyCountry || "").toLowerCase().includes(q)
        )
      })
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
  }, [clients, query, statusFilter])

  async function deleteClient(id: string) {
    const res = await fetch(`/api/kyc/${id}`, { method: "DELETE" })
    if (res.ok) {
      toast({ title: "Client deleted" })
      void fetchClients()
    } else {
      toast({ title: "Failed to delete client", variant: "destructive" })
    }
  }

  function exportJson() {
    const blob = new Blob([JSON.stringify(clients, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "kyc-clients.json"
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <main className="mx-auto max-w-6xl p-4 md:p-8">
      <header className="mb-6 flex flex-col gap-4 md:mb-8 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">KYC Client Maintenance</h1>
          <p className="text-sm text-muted-foreground">
            Manage client KYC profiles, PEP flags, FATCA, TIN, and red flags.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={exportJson}>
            Export JSON
          </Button>
          <Button asChild>
            <Link href="/kyc/new">
              <Plus className="mr-2 h-4 w-4" /> New Client
            </Link>
          </Button>
        </div>
      </header>

      <Card>
        <CardHeader className="gap-2">
          <CardTitle>Clients</CardTitle>
          <CardDescription>Search, filter, and maintain KYC records.</CardDescription>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="relative w-full md:max-w-sm">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, ID, TIN, nationality..."
                className="pl-8"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <Tabs
              value={statusFilter}
              onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}
              className="w-full md:w-auto"
            >
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="pending">Pending</TabsTrigger>
                <TabsTrigger value="approved">Approved</TabsTrigger>
                <TabsTrigger value="requires_update">Needs Update</TabsTrigger>
                <TabsTrigger value="rejected">Rejected</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
              <UserRound className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                No clients found. Try adjusting filters or create a new one.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="sticky top-0 bg-muted/40 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 font-medium">Client</th>
                    <th className="px-3 py-2 font-medium">PEP</th>
                    <th className="px-3 py-2 font-medium">FATCA</th>
                    <th className="px-3 py-2 font-medium">TIN</th>
                    <th className="px-3 py-2 font-medium">Red Flags</th>
                    <th className="px-3 py-2 font-medium">Risk</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                    <th className="px-3 py-2 font-medium sr-only">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filtered.map((c) => (
                    <tr key={c.id} className="hover:bg-muted/30">
                      <td className="px-3 py-3">
                        <div className="flex flex-col">
                          <Link href={`/kyc/${c.id}`} className="font-medium hover:underline">
                            {c.fullName}
                          </Link>
                          <span className="text-xs text-muted-foreground">
                            {c.nationality} • {c.residencyCountry}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            Updated: {new Date(c.updatedAt).toLocaleString()}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        {c.isPep ? <Badge variant="destructive">PEP</Badge> : <Badge variant="secondary">No</Badge>}
                      </td>
                      <td className="px-3 py-3">
                        <Badge variant="outline">{c.fatcaStatus}</Badge>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex flex-col">
                          <span className="text-sm">{c.tin || "-"}</span>
                          <span className="text-xs text-muted-foreground">{c.tinCountry || ""}</span>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex flex-wrap gap-1">
                          {c.redFlags.length === 0 ? (
                            <Badge variant="secondary">None</Badge>
                          ) : (
                            c.redFlags.slice(0, 3).map((rf) => (
                              <Badge key={rf} variant="secondary" className="max-w-[140px] truncate">
                                {rf}
                              </Badge>
                            ))
                          )}
                          {c.redFlags.length > 3 ? <Badge variant="outline">+{c.redFlags.length - 3}</Badge> : null}
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <ShieldAlert
                            className={cn(
                              "h-4 w-4",
                              c.riskLevel === "High"
                                ? "text-red-500"
                                : c.riskLevel === "Medium"
                                  ? "text-amber-500"
                                  : "text-green-600",
                            )}
                          />
                          <span>{c.riskLevel}</span>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <StatusBadge status={c.kycStatus} />
                        <div className="text-xs text-muted-foreground">
                          Next review: {c.nextReviewDueAt ? new Date(c.nextReviewDueAt).toLocaleDateString() : "-"}
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Button asChild size="sm" variant="outline">
                            <Link href={`/kyc/${c.id}`}>Edit</Link>
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="sm" variant="ghost" className="text-red-600 hover:text-red-700">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete client?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will permanently remove {c.fullName}&apos;s KYC record. This action cannot be
                                  undone in this demo.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => startTransition(() => deleteClient(c.id))}
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
      <p className="mt-6 text-xs text-muted-foreground">
        Note: This is a demo. For production, integrate sanctions/PEP screening providers, document collection, and
        persistent storage.
      </p>
    </main>
  )
}

function StatusBadge({ status }: { status: KycClient["kycStatus"] }) {
  if (status === "approved") return <Badge className="bg-green-600 hover:bg-green-600">Approved</Badge>
  if (status === "pending") return <Badge variant="outline">Pending</Badge>
  if (status === "requires_update") return <Badge variant="secondary">Needs Update</Badge>
  if (status === "rejected") return <Badge className="bg-red-600 hover:bg-red-600">Rejected</Badge>
  return <Badge variant="secondary">{status}</Badge>
}
