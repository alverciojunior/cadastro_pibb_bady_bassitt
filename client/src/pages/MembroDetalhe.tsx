import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  User, Phone, Mail, MapPin, Church, Heart, Baby,
  BookOpen, Sparkles, Edit, ChevronLeft, AlertTriangle,
  Loader2, CheckCircle2, Calendar, Trash2
} from "lucide-react";
import { Link } from "wouter";

const MEMBER_TYPE_LABELS: Record<string, string> = {
  membro_ativo: "Membro Ativo",
  frequentante: "Frequentante",
  visitante: "Visitante",
  afastado: "Afastado",
};

const MEMBER_TYPE_COLORS: Record<string, string> = {
  membro_ativo: "bg-green-100 text-green-800 border-green-200",
  frequentante: "bg-blue-100 text-blue-800 border-blue-200",
  visitante: "bg-amber-100 text-amber-800 border-amber-200",
  afastado: "bg-red-100 text-red-800 border-red-200",
};

const FREQUENCY_LABELS: Record<string, string> = {
  sempre: "Sempre (toda semana)",
  quase_sempre: "Quase sempre",
  as_vezes: "Às vezes",
  raramente: "Raramente",
  nunca: "Não frequenta",
};

export default function MembroDetalhe() {
  const { id } = useParams<{ id: string }>();
  const memberId = parseInt(id || "0");
  const [, navigate] = useLocation();
  const [pastoralNotes, setPastoralNotes] = useState("");
  const [editingNotes, setEditingNotes] = useState(false);

  const { data: member, isLoading, refetch } = trpc.members.getById.useQuery(memberId, {
    enabled: !!memberId,
  });

  useEffect(() => {
    if (member) {
      setPastoralNotes(member.pastoralNotes || "");
    }
  }, [member?.id]);

  const generateSuggestions = trpc.members.generatePastoralSuggestions.useMutation({
    onSuccess: () => {
      toast.success("Sugestões pastorais geradas com sucesso!");
      refetch();
    },
    onError: (err) => {
      toast.error("Erro ao gerar sugestões: " + err.message);
    },
  });

  const updateNotes = trpc.members.updatePastoralNotes.useMutation({
    onSuccess: () => {
      toast.success("Observações salvas!");
      setEditingNotes(false);
      refetch();
    },
  });

  const deleteMember = trpc.members.delete.useMutation({
    onSuccess: () => {
      toast.success("Membro excluído com sucesso!");
      navigate("/membros");
    },
    onError: (err) => {
      toast.error("Erro ao excluir membro: " + err.message);
    },
  });

  const handleDelete = () => {
    if (window.confirm(`Tem certeza que deseja excluir ${member?.fullName}? Esta ação não pode ser desfeita.`)) {
      deleteMember.mutate({ id: memberId });
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-4">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-40 rounded-xl" />
          <Skeleton className="h-60 rounded-xl" />
        </div>
      </DashboardLayout>
    );
  }

  if (!member) {
    return (
      <DashboardLayout>
        <div className="text-center py-16">
          <p className="text-muted-foreground">Membro não encontrado.</p>
          <Link href="/membros">
            <Button variant="outline" className="mt-4">Voltar</Button>
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  const formatDate = (d: any) => {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("pt-BR");
  };

  const age = member.birthDate
    ? Math.floor((Date.now() - new Date(member.birthDate).getTime()) / (365.25 * 24 * 3600 * 1000))
    : null;

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-3xl mx-auto">
        {/* Back + Actions */}
        <div className="flex items-center justify-between">
          <Link href="/membros">
            <Button variant="ghost" className="gap-2">
              <ChevronLeft size={18} />
              Voltar
            </Button>
          </Link>
          <div className="flex gap-2">
            <Link href={`/membros/${memberId}/editar`}>
              <Button className="gap-2 bg-primary hover:bg-primary/90">
                <Edit size={16} />
                Editar
              </Button>
            </Link>
            <Button
              variant="destructive"
              className="gap-2"
              onClick={handleDelete}
              disabled={deleteMember.isPending}
            >
              <Trash2 size={16} />
              {deleteMember.isPending ? "Excluindo..." : "Excluir"}
            </Button>
          </div>
        </div>

        {/* Header Card */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start gap-5">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-3xl shrink-0">
                {member.fullName.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <h1 className="text-2xl font-serif font-bold">{member.fullName}</h1>
                  {member.hasDuplicate && (
                    <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 gap-1">
                      <AlertTriangle size={12} />
                      Duplicidade
                    </Badge>
                  )}
                </div>

                <div className="flex flex-wrap gap-2 mb-3">
                  <Badge
                    variant="outline"
                    className={MEMBER_TYPE_COLORS[member.memberType || "visitante"]}
                  >
                    {MEMBER_TYPE_LABELS[member.memberType || "visitante"]}
                  </Badge>
                  {member.isBaptized && (
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                      Batizado(a)
                    </Badge>
                  )}
                  {member.congregation && (
                    <Badge variant="outline">{member.congregation}</Badge>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm text-muted-foreground">
                  {age && <span>{age} anos • {formatDate(member.birthDate)}</span>}
                  {member.gender && (
                    <span>{member.gender.charAt(0).toUpperCase() + member.gender.slice(1)}</span>
                  )}
                  {member.maritalStatus && (
                    <span>{member.maritalStatus.replace("_", " ")}</span>
                  )}
                  <span>Cadastrado em {formatDate(member.createdAt)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contato */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Phone size={16} className="text-primary" />
              Contato
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <InfoRow label="Telefone" value={member.phone} />
            <InfoRow label="WhatsApp" value={member.whatsapp} />
            <InfoRow label="E-mail" value={member.email} />
            <InfoRow label="CPF" value={member.cpf} />
            {(member.street || member.city) && (
              <>
                <Separator />
                <InfoRow
                  label="Endereço"
                  value={[member.street, member.number, member.neighborhood, member.city, member.state]
                    .filter(Boolean)
                    .join(", ")}
                />
              </>
            )}
          </CardContent>
        </Card>

        {/* Igreja */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Church size={16} className="text-primary" />
              Vida na Igreja
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <InfoRow label="Congregação" value={member.congregation} />
            <InfoRow label="Ministério" value={member.ministry} />
            <InfoRow label="Frequência" value={FREQUENCY_LABELS[member.attendanceFrequency || ""] || member.attendanceFrequency} />
            <InfoRow label="Batismo" value={member.isBaptized ? `Sim (${formatDate(member.baptismDate)})` : "Não"} />
            <InfoRow label="Dízimo" value={member.isTither} />
            <InfoRow label="Área de Interesse" value={member.serviceArea} />
            {member.gifts && <InfoRow label="Dons/Talentos" value={member.gifts} />}
          </CardContent>
        </Card>

        {/* Cônjuge */}
        {member.spouseName && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Heart size={16} className="text-secondary" />
                Cônjuge
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <InfoRow label="Nome" value={member.spouseName} />
              <InfoRow label="Nascimento" value={formatDate(member.spouseBirthDate)} />
              <InfoRow label="Telefone" value={member.spousePhone} />
              <InfoRow label="WhatsApp" value={member.spouseWhatsapp} />
              <InfoRow label="Ministério" value={member.spouseMinistry} />
              <InfoRow label="Batizado(a)" value={member.spouseIsBaptized ? `Sim${member.spouseBaptismDate ? ` (${formatDate(member.spouseBaptismDate)})` : ""}` : "Não"} />
            </CardContent>
          </Card>
        )}

        {/* Filhos */}
        {member.children && member.children.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Baby size={16} className="text-primary" />
                Filhos ({member.children.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {member.children.map((child, idx) => (
                  <div key={child.id} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-bold">
                      {idx + 1}
                    </div>
                    <div>
                      <p className="font-medium">{child.fullName}</p>
                      {child.birthDate && (
                        <p className="text-sm text-muted-foreground">
                          {formatDate(child.birthDate)}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {child.isBaptized
                          ? `Batizado(a)${child.baptismDate ? ` em ${formatDate(child.baptismDate)}` : ""}`
                          : "Não batizado(a)"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Observações Pastorais */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <BookOpen size={16} className="text-primary" />
                Observações Pastorais
              </CardTitle>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => generateSuggestions.mutate(memberId)}
                  disabled={generateSuggestions.isPending}
                  className="gap-1 text-xs"
                >
                  {generateSuggestions.isPending ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : (
                    <Sparkles size={13} className="text-amber-500" />
                  )}
                  Gerar com IA
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingNotes(!editingNotes)}
                  className="gap-1 text-xs"
                >
                  <Edit size={13} />
                  Editar
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Notas manuais */}
            {editingNotes ? (
              <div className="space-y-2">
                <Textarea
                  value={pastoralNotes}
                  onChange={(e) => setPastoralNotes(e.target.value)}
                  placeholder="Adicione observações pastorais sobre este membro..."
                  className="min-h-[120px] text-base"
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => updateNotes.mutate({ id: memberId, notes: pastoralNotes })}
                    disabled={updateNotes.isPending}
                    className="gap-1"
                  >
                    {updateNotes.isPending ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
                    Salvar
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setEditingNotes(false)}>
                    Cancelar
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {member.pastoralNotes || "Nenhuma observação registrada."}
              </p>
            )}

            {/* Sugestões da IA */}
            {member.aiPastoralSuggestions && (
              <>
                <Separator />
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles size={14} className="text-amber-500" />
                    <span className="text-sm font-semibold text-amber-700">
                      Sugestões Geradas por IA
                    </span>
                  </div>
                  <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
                    <p className="text-sm whitespace-pre-wrap text-foreground/80">
                      {member.aiPastoralSuggestions}
                    </p>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex gap-2 text-sm">
      <span className="text-muted-foreground min-w-[120px] shrink-0">{label}:</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
