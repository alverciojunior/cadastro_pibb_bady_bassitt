import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  MessageCircle,
  CheckCircle2,
  XCircle,
  Search,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Send,
  PartyPopper,
  UserCheck,
  UserCog,
  Crown,
  Wrench,
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";

const MESSAGE_TYPE_LABELS: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  welcome: { label: "Boas-vindas", icon: <UserCheck size={13} />, color: "bg-blue-100 text-blue-700" },
  update: { label: "Atualização", icon: <UserCog size={13} />, color: "bg-purple-100 text-purple-700" },
  birthday: { label: "Aniversário", icon: <PartyPopper size={13} />, color: "bg-pink-100 text-pink-700" },
  leadership: { label: "Liderança", icon: <Crown size={13} />, color: "bg-amber-100 text-amber-700" },
  test: { label: "Teste", icon: <Wrench size={13} />, color: "bg-gray-100 text-gray-700" },
  manual: { label: "Manual", icon: <Send size={13} />, color: "bg-teal-100 text-teal-700" },
};

function getTypeInfo(type: string) {
  return MESSAGE_TYPE_LABELS[type] ?? { label: type, icon: <MessageCircle size={13} />, color: "bg-gray-100 text-gray-600" };
}

function formatPhone(phone: string) {
  const d = phone.replace(/\D/g, "");
  if (d.length === 13) return `+${d.slice(0, 2)} (${d.slice(2, 4)}) ${d.slice(4, 9)}-${d.slice(9)}`;
  if (d.length === 12) return `+${d.slice(0, 2)} (${d.slice(2, 4)}) ${d.slice(4, 8)}-${d.slice(8)}`;
  return phone;
}

export default function WhatsappHistorico() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<"all" | "sent" | "failed">("all");
  const [messageType, setMessageType] = useState("all");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");

  const { data, isLoading, refetch } = trpc.whatsapp.messageHistory.useQuery({
    page,
    pageSize: 30,
    status,
    messageType: messageType === "all" ? undefined : messageType,
    search: search || undefined,
  });

  const { data: stats } = trpc.whatsapp.messageStats.useQuery();

  const handleSearch = () => {
    setSearch(searchInput);
    setPage(1);
  };

  const handleFilterChange = () => setPage(1);

  return (
    <DashboardLayout>
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <MessageCircle className="text-green-600" size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-primary">Histórico de Mensagens</h1>
              <p className="text-muted-foreground text-sm">Todos os disparos realizados via WhatsApp</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
            <RefreshCw size={15} className={isLoading ? "animate-spin" : ""} />
            Atualizar
          </Button>
        </div>

        {/* Cards de estatísticas */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-5 pb-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Total enviado</p>
                <p className="text-3xl font-bold text-primary">{stats.total}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-5 pb-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Entregues</p>
                <p className="text-3xl font-bold text-green-600">{stats.sent}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-5 pb-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Falhas</p>
                <p className="text-3xl font-bold text-destructive">{stats.failed}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-5 pb-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Taxa de entrega</p>
                <p className="text-3xl font-bold text-primary">
                  {stats.total > 0 ? `${Math.round((stats.sent / stats.total) * 100)}%` : "—"}
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Por tipo */}
        {stats && Object.keys(stats.byType).length > 0 && (
          <div className="flex flex-wrap gap-2">
            {Object.entries(stats.byType).map(([type, count]) => {
              const info = getTypeInfo(type);
              return (
                <span
                  key={type}
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${info.color}`}
                >
                  {info.icon}
                  {info.label}: {count}
                </span>
              );
            })}
          </div>
        )}

        <Separator />

        {/* Filtros */}
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex gap-2 flex-1 min-w-[200px]">
            <Input
              placeholder="Buscar por nome ou telefone..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="flex-1"
            />
            <Button variant="outline" size="icon" onClick={handleSearch}>
              <Search size={16} />
            </Button>
          </div>

          <Select
            value={status}
            onValueChange={(v) => { setStatus(v as any); handleFilterChange(); }}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              <SelectItem value="sent">Entregues</SelectItem>
              <SelectItem value="failed">Falhas</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={messageType}
            onValueChange={(v) => { setMessageType(v); handleFilterChange(); }}
          >
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os tipos</SelectItem>
              <SelectItem value="welcome">Boas-vindas</SelectItem>
              <SelectItem value="update">Atualização</SelectItem>
              <SelectItem value="birthday">Aniversário</SelectItem>
              <SelectItem value="leadership">Liderança</SelectItem>
              <SelectItem value="test">Teste</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Tabela de mensagens */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              {data ? `${data.total} mensagem(ns) encontrada(s)` : "Carregando..."}
            </CardTitle>
            {data && data.totalPages > 1 && (
              <CardDescription>
                Página {data.page} de {data.totalPages}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-16 text-muted-foreground">
                <RefreshCw size={20} className="animate-spin mr-2" />
                Carregando histórico...
              </div>
            ) : !data || data.messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
                <MessageCircle size={36} className="opacity-30" />
                <p className="text-sm">Nenhuma mensagem encontrada</p>
                {(search || status !== "all" || messageType !== "all") && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => { setSearch(""); setSearchInput(""); setStatus("all"); setMessageType("all"); setPage(1); }}
                  >
                    Limpar filtros
                  </Button>
                )}
              </div>
            ) : (
              <div className="divide-y">
                {data.messages.map((msg) => {
                  const typeInfo = getTypeInfo(msg.messageType);
                  const sentDate = new Date(msg.sentAt);
                  return (
                    <div key={msg.id} className="px-5 py-4 hover:bg-muted/40 transition-colors">
                      <div className="flex items-start gap-3">
                        {/* Status icon */}
                        <div className="mt-0.5 shrink-0">
                          {msg.status === "sent" ? (
                            <CheckCircle2 size={18} className="text-green-500" />
                          ) : (
                            <XCircle size={18} className="text-destructive" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          {/* Linha 1: nome + telefone + tipo + data */}
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <span className="font-medium text-sm truncate">
                              {msg.memberName || "—"}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {formatPhone(msg.phone)}
                            </span>
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${typeInfo.color}`}
                            >
                              {typeInfo.icon}
                              {typeInfo.label}
                            </span>
                            <span className="text-xs text-muted-foreground ml-auto">
                              {sentDate.toLocaleDateString("pt-BR")} às{" "}
                              {sentDate.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                            </span>
                          </div>

                          {/* Conteúdo da mensagem (preview) */}
                          <p className="text-sm text-muted-foreground line-clamp-2 whitespace-pre-line">
                            {msg.messageContent}
                          </p>

                          {/* Erro se falhou */}
                          {msg.status === "failed" && msg.errorMessage && (
                            <p className="text-xs text-destructive mt-1 bg-destructive/5 px-2 py-1 rounded">
                              Erro: {msg.errorMessage}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Paginação */}
        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-center gap-3">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft size={16} />
              Anterior
            </Button>
            <span className="text-sm text-muted-foreground">
              {page} / {data.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= data.totalPages}
              onClick={() => setPage((p) => p + 1)}
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
