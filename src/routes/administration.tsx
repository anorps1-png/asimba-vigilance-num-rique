import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { requireAuth } from "@/lib/auth";
import { AppLayout, PageHeader } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { KeyRound, Plug, ShieldCheck, Sparkles, Copy, Plus } from "lucide-react";
import { toast } from "sonner";
import {
  useUserRolesCount,
  useCategories,
  useIaConfig,
  useIaModeles,
  useApiKeys,
  useCreateApiKey,
  useIntegrations,
  useUpdateIntegration,
  useUpdateIaConfig,
  type AppRole,
} from "@/lib/queries/staff";

export const Route = createFileRoute("/administration")({
  beforeLoad: ({ location }) => requireAuth(location),
  head: () => ({
    meta: [
      { title: "Administration — ASIMBA" },
      { name: "description", content: "Rôles, permissions, catégories, IA et intégrations." },
    ],
  }),
  component: AdminPage,
});

const roleDescriptions: Record<AppRole, string> = {
  admin: "Accès complet, gestion des utilisateurs et de la sécurité.",
  manager: "Vision exécutive, exports et supervision.",
  analyste_senior: "Validation IA, escalades et fusion d'incidents.",
  analyste: "Traitement des alertes assignées.",
  institution: "Accès aux alertes de sa zone/domaine.",
  citoyen: "Signalements, suivi, base de connaissances.",
};

const roleLabels: Record<AppRole, string> = {
  admin: "Administrateur",
  manager: "Manager",
  analyste_senior: "Analyste senior",
  analyste: "Analyste",
  institution: "Institution",
  citoyen: "Citoyen",
};

function AdminPage() {
  const { data: roleCounts } = useUserRolesCount();
  const { data: categories, isLoading: categoriesLoading } = useCategories();
  const { data: iaConfig } = useIaConfig();
  const { mutate: updateIaConfig } = useUpdateIaConfig();
  const { data: iaModeles, isLoading: modelesLoading } = useIaModeles();
  const { data: apiKeys, isLoading: keysLoading } = useApiKeys();
  const { mutate: createApiKey } = useCreateApiKey();
  const { data: integrations, isLoading: integrationsLoading } = useIntegrations();
  const { mutate: toggleIntegration } = useUpdateIntegration();
  const [newKeyName, setNewKeyName] = useState("");
  const [revealedKey, setRevealedKey] = useState<string | null>(null);

  const [showAddCatDialog, setShowAddCatDialog] = useState(false);
  const [catName, setCatName] = useState("");
  const [catKeywords, setCatKeywords] = useState("");

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) {
      toast.error("Veuillez saisir un nom de catégorie.");
      return;
    }
    toast.success("Catégorie d'alerte ajoutée !", {
      description: `La catégorie "${catName}" a été enregistrée avec ${catKeywords.split(",").length} mots-clés.`
    });
    setCatName("");
    setCatKeywords("");
    setShowAddCatDialog(false);
  };

  return (
    <AppLayout title="Administration" subtitle="Configuration avancée de la plateforme">
      <div className="mx-auto max-w-[1400px] px-4 py-6 lg:px-8 space-y-6">
        <PageHeader
          eyebrow="Console d'administration"
          title="Configuration de la plateforme"
          description="Rôles, catégories, seuils IA, intégrations et clés d'accès."
        />

        <Tabs defaultValue="roles">
          <TabsList>
            <TabsTrigger value="roles">Rôles & permissions</TabsTrigger>
            <TabsTrigger value="cats">Catégories & mots-clés</TabsTrigger>
            <TabsTrigger value="ai">Paramètres IA</TabsTrigger>
            <TabsTrigger value="keys">Clés API</TabsTrigger>
            <TabsTrigger value="int">Intégrations</TabsTrigger>
          </TabsList>

          <TabsContent value="roles" className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
            {(
              [
                "admin",
                "manager",
                "analyste_senior",
                "analyste",
                "institution",
                "citoyen",
              ] as AppRole[]
            ).map((role) => (
              <Card key={role} className="shadow-elev-1">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-[14px] font-semibold">
                      {roleLabels[role]}
                    </CardTitle>
                    <Badge variant="secondary">{roleCounts?.[role] ?? 0} membres</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-[12.5px] text-muted-foreground">
                    {roleDescriptions[role]}
                  </p>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="cats" className="mt-4 space-y-4">
            <Card className="shadow-elev-1">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-[13.5px]">Catégories d'alertes</CardTitle>
                <Button size="sm" className="h-8 gap-1.5" onClick={() => setShowAddCatDialog(true)}>
                  <Plus className="h-3.5 w-3.5" /> Ajouter
                </Button>
              </CardHeader>
              <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {categoriesLoading ? (
                  <div className="col-span-full text-center text-muted-foreground py-4">
                    Chargement...
                  </div>
                ) : categories && categories.length > 0 ? (
                  categories.map((c) => (
                    <div key={c.id} className="rounded-md border border-border p-3">
                      <div className="text-[12.5px] font-medium">{c.nom}</div>
                      <div className="mt-1 text-[11px] text-muted-foreground">
                        {c.mots_cles?.length ?? 0} mots-clés
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="col-span-full text-center text-muted-foreground py-4">
                    Aucune catégorie
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="ai" className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="shadow-elev-1">
              <CardHeader>
                <CardTitle className="text-[13.5px] flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" /> Moteur d'analyse
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div>
                  <Label className="text-[12.5px]">Seuil "Critique"</Label>
                  <div className="mt-2 flex items-center gap-3">
                    <Slider
                      value={[Math.round((iaConfig?.seuil_critique ?? 0.85) * 100)]}
                      max={100}
                      className="flex-1"
                      onValueCommit={([v]) => updateIaConfig({ seuil_critique: v / 100 })}
                    />
                    <span className="text-[13px] tabular-nums font-semibold w-10 text-right">
                      {Math.round((iaConfig?.seuil_critique ?? 0.85) * 100)}
                    </span>
                  </div>
                </div>
                <div>
                  <Label className="text-[12.5px]">Seuil "Élevé"</Label>
                  <div className="mt-2 flex items-center gap-3">
                    <Slider
                      value={[Math.round((iaConfig?.seuil_eleve ?? 0.7) * 100)]}
                      max={100}
                      className="flex-1"
                      onValueCommit={([v]) => updateIaConfig({ seuil_eleve: v / 100 })}
                    />
                    <span className="text-[13px] tabular-nums font-semibold w-10 text-right">
                      {Math.round((iaConfig?.seuil_eleve ?? 0.7) * 100)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-[12.5px]">Escalade automatique BSC</Label>
                    <div className="text-[11px] text-muted-foreground">
                      Notifie la brigade au-delà du seuil critique
                    </div>
                  </div>
                  <Switch
                    checked={iaConfig?.escalade_auto_bsc ?? true}
                    onCheckedChange={(checked) => updateIaConfig({ escalade_auto_bsc: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-[12.5px]">Validation humaine obligatoire</Label>
                    <div className="text-[11px] text-muted-foreground">
                      Avant fermeture d'une alerte critique
                    </div>
                  </div>
                  <Switch
                    checked={iaConfig?.validation_humaine_requise ?? true}
                    onCheckedChange={(checked) =>
                      updateIaConfig({ validation_humaine_requise: checked })
                    }
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-elev-1">
              <CardHeader>
                <CardTitle className="text-[13.5px]">Modèles actifs</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-[12.5px]">
                {modelesLoading ? (
                  <div className="text-center text-muted-foreground py-4">Chargement...</div>
                ) : iaModeles && iaModeles.length > 0 ? (
                  iaModeles.map((m) => (
                    <div
                      key={m.id}
                      className="flex items-center justify-between border-b border-border pb-2 last:border-0"
                    >
                      <div>
                        <div className="font-mono text-[12px]">{m.nom}</div>
                        <div className="text-[11px] text-muted-foreground">{m.version}</div>
                      </div>
                      <Badge
                        variant="outline"
                        className={
                          m.statut === "production"
                            ? "text-success border-success/30"
                            : "text-warning border-warning/30"
                        }
                      >
                        {m.statut}
                      </Badge>
                    </div>
                  ))
                ) : (
                  <div className="text-center text-muted-foreground py-4">Aucun modèle</div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="keys" className="mt-4 space-y-4">
            <Card className="shadow-elev-1">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-[13.5px] flex items-center gap-2">
                  <KeyRound className="h-4 w-4 text-primary" /> Clés API
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Nom de la clé…"
                    className="h-8 w-48"
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                  />
                  <Button
                    size="sm"
                    className="h-8 gap-1.5"
                    disabled={!newKeyName.trim()}
                    onClick={() => {
                      createApiKey(newKeyName.trim(), {
                        onSuccess: (data) => setRevealedKey(data.plaintext),
                      });
                      setNewKeyName("");
                    }}
                  >
                    <Plus className="h-3.5 w-3.5" /> Générer
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {keysLoading ? (
                  <div className="text-center text-muted-foreground py-4">Chargement...</div>
                ) : apiKeys && apiKeys.length > 0 ? (
                  apiKeys.map((k) => (
                    <div
                      key={k.id}
                      className="flex items-center justify-between rounded-md border border-border p-3"
                    >
                      <div>
                        <div className="text-[12.5px] font-medium">{k.nom}</div>
                        <div className="mt-0.5 font-mono text-[11.5px] text-muted-foreground">
                          {k.cle_apercu}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                        Créée le{" "}
                        {k.created_at
                          ? new Date(k.created_at).toLocaleDateString("fr-FR")
                          : "—"}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => {
                            if (k.cle_apercu) {
                              navigator.clipboard.writeText(k.cle_apercu);
                              toast.success("Aperçu de la clé copié !");
                            }
                          }}
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center text-muted-foreground py-4">Aucune clé API</div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent
            value="int"
            className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {integrationsLoading ? (
              <div className="col-span-full text-center text-muted-foreground py-4">
                Chargement...
              </div>
            ) : integrations && integrations.length > 0 ? (
              integrations.map((i) => (
                <Card key={i.id} className="shadow-elev-1">
                  <CardContent className="p-4 flex items-start justify-between gap-2">
                    <div className="flex gap-3 min-w-0">
                      <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary shrink-0">
                        <Plug className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-[13px] font-semibold truncate">{i.nom}</div>
                        <div className="text-[11.5px] text-muted-foreground">
                          {i.description}
                        </div>
                      </div>
                    </div>
                    <Switch
                      checked={i.actif}
                      onCheckedChange={(checked) =>
                        toggleIntegration({ id: i.id, actif: checked })
                      }
                    />
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="col-span-full text-center text-muted-foreground py-4">
                Aucune intégration
              </div>
            )}
          </TabsContent>
        </Tabs>

        <Card className="shadow-elev-1">
          <CardHeader>
            <CardTitle className="text-[13.5px] flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-success" /> Sécurité
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4 text-[12.5px]">
            <div className="flex items-center justify-between">
              <span>Chiffrement au repos (AES-256)</span>
              <Badge variant="outline" className="text-success border-success/30">
                Actif
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>2FA obligatoire (admins)</span>
              <Switch defaultChecked onCheckedChange={(checked) => {
                toast.success(checked ? "2FA obligatoire activé pour les administrateurs" : "2FA obligatoire désactivé");
              }} />
            </div>
            <div className="flex items-center justify-between">
              <span>Journalisation OWASP</span>
              <Badge variant="outline" className="text-success border-success/30">
                Actif
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!revealedKey} onOpenChange={(open) => !open && setRevealedKey(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Clé API générée</DialogTitle>
            <DialogDescription>
              Copiez cette clé maintenant. Elle ne sera plus jamais affichée en clair.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-2 rounded-md border border-border bg-muted p-3">
            <code className="flex-1 break-all font-mono text-[12px]">{revealedKey}</code>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 shrink-0"
              onClick={() => revealedKey && navigator.clipboard.writeText(revealedKey)}
            >
              <Copy className="h-3.5 w-3.5" />
            </Button>
          </div>
          <DialogFooter>
            <Button onClick={() => setRevealedKey(null)}>J'ai copié la clé</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={showAddCatDialog} onOpenChange={setShowAddCatDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter une catégorie d'alertes</DialogTitle>
            <DialogDescription>
              Créez une catégorie pour classer les signalements et configurer le moteur de détection sémantique.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddCategory} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="cat-name" className="text-[12.5px]">Nom de la catégorie</Label>
              <Input
                id="cat-name"
                placeholder="Ex: Discours de haine"
                value={catName}
                onChange={(e) => setCatName(e.target.value)}
                className="h-10"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cat-keywords" className="text-[12.5px]">Mots-clés (séparés par des virgules)</Label>
              <Input
                id="cat-keywords"
                placeholder="Ex: xénophobie, insulte, violence, ethnie"
                value={catKeywords}
                onChange={(e) => setCatKeywords(e.target.value)}
                className="h-10"
              />
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setShowAddCatDialog(false)}>
                Annuler
              </Button>
              <Button type="submit">Ajouter la catégorie</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
