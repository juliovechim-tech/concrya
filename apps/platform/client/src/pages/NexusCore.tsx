import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Thermometer, Brain, Activity, Flame } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { usePlano } from "@/hooks/usePlano";
import { Link } from "wouter";

// Perfil térmico real 0–72h CP V ARI — pico ~55°C em 12h
const PERFIL_EXEMPLO = JSON.stringify([
  { tempo_h: 0, temp_C: 22 },
  { tempo_h: 1, temp_C: 23 },
  { tempo_h: 2, temp_C: 25 },
  { tempo_h: 4, temp_C: 32 },
  { tempo_h: 6, temp_C: 40 },
  { tempo_h: 8, temp_C: 48 },
  { tempo_h: 10, temp_C: 53 },
  { tempo_h: 12, temp_C: 55 },
  { tempo_h: 16, temp_C: 52 },
  { tempo_h: 20, temp_C: 47 },
  { tempo_h: 24, temp_C: 42 },
  { tempo_h: 36, temp_C: 35 },
  { tempo_h: 48, temp_C: 32 },
  { tempo_h: 60, temp_C: 30 },
  { tempo_h: 72, temp_C: 28 },
], null, 2);

const CIMENTO_TYPES = [
  "CP V ARI",
  "CP V",
  "CP II E",
  "CP II F",
  "CP II Z",
  "CP III",
  "CP IV",
] as const;

const FASE_COLORS: Record<string, string> = {
  INDUCAO: "bg-blue-500/20 text-blue-400 border-blue-500/50",
  ACELERACAO: "bg-orange-500/20 text-orange-400 border-orange-500/50",
  DESACELERACAO: "bg-yellow-500/20 text-yellow-400 border-yellow-500/50",
  DIFUSAO: "bg-green-500/20 text-green-400 border-green-500/50",
};

interface MaturidadeResult {
  maturidade_Celsius_hora: number;
  tempo_equivalente_h: number;
  grauHidratacao: number;
  curva: { tempo_h: number; nurseSaul: number; arrhenius_te: number }[];
}

interface CalorResult {
  calor_total_J: number;
  calor_especifico_J_g: number;
  taxa_pico_J_g_h: number;
  fase: string;
  qmax: number;
}

interface NexusResult {
  maturidade: MaturidadeResult;
  calorimetria: CalorResult;
}

export default function NexusCore() {
  const { nivelMinimo, isAuthenticated } = usePlano();
  const canAccess = nivelMinimo("avancado");

  const [leiturasJson, setLeiturasJson] = useState(PERFIL_EXEMPLO);
  const [tipoCp, setTipoCp] = useState("CP V ARI");
  const [cimentoKg, setCimentoKg] = useState("350");
  const [result, setResult] = useState<NexusResult | null>(null);
  const [leiturasParsed, setLeiturasParsed] = useState<{ tempo_h: number; temp_C: number }[]>([]);

  const calcMutation = trpc.nexus.calcMaturidade.useMutation({
    onSuccess: (data) => {
      setResult(data as NexusResult);
      toast.success("Maturidade calculada!");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  if (!isAuthenticated || !canAccess) {
    return (
      <div className="container py-12 max-w-2xl text-center">
        <Card className="border-primary/30">
          <CardHeader>
            <CardTitle className="text-2xl">NEXUS — Maturidade IoT</CardTitle>
            <CardDescription>
              Requer plano Avançado ou superior.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/pricing">
              <Button className="bg-primary text-white font-bold uppercase">
                Ver Planos
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleSubmit = () => {
    try {
      const leituras = JSON.parse(leiturasJson);
      if (!Array.isArray(leituras) || leituras.length < 2) {
        toast.error("Mínimo 2 leituras IoT no formato [{tempo_h, temp_C}]");
        return;
      }
      setLeiturasParsed(leituras);
      calcMutation.mutate({
        leituras,
        tipo_cp: tipoCp,
        cimento_kg: parseFloat(cimentoKg),
      });
    } catch {
      toast.error("JSON inválido. Verifique o formato das leituras.");
    }
  };

  const m = result?.maturidade;
  const c = result?.calorimetria;

  return (
    <div className="container py-8 max-w-6xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold uppercase tracking-tighter">
          NEXUS <span className="text-primary">IoT Maturidade</span>
        </h1>
        <p className="text-muted-foreground mt-1 font-mono text-sm">
          Nurse-Saul + Arrhenius + Calorimetria — dados do sensor Eletroterm
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Thermometer className="w-5 h-5 text-primary" />
              Leituras IoT
            </CardTitle>
            <CardDescription>
              Array JSON do sensor: {"[{tempo_h, temp_C}, ...]"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Tipo de Cimento</Label>
              <Select value={tipoCp} onValueChange={setTipoCp}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CIMENTO_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Consumo de cimento (kg/m³)</Label>
              <Input
                type="number"
                value={cimentoKg}
                onChange={(e) => setCimentoKg(e.target.value)}
              />
            </div>

            <div>
              <Label>Leituras IoT (JSON)</Label>
              <textarea
                className="w-full h-64 bg-muted border border-border rounded p-3 font-mono text-xs text-foreground resize-y focus:outline-none focus:ring-1 focus:ring-primary"
                value={leiturasJson}
                onChange={(e) => setLeiturasJson(e.target.value)}
                spellCheck={false}
              />
            </div>

            <Button
              onClick={handleSubmit}
              disabled={calcMutation.isPending}
              className="w-full bg-primary text-white font-bold uppercase"
            >
              {calcMutation.isPending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Calculando...</>
              ) : (
                "Calcular Maturidade"
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Resultados */}
        {result && m && c && (
          <div className="space-y-4">
            {/* Maturidade */}
            <Card className="border-primary/30">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Activity className="w-5 h-5 text-primary" />
                  Maturidade
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-muted/50 p-4 border border-border">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Nurse-Saul</p>
                    <p className="text-2xl font-bold text-primary font-mono">
                      {m.maturidade_Celsius_hora.toFixed(0)}
                    </p>
                    <p className="text-xs text-muted-foreground">°C·h</p>
                  </div>
                  <div className="bg-muted/50 p-4 border border-border">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Arrhenius te</p>
                    <p className="text-2xl font-bold text-primary font-mono">
                      {m.tempo_equivalente_h.toFixed(1)}
                    </p>
                    <p className="text-xs text-muted-foreground">h (ref 20°C)</p>
                  </div>
                  <div className="bg-muted/50 p-4 border border-border">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Grau Hidratação α</p>
                    <p className="text-2xl font-bold text-primary font-mono">
                      {(m.grauHidratacao * 100).toFixed(1)}%
                    </p>
                  </div>
                  <div className="bg-muted/50 p-4 border border-border">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Fase</p>
                    <Badge variant="outline" className={FASE_COLORS[c.fase] || ""}>
                      {c.fase}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Calorimetria */}
            <Card className="border-orange-500/30">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Flame className="w-5 h-5 text-orange-400" />
                  Calorimetria
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-muted/50 p-4 border border-border">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Calor Específico</p>
                    <p className="text-2xl font-bold text-orange-400 font-mono">
                      {c.calor_especifico_J_g.toFixed(1)}
                    </p>
                    <p className="text-xs text-muted-foreground">J/g</p>
                  </div>
                  <div className="bg-muted/50 p-4 border border-border">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Calor Total</p>
                    <p className="text-2xl font-bold text-orange-400 font-mono">
                      {(c.calor_total_J / 1e6).toFixed(1)}
                    </p>
                    <p className="text-xs text-muted-foreground">MJ</p>
                  </div>
                  <div className="bg-muted/50 p-4 border border-border">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Taxa de Pico</p>
                    <p className="text-2xl font-bold text-orange-400 font-mono">
                      {c.taxa_pico_J_g_h.toFixed(1)}
                    </p>
                    <p className="text-xs text-muted-foreground">J/(g·h)</p>
                  </div>
                  <div className="bg-muted/50 p-4 border border-border">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Qmax ({tipoCp})</p>
                    <p className="text-2xl font-bold text-orange-400 font-mono">
                      {c.qmax}
                    </p>
                    <p className="text-xs text-muted-foreground">J/g</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* AION fc predito — integração futura via packet */}
            <Card className="border-cyan-500/30">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Brain className="w-5 h-5 text-cyan-400" />
                  AION — Predição fc(t)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground font-mono">
                  α = {(m.grauHidratacao * 100).toFixed(1)}% → te = {m.tempo_equivalente_h.toFixed(1)}h
                </p>
                <p className="text-sm text-muted-foreground font-mono mt-1">
                  Confiança AION +5% com dados IoT reais (nexus.grauHidratacao {">"} 0)
                </p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Tabela de leituras calculadas */}
      {result && m && m.curva.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Curva de Maturidade</CardTitle>
            <CardDescription>Leituras processadas — Nurse-Saul acumulado + tempo equivalente Arrhenius</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm font-mono">
                <thead>
                  <tr className="border-b border-border text-muted-foreground text-xs uppercase tracking-wider">
                    <th className="py-2 px-3 text-left">tempo (h)</th>
                    <th className="py-2 px-3 text-left">temp (°C)</th>
                    <th className="py-2 px-3 text-left">M acum (°C·h)</th>
                    <th className="py-2 px-3 text-left">te Arr (h)</th>
                  </tr>
                </thead>
                <tbody>
                  {m.curva.map((pt, i) => (
                    <tr key={i} className="border-b border-border/50 hover:bg-muted/30">
                      <td className="py-2 px-3">{pt.tempo_h}</td>
                      <td className="py-2 px-3">
                        {leiturasParsed[i]?.temp_C?.toFixed(1) ?? "—"}
                      </td>
                      <td className="py-2 px-3 text-primary">
                        {pt.nurseSaul.toFixed(0)}
                      </td>
                      <td className="py-2 px-3 text-cyan-400">
                        {pt.arrhenius_te.toFixed(1)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
