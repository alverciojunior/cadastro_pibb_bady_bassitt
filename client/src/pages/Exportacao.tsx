import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Download, FileText, Table2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function Exportacao() {
  const [selectedReport, setSelectedReport] = useState<"membros" | "frequencia">("membros");
  const [selectedFilter, setSelectedFilter] = useState<"todos" | "ativos" | "inativos">("todos");
  const [selectedService, setSelectedService] = useState<string>("");
  const [isExporting, setIsExporting] = useState(false);

  const { data: services } = trpc.attendance.listServices.useQuery();

  const generateMembersCSV = trpc.export.generateMembersCSV.useQuery(
    { filter: selectedFilter },
    { enabled: false }
  );

  const generateAttendanceCSV = trpc.export.generateAttendanceCSV.useQuery(
    {
      serviceId: selectedService ? parseInt(selectedService) : undefined,
    },
    { enabled: false }
  );

  const handleExportMembers = async () => {
    setIsExporting(true);
    try {
      const result = await generateMembersCSV.refetch();
      if (result.data) {
        const element = document.createElement("a");
        const file = new Blob([result.data.csv], { type: "text/csv;charset=utf-8;" });
        element.href = URL.createObjectURL(file);
        element.download = result.data.filename;
        element.click();
        toast.success("Relatório de membros exportado com sucesso!");
      }
    } catch (error) {
      toast.error("Erro ao exportar relatório de membros");
      console.error(error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportAttendance = async () => {
    if (!selectedService) {
      toast.error("Selecione um culto para exportar frequência");
      return;
    }

    setIsExporting(true);
    try {
      const result = await generateAttendanceCSV.refetch();
      if (result.data) {
        const element = document.createElement("a");
        const file = new Blob([result.data.csv], { type: "text/csv;charset=utf-8;" });
        element.href = URL.createObjectURL(file);
        element.download = result.data.filename;
        element.click();
        toast.success("Relatório de frequência exportado com sucesso!");
      }
    } catch (error) {
      toast.error("Erro ao exportar relatório de frequência");
      console.error(error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Download className="h-8 w-8" />
          Exportar Relatórios
        </h1>
        <p className="text-muted-foreground mt-2">
          Exporte dados de membros e frequência em formato CSV/Excel
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Exportar Membros */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Table2 className="h-5 w-5" />
              Relatório de Membros
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="filter">Filtro</Label>
              <Select value={selectedFilter} onValueChange={(v: any) => setSelectedFilter(v)}>
                <SelectTrigger id="filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os membros</SelectItem>
                  <SelectItem value="ativos">Apenas ativos</SelectItem>
                  <SelectItem value="inativos">Apenas inativos</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="bg-muted p-3 rounded-md text-sm space-y-2">
              <p className="font-semibold">Dados incluídos:</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>Dados pessoais (nome, data de nascimento, gênero)</li>
                <li>Contato (telefone, WhatsApp, email)</li>
                <li>Endereço completo</li>
                <li>Informações da igreja (batismo, ministério, frequência)</li>
                <li>Dados do cônjuge</li>
              </ul>
            </div>

            <Button
              onClick={handleExportMembers}
              disabled={isExporting}
              className="w-full"
            >
              <Download className="h-4 w-4 mr-2" />
              {isExporting ? "Exportando..." : "Exportar em CSV"}
            </Button>
          </CardContent>
        </Card>

        {/* Exportar Frequência */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Relatório de Frequência
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="service">Culto/Serviço</Label>
              <Select value={selectedService} onValueChange={setSelectedService}>
                <SelectTrigger id="service">
                  <SelectValue placeholder="Selecione um culto" />
                </SelectTrigger>
                <SelectContent>
                  {services?.map((service) => (
                    <SelectItem key={service.id} value={service.id.toString()}>
                      {service.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="bg-muted p-3 rounded-md text-sm space-y-2">
              <p className="font-semibold">Dados incluídos:</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>Nome do membro</li>
                <li>Culto/serviço</li>
                <li>Data da frequência</li>
                <li>Status (presente/ausente)</li>
                <li>Observações</li>
              </ul>
            </div>

            <Button
              onClick={handleExportAttendance}
              disabled={isExporting || !selectedService}
              className="w-full"
            >
              <Download className="h-4 w-4 mr-2" />
              {isExporting ? "Exportando..." : "Exportar em CSV"}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Informações */}
      <Card>
        <CardHeader>
          <CardTitle>Informações sobre Exportação</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div>
            <p className="font-semibold mb-1">Formato CSV</p>
            <p className="text-muted-foreground">
              Os arquivos são exportados em formato CSV (Comma-Separated Values), compatível com Excel, Google Sheets e outras aplicações de planilha.
            </p>
          </div>
          <div>
            <p className="font-semibold mb-1">Codificação</p>
            <p className="text-muted-foreground">
              Os arquivos utilizam codificação UTF-8 com suporte completo a caracteres especiais e acentuação.
            </p>
          </div>
          <div>
            <p className="font-semibold mb-1">Privacidade</p>
            <p className="text-muted-foreground">
              Os dados exportados contêm informações sensíveis. Mantenha os arquivos em local seguro e compartilhe apenas com pessoas autorizadas.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
