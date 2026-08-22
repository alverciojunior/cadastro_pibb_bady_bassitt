import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, CheckCircle2, KeyRound, Mail, Save, ShieldCheck } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

const optionalEmail = z.union([z.string().trim().email("Informe um e-mail válido"), z.literal("")]);

const emailAlertsSchema = z.object({
  primaryEmail: z.string().trim().email("Informe o e-mail principal"),
  optionalEmail1: optionalEmail,
  optionalEmail2: optionalEmail,
  optionalEmail3: optionalEmail,
  optionalEmail4: optionalEmail,
});

const emailServiceSchema = z.object({
  emailFrom: optionalEmail,
  resendApiKey: z.string().trim().max(512, "A chave informada é muito longa"),
});

type EmailAlertsForm = z.infer<typeof emailAlertsSchema>;
type EmailServiceForm = z.infer<typeof emailServiceSchema>;

const blankValues: EmailAlertsForm = {
  primaryEmail: "",
  optionalEmail1: "",
  optionalEmail2: "",
  optionalEmail3: "",
  optionalEmail4: "",
};

const optionalFields = [
  { name: "optionalEmail1", label: "Destinatário adicional 1" },
  { name: "optionalEmail2", label: "Destinatário adicional 2" },
  { name: "optionalEmail3", label: "Destinatário adicional 3" },
  { name: "optionalEmail4", label: "Destinatário adicional 4" },
] as const;

export default function EmailAlertsConfig() {
  const utils = trpc.useUtils();
  const { data: settings, isLoading } = trpc.emailAlerts.getSettings.useQuery();
  const { data: serviceConfig, isLoading: isLoadingService } = trpc.emailAlerts.getServiceConfig.useQuery();
  const form = useForm<EmailAlertsForm>({
    resolver: zodResolver(emailAlertsSchema),
    defaultValues: blankValues,
  });
  const serviceForm = useForm<EmailServiceForm>({
    resolver: zodResolver(emailServiceSchema),
    defaultValues: { emailFrom: "", resendApiKey: "" },
  });

  useEffect(() => {
    if (settings) form.reset(settings);
  }, [form, settings]);

  useEffect(() => {
    if (serviceConfig) serviceForm.reset({ emailFrom: serviceConfig.emailFrom ?? "", resendApiKey: "" });
  }, [serviceConfig, serviceForm]);

  const saveSettings = trpc.emailAlerts.saveSettings.useMutation({
    onSuccess: () => {
      toast.success("Destinatários de alertas salvos com sucesso.");
      utils.emailAlerts.getSettings.invalidate();
    },
    onError: (error) => toast.error(error.message || "Não foi possível salvar os destinatários."),
  });

  const saveService = trpc.emailAlerts.saveServiceConfig.useMutation({
    onSuccess: () => {
      toast.success("Configuração do serviço de e-mail salva com sucesso.");
      utils.emailAlerts.getServiceConfig.invalidate();
      serviceForm.setValue("resendApiKey", "");
    },
    onError: (error) => toast.error(error.message || "Não foi possível salvar a configuração do serviço."),
  });

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-3xl space-y-6 p-2 sm:p-6">
        <header className="flex items-start gap-3">
          <div className="rounded-xl bg-blue-100 p-3 text-blue-700">
            <Mail className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-primary">Alertas por e-mail</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Defina os destinatários e a conta que será usada para os avisos de novos cadastros.
            </p>
          </div>
        </header>

        <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-950">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-blue-700" />
          <p>
            Informe pelo menos um destinatário. Os quatro campos adicionais são opcionais e podem ser preenchidos ou alterados quando necessário.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Destinatários da liderança
            </CardTitle>
            <CardDescription>
              O e-mail principal é obrigatório. Esta lista será usada pelos alertas de novos cadastros.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-6" onSubmit={form.handleSubmit((values) => saveSettings.mutate(values))} noValidate>
              <div className="space-y-2">
                <Label htmlFor="primaryEmail">E-mail principal *</Label>
                <Input
                  id="primaryEmail"
                  type="email"
                  autoComplete="email"
                  placeholder="pastor@igreja.org.br"
                  aria-invalid={!!form.formState.errors.primaryEmail}
                  {...form.register("primaryEmail")}
                />
                {form.formState.errors.primaryEmail && (
                  <p className="text-sm text-destructive">{form.formState.errors.primaryEmail.message}</p>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {optionalFields.map((field) => (
                  <div className="space-y-2" key={field.name}>
                    <Label htmlFor={field.name}>{field.label}</Label>
                    <Input
                      id={field.name}
                      type="email"
                      autoComplete="email"
                      placeholder="lideranca@igreja.org.br"
                      aria-invalid={!!form.formState.errors[field.name]}
                      {...form.register(field.name)}
                    />
                    {form.formState.errors[field.name] && (
                      <p className="text-sm text-destructive">{form.formState.errors[field.name]?.message}</p>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-5">
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  Até cinco destinatários podem ser mantidos nesta configuração.
                </p>
                <Button type="submit" disabled={isLoading || saveSettings.isPending}>
                  <Save className="h-4 w-4" />
                  {saveSettings.isPending ? "Salvando..." : "Salvar destinatários"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5" />
              Serviço de envio
            </CardTitle>
            <CardDescription>
              Configure o remetente verificado e a chave da Resend. A chave é protegida no servidor e nunca volta a ser exibida na tela.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-5" onSubmit={serviceForm.handleSubmit((values) => saveService.mutate(values))} noValidate>
              <div className="space-y-2">
                <Label htmlFor="emailFrom">Remetente verificado</Label>
                <Input
                  id="emailFrom"
                  type="email"
                  autoComplete="email"
                  placeholder="alertas@igreja.org.br"
                  aria-invalid={!!serviceForm.formState.errors.emailFrom}
                  {...serviceForm.register("emailFrom")}
                />
                <p className="text-xs text-muted-foreground">Use um e-mail de domínio verificado no serviço de envio.</p>
                {serviceForm.formState.errors.emailFrom && (
                  <p className="text-sm text-destructive">{serviceForm.formState.errors.emailFrom.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="resendApiKey" className="flex items-center gap-2">
                  <KeyRound className="h-4 w-4" />
                  Chave da Resend
                </Label>
                <Input
                  id="resendApiKey"
                  type="password"
                  autoComplete="new-password"
                  placeholder={serviceConfig?.hasResendApiKey ? "Chave já configurada — preencha apenas para trocar" : "re_..."}
                  {...serviceForm.register("resendApiKey")}
                />
                <p className="text-xs text-muted-foreground">
                  {serviceConfig?.hasResendApiKey
                    ? "Uma chave já está configurada. Deixe em branco para mantê-la."
                    : "Cole a chave de API quando estiver disponível."}
                </p>
                {serviceForm.formState.errors.resendApiKey && (
                  <p className="text-sm text-destructive">{serviceForm.formState.errors.resendApiKey.message}</p>
                )}
              </div>

              <div className="flex justify-end border-t pt-5">
                <Button type="submit" variant="outline" disabled={isLoadingService || saveService.isPending}>
                  <Save className="h-4 w-4" />
                  {saveService.isPending ? "Salvando..." : "Salvar serviço de e-mail"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
