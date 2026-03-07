import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { useState, useMemo } from "react";
import { ArrowLeft, HardHat, Calculator, Lightbulb, Send, FileDown } from "lucide-react";
import { Link } from "wouter";
import { toast } from "sonner";

// Tabelas de traços prontos por aplicação
const tracosComuns = {
  contrapiso: {
    nome: "Contrapiso",
    descricao: "Para regularização de pisos",
    fck: 15,
    traco: { cimento: 1, areia: 4, brita: 0, agua: 0.6 },
    medidas: { latas: { cimento: 1, areia: 8, brita: 0 }, baldes: { cimento: 1, areia: 4, brita: 0 } },
    dica: "Umedeça bem a base antes de aplicar. Espessura mínima de 3cm.",
  },
  laje: {
    nome: "Laje / Estrutural",
    descricao: "Para lajes, vigas e pilares residenciais",
    fck: 25,
    traco: { cimento: 1, areia: 2, brita: 3, agua: 0.5 },
    medidas: { latas: { cimento: 1, areia: 4, brita: 6 }, baldes: { cimento: 1, areia: 2, brita: 3 } },
    dica: "Vibrar bem o concreto para evitar vazios. Curar por 7 dias.",
  },
  pilar: {
    nome: "Pilar / Viga",
    descricao: "Para elementos estruturais",
    fck: 30,
    traco: { cimento: 1, areia: 1.5, brita: 2.5, agua: 0.45 },
    medidas: { latas: { cimento: 1, areia: 3, brita: 5 }, baldes: { cimento: 1, areia: 1.5, brita: 2.5 } },
    dica: "Usar brita 1 (19mm). Adensar com vibrador de imersão.",
  },
  muro: {
    nome: "Muro / Alvenaria",
    descricao: "Para muros de arrimo e fundações simples",
    fck: 20,
    traco: { cimento: 1, areia: 2.5, brita: 3.5, agua: 0.55 },
    medidas: { latas: { cimento: 1, areia: 5, brita: 7 }, baldes: { cimento: 1, areia: 2.5, brita: 3.5 } },
    dica: "Para muros de arrimo, considere impermeabilização.",
  },
  calcada: {
    nome: "Calçada / Piso Externo",
    descricao: "Para pisos externos e calçadas",
    fck: 20,
    traco: { cimento: 1, areia: 2, brita: 3, agua: 0.5 },
    medidas: { latas: { cimento: 1, areia: 4, brita: 6 }, baldes: { cimento: 1, areia: 2, brita: 3 } },
    dica: "Fazer juntas de dilatação a cada 2m. Espessura mínima de 8cm.",
  },
  chapisco: {
    nome: "Chapisco",
    descricao: "Para aderência do reboco",
    fck: 0,
    traco: { cimento: 1, areia: 3, brita: 0, agua: 0.7 },
    medidas: { latas: { cimento: 1, areia: 6, brita: 0 }, baldes: { cimento: 1, areia: 3, brita: 0 } },
    dica: "Aplicar com colher de pedreiro em movimentos de arremesso.",
  },
};

// Conversões de medidas
const conversoes = {
  sacoKg: 50, // 1 saco = 50kg de cimento
  lataLitros: 18, // 1 lata = 18 litros
  baldeLitros: 10, // 1 balde = 10 litros
  carrinhoLitros: 80, // 1 carrinho = 80 litros
  densidadeCimento: 1.5, // kg/litro (aparente)
  densidadeAreia: 1.5, // kg/litro (aparente)
  densidadeBrita: 1.4, // kg/litro (aparente)
};

export default function NivelBasico() {
  const [aplicacao, setAplicacao] = useState("laje");
  const [unidade, setUnidade] = useState<"latas" | "baldes">("latas");
  const [qtdSacos, setQtdSacos] = useState(1);

  const tracoSelecionado = tracosComuns[aplicacao as keyof typeof tracosComuns];

  // Cálculo das quantidades
  const quantidades = useMemo(() => {
    const traco = tracoSelecionado.traco;
    const medidas = tracoSelecionado.medidas[unidade];
    
    // Quantidade por saco de cimento
    const fatorUnidade = unidade === "latas" ? conversoes.lataLitros : conversoes.baldeLitros;
    
    // Para cada saco de cimento (50kg)
    const cimentoKg = qtdSacos * conversoes.sacoKg;
    const cimentoLitros = cimentoKg / conversoes.densidadeCimento;
    const cimentoUnidades = cimentoLitros / fatorUnidade;
    
    const areiaUnidades = cimentoUnidades * medidas.areia;
    const areiaKg = areiaUnidades * fatorUnidade * conversoes.densidadeAreia;
    
    const britaUnidades = cimentoUnidades * medidas.brita;
    const britaKg = britaUnidades * fatorUnidade * conversoes.densidadeBrita;
    
    const aguaLitros = cimentoKg * traco.agua;
    
    // Volume aproximado de concreto
    const volumeConcreto = (cimentoKg + areiaKg + britaKg + aguaLitros) / 2400; // m³ aproximado

    return {
      cimento: { unidades: Math.ceil(cimentoUnidades), kg: cimentoKg, sacos: qtdSacos },
      areia: { unidades: Math.ceil(areiaUnidades), kg: Math.round(areiaKg) },
      brita: { unidades: Math.ceil(britaUnidades), kg: Math.round(britaKg) },
      agua: { litros: Math.round(aguaLitros) },
      volume: volumeConcreto.toFixed(2),
    };
  }, [tracoSelecionado, unidade, qtdSacos]);

  const enviarWhatsApp = () => {
    const texto = `*TRAÇO PARA ${tracoSelecionado.nome.toUpperCase()}*%0A%0A` +
      `📦 Cimento: ${quantidades.cimento.sacos} saco(s) (${quantidades.cimento.kg}kg)%0A` +
      `🏖️ Areia: ${quantidades.areia.unidades} ${unidade} (${quantidades.areia.kg}kg)%0A` +
      (quantidades.brita.kg > 0 ? `🪨 Brita: ${quantidades.brita.unidades} ${unidade} (${quantidades.brita.kg}kg)%0A` : "") +
      `💧 Água: ${quantidades.agua.litros} litros%0A%0A` +
      `📐 Volume aproximado: ${quantidades.volume} m³%0A%0A` +
      `💡 Dica: ${tracoSelecionado.dica}%0A%0A` +
      `_Calculado por Mestres do Concreto_`;

    window.open(`https://wa.me/?text=${texto}`, "_blank");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-gradient-to-r from-green-500/10 to-emerald-500/10 sticky top-0 z-50 backdrop-blur">
        <div className="container py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                <HardHat className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold uppercase tracking-tight">Nível Básico</h1>
                <p className="text-xs text-muted-foreground">Pedreiros & Construtores</p>
              </div>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={enviarWhatsApp}>
            <Send className="w-4 h-4 mr-2" />
            Compartilhar
          </Button>
        </div>
      </header>

      <main className="container py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Coluna Principal */}
          <div className="lg:col-span-2 space-y-6">
            {/* Seleção de Aplicação */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="w-5 h-5 text-green-500" />
                  Calculadora Prática
                </CardTitle>
                <CardDescription>
                  Selecione o tipo de aplicação e a quantidade de sacos de cimento
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Tipo de Aplicação</Label>
                    <Select value={aplicacao} onValueChange={setAplicacao}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(tracosComuns).map(([key, value]) => (
                          <SelectItem key={key} value={key}>
                            {value.nome} {value.fck > 0 && `(fck ${value.fck})`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Unidade de Medida</Label>
                    <Select value={unidade} onValueChange={(v) => setUnidade(v as "latas" | "baldes")}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="latas">Latas (18 litros)</SelectItem>
                        <SelectItem value="baldes">Baldes (10 litros)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label>Quantidade de Sacos de Cimento (50kg)</Label>
                  <div className="flex items-center gap-4 mt-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setQtdSacos(Math.max(1, qtdSacos - 1))}
                    >
                      -
                    </Button>
                    <Input
                      type="number"
                      value={qtdSacos}
                      onChange={(e) => setQtdSacos(Math.max(1, Number(e.target.value)))}
                      className="w-24 text-center text-xl font-bold"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setQtdSacos(qtdSacos + 1)}
                    >
                      +
                    </Button>
                  </div>
                </div>

                <Separator />

                {/* Traço Visual */}
                <div className="bg-muted/50 p-6 rounded-xl">
                  <h3 className="font-bold text-lg mb-4 uppercase tracking-wide">
                    Traço: {tracoSelecionado.nome}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">{tracoSelecionado.descricao}</p>
                  
                  <div className="text-center mb-6">
                    <p className="text-3xl font-mono font-bold">
                      1 : {tracoSelecionado.medidas[unidade].areia} 
                      {tracoSelecionado.medidas[unidade].brita > 0 && ` : ${tracoSelecionado.medidas[unidade].brita}`}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      (cimento : areia {tracoSelecionado.medidas[unidade].brita > 0 && ": brita"}) em {unidade}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-card p-4 rounded-lg text-center border">
                      <div className="text-3xl mb-1">📦</div>
                      <p className="text-2xl font-bold">{quantidades.cimento.sacos}</p>
                      <p className="text-xs text-muted-foreground">saco(s) cimento</p>
                      <p className="text-xs font-mono">{quantidades.cimento.kg}kg</p>
                    </div>
                    <div className="bg-card p-4 rounded-lg text-center border">
                      <div className="text-3xl mb-1">🏖️</div>
                      <p className="text-2xl font-bold">{quantidades.areia.unidades}</p>
                      <p className="text-xs text-muted-foreground">{unidade} areia</p>
                      <p className="text-xs font-mono">{quantidades.areia.kg}kg</p>
                    </div>
                    {quantidades.brita.kg > 0 && (
                      <div className="bg-card p-4 rounded-lg text-center border">
                        <div className="text-3xl mb-1">🪨</div>
                        <p className="text-2xl font-bold">{quantidades.brita.unidades}</p>
                        <p className="text-xs text-muted-foreground">{unidade} brita</p>
                        <p className="text-xs font-mono">{quantidades.brita.kg}kg</p>
                      </div>
                    )}
                    <div className="bg-card p-4 rounded-lg text-center border">
                      <div className="text-3xl mb-1">💧</div>
                      <p className="text-2xl font-bold">{quantidades.agua.litros}</p>
                      <p className="text-xs text-muted-foreground">litros água</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tabela de Traços */}
            <Card>
              <CardHeader>
                <CardTitle>Tabela de Traços Comuns</CardTitle>
                <CardDescription>Referência rápida para diferentes aplicações</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-3">Aplicação</th>
                        <th className="text-center py-2 px-3">fck</th>
                        <th className="text-center py-2 px-3">Traço (latas)</th>
                        <th className="text-center py-2 px-3">a/c</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(tracosComuns).map(([key, value]) => (
                        <tr 
                          key={key} 
                          className={`border-b cursor-pointer hover:bg-muted/50 ${aplicacao === key ? "bg-primary/10" : ""}`}
                          onClick={() => setAplicacao(key)}
                        >
                          <td className="py-2 px-3 font-medium">{value.nome}</td>
                          <td className="text-center py-2 px-3">{value.fck > 0 ? `${value.fck} MPa` : "-"}</td>
                          <td className="text-center py-2 px-3 font-mono">
                            1:{value.medidas.latas.areia}{value.medidas.latas.brita > 0 && `:${value.medidas.latas.brita}`}
                          </td>
                          <td className="text-center py-2 px-3">{value.traco.agua}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Coluna Lateral */}
          <div className="space-y-6">
            {/* Resultado */}
            <Card className="sticky top-24 bg-gradient-to-br from-green-500/10 to-emerald-500/5 border-green-500/20">
              <CardHeader>
                <CardTitle className="text-lg">Resultado</CardTitle>
                <CardDescription>Volume aproximado de concreto</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-4">
                  <p className="text-5xl font-bold text-green-500">{quantidades.volume}</p>
                  <p className="text-lg text-muted-foreground">metros cúbicos (m³)</p>
                </div>
                
                <Separator className="my-4" />
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Cimento:</span>
                    <span className="font-mono">{quantidades.cimento.kg} kg</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Areia:</span>
                    <span className="font-mono">{quantidades.areia.kg} kg</span>
                  </div>
                  {quantidades.brita.kg > 0 && (
                    <div className="flex justify-between">
                      <span>Brita:</span>
                      <span className="font-mono">{quantidades.brita.kg} kg</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Água:</span>
                    <span className="font-mono">{quantidades.agua.litros} L</span>
                  </div>
                </div>

                <div className="mt-4 flex gap-2">
                  <Button className="flex-1 bg-green-500 hover:bg-green-600" onClick={enviarWhatsApp}>
                    <Send className="w-4 h-4 mr-2" />
                    WhatsApp
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Dica */}
            <Card className="bg-amber-500/10 border-amber-500/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Lightbulb className="w-5 h-5 text-amber-500" />
                  Dica Importante
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {tracoSelecionado.dica}
                </p>
              </CardContent>
            </Card>

            {/* Conversões */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Conversões Úteis</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-1">
                <p>📦 1 saco de cimento = 50 kg</p>
                <p>🪣 1 lata = 18 litros</p>
                <p>🪣 1 balde = 10 litros</p>
                <p>🛒 1 carrinho = 80 litros</p>
                <p>📐 1 m³ ≈ 2.400 kg de concreto</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
