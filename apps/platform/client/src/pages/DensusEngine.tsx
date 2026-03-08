import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { AlertCircle, Loader2, Shield, Brain, AlertTriangle, Cog } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { usePlano } from "@/hooks/usePlano";
import { Link } from "wouter";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import type { ConcretePacket } from "@concrya/schemas";

const CIMENTO_TYPES = [
  "CP I", "CP II-E", "CP II-F", "CP II-Z", "CP III", "CP IV", "CP V ARI",
] as const;

const METODOS_GRAN = [
  { label: "Fuller (1907)", value: "Fuller" },
  { label: "Faury (1958)", value: "Faury" },
  { label: "Bolomey (1935)", value: "Bolomey" },
  { label: "Andreasen-Mulcahy", value: "Andreasen" },
] as const;

export default function DensusEngine() {
  const { nivelMinimo, isAuthenticated } = usePlano();
  const canAccess = nivelMinimo("avancado");

  const [cimentoType, setCimentoType] = useState("CP V ARI");
  const [fck, setFck] = useState("40");
  const [ac, setAc] = useState("0.42");
  const [slump, setSlump] = useState("200");
  const [consumoCimento, setConsumoCimento] = useState("380");
  const [consumoAgua, setConsumoAgua] = useState("160");
  const [consumoAreia, setConsumoAreia] = useState("750");
  const [consumoBrita, setConsumoBrita] = useState("950");

  const [metodoGran, setMetodoGran] = useState("Fuller");
  const [dmax, setDmax] = useState("25");
  const [dmin, setDmin] = useState("0.075");
  const [q, setQ] = useState("0.37");
  const [precoCimento, setPrecoCimento] = useState("0.50");
  const [precoAreia, setPrecoAreia] = useState("0.08");
  const [precoBrita, setPrecoBrita] = useState("0.10");

  const [result, setResult] = useState<ConcretePacket | null>(null);

  const calcMutation = trpc.dosagem.calcular.useMutation({
    onSuccess: (data) => {
      setResult(data as ConcretePacket);
      toast.success("Densus Engine concluido!");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  if (!isAuthenticated || !canAccess) {
    return (
      <div className="container py-16 max-w-2xl mx-auto text-center">
        <Cog className="w-16 h-16 mx-auto mb-6 text-muted-foreground" />
        <h1 className="text-3xl font-bold uppercase tracking-tighter mb-4">DENSUS ENGINE</h1>
        <p className="text-muted-foreground mb-8">
          Motor de dosagem completo com granulometria e empacotamento. Requer plano Avancado ou superior.
        </p>
        <Button asChild className="rounded-none uppercase font-bold">
          <Link href="/pricing">Ver Planos</Link>
        </Button>
      </div>
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const precos: Record<string, number> = {};
    if (parseFloat(precoCimento) > 0) precos.cimento = parseFloat(precoCimento);
    if (parseFloat(precoAreia) > 0) precos.areia = parseFloat(precoAreia);
    if (parseFloat(precoBrita) > 0) precos.brita = parseFloat(precoBrita);

    calcMutation.mutate({
      cimentoType,
      fck: parseFloat(fck),
      ac: parseFloat(ac),
      slump: parseFloat(slump),
      consumoCimento: parseFloat(consumoCimento),
      consumoAgua: parseFloat(consumoAgua),
      consumoAreia: parseFloat(consumoAreia),
      consumoBrita: parseFloat(consumoBrita),
      metodoGranulometria: metodoGran as "Fuller" | "Faury" | "Bolomey" | "Andreasen",
      dmax: parseFloat(dmax),
      dmin: metodoGran === "Andreasen" ? parseFloat(dmin) : undefined,
      q: metodoGran === "Andreasen" ? parseFloat(q) : undefined,
      precos: Object.keys(precos).length > 0 ? precos : undefined,
    });
  }

  return (
    <div className="container py-12 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold uppercase tracking-tighter">DENSUS ENGINE</h1>
        <p className="text-muted-foreground mt-2">
          Motor de dosagem completo — traco unitario · granulometria · empacotamento CPM · custo
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Formulario */}
        <Card>
          <CardHeader>
            <CardTitle>Dados do Traco</CardTitle>
            <CardDescription>Formulacao base + parametros de granulometria</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tipo de Cimento</Label>
                  <Select value={cimentoType} onValueChange={setCimentoType}>
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CIMENTO_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>fck (MPa)</Label>
                  <Input type="number" value={fck} onChange={(e) => setFck(e.target.value)} step="1" min="1" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>a/c</Label>
                  <Input type="number" value={ac} onChange={(e) => setAc(e.target.value)} step="0.01" min="0.20" max="0.90" />
                </div>
                <div className="space-y-2">
                  <Label>Slump (mm)</Label>
                  <Input type="number" value={slump} onChange={(e) => setSlump(e.target.value)} step="10" min="0" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Cimento (kg/m3)</Label>
                  <Input type="number" value={consumoCimento} onChange={(e) => setConsumoCimento(e.target.value)} step="10" />
                </div>
                <div className="space-y-2">
                  <Label>Agua (L/m3)</Label>
                  <Input type="number" value={consumoAgua} onChange={(e) => setConsumoAgua(e.target.value)} step="5" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Areia (kg/m3)</Label>
                  <Input type="number" value={consumoAreia} onChange={(e) => setConsumoAreia(e.target.value)} step="10" />
                </div>
                <div className="space-y-2">
                  <Label>Brita (kg/m3)</Label>
                  <Input type="number" value={consumoBrita} onChange={(e) => setConsumoBrita(e.target.value)} step="10" />
                </div>
              </div>

              {/* Granulometria */}
              <div className="border-t border-border pt-4 mt-4">
                <h3 className="font-semibold mb-3 uppercase text-sm tracking-wider">Granulometria</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Metodo</Label>
                    <Select value={metodoGran} onValueChange={setMetodoGran}>
                      <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {METODOS_GRAN.map((m) => (
                          <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Dmax (mm)</Label>
                    <Input type="number" value={dmax} onChange={(e) => setDmax(e.target.value)} step="1" min="1" />
                  </div>
                </div>

                {metodoGran === "Andreasen" && (
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div className="space-y-2">
                      <Label>Dmin (mm)</Label>
                      <Input type="number" value={dmin} onChange={(e) => setDmin(e.target.value)} step="0.001" min="0.001" />
                    </div>
                    <div className="space-y-2">
                      <Label>q (expoente)</Label>
                      <Input type="number" value={q} onChange={(e) => setQ(e.target.value)} step="0.05" min="0.1" max="0.9" />
                    </div>
                  </div>
                )}
              </div>

              {/* Custo */}
              <div className="border-t border-border pt-4 mt-4">
                <h3 className="font-semibold mb-3 uppercase text-sm tracking-wider">Precos (R$/kg)</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Cimento</Label>
                    <Input type="number" value={precoCimento} onChange={(e) => setPrecoCimento(e.target.value)} step="0.01" min="0" />
                  </div>
                  <div className="space-y-2">
                    <Label>Areia</Label>
                    <Input type="number" value={precoAreia} onChange={(e) => setPrecoAreia(e.target.value)} step="0.01" min="0" />
                  </div>
                  <div className="space-y-2">
                    <Label>Brita</Label>
                    <Input type="number" value={precoBrita} onChange={(e) => setPrecoBrita(e.target.value)} step="0.01" min="0" />
                  </div>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full rounded-none uppercase font-bold mt-4"
                disabled={calcMutation.isPending}
              >
                {calcMutation.isPending ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Calculando...</>
                ) : (
                  "Calcular Densus Engine"
                )}
              </Button>

              {calcMutation.isError && (
                <div className="flex items-center gap-2 text-red-400 text-sm mt-2">
                  <AlertCircle className="w-4 h-4" />
                  <span>{calcMutation.error.message}</span>
                </div>
              )}
            </form>
          </CardContent>
        </Card>

        {/* Resultados */}
        <div className="space-y-6">
          {result?.densus ? (
            <>
              {/* Card TRAÇO UNITÁRIO */}
              <Card>
                <CardHeader>
                  <CardTitle>Traco Unitario</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-center gap-3 text-2xl font-mono font-bold">
                      <span>1</span>
                      <span className="text-muted-foreground">:</span>
                      <span>{result.densus.tracaoUnitario.areia}</span>
                      <span className="text-muted-foreground">:</span>
                      <span>{result.densus.tracaoUnitario.brita}</span>
                      <span className="text-muted-foreground">:</span>
                      <span className="text-blue-400">{result.densus.tracaoUnitario.agua}</span>
                    </div>
                    <div className="text-center text-xs text-muted-foreground">
                      cimento : areia : brita : a/c
                    </div>

                    <div className="border-t border-border pt-3 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Cimento</span>
                        <span className="font-mono">{result.mix.consumoCimento} kg/m3</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Agua</span>
                        <span className="font-mono">{result.mix.consumoAgua} L/m3</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Areia</span>
                        <span className="font-mono">{result.mix.consumoAreia} kg/m3</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Brita</span>
                        <span className="font-mono">{result.mix.consumoBrita} kg/m3</span>
                      </div>
                    </div>

                    <div className="border-t border-border pt-3">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-muted-foreground">Volumes Absolutos</span>
                        <span className="font-mono font-bold">{result.densus.volumes.total} dm3</span>
                      </div>
                      <Progress
                        value={Math.min(100, (result.densus.volumes.total / 1000) * 100)}
                        className="h-2"
                      />
                      <div className="text-xs text-muted-foreground mt-1">
                        Meta: 1000 dm3/m3
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Card GRANULOMETRIA */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Granulometria</CardTitle>
                    <Badge variant="outline">{result.densus.granulometria.metodo}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={[...result.densus.granulometria.curva]
                          .sort((a, b) => a.peneira - b.peneira)
                          .map(p => ({
                            peneira: p.peneira,
                            cpft: p.cpft,
                            label: p.peneira >= 1 ? `${p.peneira}` : `${p.peneira}`,
                          }))}
                        margin={{ top: 5, right: 20, bottom: 20, left: 10 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                        <XAxis
                          dataKey="peneira"
                          scale="log"
                          domain={["dataMin", "dataMax"]}
                          tickFormatter={(v: number) => v >= 1 ? `${v}` : `${v}`}
                          label={{ value: "Peneira (mm)", position: "bottom", offset: 5, fill: "#888", fontSize: 11 }}
                          stroke="#666"
                          fontSize={10}
                        />
                        <YAxis
                          domain={[0, 100]}
                          label={{ value: "% Passante", angle: -90, position: "insideLeft", fill: "#888", fontSize: 11 }}
                          stroke="#666"
                          fontSize={10}
                        />
                        <Tooltip
                          contentStyle={{ backgroundColor: "#1a1a1a", border: "1px solid #333", borderRadius: 0 }}
                          formatter={(value: number) => [`${value.toFixed(1)}%`, "CPFT"]}
                          labelFormatter={(label: number) => `Peneira: ${label} mm`}
                        />
                        <Line
                          type="monotone"
                          dataKey="cpft"
                          stroke="#f97316"
                          strokeWidth={2}
                          dot={{ r: 3, fill: "#f97316" }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Linha inferior: CPM + CUSTO + AION */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* CPM */}
                {result.densus.cpm && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">CPM — Empacotamento</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="text-center">
                          <span className="text-3xl font-bold font-mono text-primary">
                            {Math.round(result.densus.cpm.phi * 100)}%
                          </span>
                          <div className="text-xs text-muted-foreground mt-1">phi virtual</div>
                        </div>
                        <Progress value={result.densus.cpm.phi * 100} className="h-2" />
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Real</span>
                          <span className="font-mono">{Math.round(result.densus.cpm.empacotamentoReal * 100)}%</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Dominante</span>
                          <span className="font-mono">{result.densus.cpm.materialDominante}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* CUSTO */}
                {result.densus.custo && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Custo</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="text-center">
                          <span className="text-2xl font-bold font-mono text-green-400">
                            R$ {result.densus.custo.total.toFixed(2)}
                          </span>
                          <div className="text-xs text-muted-foreground mt-1">por m3</div>
                        </div>
                        {Object.entries(result.densus.custo.breakdown).map(([mat, valor]) => (
                          <div key={mat} className="space-y-1">
                            <div className="flex justify-between text-xs">
                              <span className="text-muted-foreground capitalize">{mat}</span>
                              <span className="font-mono">R$ {valor.toFixed(2)}</span>
                            </div>
                            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full bg-green-500/60 rounded-full"
                                style={{ width: `${(valor / result.densus!.custo!.total) * 100}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* AION resumido */}
                {result.aion && (
                  <Card>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Brain className="w-4 h-4 text-primary" />
                          <CardTitle className="text-sm">AION</CardTitle>
                        </div>
                        {result.aion.drift && (
                          <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/50 text-xs">
                            <AlertTriangle className="w-3 h-3 mr-1" /> DRIFT
                          </Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-muted-foreground">fc predito</span>
                          <span className={`font-mono font-bold ${result.aion.fcPredito >= result.mix.fck ? "text-green-400" : "text-red-400"}`}>
                            {result.aion.fcPredito} MPa
                          </span>
                        </div>
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">Confianca</span>
                            <span className="font-mono">{Math.round(result.aion.confianca * 100)}%</span>
                          </div>
                          <Progress value={result.aion.confianca * 100} className="h-1.5" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </>
          ) : (
            <Card>
              <CardContent className="py-16 text-center text-muted-foreground">
                <Cog className="w-12 h-12 mx-auto mb-4 opacity-30" />
                <p>Preencha o formulario e clique em Calcular para ver os resultados.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
