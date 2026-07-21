import { createFileRoute } from "@tanstack/react-router";
import { AppLayout, PageHeader } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import {
  Check,
  FileText,
  Image as ImageIcon,
  Video,
  Mic,
  Link2,
  File,
  MapPin,
  Shield,
  UploadCloud,
  ArrowLeft,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { regions, villes, alerts, type Alert, type Category } from "@/lib/mock-data";
import { EvidenceUploader, type EvidenceFile } from "@/components/EvidenceUploader";

export const Route = createFileRoute("/signalements")({
  head: () => ({
    meta: [
      { title: "Nouveau signalement — ASIMBA" },
      {
        name: "description",
        content: "Signaler un contenu numérique préoccupant en toute sécurité.",
      },
    ],
  }),
  component: SignalementsPage,
});

const steps = [
  { n: 1, label: "Type de contenu", icon: FileText },
  { n: 2, label: "Preuves", icon: UploadCloud },
  { n: 3, label: "Localisation", icon: MapPin },
  { n: 4, label: "Description", icon: FileText },
  { n: 5, label: "Confidentialité", icon: Shield },
  { n: 6, label: "Confirmation", icon: Check },
];

const contentTypes = [
  { id: "lien", label: "Lien", icon: Link2, hint: "Publication, article, URL" },
  { id: "image", label: "Image", icon: ImageIcon, hint: "Capture d'écran, photo" },
  { id: "video", label: "Vidéo", icon: Video, hint: "MP4, MOV — max 200 Mo" },
  { id: "audio", label: "Audio", icon: Mic, hint: "MP3, WAV — max 50 Mo" },
  { id: "texte", label: "Texte", icon: FileText, hint: "Message, transcription" },
  { id: "document", label: "Document", icon: File, hint: "PDF, DOCX" },
];

function SignalementsPage() {
  const [step, setStep] = useState(1);
  const [type, setType] = useState<"lien" | "image" | "video" | "audio" | "texte" | "document">(
    "lien",
  );
  const [region, setRegion] = useState("Centre");
  const [ville, setVille] = useState("Yaoundé");
  const [pays, setPays] = useState("Cameroun");
  const [gps, setGps] = useState("");
  const [url, setUrl] = useState("");
  const [description, setDescription] = useState("");
  const [categorie, setCategorie] = useState<string>("");
  const [confidentialite, setConfidentialite] = useState<"anonyme" | "restreint" | "identifie">(
    "anonyme",
  );
  const [suiviEmail, setSuiviEmail] = useState("");
  const [suiviActive, setSuiviActive] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [signalementId, setSignalementId] = useState(() => crypto.randomUUID());
  const [preuves, setPreuves] = useState<EvidenceFile[]>([]);
  const progress = (step / steps.length) * 100;

  const paysMap: Record<string, string> = { cm: "Cameroun", td: "Tchad", ga: "Gabon" };

  async function submitSignalement() {
    setSubmitting(true);

    const contenu = url.trim() || description.trim();
    if (!contenu) {
      setSubmitting(false);
      toast.error("Veuillez renseigner une URL ou une description avant d'envoyer.");
      return;
    }

    const { data: userData } = await supabase.auth.getUser();
    const uid = userData.user?.id ?? null;
    let lat: number | null = null,
      lng: number | null = null;
    if (gps.includes(",")) {
      const [a, b] = gps.split(",").map((s) => Number(s.trim()));
      if (!Number.isNaN(a) && !Number.isNaN(b)) {
        lat = a;
        lng = b;
      }
    }
    const payload = {
      id: signalementId,
      contenu,
      type,
      categorie: (categorie || null) as Database["public"]["Enums"]["signalement_categorie"] | null,
      capture_url: url || null,
      description: description || null,
      pays,
      region,
      ville,
      gps_lat: lat,
      gps_lng: lng,
      confidentialite,
      suivi_email: suiviActive && suiviEmail ? suiviEmail : null,
      auteur_id: confidentialite === "anonyme" ? null : uid,
      preuves:
        preuves as unknown as Database["public"]["Tables"]["signalements"]["Insert"]["preuves"],
    };

    const { data, error } = await supabase
      .from("signalements")
      .insert(payload)
      .select("id, reference")
      .single();

    if (error) {
      setSubmitting(false);
      toast.error("Envoi impossible", { description: error.message });
      return;
    }

    // Now insert a corresponding alerte in the database so administrators and authorities see it
    const alertePayload = {
      signalement_id: signalementId,
      titre: description?.slice(0, 50) || contenu.slice(0, 50),
      resume: description || contenu,
      severite: "moyenne" as const, 
      statut: "nouveau" as const,
      categorie: payload.categorie,
      mots_cles: ["signalement", "citoyen"],
      recommandation: "Alerte reçue par le portail citoyen. Analyse requise.",
    };

    const { error: alerteError } = await supabase
      .from("alertes")
      .insert(alertePayload);

    setSubmitting(false);
    if (alerteError) {
      console.error("[Alerte Creation Error]", alerteError);
    }

    toast.success("Signalement envoyé", { description: `Référence : #${data.reference}` });
    setStep(1);
    setUrl("");
    setDescription("");
    setCategorie("");
    setGps("");
    setPreuves([]);
    setSignalementId(crypto.randomUUID());
  }

  return (
    <AppLayout title="Signalements" subtitle="Signaler un contenu préoccupant">
      <div className="mx-auto max-w-[1200px] px-4 py-6 lg:px-8 space-y-6">
        <PageHeader
          eyebrow="Nouveau signalement"
          title="Aidez-nous à protéger la communauté"
          description="ASIMBA ne collecte jamais de contenus privés. Chaque signalement est traité de manière confidentielle par nos analystes et par notre moteur d'analyse."
        />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_1fr]">
          <Card className="shadow-elev-1 h-fit">
            <CardContent className="p-4">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                Progression
              </div>
              <div className="relative">
                <div className="absolute left-[15px] top-2 bottom-2 w-px bg-border" />
                <div className="space-y-4">
                  {steps.map((s) => {
                    const done = s.n < step;
                    const active = s.n === step;
                    const Icon = s.icon;
                    return (
                      <div key={s.n} className="relative flex items-start gap-3">
                        <div
                          className={cn(
                            "relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 text-[11px] font-semibold shrink-0 transition-colors",
                            active && "border-primary bg-primary text-primary-foreground",
                            done && "border-success bg-success text-success-foreground",
                            !active && !done && "border-border bg-card text-muted-foreground",
                          )}
                        >
                          {done ? (
                            <Check className="h-3.5 w-3.5" />
                          ) : (
                            <Icon className="h-3.5 w-3.5" />
                          )}
                        </div>
                        <div className="mt-1">
                          <div
                            className={cn(
                              "text-[12px] font-medium",
                              active ? "text-foreground" : "text-muted-foreground",
                            )}
                          >
                            Étape {s.n}
                          </div>
                          <div className="text-[11.5px] text-muted-foreground">{s.label}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="mt-5 h-1 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="mt-1 text-[11px] text-muted-foreground text-right">
                {Math.round(progress)}%
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-elev-1">
            <CardHeader className="border-b border-border">
              <CardTitle className="text-[15px] font-semibold">
                Étape {step} · {steps[step - 1].label}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {step === 1 && (
                <div>
                  <p className="text-[13px] text-muted-foreground mb-4">
                    Choisissez le type de contenu que vous souhaitez signaler.
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {contentTypes.map((c) => {
                      const Icon = c.icon;
                      const active = type === c.id;
                      return (
                        <button
                          key={c.id}
                          onClick={() => setType(c.id as typeof type)}
                          className={cn(
                            "flex flex-col items-start gap-2 rounded-lg border p-4 text-left transition-all",
                            active
                              ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                              : "border-border bg-card hover:border-primary/40",
                          )}
                        >
                          <div
                            className={cn(
                              "flex h-9 w-9 items-center justify-center rounded-md",
                              active
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted text-foreground",
                            )}
                          >
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="text-[13px] font-semibold">{c.label}</div>
                          <div className="text-[11.5px] text-muted-foreground">{c.hint}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-4">
                  <div>
                    <Label className="text-[12.5px] mb-1.5 block">
                      URL ou lien de la publication
                    </Label>
                    <Input
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      placeholder="https://facebook.com/…"
                      className="h-10"
                    />
                  </div>
                  <div>
                    <Label className="text-[12.5px] mb-1.5 block">Preuves complémentaires</Label>
                    <EvidenceUploader
                      signalementId={signalementId}
                      files={preuves}
                      onFilesChange={setPreuves}
                    />
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-[12.5px] mb-1.5 block">Pays</Label>
                      <Select
                        value={Object.entries(paysMap).find(([, v]) => v === pays)?.[0] ?? "cm"}
                        onValueChange={(v) => setPays(paysMap[v] ?? "Cameroun")}
                      >
                        <SelectTrigger className="h-10">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cm">Cameroun</SelectItem>
                          <SelectItem value="td">Tchad</SelectItem>
                          <SelectItem value="ga">Gabon</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-[12.5px] mb-1.5 block">Région</Label>
                      <Select value={region} onValueChange={setRegion}>
                        <SelectTrigger className="h-10">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {regions.map((r) => (
                            <SelectItem key={r} value={r}>
                              {r}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-[12.5px] mb-1.5 block">Ville</Label>
                      <Select value={ville} onValueChange={setVille}>
                        <SelectTrigger className="h-10">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.keys(villes).map((v) => (
                            <SelectItem key={v} value={v}>
                              {v}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-[12.5px] mb-1.5 block">
                        Coordonnées GPS (optionnel)
                      </Label>
                      <Input
                        value={gps}
                        onChange={(e) => setGps(e.target.value)}
                        placeholder="3.8480, 11.5021"
                        className="h-10 font-mono text-[12px]"
                      />
                    </div>
                  </div>
                  <div className="rounded-md border border-border bg-muted/40 p-3 text-[11.5px] text-muted-foreground">
                    <MapPin className="inline h-3.5 w-3.5 mr-1 text-primary" />
                    La localisation permet aux analystes de prioriser les signalements par zone.
                  </div>
                </div>
              )}

              {step === 4 && (
                <div className="space-y-4">
                  <div>
                    <Label className="text-[12.5px] mb-1.5 block">Contexte et description</Label>
                    <Textarea
                      rows={6}
                      maxLength={2000}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Décrivez ce que vous avez observé : contexte, personnes visées, propagation, dates, etc."
                    />
                    <div className="mt-1 text-[11px] text-muted-foreground text-right">
                      {description.length} / 2000
                    </div>
                  </div>
                  <div>
                    <Label className="text-[12.5px] mb-1.5 block">Catégorie suspectée</Label>
                    <Select value={categorie} onValueChange={setCategorie}>
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder="Sélectionner une catégorie" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="violence">Incitation à la violence</SelectItem>
                        <SelectItem value="desinformation">Désinformation</SelectItem>
                        <SelectItem value="harcelement">Harcèlement</SelectItem>
                        <SelectItem value="escroquerie">Escroquerie</SelectItem>
                        <SelectItem value="enfance">Protection de l'enfance</SelectItem>
                        <SelectItem value="haine">Discours de haine</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {step === 5 && (
                <div className="space-y-4">
                  <RadioGroup
                    value={confidentialite}
                    onValueChange={(v) => setConfidentialite(v as typeof confidentialite)}
                    className="space-y-2"
                  >
                    {[
                      {
                        v: "anonyme",
                        t: "Anonyme",
                        d: "Aucune information personnelle n'est enregistrée.",
                      },
                      {
                        v: "restreint",
                        t: "Restreint",
                        d: "Seuls les analystes autorisés voient votre identité.",
                      },
                      {
                        v: "identifie",
                        t: "Identifié",
                        d: "Votre identité est visible pour un meilleur suivi.",
                      },
                    ].map((o) => (
                      <label
                        key={o.v}
                        className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-4 hover:border-primary/40"
                      >
                        <RadioGroupItem value={o.v} className="mt-0.5" />
                        <div>
                          <div className="text-[13px] font-medium">{o.t}</div>
                          <div className="text-[11.5px] text-muted-foreground">{o.d}</div>
                        </div>
                      </label>
                    ))}
                  </RadioGroup>
                  <div className="rounded-md border border-border bg-muted/40 p-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-[12.5px] font-medium">Recevoir un suivi par email</div>
                        <div className="text-[11px] text-muted-foreground">
                          Vous serez notifié de l'avancement de votre signalement.
                        </div>
                      </div>
                      <Switch checked={suiviActive} onCheckedChange={setSuiviActive} />
                    </div>
                    {suiviActive && (
                      <Input
                        type="email"
                        value={suiviEmail}
                        onChange={(e) => setSuiviEmail(e.target.value)}
                        placeholder="votre@email.com"
                        className="h-10"
                      />
                    )}
                  </div>
                </div>
              )}

              {step === 6 && (
                <div className="space-y-4">
                  <div className="rounded-lg border border-success/30 bg-success/5 p-4">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-success text-success-foreground">
                        <Check className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="text-[13.5px] font-semibold">
                          Signalement prêt à être envoyé
                        </div>
                        <div className="text-[11.5px] text-muted-foreground">
                          Vérifiez les informations ci-dessous.
                        </div>
                      </div>
                    </div>
                  </div>
                  <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-[12.5px]">
                    <Row
                      label="Type"
                      value={contentTypes.find((c) => c.id === type)?.label ?? ""}
                    />
                    <Row label="Région" value={region} />
                    <Row label="Ville" value={ville} />
                    <Row
                      label="Confidentialité"
                      value={
                        confidentialite === "anonyme"
                          ? "Anonyme"
                          : confidentialite === "restreint"
                            ? "Restreint"
                            : "Identifié"
                      }
                    />
                    <Row label="Catégorie" value={categorie || "—"} />
                    <Row
                      label="Preuves"
                      value={
                        preuves.length > 0
                          ? `${preuves.length} fichier${preuves.length > 1 ? "s" : ""}`
                          : url
                            ? "1 lien"
                            : "—"
                      }
                    />
                  </dl>
                </div>
              )}

              <div className="flex items-center justify-between border-t border-border pt-4">
                <Button
                  variant="outline"
                  disabled={step === 1}
                  onClick={() => setStep((s) => Math.max(1, s - 1))}
                  className="gap-1.5"
                >
                  <ArrowLeft className="h-3.5 w-3.5" /> Précédent
                </Button>
                {step < steps.length ? (
                  <Button
                    onClick={() => setStep((s) => Math.min(steps.length, s + 1))}
                    className="gap-1.5"
                  >
                    Continuer <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                ) : (
                  <Button onClick={submitSignalement} disabled={submitting} className="gap-1.5">
                    {submitting ? "Envoi…" : "Envoyer le signalement"}{" "}
                    <Check className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <dt className="text-[10.5px] uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 font-medium text-foreground">{value}</dd>
    </div>
  );
}
