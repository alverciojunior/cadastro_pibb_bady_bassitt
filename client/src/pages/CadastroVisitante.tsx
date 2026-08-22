import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "wouter";
import { CheckCircle2, ClipboardPenLine, Heart, Home, Loader2, Phone, UserRound } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { usePhoneMask } from "@/hooks/usePhoneMask";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const LOGO_URL = "/manus-storage/pibb_logo_977c9cca.png";

const visitorSchema = z.object({
  fullName: z.string().trim().min(2, "Informe seu nome completo."),
  phone: z
    .string()
    .refine((value) => value.replace(/\D/g, "").length >= 10, "Informe um telefone válido com DDD."),
});

type VisitorFormData = z.infer<typeof visitorSchema>;

export default function CadastroVisitante() {
  const { formatPhone } = usePhoneMask();
  const [familyCode, setFamilyCode] = useState<string | null>(null);

  const form = useForm<VisitorFormData>({
    resolver: zodResolver(visitorSchema),
    defaultValues: { fullName: "", phone: "" },
  });

  const createVisitor = trpc.members.createVisitor.useMutation({
    onSuccess: (result) => {
      setFamilyCode(result.familyCode);
      if (result.isDuplicate) {
        toast.warning("Cadastro recebido. Identificamos um telefone já existente e a equipe verificará o registro.");
      }
    },
    onError: (error) => toast.error(error.message || "Não foi possível concluir seu cadastro. Tente novamente."),
  });

  const onSubmit = (data: VisitorFormData) => {
    createVisitor.mutate({
      fullName: data.fullName.trim(),
      phone: data.phone,
    });
  };

  if (familyCode) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-slate-50 to-blue-50 px-4 py-10 sm:py-16">
        <div className="mx-auto flex max-w-lg flex-col items-center text-center">
          <img src={LOGO_URL} alt="PIB Bady Bassitt" className="mb-7 h-16 w-auto object-contain" />
          <Card className="w-full border-emerald-200 shadow-xl">
            <CardContent className="p-7 sm:p-9">
              <CheckCircle2 className="mx-auto mb-4 h-14 w-14 text-emerald-600" aria-hidden="true" />
              <h1 className="font-serif text-3xl font-bold text-primary">Visita registrada!</h1>
              <p className="mt-4 leading-relaxed text-muted-foreground">
                Seja muito bem-vindo(a) à PIB Bady Bassitt. Sua família foi registrada como <strong>Família Visitante</strong>.
              </p>
              <div className="mt-6 rounded-xl border border-secondary/30 bg-secondary/10 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Código da família</p>
                <p className="mt-1 font-mono text-lg font-bold text-primary">{familyCode}</p>
              </div>
              <p className="mt-6 text-sm leading-relaxed text-muted-foreground">
                Nossa equipe poderá complementar outros dados posteriormente, se necessário.
              </p>
              <Link href="/">
                <Button className="mt-7 h-12 w-full gap-2 bg-primary hover:bg-primary/90">
                  <Home size={18} />
                  Voltar à página inicial
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-blue-50 px-4 py-8 sm:py-12">
      <div className="mx-auto max-w-lg">
        <Link href="/" className="mb-7 inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline">
          <Home size={16} />
          Página inicial
        </Link>

        <Card className="overflow-hidden border-border/70 shadow-xl">
          <CardHeader className="border-b bg-primary px-6 py-7 text-center text-primary-foreground sm:px-8">
            <img src={LOGO_URL} alt="PIB Bady Bassitt" className="mx-auto mb-5 h-14 w-auto rounded-sm bg-white object-contain p-1" />
            <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-white/15">
              <Heart className="h-5 w-5" aria-hidden="true" />
            </div>
            <CardTitle className="mt-3 font-serif text-2xl">Registrar minha visita</CardTitle>
            <CardDescription className="text-blue-100">
              Conte-nos apenas o essencial para que possamos acolher você.
            </CardDescription>
          </CardHeader>

          <CardContent className="p-6 sm:p-8">
            <form className="space-y-5" onSubmit={form.handleSubmit(onSubmit)} noValidate>
              <div className="space-y-2">
                <Label htmlFor="visitor-name" className="text-base font-semibold">
                  Nome completo <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <UserRound className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                  <Input
                    id="visitor-name"
                    autoComplete="name"
                    className="h-12 pl-11 text-base"
                    placeholder="Como podemos chamar você?"
                    {...form.register("fullName")}
                  />
                </div>
                {form.formState.errors.fullName && <p className="text-sm text-destructive">{form.formState.errors.fullName.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="visitor-phone" className="text-base font-semibold">
                  Telefone / WhatsApp <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <Phone className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                  <Input
                    id="visitor-phone"
                    type="tel"
                    autoComplete="tel"
                    inputMode="tel"
                    className="h-12 pl-11 text-base"
                    placeholder="(17) 99999-9999"
                    value={form.watch("phone")}
                    onChange={(event) => form.setValue("phone", formatPhone(event.target.value), { shouldValidate: true })}
                  />
                </div>
                {form.formState.errors.phone && <p className="text-sm text-destructive">{form.formState.errors.phone.message}</p>}
              </div>

              <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm leading-relaxed text-blue-950">
                Seus dados serão registrados como <strong>Família Visitante</strong>. Outros dados podem ser completados pela equipe administrativa posteriormente.
              </div>

              <Button type="submit" className="h-13 w-full gap-2 text-base font-semibold bg-secondary text-secondary-foreground hover:bg-secondary/90" disabled={createVisitor.isPending}>
                {createVisitor.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <ClipboardPenLine className="h-5 w-5" />}
                {createVisitor.isPending ? "Registrando visita..." : "Registrar visita"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
