import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Calendar, Users, CheckCircle2, XCircle } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function Frequencia() {
  const [selectedService, setSelectedService] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<string>(
    format(new Date(), "yyyy-MM-dd")
  );

  const { data: services } = trpc.attendance.listServices.useQuery();
  const { data: membros } = trpc.members.list.useQuery({ search: "", page: 1, pageSize: 1000 });
  const { data: attendanceData } = trpc.attendance.getServiceAttendance.useQuery(
    {
      serviceId: parseInt(selectedService || "0"),
      attendanceDate: selectedDate,
    },
    { enabled: !!selectedService }
  );

  const recordAttendanceMutation = trpc.attendance.recordAttendance.useMutation({
    onSuccess: () => {
      // Recarregar dados após sucesso
    },
  });

  const handleRecordAttendance = async (memberId: number, isPresent: boolean) => {
    if (!selectedService) return;

    try {
      await recordAttendanceMutation.mutateAsync({
        memberId,
        serviceId: parseInt(selectedService),
        attendanceDate: selectedDate,
        isPresent,
      });
    } catch (error) {
      console.error("Erro ao registrar frequência:", error);
    }
  };

  const dayOfWeekMap: Record<string, string> = {
    segunda: "Segunda-feira",
    terca: "Terça-feira",
    quarta: "Quarta-feira",
    quinta: "Quinta-feira",
    sexta: "Sexta-feira",
    sabado: "Sábado",
    domingo: "Domingo",
  };

  const getAttendanceStatus = (memberId: number) => {
    const record = attendanceData?.find((r) => r.memberId === memberId);
    return record?.isPresent ?? null;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Calendar className="h-8 w-8" />
          Frequência em Cultos
        </h1>
        <p className="text-muted-foreground mt-2">
          Registre e acompanhe a frequência dos membros nos cultos
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Selecionar Culto e Data</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="service">Culto/Serviço</Label>
              <Select value={selectedService} onValueChange={setSelectedService}>
                <SelectTrigger id="service">
                  <SelectValue placeholder="Selecione um culto" />
                </SelectTrigger>
                <SelectContent>
                  {services?.map((service) => (
                    <SelectItem key={service.id} value={service.id.toString()}>
                      {service.name} ({dayOfWeekMap[service.dayOfWeek]})
                      {service.time && ` - ${service.time}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="date">Data</Label>
              <Input
                id="date"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {selectedService && membros && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Registrar Frequência
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-2">
              {format(new Date(selectedDate), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </p>
          </CardHeader>
          <CardContent>
            {!membros.items || membros.items.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">
                  Nenhum membro cadastrado
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Membro</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {membros.items.map((membro) => {
                      const status = getAttendanceStatus(membro.id);
                      return (
                        <TableRow key={membro.id}>
                          <TableCell className="font-medium">{membro.fullName}</TableCell>
                          <TableCell>
                            {status === true && (
                              <Badge variant="default" className="gap-1">
                                <CheckCircle2 className="h-3 w-3" />
                                Presente
                              </Badge>
                            )}
                            {status === false && (
                              <Badge variant="secondary" className="gap-1">
                                <XCircle className="h-3 w-3" />
                                Ausente
                              </Badge>
                            )}
                            {status === null && (
                              <Badge variant="outline">Não registrado</Badge>
                            )}
                          </TableCell>
                          <TableCell className="space-x-2">
                            <Button
                              size="sm"
                              variant={status === true ? "default" : "outline"}
                              onClick={() =>
                                handleRecordAttendance(membro.id, true)
                              }
                              disabled={recordAttendanceMutation.isPending}
                            >
                              Presente
                            </Button>
                            <Button
                              size="sm"
                              variant={status === false ? "destructive" : "outline"}
                              onClick={() =>
                                handleRecordAttendance(membro.id, false)
                              }
                              disabled={recordAttendanceMutation.isPending}
                            >
                              Ausente
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
