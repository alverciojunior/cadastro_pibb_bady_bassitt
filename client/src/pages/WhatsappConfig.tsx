import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Link } from "wouter";
import {
  MessageCircle,
  Wifi,
  WifiOff,
  QrCode,
  Send,
  Bell,
  Settings,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Info,
  History,
} from "lucide-react";

const configSchema = z.object({
  evolutionApiUrl: z.string().url("URL inválida — ex: https://sua-api.com"),
  evolutionApiKey: z.string().min(1, "API Key obrigatória"),
  instanceName: z.string().min(1, "Nome da instância obrigatório"),
  leadershipPhone: z.string().optional(),
  welcomeMessage: z.string().optional(),
  birthdayMessage: z.string().optional(),
  welcomeMessageEnabled: z.boolean(),
  birthdayMessageEnabled: z.boolean(),
});

type ConfigForm = z.infer<typeof configSchema>;

export default function WhatsappConfig() {
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [testPhone, setTestPhone] = useState("");
  const [testMessage, setTestMessage] = useState("Olá! Esta é uma mensagem de teste da PIB Bady Bassitt. 🙏");
  const [birthdayCronActive, setBirthdayCronActive] = useState(false);

  const { data: config, refetch } = trpc.whatsapp.getConfig.useQuery();

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<ConfigForm>({
    resolver: zodResolver(configSchema),
    defaultValues: {
      instanceName: "pibb",
      welcomeMessageEnabled: true,
      birthdayMessageEnabled: true,
    },
  });

  useEffect(() => {
    if (config) {
      reset({
        evolutionApiUrl: config.evolutionApiUrl,
        evolutionApiKey: "",
        instanceName: config.instanceName,
        leadershipPhone: config.leadershipPhone || "",
        welcomeMessage: config.welcomeMessage || "",
        birthdayMessage: config.birthdayMessage || "",
        welcomeMessageEnabled: config.welcomeMessageEnabled,
        birthdayMessageEnabled: config.birthdayMessageEnabled,
      });
      setBirthdayCronActive(!!config.birthdayCronTaskUid);
    }
  }, [config, reset]);

  const saveConfig = trpc.whatsapp.saveConfig.useMutation({
    onSuccess: () => {
      toast.success("Configuração salva com sucesso!");
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const checkConnection = trpc.whatsapp.checkConnection.useMutation({
    onSuccess: (data) => {
      if (data.connected) {
        toast.success("WhatsApp conectado com sucesso!");
      } else {
        toast.warning(`WhatsApp desconectado (estado: ${data.state})`);
      }
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const getQrCode = trpc.whatsapp.getQrCode.useMutation({
    onSuccess: (data) => {
      if (data.qrcode) {
        setQrCode(data.qrcode);
        toast.info("QR Code gerado! Escaneie com seu WhatsApp.");
      } else {
        toast.warning("QR Code não disponível. A instância pode já estar conectada.");
      }
    },
    onError: (err) => toast.error(err.message),
  });

  const sendTest = trpc.whatsapp.sendTest.useMutation({
    onSuccess: () => toast.success("Mensagem de teste enviada!"),
    onError: (err) => toast.error(err.message),
  });

  const toggleCron = trpc.whatsapp.toggleBirthdayCron.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      setBirthdayCronActive(!birthdayCronActive);
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const onSubmit = (data: ConfigForm) => {
    saveConfig.mutate(data);
  };

  const isConnected = config?.isConnected;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-green-100 rounded-lg">
          <MessageCircle className="text-green-600" size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-primary">Integração WhatsApp</h1>
          <p className="text-muted-foreground text-sm">
            Configure o envio automático de mensagens via Evolution API
          </p>
        </div>
        {config && (
          <Badge
            variant={isConnected ? "default" : "secondary"}
            className={`ml-auto flex items-center gap-1 ${isConnected ? "bg-green-600" : ""}`}
          >
            {isConnected ? <Wifi size={12} /> : <WifiOff size={12} />}
            {isConnected ? "Conectado" : "Desconectado"}
          </Badge>
        )}
        <Link href="/whatsapp/historico">
          <Button variant="outline" size="sm" className="flex items-center gap-1.5">
            <History size={15} />
            Ver Histórico
          </Button>
        </Link>
      </div>

      {/* Aviso sobre deploy */}
      <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
        <Info size={16} className="mt-0.5 shrink-0" />
        <div>
          <strong>Atenção:</strong> Para ativar as notificações automáticas de aniversariantes, o sistema precisa estar{" "}
          <strong>publicado (Publish)</strong>. Salve as configurações e publique o site antes de ativar o cron.
        </div>
      </div>

      {/* Configuração da API */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings size={18} />
            Configuração da Evolution API
          </CardTitle>
          <CardDescription>
            Informe os dados da sua instância Evolution API para habilitar o envio de mensagens.
            Você pode usar serviços como{" "}
            <a href="https://evolution-api.com" target="_blank" rel="noopener noreferrer" className="underline text-primary">
              Evolution API
            </a>{" "}
            hospedada em seu servidor.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="evolutionApiUrl">URL da Evolution API *</Label>
                <Input
                  id="evolutionApiUrl"
                  placeholder="https://sua-evolution-api.com"
                  {...register("evolutionApiUrl")}
                />
                {errors.evolutionApiUrl && (
                  <p className="text-destructive text-xs">{errors.evolutionApiUrl.message}</p>
                )}
              </div>

              <div className="space-y-1">
                <Label htmlFor="evolutionApiKey">API Key *</Label>
                <Input
                  id="evolutionApiKey"
                  type="password"
                  placeholder={config ? "••••••••••••••••" : "Sua API Key"}
                  {...register("evolutionApiKey")}
                />
                {errors.evolutionApiKey && (
                  <p className="text-destructive text-xs">{errors.evolutionApiKey.message}</p>
                )}
              </div>

              <div className="space-y-1">
                <Label htmlFor="instanceName">Nome da Instância *</Label>
                <Input
                  id="instanceName"
                  placeholder="pibb"
                  {...register("instanceName")}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="leadershipPhone">
                  Telefone da Liderança (para alertas)
                </Label>
                <Input
                  id="leadershipPhone"
                  placeholder="11999999999"
                  {...register("leadershipPhone")}
                />
                <p className="text-xs text-muted-foreground">Receberá a lista de aniversariantes diariamente</p>
              </div>
            </div>

            <Separator />

            {/* Mensagem de boas-vindas */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Mensagem de Boas-vindas</Label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Ativar</span>
                  <Switch
                    checked={watch("welcomeMessageEnabled")}
                    onCheckedChange={(v) => setValue("welcomeMessageEnabled", v)}
                  />
                </div>
              </div>
              <Textarea
                placeholder="Olá, {nome}! Seu cadastro na PIB Bady Bassitt foi realizado com sucesso! 🙏"
                rows={3}
                {...register("welcomeMessage")}
              />
              <p className="text-xs text-muted-foreground">
                Enviada automaticamente ao membro quando um novo cadastro é realizado.
              </p>
            </div>

            {/* Mensagem de aniversário */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Mensagem de Aniversário</Label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Ativar</span>
                  <Switch
                    checked={watch("birthdayMessageEnabled")}
                    onCheckedChange={(v) => setValue("birthdayMessageEnabled", v)}
                  />
                </div>
              </div>
              <Textarea
                placeholder="🎂 Feliz Aniversário! A família da PIB Bady Bassitt deseja um dia muito abençoado!"
                rows={3}
                {...register("birthdayMessage")}
              />
              <p className="text-xs text-muted-foreground">
                Enviada automaticamente para cada aniversariante no dia do aniversário.
              </p>
            </div>

            <Button type="submit" disabled={saveConfig.isPending} className="w-full md:w-auto">
              {saveConfig.isPending ? "Salvando..." : "Salvar Configurações"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Conexão e QR Code */}
      {config && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <QrCode size={18} />
              Conexão do WhatsApp
            </CardTitle>
            <CardDescription>
              Conecte seu número de WhatsApp escaneando o QR Code abaixo.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-3">
              <Button
                variant="outline"
                onClick={() => checkConnection.mutate()}
                disabled={checkConnection.isPending}
              >
                <RefreshCw size={16} className={checkConnection.isPending ? "animate-spin" : ""} />
                Verificar Conexão
              </Button>
              <Button
                variant="outline"
                onClick={() => getQrCode.mutate()}
                disabled={getQrCode.isPending}
              >
                <QrCode size={16} />
                {getQrCode.isPending ? "Gerando..." : "Gerar QR Code"}
              </Button>
            </div>

            {qrCode && (
              <div className="flex flex-col items-center gap-3 p-6 border-2 border-dashed border-green-300 rounded-lg bg-green-50">
                <p className="text-sm font-medium text-green-800">
                  Escaneie o QR Code com seu WhatsApp
                </p>
                <img
                  src={qrCode.startsWith("data:") ? qrCode : `data:image/png;base64,${qrCode}`}
                  alt="QR Code WhatsApp"
                  className="w-56 h-56 object-contain border rounded-lg bg-white p-2"
                />
                <p className="text-xs text-muted-foreground text-center">
                  Abra o WhatsApp → Dispositivos Conectados → Conectar dispositivo
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => checkConnection.mutate()}
                >
                  <CheckCircle2 size={14} />
                  Confirmar Conexão
                </Button>
              </div>
            )}

            {isConnected && (
              <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-green-800 text-sm">
                <CheckCircle2 size={16} />
                WhatsApp conectado e pronto para enviar mensagens!
              </div>
            )}

            {config && !isConnected && !qrCode && (
              <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm">
                <AlertCircle size={16} />
                WhatsApp não conectado. Gere o QR Code para conectar.
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Teste de envio */}
      {config && isConnected && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send size={18} />
              Testar Envio
            </CardTitle>
            <CardDescription>Envie uma mensagem de teste para verificar se está funcionando.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Número de destino</Label>
                <Input
                  placeholder="11999999999"
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Mensagem</Label>
              <Textarea
                rows={2}
                value={testMessage}
                onChange={(e) => setTestMessage(e.target.value)}
              />
            </div>
            <Button
              onClick={() => sendTest.mutate({ phone: testPhone, message: testMessage })}
              disabled={sendTest.isPending || !testPhone}
            >
              <Send size={16} />
              {sendTest.isPending ? "Enviando..." : "Enviar Teste"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Notificações automáticas */}
      {config && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell size={18} />
              Notificações Automáticas de Aniversariantes
            </CardTitle>
            <CardDescription>
              Todos os dias às 7h, o sistema enviará automaticamente mensagens de parabéns para os
              aniversariantes e um resumo para a liderança.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <p className="font-medium">Notificação diária de aniversariantes</p>
                <p className="text-sm text-muted-foreground">
                  Executa todos os dias às 7h (horário de Brasília)
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant={birthdayCronActive ? "default" : "secondary"} className={birthdayCronActive ? "bg-green-600" : ""}>
                  {birthdayCronActive ? "Ativo" : "Inativo"}
                </Badge>
                <Switch
                  checked={birthdayCronActive}
                  onCheckedChange={(v) => toggleCron.mutate({ enable: v })}
                  disabled={toggleCron.isPending}
                />
              </div>
            </div>

            {!isConnected && birthdayCronActive && (
              <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm">
                <AlertCircle size={16} />
                O cron está ativo, mas o WhatsApp não está conectado. As mensagens não serão enviadas até que o WhatsApp seja conectado.
              </div>
            )}

            {birthdayCronActive && (
              <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-800 text-sm">
                <Info size={16} />
                Você pode visualizar e gerenciar todas as tarefas agendadas no painel de configurações do Manus (aba Schedules).
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
