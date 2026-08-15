import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Spinner } from "@/components/ui/spinner";
import { AlertCircle } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";

const COLORS = ["#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899"];

export function AnalyticsDashboard() {
  // Queries
  const monthlyGrowthQuery = trpc.analytics.monthlyGrowth.useQuery();
  const ministryDistributionQuery = trpc.analytics.ministryDistribution.useQuery();
  const statusDistributionQuery = trpc.analytics.statusDistribution.useQuery();
  const growthStatsQuery = trpc.analytics.growthStats.useQuery();
  const topMinistriesQuery = trpc.analytics.topMinistries.useQuery();

  const isLoading =
    monthlyGrowthQuery.isLoading ||
    ministryDistributionQuery.isLoading ||
    statusDistributionQuery.isLoading ||
    growthStatsQuery.isLoading ||
    topMinistriesQuery.isLoading;

  const hasError =
    monthlyGrowthQuery.isError ||
    ministryDistributionQuery.isError ||
    statusDistributionQuery.isError ||
    growthStatsQuery.isError ||
    topMinistriesQuery.isError;

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-screen">
          <Spinner />
        </div>
      </DashboardLayout>
    );
  }

  if (hasError) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-screen">
          <Card className="p-6 max-w-md">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-6 h-6 text-red-600" />
              <div>
                <h2 className="font-semibold text-red-900">Erro ao carregar dados</h2>
                <p className="text-sm text-red-700">Não foi possível carregar os dados de análise. Tente recarregar a página.</p>
              </div>
            </div>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard de Análise</h1>
        <p className="text-gray-600 mt-2">Visualize o crescimento e distribuição de famílias</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-6">
          <div className="text-gray-600 text-sm font-medium">Total de Famílias</div>
          <div className="text-3xl font-bold text-gray-900 mt-2">
            {growthStatsQuery.data?.totalFamilies || 0}
          </div>
        </Card>

        <Card className="p-6">
          <div className="text-gray-600 text-sm font-medium">Novos Este Mês</div>
          <div className="text-3xl font-bold text-blue-600 mt-2">
            {growthStatsQuery.data?.newThisMonth || 0}
          </div>
        </Card>

        <Card className="p-6">
          <div className="text-gray-600 text-sm font-medium">Crescimento</div>
          <div className="text-3xl font-bold text-green-600 mt-2">
            {growthStatsQuery.data?.growthPercentage || 0}%
          </div>
        </Card>

        <Card className="p-6">
          <div className="text-gray-600 text-sm font-medium">Mês Anterior</div>
          <div className="text-3xl font-bold text-gray-900 mt-2">
            {growthStatsQuery.data?.lastMonthCount || 0}
          </div>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Crescimento Mensal */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Crescimento Mensal (Últimos 12 Meses)</h2>
          {(monthlyGrowthQuery.data?.length ?? 0) > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyGrowthQuery.data || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ fill: "#3b82f6", r: 4 }}
                  name="Novas Famílias"
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-gray-500">
              <p>Sem dados de crescimento</p>
            </div>
          )}
        </Card>

        {/* Distribuição por Situação */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Distribuição por Situação</h2>
          {(statusDistributionQuery.data?.length ?? 0) > 0 ? (
            <div className="flex flex-col lg:flex-row gap-6">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={statusDistributionQuery.data || []}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {(statusDistributionQuery.data || []).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `${value}`} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-col justify-center gap-3 min-w-[200px]">
                {(statusDistributionQuery.data || []).map((entry, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <div
                      className="w-4 h-4 rounded"
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <span className="text-sm text-gray-700">
                      {entry.name}: <span className="font-semibold">{entry.value}</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-gray-500">
              <p>Sem dados de situação</p>
            </div>
          )}
        </Card>

        {/* Top Ministérios */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Top 5 Ministérios</h2>
          {(topMinistriesQuery.data?.length ?? 0) > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topMinistriesQuery.data || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#10b981" name="Quantidade" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-gray-500">
              <p>Sem dados de ministérios</p>
            </div>
          )}
        </Card>

        {/* Todos os Ministérios */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Distribuição por Ministério</h2>
          {(ministryDistributionQuery.data?.length ?? 0) > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={ministryDistributionQuery.data || []}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 200, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={190} />
                <Tooltip />
                <Bar dataKey="value" fill="#8b5cf6" name="Quantidade" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-gray-500">
              <p>Sem dados de ministérios</p>
            </div>
          )}
        </Card>
      </div>

      {/* Tabela de Detalhes */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Resumo de Ministérios</h2>
        {(ministryDistributionQuery.data?.length ?? 0) > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-4 font-semibold">Ministério</th>
                  <th className="text-right py-2 px-4 font-semibold">Quantidade</th>
                  <th className="text-right py-2 px-4 font-semibold">Percentual</th>
                </tr>
              </thead>
              <tbody>
                {(ministryDistributionQuery.data || []).map((item, index) => {
                  const total = (ministryDistributionQuery.data || []).reduce((sum, m) => sum + m.value, 0);
                  const percentage = ((item.value / total) * 100).toFixed(1);
                  return (
                    <tr key={index} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">{item.name}</td>
                      <td className="py-3 px-4 text-right">{item.value}</td>
                      <td className="py-3 px-4 text-right">{percentage}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="h-32 flex items-center justify-center text-gray-500">
            <p>Sem dados de ministérios</p>
          </div>
        )}
      </Card>
    </div>
    </DashboardLayout>
  );
}
