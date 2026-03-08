import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { AlertCircle, Loader2, Layers, Brain, AlertTriangle } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { usePlano } from "@/hooks/usePlano";
import { Link } from "wouter";
import type { ConcretePacket } from "@concrya/schemas";

const CIMENTO_TYPES = [
  "CP I",
  "CP II-E",
  "CP II-F",
  "CP II-Z",
  "CP III",
  "CP IV",
  "CP V ARI",
] as const;

export default function NivelixCore() {
  const { nivelMinimo, isAuthenticated } = usePlano();
  const canAccess = nivelMinimo("avancado");

  const [cimentoType, setCimentoType] = useState("CP V ARI");
  const [fck, setFck] = useState("40");
  const [ac, setAc] = useState("0.40");
  const [slump, setSlump] = useState("220");
  const [consumoCimento, setConsumoCimento] = useState("450");
  const [consumoAgua, setConsumoAgua] = useState("180");
  const [consumoAreia, setConsumoAreia] = useState("700");
  const [consumoBrita, setConsumoBrita] = useState("0");
  const [temFibra, setTemFibra] = useState(false);

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
      slump: parseFloat(slump),
      consumoCimento: parseFloat(consumoCimento),
      consumoAgua: parseFloat(consumoAgua),
      consumoAreia: parseFloat(consumoAreia),
      consumoBrita: parseFloat(consumoBrita),
      temFibra,
    });
  }

  const statusColor = (status: string) => {
    if (status === "OK") return "bg-green-500/20 text-green-400 border-green-500/50";
    if (status === "RISCO") return "bg-yellow-500/20 text-yellow-400 border-yellow-500/50";
    return "bg-red-500/20 text-red-400 border-red-500/50";
  };

  return (
    <div className="container py-12 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold uppercase tracking-tighter">NIVELIX</h1>
        <p className="text-muted-foreground mt-2">
          Argamassa autonivelante RC — Roussel 2005 · EN 13813 · NBR 15575-3
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Formulario */}
        <Card>
          <CardHeader>
            <CardTitle>Dados do Traco</CardTitle>
            <CardDescription>Preencha os dados da formulacao de argamassa</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tipo de Cimento</Label>
                  <Select value={cimentoType} onValueChange={setCimentoType}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
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
                  <Label>Espalhamento / Slump (mm)</Label>
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

              <div className="flex items-center gap-3 pt-2">
                <Checkbox
                  id="temFibra"
                  checked={temFibra}
                  onCheckedChange={(checked) => setTemFibra(checked === true)}
                />
                <Label htmlFor="temFibra" className="cursor-pointer">Contem fibra polimerica</Label>
              </div>

              <Button
                type="submit"
                className="w-full rounded-none uppercase font-bold mt-4"
                disabled={calculateMutation.isPending}
              >
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
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>NIVELIX</CardTitle>
                    <Badge className={statusColor(result.nivelix.status)}>
                      {result.nivelix.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Espalhamento</span>
                      <span className="font-mono font-bold text-lg">{result.nivelix.espalhamento} mm</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {result.nivelix.espalhamento >= 260 ? "F4 — Ultra-fluida" :
                       result.nivelix.espalhamento >= 220 ? "F3 — Autonivelante" :
                       result.nivelix.espalhamento >= 180 ? "F2 — Fluida" :
                       "F1 — Baixa fluidez"}
                      {" "}(EN 13813)
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Tensao de Escoamento</span>
                      <span className="font-mono font-bold">{result.nivelix.tensaoEscoamento} Pa</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Viscosidade Plastica</span>
                      <span className="font-mono font-bold">{result.nivelix.viscosidadePlastica} Pa·s</span>
                    </div>
                    {result.nivelix.moduloAcustico !== undefined && (
                      <div className="flex justify-between items-center border-t border-border pt-3">
                        <span className="text-muted-foreground">Modulo Acustico</span>
                        <span className="font-mono font-bold">{result.nivelix.moduloAcustico} dB</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {result.aion && (
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Brain className="w-5 h-5 text-primary" />
                        <CardTitle>AION · Predicao de Resistencia</CardTitle>
                      </div>
                      {result.aion.drift && (
                        <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/50">
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          DRIFT
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

              <Card>
                <CardHeader>
                  <CardTitle>MIX</CardTitle>
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
                      <span className="text-muted-foreground">Areia</span>
                      <span className="font-mono">{result.mix.consumoAreia} kg/m3</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Brita</span>
                      <span className="font-mono">{result.mix.consumoBrita} kg/m3</span>
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
