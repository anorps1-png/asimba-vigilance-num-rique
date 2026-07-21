import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { requireAuth } from "@/lib/auth";
import { AppLayout, PageHeader } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Search, MoreHorizontal } from "lucide-react";
import { useUtilisateurs, type AppRole } from "@/lib/queries/staff";
import { toast } from "sonner";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const Route = createFileRoute("/utilisateurs")({
  beforeLoad: ({ location }) => requireAuth(location),
  head: () => ({
    meta: [
      { title: "Utilisateurs — ASIMBA" },
      { name: "description", content: "Gestion des comptes utilisateurs, rôles et permissions." },
    ],
  }),
  component: UsersPage,
});

const roleColors: Record<AppRole, string> = {
  admin: "text-destructive border-destructive/30 bg-destructive/5",
  manager: "text-blue-600 border-blue-200 bg-blue-50",
  analyste_senior: "text-purple-600 border-purple-200 bg-purple-50",
  analyste: "text-purple-600 border-purple-200 bg-purple-50",
  institution: "text-amber-600 border-amber-200 bg-amber-50",
  citoyen: "text-muted-foreground",
};

function UsersPage() {
  const { data: utilisateurs, isLoading } = useUtilisateurs();
  const [searchTerm, setSearchTerm] = useState("");

  const [showAddUserDialog, setShowAddUserDialog] = useState(false);
  const [newUserName, setNewUserName] = useState("");
  const [newUserRole, setNewUserRole] = useState<AppRole>("analyste");

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim()) {
      toast.error("Veuillez saisir un nom complet.");
      return;
    }
    toast.success("Utilisateur créé !", {
      description: `Le compte de "${newUserName}" avec le rôle "${newUserRole}" a été configuré.`
    });
    setNewUserName("");
    setNewUserRole("analyste");
    setShowAddUserDialog(false);
  };

  const filteredUsers = useMemo(() => {
    if (!utilisateurs) return [];
    const lower = searchTerm.toLowerCase();
    return utilisateurs.filter(
      (u) =>
        (u.full_name?.toLowerCase() || "").includes(lower) ||
        u.institutions?.nom.toLowerCase().includes(lower) ||
        u.role.toLowerCase().includes(lower),
    );
  }, [utilisateurs, searchTerm]);

  const count = utilisateurs?.length || 0;

  return (
    <AppLayout title="Utilisateurs" subtitle={`${count} comptes`}>
      <div className="mx-auto max-w-[1600px] px-4 py-6 lg:px-8 space-y-5">
        <PageHeader
          eyebrow="Administration"
          title="Gestion des utilisateurs"
          description="Créez et gérez les comptes, attribuez des rôles et des permissions granulaires."
          actions={
            <Button className="h-9 gap-1.5" onClick={() => setShowAddUserDialog(true)}>
              <Plus className="h-3.5 w-3.5" /> Nouvel utilisateur
            </Button>
          }
        />
        <Card className="shadow-elev-1">
          <div className="flex items-center gap-2 border-b border-border p-3">
            <div className="relative flex-1 max-w-md">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Rechercher…"
                className="h-9 pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          {isLoading ? (
            <div className="p-4 text-center text-muted-foreground">Chargement...</div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">Aucun utilisateur</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox />
                  </TableHead>
                  <TableHead>Nom</TableHead>
                  <TableHead>Rôle</TableHead>
                  <TableHead>Institution</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((u) => (
                  <TableRow key={u.user_id}>
                    <TableCell>
                      <Checkbox />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                            {(u.full_name || "U")
                              .split(" ")
                              .map((s) => s[0])
                              .slice(0, 2)
                              .join("")}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="text-[12.5px] font-medium">{u.full_name || "—"}</div>
                          <div className="text-[11px] text-muted-foreground">{u.user_id}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`text-[11px] ${roleColors[u.role] || "text-muted-foreground"}`}
                      >
                        {u.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-[12px] text-muted-foreground">
                      {u.institutions?.nom || "—"}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="p-1 text-muted-foreground hover:text-foreground">
                            <MoreHorizontal className="h-4 w-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => toast.info(`Modifier le rôle de ${u.full_name}`)}>
                            Modifier le rôle
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => toast.info(`Réinitialiser le mot de passe de ${u.full_name}`)}>
                            Réinitialiser le mot de passe
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => toast.success(`Compte de ${u.full_name} suspendu`)}
                            className="text-destructive focus:text-destructive"
                          >
                            Suspendre le compte
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      </div>

      <Dialog open={showAddUserDialog} onOpenChange={setShowAddUserDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nouvel utilisateur</DialogTitle>
            <DialogDescription>
              Enregistrez un nouveau membre de l'équipe et attribuez-lui un rôle d'accès.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddUser} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="user-name" className="text-[12.5px]">Nom complet</Label>
              <Input
                id="user-name"
                placeholder="Ex: Armel Ndip"
                value={newUserName}
                onChange={(e) => setNewUserName(e.target.value)}
                className="h-10"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="user-role" className="text-[12.5px]">Rôle</Label>
              <Select value={newUserRole} onValueChange={(v) => setNewUserRole(v as AppRole)}>
                <SelectTrigger className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="analyste">Analyste</SelectItem>
                  <SelectItem value="analyste_senior">Analyste senior</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="admin">Administrateur</SelectItem>
                  <SelectItem value="institution">Institution partenaire</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setShowAddUserDialog(false)}>
                Annuler
              </Button>
              <Button type="submit">Créer l'utilisateur</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
