import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { requireAuth } from "@/lib/auth";
import { AppLayout, PageHeader } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { BookOpen, Video, HelpCircle, Shield, ChevronRight, Search } from "lucide-react";
import { useArticles } from "@/lib/queries/staff";

export const Route = createFileRoute("/connaissances")({
  beforeLoad: ({ location }) => requireAuth(location),
  head: () => ({
    meta: [
      { title: "Base documentaire — ASIMBA" },
      {
        name: "description",
        content: "Articles, guides et vidéos de sensibilisation à la citoyenneté numérique.",
      },
    ],
  }),
  component: KnowledgePage,
});

const faq = [
  {
    q: "Comment ASIMBA garantit-il ma confidentialité ?",
    r: "Nous n'accédons jamais à vos messages privés. Les signalements peuvent être totalement anonymes.",
  },
  {
    q: "Que devient mon signalement ?",
    r: "Il est analysé par notre moteur d'IA puis validé par un analyste humain avant transmission éventuelle aux autorités compétentes.",
  },
  {
    q: "Puis-je suivre l'avancement d'un signalement ?",
    r: "Oui, si vous choisissez le mode « identifié » ou « restreint » et fournissez un email de contact.",
  },
  {
    q: "ASIMBA est-il utilisé pour surveiller les citoyens ?",
    r: "Non. ASIMBA ne traite que des informations publiques ou volontairement partagées.",
  },
];

function KnowledgePage() {
  const { data: articles, isLoading } = useArticles(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedArticle, setSelectedArticle] = useState<any | null>(null);

  const filtered = useMemo(() => {
    if (!articles) return [];
    const lower = searchTerm.toLowerCase();
    return articles.filter(
      (a) =>
        a.titre.toLowerCase().includes(lower) ||
        (a.resume?.toLowerCase() ?? "").includes(lower) ||
        a.categorie.toLowerCase().includes(lower),
    );
  }, [articles, searchTerm]);

  return (
    <AppLayout title="Base documentaire" subtitle="Ressources et sensibilisation">
      <div className="mx-auto max-w-[1400px] px-4 py-6 lg:px-8 space-y-6">
        <PageHeader
          eyebrow="Centre de connaissances"
          title="Sensibilisation & citoyenneté numérique"
          description="Guides, articles, vidéos et bonnes pratiques pour comprendre, prévenir et signaler les menaces numériques."
        />

        <Card className="shadow-elev-1 p-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Rechercher un article, un guide, une vidéo…"
              className="h-11 pl-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </Card>

        {isLoading ? (
          <div className="text-center text-muted-foreground py-8">Chargement...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            {searchTerm ? "Aucun article trouvé" : "Aucun article publié"}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((a, i) => {
              const icons = [BookOpen, Shield, Video];
              const Icon = icons[i % icons.length];
              return (
                <Card
                  key={a.id}
                  onClick={() => setSelectedArticle(a)}
                  className="shadow-elev-1 group cursor-pointer hover:shadow-elev-2 transition-shadow"
                >
                  <div className="h-32 relative bg-gradient-to-br from-primary/10 via-primary/5 to-info/10 border-b border-border rounded-t-xl flex items-center justify-center">
                    <Icon className="h-10 w-10 text-primary/60" />
                    <Badge
                      className="absolute top-3 left-3 bg-card text-foreground border-border"
                      variant="outline"
                    >
                      {a.categorie}
                    </Badge>
                  </div>
                  <CardContent className="p-4">
                    <div className="text-[10.5px] uppercase tracking-wider text-muted-foreground">
                      Lecture · {a.duree_lecture_min ?? "?"} min
                    </div>
                    <div className="mt-1 text-[14px] font-semibold group-hover:text-primary transition-colors">
                      {a.titre}
                    </div>
                    <p className="mt-1.5 text-[12px] text-muted-foreground line-clamp-2">
                      {a.resume}
                    </p>
                    <div className="mt-3 inline-flex items-center gap-1 text-[12px] font-medium text-primary">
                      Lire l'article <ChevronRight className="h-3.5 w-3.5" />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        <Card className="shadow-elev-1">
          <div className="border-b border-border p-5">
            <div className="flex items-center gap-2 text-[13.5px] font-semibold">
              <HelpCircle className="h-4 w-4 text-primary" /> Questions fréquentes
            </div>
          </div>
          <div className="divide-y divide-border">
            {faq.map((q, i) => (
              <details key={i} className="group px-5 py-4">
                <summary className="cursor-pointer list-none flex items-center justify-between text-[13px] font-medium">
                  {q.q}
                  <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-90" />
                </summary>
                <p className="mt-2 text-[12.5px] text-muted-foreground">{q.r}</p>
              </details>
            ))}
          </div>
        </Card>
      </div>

      <Dialog open={!!selectedArticle} onOpenChange={(open) => !open && setSelectedArticle(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {selectedArticle && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2 mb-1.5">
                  <Badge variant="outline">{selectedArticle.categorie}</Badge>
                  <span className="text-[11.5px] text-muted-foreground">
                    Lecture : {selectedArticle.duree_lecture_min ?? "?"} min
                  </span>
                </div>
                <DialogTitle className="text-[18px] font-semibold leading-snug">
                  {selectedArticle.titre}
                </DialogTitle>
                <DialogDescription className="text-[13px] leading-relaxed italic pt-1 border-b border-border pb-3">
                  {selectedArticle.resume}
                </DialogDescription>
              </DialogHeader>
              <div className="mt-4 space-y-4 text-[13.5px] leading-relaxed text-foreground whitespace-pre-line">
                {selectedArticle.contenu ? (
                  selectedArticle.contenu
                ) : (
                  <>
                    <p>
                      <strong>Introduction</strong> — À l'ère numérique actuelle, la diffusion rapide d'informations peut avoir des conséquences opérationnelles significatives au Cameroun. Cet article a pour but de fournir les connaissances de base et les procédures clés pour appréhender le sujet traité.
                    </p>
                    <p>
                      <strong>Analyse détaillée</strong> — Pour approfondir la thématique, les experts préconisent d'examiner attentivement les sources, de vérifier la cohérence temporelle des données partagées et de recouper les faits avec des communiqués de presse officiels d'institutions comme l'ANTIC ou le MINCOM.
                    </p>
                    <p>
                      <strong>Recommandations pratiques</strong> :
                    </p>
                    <ul className="list-disc pl-5 space-y-1.5 font-normal">
                      <li>Toujours vérifier l'URL d'origine avant de partager une information d'apparence institutionnelle.</li>
                      <li>Signaler immédiatement tout contenu incitant à la haine ou à la violence via le formulaire de signalement ASIMBA.</li>
                      <li>Sensibiliser vos équipes ou vos proches aux techniques courantes de manipulation sémantique.</li>
                    </ul>
                  </>
                )}
              </div>
              <DialogFooter className="mt-6 border-t border-border pt-3">
                <Button onClick={() => setSelectedArticle(null)}>Fermer</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
