import { useState } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import {
  Search, User, Phone, Church, ChevronLeft, ChevronRight,
  AlertTriangle, Eye, Edit, UserX, Filter
} from "lucide-react";
import { toast } from "sonner";

const MEMBER_TYPE_LABELS: Record<string, string> = {
  membro_ativo: "Família Ativa",
  frequentante: "Família Frequentante",
  visitante: "Visitante",
  afastado: "Afastado",
};

const MEMBER_TYPE_COLORS: Record<string, string> = {
  membro_ativo: "bg-green-100 text-green-800 border-green-200",
  frequentante: "bg-blue-100 text-blue-800 border-blue-200",
  visitante: "bg-amber-100 text-amber-800 border-amber-200",
  afastado: "bg-red-100 text-red-800 border-red-200",
};

export default function Membros() {
  const [search, setSearch] = useState("");
  const [memberType, setMemberType] = useState("");
  const [congregation, setCongregation] = useState("");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

  const { data, isLoading, refetch } = trpc.members.list.useQuery({
    search: search || undefined,
    memberType: memberType || undefined,
    congregation: congregation || undefined,
    page,
    pageSize: PAGE_SIZE,
  });

  const { data: options } = trpc.members.getOptions.useQuery();
  const deactivate = trpc.members.deactivate.useMutation({
    onSuccess: () => {
      toast.success("Membro desativado com sucesso.");
      refetch();
    },
  });

  const totalPages = Math.ceil((data?.total ?? 0) / PAGE_SIZE);

  const handleSearch = (v: string) => {
    setSearch(v);
    setPage(1);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-serif font-bold text-primary">Famílias</h1>
            <p className="text-muted-foreground">
              {data?.total ?? 0} registro(s) encontrado(s)
            </p>
          </div>
          <Link href="/cadastro">
            <Button className="bg-secondary hover:bg-secondary/90 text-secondary-foreground">
              + Novo Cadastro
            </Button>
          </Link>
        </div>

        {/* Filtros */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <Input
                  placeholder="Buscar por nome (titular/cônjuge), CPF ou telefone..."
                  value={search}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-10 h-11"
                />
              </div>

              <Select value={memberType} onValueChange={(v) => { setMemberType(v === "all" ? "" : v); setPage(1); }}>
                <SelectTrigger className="w-full sm:w-48 h-11">
                  <SelectValue placeholder="Situação" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as situações</SelectItem>
                  <SelectItem value="membro_ativo">Família Ativa</SelectItem>
                  <SelectItem value="frequentante">Família Frequentante</SelectItem>
                  <SelectItem value="visitante">Visitante</SelectItem>
                  <SelectItem value="afastado">Afastado</SelectItem>
                </SelectContent>
              </Select>

              <Select value={congregation} onValueChange={(v) => { setCongregation(v === "all" ? "" : v); setPage(1); }}>
                <SelectTrigger className="w-full sm:w-48 h-11">
                  <SelectValue placeholder="Congregação" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {options?.congregations?.map((c) => (
                    <SelectItem key={c} value={c!}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Lista */}
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-xl" />
            ))}
          </div>
        ) : data?.items.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <User size={48} className="mx-auto mb-4 text-muted-foreground/40" />
              <p className="text-lg font-medium text-muted-foreground">Nenhum membro encontrado</p>
              <p className="text-sm text-muted-foreground mt-1">
                Tente ajustar os filtros ou cadastre um novo membro.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {data?.items.map((member) => (
              <Card
                key={member.id}
                className="hover:shadow-md transition-shadow duration-200 border border-border/60"
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    {/* Avatar */}
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg shrink-0">
                      {member.fullName.charAt(0).toUpperCase()}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <h3 className="font-semibold text-base truncate">{member.fullName}</h3>
                        {member.hasDuplicate && (
                          <AlertTriangle size={14} className="text-amber-500 shrink-0" />
                        )}
                      </div>

                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                        {member.phone && (
                          <span className="flex items-center gap-1">
                            <Phone size={13} />
                            {member.phone}
                          </span>
                        )}
                        {member.congregation && (
                          <span className="flex items-center gap-1">
                            <Church size={13} />
                            {member.congregation}
                          </span>
                        )}
                        {member.ministry && (
                          <span className="text-xs">{member.ministry}</span>
                        )}
                      </div>
                    </div>

                    {/* Badge + Actions */}
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <Badge
                        variant="outline"
                        className={`text-xs ${MEMBER_TYPE_COLORS[member.memberType || "visitante"]}`}
                      >
                        {MEMBER_TYPE_LABELS[member.memberType || "visitante"]}
                      </Badge>

                      <div className="flex gap-1">
                        <Link href={`/membros/${member.id}`}>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <Eye size={15} />
                          </Button>
                        </Link>
                        <Link href={`/membros/${member.id}/editar`}>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <Edit size={15} />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Paginação */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(p - 1, 1))}
              disabled={page === 1}
            >
              <ChevronLeft size={16} />
              Anterior
            </Button>
            <span className="text-sm text-muted-foreground">
              Página {page} de {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
              disabled={page === totalPages}
            >
              Próxima
              <ChevronRight size={16} />
            </Button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
