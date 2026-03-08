import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { useState, useMemo } from "react";
import { ArrowLeft, Factory, Calculator, Save, Send, Plus, Trash2, Droplets, Beaker } from "lucide-react";
import { Link } from "wouter";
import { toast } from "sonner";

// Classes de espalhamento CAA
const classesCAAFlow = [
  { classe: "SF1", faixa: "550-650", aplicacao: "Estruturas não armadas ou pouco armadas, bombeamento" },
  { classe: "SF2", faixa: "660-750", aplicacao: "Aplicações normais (pilares, vigas, paredes)" },
  { classe: "SF3", faixa: "760-850", aplicacao: "Estruturas muito armadas, formas complexas" },
];

const classesViscosidade = [
  { classe: "VS1/VF1", t500: "<2s", vFunil: "<8s", aplicacao: "Boa capacidade de preenchimento" },
  { classe: "VS2/VF2", t500: "≥2s", vFunil: "9-25s", aplicacao: "Melhor resistência à segregação" },
];

const classesPassagem = [
  { classe: "PL1", caixaL: "≥0.80", aplicacao: "Estruturas com espaçamento 80-100mm" },
  { classe: "PL2", caixaL: "≥0.80", aplicacao: "Estruturas com espaçamento 60-80mm" },
  { classe: "PJ1", anelJ: "0-10mm", aplicacao: "Estruturas com espaçamento 80-100mm" },
  { classe: "PJ2", anelJ: "0-10mm", aplicacao: "Estruturas com espaçamento 60-80mm" },
];

interface Material {
  id: string;
  nome: string;
  densidade: number;
  quantidade: number;
  umidade?: number;
  absorcao?: number;
  moduloFinura?: number;
  dmaxCaract?: number;
  teorSolidos?: number;
  teorAgua?: number;
  tipo?: string;
}

export default function NivelAvancado() {
  const [tipoConcreto, setTipoConcreto] = useState<"caa" | "hpc">("caa");
  
  // Parâmetros CAA
  const [classeFlow, setClasseFlow] = useState("SF2");
  const [flowAlvo, setFlowAlvo] = useState(700);
  
  // Parâmetros gerais
  const [fckAlvo, setFckAlvo] = useState(40);
  const [teorArgamassa, setTeorArgamassa] = useState(58);
  const [relacaoAC, setRelacaoAC] = useState(0.42);
  const [teorArIncorporado, setTeorArIncorporado] = useState(2.5);
  const [volumeMassada, setVolumeMassada] = useState(1000);
  const [aguaBase, setAguaBase] = useState(170);

  // Cimentos (até 2)
  const [cimentos, setCimentos] = useState<Material[]>([
    { id: "c1", nome: "CP V ARI", densidade: 3.10, quantidade: 100 },
  ]);

  // Fillers Reativos (até 3) - entram como aglomerante
  const [fillersReativos, setFillersReativos] = useState<Material[]>([
    { id: "fr1", nome: "Sílica Ativa", densidade: 2.20, quantidade: 30, teorSolidos: 100, teorAgua: 0, tipo: "seco" },
  ]);

  // Fillers Inertes (até 3) - entram como pasta/agregado
  const [fillersInertes, setFillersInertes] = useState<Material[]>([
    { id: "fi1", nome: "Fíler Calcário", densidade: 2.70, quantidade: 80 },
  ]);

  // Agregados Miúdos (até 4)
  const [agregadosMiudos, setAgregadosMiudos] = useState<Material[]>([
    { id: "am1", nome: "Areia Média", densidade: 2.65, quantidade: 40, umidade: 4, absorcao: 1, moduloFinura: 2.4 },
    { id: "am2", nome: "Areia Fina", densidade: 2.63, quantidade: 30, umidade: 3, absorcao: 0.5, moduloFinura: 1.6 },
    { id: "am3", nome: "Pó de Pedra", densidade: 2.70, quantidade: 30, umidade: 2, absorcao: 1.5, moduloFinura: 2.8 },
  ]);

  // Agregados Graúdos (até 3)
  const [agregadosGraudos, setAgregadosGraudos] = useState<Material[]>([
    { id: "ag1", nome: "Brita 0", densidade: 2.72, quantidade: 70, umidade: 1, absorcao: 1, dmaxCaract: 9.5 },
    { id: "ag2", nome: "Brita 1", densidade: 2.70, quantidade: 30, umidade: 0.5, absorcao: 1, dmaxCaract: 19 },
  ]);

  // Aditivos (até 4)
  const [aditivos, setAditivos] = useState<Material[]>([
    { id: "ad1", nome: "Superplastificante", densidade: 1.10, quantidade: 1.2, teorAgua: 60, tipo: "plastificante" },
    { id: "ad2", nome: "Modificador Viscosidade", densidade: 1.05, quantidade: 0.3, teorAgua: 70, tipo: "vma" },
  ]);

  // Fibras (até 2)
  const [fibras, setFibras] = useState<Material[]>([]);

  // Cálculos
  const calculos = useMemo(() => {
    // Consumo de cimento
    const totalCimentos = cimentos.reduce((acc, c) => acc + c.quantidade, 0);
    const consumoCimento = aguaBase / relacaoAC;
    
    // Distribuição dos cimentos
    const cimentosCalculados = cimentos.map(c => ({
      ...c,
      massa: consumoCimento * (c.quantidade / totalCimentos)
    }));

    // Fillers reativos (aglomerantes)
    const massaFillersReativos = fillersReativos.reduce((acc, f) => {
      const massaSolida = f.teorSolidos ? f.quantidade * f.teorSolidos / 100 : f.quantidade;
      return acc + massaSolida;
    }, 0);

    // Água dos fillers reativos (sílica em suspensão)
    const aguaFillersReativos = fillersReativos.reduce((acc, f) => {
      return acc + (f.teorAgua ? f.quantidade * f.teorAgua / 100 : 0);
    }, 0);

    // Água dos aditivos
    const aguaAditivos = aditivos.reduce((acc, a) => {
      return acc + (a.teorAgua ? a.quantidade * a.teorAgua / 100 : 0);
    }, 0);

    // Aglomerante total
    const aglomeranteTotal = consumoCimento + massaFillersReativos;
    
    // Água efetiva
    const aguaEfetiva = aguaBase - aguaFillersReativos - aguaAditivos;
    
    // Relação a/a
    const relacaoAA = aglomeranteTotal > 0 ? aguaEfetiva / aglomeranteTotal : 0;

    // Volume de pasta
    const volumePasta = (consumoCimento / 3.10) + 
      fillersReativos.reduce((acc, f) => acc + (f.quantidade / f.densidade), 0) +
      fillersInertes.reduce((acc, f) => acc + (f.quantidade / f.densidade), 0) +
      aguaEfetiva;

    // Volume de agregados
    const volumeAgregados = 1000 - volumePasta - (1000 * teorArIncorporado / 100);

    // Distribuição miúdos/graúdos
    const volumeMiudos = volumeAgregados * (teorArgamassa / 100);
    const volumeGraudos = volumeAgregados * (1 - teorArgamassa / 100);

    // Massa de agregados
    const totalMiudos = agregadosMiudos.reduce((acc, a) => acc + a.quantidade, 0);
    const totalGraudos = agregadosGraudos.reduce((acc, a) => acc + a.quantidade, 0);
    
    const densidadeMiudos = totalMiudos > 0
      ? agregadosMiudos.reduce((acc, a) => acc + (a.densidade * a.quantidade), 0) / totalMiudos
      : 2.65;
    const densidadeGraudos = totalGraudos > 0
      ? agregadosGraudos.reduce((acc, a) => acc + (a.densidade * a.quantidade), 0) / totalGraudos
      : 2.70;

    const massaMiudos = volumeMiudos * densidadeMiudos;
    const massaGraudos = volumeGraudos * densidadeGraudos;

    // Correção de umidade
    const correcaoUmidadeMiudos = agregadosMiudos.reduce((acc, a) => {
      const proporcao = a.quantidade / totalMiudos;
      const massaAgregado = massaMiudos * proporcao;
      return acc + (massaAgregado * ((a.umidade || 0) - (a.absorcao || 0)) / 100);
    }, 0);

    const correcaoUmidadeGraudos = agregadosGraudos.reduce((acc, a) => {
      const proporcao = a.quantidade / totalGraudos;
      const massaAgregado = massaGraudos * proporcao;
      return acc + (massaAgregado * ((a.umidade || 0) - (a.absorcao || 0)) / 100);
    }, 0);

    const aguaCorrigida = aguaEfetiva - correcaoUmidadeMiudos - correcaoUmidadeGraudos;

    // Massa de fibras
    const massaFibras = fibras.reduce((acc, f) => acc + f.quantidade, 0);

    // Massa total
    const massaTotal = consumoCimento + massaFillersReativos + 
      fillersInertes.reduce((acc, f) => acc + f.quantidade, 0) +
      massaMiudos + massaGraudos + aguaCorrigida + massaFibras;

    // Fator de conversão para massada
    const fatorMassada = volumeMassada / 1000;

    return {
      cimentosCalculados,
      consumoCimento,
      aglomeranteTotal,
      massaFillersReativos,
      aguaFillersReativos,
      aguaAditivos,
      aguaEfetiva,
      aguaCorrigida,
      relacaoAA,
      massaMiudos,
      massaGraudos,
      massaFibras,
      massaTotal,
      fatorMassada,
      correcaoUmidadeMiudos,
      correcaoUmidadeGraudos,
    };
  }, [
    cimentos, fillersReativos, fillersInertes, agregadosMiudos, agregadosGraudos,
    aditivos, fibras, aguaBase, relacaoAC, teorArgamassa, teorArIncorporado, volumeMassada
  ]);

  // Funções auxiliares
  const adicionarItem = (lista: Material[], setLista: Function, max: number, template: Material) => {
    if (lista.length >= max) {
      toast.error(`Máximo de ${max} itens`);
      return;
    }
    setLista([...lista, { ...template, id: `${template.id}${Date.now()}` }]);
  };

  const atualizarItem = (lista: Material[], setLista: Function, id: string, campo: string, valor: any) => {
    setLista(lista.map(item => item.id === id ? { ...item, [campo]: valor } : item));
  };

  const removerItem = (lista: Material[], setLista: Function, id: string) => {
    setLista(lista.filter(item => item.id !== id));
  };

  const enviarWhatsApp = () => {
    const texto = `*TRAÇO ${tipoConcreto.toUpperCase()} - fck ${fckAlvo} MPa*%0A%0A` +
      `${tipoConcreto === "caa" ? `Flow: ${flowAlvo} mm (${classeFlow})` : `Slump: ${flowAlvo} mm`}%0A` +
      `a/c: ${relacaoAC.toFixed(2)} | a/a: ${calculos.relacaoAA.toFixed(2)}%0A%0A` +
      `*Para 1 m³:*%0A` +
      `Cimento: ${calculos.consumoCimento.toFixed(1)} kg%0A` +
      `Adições: ${calculos.massaFillersReativos.toFixed(1)} kg%0A` +
      `Areia: ${calculos.massaMiudos.toFixed(1)} kg%0A` +
      `Brita: ${calculos.massaGraudos.toFixed(1)} kg%0A` +
      `Água: ${calculos.aguaCorrigida.toFixed(1)} L%0A%0A` +
      `_CONCRYA Technologies_`;

    window.open(`https://wa.me/5511982618300?text=${texto}`, "_blank");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-gradient-to-r from-orange-500/10 to-amber-500/10 sticky top-0 z-50 backdrop-blur">
        <div className="container py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center">
                <Factory className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold uppercase tracking-tight">Nível Avançado</h1>
                <p className="text-xs text-muted-foreground">CAA, HPC & Pré-moldados</p>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={enviarWhatsApp}>
              <Send className="w-4 h-4 mr-2" />
              WhatsApp
            </Button>
            <Button size="sm">
              <Save className="w-4 h-4 mr-2" />
              Salvar
            </Button>
          </div>
        </div>
      </header>

      <main className="container py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Coluna Principal */}
          <div className="lg:col-span-2 space-y-6">
            {/* Tipo de Concreto */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Beaker className="w-5 h-5 text-orange-500" />
                  Tipo de Concreto
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs value={tipoConcreto} onValueChange={(v) => setTipoConcreto(v as "caa" | "hpc")}>
                  <TabsList className="grid grid-cols-2">
                    <TabsTrigger value="caa">CAA (Auto-Adensável)</TabsTrigger>
                    <TabsTrigger value="hpc">HPC (Alto Desempenho)</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="caa" className="mt-4">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div>
                        <Label>Classe de Flow</Label>
                        <Select value={classeFlow} onValueChange={setClasseFlow}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="SF1">SF1 (550-650mm)</SelectItem>
                            <SelectItem value="SF2">SF2 (660-750mm)</SelectItem>
                            <SelectItem value="SF3">SF3 (760-850mm)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Flow Alvo (mm)</Label>
                        <Input type="number" value={flowAlvo} onChange={(e) => setFlowAlvo(Number(e.target.value))} />
                      </div>
                      <div>
                        <Label>fck (MPa)</Label>
                        <Input type="number" value={fckAlvo} onChange={(e) => setFckAlvo(Number(e.target.value))} />
                      </div>
                    </div>
                    
                    {/* Tabela de Classes CAA */}
                    <div className="mt-4 overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-2">Classe</th>
                            <th className="text-left py-2">Faixa</th>
                            <th className="text-left py-2">Aplicação</th>
                          </tr>
                        </thead>
                        <tbody>
                          {classesCAAFlow.map((c) => (
                            <tr key={c.classe} className={`border-b ${classeFlow === c.classe ? "bg-primary/10" : ""}`}>
                              <td className="py-2 font-mono font-bold">{c.classe}</td>
                              <td className="py-2">{c.faixa} mm</td>
                              <td className="py-2 text-muted-foreground">{c.aplicacao}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="hpc" className="mt-4">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div>
                        <Label>Slump (mm)</Label>
                        <Input type="number" value={flowAlvo} onChange={(e) => setFlowAlvo(Number(e.target.value))} />
                      </div>
                      <div>
                        <Label>fck (MPa)</Label>
                        <Input type="number" value={fckAlvo} onChange={(e) => setFckAlvo(Number(e.target.value))} />
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            {/* Parâmetros */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Parâmetros de Dosagem</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <Label>Teor Argamassa (%)</Label>
                  <Input type="number" value={teorArgamassa} onChange={(e) => setTeorArgamassa(Number(e.target.value))} />
                </div>
                <div>
                  <Label>Relação a/c</Label>
                  <Input type="number" step="0.01" value={relacaoAC} onChange={(e) => setRelacaoAC(Number(e.target.value))} />
                </div>
                <div>
                  <Label>Ar Incorporado (%)</Label>
                  <Input type="number" step="0.5" value={teorArIncorporado} onChange={(e) => setTeorArIncorporado(Number(e.target.value))} />
                </div>
                <div>
                  <Label>Água Base (L/m³)</Label>
                  <Input type="number" value={aguaBase} onChange={(e) => setAguaBase(Number(e.target.value))} />
                </div>
              </CardContent>
            </Card>

            {/* Materiais em Tabs */}
            <Tabs defaultValue="cimentos" className="w-full">
              <TabsList className="grid grid-cols-6 h-auto text-xs">
                <TabsTrigger value="cimentos">Cimentos</TabsTrigger>
                <TabsTrigger value="reativos">Reativos</TabsTrigger>
                <TabsTrigger value="inertes">Inertes</TabsTrigger>
                <TabsTrigger value="miudos">Miúdos</TabsTrigger>
                <TabsTrigger value="graudos">Graúdos</TabsTrigger>
                <TabsTrigger value="aditivos">Aditivos</TabsTrigger>
              </TabsList>

              {/* Cimentos */}
              <TabsContent value="cimentos">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-base">Cimentos (até 2)</CardTitle>
                      <CardDescription>Informe a proporção de cada cimento</CardDescription>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => adicionarItem(cimentos, setCimentos, 2, { id: "c", nome: "Novo Cimento", densidade: 3.10, quantidade: 0 })} disabled={cimentos.length >= 2}>
                      <Plus className="w-4 h-4 mr-1" /> Adicionar
                    </Button>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {cimentos.map((c, i) => (
                      <div key={c.id} className="p-3 bg-muted/50 rounded-lg grid grid-cols-4 gap-3 items-end">
                        <div>
                          <Label className="text-xs">Nome</Label>
                          <Input value={c.nome} onChange={(e) => atualizarItem(cimentos, setCimentos, c.id, "nome", e.target.value)} />
                        </div>
                        <div>
                          <Label className="text-xs">Densidade</Label>
                          <Input type="number" step="0.01" value={c.densidade} onChange={(e) => atualizarItem(cimentos, setCimentos, c.id, "densidade", Number(e.target.value))} />
                        </div>
                        <div>
                          <Label className="text-xs">Proporção (%)</Label>
                          <Input type="number" value={c.quantidade} onChange={(e) => atualizarItem(cimentos, setCimentos, c.id, "quantidade", Number(e.target.value))} />
                        </div>
                        {cimentos.length > 1 && (
                          <Button variant="ghost" size="icon" onClick={() => removerItem(cimentos, setCimentos, c.id)}>
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Fillers Reativos */}
              <TabsContent value="reativos">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-base">Fillers Reativos (até 3)</CardTitle>
                      <CardDescription>Sílica, metacaulim - entram como aglomerante (a/a)</CardDescription>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => adicionarItem(fillersReativos, setFillersReativos, 3, { id: "fr", nome: "Nova Adição", densidade: 2.20, quantidade: 0, teorSolidos: 100, teorAgua: 0 })} disabled={fillersReativos.length >= 3}>
                      <Plus className="w-4 h-4 mr-1" /> Adicionar
                    </Button>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {fillersReativos.map((f) => (
                      <div key={f.id} className="p-3 bg-muted/50 rounded-lg space-y-3">
                        <div className="grid grid-cols-4 gap-3 items-end">
                          <div>
                            <Label className="text-xs">Nome</Label>
                            <Input value={f.nome} onChange={(e) => atualizarItem(fillersReativos, setFillersReativos, f.id, "nome", e.target.value)} />
                          </div>
                          <div>
                            <Label className="text-xs">Densidade</Label>
                            <Input type="number" step="0.01" value={f.densidade} onChange={(e) => atualizarItem(fillersReativos, setFillersReativos, f.id, "densidade", Number(e.target.value))} />
                          </div>
                          <div>
                            <Label className="text-xs">Qtd (kg/m³)</Label>
                            <Input type="number" value={f.quantidade} onChange={(e) => atualizarItem(fillersReativos, setFillersReativos, f.id, "quantidade", Number(e.target.value))} />
                          </div>
                          <Button variant="ghost" size="icon" onClick={() => removerItem(fillersReativos, setFillersReativos, f.id)}>
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label className="text-xs">% Sólidos (100 se seco)</Label>
                            <Input type="number" value={f.teorSolidos} onChange={(e) => atualizarItem(fillersReativos, setFillersReativos, f.id, "teorSolidos", Number(e.target.value))} />
                          </div>
                          <div>
                            <Label className="text-xs">% Água (0 se seco)</Label>
                            <Input type="number" value={f.teorAgua} onChange={(e) => atualizarItem(fillersReativos, setFillersReativos, f.id, "teorAgua", Number(e.target.value))} />
                          </div>
                        </div>
                      </div>
                    ))}
                    {fillersReativos.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">Nenhum filler reativo adicionado</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Fillers Inertes */}
              <TabsContent value="inertes">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-base">Fillers Inertes (até 3)</CardTitle>
                      <CardDescription>Fíler calcário, quartzo - entram como pasta</CardDescription>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => adicionarItem(fillersInertes, setFillersInertes, 3, { id: "fi", nome: "Novo Fíler", densidade: 2.70, quantidade: 0 })} disabled={fillersInertes.length >= 3}>
                      <Plus className="w-4 h-4 mr-1" /> Adicionar
                    </Button>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {fillersInertes.map((f) => (
                      <div key={f.id} className="p-3 bg-muted/50 rounded-lg grid grid-cols-4 gap-3 items-end">
                        <div>
                          <Label className="text-xs">Nome</Label>
                          <Input value={f.nome} onChange={(e) => atualizarItem(fillersInertes, setFillersInertes, f.id, "nome", e.target.value)} />
                        </div>
                        <div>
                          <Label className="text-xs">Densidade</Label>
                          <Input type="number" step="0.01" value={f.densidade} onChange={(e) => atualizarItem(fillersInertes, setFillersInertes, f.id, "densidade", Number(e.target.value))} />
                        </div>
                        <div>
                          <Label className="text-xs">Qtd (kg/m³)</Label>
                          <Input type="number" value={f.quantidade} onChange={(e) => atualizarItem(fillersInertes, setFillersInertes, f.id, "quantidade", Number(e.target.value))} />
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => removerItem(fillersInertes, setFillersInertes, f.id)}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                    {fillersInertes.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">Nenhum filler inerte adicionado</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Agregados Miúdos */}
              <TabsContent value="miudos">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-base">Agregados Miúdos (até 4)</CardTitle>
                      <CardDescription>Areias e pó de pedra</CardDescription>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => adicionarItem(agregadosMiudos, setAgregadosMiudos, 4, { id: "am", nome: "Nova Areia", densidade: 2.65, quantidade: 0, umidade: 3, absorcao: 1, moduloFinura: 2.2 })} disabled={agregadosMiudos.length >= 4}>
                      <Plus className="w-4 h-4 mr-1" /> Adicionar
                    </Button>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {agregadosMiudos.map((a) => (
                      <div key={a.id} className="p-3 bg-muted/50 rounded-lg space-y-3">
                        <div className="grid grid-cols-5 gap-3 items-end">
                          <div>
                            <Label className="text-xs">Nome</Label>
                            <Input value={a.nome} onChange={(e) => atualizarItem(agregadosMiudos, setAgregadosMiudos, a.id, "nome", e.target.value)} />
                          </div>
                          <div>
                            <Label className="text-xs">Densidade</Label>
                            <Input type="number" step="0.01" value={a.densidade} onChange={(e) => atualizarItem(agregadosMiudos, setAgregadosMiudos, a.id, "densidade", Number(e.target.value))} />
                          </div>
                          <div>
                            <Label className="text-xs">MF</Label>
                            <Input type="number" step="0.1" value={a.moduloFinura} onChange={(e) => atualizarItem(agregadosMiudos, setAgregadosMiudos, a.id, "moduloFinura", Number(e.target.value))} />
                          </div>
                          <div>
                            <Label className="text-xs">Proporção (%)</Label>
                            <Input type="number" value={a.quantidade} onChange={(e) => atualizarItem(agregadosMiudos, setAgregadosMiudos, a.id, "quantidade", Number(e.target.value))} />
                          </div>
                          <Button variant="ghost" size="icon" onClick={() => removerItem(agregadosMiudos, setAgregadosMiudos, a.id)}>
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label className="text-xs flex items-center gap-1"><Droplets className="w-3 h-3" /> Umidade (%)</Label>
                            <Input type="number" step="0.1" value={a.umidade} onChange={(e) => atualizarItem(agregadosMiudos, setAgregadosMiudos, a.id, "umidade", Number(e.target.value))} />
                          </div>
                          <div>
                            <Label className="text-xs">Absorção (%)</Label>
                            <Input type="number" step="0.1" value={a.absorcao} onChange={(e) => atualizarItem(agregadosMiudos, setAgregadosMiudos, a.id, "absorcao", Number(e.target.value))} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Agregados Graúdos */}
              <TabsContent value="graudos">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-base">Agregados Graúdos (até 3)</CardTitle>
                      <CardDescription>Britas e granilhas</CardDescription>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => adicionarItem(agregadosGraudos, setAgregadosGraudos, 3, { id: "ag", nome: "Nova Brita", densidade: 2.70, quantidade: 0, umidade: 1, absorcao: 1, dmaxCaract: 19 })} disabled={agregadosGraudos.length >= 3}>
                      <Plus className="w-4 h-4 mr-1" /> Adicionar
                    </Button>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {agregadosGraudos.map((a) => (
                      <div key={a.id} className="p-3 bg-muted/50 rounded-lg space-y-3">
                        <div className="grid grid-cols-5 gap-3 items-end">
                          <div>
                            <Label className="text-xs">Nome</Label>
                            <Input value={a.nome} onChange={(e) => atualizarItem(agregadosGraudos, setAgregadosGraudos, a.id, "nome", e.target.value)} />
                          </div>
                          <div>
                            <Label className="text-xs">Densidade</Label>
                            <Input type="number" step="0.01" value={a.densidade} onChange={(e) => atualizarItem(agregadosGraudos, setAgregadosGraudos, a.id, "densidade", Number(e.target.value))} />
                          </div>
                          <div>
                            <Label className="text-xs">DMC (mm)</Label>
                            <Input type="number" step="0.5" value={a.dmaxCaract} onChange={(e) => atualizarItem(agregadosGraudos, setAgregadosGraudos, a.id, "dmaxCaract", Number(e.target.value))} />
                          </div>
                          <div>
                            <Label className="text-xs">Proporção (%)</Label>
                            <Input type="number" value={a.quantidade} onChange={(e) => atualizarItem(agregadosGraudos, setAgregadosGraudos, a.id, "quantidade", Number(e.target.value))} />
                          </div>
                          <Button variant="ghost" size="icon" onClick={() => removerItem(agregadosGraudos, setAgregadosGraudos, a.id)}>
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label className="text-xs flex items-center gap-1"><Droplets className="w-3 h-3" /> Umidade (%)</Label>
                            <Input type="number" step="0.1" value={a.umidade} onChange={(e) => atualizarItem(agregadosGraudos, setAgregadosGraudos, a.id, "umidade", Number(e.target.value))} />
                          </div>
                          <div>
                            <Label className="text-xs">Absorção (%)</Label>
                            <Input type="number" step="0.1" value={a.absorcao} onChange={(e) => atualizarItem(agregadosGraudos, setAgregadosGraudos, a.id, "absorcao", Number(e.target.value))} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Aditivos */}
              <TabsContent value="aditivos">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-base">Aditivos (até 4)</CardTitle>
                      <CardDescription>Plastificantes, VMA, incorporadores</CardDescription>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => adicionarItem(aditivos, setAditivos, 4, { id: "ad", nome: "Novo Aditivo", densidade: 1.10, quantidade: 0, teorAgua: 60 })} disabled={aditivos.length >= 4}>
                      <Plus className="w-4 h-4 mr-1" /> Adicionar
                    </Button>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {aditivos.map((a) => (
                      <div key={a.id} className="p-3 bg-muted/50 rounded-lg grid grid-cols-5 gap-3 items-end">
                        <div>
                          <Label className="text-xs">Nome</Label>
                          <Input value={a.nome} onChange={(e) => atualizarItem(aditivos, setAditivos, a.id, "nome", e.target.value)} />
                        </div>
                        <div>
                          <Label className="text-xs">Densidade</Label>
                          <Input type="number" step="0.01" value={a.densidade} onChange={(e) => atualizarItem(aditivos, setAditivos, a.id, "densidade", Number(e.target.value))} />
                        </div>
                        <div>
                          <Label className="text-xs">% s/cimento</Label>
                          <Input type="number" step="0.1" value={a.quantidade} onChange={(e) => atualizarItem(aditivos, setAditivos, a.id, "quantidade", Number(e.target.value))} />
                        </div>
                        <div>
                          <Label className="text-xs">% Água</Label>
                          <Input type="number" value={a.teorAgua} onChange={(e) => atualizarItem(aditivos, setAditivos, a.id, "teorAgua", Number(e.target.value))} />
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => removerItem(aditivos, setAditivos, a.id)}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                    {aditivos.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">Nenhum aditivo adicionado</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Coluna Lateral - Resumo */}
          <div className="space-y-6">
            <Card className="sticky top-24 bg-gradient-to-br from-orange-500/10 to-amber-500/5 border-orange-500/20">
              <CardHeader>
                <CardTitle className="text-lg">Resumo do Traço</CardTitle>
                <CardDescription>Para 1 m³</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center p-3 bg-card rounded-lg border">
                    <p className="text-xs text-muted-foreground">Cimento</p>
                    <p className="text-xl font-bold">{calculos.consumoCimento.toFixed(0)}</p>
                    <p className="text-xs">kg/m³</p>
                  </div>
                  <div className="text-center p-3 bg-card rounded-lg border">
                    <p className="text-xs text-muted-foreground">a/c</p>
                    <p className="text-xl font-bold">{relacaoAC.toFixed(2)}</p>
                  </div>
                  <div className="text-center p-3 bg-card rounded-lg border">
                    <p className="text-xs text-muted-foreground">Aglomerante</p>
                    <p className="text-xl font-bold">{calculos.aglomeranteTotal.toFixed(0)}</p>
                    <p className="text-xs">kg/m³</p>
                  </div>
                  <div className="text-center p-3 bg-card rounded-lg border">
                    <p className="text-xs text-muted-foreground">a/a</p>
                    <p className="text-xl font-bold text-orange-500">{calculos.relacaoAA.toFixed(2)}</p>
                  </div>
                </div>

                <Separator />

                <div className="space-y-2 text-sm">
                  {calculos.cimentosCalculados.map(c => (
                    <div key={c.id} className="flex justify-between">
                      <span>{c.nome}:</span>
                      <span className="font-mono">{c.massa.toFixed(1)} kg</span>
                    </div>
                  ))}
                  {fillersReativos.map(f => (
                    <div key={f.id} className="flex justify-between text-orange-600">
                      <span>{f.nome}:</span>
                      <span className="font-mono">{f.quantidade.toFixed(1)} kg</span>
                    </div>
                  ))}
                  {fillersInertes.map(f => (
                    <div key={f.id} className="flex justify-between text-muted-foreground">
                      <span>{f.nome}:</span>
                      <span className="font-mono">{f.quantidade.toFixed(1)} kg</span>
                    </div>
                  ))}
                  <div className="flex justify-between">
                    <span>Areia:</span>
                    <span className="font-mono">{calculos.massaMiudos.toFixed(1)} kg</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Brita:</span>
                    <span className="font-mono">{calculos.massaGraudos.toFixed(1)} kg</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-bold">
                    <span>Água (corrigida):</span>
                    <span className="font-mono text-blue-500">{calculos.aguaCorrigida.toFixed(1)} L</span>
                  </div>
                  {(calculos.aguaFillersReativos + calculos.aguaAditivos) > 0 && (
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Água descontada:</span>
                      <span className="font-mono">-{(calculos.aguaFillersReativos + calculos.aguaAditivos).toFixed(1)} L</span>
                    </div>
                  )}
                </div>

                <Separator />

                {/* Cálculo para Massada */}
                <div>
                  <Label>Volume da Massada (L)</Label>
                  <Input
                    type="number"
                    value={volumeMassada}
                    onChange={(e) => setVolumeMassada(Number(e.target.value))}
                    className="mt-1"
                  />
                </div>

                <div className="bg-card p-4 rounded-lg border space-y-2">
                  <p className="text-sm font-bold">Para {volumeMassada} L:</p>
                  <div className="flex justify-between text-sm">
                    <span>Cimento:</span>
                    <span className="font-mono">{(calculos.consumoCimento * calculos.fatorMassada).toFixed(1)} kg</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Adições:</span>
                    <span className="font-mono">{(calculos.massaFillersReativos * calculos.fatorMassada).toFixed(1)} kg</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Areia:</span>
                    <span className="font-mono">{(calculos.massaMiudos * calculos.fatorMassada).toFixed(1)} kg</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Brita:</span>
                    <span className="font-mono">{(calculos.massaGraudos * calculos.fatorMassada).toFixed(1)} kg</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold">
                    <span>Água:</span>
                    <span className="font-mono text-blue-500">{(calculos.aguaCorrigida * calculos.fatorMassada).toFixed(1)} L</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button className="flex-1 bg-orange-500 hover:bg-orange-600" onClick={enviarWhatsApp}>
                    <Send className="w-4 h-4 mr-2" />
                    WhatsApp
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
