import { useParams, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Clock } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function MembroHistorico() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const memberId = parseInt(id || "0");

  const { data: historyData, isLoading } = trpc.history.getMemberHistory.useQuery(
    { memberId, page: 1, pageSize: 50 },
    { enabled: !!memberId }
  );

  const getChangeTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      create: "Criação",
      update: "Atualização",
      classify: "Classificação",
    };
    return labels[type] || type;
  };

  const getChangeTypeColor = (type: string) => {
    const colors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      create: "default",
      update: "secondary",
      classify: "outline",
    };
    return colors[type] || "default";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(`/membros/${memberId}`)}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Histórico de Alterações</h1>
          <p className="text-muted-foreground">Todas as mudanças realizadas neste membro</p>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Carregando histórico...</p>
        </div>
      ) : !historyData?.items || historyData.items.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Clock className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">Nenhuma alteração registrada</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {historyData.items.map((item) => (
            <Card key={item.id}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Badge variant={getChangeTypeColor(item.changeType)}>
                        {getChangeTypeLabel(item.changeType)}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {format(new Date(item.createdAt), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", {
                          locale: ptBR,
                        })}
                      </span>
                    </div>

                    {item.changeDescription && (
                      <p className="text-sm mb-3">{item.changeDescription}</p>
                    )}

                    {item.fieldName && (
                      <div className="bg-muted p-3 rounded-md text-sm space-y-2">
                        <div>
                          <span className="font-semibold">Campo:</span> {item.fieldName}
                        </div>
                        {item.oldValue && (
                          <div>
                            <span className="font-semibold">Anterior:</span>{" "}
                            <span className="line-through text-destructive">{item.oldValue}</span>
                          </div>
                        )}
                        {item.newValue && (
                          <div>
                            <span className="font-semibold">Novo:</span>{" "}
                            <span className="text-green-600">{item.newValue}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
