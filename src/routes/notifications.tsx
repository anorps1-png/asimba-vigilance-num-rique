import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { requireAuth } from "@/lib/auth";
import { AppLayout, PageHeader } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useNotifications, useMarkNotificationRead } from "@/lib/queries/staff";
import type { Database } from "@/integrations/supabase/types";

type Notification = Database["public"]["Tables"]["notifications"]["Row"];

export const Route = createFileRoute("/notifications")({
  beforeLoad: ({ location }) => requireAuth(location),
  head: () => ({
    meta: [
      { title: "Notifications — ASIMBA" },
      { name: "description", content: "Historique et préférences de notification." },
    ],
  }),
  component: NotifPage,
});

function formatNotificationTime(createdAt: string): string {
  const date = new Date(createdAt);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMs / 3_600_000);
  const diffDays = Math.floor(diffMs / 86_400_000);

  if (diffMins < 1) return "À l'instant";
  if (diffMins < 60) return `Il y a ${diffMins}m`;
  if (diffHours < 24) return `Il y a ${diffHours}h`;
  if (diffDays < 7) return `Il y a ${diffDays}j`;
  return date.toLocaleDateString("fr-FR");
}

function NotifPage() {
  const { data: notifications, isLoading } = useNotifications();
  const { mutate: markAsRead } = useMarkNotificationRead();
  const [readingIds, setReadingIds] = useState<Set<string>>(new Set());

  const handleMarkAsRead = (id: string) => {
    setReadingIds((prev) => new Set(prev).add(id));
    markAsRead(id, {
      onSuccess: () => setReadingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      }),
      onError: () => setReadingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      }),
    });
  };

  const typeColors: Record<Notification["type"], string> = {
    alerte: "bg-destructive",
    assignation: "bg-blue-500",
    commentaire: "bg-amber-500",
    rapport: "bg-purple-500",
    systeme: "bg-primary",
  };

  return (
    <AppLayout title="Notifications" subtitle="Historique complet">
      <div className="mx-auto max-w-[1000px] px-4 py-6 lg:px-8 space-y-6">
        <PageHeader
          eyebrow="Centre de notifications"
          title="Toutes vos notifications"
          description="Alertes système, assignations, décisions IA et messages des partenaires."
        />
        {isLoading ? (
          <Card className="shadow-elev-1 p-4 text-center text-muted-foreground">
            Chargement...
          </Card>
        ) : !notifications || notifications.length === 0 ? (
          <Card className="shadow-elev-1 p-4 text-center text-muted-foreground">
            Aucune notification
          </Card>
        ) : (
          <Card className="shadow-elev-1 divide-y divide-border">
            {notifications.map((n: Notification) => (
              <div
                key={n.id}
                className={cn(
                  "flex gap-3 p-4 hover:bg-muted/40 group",
                  !n.lu && "bg-accent/20",
                )}
              >
                <div
                  className={cn(
                    "mt-1.5 h-2 w-2 shrink-0 rounded-full",
                    typeColors[n.type] || "bg-primary",
                  )}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-[13px] font-medium truncate">{n.titre}</div>
                    <div className="text-[11px] text-muted-foreground shrink-0">
                      {n.created_at ? formatNotificationTime(n.created_at) : "—"}
                    </div>
                  </div>
                  <div className="text-[12px] text-muted-foreground mt-0.5">{n.corps}</div>
                  {n.lien && (
                    <a href={n.lien} className="text-[12px] text-primary hover:underline mt-1.5 inline-block">
                      Voir plus →
                    </a>
                  )}
                </div>
                {!n.lu && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="shrink-0 opacity-0 group-hover:opacity-100"
                    disabled={readingIds.has(n.id)}
                    onClick={() => handleMarkAsRead(n.id)}
                  >
                    Marquer comme lu
                  </Button>
                )}
              </div>
            ))}
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
