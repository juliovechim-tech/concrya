import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { AlertCircle, Loader2, Layers, Brain, AlertTriangle, Shield } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { usePlano } from "@/hooks/usePlano";
import { Link } from "wouter";
import type { ConcretePacket } from "@concrya/schemas";

const CIMENTO_TYPES = [
  "CP I", "CP II-E", "CP II-F", "CP II-Z", "CP III", "CP IV", "CP V ARI",
] as const;

const AE_TYPES = [
  { label: "CSA-K (Sulfoaluminato)", value: "CSA-K" },
  { label: "CSA-G (Gesso expansivo)", value: "CSA-G" },
  { label: "Ettringita", value: "ETTRINGITA" },
  { label: "Nenhum", value: "NENHUM" },
] as const;

const ADICAO_TYPES = [
  { label: "Silica Ativa", value: "SILICA_ATIVA" },
  { label: "Metacaulim", value: "METACAULIM" },
  { label: "Nenhuma", value: "NENHUMA" },
] as const;

export default function NivelixCore() {
  const { nivelMinimo, isAuthenticated } = usePlano();
  const canAccess = nivelMinimo("avancado");

  // Aglomerante e Agua
  const [cimentoType, setCimentoType] = useState("CP V ARI");
  const [fck, setFck] = useState("40");
  const [ac, setAc] = useState("0.40");
  const [consumoCimento, setConsumoCimento] = useState("450");
  const [consumoAgua, setConsumoAgua] = useState("180");

  // Agregados (argamassa — sem brita)
  const [consumoAreiaFina, setConsumoAreiaFina] = useState("700");
  const [consumoAreiaMedia, setConsumoAreiaMedia] = useState("");
  const [consumoFiller, setConsumoFiller] = useState("");

  // CRC
  const [agenteExpansivo, setAgenteExpansivo] = useState("NENHUM");
  const [teorAgente, setTeorAgente] = useState("0");

  // Adicao mineral
  const [adicaoMineral, setAdicaoMineral] = useState("NENHUMA");
  const [teorAdicaoMineral, setTeorAdicaoMineral] = useState("0");

  // Fibras e aditivos
  const [temFibra, setTemFibra] = useState(false);
  const [tipoFibra, setTipoFibra] = useState("PP");
  const [teorFibra, setTeorFibra] = useState("0.5");
  const [superplastificante, setSuperplastificante] = useState("0.8");
  const [incorporadorAr, setIncorporadorAr] = useState("0");

  // Alvo
  const [espalhamentoAlvo, setEspalhamentoAlvo] = useState("220");

  const [result, setResult] = useState<ConcretePacket | null>(null);

  const calculateMutation = trpc.nivelix.calculate.useMutation({
    onSuccess: (data) => {
      setResult(data as ConcretePacket);
      toast.success("Calculo NIVELIX concluido!");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  if (!isAuthenticated || !canAccess) {
    return (
      <div className="container py-16 max-w-2xl mx-auto text-center">
        <Layers className="w-16 h-16 mx-auto mb-6 text-muted-foreground" />
        <h1 className="text-3xl font-bold uppercase tracking-tighter mb-4">NIVELIX</h1>
        <p className="text-muted-foreground mb-8">
          Motor de argamassa autonivelante RC + acustica. Requer plano Avancado ou superior.
        </p>
        <Button asChild className="rounded-none uppercase font-bold">
          <Link href="/pricing">Ver Planos</Link>
        </Button>
      </div>
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    calculateMutation.mutate({
      cimentoType,
      fck: parseFloat(fck),
      ac: parseFloat(ac),
      consumoCimento: parseFloat(consumoCimento),
      consumoAgua: parseFloat(consumoAgua),
      consumoAreiaFina: parseFloat(consumoAreiaFina),
      consumoAreiaMedia: consumoAreiaMedia ? parseFloat(consumoAreiaMedia) : undefined,
      consumoFiller: consumoFiller ? parseFloat(consumoFiller) : undefined,
      agenteExpansivo: agenteExpansivo as "CSA-K" | "CSA-G" | "ETTRINGITA" | "NENHUM",
      teorAgente: parseFloat(teorAgente),
      adicaoMineral: adicaoMineral as "SILICA_ATIVA" | "METACAULIM" | "NENHUMA",
      teorAdicaoMineral: adicaoMineral !== "NENHUMA" ? parseFloat(teorAdicaoMineral) : undefined,
      temFibra,
      tipoFibra: temFibra ? (tipoFibra as "PP" | "PVA") : undefined,
      teorFibra: temFibra ? parseFloat(teorFibra) : undefined,
      superplastificante: parseFloat(superplastificante) || undefined,
      incorporadorAr: parseFloat(incorporadorAr) || undefined,
      espalhamentoAlvo: parseFloat(espalhamentoAlvo),
    });
  }

  const statusColor = (status: string) => {
    if (status === "OK") return "bg-green-500/20 text-green-400 border-green-500/50";
    if (status === "RISCO") return "bg-yellow-500/20 text-yellow-400 border-yellow-500/50";
    return "bg-red-500/20 text-red-400 border-red-500/50";
  };

  return (
    <div className="container py-12 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold uppercase tracking-tighter">NIVELIX</h1>
        <p className="text-muted-foreground mt-2">
          Argamassa autonivelante RC — Bingham · EN 13813 · NBR 15823 · NBR 15575-3
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Formulario */}
        <Card>
          <CardHeader>
            <CardTitle>Formulacao da Argamassa</CardTitle>
            <CardDescription>Preencha os dados — argamassa autonivelante (sem brita)</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Aglomerante e Agua */}
              <h3 className="font-semibold uppercase text-sm tracking-wider text-muted-foreground">Aglomerante e Agua</h3>
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
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Cimento (kg/m3)</Label>
                  <Input type="number" value={consumoCimento} onChange={(e) => setConsumoCimento(e.target.value)} step="10" />
                </div>
                <div className="space-y-2">
                  <Label>Agua (L/m3)</Label>
                  <Input type="number" value={consumoAgua} onChange={(e) => setConsumoAgua(e.target.value)} step="5" />
                </div>
                <div className="space-y-2">
                  <Label>a/c</Label>
                  <Input type="number" value={ac} onChange={(e) => setAc(e.target.value)} step="0.01" min="0.20" max="0.90" />
                </div>
              </div>

              {/* Agregados */}
              <div className="border-t border-border pt-4">
                <h3 className="font-semibold mb-3 uppercase text-sm tracking-wider text-muted-foreground">Agregados (sem brita)</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Areia Fina (kg/m3)</Label>
                    <Input type="number" value={consumoAreiaFina} onChange={(e) => setConsumoAreiaFina(e.target.value)} step="10" />
                  </div>
                  <div className="space-y-2">
                    <Label>Areia Media (kg/m3)</Label>
                    <Input type="number" value={consumoAreiaMedia} onChange={(e) => setConsumoAreiaMedia(e.target.value)} step="10" placeholder="Opcional" />
                  </div>
                  <div className="space-y-2">
                    <Label>Filer Calcario (kg/m3)</Label>
                    <Input type="number" value={consumoFiller} onChange={(e) => setConsumoFiller(e.target.value)} step="10" placeholder="Opcional" />
                  </div>
                </div>
              </div>

              {/* CRC */}
              <div className="border-t border-border pt-4">
                <h3 className="font-semibold mb-3 uppercase text-sm tracking-wider text-muted-foreground">CRC — Retracao Compensada</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Agente Expansivo</Label>
                    <Select value={agenteExpansivo} onValueChange={setAgenteExpansivo}>
                      <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {AE_TYPES.map((t) => (
                          <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Teor AE (kg/m3)</Label>
                    <Input
                      type="number" value={teorAgente}
                      onChange={(e) => setTeorAgente(e.target.value)}
                      step="1" min="0" disabled={agenteExpansivo === "NENHUM"}
                    />
                  </div>
                </div>
              </div>

              {/* Adicao Mineral */}
              <div className="border-t border-border pt-4">
                <h3 className="font-semibold mb-3 uppercase text-sm tracking-wider text-muted-foreground">Adicao Mineral</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Tipo</Label>
                    <Select value={adicaoMineral} onValueChange={setAdicaoMineral}>
                      <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {ADICAO_TYPES.map((t) => (
                          <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {adicaoMineral !== "NENHUMA" && (
                    <div className="space-y-2">
                      <Label>Teor (kg/m3)</Label>
                      <Input type="number" value={teorAdicaoMineral} onChange={(e) => setTeorAdicaoMineral(e.target.value)} step="1" min="0" />
                    </div>
                  )}
                </div>
              </div>

              {/* Fibras e Aditivos */}
              <div className="border-t border-border pt-4">
                <h3 className="font-semibold mb-3 uppercase text-sm tracking-wider text-muted-foreground">Fibras e Aditivos</h3>
                <div className="flex items-center gap-3 mb-4">
                  <Checkbox id="temFibra" checked={temFibra} onCheckedChange={(v) => setTemFibra(v === true)} />
                  <Label htmlFor="temFibra" className="cursor-pointer">Contem fibra polimerica</Label>
                </div>
                {temFibra && (
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="space-y-2">
                      <Label>Tipo de Fibra</Label>
                      <Select value={tipoFibra} onValueChange={setTipoFibra}>
                        <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="PP">PP (Polipropileno)</SelectItem>
                          <SelectItem value="PVA">PVA (Polivinil Alcool)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Teor Fibra (kg/m3)</Label>
                      <Input type="number" value={teorFibra} onChange={(e) => setTeorFibra(e.target.value)} step="0.1" min="0" />
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Superplastificante (% cimento)</Label>
                    <Input type="number" value={superplastificante} onChange={(e) => setSuperplastificante(e.target.value)} step="0.1" min="0" max="5" />
                  </div>
                  <div className="space-y-2">
                    <Label>Incorporador de Ar (% cimento)</Label>
                    <Input type="number" value={incorporadorAr} onChange={(e) => setIncorporadorAr(e.target.value)} step="0.01" min="0" max="2" />
                  </div>
                </div>
              </div>

              {/* Parametros Alvo */}
              <div className="border-t border-border pt-4">
                <h3 className="font-semibold mb-3 uppercase text-sm tracking-wider text-muted-foreground">Parametros Alvo</h3>
                <div className="space-y-2">
                  <Label>Espalhamento Alvo (mm)</Label>
                  <Input type="number" value={espalhamentoAlvo} onChange={(e) => setEspalhamentoAlvo(e.target.value)} step="10" min="50" max="400" />
                  <p className="text-xs text-muted-foreground">
                    NBR 15823: FA1 130-160mm · FA2 160-210mm · FA3 210-260mm
                  </p>
                </div>
              </div>

              <Button type="submit" className="w-full rounded-none uppercase font-bold mt-4" disabled={calculateMutation.isPending}>
                {calculateMutation.isPending ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Calculando...</>
                ) : (
                  "Calcular NIVELIX"
                )}
              </Button>

              {calculateMutation.isError && (
                <div className="flex items-center gap-2 text-red-400 text-sm mt-2">
                  <AlertCircle className="w-4 h-4" />
                  <span>{calculateMutation.error.message}</span>
                </div>
              )}
            </form>
          </CardContent>
        </Card>

        {/* Resultados */}
        <div className="space-y-6">
          {result?.nivelix ? (
            <>
              {/* Card REOLOGIA */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Reologia</CardTitle>
                    <Badge className={statusColor(result.nivelix.status)}>
                      {result.nivelix.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Espalhamento Calculado</span>
                      <span className="font-mono font-bold text-lg">{result.nivelix.espalhamento} mm</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {result.nivelix.espalhamento >= 260 ? "FA3+ — Ultra-fluida" :
                       result.nivelix.espalhamento >= 210 ? "FA3 — Autonivelante" :
                       result.nivelix.espalhamento >= 160 ? "FA2 — Fluida" :
                       result.nivelix.espalhamento >= 130 ? "FA1 — Baixa fluidez" :
                       "Abaixo de FA1"}
                      {" "}(NBR 15823)
                    </div>
                    {result.nivelixInput && (
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">Espalhamento Alvo</span>
                        <span className="font-mono">{result.nivelixInput.espalhamentoAlvo} mm</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Tensao de Escoamento</span>
                      <span className="font-mono font-bold">{result.nivelix.tensaoEscoamento} Pa</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Viscosidade Plastica</span>
                      <span className="font-mono font-bold">{result.nivelix.viscosidadePlastica} Pa·s</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Card CRC */}
              {result.compensa && (
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Shield className="w-5 h-5 text-primary" />
                        <CardTitle>CRC — Retracao Compensada</CardTitle>
                      </div>
                      <Badge className={statusColor(result.compensa.status)}>
                        {result.compensa.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Expansao Esperada</span>
                        <span className="font-mono font-bold">{result.compensa.expansaoEsperada} ue</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Retracao Estimada</span>
                        <span className="font-mono font-bold">{result.compensa.retracaoEstimada} ue</span>
                      </div>
                      <div className="flex justify-between items-center border-t border-border pt-3">
                        <span className="text-muted-foreground font-semibold">Balanco CRC</span>
                        <span className={`font-mono font-bold text-lg ${result.compensa.balancoCRC > 0 ? "text-green-400" : "text-red-400"}`}>
                          {result.compensa.balancoCRC > 0 ? "+" : ""}{result.compensa.balancoCRC} ue
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Card ACUSTICO (so se temFibra) */}
              {result.nivelix.moduloAcustico !== undefined && (
                <Card>
                  <CardHeader>
                    <CardTitle>Desempenho Acustico</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Modulo Acustico</span>
                      <span className="font-mono font-bold text-lg">{result.nivelix.moduloAcustico} dB</span>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Card AION */}
              {result.aion && (
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Brain className="w-5 h-5 text-primary" />
                        <CardTitle>AION · Predicao</CardTitle>
                      </div>
                      {result.aion.drift && (
                        <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/50">
                          <AlertTriangle className="w-3 h-3 mr-1" /> DRIFT
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">fc predito (28d)</span>
                        <span className={`font-mono font-bold text-lg ${result.aion.fcPredito >= result.mix.fck ? "text-green-400" : "text-red-400"}`}>
                          {result.aion.fcPredito} MPa
                        </span>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Confianca</span>
                          <span className="font-mono">{Math.round(result.aion.confianca * 100)}%</span>
                        </div>
                        <Progress value={result.aion.confianca * 100} className="h-2" />
                      </div>
                      {result.aion.intervalo && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">IC 90%</span>
                          <span className="font-mono">{result.aion.intervalo[0]} – {result.aion.intervalo[1]} MPa</span>
                        </div>
                      )}
                      <div className="text-xs text-muted-foreground">
                        Modelo: {result.aion.modelo}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Card MIX resumo */}
              <Card>
                <CardHeader>
                  <CardTitle>Formulacao</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Cimento</span>
                      <span className="font-mono">{result.mix.consumoCimento} kg/m3</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Agua</span>
                      <span className="font-mono">{result.mix.consumoAgua} L/m3</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Areia Total</span>
                      <span className="font-mono">{result.mix.consumoAreia} kg/m3</span>
                    </div>
                    <div className="flex justify-between border-t border-border pt-3">
                      <span className="text-muted-foreground">a/c</span>
                      <span className="font-mono font-bold">{result.mix.ac}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">fck alvo</span>
                      <span className="font-mono font-bold">{result.mix.fck} MPa</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="py-16 text-center text-muted-foreground">
                <Layers className="w-12 h-12 mx-auto mb-4 opacity-30" />
                <p>Preencha o formulario e clique em Calcular para ver os resultados.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
