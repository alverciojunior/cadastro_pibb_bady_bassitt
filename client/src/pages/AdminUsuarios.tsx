import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { UserPlus, KeyRound, ShieldOff, ShieldCheck, User, Eye, EyeOff, Loader2 } from "lucide-react";

// Schemas
const createAdminSchema = z.object({
  username: z.string().min(3, "Mínimo 3 caracteres").max(32, "Máximo 32 caracteres"),
  name: z.string().min(2, "Mínimo 2 caracteres"),
  password: z.string().min(6, "Mínimo 6 caracteres"),
  confirmPassword: z.string().min(6, "Confirme a senha"),
}).refine(d => d.password === d.confirmPassword, {
  message: "As senhas não coincidem",
  path: ["confirmPassword"],
});

const resetPasswordSchema = z.object({
  newPassword: z.string().min(6, "Mínimo 6 caracteres"),
  confirmPassword: z.string().min(6, "Confirme a senha"),
}).refine(d => d.newPassword === d.confirmPassword, {
  message: "As senhas não coincidem",
  path: ["confirmPassword"],
});

type CreateAdminForm = z.infer<typeof createAdminSchema>;
type ResetPasswordForm = z.infer<typeof resetPasswordSchema>;

function PasswordInput({ id, placeholder, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { id: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input id={id} type={show ? "text" : "password"} placeholder={placeholder} className="pr-10" {...props} />
      <button
        type="button"
        onClick={() => setShow(v => !v)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        tabIndex={-1}
      >
        {show ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  );
}

export default function AdminUsuarios() {
  const utils = trpc.useUtils();
  const { data: admins, isLoading } = trpc.adminAuth.listAdmins.useQuery();

  // Estado dos modais
  const [showCreate, setShowCreate] = useState(false);
  const [resetTarget, setResetTarget] = useState<{ id: number; name: string } | null>(null);
  const [toggleTarget, setToggleTarget] = useState<{ id: number; name: string; isActive: boolean } | null>(null);

  // Formulário de criação
  const createForm = useForm<CreateAdminForm>({ resolver: zodResolver(createAdminSchema) });
  const createMutation = trpc.adminAuth.createAdmin.useMutation({
    onSuccess: () => {
      toast.success("Administrador criado com sucesso!");
      utils.adminAuth.listAdmins.invalidate();
      setShowCreate(false);
      createForm.reset();
    },
    onError: (err) => toast.error(err.message || "Erro ao criar administrador"),
  });

  // Formulário de troca de senha
  const resetForm = useForm<ResetPasswordForm>({ resolver: zodResolver(resetPasswordSchema) });
  const resetMutation = trpc.adminAuth.resetPassword.useMutation({
    onSuccess: () => {
      toast.success("Senha alterada com sucesso!");
      setResetTarget(null);
      resetForm.reset();
    },
    onError: (err) => toast.error(err.message || "Erro ao alterar senha"),
  });

  // Ativar/desativar
  const toggleMutation = trpc.adminAuth.toggleActive.useMutation({
    onSuccess: (_, vars) => {
      toast.success(vars.isActive ? "Usuário ativado!" : "Usuário desativado!");
      utils.adminAuth.listAdmins.invalidate();
      setToggleTarget(null);
    },
    onError: (err) => toast.error(err.message || "Erro ao alterar status"),
  });

  const onCreateSubmit = (data: CreateAdminForm) => {
    createMutation.mutate({ username: data.username, name: data.name, password: data.password });
  };

  const onResetSubmit = (data: ResetPasswordForm) => {
    if (!resetTarget) return;
    resetMutation.mutate({ adminId: resetTarget.id, newPassword: data.newPassword });
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-serif font-bold text-primary">Usuários Administradores</h1>
            <p className="text-muted-foreground mt-1">Gerencie os usuários com acesso ao painel administrativo</p>
          </div>
          <Button onClick={() => setShowCreate(true)} className="gap-2">
            <UserPlus size={16} />
            Novo Administrador
          </Button>
        </div>

        {/* Lista de admins */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Administradores Cadastrados</CardTitle>
            <CardDescription>Todos os usuários com acesso ao painel</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="animate-spin text-primary" size={28} />
              </div>
            ) : !admins || admins.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Nenhum administrador cadastrado.</p>
            ) : (
              <div className="divide-y">
                {admins.map((admin) => (
                  <div key={admin.id} className="flex items-center justify-between py-4 gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <User size={18} className="text-primary" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-foreground">{admin.name}</span>
                          <Badge variant={admin.isActive ? "default" : "secondary"} className="text-xs">
                            {admin.isActive ? "Ativo" : "Inativo"}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">@{admin.username}</p>
                        {admin.lastLoginAt && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Último acesso: {new Date(admin.lastLoginAt).toLocaleString("pt-BR")}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5"
                        onClick={() => {
                          setResetTarget({ id: admin.id, name: admin.name });
                          resetForm.reset();
                        }}
                      >
                        <KeyRound size={14} />
                        Trocar Senha
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className={`gap-1.5 ${admin.isActive ? "text-destructive hover:text-destructive" : "text-green-600 hover:text-green-600"}`}
                        onClick={() => setToggleTarget({ id: admin.id, name: admin.name, isActive: admin.isActive })}
                      >
                        {admin.isActive ? <ShieldOff size={14} /> : <ShieldCheck size={14} />}
                        {admin.isActive ? "Desativar" : "Ativar"}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modal: Criar novo admin */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus size={18} className="text-primary" />
              Novo Administrador
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label htmlFor="name">Nome completo</Label>
              <Input id="name" placeholder="Ex: João Silva" {...createForm.register("name")} />
              {createForm.formState.errors.name && (
                <p className="text-xs text-destructive">{createForm.formState.errors.name.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="username">Usuário (login)</Label>
              <Input id="username" placeholder="Ex: joao.silva" {...createForm.register("username")} />
              {createForm.formState.errors.username && (
                <p className="text-xs text-destructive">{createForm.formState.errors.username.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Senha</Label>
              <PasswordInput id="password" placeholder="Mínimo 6 caracteres" {...createForm.register("password")} />
              {createForm.formState.errors.password && (
                <p className="text-xs text-destructive">{createForm.formState.errors.password.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword">Confirmar senha</Label>
              <PasswordInput id="confirmPassword" placeholder="Repita a senha" {...createForm.register("confirmPassword")} />
              {createForm.formState.errors.confirmPassword && (
                <p className="text-xs text-destructive">{createForm.formState.errors.confirmPassword.message}</p>
              )}
            </div>
            <DialogFooter className="mt-4">
              <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>Cancelar</Button>
              <Button type="submit" disabled={createMutation.isPending} className="gap-2">
                {createMutation.isPending && <Loader2 size={14} className="animate-spin" />}
                Criar Administrador
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal: Trocar senha */}
      <Dialog open={!!resetTarget} onOpenChange={(open) => !open && setResetTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound size={18} className="text-primary" />
              Trocar Senha — {resetTarget?.name}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={resetForm.handleSubmit(onResetSubmit)} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label htmlFor="newPassword">Nova senha</Label>
              <PasswordInput id="newPassword" placeholder="Mínimo 6 caracteres" {...resetForm.register("newPassword")} />
              {resetForm.formState.errors.newPassword && (
                <p className="text-xs text-destructive">{resetForm.formState.errors.newPassword.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirmNewPassword">Confirmar nova senha</Label>
              <PasswordInput id="confirmNewPassword" placeholder="Repita a nova senha" {...resetForm.register("confirmPassword")} />
              {resetForm.formState.errors.confirmPassword && (
                <p className="text-xs text-destructive">{resetForm.formState.errors.confirmPassword.message}</p>
              )}
            </div>
            <DialogFooter className="mt-4">
              <Button type="button" variant="outline" onClick={() => setResetTarget(null)}>Cancelar</Button>
              <Button type="submit" disabled={resetMutation.isPending} className="gap-2">
                {resetMutation.isPending && <Loader2 size={14} className="animate-spin" />}
                Salvar Nova Senha
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* AlertDialog: Ativar/Desativar */}
      <AlertDialog open={!!toggleTarget} onOpenChange={(open) => !open && setToggleTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {toggleTarget?.isActive ? "Desativar" : "Ativar"} administrador?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {toggleTarget?.isActive
                ? `O usuário "${toggleTarget?.name}" perderá acesso ao painel imediatamente.`
                : `O usuário "${toggleTarget?.name}" voltará a ter acesso ao painel.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => toggleTarget && toggleMutation.mutate({ adminId: toggleTarget.id, isActive: !toggleTarget.isActive })}
              className={toggleTarget?.isActive ? "bg-destructive hover:bg-destructive/90" : ""}
            >
              {toggleMutation.isPending && <Loader2 size={14} className="animate-spin mr-2" />}
              {toggleTarget?.isActive ? "Desativar" : "Ativar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
