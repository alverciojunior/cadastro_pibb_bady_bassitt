import { useState, useEffect } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { usePhoneMask } from "@/hooks/usePhoneMask";
import { useCPFMask } from "@/hooks/useCPFMask";
import {
  CheckCircle2, ChevronRight, ChevronLeft, User, Phone, Church,
  Heart, Baby, AlertCircle, Loader2, BookOpen
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
type FormData = {
  fullName: string;
  birthDate: string;
  gender: string;
  maritalStatus: string;
  cpf: string;
  phone: string;
  whatsapp: string;
  email: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
  congregation: string;
  ministry: string;
  isBaptized: boolean;
  baptismDate: string;
  isTither: string;
  attendanceFrequency: string;
  serviceArea: string;
  gifts: string;
  spouseName: string;
  spouseBirthDate: string;
  spousePhone: string;
  spouseWhatsapp: string;
  spouseEmail: string;
  spouseIsBaptized: boolean;
  spouseBaptismDate: string;
  spouseMinistry: string;
  spouseServiceArea: string;
  spouseIsTither: string;
  hasChildren: string;
  childrenCount: string;
  children: { fullName: string; birthDate: string; isBaptized: boolean; baptismDate: string; ministry: string }[];
};

const LOGO_URL = "/manus-storage/pibb_logo_977c9cca.png";

const CONGREGATIONS = [
  "Sede - Bady Bassitt",
];

const MINISTRIES = [
  "Louvor e Adoração",
  "Ensino Bíblico",
  "Evangelismo",
  "Diaconia",
  "Jovens",
  "Crianças",
  "Mulheres",
  "Homens",
  "Casais",
  "Intercessão",
  "Comunicação",
  "Administração",
  "Sem ministério",
];

const SERVICE_AREAS = [
  "Música e Louvor",
  "Ensino e Pregação",
  "Evangelismo e Missões",
  "Cuidado e Aconselhamento",
  "Administração e Organização",
  "Tecnologia e Comunicação",
  "Arte e Criatividade",
  "Diaconia e Assistência Social",
  "Liderança de Grupos",
  "Oração e Intercessão",
  "Educação de Crianças",
  "Trabalho com Jovens",
];

const STEPS = [
  { id: 1, label: "Dados Pessoais", icon: User },
  { id: 2, label: "Contato", icon: Phone },
  { id: 3, label: "Igreja", icon: Church },
  { id: 4, label: "Família", icon: Heart },
];

// ─── Component ────────────────────────────────────────────────────────────────
export default function CadastroForm() {
  const { formatPhone } = usePhoneMask();
  const { formatCPF, isValidCPF } = useCPFMask();
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState<"forward" | "back">("forward");
  const [submitted, setSubmitted] = useState(false);
  const [submittedData, setSubmittedData] = useState<any>(null);
  const [childrenFields, setChildrenFields] = useState<{ fullName: string; birthDate: string; phone: string; isBaptized: boolean; baptismDate: string; ministry: string }[]>([]);

  const [formData, setFormData] = useState<Partial<FormData>>({
    isBaptized: false,
    spouseIsBaptized: false,
    spouseBaptismDate: "",
    spouseIsTither: "",
    hasChildren: "nao",
    childrenCount: "1",
    children: [],
  });

  const createMember = trpc.members.create.useMutation({
    onSuccess: (data) => {
      setSubmittedData(data);
      setSubmitted(true);
    },
    onError: (err) => {
      toast.error("Erro ao enviar cadastro: " + err.message);
    },
  });

  const checkDuplicate = trpc.members.checkDuplicate.useQuery(
    { cpf: formData.cpf, phone: formData.phone },
    { enabled: !!(formData.cpf || formData.phone), refetchOnWindowFocus: false }
  );

  const totalSteps = STEPS.length;
  const showSpouseSection =
    formData.maritalStatus === "casado" || formData.maritalStatus === "uniao_estavel";
  const showChildrenSection = formData.hasChildren === "sim";

  const updateField = (field: keyof FormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleChildrenCountChange = (count: string) => {
    updateField("childrenCount", count);
    const num = count === "5+" ? 5 : parseInt(count) || 1;
    const newChildren = Array.from({ length: num }, (_, i) => ({
      fullName: childrenFields[i]?.fullName || "",
      birthDate: childrenFields[i]?.birthDate || "",
      isBaptized: childrenFields[i]?.isBaptized ?? false,
      baptismDate: childrenFields[i]?.baptismDate || "",
      ministry: childrenFields[i]?.ministry || "",
    }));
    setChildrenFields(newChildren);
  };

  const updateChild = (index: number, field: "fullName" | "birthDate" | "isBaptized" | "baptismDate" | "ministry", value: string | boolean) => {
    const updated = [...childrenFields];
    updated[index] = { ...updated[index], [field]: value };
    setChildrenFields(updated);
  };

  const goNext = () => {
    setDirection("forward");
    setStep((s) => Math.min(s + 1, totalSteps));
  };

  const goBack = () => {
    setDirection("back");
    setStep((s) => Math.max(s - 1, 1));
  };

  const handleSubmit = () => {
    if (!formData.fullName?.trim()) {
      toast.error("Por favor, informe seu nome completo.");
      setStep(1);
      return;
    }

    if (formData.cpf && formData.cpf.replace(/\D/g, "").length === 11 && !isValidCPF(formData.cpf)) {
      toast.error("CPF inválido. Por favor, verifique os dígitos.");
      setStep(1);
      return;
    }

    const payload = {
      fullName: formData.fullName || "",
      birthDate: formData.birthDate || null,
      gender: (formData.gender as any) || null,
      maritalStatus: (formData.maritalStatus as any) || null,
      cpf: formData.cpf || null,
      phone: formData.phone || null,
      whatsapp: formData.whatsapp || null,
      email: formData.email || null,
      street: formData.street || null,
      number: formData.number || null,
      complement: formData.complement || null,
      neighborhood: formData.neighborhood || null,
      city: formData.city || null,
      state: formData.state || null,
      zipCode: formData.zipCode || null,
      congregation: formData.congregation || null,
      ministry: formData.ministry || null,
      isBaptized: formData.isBaptized ?? false,
      baptismDate: formData.baptismDate || null,
      isTither: (formData.isTither as any) || null,
      attendanceFrequency: (formData.attendanceFrequency as any) || null,
      serviceArea: formData.serviceArea || null,
      gifts: formData.gifts || null,
      spouseName: showSpouseSection ? formData.spouseName || null : null,
      spouseBirthDate: showSpouseSection ? formData.spouseBirthDate || null : null,
      spousePhone: showSpouseSection ? formData.spousePhone || null : null,
      spouseWhatsapp: showSpouseSection ? formData.spouseWhatsapp || null : null,
      spouseEmail: showSpouseSection ? formData.spouseEmail || null : null,
      spouseIsBaptized: showSpouseSection ? formData.spouseIsBaptized ?? false : false,
      spouseBaptismDate: showSpouseSection && formData.spouseIsBaptized ? formData.spouseBaptismDate || null : null,
      spouseMinistry: showSpouseSection ? formData.spouseMinistry || null : null,
      spouseServiceArea: showSpouseSection ? formData.spouseServiceArea || null : null,
      spouseIsTither: showSpouseSection ? (formData.spouseIsTither as any) || null : null,
      children: showChildrenSection
        ? childrenFields.filter((c) => c.fullName.trim()).map((c) => ({
            fullName: c.fullName,
            birthDate: c.birthDate || null,
            isBaptized: c.isBaptized ?? false,
            baptismDate: c.isBaptized ? c.baptismDate || null : null,
            ministry: c.ministry || null,
          }))
        : [],
    };

    createMember.mutate(payload);
  };

  if (submitted) {
    return <SuccessScreen data={submittedData} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-blue-50">
      {/* Header */}
      <header className="church-gradient text-white py-6 px-4 shadow-lg">
        <div className="max-w-lg mx-auto flex items-center gap-4">
          <img src={LOGO_URL} alt="PIB Bady Bassitt" className="h-14 w-auto object-contain" />
          <div>
            <h1 className="text-xl font-serif font-bold leading-tight">
              Primeira Igreja Batista
            </h1>
            <p className="text-blue-200 text-sm">Bady Bassitt - SP • Recadastramento</p>
          </div>
        </div>
      </header>

      {/* Progress Bar */}
      <div className="bg-white border-b border-border shadow-sm sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-2">
            {STEPS.map((s, idx) => (
              <div key={s.id} className="flex items-center flex-1">
                <div className="flex flex-col items-center">
                  <div
                    className={`progress-step ${
                      step > s.id ? "completed" : step === s.id ? "active" : "pending"
                    }`}
                  >
                    {step > s.id ? <CheckCircle2 size={16} /> : <s.icon size={16} />}
                  </div>
                  <span
                    className={`text-xs mt-1 font-medium hidden sm:block ${
                      step === s.id ? "text-primary" : "text-muted-foreground"
                    }`}
                  >
                    {s.label}
                  </span>
                </div>
                {idx < STEPS.length - 1 && (
                  <div
                    className={`flex-1 h-1 mx-2 rounded-full transition-all duration-500 ${
                      step > s.id ? "bg-secondary" : "bg-muted"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
          <p className="text-center text-sm text-muted-foreground">
            Etapa {step} de {totalSteps}
          </p>
        </div>
      </div>

      {/* Form Content */}
      <div className="max-w-lg mx-auto px-4 py-6">
        {/* Alerta de duplicidade */}
        {checkDuplicate.data?.isDuplicate && (
          <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-xl flex gap-3 items-start">
            <AlertCircle className="text-amber-600 mt-0.5 shrink-0" size={20} />
            <div>
              <p className="font-semibold text-amber-800">Cadastro possivelmente existente</p>
              <p className="text-sm text-amber-700">
                Encontramos um registro com este CPF ou telefone. A liderança será notificada para verificação.
              </p>
            </div>
          </div>
        )}

        <div className={direction === "forward" ? "step-enter" : "step-enter-back"} key={step}>
          {step === 1 && <Step1 formData={formData} updateField={updateField} />}
          {step === 2 && <Step2 formData={formData} updateField={updateField} />}
          {step === 3 && <Step3 formData={formData} updateField={updateField} />}
          {step === 4 && (
            <Step4
              formData={formData}
              updateField={updateField}
              showSpouseSection={showSpouseSection}
              showChildrenSection={showChildrenSection}
              childrenFields={childrenFields}
              updateChild={updateChild}
              handleChildrenCountChange={handleChildrenCountChange}
            />
          )}
        </div>

        {/* Navigation */}
        <div className="flex gap-3 mt-8">
          {step > 1 && (
            <Button
              variant="outline"
              onClick={goBack}
              className="flex-1 h-14 text-base font-semibold"
              disabled={createMember.isPending}
            >
              <ChevronLeft size={20} className="mr-1" />
              Anterior
            </Button>
          )}

          {step < totalSteps ? (
            <Button
              onClick={goNext}
              className="flex-1 h-14 text-base font-semibold bg-primary hover:bg-primary/90"
            >
              Próximo
              <ChevronRight size={20} className="ml-1" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={createMember.isPending}
              className="flex-1 h-14 text-base font-semibold bg-secondary hover:bg-secondary/90 text-secondary-foreground"
            >
              {createMember.isPending ? (
                <>
                  <Loader2 size={20} className="mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <CheckCircle2 size={20} className="mr-2" />
                  Enviar Cadastro
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Step 1: Dados Pessoais ───────────────────────────────────────────────────
function Step1({ formData, updateField }: { formData: Partial<FormData>; updateField: any }) {
  return (
    <div className="space-y-5">
      <div className="form-card p-6">
        <h2 className="text-xl font-serif font-bold text-primary mb-1">Dados Pessoais</h2>
        <p className="text-muted-foreground text-sm mb-5">Informações básicas sobre você</p>

        <div className="space-y-4">
          <FormField label="Nome Completo *" required>
            <Input
              placeholder="Seu nome completo"
              value={formData.fullName || ""}
              onChange={(e) => updateField("fullName", e.target.value)}
              className="h-12 text-base"
            />
          </FormField>

          <FormField label="Data de Nascimento">
            <Input
              type="date"
              value={formData.birthDate || ""}
              onChange={(e) => updateField("birthDate", e.target.value)}
              className="h-12 text-base"
            />
          </FormField>

          <FormField label="Sexo">
            <Select value={formData.gender || ""} onValueChange={(v) => updateField("gender", v)}>
              <SelectTrigger className="h-12 text-base">
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="masculino">Masculino</SelectItem>
                <SelectItem value="feminino">Feminino</SelectItem>
                <SelectItem value="outro">Prefiro não informar</SelectItem>
              </SelectContent>
            </Select>
          </FormField>

          <FormField label="Estado Civil *" required>
            <Select
              value={formData.maritalStatus || ""}
              onValueChange={(v) => updateField("maritalStatus", v)}
            >
              <SelectTrigger className="h-12 text-base">
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="solteiro">Solteiro(a)</SelectItem>
                <SelectItem value="casado">Casado(a)</SelectItem>
                <SelectItem value="uniao_estavel">União Estável</SelectItem>
                <SelectItem value="divorciado">Divorciado(a)</SelectItem>
                <SelectItem value="viuvo">Viúvo(a)</SelectItem>
              </SelectContent>
            </Select>
          </FormField>

          <FormField label="CPF:">
            <div className="space-y-1">
              <Input
                placeholder="000.000.000-00"
                value={formData.cpf || ""}
                onChange={(e) => updateField("cpf", formatCPF(e.target.value))}
                className="h-12 text-base"
              />
              {formData.cpf && formData.cpf.replace(/\D/g, "").length === 11 && (
                <p className={`text-xs ${isValidCPF(formData.cpf) ? "text-green-600" : "text-red-600"}`}>
                  {isValidCPF(formData.cpf) ? "✓ CPF válido" : "✗ CPF inválido"}
                </p>
              )}
            </div>
          </FormField>
        </div>
      </div>
    </div>
  );
}

// ─── Step 2: Contato e Endereço ───────────────────────────────────────────────
function Step2({ formData, updateField }: { formData: Partial<FormData>; updateField: any }) {
  return (
    <div className="space-y-5">
      <div className="form-card p-6">
        <h2 className="text-xl font-serif font-bold text-primary mb-1">Contato</h2>
        <p className="text-muted-foreground text-sm mb-5">Como podemos entrar em contato com você</p>

        <div className="space-y-4">
          <FormField label="Telefone">
            <Input
              placeholder="(17) 99999-9999"
              value={formData.phone || ""}
              onChange={(e) => updateField("phone", formatPhone(e.target.value))}
              className="h-12 text-base"
              type="tel"
            />
          </FormField>

          <FormField label="WhatsApp">
            <Input
              placeholder="(17) 99999-9999"
              value={formData.whatsapp || ""}
              onChange={(e) => updateField("whatsapp", formatPhone(e.target.value))}
              className="h-12 text-base"
              type="tel"
            />
          </FormField>

          <FormField label="E-mail">
            <Input
              placeholder="seu@email.com"
              value={formData.email || ""}
              onChange={(e) => updateField("email", e.target.value)}
              className="h-12 text-base"
              type="email"
            />
          </FormField>
        </div>
      </div>

      <div className="form-card p-6">
        <h2 className="text-xl font-serif font-bold text-primary mb-1">Endereço</h2>
        <p className="text-muted-foreground text-sm mb-5">Onde você mora atualmente</p>

        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <FormField label="CEP">
                <Input
                  placeholder="00000-000"
                  value={formData.zipCode || ""}
                  onChange={(e) => updateField("zipCode", e.target.value)}
                  className="h-12 text-base"
                />
              </FormField>
            </div>
            <FormField label="Estado">
              <Input
                placeholder="SP"
                maxLength={2}
                value={formData.state || ""}
                onChange={(e) => updateField("state", e.target.value.toUpperCase())}
                className="h-12 text-base"
              />
            </FormField>
          </div>

          <FormField label="Cidade">
            <Input
              placeholder="Bady Bassitt"
              value={formData.city || ""}
              onChange={(e) => updateField("city", e.target.value)}
              className="h-12 text-base"
            />
          </FormField>

          <FormField label="Bairro">
            <Input
              placeholder="Nome do bairro"
              value={formData.neighborhood || ""}
              onChange={(e) => updateField("neighborhood", e.target.value)}
              className="h-12 text-base"
            />
          </FormField>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <FormField label="Rua / Avenida">
                <Input
                  placeholder="Nome da rua"
                  value={formData.street || ""}
                  onChange={(e) => updateField("street", e.target.value)}
                  className="h-12 text-base"
                />
              </FormField>
            </div>
            <FormField label="Número">
              <Input
                placeholder="123"
                value={formData.number || ""}
                onChange={(e) => updateField("number", e.target.value)}
                className="h-12 text-base"
              />
            </FormField>
          </div>

          <FormField label="Complemento">
            <Input
              placeholder="Apto, casa, etc."
              value={formData.complement || ""}
              onChange={(e) => updateField("complement", e.target.value)}
              className="h-12 text-base"
            />
          </FormField>
        </div>
      </div>
    </div>
  );
}

// ─── Step 3: Dados da Igreja ──────────────────────────────────────────────────
function Step3({ formData, updateField }: { formData: Partial<FormData>; updateField: any }) {
  return (
    <div className="space-y-5">
      <div className="form-card p-6">
        <h2 className="text-xl font-serif font-bold text-primary mb-1">Vida na Igreja</h2>
        <p className="text-muted-foreground text-sm mb-5">Sua participação na PIB Bady Bassitt</p>

        <div className="space-y-4">
          <FormField label="Congregação">
            <Select
              value={formData.congregation || ""}
              onValueChange={(v) => updateField("congregation", v)}
            >
              <SelectTrigger className="h-12 text-base">
                <SelectValue placeholder="Selecione sua congregação..." />
              </SelectTrigger>
              <SelectContent>
                {CONGREGATIONS.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>

          <FormField label="Ministério">
            <Select
              value={formData.ministry || ""}
              onValueChange={(v) => updateField("ministry", v)}
            >
              <SelectTrigger className="h-12 text-base">
                <SelectValue placeholder="Selecione seu ministério..." />
              </SelectTrigger>
              <SelectContent>
                {MINISTRIES.map((m) => (
                  <SelectItem key={m} value={m}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>

          <FormField label="Frequência nos Cultos">
            <Select
              value={formData.attendanceFrequency || ""}
              onValueChange={(v) => updateField("attendanceFrequency", v)}
            >
              <SelectTrigger className="h-12 text-base">
                <SelectValue placeholder="Com que frequência você vem?" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sempre">Sempre (toda semana)</SelectItem>
                <SelectItem value="quase_sempre">Quase sempre</SelectItem>
                <SelectItem value="as_vezes">Às vezes</SelectItem>
                <SelectItem value="raramente">Raramente</SelectItem>
                <SelectItem value="nunca">Não frequento</SelectItem>
              </SelectContent>
            </Select>
          </FormField>

          <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-xl border border-blue-100">
            <Checkbox
              id="isBaptized"
              checked={formData.isBaptized ?? false}
              onCheckedChange={(v) => updateField("isBaptized", v)}
              className="w-6 h-6"
            />
            <label htmlFor="isBaptized" className="text-base font-medium cursor-pointer">
              Sou batizado(a) nas águas
            </label>
          </div>

          {formData.isBaptized && (
            <FormField label="Data do Batismo">
              <Input
                type="date"
                value={formData.baptismDate || ""}
                onChange={(e) => updateField("baptismDate", e.target.value)}
                className="h-12 text-base"
              />
            </FormField>
          )}

          <FormField label="Contribuição (Dízimo)">
            <Select
              value={formData.isTither || ""}
              onValueChange={(v) => updateField("isTither", v)}
            >
              <SelectTrigger className="h-12 text-base">
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sim">Sim, sou dizimista</SelectItem>
                <SelectItem value="nao">Não</SelectItem>
                <SelectItem value="ocasional">Às vezes / Oferta</SelectItem>
              </SelectContent>
            </Select>
          </FormField>

          <FormField label="Área de Interesse para Servir">
            <Select
              value={formData.serviceArea || ""}
              onValueChange={(v) => updateField("serviceArea", v)}
            >
              <SelectTrigger className="h-12 text-base">
                <SelectValue placeholder="Onde você gostaria de servir?" />
              </SelectTrigger>
              <SelectContent>
                {SERVICE_AREAS.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>

          <FormField label="Dons e Talentos (opcional)">
            <Textarea
              placeholder="Descreva seus dons, talentos ou habilidades que gostaria de usar na obra de Deus..."
              value={formData.gifts || ""}
              onChange={(e) => updateField("gifts", e.target.value)}
              className="text-base min-h-[100px]"
            />
          </FormField>
        </div>
      </div>
    </div>
  );
}

// ─── Step 4: Família ──────────────────────────────────────────────────────────
function Step4({
  formData,
  updateField,
  showSpouseSection,
  showChildrenSection,
  childrenFields,
  updateChild,
  handleChildrenCountChange,
}: any) {
  return (
    <div className="space-y-5">
      {/* Cônjuge */}
      {showSpouseSection && (
        <div className="form-card p-6 border-l-4 border-l-secondary">
          <div className="flex items-center gap-2 mb-4">
            <Heart className="text-secondary" size={20} />
            <h2 className="text-xl font-serif font-bold text-primary">Dados do Cônjuge</h2>
          </div>
          <p className="text-muted-foreground text-sm mb-5">
            Informações sobre seu(sua) esposo(a) / companheiro(a)
          </p>

          <div className="space-y-4">
            <FormField label="Nome Completo do Cônjuge">
              <Input
                placeholder="Nome completo"
                value={formData.spouseName || ""}
                onChange={(e) => updateField("spouseName", e.target.value)}
                className="h-12 text-base"
              />
            </FormField>

            <FormField label="Data de Nascimento">
              <Input
                type="date"
                value={formData.spouseBirthDate || ""}
                onChange={(e) => updateField("spouseBirthDate", e.target.value)}
                className="h-12 text-base"
              />
            </FormField>

            <FormField label="Telefone">
              <Input
                placeholder="(17) 99999-9999"
                value={formData.spousePhone || ""}
                onChange={(e) => updateField("spousePhone", formatPhone(e.target.value))}
                className="h-12 text-base"
                type="tel"
              />
            </FormField>

            <FormField label="WhatsApp">
              <Input
                placeholder="(17) 99999-9999"
                value={formData.spouseWhatsapp || ""}
                onChange={(e) => updateField("spouseWhatsapp", formatPhone(e.target.value))}
                className="h-12 text-base"
                type="tel"
              />
            </FormField>

            <FormField label="E-mail">
              <Input
                placeholder="email@exemplo.com"
                value={formData.spouseEmail || ""}
                onChange={(e) => updateField("spouseEmail", e.target.value)}
                className="h-12 text-base"
                type="email"
              />
            </FormField>

            <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-xl border border-blue-100">
              <Checkbox
                id="spouseIsBaptized"
                checked={formData.spouseIsBaptized ?? false}
                onCheckedChange={(v) => updateField("spouseIsBaptized", v)}
                className="w-6 h-6"
              />
              <label htmlFor="spouseIsBaptized" className="text-base font-medium cursor-pointer">
                Cônjuge é batizado(a) nas águas
              </label>
            </div>

            {formData.spouseIsBaptized && (
              <FormField label="Data do Batismo do Cônjuge">
                <Input
                  type="date"
                  value={formData.spouseBaptismDate || ""}
                  onChange={(e) => updateField("spouseBaptismDate", e.target.value)}
                  className="h-12 text-base"
                />
              </FormField>
            )}

            <FormField label="Ministério do Cônjuge">
              <Select
                value={formData.spouseMinistry || ""}
                onValueChange={(v) => updateField("spouseMinistry", v)}
              >
                <SelectTrigger className="h-12 text-base">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {MINISTRIES.map((m) => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>

            <FormField label="Área de Interesse do Cônjuge">
              <Select
                value={formData.spouseServiceArea || ""}
                onValueChange={(v) => updateField("spouseServiceArea", v)}
              >
                <SelectTrigger className="h-12 text-base">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {SERVICE_AREAS.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>

            <FormField label="Contribuição (Dízimo) do Cônjuge">
              <Select
                value={formData.spouseIsTither || ""}
                onValueChange={(v) => updateField("spouseIsTither", v)}
              >
                <SelectTrigger className="h-12 text-base">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sim">Sim, é dizimista</SelectItem>
                  <SelectItem value="nao">Não</SelectItem>
                  <SelectItem value="ocasional">Às vezes / Oferta</SelectItem>
                </SelectContent>
              </Select>
            </FormField>
          </div>
        </div>
      )}

      {/* Filhos */}
      <div className="form-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <Baby className="text-primary" size={20} />
          <h2 className="text-xl font-serif font-bold text-primary">Filhos</h2>
        </div>

        <FormField label="Possui filhos?">
          <Select
            value={formData.hasChildren || "nao"}
            onValueChange={(v) => updateField("hasChildren", v)}
          >
            <SelectTrigger className="h-12 text-base">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="nao">Não</SelectItem>
              <SelectItem value="sim">Sim</SelectItem>
            </SelectContent>
          </Select>
        </FormField>

        {showChildrenSection && (
          <div className="mt-4 space-y-4">
            <FormField label="Quantos filhos?">
              <Select
                value={formData.childrenCount || "1"}
                onValueChange={handleChildrenCountChange}
              >
                <SelectTrigger className="h-12 text-base">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["1", "2", "3", "4", "5+"].map((n) => (
                    <SelectItem key={n} value={n}>{n}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>

            {childrenFields.map((child: any, idx: number) => (
              <div key={idx} className="p-4 bg-blue-50 rounded-xl border border-blue-100 space-y-3">
                <p className="font-semibold text-primary">
                  {idx + 1}º Filho(a)
                </p>
                <FormField label="Nome Completo">
                  <Input
                    placeholder={`Nome do ${idx + 1}º filho(a)`}
                    value={child.fullName}
                    onChange={(e) => updateChild(idx, "fullName", e.target.value)}
                    className="h-12 text-base"
                  />
                </FormField>
                <FormField label="Data de Nascimento">
                  <Input
                    type="date"
                    value={child.birthDate}
                    onChange={(e) => updateChild(idx, "birthDate", e.target.value)}
                    className="h-12 text-base"
                  />
                </FormField>
                <FormField label="Telefone (opcional)">
                  <Input
                    type="tel"
                    placeholder="(XX) XXXXX-XXXX"
                    value={child.phone || ""}
                    onChange={(e) => updateChild(idx, "phone", formatPhone(e.target.value))}
                    className="h-12 text-base"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Se deixar em branco, herdara o telefone do titular</p>
                </FormField>

                <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-blue-200">
                  <Checkbox
                    id={`child-baptized-${idx}`}
                    checked={child.isBaptized ?? false}
                    onCheckedChange={(v) => updateChild(idx, "isBaptized", v as boolean)}
                    className="w-5 h-5"
                  />
                  <label htmlFor={`child-baptized-${idx}`} className="text-sm font-medium cursor-pointer">
                    Batizado(a) nas águas
                  </label>
                </div>

                {child.isBaptized && (
                  <FormField label="Data do Batismo">
                    <Input
                      type="date"
                      value={child.baptismDate || ""}
                      onChange={(e) => updateChild(idx, "baptismDate", e.target.value)}
                      className="h-12 text-base"
                    />
                  </FormField>
                )}
                <FormField label="Ministério (opcional)">
                  <Select
                    value={child.ministry || ""}
                    onValueChange={(v) => updateChild(idx, "ministry", v)}
                  >
                    <SelectTrigger className="h-12 text-base">
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {MINISTRIES.map((m) => (
                        <SelectItem key={m} value={m}>{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Aviso final */}
      <div className="p-4 bg-green-50 border border-green-200 rounded-xl flex gap-3 items-start">
        <BookOpen className="text-green-600 mt-0.5 shrink-0" size={20} />
        <div>
          <p className="font-semibold text-green-800">Quase lá!</p>
          <p className="text-sm text-green-700">
            Revise suas informações e clique em "Enviar Cadastro". A liderança da igreja receberá
            uma notificação com seus dados.
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Success Screen ───────────────────────────────────────────────────────────
function SuccessScreen({ data }: { data: any }) {
  const typeLabels: Record<string, string> = {
    membro_ativo: "Membro Ativo",
    frequentante: "Frequentante",
    visitante: "Visitante",
    afastado: "Afastado",
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-blue-50 flex flex-col">
      <header className="church-gradient text-white py-6 px-4 shadow-lg">
        <div className="max-w-lg mx-auto flex items-center gap-4">
          <img src={LOGO_URL} alt="PIB Bady Bassitt" className="h-14 w-auto object-contain" />
          <div>
            <h1 className="text-xl font-serif font-bold">Primeira Igreja Batista</h1>
            <p className="text-blue-200 text-sm">Bady Bassitt - SP</p>
          </div>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center">
          <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
            <CheckCircle2 className="text-green-600" size={48} />
          </div>

          <h2 className="text-3xl font-serif font-bold text-primary mb-3">
            Cadastro Enviado!
          </h2>
          <p className="text-muted-foreground text-lg mb-6">
            Que a graça de Deus seja com você! Seu cadastro foi recebido com sucesso.
          </p>

          <div className="form-card p-6 text-left space-y-3 mb-6">
            <div className="flex justify-between items-center py-2 border-b border-border">
              <span className="text-muted-foreground">Código da Família</span>
              <span className="font-mono font-bold text-primary">{data?.familyCode}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-border">
              <span className="text-muted-foreground">Data do Cadastro</span>
              <span className="font-semibold">
                {data?.createdAt ? new Date(data.createdAt).toLocaleString('pt-BR') : '-'}
              </span>
            </div>
            {data?.isDuplicate && (
              <div className="flex gap-2 items-start py-2 text-amber-700">
                <AlertCircle size={18} className="mt-0.5 shrink-0" />
                <span className="text-sm">
                  Possível duplicidade detectada. A liderança verificará seus dados.
                </span>
              </div>
            )}
          </div>

          <p className="text-sm text-muted-foreground">
            A liderança da PIB Bady Bassitt foi notificada e entrará em contato em breve.
            Que Deus abençoe sua vida!
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Helper Component ─────────────────────────────────────────────────────────
function FormField({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-base font-medium">
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </Label>
      {children}
    </div>
  );
}
