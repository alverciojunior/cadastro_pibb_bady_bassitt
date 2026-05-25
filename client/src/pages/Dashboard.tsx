import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from "recharts";
import {
  Users, UserCheck, Home, Heart, Baby, TrendingUp,
  AlertTriangle, Calendar, Church, Star, ArrowUp, ArrowDown
} from "lucide-react";
import { Link } from "wouter";

const COLORS = ["#1e3a5f", "#c9a227", "#2e7d32", "#e65100", "#6a1b9a"];

const MEMBER_TYPE_LABELS: Record<string, string> = {
  membro_ativo: "Membro Ativo",
  frequentante: "Frequentante",
  visitante: "Visitante",
  afastado: "Afastado",
};

const MEMBER_TYPE_COLORS: Record<string, string> = {
  membro_ativo: "bg-green-100 text-green-800",
  frequentante: "bg-blue-100 text-blue-800",
  visitante: "bg-amber-100 text-amber-800",
  afastado: "bg-red-100 text-red-800",
};

export default function Dashboard() {
  const { user } = useAuth();

  const { data: kpis, isLoading: kpisLoading } = trpc.dashboard.kpis.useQuery();
  const { data: byCongregation } = trpc.dashboard.byCongregation.useQuery();
  const { data: byMinistry } = trpc.dashboard.byMinistry.useQuery();
  const { data: byAgeGroup } = trpc.dashboard.byAgeGroup.useQuery();
  const { data: monthlyGrowth } = trpc.dashboard.monthlyGrowth.useQuery();
  const { data: birthdays } = trpc.dashboard.birthdaysThisMonth.useQuery();
  const { data: duplicates } = trpc.dashboard.duplicates.useQuery();

  const pieData = kpis
    ? [
        { name: "Membros Ativos", value: kpis.membrosAtivos },
        { name: "Frequentantes", value: kpis.frequentantes },
        { name: "Visitantes", value: kpis.visitantes },
        { name: "Afastados", value: kpis.afastados },
      ].filter((d) => d.value > 0)
    : [];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-serif font-bold text-primary">
              Painel Administrativo
            </h1>
            <p className="text-muted-foreground">
              Visão geral da base de membros da PIBB Bady Bassitt
            </p>
          </div>
          <Link href="/membros">
            <Button className="bg-primary hover:bg-primary/90">
              <Users size={16} className="mr-2" />
              Ver Todos os Membros
            </Button>
          </Link>
        </div>

        {/* Alertas */}
        {(kpis?.duplicates ?? 0) > 0 && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex gap-3 items-center">
            <AlertTriangle className="text-amber-600 shrink-0" size={20} />
            <div className="flex-1">
              <span className="font-semibold text-amber-800">
                {kpis?.duplicates} cadastro(s) com possível duplicidade detectada.
              </span>
              <span className="text-amber-700 text-sm ml-2">
                Verifique a lista de membros para resolver.
              </span>
            </div>
            <Link href="/membros?filter=duplicates">
              <Button variant="outline" size="sm" className="border-amber-300 text-amber-700">
                Ver
              </Button>
            </Link>
          </div>
        )}

        {/* KPIs Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            title="Total de Membros"
            value={kpis?.totalMembers}
            icon={<Users className="text-primary" size={24} />}
            loading={kpisLoading}
            color="bg-blue-50"
          />
          <KpiCard
            title="Membros Ativos"
            value={kpis?.membrosAtivos}
            icon={<UserCheck className="text-green-600" size={24} />}
            loading={kpisLoading}
            color="bg-green-50"
          />
          <KpiCard
            title="Famílias"
            value={kpis?.totalFamilies}
            icon={<Home className="text-purple-600" size={24} />}
            loading={kpisLoading}
            color="bg-purple-50"
          />
          <KpiCard
            title="Batizados"
            value={kpis?.totalBaptized}
            icon={<Heart className="text-blue-600" size={24} />}
            loading={kpisLoading}
            color="bg-sky-50"
          />
          <KpiCard
            title="Frequentantes"
            value={kpis?.frequentantes}
            icon={<Church className="text-amber-600" size={24} />}
            loading={kpisLoading}
            color="bg-amber-50"
          />
          <KpiCard
            title="Visitantes"
            value={kpis?.visitantes}
            icon={<Star className="text-orange-500" size={24} />}
            loading={kpisLoading}
            color="bg-orange-50"
          />
          <KpiCard
            title="Aniversariantes"
            value={kpis?.birthdaysThisMonth}
            subtitle="este mês"
            icon={<Calendar className="text-pink-600" size={24} />}
            loading={kpisLoading}
            color="bg-pink-50"
          />
          <KpiCard
            title="Novos este Mês"
            value={kpis?.newThisMonth}
            icon={<TrendingUp className="text-teal-600" size={24} />}
            loading={kpisLoading}
            color="bg-teal-50"
            trend={kpis?.growthRate}
          />
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Distribuição por Tipo */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">Distribuição por Situação</CardTitle>
            </CardHeader>
            <CardContent>
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      outerRadius={90}
                      dataKey="value"
                      label={({ name, percent }) =>
                        `${name} (${(percent * 100).toFixed(0)}%)`
                      }
                      labelLine={false}
                    >
                      {pieData.map((_, index) => (
                        <Cell key={index} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <EmptyChart />
              )}
            </CardContent>
          </Card>

          {/* Crescimento Mensal */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">Crescimento Mensal</CardTitle>
            </CardHeader>
            <CardContent>
              {monthlyGrowth && monthlyGrowth.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={monthlyGrowth}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 12 }}
                      tickFormatter={(v) => {
                        const [y, m] = v.split("-");
                        return `${m}/${y?.slice(2)}`;
                      }}
                    />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip
                      labelFormatter={(v) => {
                        const [y, m] = String(v).split("-");
                        return `${m}/${y}`;
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="count"
                      stroke="#1e3a5f"
                      strokeWidth={3}
                      dot={{ fill: "#c9a227", r: 5 }}
                      name="Novos membros"
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <EmptyChart />
              )}
            </CardContent>
          </Card>
        </div>

        {/* Charts Row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Por Congregação */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">Membros por Congregação</CardTitle>
            </CardHeader>
            <CardContent>
              {byCongregation && byCongregation.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={byCongregation} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis type="number" tick={{ fontSize: 12 }} />
                    <YAxis
                      dataKey="name"
                      type="category"
                      tick={{ fontSize: 12 }}
                      width={120}
                    />
                    <Tooltip />
                    <Bar dataKey="value" fill="#1e3a5f" radius={[0, 4, 4, 0]} name="Membros" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <EmptyChart />
              )}
            </CardContent>
          </Card>

          {/* Faixa Etária */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">Distribuição por Faixa Etária</CardTitle>
            </CardHeader>
            <CardContent>
              {byAgeGroup && byAgeGroup.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={byAgeGroup}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="value" fill="#c9a227" radius={[4, 4, 0, 0]} name="Membros" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <EmptyChart />
              )}
            </CardContent>
          </Card>
        </div>

        {/* Ministérios */}
        {byMinistry && byMinistry.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">Membros por Ministério</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={byMinistry.slice(0, 10)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#2e7d32" radius={[4, 4, 0, 0]} name="Membros" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Aniversariantes do Mês */}
        {birthdays && birthdays.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Calendar className="text-pink-500" size={18} />
                Aniversariantes do Mês
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {birthdays.map((b) => (
                  <div
                    key={b.id}
                    className="flex items-center gap-3 p-3 bg-pink-50 rounded-xl border border-pink-100"
                  >
                    <div className="w-10 h-10 bg-pink-200 rounded-full flex items-center justify-center text-pink-700 font-bold text-sm">
                      {b.birthDate
                        ? new Date(b.birthDate).getDate().toString().padStart(2, "0")
                        : "?"}
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{b.fullName}</p>
                      <p className="text-xs text-muted-foreground">{b.phone || b.whatsapp || "—"}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({
  title,
  value,
  subtitle,
  icon,
  loading,
  color,
  trend,
}: {
  title: string;
  value?: number;
  subtitle?: string;
  icon: React.ReactNode;
  loading?: boolean;
  color?: string;
  trend?: number;
}) {
  return (
    <Card className={`${color || "bg-white"} border-0 shadow-sm`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div className={`p-2 rounded-lg bg-white/70`}>{icon}</div>
          {trend !== undefined && trend !== 0 && (
            <div
              className={`flex items-center gap-1 text-xs font-semibold ${
                trend > 0 ? "text-green-600" : "text-red-600"
              }`}
            >
              {trend > 0 ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
              {Math.abs(trend)}%
            </div>
          )}
        </div>
        {loading ? (
          <Skeleton className="h-8 w-16 mb-1" />
        ) : (
          <p className="text-3xl font-bold text-foreground">{value ?? 0}</p>
        )}
        <p className="text-sm text-muted-foreground font-medium">
          {title}
          {subtitle && <span className="text-xs ml-1">({subtitle})</span>}
        </p>
      </CardContent>
    </Card>
  );
}

function EmptyChart() {
  return (
    <div className="h-[260px] flex items-center justify-center text-muted-foreground">
      <div className="text-center">
        <Users size={40} className="mx-auto mb-2 opacity-30" />
        <p className="text-sm">Nenhum dado disponível ainda</p>
        <p className="text-xs">Cadastre membros para ver os gráficos</p>
      </div>
    </div>
  );
}
