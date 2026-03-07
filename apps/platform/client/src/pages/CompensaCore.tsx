import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, Loader2, Shield } from "lucide-react";
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

const AE_TYPES = [
  { label: "CSA-K (Sulfoaluminato)", value: "csa" },
  { label: "CaO (Cal livre)", value: "cao" },
  { label: "MgO (Periclasio)", value: "mgo" },
  { label: "Nenhum", value: "nenhum" },
] as const;

export default function CompensaCore() {
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
  const [aeType, setAeType] = useState("csa");
  const [teorAgente, setTeorAgente] = useState("32");

  const [result, setResult] = useState<ConcretePacket | null>(null);

  const calculateMutation = trpc.compensa.calculate.useMutation({
    onSuccess: (data) => {
      setResult(data as ConcretePacket);
      toast.success("Calculo COMPENSA concluido!");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  if (!isAuthenticated || !canAccess) {
    return (
      <div className="container py-16 max-w-2xl mx-auto text-center">
        <Shield className="w-16 h-16 mx-auto mb-6 text-muted-foreground" />
        <h1 className="text-3xl font-bold uppercase tracking-tighter mb-4">COMPENSA CORE</h1>
        <p className="text-muted-foreground mb-8">
          Motor de retracao compensada (CRC). Requer plano Avancado ou superior.
        </p>
        <Button asChild className="rounded-none uppercase font-bold">
          <Link href="/pricing">Ver Planos</Link>
        </Button>
      </div>
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const adicoes: Record<string, number> = {};
    const teorNum = parseFloat(teorAgente);
    if (aeType !== "nenhum" && teorNum > 0) {
      adicoes[aeType] = teorNum;
      adicoes["agente_expansivo"] = teorNum;
    }

    calculateMutation.mutate({
      cimentoType,
      fck: parseFloat(fck),
      ac: parseFloat(ac),
      slump: parseFloat(slump),
      consumoCimento: parseFloat(consumoCimento),
      consumoAgua: parseFloat(consumoAgua),
      consumoAreia: parseFloat(consumoAreia),
      consumoBrita: parseFloat(consumoBrita),
      adicoes,
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
        <h1 className="text-3xl font-bold uppercase tracking-tighter">COMPENSA CORE</h1>
        <p className="text-muted-foreground mt-2">
          Motor de retracao compensada — ACI 223R-10 · fib MC2010
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Formulario */}
        <Card>
          <CardHeader>
            <CardTitle>Dados do Traco</CardTitle>
            <CardDescription>Preencha os dados da formulacao</CardDescription>
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

              <div className="border-t border-border pt-4 mt-4">
                <h3 className="font-semibold mb-3 uppercase text-sm tracking-wider">Agente Expansivo</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Tipo AE</Label>
                    <Select value={aeType} onValueChange={setAeType}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
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
                      type="number"
                      value={teorAgente}
                      onChange={(e) => setTeorAgente(e.target.value)}
                      step="1"
                      min="0"
                      disabled={aeType === "nenhum"}
                    />
                  </div>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full rounded-none uppercase font-bold mt-4"
                disabled={calculateMutation.isPending}
              >
                {calculateMutation.isPending ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Calculando...</>
                ) : (
                  "Calcular COMPENSA"
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
          {result?.compensa ? (
            <>
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>COMPENSA</CardTitle>
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
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Agente Expansivo</span>
                      <span className="font-mono">{result.compensa.agenteExpansivo}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Teor AE</span>
                      <span className="font-mono">{result.compensa.teorAgente} kg/m3</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

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
                <Shield className="w-12 h-12 mx-auto mb-4 opacity-30" />
                <p>Preencha o formulario e clique em Calcular para ver os resultados.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
