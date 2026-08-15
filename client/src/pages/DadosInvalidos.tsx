import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, CheckCircle2, ChevronLeft, RefreshCw } from "lucide-react";
import { Link } from "wouter";

export default function DadosInvalidos() {
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState("invalid");

  // Busca membros com dados inválidos
  const { data: invalidMembers = [], isLoading: invalidLoading, refetch: refetchInvalid } = trpc.duplicates.getInvalidMembers.useQuery();

  // Busca membros com duplicatas
  const { data: duplicateMembers = [], isLoading: duplicateLoading, refetch: refetchDuplicates } = trpc.duplicates.getDuplicateMembers.useQuery();

  const handleRefresh = () => {
    if (activeTab === "invalid") {
      refetchInvalid();
    } else {
      refetchDuplicates();
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard">
              <Button variant="ghost" size="icon">
                <ChevronLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-serif font-bold text-primary">Dados Inválidos</h1>
              <p className="text-muted-foreground">Relatório de membros com dados incompletos ou duplicados</p>
            </div>
          </div>
          <Button onClick={handleRefresh} variant="outline" size="sm" className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Atualizar
          </Button>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="invalid" className="gap-2">
              <AlertCircle className="w-4 h-4" />
              Dados Inválidos ({invalidMembers.length})
            </TabsTrigger>
            <TabsTrigger value="duplicates" className="gap-2">
              <CheckCircle2 className="w-4 h-4" />
              Duplicatas ({duplicateMembers.length})
            </TabsTrigger>
          </TabsList>

          {/* Tab: Dados Inválidos */}
          <TabsContent value="invalid" className="space-y-4">
            {invalidLoading ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Carregando...</p>
              </div>
            ) : invalidMembers.length === 0 ? (
              <Card className="p-8 text-center">
                <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto mb-3" />
                <p className="text-lg font-semibold">Todos os dados estão válidos!</p>
                <p className="text-muted-foreground">Nenhum membro com dados incompletos foi encontrado.</p>
              </Card>
            ) : (
              <div className="space-y-3">
                {invalidMembers.map((member: any) => (
                  <Card key={member.id} className="p-4 border-l-4 border-l-red-500">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-primary">{member.fullName}</h3>
                        <div className="mt-2 space-y-1">
                          {member.issues.map((issue: string, idx: number) => (
                            <p key={idx} className="text-sm text-red-600 flex items-center gap-2">
                              <span className="inline-block w-1.5 h-1.5 bg-red-600 rounded-full" />
                              {issue}
                            </p>
                          ))}
                        </div>
                        <div className="mt-3 text-xs text-muted-foreground space-y-1">
                          {member.cpf && <p>CPF: {member.cpf || "—"}</p>}
                          {member.phone && <p>Telefone: {member.phone || "—"}</p>}
                          {member.email && <p>Email: {member.email || "—"}</p>}
                        </div>
                      </div>
                      <Link href={`/membros/${member.id}/editar`}>
                        <Button variant="outline" size="sm">
                          Editar
                        </Button>
                      </Link>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Tab: Duplicatas */}
          <TabsContent value="duplicates" className="space-y-4">
            {duplicateLoading ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Carregando...</p>
              </div>
            ) : duplicateMembers.length === 0 ? (
              <Card className="p-8 text-center">
                <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto mb-3" />
                <p className="text-lg font-semibold">Nenhuma duplicata encontrada!</p>
                <p className="text-muted-foreground">Todos os CPFs e telefones são únicos.</p>
              </Card>
            ) : (
              <div className="space-y-3">
                {duplicateMembers.map((member: any) => (
                  <Card key={member.id} className="p-4 border-l-4 border-l-yellow-500">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-primary">{member.fullName}</h3>
                        <div className="mt-2 space-y-1 text-sm">
                          <p className="text-yellow-600 flex items-center gap-2">
                            <span className="inline-block w-1.5 h-1.5 bg-yellow-600 rounded-full" />
                            {member.duplicateType === "cpf" ? "CPF duplicado" : "Telefone duplicado"}
                          </p>
                          {member.duplicateType === "cpf" && member.cpf && (
                            <p className="text-muted-foreground">CPF: {member.cpf}</p>
                          )}
                          {member.duplicateType === "phone" && member.phone && (
                            <p className="text-muted-foreground">Telefone: {member.phone}</p>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                          Cadastrado em: {new Date(member.createdAt).toLocaleDateString("pt-BR")}
                        </p>
                      </div>
                      <Link href={`/membros/${member.id}/editar`}>
                        <Button variant="outline" size="sm">
                          Editar
                        </Button>
                      </Link>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
