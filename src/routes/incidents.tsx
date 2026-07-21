import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { requireAuth } from "@/lib/auth";
import { AppLayout, PageHeader, SeverityBadge, StatusPill } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAlertesDashboard, useAssignAlert, useCloseAlert } from "@/lib/queries/alertes";
import {
  CheckCircle2,
  MessageSquare,
  PaperclipIcon,
  UserPlus,
  FileDown,
  Users2,
} from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type AlertDashboard = Database["public"]["Views"]["v_alertes_dashboard"]["Row"];

export const Route = createFileRoute("/incidents")({
  beforeLoad: ({ location }) => requireAuth(location),
  head: () => ({
    meta: [
      { title: "Gestion des incidents — ASIMBA" },
      { name: "description", content: "Suivi des incidents, assignation, historique et clôture." },
    ],
  }),
  component: IncidentsPage,
});

function IncidentsPage() {
  const { data: alerts, isLoading } = useAlertesDashboard();
  const { mutate: assign } = useAssignAlert();
  const { mutate: close } = useCloseAlert();
  const navigate = useNavigate();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [commentsMap, setCommentsMap] = useState<Record<string, Array<{ text: string; date: string; author: string }>>>({});
  const [newCommentText, setNewCommentText] = useState("");

  const listItems = useMemo(
    () =>
      (alerts ?? [])
        .filter((a: AlertDashboard) => a.statut !== "resolu" && a.statut !== "clos")
        .slice(0, 8),
    [alerts],
  );
  const selectedAlert = useMemo(
    () => listItems.find((a: AlertDashboard) => a.id === selectedId) ?? listItems[0],
    [listItems, selectedId],
  );

  if (isLoading)
    return (
      <AppLayout title="Gestion des incidents" subtitle="Cases actifs et historique">
        <div className="text-center text-muted-foreground py-8">Chargement...</div>
      </AppLayout>
    );

  const handleAssignAll = () => {
    const unassigned = listItems.filter(a => !a.analyste);
    if (unassigned.length === 0) {
      toast.info("Tous les incidents de la liste sont déjà assignés.");
      return;
    }
    unassigned.forEach(a => {
      if (a.id) assign(a.id);
    });
    toast.success(`${unassigned.length} incidents assignés en masse.`);
  };

  const handleExportPDF = () => {
    if (!selectedAlert) {
      toast.error("Aucun incident sélectionné.");
      return;
    }
    const reportContent = `
==================================================
RAPPORT D'INCIDENT - ASIMBA RISK INTELLIGENCE
==================================================
Référence : #${selectedAlert.reference ?? selectedAlert.id}
Titre     : ${selectedAlert.titre}
Niveau    : ${selectedAlert.severite?.toUpperCase() ?? "INCONNU"}
Statut    : ${selectedAlert.statut?.toUpperCase() ?? "INACTIF"}
Détecté le: ${selectedAlert.detecte ? new Date(selectedAlert.detecte).toLocaleDateString("fr-FR") : "—"}
Région    : ${selectedAlert.region ?? "—"}
Ville     : ${selectedAlert.ville ?? "—"}
Mots-clés : ${Array.isArray(selectedAlert.mots_cles) ? selectedAlert.mots_cles.join(", ") : "—"}
--------------------------------------------------
RÉSUMÉ :
${selectedAlert.resume ?? "Aucun résumé disponible."}
--------------------------------------------------
RECOMMANDATION :
${selectedAlert.recommandation ?? "Aucune recommandation formulée."}
==================================================
    `.trim();

    const blob = new Blob([reportContent], { type: "text/plain;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", `incident-${selectedAlert.reference ?? "report"}.txt`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Rapport d'incident exporté en format TXT (Simulé PDF).");
  };

  const handlePublishComment = () => {
    if (!newCommentText.trim()) return;
    if (!selectedAlert?.id) return;
    
    const newComment = {
      text: newCommentText.trim(),
      date: new Date().toLocaleTimeString("fr-FR", { hour: '2-digit', minute: '2-digit' }),
      author: "Patrick (Moi)"
    };

    setCommentsMap(prev => ({
      ...prev,
      [selectedAlert.id!]: [...(prev[selectedAlert.id!] ?? []), newComment]
    }));
    setNewCommentText("");
    toast.success("Commentaire publié !");
  };

  return (
    <AppLayout title="Gestion des incidents" subtitle="Cases actifs et historique">
      <div className="mx-auto max-w-[1600px] px-4 py-6 lg:px-8 space-y-6">
        <PageHeader
          eyebrow="Case management"
          title="Incidents en traitement"
          description="Coordonnez les équipes d'analystes et suivez chaque incident jusqu'à sa clôture."
          actions={
            <>
              <Button variant="outline" size="sm" className="h-9 gap-1.5" onClick={handleAssignAll}>
                <Users2 className="h-3.5 w-3.5" /> Assigner en masse
              </Button>
              <Button size="sm" className="h-9 gap-1.5" onClick={handleExportPDF}>
                <FileDown className="h-3.5 w-3.5" /> Export PDF
              </Button>
            </>
          }
        />

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[360px_1fr]">
          <Card className="shadow-elev-1">
            <div className="border-b border-border p-3">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Incidents ({listItems.length})
              </div>
            </div>
            <div className="divide-y divide-border">
              {listItems.map((a: AlertDashboard) => (
                <button
                  key={a.id}
                  onClick={() => {
                    setSelectedId(a.id);
                    navigate({ to: `/incidents/${a.id}` });
                  }}
                  className={`w-full text-left px-4 py-3 hover:bg-muted/40 transition-colors ${selectedId === a.id || (selectedId === null && a === listItems[0]) ? "bg-primary/5" : ""}`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-[11px] text-muted-foreground">
                      #{a.reference?.slice(-6) || a.id?.slice(-6)}
                    </span>
                    {a.severite && <SeverityBadge level={a.severite} />}
                  </div>
                  <div className="text-[12.5px] font-medium text-foreground truncate">
                    {a.titre}
                  </div>
                  <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>{a.ville || "—"}</span>
                    <span>{a.analyste ? a.analyste : "Non assigné"}</span>
                  </div>
                </button>
              ))}
            </div>
          </Card>

          {selectedAlert && (
            <Card className="shadow-elev-1">
              <div className="border-b border-border p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="font-mono text-[11.5px] text-muted-foreground">
                        #{selectedAlert.reference?.slice(-6) || selectedAlert.id?.slice(-6)}
                      </span>
                      {selectedAlert.severite && (
                        <SeverityBadge level={selectedAlert.severite} />
                      )}
                      {selectedAlert.statut && <StatusPill status={selectedAlert.statut} />}
                    </div>
                    <h2 className="text-[17px] font-semibold text-foreground">
                      {selectedAlert.titre}
                    </h2>
                    <p className="mt-1 text-[12.5px] text-muted-foreground">
                      Détecté le{" "}
                      {new Date(selectedAlert.detecte || "").toLocaleDateString("fr-FR")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9 gap-1.5"
                      onClick={() => selectedAlert.id && assign(selectedAlert.id)}
                    >
                      <UserPlus className="h-3.5 w-3.5" /> Assigner
                    </Button>
                    <Button
                      size="sm"
                      className="h-9 gap-1.5"
                      onClick={() => selectedAlert.id && close(selectedAlert.id)}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" /> Clôturer
                    </Button>
                  </div>
                </div>
              </div>

              <Tabs defaultValue="analyse" className="p-5">
                <TabsList className="mb-4">
                  <TabsTrigger value="analyse">Analyse</TabsTrigger>
                  <TabsTrigger value="comments">Commentaires</TabsTrigger>
                  <TabsTrigger value="attach">Pièces jointes</TabsTrigger>
                </TabsList>

                <TabsContent value="analyse" className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {selectedAlert.confiance && (
                      <Meta label="Confiance IA" value={`${Math.round(selectedAlert.confiance)}%`} />
                    )}
                    {selectedAlert.langue && (
                      <Meta label="Langue" value={selectedAlert.langue} />
                    )}
                  </div>
                  {selectedAlert.resume && (
                    <div>
                      <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">
                        Résumé
                      </div>
                      <p className="text-[13px] leading-relaxed text-foreground">
                        {selectedAlert.resume}
                      </p>
                    </div>
                  )}
                  {selectedAlert.mots_cles &&
                    Array.isArray(selectedAlert.mots_cles) &&
                    selectedAlert.mots_cles.length > 0 && (
                      <div>
                        <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">
                          Mots-clés
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {selectedAlert.mots_cles.map((m) => (
                            <Badge
                              key={m}
                              variant="secondary"
                              className="rounded-md text-[11px]"
                            >
                              {m}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  {selectedAlert.recommandation && (
                    <div className="rounded-md border-l-2 border-warning bg-warning/5 p-3 text-[12.5px]">
                      <div className="font-semibold text-[11px] uppercase tracking-wider text-[color:oklch(0.45_0.15_60)] mb-1">
                        Recommandation
                      </div>
                      {selectedAlert.recommandation}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="comments" className="space-y-4">
                  {(!selectedAlert?.id || !commentsMap[selectedAlert.id] || commentsMap[selectedAlert.id].length === 0) ? (
                    <div className="text-center text-muted-foreground py-4 text-[12.5px]">
                      Aucun commentaire. Soyez le premier à commenter.
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
                      {commentsMap[selectedAlert.id].map((c, i) => (
                        <div key={i} className="rounded-md border border-border p-2.5 text-[12px] bg-muted/20">
                          <div className="flex items-center justify-between text-muted-foreground font-medium mb-1">
                            <span>{c.author}</span>
                            <span>{c.date}</span>
                          </div>
                          <p className="text-foreground">{c.text}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <input
                      placeholder="Ajouter un commentaire…"
                      className="flex-1 h-10 rounded-md border border-input bg-background px-3 text-[12.5px]"
                      value={newCommentText}
                      onChange={(e) => setNewCommentText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handlePublishComment();
                      }}
                    />
                    <Button size="sm" className="h-10 gap-1.5" onClick={handlePublishComment} disabled={!newCommentText.trim()}>
                      <MessageSquare className="h-3.5 w-3.5" /> Publier
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="attach">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {["capture_1.png", "capture_2.png", "rapport.pdf", "transcription.txt"].map(
                      (f) => (
                        <div
                          key={f}
                          className="rounded-md border border-border p-3 flex items-center gap-2 text-[12px]"
                        >
                          <PaperclipIcon className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="truncate">{f}</span>
                        </div>
                      ),
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </Card>
          )}
        </div>
      </div>
    </AppLayout>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border p-3">
      <div className="text-[10.5px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 text-[15px] font-semibold tabular-nums">{value}</div>
    </div>
  );
}

function CardHeaderBar({ children }: { children: React.ReactNode }) {
  return <div className="border-b border-border px-5 py-3">{children}</div>;
}
