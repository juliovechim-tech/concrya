import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Trash2, Plus, Calculator, Save, ArrowRight } from "lucide-react";
import { calcularConstantesAbrams, calcularAC, calcularFC, PontoAbrams } from "@/lib/abrams";
import { toast } from "sonner";

export default function CalculadoraAbrams() {
  // Estado para os pontos experimentais
  const [pontos, setPontos] = useState<PontoAbrams[]>([
    { ac: 0.45, fc: 42.5 },
    { ac: 0.55, fc: 32.0 },
    { ac: 0.65, fc: 24.5 }
  ]);

  // Estado para as constantes calculadas
  const [constantes, setConstantes] = useState({ k1: 0, k2: 0, r2: 0 });
  
  // Estado para simulação
  const [fcAlvo, setFcAlvo] = useState<number>(30);
  const [acCalculado, setAcCalculado] = useState<number>(0);
  
  // Dados para o gráfico
  const [dadosGrafico, setDadosGrafico] = useState<any[]>([]);

  // Calcular constantes sempre que os pontos mudarem
  useEffect(() => {
    try {
      if (pontos.length >= 2) {
        const result = calcularConstantesAbrams(pontos);
        setConstantes(result);
        
        // Gerar dados para o gráfico (curva suave)
        const data = [];
        for (let ac = 0.30; ac <= 0.80; ac += 0.02) {
          data.push({
            ac: Number(ac.toFixed(2)),
            fc: Number(calcularFC(ac, result.k1, result.k2).toFixed(1))
          });
        }
        setDadosGrafico(data);
        
        // Recalcular simulação atual
        if (fcAlvo > 0) {
          setAcCalculado(calcularAC(fcAlvo, result.k1, result.k2));
        }
      }
    } catch (error) {
      console.error(error);
    }
  }, [pontos, fcAlvo]);

  const adicionarPonto = () => {
    setPontos([...pontos, { ac: 0.50, fc: 0 }]);
  };

  const removerPonto = (index: number) => {
    if (pontos.length <= 2) {
      toast.error("Mínimo de 2 pontos necessários");
      return;
    }
    const novosPontos = [...pontos];
    novosPontos.splice(index, 1);
    setPontos(novosPontos);
  };

  const atualizarPonto = (index: number, campo: keyof PontoAbrams, valor: string) => {
    const novosPontos = [...pontos];
    novosPontos[index] = { ...novosPontos[index], [campo]: Number(valor) };
    setPontos(novosPontos);
  };

  return (
    <div className="container py-12">
      <div className="flex flex-col md:flex-row justify-between items-end mb-12 border-b border-border pb-6">
        <div>
          <h1 className="text-4xl font-bold uppercase tracking-tighter mb-2 flex items-center gap-3">
            <Calculator className="w-10 h-10 text-primary" />
            Curva de Abrams
          </h1>
          <p className="text-muted-foreground font-mono text-sm">CALIBRAÇÃO DE DOSAGEM EXPERIMENTAL</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Coluna da Esquerda: Entrada de Dados */}
        <div className="lg:col-span-4 space-y-6">
          <Card className="rounded-none border-border bg-card">
            <CardHeader className="bg-muted/20 border-b border-border">
              <CardTitle className="uppercase tracking-wide text-sm font-bold">Pontos Experimentais</CardTitle>
              <CardDescription className="text-xs">Insira os resultados dos ensaios (a/c vs Resistência)</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-center w-20">A/C</TableHead>
                    <TableHead className="text-center">fc (MPa)</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pontos.map((ponto, index) => (
                    <TableRow key={index} className="hover:bg-muted/50">
                      <TableCell className="p-2">
                        <Input 
                          type="number" 
                          step="0.01"
                          value={ponto.ac} 
                          onChange={(e) => atualizarPonto(index, 'ac', e.target.value)}
                          className="h-8 text-center font-mono"
                        />
                      </TableCell>
                      <TableCell className="p-2">
                        <Input 
                          type="number" 
                          step="0.1"
                          value={ponto.fc} 
                          onChange={(e) => atualizarPonto(index, 'fc', e.target.value)}
                          className="h-8 text-center font-mono"
                        />
                      </TableCell>
                      <TableCell className="p-2">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => removerPonto(index)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="p-4 border-t border-border">
                <Button variant="outline" size="sm" className="w-full border-dashed border-border hover:border-primary hover:text-primary" onClick={adicionarPonto}>
                  <Plus className="h-4 w-4 mr-2" /> Adicionar Ponto
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-none border-primary bg-primary/5">
            <CardHeader className="pb-2">
              <CardTitle className="uppercase tracking-wide text-xs font-bold text-primary">Constantes Calculadas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">K1</Label>
                  <div className="text-2xl font-mono font-bold">{constantes.k1.toFixed(2)}</div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">K2</Label>
                  <div className="text-2xl font-mono font-bold">{constantes.k2.toFixed(4)}</div>
                </div>
              </div>
              <div className="pt-2 border-t border-primary/20">
                <div className="flex justify-between items-center">
                  <Label className="text-xs text-muted-foreground">Correlação (R²)</Label>
                  <div className={`font-mono font-bold ${constantes.r2 > 0.9 ? 'text-green-500' : 'text-yellow-500'}`}>
                    {(constantes.r2 * 100).toFixed(2)}%
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Coluna da Direita: Gráfico e Simulação */}
        <div className="lg:col-span-8 space-y-6">
          <Card className="rounded-none border-border bg-card h-[400px] flex flex-col">
            <CardHeader className="bg-muted/20 border-b border-border py-3">
              <CardTitle className="uppercase tracking-wide text-sm font-bold">Curva de Correlação</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 p-4">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dadosGrafico} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis 
                    dataKey="ac" 
                    type="number" 
                    domain={[0.3, 0.8]} 
                    tickCount={6}
                    label={{ value: 'Relação Água/Cimento', position: 'insideBottom', offset: -5, fill: 'var(--muted-foreground)', fontSize: 12 }} 
                    stroke="var(--muted-foreground)"
                    fontSize={12}
                    tickFormatter={(val) => val.toFixed(2)}
                  />
                  <YAxis 
                    label={{ value: 'Resistência (MPa)', angle: -90, position: 'insideLeft', fill: 'var(--muted-foreground)', fontSize: 12 }} 
                    stroke="var(--muted-foreground)"
                    fontSize={12}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', borderRadius: '0px' }}
                    itemStyle={{ color: 'var(--foreground)' }}
                    formatter={(value: number) => [`${value} MPa`, 'Resistência']}
                    labelFormatter={(label) => `a/c: ${label}`}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="fc" 
                    stroke="var(--primary)" 
                    strokeWidth={3} 
                    dot={false} 
                    activeDot={{ r: 6, fill: 'var(--primary)' }}
                  />
                  {/* Pontos experimentais */}
                  {pontos.map((p, i) => (
                    <ReferenceLine key={i} x={p.ac} stroke="none" label={{ position: 'top', value: '●', fill: 'var(--secondary)', fontSize: 20 }} />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="rounded-none border-border bg-card">
            <CardHeader className="bg-muted/20 border-b border-border">
              <CardTitle className="uppercase tracking-wide text-sm font-bold">Simulador de Traço</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row gap-8 items-center">
                <div className="w-full md:w-1/3 space-y-4">
                  <div className="space-y-2">
                    <Label className="uppercase text-xs font-bold tracking-wider text-muted-foreground">Resistência Alvo (MPa)</Label>
                    <div className="flex gap-2">
                      <Input 
                        type="number" 
                        value={fcAlvo} 
                        onChange={(e) => setFcAlvo(Number(e.target.value))}
                        className="font-mono text-lg rounded-none border-border focus:border-primary"
                      />
                    </div>
                  </div>
                  <Button className="w-full bg-primary hover:bg-white hover:text-black text-white font-bold uppercase tracking-wider rounded-none">
                    Calcular a/c
                  </Button>
                </div>

                <div className="hidden md:block">
                  <ArrowRight className="w-8 h-8 text-muted-foreground" />
                </div>

                <div className="w-full md:w-1/2">
                  <div className="bg-muted/10 border border-border p-6 text-center">
                    <Label className="uppercase text-xs font-bold tracking-wider text-muted-foreground block mb-2">Relação a/c Necessária</Label>
                    <div className="text-5xl font-mono font-bold text-primary mb-2">
                      {acCalculado > 0 ? acCalculado.toFixed(3) : "---"}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Para atingir {fcAlvo} MPa com os materiais calibrados
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
