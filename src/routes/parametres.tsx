import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  requireAuth,
  useCurrentUser,
  enrollMfa,
  verifyMfaEnrollment,
  unenrollMfa,
  initialsFrom,
} from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout, PageHeader } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { useProfile, useUpdateProfile, usePreferences, useUpdatePreferences } from "@/lib/queries/staff";

export const Route = createFileRoute("/parametres")({
  beforeLoad: ({ location }) => requireAuth(location),
  head: () => ({
    meta: [
      { title: "Paramètres — ASIMBA" },
      { name: "description", content: "Préférences du compte, sécurité et notifications." },
    ],
  }),
  component: SettingsPage,
});

function useMfaFactors() {
  return useQuery({
    queryKey: ["mfa-factors"],
    queryFn: async () => {
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (error) throw error;
      return data.totp;
    },
    staleTime: 10_000,
  });
}

function SettingsPage() {
  const { name, email } = useCurrentUser();
  const { data: profile } = useProfile();
  const { mutate: updateProfile, isPending: savingProfile } = useUpdateProfile();
  const { data: preferences } = usePreferences();
  const { mutate: updatePreferences } = useUpdatePreferences();
  const { data: mfaFactors } = useMfaFactors();
  const queryClient = useQueryClient();

  const [fullName, setFullName] = useState("");
  const [telephone, setTelephone] = useState("");
  const [fonction, setFonction] = useState("");
  const [langue, setLangue] = useState("");

  useEffect(() => {
    if (!profile) return;
    setFullName(profile.full_name ?? "");
    setTelephone(profile.telephone ?? "");
    setFonction(profile.fonction ?? "");
    setLangue(profile.langue ?? "Français (Cameroun)");
  }, [profile]);

  const [mfaStep, setMfaStep] = useState<"idle" | "enrolling">("idle");
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null);
  const [mfaQrCode, setMfaQrCode] = useState<string | null>(null);
  const [mfaSecret, setMfaSecret] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState("");
  const [mfaBusy, setMfaBusy] = useState(false);

  const has2fa = (mfaFactors?.length ?? 0) > 0;

  const startMfaEnroll = async () => {
    try {
      const data = await enrollMfa();
      setMfaFactorId(data.id);
      setMfaQrCode(data.totp.qr_code);
      setMfaSecret(data.totp.secret);
      setMfaStep("enrolling");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Impossible de démarrer la 2FA");
    }
  };

  const confirmMfaEnroll = async () => {
    if (!mfaFactorId || mfaCode.length !== 6) return;
    setMfaBusy(true);
    try {
      await verifyMfaEnrollment(mfaFactorId, mfaCode);
      updatePreferences({ deux_facteurs_actif: true });
      queryClient.invalidateQueries({ queryKey: ["mfa-factors"] });
      toast.success("Authentification à deux facteurs activée");
      setMfaStep("idle");
      setMfaCode("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Code invalide");
    } finally {
      setMfaBusy(false);
    }
  };

  const disable2fa = async () => {
    if (!mfaFactors || mfaFactors.length === 0) return;
    setMfaBusy(true);
    try {
      for (const factor of mfaFactors) {
        await unenrollMfa(factor.id);
      }
      updatePreferences({ deux_facteurs_actif: false });
      queryClient.invalidateQueries({ queryKey: ["mfa-factors"] });
      toast.success("Authentification à deux facteurs désactivée");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Échec de la désactivation");
    } finally {
      setMfaBusy(false);
    }
  };

  const handleResetPassword = async () => {
    if (!email) return;
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) toast.error(error.message);
    else toast.success("Email de réinitialisation envoyé");
  };

  const initials = initialsFrom(name ?? email);

  return (
    <AppLayout title="Paramètres" subtitle="Compte et préférences">
      <div className="mx-auto max-w-[1000px] px-4 py-6 lg:px-8 space-y-6">
        <PageHeader
          eyebrow="Mon compte"
          title="Paramètres"
          description="Gérez vos informations personnelles, la sécurité et les préférences de notification."
        />

        <Card className="shadow-elev-1">
          <CardHeader>
            <CardTitle className="text-[13.5px]">Profil</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarFallback className="bg-primary text-primary-foreground text-[16px]">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div>
                <Button size="sm" variant="outline" disabled>
                  Changer la photo
                </Button>
                <div className="mt-1 text-[11px] text-muted-foreground">Bientôt disponible</div>
              </div>
            </div>
            <Separator />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Nom complet" value={fullName} onChange={setFullName} />
              <Field label="Adresse email" value={email ?? ""} disabled />
              <Field label="Téléphone" value={telephone} onChange={setTelephone} />
              <Field label="Fonction" value={fonction} onChange={setFonction} />
              <Field
                label="Institution"
                value={profile?.institutions?.nom ?? "Aucune"}
                disabled
              />
              <Field label="Langue" value={langue} onChange={setLangue} />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                onClick={() =>
                  updateProfile(
                    { full_name: fullName, telephone, fonction, langue },
                    { onSuccess: () => toast.success("Profil mis à jour") },
                  )
                }
                disabled={savingProfile}
              >
                Enregistrer
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-elev-1">
          <CardHeader>
            <CardTitle className="text-[13.5px]">Sécurité</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <SwitchRow
              label="Authentification à deux facteurs"
              hint="Recommandé pour les administrateurs"
              checked={has2fa}
              disabled={mfaBusy}
              onCheckedChange={(checked) => (checked ? startMfaEnroll() : disable2fa())}
            />
            <SwitchRow
              label="Notifications de connexion"
              hint="Recevoir un email à chaque nouvelle connexion"
              checked={preferences?.notif_connexion ?? true}
              onCheckedChange={(checked) => updatePreferences({ notif_connexion: checked })}
            />
            <SwitchRow
              label="Verrouillage automatique de session"
              hint="Après 15 minutes d'inactivité"
              checked={preferences?.verrouillage_auto ?? false}
              onCheckedChange={(checked) => updatePreferences({ verrouillage_auto: checked })}
            />
            <Separator />
            <Button variant="outline" onClick={handleResetPassword}>
              Changer le mot de passe
            </Button>
          </CardContent>
        </Card>

        <Card className="shadow-elev-1">
          <CardHeader>
            <CardTitle className="text-[13.5px]">Notifications</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <SwitchRow
              label="Email — alertes critiques"
              checked={preferences?.email_alertes_critiques ?? true}
              onCheckedChange={(checked) => updatePreferences({ email_alertes_critiques: checked })}
            />
            <SwitchRow
              label="Email — rapports hebdomadaires"
              checked={preferences?.email_rapports_hebdo ?? false}
              onCheckedChange={(checked) => updatePreferences({ email_rapports_hebdo: checked })}
            />
            <SwitchRow
              label="SMS — alertes critiques"
              checked={preferences?.sms_alertes_critiques ?? false}
              onCheckedChange={(checked) => updatePreferences({ sms_alertes_critiques: checked })}
            />
            <SwitchRow
              label="Push navigateur — assignations"
              checked={preferences?.push_assignations ?? true}
              onCheckedChange={(checked) => updatePreferences({ push_assignations: checked })}
            />
            <SwitchRow
              label="Push navigateur — commentaires"
              checked={preferences?.push_commentaires ?? true}
              onCheckedChange={(checked) => updatePreferences({ push_commentaires: checked })}
            />
          </CardContent>
        </Card>
      </div>

      <Dialog
        open={mfaStep === "enrolling"}
        onOpenChange={(open) => {
          if (!open) {
            setMfaStep("idle");
            setMfaCode("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Activer l'authentification à deux facteurs</DialogTitle>
            <DialogDescription>
              Scannez ce QR code avec votre application d'authentification (Google
              Authenticator, Authy…), puis saisissez le code à 6 chiffres généré.
            </DialogDescription>
          </DialogHeader>
          {mfaQrCode && (
            <div className="flex flex-col items-center gap-3">
              <img src={mfaQrCode} alt="QR code TOTP" className="h-40 w-40" />
              {mfaSecret && (
                <code className="text-[11px] text-muted-foreground break-all text-center">
                  {mfaSecret}
                </code>
              )}
              <Input
                placeholder="Code à 6 chiffres"
                value={mfaCode}
                onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                className="h-10 w-40 text-center tracking-[0.3em]"
                maxLength={6}
              />
            </div>
          )}
          <DialogFooter>
            <Button
              onClick={confirmMfaEnroll}
              disabled={mfaCode.length !== 6 || mfaBusy}
            >
              Vérifier et activer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}

function Field({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: string;
  onChange?: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <div>
      <Label className="text-[12px] mb-1.5 block">{label}</Label>
      <Input
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        disabled={disabled || !onChange}
        className="h-10"
      />
    </div>
  );
}

function SwitchRow({
  label,
  hint,
  checked,
  disabled,
  onCheckedChange,
}: {
  label: string;
  hint?: string;
  checked?: boolean;
  disabled?: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <div className="text-[13px] font-medium">{label}</div>
        {hint && <div className="text-[11.5px] text-muted-foreground">{hint}</div>}
      </div>
      <Switch checked={checked} disabled={disabled} onCheckedChange={onCheckedChange} />
    </div>
  );
}
