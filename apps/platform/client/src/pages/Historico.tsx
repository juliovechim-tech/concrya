import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Shield, Layers, Leaf, Loader2, Trash2, FileText, History } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { usePlano } from "@/hooks/usePlano";
import { Link } from "wouter";
import { PDFDownloadLink } from "@react-pdf/renderer";
import { PacketReport } from "@/components/pdf/PacketReport";
import type { ConcretePacket } from "@concrya/schemas";

type Feature = "compensa" | "nivelix" | "ecorisk";

const featureConfig: Record<Feature, { label: string; color: string; icon: typeof Shield }> = {
  compensa: { label: "COMPENSA", color: "bg-blue-500/20 text-blue-400 border-blue-500/50", icon: Shield },
  nivelix: { label: "NIVELIX", color: "bg-purple-500/20 text-purple-400 border-purple-500/50", icon: Layers },
  ecorisk: { label: "ECORISK", color: "bg-orange-500/20 text-orange-400 border-orange-500/50", icon: Leaf },
};

const statusColor = (status: string) => {
  if (status === "OK" || status === "BAIXO") return "bg-green-500/20 text-green-400 border-green-500/50";
  if (status === "RISCO" || status === "MEDIO") return "bg-yellow-500/20 text-yellow-400 border-yellow-500/50";
  if (status === "ALTO") return "bg-orange-500/20 text-orange-400 border-orange-500/50";
  return "bg-red-500/20 text-red-400 border-red-500/50";
};

function getResultSummary(feature: string, output: ConcretePacket) {
  if (feature === "compensa" && output.compensa) {
    return {
      primary: `${output.compensa.balancoCRC > 0 ? "+" : ""}${output.compensa.balancoCRC} ue`,
      status: output.compensa.status,
    };
  }
  if (feature === "nivelix" && output.nivelix) {
    return {
      primary: `${output.nivelix.espalhamento} mm`,
      status: output.nivelix.status,
    };
  }
  if (feature === "ecorisk" && output.ecorisk) {
    return {
      primary: `Score ${output.ecorisk.score}/100`,
      status: output.ecorisk.nivel,
    };
  }
  return { primary: "—", status: "—" };
}

export default function Historico() {
  const { nivelMinimo, isAuthenticated } = usePlano();
  const canAccess = nivelMinimo("avancado");

  const [filter, setFilter] = useState<Feature | "all">("all");
  const [cursor, setCursor] = useState<number | undefined>(undefined);
  const [allItems, setAllItems] = useState<Array<{
    id: number;
    feature: string;
    input: unknown;
    output: unknown;
    createdAt: string;
  }>>([]);
  const [hasMore, setHasMore] = useState(false);
  const [initialLoaded, setInitialLoaded] = useState(false);

  const queryInput = {
    feature: filter === "all" ? undefined : filter,
    limit: 20,
    cursor,
  };

  const { isLoading, isFetching } = trpc.history.list.useQuery(queryInput, {
    onSuccess: (data: { items: typeof allItems; nextCursor: number | undefined }) => {
      if (cursor) {
        setAllItems((prev) => [...prev, ...data.items]);
      } else {
        setAllItems(data.items);
      }
      setHasMore(data.nextCursor !== undefined);
      setInitialLoaded(true);
    },
  });

  const deleteMutation = trpc.history.delete.useMutation({
    onSuccess: (_data, variables) => {
      setAllItems((prev) => prev.filter((item) => item.id !== variables.id));
      toast.success("Calculo excluido.");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  function handleFilterChange(value: string) {
    setFilter(value as Feature | "all");
    setCursor(undefined);
    setAllItems([]);
    setInitialLoaded(false);
  }

  function handleLoadMore() {
    if (allItems.length > 0) {
      setCursor(allItems[allItems.length - 1].id);
    }
  }

  if (!isAuthenticated || !canAccess) {
    return (
      <div className="container py-16 max-w-2xl mx-auto text-center">
        <History className="w-16 h-16 mx-auto mb-6 text-muted-foreground" />
        <h1 className="text-3xl font-bold uppercase tracking-tighter mb-4">Historico de Calculos</h1>
        <p className="text-muted-foreground mb-8">
          Acesse o historico completo dos seus calculos. Requer plano Avancado ou superior.
        </p>
        <Button asChild className="rounded-none uppercase font-bold">
          <Link href="/pricing">Ver Planos</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container py-12 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold uppercase tracking-tighter">Historico de Calculos</h1>
        <p className="text-muted-foreground mt-2">
          Consulte, exporte e gerencie seus calculos anteriores.
        </p>
      </div>

      {/* Filtros */}
      <Tabs value={filter} onValueChange={handleFilterChange} className="mb-6">
        <TabsList>
          <TabsTrigger value="all">Todos</TabsTrigger>
          <TabsTrigger value="compensa">COMPENSA</TabsTrigger>
          <TabsTrigger value="nivelix">NIVELIX</TabsTrigger>
          <TabsTrigger value="ecorisk">ECORISK</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Lista */}
      {isLoading && !initialLoaded ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : allItems.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <History className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p>Nenhum calculo encontrado{filter !== "all" ? ` para ${filter.toUpperCase()}` : ""}.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {allItems.map((item) => {
            const feat = item.feature as Feature;
            const config = featureConfig[feat];
            const output = item.output as ConcretePacket;
            const input = item.input as { cimentoType?: string; fck?: number };
            const summary = getResultSummary(feat, output);
            const dateStr = new Date(item.createdAt).toLocaleDateString("pt-BR", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            });

            return (
              <Card key={item.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {config && <config.icon className="w-4 h-4 text-primary" />}
                      <Badge className={config?.color ?? ""}>
                        {config?.label ?? feat}
                      </Badge>
                      <span className="text-sm text-muted-foreground">{dateStr}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground font-mono">#{item.id}</span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-6">
                      <div>
                        <span className="text-xs text-muted-foreground block">Cimento</span>
                        <span className="font-mono text-sm">{input.cimentoType ?? "—"}</span>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground block">fck</span>
                        <span className="font-mono text-sm">{input.fck ?? "—"} MPa</span>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground block">Resultado</span>
                        <span className="font-mono text-sm font-bold">{summary.primary}</span>
                      </div>
                      {summary.status !== "—" && (
                        <Badge className={statusColor(summary.status)}>{summary.status}</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <PDFDownloadLink
                        document={
                          <PacketReport
                            packet={output}
                            feature={feat}
                            calculationId={item.id}
                            createdAt={item.createdAt}
                          />
                        }
                        fileName={`concrya-${feat}-${item.id}.pdf`}
                      >
                        {({ loading }) => (
                          <Button variant="outline" size="sm" className="rounded-none" disabled={loading}>
                            {loading ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <><FileText className="w-4 h-4 mr-1" /> PDF</>
                            )}
                          </Button>
                        )}
                      </PDFDownloadLink>

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-300 hover:bg-red-500/10">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Excluir calculo?</AlertDialogTitle>
                            <AlertDialogDescription>
                              O calculo #{item.id} sera removido do seu historico. Esta acao nao pode ser desfeita.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel className="rounded-none">Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              className="rounded-none bg-red-500 hover:bg-red-600"
                              onClick={() => deleteMutation.mutate({ id: item.id })}
                            >
                              Excluir
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {hasMore && (
            <div className="text-center pt-4">
              <Button
                variant="outline"
                className="rounded-none uppercase font-bold"
                onClick={handleLoadMore}
                disabled={isFetching}
              >
                {isFetching ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Carregando...</>
                ) : (
                  "Carregar mais"
                )}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
