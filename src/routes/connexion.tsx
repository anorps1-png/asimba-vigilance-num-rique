import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Eye, EyeOff, ShieldCheck, Lock, Sparkles, Loader2 } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/connexion")({
  head: () => ({
    meta: [
      { title: "Connexion — ASIMBA" },
      { name: "description", content: "Accès à la plateforme ASIMBA." },
    ],
  }),
  validateSearch: (search: Record<string, unknown>): { redirect?: string } => ({
    redirect: typeof search.redirect === "string" ? search.redirect : undefined,
  }),
  component: LoginPage,
});

function LoginPage() {
  const [show, setShow] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [isRegister, setIsRegister] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const { redirect } = Route.useSearch();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Veuillez renseigner votre email et votre mot de passe.");
      return;
    }
    setSubmitting(true);
    if (isRegister) {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName || email.split("@")[0],
          },
        },
      });
      setSubmitting(false);
      if (error) {
        toast.error("Inscription impossible", { description: error.message });
        return;
      }
      toast.success("Compte créé avec succès !", {
        description: "Veuillez vérifier vos e-mails pour valider votre compte ou connectez-vous.",
      });
      setIsRegister(false);
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setSubmitting(false);
      if (error) {
        toast.error("Connexion impossible", { description: "Email ou mot de passe incorrect." });
        return;
      }
      toast.success("Connexion réussie");
      const target = redirect && redirect.startsWith("/") ? redirect : "/";
      navigate({ to: target });
    }
  }

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2">
      <div className="relative hidden lg:flex flex-col justify-between bg-sidebar text-sidebar-foreground p-10 overflow-hidden">
        <div
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 20%, oklch(0.485 0.165 258 / 0.35), transparent 50%), radial-gradient(circle at 80% 70%, oklch(0.35 0.15 240 / 0.35), transparent 50%)",
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(oklch(1 0 0 / 0.03) 1px, transparent 1px), linear-gradient(90deg, oklch(1 0 0 / 0.03) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />
        <div className="relative">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-info shadow-elev-2">
              <span className="text-[16px] font-bold text-primary-foreground">A</span>
            </div>
            <div>
              <div className="text-[17px] font-semibold">ASIMBA</div>
              <div className="text-[11px] font-medium tracking-widest text-sidebar-muted uppercase">
                Risk Intelligence
              </div>
            </div>
          </div>
        </div>
        <div className="relative space-y-6 max-w-md">
          <div className="inline-flex items-center gap-2 rounded-full border border-sidebar-border bg-sidebar-accent px-3 py-1 text-[11px] font-medium text-sidebar-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-success" /> Opérationnel · République du
            Cameroun
          </div>
          <h1 className="text-[34px] font-semibold leading-[1.1] tracking-tight">
            Détecter, analyser et prioriser les menaces numériques à impact réel.
          </h1>
          <p className="text-[13.5px] text-sidebar-muted">
            ASIMBA centralise les signalements citoyens, les sources publiques et les rapports
            institutionnels pour offrir une intelligence unifiée aux autorités et partenaires du
            Cameroun.
          </p>
          <div className="grid grid-cols-3 gap-3 pt-4 border-t border-sidebar-border">
            <Stat label="Alertes / mois" value="1 284" />
            <Stat label="Partenaires" value="24" />
            <Stat label="Régions" value="10" />
          </div>
        </div>
        <div className="relative text-[11px] text-sidebar-muted">
          © 2026 ASIMBA — Plateforme camerounaise d'intelligence des risques numériques.
        </div>
      </div>

      <div className="flex items-center justify-center bg-background p-6 lg:p-10">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-8 flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-info">
              <span className="text-[14px] font-bold text-primary-foreground">A</span>
            </div>
            <div className="text-[15px] font-semibold">ASIMBA</div>
          </div>
          <div>
            <div className="text-[11px] font-semibold tracking-[0.16em] uppercase text-primary">
              Accès sécurisé
            </div>
            <h2 className="mt-1.5 text-[26px] font-semibold tracking-tight">
              {isRegister ? "Créer un compte" : "Connexion à votre compte"}
            </h2>
            <p className="mt-1.5 text-[13px] text-muted-foreground">
              {isRegister
                ? "Inscrivez-vous pour rejoindre la plateforme ASIMBA."
                : "Bienvenue. Renseignez vos identifiants pour accéder à la plateforme."}
            </p>
          </div>

          <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
            {isRegister && (
              <div>
                <Label className="text-[12.5px] mb-1.5 block">Nom complet</Label>
                <Input
                  type="text"
                  placeholder="Jean Eboa"
                  className="h-11"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>
            )}
            <div>
              <Label className="text-[12.5px] mb-1.5 block">Email professionnel</Label>
              <Input
                type="email"
                autoComplete="email"
                placeholder="prenom.nom@institution.cm"
                className="h-11"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <Label className="text-[12.5px]">Mot de passe</Label>
                {!isRegister && (
                  <a href="#" className="text-[11.5px] font-medium text-primary hover:underline">
                    Mot de passe oublié ?
                  </a>
                )}
              </div>
              <div className="relative">
                <Input
                  type={show ? "text" : "password"}
                  autoComplete={isRegister ? "new-password" : "current-password"}
                  placeholder="Votre mot de passe"
                  className="h-11 pr-10"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShow((s) => !s)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-muted-foreground hover:text-foreground"
                  aria-label="Afficher le mot de passe"
                >
                  {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            {!isRegister && (
              <div className="flex items-center justify-between text-[12.5px]">
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox defaultChecked /> Rester connecté sur cet appareil
                </label>
                <span className="inline-flex items-center gap-1 text-muted-foreground">
                  <Lock className="h-3 w-3" /> Session chiffrée
                </span>
              </div>
            )}
            <Button type="submit" disabled={submitting} className="w-full h-11 text-[13px]">
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {isRegister
                ? submitting
                  ? "Inscription…"
                  : "Créer mon compte"
                : submitting
                  ? "Connexion…"
                  : "Se connecter"}
            </Button>
            {!isRegister && (
              <>
                <div className="relative py-1">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center text-[11px]">
                    <span className="bg-background px-2 text-muted-foreground">ou</span>
                  </div>
                </div>
                <Button variant="outline" className="w-full h-11 gap-2 text-[13px]">
                  <ShieldCheck className="h-4 w-4 text-primary" /> Se connecter via SSO institutionnel
                </Button>
              </>
            )}
          </form>

          {!isRegister && (
            <div className="mt-6 rounded-lg border border-border bg-muted/40 p-3 text-[11.5px] text-muted-foreground flex gap-2">
              <Sparkles className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
              Votre compte est protégé par l'authentification à deux facteurs. Un code vous sera
              demandé après validation.
            </div>
          )}

          <div className="mt-8 text-center text-[12px] text-muted-foreground">
            {isRegister ? (
              <>
                Déjà un compte ?{" "}
                <button
                  type="button"
                  onClick={() => setIsRegister(false)}
                  className="font-medium text-primary hover:underline"
                >
                  Se connecter
                </button>
              </>
            ) : (
              <>
                Pas encore de compte ?{" "}
                <button
                  type="button"
                  onClick={() => setIsRegister(true)}
                  className="font-medium text-primary hover:underline"
                >
                  Créer un compte
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[22px] font-semibold tabular-nums text-sidebar-foreground">{value}</div>
      <div className="text-[10.5px] uppercase tracking-wider text-sidebar-muted">{label}</div>
    </div>
  );
}
