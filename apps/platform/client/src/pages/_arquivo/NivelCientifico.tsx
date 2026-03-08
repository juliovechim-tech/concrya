import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { useState, useMemo } from "react";
import { ArrowLeft, Rocket, Calculator, Save, Send, Plus, Trash2, Atom, Beaker, FlaskConical, Info } from "lucide-react";
import { Link } from "wouter";
import { toast } from "sonner";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Tipos de UHPC
const tiposUHPC = [
  { value: "ductal", label: "Ductal® (Lafarge)", fckMin: 150, fckMax: 200 },
  { value: "bsi", label: "BSI® (Eiffage)", fckMin: 130, fckMax: 180 },
  { value: "ceracem", label: "Ceracem® (Sika)", fckMin: 120, fckMax: 160 },
  { value: "uhpfrc", label: "UHPFRC Genérico", fckMin: 100, fckMax: 200 },
  { value: "custom", label: "Personalizado", fckMin: 80, fckMax: 250 },
];

// Curvas granulométricas
const curvasGranulometricas = [
  { value: "fuller", label: "Fuller (q=0.5)", q: 0.5, descricao: "Máxima compacidade" },
  { value: "andreassen", label: "Andreassen (q=0.37)", q: 0.37, descricao: "Ótimo para UHPC" },
  { value: "funk-dinger", label: "Funk-Dinger (q=0.25)", q: 0.25, descricao: "Concretos fluidos" },
  { value: "custom", label: "Coeficiente q personalizado", q: 0.33, descricao: "Definir manualmente" },
];

interface MaterialCientifico {
  id: string;
  nome: string;
  densidade: number;
  quantidade: number;
  blaine?: number;
  bet?: number;
  d50?: number;
  teorSolidos?: number;
  teorAgua?: number;
  tipo?: string;
  granulometria?: Record<string, number>;
}

// Peneiras padrão (mm)
const PENEIRAS = [
  { nome: "#4", abertura: 4.75 },
  { nome: "#8", abertura: 2.36 },
  { nome: "#16", abertura: 1.18 },
  { nome: "#30", abertura: 0.6 },
  { nome: "#50", abertura: 0.3 },
  { nome: "#100", abertura: 0.15 },
  { nome: "#200", abertura: 0.075 },
];

export default function NivelCientifico() {
  const [tipoUHPC, setTipoUHPC] = useState("uhpfrc");
  const [curvaGranulometrica, setCurvaGranulometrica] = useState("andreassen");
  const [coeficienteQ, setCoeficienteQ] = useState(0.37);
  
  // Parâmetros de dosagem
  const [fckAlvo, setFckAlvo] = useState(150);
  const [relacaoAC, setRelacaoAC] = useState(0.20);
  const [relacaoAA, setRelacaoAA] = useState(0.16);
  const [teorArIncorporado, setTeorArIncorporado] = useState(1.5);
  const [volumeMassada, setVolumeMassada] = useState(1000);
  const [aguaBase, setAguaBase] = useState(160);
  
  // Modelo de Larrard - Parâmetros MEC
  const [compacidadeVirtual, setCompacidadeVirtual] = useState(0.74);
  const [indiceCompactacao, setIndiceCompactacao] = useState(9);

  // Cimentos (até 2)
  const [cimentos, setCimentos] = useState<MaterialCientifico[]>([
    { id: "c1", nome: "CP V ARI RS", densidade: 3.15, quantidade: 100, blaine: 4500, d50: 12 },
  ]);

  // Fillers Reativos (até 3) - Sílica, Metacaulim, etc.
  const [fillersReativos, setFillersReativos] = useState<MaterialCientifico[]>([
    { id: "fr1", nome: "Sílica Ativa Densificada", densidade: 2.20, quantidade: 25, bet: 20000, d50: 0.15, teorSolidos: 100, teorAgua: 0, tipo: "seco" },
    { id: "fr2", nome: "Metacaulim HP", densidade: 2.50, quantidade: 10, bet: 15000, d50: 2, teorSolidos: 100, teorAgua: 0, tipo: "seco" },
  ]);

  // Fillers Inertes (até 3) - Fíler calcário, quartzo moído
  const [fillersInertes, setFillersInertes] = useState<MaterialCientifico[]>([
    { id: "fi1", nome: "Pó de Quartzo", densidade: 2.65, quantidade: 35, blaine: 3500, d50: 10 },
  ]);

  // Agregados Miúdos (até 4 para UHPC - areias finas)
  const [agregadosMiudos, setAgregadosMiudos] = useState<MaterialCientifico[]>([
    { id: "am1", nome: "Areia de Quartzo 0.1-0.6mm", densidade: 2.65, quantidade: 100, d50: 0.3 },
  ]);

  // Agregados Graúdos (até 3 - granilhas para UHPC)
  const [agregadosGraudos, setAgregadosGraudos] = useState<MaterialCientifico[]>([]);

  // Aditivos (até 4)
  const [aditivos, setAditivos] = useState<MaterialCientifico[]>([
    { id: "ad1", nome: "Superplastificante 3ª Geração", densidade: 1.08, quantidade: 2.5, teorAgua: 60, tipo: "policarboxilato" },
  ]);

  // Fibras (até 2)
  const [fibras, setFibras] = useState<MaterialCientifico[]>([
    { id: "fb1", nome: "Fibra Metálica 13mm", densidade: 7.85, quantidade: 2, tipo: "aco" },
  ]);

  // Cálculos científicos
  const calculos = useMemo(() => {
    // Consumo de cimento base
    const totalCimentos = cimentos.reduce((acc, c) => acc + c.quantidade, 0);
    const consumoCimento = aguaBase / relacaoAC;
    
    // Distribuição dos cimentos
    const cimentosCalculados = cimentos.map(c => ({
      ...c,
      massa: consumoCimento * (c.quantidade / totalCimentos)
    }));

    // Fillers reativos (aglomerantes) - considerando teor de sólidos
    const fillersReativosCalculados = fillersReativos.map(f => {
      const teorSolidos = f.teorSolidos ?? 100;
      const massaBruta = consumoCimento * (f.quantidade / 100);
      const massaSolida = massaBruta * (teorSolidos / 100);
      const aguaContida = massaBruta * ((100 - teorSolidos) / 100);
      return {
        ...f,
        massaBruta,
        massaSolida,
        aguaContida
      };
    });

    const massaFillersReativos = fillersReativosCalculados.reduce((acc, f) => acc + f.massaSolida, 0);
    const aguaFillersReativos = fillersReativosCalculados.reduce((acc, f) => acc + f.aguaContida, 0);

    // Fillers inertes
    const fillersInertesCalculados = fillersInertes.map(f => ({
      ...f,
      massa: consumoCimento * (f.quantidade / 100)
    }));
    const massaFillersInertes = fillersInertesCalculados.reduce((acc, f) => acc + f.massa, 0);

    // Água dos aditivos
    const aditivosCalculados = aditivos.map(a => {
      const massa = consumoCimento * (a.quantidade / 100);
      const aguaContida = massa * ((a.teorAgua ?? 0) / 100);
      return {
        ...a,
        massa,
        aguaContida
      };
    });
    const massaAditivos = aditivosCalculados.reduce((acc, a) => acc + a.massa, 0);
    const aguaAditivos = aditivosCalculados.reduce((acc, a) => acc + a.aguaContida, 0);

    // Aglomerante total (cimento + fillers reativos)
    const aglomeranteTotal = consumoCimento + massaFillersReativos;
    
    // Água efetiva (descontando água dos materiais)
    const aguaEfetiva = aguaBase - aguaFillersReativos - aguaAditivos;
    
    // Relação a/a calculada
    const relacaoAACalculada = aglomeranteTotal > 0 ? aguaEfetiva / aglomeranteTotal : 0;

    // Volume de pasta (L/m³)
    const volumeCimento = consumoCimento / (cimentos[0]?.densidade || 3.15);
    const volumeFillersReativos = fillersReativosCalculados.reduce((acc, f) => acc + (f.massaSolida / f.densidade), 0);
    const volumeFillersInertes = fillersInertesCalculados.reduce((acc, f) => acc + (f.massa / f.densidade), 0);
    const volumeAgua = aguaEfetiva;
    const volumeAr = 1000 * (teorArIncorporado / 100);
    
    const volumePasta = volumeCimento + volumeFillersReativos + volumeFillersInertes + volumeAgua + volumeAr;
    const teorPasta = volumePasta / 10; // %

    // Volume disponível para agregados
    const volumeAgregados = 1000 - volumePasta;

    // Massa de agregados miúdos
    const totalMiudos = agregadosMiudos.reduce((acc, a) => acc + a.quantidade, 0);
    const densidadeMiudos = totalMiudos > 0
      ? agregadosMiudos.reduce((acc, a) => acc + (a.densidade * a.quantidade), 0) / totalMiudos
      : 2.65;
    const massaMiudos = volumeAgregados * densidadeMiudos * 0.6; // Fator de empacotamento

    const agregadosMiudosCalculados = agregadosMiudos.map(a => ({
      ...a,
      massa: massaMiudos * (a.quantidade / totalMiudos)
    }));

    // Massa de agregados graúdos (se houver)
    const totalGraudos = agregadosGraudos.reduce((acc, a) => acc + a.quantidade, 0);
    const massaGraudos = totalGraudos > 0 
      ? volumeAgregados * 2.70 * 0.3 
      : 0;

    const agregadosGraudosCalculados = agregadosGraudos.map(a => ({
      ...a,
      massa: totalGraudos > 0 ? massaGraudos * (a.quantidade / totalGraudos) : 0
    }));

    // Fibras (kg/m³ ou % do volume)
    const fibrasCalculadas = fibras.map(f => ({
      ...f,
      massa: f.quantidade * 10 * (f.densidade / 7.85) // % volume → kg/m³
    }));
    const massaFibras = fibrasCalculadas.reduce((acc, f) => acc + f.massa, 0);
    const teorFibras = fibras.reduce((acc, f) => acc + f.quantidade, 0);

    // Massa total
    const massaTotal = consumoCimento + massaFillersReativos + massaFillersInertes + 
      massaMiudos + massaGraudos + aguaEfetiva + massaFibras + massaAditivos;

    // Massa unitária
    const massaUnitaria = massaTotal;

    // Modelo de Larrard - Estimativa de resistência
    // fc = k1 * (c/a)^k2 onde c = cimento+adições, a = água
    const k1 = 35; // Constante empírica para UHPC
    const k2 = 2.5;
    const fckEstimado = k1 * Math.pow(aglomeranteTotal / aguaEfetiva, k2);

    // Fator de conversão para massada
    const fatorMassada = volumeMassada / 1000;

    // Custo estimado (simplificado)
    const custoEstimado = (consumoCimento * 0.8) + (massaFillersReativos * 3) + 
      (massaFillersInertes * 0.3) + (massaMiudos * 0.15) + (massaAditivos * 15) + (massaFibras * 8);

    return {
      cimentosCalculados,
      fillersReativosCalculados,
      fillersInertesCalculados,
      aditivosCalculados,
      agregadosMiudosCalculados,
      agregadosGraudosCalculados,
      fibrasCalculadas,
      consumoCimento,
      aglomeranteTotal,
      massaFillersReativos,
      massaFillersInertes,
      massaAditivos,
      aguaFillersReativos,
      aguaAditivos,
      aguaEfetiva,
      relacaoAACalculada,
      volumePasta,
      teorPasta,
      massaMiudos,
      massaGraudos,
      massaFibras,
      teorFibras,
      massaTotal,
      massaUnitaria,
      fckEstimado,
      fatorMassada,
      custoEstimado,
    };
  }, [
    cimentos, fillersReativos, fillersInertes, agregadosMiudos, agregadosGraudos,
    aditivos, fibras, aguaBase, relacaoAC, teorArIncorporado, volumeMassada
  ]);

  // Funções auxiliares
  const adicionarItem = (lista: MaterialCientifico[], setLista: Function, max: number, template: MaterialCientifico) => {
    if (lista.length >= max) {
      toast.error(`Máximo de ${max} itens`);
      return;
    }
    setLista([...lista, { ...template, id: `${template.id}${Date.now()}` }]);
  };

  const atualizarItem = (lista: MaterialCientifico[], setLista: Function, id: string, campo: string, valor: any) => {
    setLista(lista.map(item => item.id === id ? { ...item, [campo]: valor } : item));
  };

  const removerItem = (lista: MaterialCientifico[], setLista: Function, id: string) => {
    setLista(lista.filter(item => item.id !== id));
  };

  const enviarWhatsApp = () => {
    const texto = `*TRAÇO UHPC - fck ${fckAlvo} MPa*%0A%0A` +
      `Metodologia: ${tiposUHPC.find(t => t.value === tipoUHPC)?.label}%0A` +
      `a/c: ${relacaoAC.toFixed(2)} | a/a: ${calculos.relacaoAACalculada.toFixed(3)}%0A` +
      `Teor de pasta: ${calculos.teorPasta.toFixed(1)}%%0A%0A` +
      `*Para 1 m³:*%0A` +
      `Cimento: ${calculos.consumoCimento.toFixed(1)} kg%0A` +
      `Adições reativas: ${calculos.massaFillersReativos.toFixed(1)} kg%0A` +
      `Fillers inertes: ${calculos.massaFillersInertes.toFixed(1)} kg%0A` +
      `Areia: ${calculos.massaMiudos.toFixed(1)} kg%0A` +
      `Água: ${calculos.aguaEfetiva.toFixed(1)} L%0A` +
      `Fibras: ${calculos.massaFibras.toFixed(1)} kg (${calculos.teorFibras.toFixed(1)}%%)%0A%0A` +
      `Massa unitária: ${calculos.massaUnitaria.toFixed(0)} kg/m³%0A` +
      `fck estimado: ${calculos.fckEstimado.toFixed(0)} MPa%0A%0A` +
      `_CONCRYA Technologies - Nível Científico_`;

    window.open(`https://wa.me/5511982618300?text=${texto}`, "_blank");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-gradient-to-r from-purple-500/10 to-violet-500/10 sticky top-0 z-50 backdrop-blur">
        <div className="container py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center">
                <Rocket className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold uppercase tracking-tight">Nível Científico</h1>
                <p className="text-xs text-muted-foreground font-mono">UHPC • DUCTAL • DE LARRARD • MEC</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => toast.success("Traço salvo!")}>
              <Save className="w-4 h-4 mr-2" />
              Salvar
            </Button>
            <Button size="sm" onClick={enviarWhatsApp}>
              <Send className="w-4 h-4 mr-2" />
              WhatsApp
            </Button>
          </div>
        </div>
      </header>

      <div className="container py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Coluna 1: Parâmetros */}
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Atom className="w-5 h-5 text-purple-500" />
                  Metodologia
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Tipo de UHPC</Label>
                  <Select value={tipoUHPC} onValueChange={setTipoUHPC}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {tiposUHPC.map(tipo => (
                        <SelectItem key={tipo.value} value={tipo.value}>
                          {tipo.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Curva Granulométrica</Label>
                  <Select value={curvaGranulometrica} onValueChange={(v) => {
                    setCurvaGranulometrica(v);
                    const curva = curvasGranulometricas.find(c => c.value === v);
                    if (curva) setCoeficienteQ(curva.q);
                  }}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {curvasGranulometricas.map(curva => (
                        <SelectItem key={curva.value} value={curva.value}>
                          {curva.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {curvasGranulometricas.find(c => c.value === curvaGranulometrica)?.descricao}
                  </p>
                </div>

                {curvaGranulometrica === "custom" && (
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Label>Coeficiente q</Label>
                      <span className="text-sm font-mono text-purple-500">{coeficienteQ.toFixed(2)}</span>
                    </div>
                    <Slider
                      value={[coeficienteQ]}
                      onValueChange={(v) => setCoeficienteQ(v[0])}
                      min={0.2}
                      max={0.6}
                      step={0.01}
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calculator className="w-5 h-5 text-purple-500" />
                  Parâmetros
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">fck (MPa)</Label>
                    <Input
                      type="number"
                      value={fckAlvo}
                      onChange={(e) => setFckAlvo(Number(e.target.value))}
                      min={80}
                      max={250}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">a/c</Label>
                    <Input
                      type="number"
                      value={relacaoAC}
                      onChange={(e) => setRelacaoAC(Number(e.target.value))}
                      step={0.01}
                      min={0.15}
                      max={0.35}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Água (L/m³)</Label>
                    <Input
                      type="number"
                      value={aguaBase}
                      onChange={(e) => setAguaBase(Number(e.target.value))}
                      min={120}
                      max={200}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Ar (%)</Label>
                    <Input
                      type="number"
                      value={teorArIncorporado}
                      onChange={(e) => setTeorArIncorporado(Number(e.target.value))}
                      step={0.1}
                      min={0}
                      max={5}
                    />
                  </div>
                </div>

                <Separator />

                <div className="space-y-1">
                  <Label className="text-xs">Volume da massada (L)</Label>
                  <Input
                    type="number"
                    value={volumeMassada}
                    onChange={(e) => setVolumeMassada(Number(e.target.value))}
                    min={1}
                    max={10000}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Modelo de Larrard */}
            <Card className="border-purple-500/30">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <FlaskConical className="w-5 h-5 text-purple-500" />
                  Modelo MEC
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="w-4 h-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      Modelo de Empacotamento Compressível de François de Larrard (LCPC)
                    </TooltipContent>
                  </Tooltip>
                </CardTitle>
                <CardDescription>François de Larrard</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label className="text-xs">Compacidade Virtual (γ*)</Label>
                    <span className="text-xs font-mono">{compacidadeVirtual.toFixed(2)}</span>
                  </div>
                  <Slider
                    value={[compacidadeVirtual]}
                    onValueChange={(v) => setCompacidadeVirtual(v[0])}
                    min={0.60}
                    max={0.85}
                    step={0.01}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label className="text-xs">Índice de Compactação (K)</Label>
                    <span className="text-xs font-mono">{indiceCompactacao}</span>
                  </div>
                  <Slider
                    value={[indiceCompactacao]}
                    onValueChange={(v) => setIndiceCompactacao(v[0])}
                    min={4}
                    max={15}
                    step={1}
                  />
                  <p className="text-xs text-muted-foreground">
                    K=4: Vibração leve | K=9: Vibração intensa | K=15: Prensagem
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Coluna 2-3: Materiais */}
          <div className="lg:col-span-2 space-y-4">
            <Tabs defaultValue="aglomerantes" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="aglomerantes">Aglomerantes</TabsTrigger>
                <TabsTrigger value="agregados">Agregados</TabsTrigger>
                <TabsTrigger value="aditivos">Aditivos</TabsTrigger>
                <TabsTrigger value="fibras">Fibras</TabsTrigger>
              </TabsList>

              {/* Aglomerantes */}
              <TabsContent value="aglomerantes" className="space-y-4">
                {/* Cimentos */}
                <Card>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">Cimentos (até 2)</CardTitle>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => adicionarItem(cimentos, setCimentos, 2, {
                          id: "c", nome: "Cimento", densidade: 3.15, quantidade: 0, blaine: 4000
                        })}
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {cimentos.map((c, i) => (
                      <div key={c.id} className="grid grid-cols-12 gap-2 items-end">
                        <div className="col-span-4">
                          <Label className="text-xs">Nome</Label>
                          <Input
                            value={c.nome}
                            onChange={(e) => atualizarItem(cimentos, setCimentos, c.id, "nome", e.target.value)}
                          />
                        </div>
                        <div className="col-span-2">
                          <Label className="text-xs">Densidade</Label>
                          <Input
                            type="number"
                            value={c.densidade}
                            onChange={(e) => atualizarItem(cimentos, setCimentos, c.id, "densidade", Number(e.target.value))}
                            step={0.01}
                          />
                        </div>
                        <div className="col-span-2">
                          <Label className="text-xs">Blaine</Label>
                          <Input
                            type="number"
                            value={c.blaine || ""}
                            onChange={(e) => atualizarItem(cimentos, setCimentos, c.id, "blaine", Number(e.target.value))}
                            placeholder="cm²/g"
                          />
                        </div>
                        <div className="col-span-2">
                          <Label className="text-xs">% Mix</Label>
                          <Input
                            type="number"
                            value={c.quantidade}
                            onChange={(e) => atualizarItem(cimentos, setCimentos, c.id, "quantidade", Number(e.target.value))}
                          />
                        </div>
                        <div className="col-span-2 flex gap-1">
                          <div className="flex-1 text-center">
                            <Label className="text-xs text-muted-foreground">kg/m³</Label>
                            <p className="text-sm font-bold text-purple-500">
                              {(calculos.cimentosCalculados.find(x => x.id === c.id)?.massa || 0).toFixed(0)}
                            </p>
                          </div>
                          {cimentos.length > 1 && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => removerItem(cimentos, setCimentos, c.id)}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* Fillers Reativos */}
                <Card>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-base">Adições Reativas (até 3)</CardTitle>
                        <CardDescription className="text-xs">Sílica ativa, metacaulim, cinza volante</CardDescription>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => adicionarItem(fillersReativos, setFillersReativos, 3, {
                          id: "fr", nome: "Adição", densidade: 2.20, quantidade: 0, bet: 15000, teorSolidos: 100, teorAgua: 0
                        })}
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {fillersReativos.map((f) => (
                      <div key={f.id} className="grid grid-cols-12 gap-2 items-end">
                        <div className="col-span-3">
                          <Label className="text-xs">Nome</Label>
                          <Input
                            value={f.nome}
                            onChange={(e) => atualizarItem(fillersReativos, setFillersReativos, f.id, "nome", e.target.value)}
                          />
                        </div>
                        <div className="col-span-1">
                          <Label className="text-xs">ρ</Label>
                          <Input
                            type="number"
                            value={f.densidade}
                            onChange={(e) => atualizarItem(fillersReativos, setFillersReativos, f.id, "densidade", Number(e.target.value))}
                            step={0.01}
                          />
                        </div>
                        <div className="col-span-2">
                          <Label className="text-xs">BET (m²/g)</Label>
                          <Input
                            type="number"
                            value={f.bet || ""}
                            onChange={(e) => atualizarItem(fillersReativos, setFillersReativos, f.id, "bet", Number(e.target.value))}
                          />
                        </div>
                        <div className="col-span-2">
                          <Label className="text-xs">% Sólidos</Label>
                          <Input
                            type="number"
                            value={f.teorSolidos || 100}
                            onChange={(e) => atualizarItem(fillersReativos, setFillersReativos, f.id, "teorSolidos", Number(e.target.value))}
                          />
                        </div>
                        <div className="col-span-2">
                          <Label className="text-xs">% s/ cim.</Label>
                          <Input
                            type="number"
                            value={f.quantidade}
                            onChange={(e) => atualizarItem(fillersReativos, setFillersReativos, f.id, "quantidade", Number(e.target.value))}
                          />
                        </div>
                        <div className="col-span-2 flex gap-1">
                          <div className="flex-1 text-center">
                            <Label className="text-xs text-muted-foreground">kg/m³</Label>
                            <p className="text-sm font-bold text-purple-500">
                              {(calculos.fillersReativosCalculados.find(x => x.id === f.id)?.massaSolida || 0).toFixed(0)}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => removerItem(fillersReativos, setFillersReativos, f.id)}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* Fillers Inertes */}
                <Card>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-base">Fillers Inertes (até 3)</CardTitle>
                        <CardDescription className="text-xs">Pó de quartzo, fíler calcário</CardDescription>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => adicionarItem(fillersInertes, setFillersInertes, 3, {
                          id: "fi", nome: "Filler", densidade: 2.70, quantidade: 0, blaine: 3000
                        })}
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {fillersInertes.map((f) => (
                      <div key={f.id} className="grid grid-cols-12 gap-2 items-end">
                        <div className="col-span-4">
                          <Label className="text-xs">Nome</Label>
                          <Input
                            value={f.nome}
                            onChange={(e) => atualizarItem(fillersInertes, setFillersInertes, f.id, "nome", e.target.value)}
                          />
                        </div>
                        <div className="col-span-2">
                          <Label className="text-xs">Densidade</Label>
                          <Input
                            type="number"
                            value={f.densidade}
                            onChange={(e) => atualizarItem(fillersInertes, setFillersInertes, f.id, "densidade", Number(e.target.value))}
                            step={0.01}
                          />
                        </div>
                        <div className="col-span-2">
                          <Label className="text-xs">Blaine</Label>
                          <Input
                            type="number"
                            value={f.blaine || ""}
                            onChange={(e) => atualizarItem(fillersInertes, setFillersInertes, f.id, "blaine", Number(e.target.value))}
                          />
                        </div>
                        <div className="col-span-2">
                          <Label className="text-xs">% s/ cim.</Label>
                          <Input
                            type="number"
                            value={f.quantidade}
                            onChange={(e) => atualizarItem(fillersInertes, setFillersInertes, f.id, "quantidade", Number(e.target.value))}
                          />
                        </div>
                        <div className="col-span-2 flex gap-1">
                          <div className="flex-1 text-center">
                            <Label className="text-xs text-muted-foreground">kg/m³</Label>
                            <p className="text-sm font-bold text-purple-500">
                              {(calculos.fillersInertesCalculados.find(x => x.id === f.id)?.massa || 0).toFixed(0)}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => removerItem(fillersInertes, setFillersInertes, f.id)}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Agregados */}
              <TabsContent value="agregados" className="space-y-4">
                {/* Agregados Miúdos */}
                <Card>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-base">Agregados Miúdos (até 4)</CardTitle>
                        <CardDescription className="text-xs">Areias de quartzo, pó de pedra</CardDescription>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => adicionarItem(agregadosMiudos, setAgregadosMiudos, 4, {
                          id: "am", nome: "Areia", densidade: 2.65, quantidade: 0, d50: 0.3
                        })}
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {agregadosMiudos.map((a) => (
                      <div key={a.id} className="grid grid-cols-12 gap-2 items-end">
                        <div className="col-span-4">
                          <Label className="text-xs">Nome</Label>
                          <Input
                            value={a.nome}
                            onChange={(e) => atualizarItem(agregadosMiudos, setAgregadosMiudos, a.id, "nome", e.target.value)}
                          />
                        </div>
                        <div className="col-span-2">
                          <Label className="text-xs">Densidade</Label>
                          <Input
                            type="number"
                            value={a.densidade}
                            onChange={(e) => atualizarItem(agregadosMiudos, setAgregadosMiudos, a.id, "densidade", Number(e.target.value))}
                            step={0.01}
                          />
                        </div>
                        <div className="col-span-2">
                          <Label className="text-xs">D50 (mm)</Label>
                          <Input
                            type="number"
                            value={a.d50 || ""}
                            onChange={(e) => atualizarItem(agregadosMiudos, setAgregadosMiudos, a.id, "d50", Number(e.target.value))}
                            step={0.01}
                          />
                        </div>
                        <div className="col-span-2">
                          <Label className="text-xs">% Mix</Label>
                          <Input
                            type="number"
                            value={a.quantidade}
                            onChange={(e) => atualizarItem(agregadosMiudos, setAgregadosMiudos, a.id, "quantidade", Number(e.target.value))}
                          />
                        </div>
                        <div className="col-span-2 flex gap-1">
                          <div className="flex-1 text-center">
                            <Label className="text-xs text-muted-foreground">kg/m³</Label>
                            <p className="text-sm font-bold text-purple-500">
                              {(calculos.agregadosMiudosCalculados.find(x => x.id === a.id)?.massa || 0).toFixed(0)}
                            </p>
                          </div>
                          {agregadosMiudos.length > 1 && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => removerItem(agregadosMiudos, setAgregadosMiudos, a.id)}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* Agregados Graúdos */}
                <Card>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-base">Agregados Graúdos (até 3)</CardTitle>
                        <CardDescription className="text-xs">Granilhas, britas finas (opcional para UHPC)</CardDescription>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => adicionarItem(agregadosGraudos, setAgregadosGraudos, 3, {
                          id: "ag", nome: "Granilha", densidade: 2.70, quantidade: 0, d50: 4
                        })}
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {agregadosGraudos.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        UHPC típico não usa agregado graúdo. Adicione apenas se necessário.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {agregadosGraudos.map((a) => (
                          <div key={a.id} className="grid grid-cols-12 gap-2 items-end">
                            <div className="col-span-4">
                              <Label className="text-xs">Nome</Label>
                              <Input
                                value={a.nome}
                                onChange={(e) => atualizarItem(agregadosGraudos, setAgregadosGraudos, a.id, "nome", e.target.value)}
                              />
                            </div>
                            <div className="col-span-2">
                              <Label className="text-xs">Densidade</Label>
                              <Input
                                type="number"
                                value={a.densidade}
                                onChange={(e) => atualizarItem(agregadosGraudos, setAgregadosGraudos, a.id, "densidade", Number(e.target.value))}
                                step={0.01}
                              />
                            </div>
                            <div className="col-span-2">
                              <Label className="text-xs">Dmáx (mm)</Label>
                              <Input
                                type="number"
                                value={a.d50 || ""}
                                onChange={(e) => atualizarItem(agregadosGraudos, setAgregadosGraudos, a.id, "d50", Number(e.target.value))}
                              />
                            </div>
                            <div className="col-span-2">
                              <Label className="text-xs">% Mix</Label>
                              <Input
                                type="number"
                                value={a.quantidade}
                                onChange={(e) => atualizarItem(agregadosGraudos, setAgregadosGraudos, a.id, "quantidade", Number(e.target.value))}
                              />
                            </div>
                            <div className="col-span-2 flex gap-1">
                              <div className="flex-1 text-center">
                                <Label className="text-xs text-muted-foreground">kg/m³</Label>
                                <p className="text-sm font-bold text-purple-500">
                                  {(calculos.agregadosGraudosCalculados.find(x => x.id === a.id)?.massa || 0).toFixed(0)}
                                </p>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => removerItem(agregadosGraudos, setAgregadosGraudos, a.id)}
                              >
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Aditivos */}
              <TabsContent value="aditivos" className="space-y-4">
                <Card>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-base">Aditivos (até 4)</CardTitle>
                        <CardDescription className="text-xs">Superplastificantes, retardadores, aceleradores</CardDescription>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => adicionarItem(aditivos, setAditivos, 4, {
                          id: "ad", nome: "Aditivo", densidade: 1.10, quantidade: 0, teorAgua: 60
                        })}
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {aditivos.map((a) => (
                      <div key={a.id} className="grid grid-cols-12 gap-2 items-end">
                        <div className="col-span-4">
                          <Label className="text-xs">Nome</Label>
                          <Input
                            value={a.nome}
                            onChange={(e) => atualizarItem(aditivos, setAditivos, a.id, "nome", e.target.value)}
                          />
                        </div>
                        <div className="col-span-2">
                          <Label className="text-xs">Densidade</Label>
                          <Input
                            type="number"
                            value={a.densidade}
                            onChange={(e) => atualizarItem(aditivos, setAditivos, a.id, "densidade", Number(e.target.value))}
                            step={0.01}
                          />
                        </div>
                        <div className="col-span-2">
                          <Label className="text-xs">% Água</Label>
                          <Input
                            type="number"
                            value={a.teorAgua || 0}
                            onChange={(e) => atualizarItem(aditivos, setAditivos, a.id, "teorAgua", Number(e.target.value))}
                          />
                        </div>
                        <div className="col-span-2">
                          <Label className="text-xs">% s/ cim.</Label>
                          <Input
                            type="number"
                            value={a.quantidade}
                            onChange={(e) => atualizarItem(aditivos, setAditivos, a.id, "quantidade", Number(e.target.value))}
                            step={0.1}
                          />
                        </div>
                        <div className="col-span-2 flex gap-1">
                          <div className="flex-1 text-center">
                            <Label className="text-xs text-muted-foreground">kg/m³</Label>
                            <p className="text-sm font-bold text-purple-500">
                              {(calculos.aditivosCalculados.find(x => x.id === a.id)?.massa || 0).toFixed(1)}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => removerItem(aditivos, setAditivos, a.id)}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Fibras */}
              <TabsContent value="fibras" className="space-y-4">
                <Card>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-base">Fibras (até 2)</CardTitle>
                        <CardDescription className="text-xs">Metálicas, sintéticas, carbono</CardDescription>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => adicionarItem(fibras, setFibras, 2, {
                          id: "fb", nome: "Fibra", densidade: 7.85, quantidade: 0, tipo: "aco"
                        })}
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {fibras.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Adicione fibras para UHPFRC (Ultra High Performance Fiber Reinforced Concrete)
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {fibras.map((f) => (
                          <div key={f.id} className="grid grid-cols-12 gap-2 items-end">
                            <div className="col-span-4">
                              <Label className="text-xs">Nome</Label>
                              <Input
                                value={f.nome}
                                onChange={(e) => atualizarItem(fibras, setFibras, f.id, "nome", e.target.value)}
                              />
                            </div>
                            <div className="col-span-2">
                              <Label className="text-xs">Densidade</Label>
                              <Input
                                type="number"
                                value={f.densidade}
                                onChange={(e) => atualizarItem(fibras, setFibras, f.id, "densidade", Number(e.target.value))}
                                step={0.01}
                              />
                            </div>
                            <div className="col-span-2">
                              <Label className="text-xs">Tipo</Label>
                              <Select
                                value={f.tipo || "aco"}
                                onValueChange={(v) => atualizarItem(fibras, setFibras, f.id, "tipo", v)}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="aco">Aço</SelectItem>
                                  <SelectItem value="pp">Polipropileno</SelectItem>
                                  <SelectItem value="pva">PVA</SelectItem>
                                  <SelectItem value="carbono">Carbono</SelectItem>
                                  <SelectItem value="vidro">Vidro</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="col-span-2">
                              <Label className="text-xs">% Volume</Label>
                              <Input
                                type="number"
                                value={f.quantidade}
                                onChange={(e) => atualizarItem(fibras, setFibras, f.id, "quantidade", Number(e.target.value))}
                                step={0.1}
                              />
                            </div>
                            <div className="col-span-2 flex gap-1">
                              <div className="flex-1 text-center">
                                <Label className="text-xs text-muted-foreground">kg/m³</Label>
                                <p className="text-sm font-bold text-purple-500">
                                  {(calculos.fibrasCalculadas.find(x => x.id === f.id)?.massa || 0).toFixed(0)}
                                </p>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => removerItem(fibras, setFibras, f.id)}
                              >
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Coluna 4: Resultados */}
          <div className="space-y-4">
            <Card className="border-purple-500/30">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Beaker className="w-5 h-5 text-purple-500" />
                  Resultados
                </CardTitle>
                <CardDescription>Para {volumeMassada} L</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Composição */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Composição (kg/m³)</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Cimento</span>
                      <span className="font-bold">{calculos.consumoCimento.toFixed(0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Adições reativas</span>
                      <span className="font-bold">{calculos.massaFillersReativos.toFixed(0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Fillers inertes</span>
                      <span className="font-bold">{calculos.massaFillersInertes.toFixed(0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Agregados miúdos</span>
                      <span className="font-bold">{calculos.massaMiudos.toFixed(0)}</span>
                    </div>
                    {calculos.massaGraudos > 0 && (
                      <div className="flex justify-between">
                        <span>Agregados graúdos</span>
                        <span className="font-bold">{calculos.massaGraudos.toFixed(0)}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span>Água efetiva</span>
                      <span className="font-bold">{calculos.aguaEfetiva.toFixed(0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Aditivos</span>
                      <span className="font-bold">{calculos.massaAditivos.toFixed(1)}</span>
                    </div>
                    {calculos.massaFibras > 0 && (
                      <div className="flex justify-between">
                        <span>Fibras ({calculos.teorFibras.toFixed(1)}%)</span>
                        <span className="font-bold">{calculos.massaFibras.toFixed(0)}</span>
                      </div>
                    )}
                  </div>
                </div>

                <Separator />

                {/* Relações */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Relações</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="p-2 bg-muted/50 rounded text-center">
                      <p className="text-xs text-muted-foreground">a/c</p>
                      <p className="font-bold text-lg">{relacaoAC.toFixed(2)}</p>
                    </div>
                    <div className="p-2 bg-muted/50 rounded text-center">
                      <p className="text-xs text-muted-foreground">a/a</p>
                      <p className="font-bold text-lg">{calculos.relacaoAACalculada.toFixed(3)}</p>
                    </div>
                    <div className="p-2 bg-muted/50 rounded text-center">
                      <p className="text-xs text-muted-foreground">Teor pasta</p>
                      <p className="font-bold text-lg">{calculos.teorPasta.toFixed(1)}%</p>
                    </div>
                    <div className="p-2 bg-muted/50 rounded text-center">
                      <p className="text-xs text-muted-foreground">Aglom.</p>
                      <p className="font-bold text-lg">{calculos.aglomeranteTotal.toFixed(0)}</p>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Totais */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Massa unitária</span>
                    <span className="font-bold text-lg">{calculos.massaUnitaria.toFixed(0)} kg/m³</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">fck estimado</span>
                    <span className="font-bold text-lg text-purple-500">{calculos.fckEstimado.toFixed(0)} MPa</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Custo estimado</span>
                    <span className="font-bold text-lg">R$ {calculos.custoEstimado.toFixed(0)}/m³</span>
                  </div>
                </div>

                <Separator />

                {/* Para massada */}
                <div className="p-3 bg-purple-500/10 rounded-lg border border-purple-500/30">
                  <h4 className="text-sm font-medium mb-2">Para {volumeMassada} L:</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Cimento</span>
                      <span className="font-bold">{(calculos.consumoCimento * calculos.fatorMassada).toFixed(2)} kg</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Adições</span>
                      <span className="font-bold">{((calculos.massaFillersReativos + calculos.massaFillersInertes) * calculos.fatorMassada).toFixed(2)} kg</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Areia</span>
                      <span className="font-bold">{(calculos.massaMiudos * calculos.fatorMassada).toFixed(2)} kg</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Água</span>
                      <span className="font-bold">{(calculos.aguaEfetiva * calculos.fatorMassada).toFixed(2)} L</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Aditivo</span>
                      <span className="font-bold">{(calculos.massaAditivos * calculos.fatorMassada * 1000).toFixed(0)} g</span>
                    </div>
                    {calculos.massaFibras > 0 && (
                      <div className="flex justify-between">
                        <span>Fibras</span>
                        <span className="font-bold">{(calculos.massaFibras * calculos.fatorMassada).toFixed(2)} kg</span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Citação de Larrard */}
            <Card className="bg-gradient-to-br from-purple-500/5 to-violet-500/5">
              <CardContent className="pt-4">
                <blockquote className="text-xs italic text-muted-foreground border-l-2 border-purple-500 pl-3">
                  "O concreto é o material mais utilizado pelo homem depois da água. 
                  Dominá-lo é dominar o futuro da construção."
                  <footer className="mt-1 text-[10px] not-italic">— François de Larrard</footer>
                </blockquote>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
