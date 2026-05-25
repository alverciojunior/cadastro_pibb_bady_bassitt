import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { toast } from "sonner";
import { Eye, EyeOff, Lock, User, ShieldCheck, AlertCircle } from "lucide-react";

const loginSchema = z.object({
  username: z.string().min(1, "Informe o usuário"),
  password: z.string().min(1, "Informe a senha"),
});
type LoginForm = z.infer<typeof loginSchema>;

const LOGO_URL = "/manus-storage/pibb_logo_977c9cca.png";

export default function AdminLogin() {
  const [, navigate] = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: admin, isLoading: checkingSession } = trpc.adminAuth.me.useQuery(undefined, { retry: false });
  const utils = trpc.useUtils();

  // Se já estiver logado, redirecionar para o dashboard
  useEffect(() => {
    if (admin) {
      navigate("/dashboard");
    }
  }, [admin, navigate]);

  const loginMutation = trpc.adminAuth.login.useMutation({
    onSuccess: async (data) => {
      toast.success(`Bem-vindo(a), ${data.name}!`);
      // Usar window.location para forçar reload completo e garantir que o cookie seja lido
      setTimeout(() => {
        window.location.href = "/dashboard";
      }, 800);
    },
    onError: (err) => {
      setError(err.message || "Usuário ou senha inválidos");
    },
  });

  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = (data: LoginForm) => {
    setError(null);
    loginMutation.mutate(data);
  };

  if (checkingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f0f4f8]">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 py-10"
      style={{ background: "linear-gradient(135deg, #1e3a5f 0%, #2a4f7c 60%, #1e3a5f 100%)" }}
    >
      {/* Decoração de fundo */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-white/5 rounded-full" />
        <div className="absolute -bottom-24 -right-24 w-80 h-80 bg-white/5 rounded-full" />
        <div className="absolute top-1/2 left-1/4 w-48 h-48 bg-[#c9a227]/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo e título */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center bg-white rounded-2xl p-4 shadow-xl mb-5">
            <img src={LOGO_URL} alt="PIB Bady Bassitt" className="h-14 w-auto" />
          </div>
          <h1 className="text-2xl font-serif font-bold text-white mb-1">
            Painel Administrativo
          </h1>
          <p className="text-white/70 text-sm">
            Primeira Igreja Batista de Bady Bassitt
          </p>
        </div>

        {/* Card de login */}
        <Card className="shadow-2xl border-0 bg-white/95 backdrop-blur-sm">
          <CardHeader className="pb-2 pt-6 px-6">
            <div className="flex items-center gap-2 text-primary">
              <ShieldCheck size={20} />
              <span className="font-semibold text-base">Acesso Restrito</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Informe suas credenciais para acessar o painel
            </p>
          </CardHeader>

          <CardContent className="px-6 pb-6">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              {/* Erro geral */}
              {error && (
                <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
                  <AlertCircle size={16} className="shrink-0" />
                  {error}
                </div>
              )}

              {/* Usuário */}
              <div className="space-y-2">
                <Label htmlFor="username" className="text-sm font-medium">
                  Usuário
                </Label>
                <div className="relative">
                  <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="username"
                    type="text"
                    placeholder="Digite seu usuário"
                    className="pl-9 h-11 text-base"
                    autoComplete="username"
                    autoFocus
                    {...register("username")}
                  />
                </div>
                {errors.username && (
                  <p className="text-xs text-destructive">{errors.username.message}</p>
                )}
              </div>

              {/* Senha */}
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">
                  Senha
                </Label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Digite sua senha"
                    className="pl-9 pr-10 h-11 text-base"
                    autoComplete="current-password"
                    {...register("password")}
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    onClick={() => setShowPassword((v) => !v)}
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-xs text-destructive">{errors.password.message}</p>
                )}
              </div>

              {/* Botão */}
              <Button
                type="submit"
                className="w-full h-12 text-base font-semibold mt-2"
                style={{ background: "linear-gradient(135deg, #1e3a5f, #2a4f7c)" }}
                disabled={loginMutation.isPending}
              >
                {loginMutation.isPending ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Entrando...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <ShieldCheck size={18} />
                    Entrar no Painel
                  </span>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Link voltar */}
        <div className="text-center mt-5">
          <a
            href="/"
            className="text-white/60 hover:text-white text-sm transition-colors"
          >
            ← Voltar para a página inicial
          </a>
        </div>
      </div>
    </div>
  );
}
