import { createFileRoute } from "@tanstack/react-router";
import { requireAuth } from "@/lib/auth";
import { AppLayout, PageHeader } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users2, Plus } from "lucide-react";
import { useInstitutions } from "@/lib/queries/staff";
import type { Database } from "@/integrations/supabase/types";
import { useState } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Institution = Database["public"]["Tables"]["institutions"]["Row"];

export const Route = createFileRoute("/institutions")({
  beforeLoad: ({ location }) => requireAuth(location),
  head: () => ({
    meta: [
      { title: "Institutions partenaires — ASIMBA" },
      { name: "description", content: "Institutions publiques et privées partenaires d'ASIMBA." },
    ],
  }),
  component: InstitutionsPage,
});

const roleLabels: Record<Institution["role"], string> = {
  partenaire: "Partenaire",
  regulateur: "Régulateur",
  media: "Média",
  gouvernemental: "Gouvernemental",
  ong: "ONG",
};

function InstitutionsPage() {
  const { data: institutions, isLoading } = useInstitutions();

  const [showAddInstDialog, setShowAddInstDialog] = useState(false);
  const [newInstNom, setNewInstNom] = useState("");
  const [newInstSigle, setNewInstSigle] = useState("");
  const [newInstRole, setNewInstRole] = useState<string>("partenaire");

  const handleAddInstitution = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInstNom.trim() || !newInstSigle.trim()) {
      toast.error("Veuillez remplir le nom et le sigle.");
      return;
    }
    toast.success("Institution créée !", {
      description: `L'institution "${newInstSigle} - ${newInstNom}" a été ajoutée au réseau.`
    });
    setNewInstNom("");
    setNewInstSigle("");
    setNewInstRole("partenaire");
    setShowAddInstDialog(false);
  };

  const institutionCount = institutions?.length || 0;

  return (
    <AppLayout
      title="Institutions"
      subtitle={`${institutionCount} partenaire${institutionCount !== 1 ? "s" : ""}`}
    >
      <div className="mx-auto max-w-[1400px] px-4 py-6 lg:px-8 space-y-6">
        <PageHeader
          eyebrow="Écosystème partenaires"
          title="Institutions connectées"
          description="Ministères, agences, ONG et universités raccordés à la plateforme."
          actions={
            <Button className="h-9 gap-1.5" onClick={() => setShowAddInstDialog(true)}>
              <Plus className="h-3.5 w-3.5" /> Nouvelle institution
            </Button>
          }
        />
        {isLoading ? (
          <div className="text-center text-muted-foreground py-8">Chargement...</div>
        ) : !institutions || institutions.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">Aucune institution</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {institutions.map((inst: Institution) => (
              <Card key={inst.id} className="shadow-elev-1 hover:shadow-elev-2 transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary font-semibold text-[13px]">
                      {inst.sigle.slice(0, 3)}
                    </div>
                    <Badge
                      variant="outline"
                      className={
                        inst.statut === "actif"
                          ? "text-success border-success/30 bg-success/5"
                          : "text-muted-foreground"
                      }
                    >
                      {inst.statut === "actif" ? "Actif" : "Suspendu"}
                    </Badge>
                  </div>
                  <div className="mt-3">
                    <div className="text-[13.5px] font-semibold leading-tight">{inst.nom}</div>
                    <div className="mt-0.5 text-[11.5px] font-mono text-muted-foreground">
                      {inst.sigle}
                    </div>
                  </div>
                  <div className="mt-2 text-[12px] text-muted-foreground">
                    {roleLabels[inst.role]}
                  </div>
                  {inst.description && (
                    <div className="mt-2 text-[11.5px] text-muted-foreground">
                      {inst.description}
                    </div>
                  )}
                  <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
                    <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
                      <Users2 className="h-3.5 w-3.5" /> Affiliés
                    </div>
                    <button
                      onClick={() => toast.info(`Gestion des affiliés de l'institution ${inst.sigle}`)}
                      className="text-[12px] font-medium text-primary hover:underline"
                    >
                      Gérer
                    </button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={showAddInstDialog} onOpenChange={setShowAddInstDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nouvelle institution</DialogTitle>
            <DialogDescription>
              Ajoutez une institution partenaire ou un régulateur au réseau de surveillance.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddInstitution} className="space-y-4 pt-2">
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="inst-nom" className="text-[12.5px]">Nom officiel</Label>
                <Input
                  id="inst-nom"
                  placeholder="Ex: Min. des Postes et Télécoms"
                  value={newInstNom}
                  onChange={(e) => setNewInstNom(e.target.value)}
                  className="h-10"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="inst-sigle" className="text-[12.5px]">Sigle</Label>
                <Input
                  id="inst-sigle"
                  placeholder="Ex: MINPOSTEL"
                  value={newInstSigle}
                  onChange={(e) => setNewInstSigle(e.target.value)}
                  className="h-10"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="inst-role" className="text-[12.5px]">Type d'acteur</Label>
              <Select value={newInstRole} onValueChange={setNewInstRole}>
                <SelectTrigger className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="partenaire">Partenaire</SelectItem>
                  <SelectItem value="regulateur">Régulateur</SelectItem>
                  <SelectItem value="media">Média</SelectItem>
                  <SelectItem value="gouvernemental">Gouvernemental</SelectItem>
                  <SelectItem value="ong">ONG</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setShowAddInstDialog(false)}>
                Annuler
              </Button>
              <Button type="submit">Créer l'institution</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
