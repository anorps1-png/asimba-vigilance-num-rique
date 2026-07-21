import { useEffect, useState } from "react";
import { redirect, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

/**
 * Garde de route à utiliser dans `beforeLoad` des routes protégées.
 *
 * La session Supabase est stockée côté client (localStorage). En SSR elle n'est
 * jamais visible : on laisse donc passer côté serveur et on laisse le client
 * re-vérifier à l'hydratation, pour éviter une redirection permanente. Aucune
 * donnée réelle sensible n'est rendue en SSR (les requêtes Supabase restent
 * protégées par les RLS), donc ce compromis est sûr pour cette application.
 */
export async function requireAuth(location: { href: string }) {
  if (typeof window === "undefined") return;
  const { data } = await supabase.auth.getSession();
  if (!data.session) {
    throw redirect({ to: "/connexion", search: { redirect: location.href } });
  }
}

function displayName(
  user: { email?: string | null; user_metadata?: Record<string, unknown> } | null | undefined,
) {
  if (!user) return null;
  const full = user.user_metadata?.full_name;
  return (typeof full === "string" && full.trim()) || user.email || null;
}

export function initialsFrom(name: string | null): string {
  if (!name) return "?";
  const parts = name
    .replace(/@.*/, "")
    .split(/[\s._-]+/)
    .filter(Boolean);
  const letters = (parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "");
  return (letters || name[0] || "?").toUpperCase();
}

/** Retourne l'utilisateur courant et se met à jour sur les changements de session. */
export function useCurrentUser() {
  const [email, setEmail] = useState<string | null>(null);
  const [name, setName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!active) return;
      setEmail(data.user?.email ?? null);
      setName(displayName(data.user));
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user?.email ?? null);
      setName(displayName(session?.user));
      setLoading(false);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return { email, name, loading };
}

/** Déconnecte l'utilisateur puis renvoie vers la page de connexion. */
export function useSignOut() {
  const navigate = useNavigate();
  return async () => {
    await supabase.auth.signOut();
    navigate({ to: "/connexion" });
  };
}

// === MFA (TOTP) — supabase.auth.mfa ===

/** Liste les facteurs TOTP vérifiés de l'utilisateur courant. */
export async function listMfaFactors() {
  const { data, error } = await supabase.auth.mfa.listFactors();
  if (error) throw error;
  return data.totp;
}

/** Démarre l'enrollment TOTP : renvoie le QR code (data URI) et le secret. */
export async function enrollMfa() {
  const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp" });
  if (error) throw error;
  return data;
}

/** Vérifie le premier code saisi et active le facteur (challenge + verify). */
export async function verifyMfaEnrollment(factorId: string, code: string) {
  const { data: challenge, error: challengeError } =
    await supabase.auth.mfa.challenge({ factorId });
  if (challengeError) throw challengeError;

  const { error: verifyError } = await supabase.auth.mfa.verify({
    factorId,
    challengeId: challenge.id,
    code,
  });
  if (verifyError) throw verifyError;
}

/** Désactive un facteur MFA. */
export async function unenrollMfa(factorId: string) {
  const { error } = await supabase.auth.mfa.unenroll({ factorId });
  if (error) throw error;
}
