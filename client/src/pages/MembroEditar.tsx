import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { ChevronLeft, Save, Loader2 } from "lucide-react";
import { Link } from "wouter";
import { usePhoneMask } from "@/hooks/usePhoneMask";
import { useCPFMask } from "@/hooks/useCPFMask";

const CONGREGATIONS = [
  "Sede - Bady Bassitt",
];
const MINISTRIES = [
  "Louvor e Adoração", "Ensino Bíblico", "Evangelismo", "Diaconia",
  "Jovens", "Crianças", "Mulheres", "Homens", "Casais", "Intercessão",
  "Comunicação", "Administração", "Sem ministério",
];
const SERVICE_AREAS = [
  "Música e Louvor", "Ensino e Pregação", "Evangelismo e Missões",
  "Cuidado e Aconselhamento", "Administração e Organização",
  "Tecnologia e Comunicação", "Arte e Criatividade",
  "Diaconia e Assistência Social", "Liderança de Grupos",
  "Oração e Intercessão", "Educação de Crianças", "Trabalho com Jovens",
];

function FormField({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">
        {label}{required && <span className="text-destructive ml-1">*</span>}
      </Label>
      {children}
    </div>
  );
}

export default function MembroEditar() {
  const { formatPhone } = usePhoneMask();
  const { formatCPF, isValidCPF } = useCPFMask();
  const { id } = useParams<{ id: string }>();
  const memberId = parseInt(id || "0");
  const [, navigate] = useLocation();

  const { data: member, isLoading } = trpc.members.getById.useQuery(memberId, {
    enabled: !!memberId,
  });

  const [formData, setFormData] = useState<any>({});
  const [children, setChildren] = useState<{ fullName: string; birthDate: string; phone: string; isBaptized: boolean; baptismDate: string; ministry: string }[]>([]);

  useEffect(() => {
    if (member) {
      const formatDate = (d: any) => d ? new Date(d).toISOString().split("T")[0] : "";
      setFormData({
        fullName: member.fullName || "",
        birthDate: formatDate(member.birthDate),
        gender: member.gender || "",
        maritalStatus: member.maritalStatus || "",
        cpf: member.cpf || "",
        phone: member.phone || "",
        whatsapp: member.whatsapp || "",
        email: member.email || "",
        street: member.street || "",
        number: member.number || "",
        complement: member.complement || "",
        neighborhood: member.neighborhood || "",
        city: member.city || "",
        state: member.state || "",
        zipCode: member.zipCode || "",
        congregation: member.congregation || "",
        ministry: member.ministry || "",
        isBaptized: member.isBaptized ?? false,
        baptismDate: formatDate(member.baptismDate),
        isTither: member.isTither || "",
        attendanceFrequency: member.attendanceFrequency || "",
        serviceArea: member.serviceArea || "",
        gifts: member.gifts || "",
        spouseName: member.spouseName || "",
        spouseBirthDate: formatDate(member.spouseBirthDate),
        spousePhone: member.spousePhone || "",
        spouseWhatsapp: member.spouseWhatsapp || "",
        spouseEmail: member.spouseEmail || "",
        spouseIsBaptized: member.spouseIsBaptized ?? false,
        spouseBaptismDate: formatDate(member.spouseBaptismDate),
        spouseMinistry: member.spouseMinistry || "",
        spouseServiceArea: member.spouseServiceArea || "",
        spouseIsTither: member.spouseIsTither || null,
        memberType: member.memberType || "visitante",
        pastoralNotes: member.pastoralNotes || "",
      });
      setChildren(
        (member.children || []).map((c: any) => ({
          fullName: c.fullName || "",
          birthDate: c.birthDate ? new Date(c.birthDate).toISOString().split("T")[0] : "",
          phone: c.phone || "",
          isBaptized: c.isBaptized ?? false,
          baptismDate: c.baptismDate ? new Date(c.baptismDate).toISOString().split("T")[0] : "",
          ministry: (c as any).ministry || "",
        }))
      );
    }
  }, [member]);

  const update = trpc.members.update.useMutation({
    onSuccess: () => {
      toast.success("Dados atualizados com sucesso!");
      navigate(`/membros/${memberId}`);
    },
    onError: (err) => toast.error("Erro ao salvar: " + err.message),
  });

  const set = (field: string, value: any) => setFormData((p: any) => ({ ...p, [field]: value }));

  const showSpouse = formData.maritalStatus === "casado" || formData.maritalStatus === "uniao_estavel";

  const handleSave = () => {
    if (formData.cpf && formData.cpf.replace(/\D/g, "").length === 11 && !isValidCPF(formData.cpf)) {
      toast.error("CPF inválido. Por favor, verifique os dígitos.");
      return;
    }

    update.mutate({
      id: memberId,
      data: {
        ...formData,
        birthDate: formData.birthDate || null,
        baptismDate: formData.baptismDate || null,
        spouseBirthDate: formData.spouseBirthDate || null,
        email: formData.email || null,
        spouseEmail: formData.spouseEmail || null,
        spouseIsTither: formData.spouseIsTither || null,
        children: children.filter((c) => c.fullName.trim()).map((c) => ({
          fullName: c.fullName,
          birthDate: c.birthDate || null,
          phone: c.phone || null,
          isBaptized: c.isBaptized ?? false,
          baptismDate: c.isBaptized ? c.baptismDate || null : null,
          ministry: c.ministry || null,
        })),
      },
    });
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-4 max-w-2xl mx-auto">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-96 rounded-xl" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Link href={`/membros/${memberId}`}>
            <Button variant="ghost" className="gap-2">
              <ChevronLeft size={18} />
              Voltar
            </Button>
          </Link>
          <Button
            onClick={handleSave}
            disabled={update.isPending}
            className="gap-2 bg-primary hover:bg-primary/90"
          >
            {update.isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            Salvar Alterações
          </Button>
        </div>

        <h1 className="text-2xl font-serif font-bold text-primary">Editar Membro</h1>

        {/* Dados Pessoais */}
        <div className="form-card p-6 space-y-4">
          <h2 className="text-lg font-semibold text-primary">Dados Pessoais</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <FormField label="Nome Completo" required>
                <Input value={formData.fullName || ""} onChange={(e) => set("fullName", e.target.value)} className="h-11" />
              </FormField>
            </div>
            <FormField label="Data de Nascimento">
              <Input type="date" value={formData.birthDate || ""} onChange={(e) => set("birthDate", e.target.value)} className="h-11" />
            </FormField>
            <FormField label="Sexo">
              <Select value={formData.gender || ""} onValueChange={(v) => set("gender", v)}>
                <SelectTrigger className="h-11"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="masculino">Masculino</SelectItem>
                  <SelectItem value="feminino">Feminino</SelectItem>
                  <SelectItem value="outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="Estado Civil">
              <Select value={formData.maritalStatus || ""} onValueChange={(v) => set("maritalStatus", v)}>
                <SelectTrigger className="h-11"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="solteiro">Solteiro(a)</SelectItem>
                  <SelectItem value="casado">Casado(a)</SelectItem>
                  <SelectItem value="uniao_estavel">União Estável</SelectItem>
                  <SelectItem value="divorciado">Divorciado(a)</SelectItem>
                  <SelectItem value="viuvo">Viúvo(a)</SelectItem>
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="CPF">
              <div className="space-y-1">
                <Input value={formData.cpf || ""} onChange={(e) => set("cpf", formatCPF(e.target.value))} className="h-11" placeholder="000.000.000-00" />
                {formData.cpf && formData.cpf.replace(/\D/g, "").length === 11 && (
                  <p className={`text-xs ${isValidCPF(formData.cpf) ? "text-green-600" : "text-red-600"}`}>
                    {isValidCPF(formData.cpf) ? "✓ CPF válido" : "✗ CPF inválido"}
                  </p>
                )}
              </div>
            </FormField>
          </div>
        </div>

        {/* Contato */}
        <div className="form-card p-6 space-y-4">
          <h2 className="text-lg font-semibold text-primary">Contato e Endereço</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Telefone">
              <Input value={formData.phone || ""} onChange={(e) => set("phone", formatPhone(e.target.value))} className="h-11" />
            </FormField>
            <FormField label="WhatsApp">
              <Input value={formData.whatsapp || ""} onChange={(e) => set("whatsapp", formatPhone(e.target.value))} className="h-11" />
            </FormField>
            <div className="sm:col-span-2">
              <FormField label="E-mail">
                <Input type="email" value={formData.email || ""} onChange={(e) => set("email", e.target.value)} className="h-11" />
              </FormField>
            </div>
            <FormField label="CEP">
              <Input value={formData.zipCode || ""} onChange={(e) => set("zipCode", e.target.value)} className="h-11" />
            </FormField>
            <FormField label="Estado">
              <Input maxLength={2} value={formData.state || ""} onChange={(e) => set("state", e.target.value.toUpperCase())} className="h-11" />
            </FormField>
            <FormField label="Cidade">
              <Input value={formData.city || ""} onChange={(e) => set("city", e.target.value)} className="h-11" />
            </FormField>
            <FormField label="Bairro">
              <Input value={formData.neighborhood || ""} onChange={(e) => set("neighborhood", e.target.value)} className="h-11" />
            </FormField>
            <FormField label="Rua">
              <Input value={formData.street || ""} onChange={(e) => set("street", e.target.value)} className="h-11" />
            </FormField>
            <FormField label="Número">
              <Input value={formData.number || ""} onChange={(e) => set("number", e.target.value)} className="h-11" />
            </FormField>
          </div>
        </div>

        {/* Igreja */}
        <div className="form-card p-6 space-y-4">
          <h2 className="text-lg font-semibold text-primary">Vida na Igreja</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Congregação">
              <Select value={formData.congregation || ""} onValueChange={(v) => set("congregation", v)}>
                <SelectTrigger className="h-11"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>{CONGREGATIONS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </FormField>
            <FormField label="Ministério">
              <Select value={formData.ministry || ""} onValueChange={(v) => set("ministry", v)}>
                <SelectTrigger className="h-11"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>{MINISTRIES.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
              </Select>
            </FormField>
            <FormField label="Frequência">
              <Select value={formData.attendanceFrequency || ""} onValueChange={(v) => set("attendanceFrequency", v)}>
                <SelectTrigger className="h-11"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="sempre">Sempre</SelectItem>
                  <SelectItem value="quase_sempre">Quase sempre</SelectItem>
                  <SelectItem value="as_vezes">Às vezes</SelectItem>
                  <SelectItem value="raramente">Raramente</SelectItem>
                  <SelectItem value="nunca">Nunca</SelectItem>
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="Situação">
              <Select value={formData.memberType || ""} onValueChange={(v) => set("memberType", v)}>
                <SelectTrigger className="h-11"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="membro_ativo">Membro Ativo</SelectItem>
                  <SelectItem value="frequentante">Frequentante</SelectItem>
                  <SelectItem value="visitante">Visitante</SelectItem>
                  <SelectItem value="afastado">Afastado</SelectItem>
                </SelectContent>
              </Select>
            </FormField>
            <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
              <Checkbox id="isBaptized" checked={formData.isBaptized ?? false} onCheckedChange={(v) => set("isBaptized", v)} className="w-5 h-5" />
              <label htmlFor="isBaptized" className="font-medium cursor-pointer">Batizado(a)</label>
            </div>
            <FormField label="Data do Batismo">
              <Input type="date" value={formData.baptismDate || ""} onChange={(e) => set("baptismDate", e.target.value)} className="h-11" />
            </FormField>
            <FormField label="Dízimo">
              <Select value={formData.isTither || ""} onValueChange={(v) => set("isTither", v)}>
                <SelectTrigger className="h-11"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="sim">Sim</SelectItem>
                  <SelectItem value="nao">Não</SelectItem>
                  <SelectItem value="ocasional">Ocasional</SelectItem>
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="Área de Interesse">
              <Select value={formData.serviceArea || ""} onValueChange={(v) => set("serviceArea", v)}>
                <SelectTrigger className="h-11"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>{SERVICE_AREAS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </FormField>
            <div className="sm:col-span-2">
              <FormField label="Dons e Talentos">
                <Textarea value={formData.gifts || ""} onChange={(e) => set("gifts", e.target.value)} className="text-base" />
              </FormField>
            </div>
          </div>
        </div>

        {/* Cônjuge */}
        {showSpouse && (
          <div className="form-card p-6 space-y-4 border-l-4 border-l-secondary">
            <h2 className="text-lg font-semibold text-primary">Cônjuge</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <FormField label="Nome do Cônjuge">
                  <Input value={formData.spouseName || ""} onChange={(e) => set("spouseName", e.target.value)} className="h-11" />
                </FormField>
              </div>
              <FormField label="Nascimento">
                <Input type="date" value={formData.spouseBirthDate || ""} onChange={(e) => set("spouseBirthDate", e.target.value)} className="h-11" />
              </FormField>
              <FormField label="Telefone">
                <Input value={formData.spousePhone || ""} onChange={(e) => set("spousePhone", formatPhone(e.target.value))} className="h-11" />
              </FormField>
              <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
                <Checkbox id="spouseIsBaptized" checked={formData.spouseIsBaptized ?? false} onCheckedChange={(v) => set("spouseIsBaptized", v)} className="w-5 h-5" />
                <label htmlFor="spouseIsBaptized" className="font-medium cursor-pointer text-sm">Cônjuge batizado(a)</label>
              </div>
              {formData.spouseIsBaptized && (
                <FormField label="Data do Batismo do Cônjuge">
                  <Input type="date" value={formData.spouseBaptismDate || ""} onChange={(e) => set("spouseBaptismDate", e.target.value)} className="h-11" />
                </FormField>
              )}
              <FormField label="Ministério">
                <Select value={formData.spouseMinistry || ""} onValueChange={(v) => set("spouseMinistry", v)}>
                  <SelectTrigger className="h-11"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>{MINISTRIES.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                </Select>
              </FormField>
              <FormField label="Dízimo do Cônjuge">
                <Select value={formData.spouseIsTither || ""} onValueChange={(v) => set("spouseIsTither", v)}>
                  <SelectTrigger className="h-11"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sim">Sim</SelectItem>
                    <SelectItem value="nao">Não</SelectItem>
                    <SelectItem value="ocasional">Ocasional</SelectItem>
                  </SelectContent>
                </Select>
              </FormField>
            </div>
          </div>
        )}

        {/* Filhos */}
        <div className="form-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-primary">Filhos</h2>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setChildren([...children, { fullName: "", birthDate: "", phone: "", isBaptized: false, baptismDate: "", ministry: "" }])}
            >
              + Adicionar Filho
            </Button>
          </div>
          {children.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum filho cadastrado.</p>
          ) : (
            children.map((child, idx) => (
              <div key={idx} className="p-4 bg-blue-50 rounded-xl border border-blue-100 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-primary text-sm">{idx + 1}º Filho(a)</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive h-7"
                    onClick={() => setChildren(children.filter((_, i) => i !== idx))}
                  >
                    Remover
                  </Button>
                </div>
                <FormField label="Nome">
                  <Input
                    value={child.fullName}
                    onChange={(e) => {
                      const updated = [...children];
                      updated[idx] = { ...updated[idx], fullName: e.target.value };
                      setChildren(updated);
                    }}
                    className="h-11"
                  />
                </FormField>
                <FormField label="Data de Nascimento">
                  <Input
                    type="date"
                    value={child.birthDate}
                    onChange={(e) => {
                      const updated = [...children];
                      updated[idx] = { ...updated[idx], birthDate: e.target.value };
                      setChildren(updated);
                    }}
                    className="h-11"
                  />
                </FormField>
                <FormField label="Telefone (opcional)">
                  <Input
                    type="tel"
                    placeholder="(XX) XXXXX-XXXX"
                    value={child.phone || ""}
                    onChange={(e) => {
                      const updated = [...children];
                      updated[idx] = { ...updated[idx], phone: formatPhone(e.target.value) };
                      setChildren(updated);
                    }}
                    className="h-11"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Se deixar em branco, herdara o telefone do titular</p>
                </FormField>
                <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-blue-200">
                  <Checkbox
                    id={`child-baptized-${idx}`}
                    checked={child.isBaptized ?? false}
                    onCheckedChange={(v) => {
                      const updated = [...children];
                      updated[idx] = { ...updated[idx], isBaptized: v as boolean };
                      setChildren(updated);
                    }}
                    className="w-5 h-5"
                  />
                  <label htmlFor={`child-baptized-${idx}`} className="text-sm font-medium cursor-pointer">Batizado(a) nas águas</label>
                </div>
                {child.isBaptized && (
                  <FormField label="Data do Batismo">
                    <Input
                      type="date"
                      value={child.baptismDate || ""}
                      onChange={(e) => {
                        const updated = [...children];
                        updated[idx] = { ...updated[idx], baptismDate: e.target.value };
                        setChildren(updated);
                      }}
                      className="h-11"
                    />
                  </FormField>
                )}
                <FormField label="Ministério (opcional)">
                  <Select
                    value={child.ministry || ""}
                    onValueChange={(v) => {
                      const updated = [...children];
                      updated[idx] = { ...updated[idx], ministry: v };
                      setChildren(updated);
                    }}
                  >
                    <SelectTrigger className="h-11"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>{MINISTRIES.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                  </Select>
                </FormField>
              </div>
            ))
          )}
        </div>

        {/* Observações Pastorais */}
        <div className="form-card p-6 space-y-3">
          <h2 className="text-lg font-semibold text-primary">Observações Pastorais</h2>
          <Textarea
            value={formData.pastoralNotes || ""}
            onChange={(e) => set("pastoralNotes", e.target.value)}
            placeholder="Observações pastorais sobre este membro..."
            className="text-base min-h-[100px]"
          />
        </div>

        <Button
          onClick={handleSave}
          disabled={update.isPending}
          className="w-full h-14 text-base font-semibold bg-primary hover:bg-primary/90"
        >
          {update.isPending ? <Loader2 size={18} className="animate-spin mr-2" /> : <Save size={18} className="mr-2" />}
          Salvar Alterações
        </Button>
      </div>
    </DashboardLayout>
  );
}
