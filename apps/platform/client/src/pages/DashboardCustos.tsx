import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TrendingUp, TrendingDown, DollarSign, BarChart3, Package } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
} from "recharts";

export default function DashboardCustos() {
  const { isAuthenticated } = useAuth({ redirectOnUnauthenticated: true });
  const [tracoFiltro, setTracoFiltro] = useState<string>("todos");

  const { data: tracos = [] } = trpc.tracos.list.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const { data: historico = [], isLoading } = trpc.historico.list.useQuery(
    { tracoId: tracoFiltro !== "todos" ? Number(tracoFiltro) : undefined },
    { enabled: isAuthenticated }
  );

  // Dados para o gráfico de evolução
  const dadosGrafico = useMemo(() => {
    if (!historico.length) return [];

    const sorted = [...historico].sort(
      (a, b) => new Date(a.data).getTime() - new Date(b.data).getTime()
    );

    return sorted.map((item) => ({
      data: format(new Date(item.data), "dd/MM/yy"),
      custoM3: Number(item.custoM3),
      tracoId: item.tracoId,
    }));
  }, [historico]);

  // Dados agrupados por traço para o gráfico de barras
  const custoPorTraco = useMemo(() => {
    if (!tracos.length) return [];

    return tracos
      .filter((t) => t.custoM3)
      .map((t) => ({
        nome: t.nome.length > 20 ? t.nome.substring(0, 20) + "..." : t.nome,
        custoM3: Number(t.custoM3),
        tipo: t.tipoConcreto,
      }))
      .sort((a, b) => a.custoM3 - b.custoM3);
  }, [tracos]);

  // Estatísticas resumidas
  const stats = useMemo(() => {
    const custos = tracos.filter((t) => t.custoM3).map((t) => Number(t.custoM3));
    if (!custos.length) return null;

    const media = custos.reduce((a, b) => a + b, 0) / custos.length;
    const menor = Math.min(...custos);
    const maior = Math.max(...custos);

    // Variação: comparar últimos 2 registros do histórico
    let variacao: number | null = null;
    if (historico.length >= 2) {
      const sorted = [...historico].sort(
        (a, b) => new Date(b.data).getTime() - new Date(a.data).getTime()
      );
      const ultimo = Number(sorted[0].custoM3);
      const penultimo = Number(sorted[1].custoM3);
      variacao = ((ultimo - penultimo) / penultimo) * 100;
    }

    return { media, menor, maior, total: custos.length, variacao };
  }, [tracos, historico]);

  if (!isAuthenticated) return null;

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
          <BarChart3 className="h-8 w-8 text-orange-500" />
          Dashboard de Custos
        </h1>
        <p className="text-muted-foreground mt-2">
          Acompanhe a evolução dos custos por m³ dos seus traços de concreto
        </p>
      </div>

      {/* Cards de resumo */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Custo Médio/m³</p>
                  <p className="text-2xl font-bold">R$ {stats.media.toFixed(2)}</p>
                </div>
                <DollarSign className="h-8 w-8 text-orange-500 opacity-80" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Menor Custo/m³</p>
                  <p className="text-2xl font-bold text-green-500">
                    R$ {stats.menor.toFixed(2)}
                  </p>
                </div>
                <TrendingDown className="h-8 w-8 text-green-500 opacity-80" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Maior Custo/m³</p>
                  <p className="text-2xl font-bold text-red-500">
                    R$ {stats.maior.toFixed(2)}
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-red-500 opacity-80" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Traços Salvos</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                  {stats.variacao !== null && (
                    <p
                      className={`text-xs mt-1 ${stats.variacao > 0 ? "text-red-500" : "text-green-500"}`}
                    >
                      {stats.variacao > 0 ? "+" : ""}
                      {stats.variacao.toFixed(1)}% vs anterior
                    </p>
                  )}
                </div>
                <Package className="h-8 w-8 text-blue-500 opacity-80" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filtro + Gráfico de evolução */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <CardTitle>Evolução de Custos</CardTitle>
                <CardDescription>Histórico de custo por m³ ao longo do tempo</CardDescription>
              </div>
              <Select value={tracoFiltro} onValueChange={setTracoFiltro}>
                <SelectTrigger className="w-[220px]">
                  <SelectValue placeholder="Filtrar por traço" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os traços</SelectItem>
                  {tracos.map((t) => (
                    <SelectItem key={t.id} value={String(t.id)}>
                      {t.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-[300px] flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" />
              </div>
            ) : dadosGrafico.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={dadosGrafico}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="data" fontSize={12} />
                  <YAxis
                    fontSize={12}
                    tickFormatter={(v) => `R$${v}`}
                  />
                  <Tooltip
                    formatter={(value: number) => [`R$ ${value.toFixed(2)}`, "Custo/m³"]}
                    labelStyle={{ color: "#888" }}
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="custoM3"
                    stroke="#f97316"
                    strokeWidth={2}
                    dot={{ fill: "#f97316", r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhum registro de custo encontrado.</p>
                  <p className="text-sm mt-1">
                    Salve traços com custos para ver a evolução aqui.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Gráfico de barras comparativo */}
        <Card>
          <CardHeader>
            <CardTitle>Comparativo por Traço</CardTitle>
            <CardDescription>Custo/m³ de cada traço salvo</CardDescription>
          </CardHeader>
          <CardContent>
            {custoPorTraco.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={custoPorTraco} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis type="number" fontSize={12} tickFormatter={(v) => `R$${v}`} />
                  <YAxis dataKey="nome" type="category" fontSize={11} width={100} />
                  <Tooltip
                    formatter={(value: number) => [`R$ ${value.toFixed(2)}`, "Custo/m³"]}
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Bar dataKey="custoM3" fill="#f97316" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground text-sm">
                Nenhum traço com custo cadastrado.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tabela detalhada */}
      <Card>
        <CardHeader>
          <CardTitle>Histórico Detalhado</CardTitle>
          <CardDescription>Todos os registros de custo ordenados por data</CardDescription>
        </CardHeader>
        <CardContent>
          {historico.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Traço</TableHead>
                    <TableHead className="text-right">Custo/m³</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {historico.map((item) => {
                    const traco = tracos.find((t) => t.id === item.tracoId);
                    return (
                      <TableRow key={item.id}>
                        <TableCell>
                          {format(new Date(item.data), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                        </TableCell>
                        <TableCell>{traco?.nome || `Traço #${item.tracoId}`}</TableCell>
                        <TableCell className="text-right font-mono font-semibold">
                          R$ {Number(item.custoM3).toFixed(2)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              Nenhum registro de custo encontrado.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
