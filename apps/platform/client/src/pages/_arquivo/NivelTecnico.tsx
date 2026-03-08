import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { useState, useMemo } from "react";
import { ArrowLeft, Building2, Calculator, Save, Send, Plus, Trash2, Droplets } from "lucide-react";
import { Link } from "wouter";
import { toast } from "sonner";

// Tabela de Slumps
const tabelaSlumps = [
  { faixa: "0 - 20", tipo: "Seco", aplicacao: "Blocos, pavers, tubos" },
  { faixa: "20 - 50", tipo: "Plástico Seco", aplicacao: "Pré-moldados vibrados" },
  { faixa: "50 - 100", tipo: "Plástico", aplicacao: "Estruturas convencionais" },
  { faixa: "100 - 150", tipo: "Fluido", aplicacao: "Bombeamento, lajes" },
  { faixa: "150 - 200", tipo: "Muito Fluido", aplicacao: "Bombeamento longo" },
  { faixa: "200 - 230", tipo: "Super Fluido", aplicacao: "Elementos esbeltos" },
];

// Coeficiente de Student
const tabelaStudent = {
  2: 6.31, 3: 2.92, 4: 2.35, 5: 2.13, 6: 2.02, 7: 1.94, 8: 1.89, 9: 1.86, 10: 1.83,
  12: 1.78, 15: 1.75, 20: 1.72, 30: 1.70, "infinito": 1.65
};

interface Agregado {
  id: string;
  nome: string;
  densidade: number;
  moduloFinura: number;
  dmaxCaract: number;
  umidade: number;
  absorcao: number;
  quantidade: number;
}

interface Adicao {
  id: string;
  nome: string;
  tipo: "aglomerante" | "filler";
  densidade: number;
  quantidade: number;
  teorSolidos?: number;
  teorAgua?: number;
}

export default function NivelTecnico() {
  // Parâmetros do traço
  const [fckAlvo, setFckAlvo] = useState(30);
  const [slumpAlvo, setSlumpAlvo] = useState(100);
  const [teorArgamassa, setTeorArgamassa] = useState(54);
  const [relacaoAC, setRelacaoAC] = useState(0.50);
  const [teorArIncorporado, setTeorArIncorporado] = useState(2);
  const [volumeMassada, setVolumeMassada] = useState(1000);
  
  // Materiais
  const [cimentoNome, setCimentoNome] = useState("CP V ARI");
  const [cimentoDensidade, setCimentoDensidade] = useState(3.10);
  const [cimentoCusto, setCimentoCusto] = useState(0.55);
  
  const [agregadosMiudos, setAgregadosMiudos] = useState<Agregado[]>([
    { id: "am1", nome: "Areia Média", densidade: 2.65, moduloFinura: 2.4, dmaxCaract: 4.8, umidade: 5, absorcao: 1, quantidade: 50 },
    { id: "am2", nome: "Areia Fina", densidade: 2.63, moduloFinura: 1.8, dmaxCaract: 2.4, umidade: 3, absorcao: 0.5, quantidade: 50 },
  ]);
  
  const [agregadosGraudos, setAgregadosGraudos] = useState<Agregado[]>([
    { id: "ag1", nome: "Brita 0", densidade: 2.72, moduloFinura: 5.8, dmaxCaract: 9.5, umidade: 1, absorcao: 1, quantidade: 60 },
    { id: "ag2", nome: "Brita 1", densidade: 2.70, moduloFinura: 6.8, dmaxCaract: 19, umidade: 0.5, absorcao: 1, quantidade: 40 },
  ]);
  
  const [adicoes, setAdicoes] = useState<Adicao[]>([]);
  
  const [aguaBase, setAguaBase] = useState(180);

  // Cálculos
  const calculos = useMemo(() => {
    // Soma das proporções dos agregados miúdos
    const totalMiudos = agregadosMiudos.reduce((acc, a) => acc + a.quantidade, 0);
    const totalGraudos = agregadosGraudos.reduce((acc, a) => acc + a.quantidade, 0);
    
    // Módulo de finura médio dos miúdos
    const mfMedio = totalMiudos > 0 
      ? agregadosMiudos.reduce((acc, a) => acc + (a.moduloFinura * a.quantidade), 0) / totalMiudos
      : 2.4;
    
    // DMC médio dos graúdos
    const dmcMedio = totalGraudos > 0
      ? agregadosGraudos.reduce((acc, a) => acc + (a.dmaxCaract * a.quantidade), 0) / totalGraudos
      : 19;
    
    // Consumo de cimento (método simplificado)
    const consumoCimento = aguaBase / relacaoAC;
    
    // Adições como aglomerante
    const adicoesAglomerante = adicoes.filter(a => a.tipo === "aglomerante");
    const massaAdicoes = adicoesAglomerante.reduce((acc, a) => {
      if (a.teorSolidos) {
        return acc + (a.quantidade * a.teorSolidos / 100);
      }
      return acc + a.quantidade;
    }, 0);
    
    // Água das adições (sílica em suspensão)
    const aguaAdicoes = adicoes.reduce((acc, a) => {
      if (a.teorAgua) {
        return acc + (a.quantidade * a.teorAgua / 100);
      }
      return acc;
    }, 0);
    
    // Aglomerante total
    const aglomeranteTotal = consumoCimento + massaAdicoes;
    
    // Relação a/a (água/aglomerante)
    const aguaEfetiva = aguaBase - aguaAdicoes;
    const relacaoAA = aglomeranteTotal > 0 ? aguaEfetiva / aglomeranteTotal : 0;
    
    // Volume de pasta
    const volumePasta = (consumoCimento / cimentoDensidade) + aguaEfetiva + 
      adicoes.reduce((acc, a) => acc + (a.quantidade / a.densidade), 0);
    
    // Volume de agregados (1000 - pasta - ar)
    const volumeAgregados = 1000 - volumePasta - (1000 * teorArIncorporado / 100);
    
    // Distribuição miúdos/graúdos pelo teor de argamassa
    const volumeMiudos = volumeAgregados * (teorArgamassa / 100);
    const volumeGraudos = volumeAgregados * (1 - teorArgamassa / 100);
    
    // Densidade média dos agregados
    const densidadeMiudos = totalMiudos > 0
      ? agregadosMiudos.reduce((acc, a) => acc + (a.densidade * a.quantidade), 0) / totalMiudos
      : 2.65;
    const densidadeGraudos = totalGraudos > 0
      ? agregadosGraudos.reduce((acc, a) => acc + (a.densidade * a.quantidade), 0) / totalGraudos
      : 2.70;
    
    // Massa de agregados
    const massaMiudos = volumeMiudos * densidadeMiudos;
    const massaGraudos = volumeGraudos * densidadeGraudos;
    
    // Correção de umidade
    const correcaoUmidadeMiudos = agregadosMiudos.reduce((acc, a) => {
      const proporcao = a.quantidade / totalMiudos;
      const massaAgregado = massaMiudos * proporcao;
      return acc + (massaAgregado * (a.umidade - a.absorcao) / 100);
    }, 0);
    
    const correcaoUmidadeGraudos = agregadosGraudos.reduce((acc, a) => {
      const proporcao = a.quantidade / totalGraudos;
      const massaAgregado = massaGraudos * proporcao;
      return acc + (massaAgregado * (a.umidade - a.absorcao) / 100);
    }, 0);
    
    const aguaCorrigida = aguaEfetiva - correcaoUmidadeMiudos - correcaoUmidadeGraudos;
    
    // Massa total
    const massaTotal = consumoCimento + massaAdicoes + massaMiudos + massaGraudos + aguaCorrigida;
    
    // Custo
    const custoTotal = consumoCimento * cimentoCusto;
    
    // Fator de conversão para massada
    const fatorMassada = volumeMassada / 1000;

    return {
      consumoCimento,
      aglomeranteTotal,
      massaAdicoes,
      aguaEfetiva,
      aguaAdicoes,
      aguaCorrigida,
      relacaoAA,
      massaMiudos,
      massaGraudos,
      massaTotal,
      mfMedio,
      dmcMedio,
      custoTotal,
      fatorMassada,
      correcaoUmidadeMiudos,
      correcaoUmidadeGraudos,
    };
  }, [
    cimentoDensidade, cimentoCusto, relacaoAC, aguaBase, teorArgamassa, teorArIncorporado,
    agregadosMiudos, agregadosGraudos, adicoes, volumeMassada
  ]);

  // Funções de manipulação
  const adicionarAgregadoMiudo = () => {
    if (agregadosMiudos.length >= 2) {
      toast.error("Máximo de 2 agregados miúdos");
      return;
    }
    setAgregadosMiudos([...agregadosMiudos, {
      id: `am${Date.now()}`,
      nome: "Nova Areia",
      densidade: 2.65,
      moduloFinura: 2.2,
      dmaxCaract: 4.8,
      umidade: 3,
      absorcao: 1,
      quantidade: 0,
    }]);
  };

  const adicionarAgregadoGraudo = () => {
    if (agregadosGraudos.length >= 2) {
      toast.error("Máximo de 2 agregados graúdos");
      return;
    }
    setAgregadosGraudos([...agregadosGraudos, {
      id: `ag${Date.now()}`,
      nome: "Nova Brita",
      densidade: 2.70,
      moduloFinura: 6.5,
      dmaxCaract: 19,
      umidade: 1,
      absorcao: 1,
      quantidade: 0,
    }]);
  };

  const adicionarAdicao = () => {
    if (adicoes.length >= 3) {
      toast.error("Máximo de 3 adições");
      return;
    }
    setAdicoes([...adicoes, {
      id: `ad${Date.now()}`,
      nome: "Nova Adição",
      tipo: "aglomerante",
      densidade: 2.20,
      quantidade: 0,
    }]);
  };

  const atualizarAgregadoMiudo = (id: string, campo: keyof Agregado, valor: any) => {
    setAgregadosMiudos(agregadosMiudos.map(a => 
      a.id === id ? { ...a, [campo]: valor } : a
    ));
  };

  const atualizarAgregadoGraudo = (id: string, campo: keyof Agregado, valor: any) => {
    setAgregadosGraudos(agregadosGraudos.map(a => 
      a.id === id ? { ...a, [campo]: valor } : a
    ));
  };

  const atualizarAdicao = (id: string, campo: keyof Adicao, valor: any) => {
    setAdicoes(adicoes.map(a => 
      a.id === id ? { ...a, [campo]: valor } : a
    ));
  };

  const enviarWhatsApp = () => {
    const texto = `*TRAÇO TÉCNICO - fck ${fckAlvo} MPa*%0A%0A` +
      `Slump: ${slumpAlvo} mm%0A` +
      `a/c: ${relacaoAC.toFixed(2)}%0A` +
      `Teor Argamassa: ${teorArgamassa}%%0A%0A` +
      `*Para 1 m³:*%0A` +
      `Cimento: ${calculos.consumoCimento.toFixed(1)} kg%0A` +
      `Areia: ${calculos.massaMiudos.toFixed(1)} kg%0A` +
      `Brita: ${calculos.massaGraudos.toFixed(1)} kg%0A` +
      `Água: ${calculos.aguaCorrigida.toFixed(1)} L%0A%0A` +
      `*Para ${volumeMassada} L:*%0A` +
      `Cimento: ${(calculos.consumoCimento * calculos.fatorMassada).toFixed(1)} kg%0A` +
      `Areia: ${(calculos.massaMiudos * calculos.fatorMassada).toFixed(1)} kg%0A` +
      `Brita: ${(calculos.massaGraudos * calculos.fatorMassada).toFixed(1)} kg%0A` +
      `Água: ${(calculos.aguaCorrigida * calculos.fatorMassada).toFixed(1)} L`;

    window.open(`https://wa.me/5511982618300?text=${texto}`, "_blank");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-gradient-to-r from-blue-500/10 to-indigo-500/10 sticky top-0 z-50 backdrop-blur">
        <div className="container py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                <Building2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold uppercase tracking-tight">Nível Técnico</h1>
                <p className="text-xs text-muted-foreground">Engenheiros & Concreteiras</p>
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
            {/* Parâmetros Principais */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="w-5 h-5 text-blue-500" />
                  Parâmetros do Traço
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <Label>fck Alvo (MPa)</Label>
                  <Input
                    type="number"
                    value={fckAlvo}
                    onChange={(e) => setFckAlvo(Number(e.target.value))}
                  />
                </div>
                <div>
                  <Label>Slump (mm)</Label>
                  <Select value={slumpAlvo.toString()} onValueChange={(v) => setSlumpAlvo(Number(v))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[0, 20, 50, 80, 100, 120, 150, 180, 200, 230].map(s => (
                        <SelectItem key={s} value={s.toString()}>{s} mm</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Teor Argamassa (%)</Label>
                  <Input
                    type="number"
                    value={teorArgamassa}
                    onChange={(e) => setTeorArgamassa(Number(e.target.value))}
                  />
                </div>
                <div>
                  <Label>Relação a/c</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={relacaoAC}
                    onChange={(e) => setRelacaoAC(Number(e.target.value))}
                  />
                </div>
                <div>
                  <Label>Ar Incorporado (%)</Label>
                  <Input
                    type="number"
                    step="0.5"
                    value={teorArIncorporado}
                    onChange={(e) => setTeorArIncorporado(Number(e.target.value))}
                  />
                </div>
                <div>
                  <Label>Água Base (L/m³)</Label>
                  <Input
                    type="number"
                    value={aguaBase}
                    onChange={(e) => setAguaBase(Number(e.target.value))}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Tabs de Materiais */}
            <Tabs defaultValue="cimento" className="w-full">
              <TabsList className="grid grid-cols-4 h-auto">
                <TabsTrigger value="cimento">Cimento</TabsTrigger>
                <TabsTrigger value="miudos">Miúdos (2)</TabsTrigger>
                <TabsTrigger value="graudos">Graúdos (2)</TabsTrigger>
                <TabsTrigger value="adicoes">Adições (3)</TabsTrigger>
              </TabsList>

              <TabsContent value="cimento">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Cimento</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-3 gap-4">
                    <div>
                      <Label>Nome</Label>
                      <Input value={cimentoNome} onChange={(e) => setCimentoNome(e.target.value)} />
                    </div>
                    <div>
                      <Label>Densidade (g/cm³)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={cimentoDensidade}
                        onChange={(e) => setCimentoDensidade(Number(e.target.value))}
                      />
                    </div>
                    <div>
                      <Label>Custo (R$/kg)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={cimentoCusto}
                        onChange={(e) => setCimentoCusto(Number(e.target.value))}
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="miudos">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-base">Agregados Miúdos</CardTitle>
                      <CardDescription>Até 2 areias - informe a proporção de cada</CardDescription>
                    </div>
                    <Button variant="outline" size="sm" onClick={adicionarAgregadoMiudo} disabled={agregadosMiudos.length >= 2}>
                      <Plus className="w-4 h-4 mr-1" /> Adicionar
                    </Button>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {agregadosMiudos.map((agregado, index) => (
                      <div key={agregado.id} className="p-4 bg-muted/50 rounded-lg space-y-3">
                        <div className="flex items-center justify-between">
                          <Label className="font-bold">Areia {index + 1}</Label>
                          {agregadosMiudos.length > 1 && (
                            <Button variant="ghost" size="icon" onClick={() => setAgregadosMiudos(agregadosMiudos.filter(a => a.id !== agregado.id))}>
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          )}
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          <div>
                            <Label className="text-xs">Nome</Label>
                            <Input value={agregado.nome} onChange={(e) => atualizarAgregadoMiudo(agregado.id, "nome", e.target.value)} />
                          </div>
                          <div>
                            <Label className="text-xs">Densidade</Label>
                            <Input type="number" step="0.01" value={agregado.densidade} onChange={(e) => atualizarAgregadoMiudo(agregado.id, "densidade", Number(e.target.value))} />
                          </div>
                          <div>
                            <Label className="text-xs">MF</Label>
                            <Input type="number" step="0.1" value={agregado.moduloFinura} onChange={(e) => atualizarAgregadoMiudo(agregado.id, "moduloFinura", Number(e.target.value))} />
                          </div>
                          <div>
                            <Label className="text-xs">Proporção (%)</Label>
                            <Input type="number" value={agregado.quantidade} onChange={(e) => atualizarAgregadoMiudo(agregado.id, "quantidade", Number(e.target.value))} />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label className="text-xs flex items-center gap-1"><Droplets className="w-3 h-3" /> Umidade (%)</Label>
                            <Input type="number" step="0.1" value={agregado.umidade} onChange={(e) => atualizarAgregadoMiudo(agregado.id, "umidade", Number(e.target.value))} />
                          </div>
                          <div>
                            <Label className="text-xs">Absorção (%)</Label>
                            <Input type="number" step="0.1" value={agregado.absorcao} onChange={(e) => atualizarAgregadoMiudo(agregado.id, "absorcao", Number(e.target.value))} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="graudos">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-base">Agregados Graúdos</CardTitle>
                      <CardDescription>Até 2 britas - informe a proporção de cada</CardDescription>
                    </div>
                    <Button variant="outline" size="sm" onClick={adicionarAgregadoGraudo} disabled={agregadosGraudos.length >= 2}>
                      <Plus className="w-4 h-4 mr-1" /> Adicionar
                    </Button>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {agregadosGraudos.map((agregado, index) => (
                      <div key={agregado.id} className="p-4 bg-muted/50 rounded-lg space-y-3">
                        <div className="flex items-center justify-between">
                          <Label className="font-bold">Brita {index + 1}</Label>
                          {agregadosGraudos.length > 1 && (
                            <Button variant="ghost" size="icon" onClick={() => setAgregadosGraudos(agregadosGraudos.filter(a => a.id !== agregado.id))}>
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          )}
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          <div>
                            <Label className="text-xs">Nome</Label>
                            <Input value={agregado.nome} onChange={(e) => atualizarAgregadoGraudo(agregado.id, "nome", e.target.value)} />
                          </div>
                          <div>
                            <Label className="text-xs">Densidade</Label>
                            <Input type="number" step="0.01" value={agregado.densidade} onChange={(e) => atualizarAgregadoGraudo(agregado.id, "densidade", Number(e.target.value))} />
                          </div>
                          <div>
                            <Label className="text-xs">DMC (mm)</Label>
                            <Input type="number" step="0.5" value={agregado.dmaxCaract} onChange={(e) => atualizarAgregadoGraudo(agregado.id, "dmaxCaract", Number(e.target.value))} />
                          </div>
                          <div>
                            <Label className="text-xs">Proporção (%)</Label>
                            <Input type="number" value={agregado.quantidade} onChange={(e) => atualizarAgregadoGraudo(agregado.id, "quantidade", Number(e.target.value))} />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label className="text-xs flex items-center gap-1"><Droplets className="w-3 h-3" /> Umidade (%)</Label>
                            <Input type="number" step="0.1" value={agregado.umidade} onChange={(e) => atualizarAgregadoGraudo(agregado.id, "umidade", Number(e.target.value))} />
                          </div>
                          <div>
                            <Label className="text-xs">Absorção (%)</Label>
                            <Input type="number" step="0.1" value={agregado.absorcao} onChange={(e) => atualizarAgregadoGraudo(agregado.id, "absorcao", Number(e.target.value))} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="adicoes">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-base">Adições Minerais</CardTitle>
                      <CardDescription>Sílica, metacaulim, fíler (até 3)</CardDescription>
                    </div>
                    <Button variant="outline" size="sm" onClick={adicionarAdicao} disabled={adicoes.length >= 3}>
                      <Plus className="w-4 h-4 mr-1" /> Adicionar
                    </Button>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {adicoes.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Nenhuma adição. Clique em "Adicionar" para incluir sílica, metacaulim ou fíler.
                      </p>
                    )}
                    {adicoes.map((adicao, index) => (
                      <div key={adicao.id} className="p-4 bg-muted/50 rounded-lg space-y-3">
                        <div className="flex items-center justify-between">
                          <Label className="font-bold">Adição {index + 1}</Label>
                          <Button variant="ghost" size="icon" onClick={() => setAdicoes(adicoes.filter(a => a.id !== adicao.id))}>
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          <div>
                            <Label className="text-xs">Nome</Label>
                            <Input value={adicao.nome} onChange={(e) => atualizarAdicao(adicao.id, "nome", e.target.value)} />
                          </div>
                          <div>
                            <Label className="text-xs">Tipo</Label>
                            <Select value={adicao.tipo} onValueChange={(v) => atualizarAdicao(adicao.id, "tipo", v)}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="aglomerante">Aglomerante (a/a)</SelectItem>
                                <SelectItem value="filler">Filler Inerte</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label className="text-xs">Densidade</Label>
                            <Input type="number" step="0.01" value={adicao.densidade} onChange={(e) => atualizarAdicao(adicao.id, "densidade", Number(e.target.value))} />
                          </div>
                          <div>
                            <Label className="text-xs">Qtd (kg/m³)</Label>
                            <Input type="number" value={adicao.quantidade} onChange={(e) => atualizarAdicao(adicao.id, "quantidade", Number(e.target.value))} />
                          </div>
                        </div>
                        {adicao.tipo === "aglomerante" && (
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <Label className="text-xs">% Sólidos (suspensão)</Label>
                              <Input type="number" step="1" value={adicao.teorSolidos || ""} onChange={(e) => atualizarAdicao(adicao.id, "teorSolidos", Number(e.target.value))} placeholder="100 se seco" />
                            </div>
                            <div>
                              <Label className="text-xs">% Água (suspensão)</Label>
                              <Input type="number" step="1" value={adicao.teorAgua || ""} onChange={(e) => atualizarAdicao(adicao.id, "teorAgua", Number(e.target.value))} placeholder="0 se seco" />
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            {/* Tabela de Slumps */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Tabela de Slumps</CardTitle>
              </CardHeader>
              <CardContent>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2">Faixa (mm)</th>
                      <th className="text-left py-2">Tipo</th>
                      <th className="text-left py-2">Aplicação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tabelaSlumps.map((s) => (
                      <tr key={s.faixa} className={`border-b ${slumpAlvo >= parseInt(s.faixa.split(" - ")[0]) && slumpAlvo <= parseInt(s.faixa.split(" - ")[1]) ? "bg-primary/10" : ""}`}>
                        <td className="py-2 font-mono">{s.faixa}</td>
                        <td className="py-2">{s.tipo}</td>
                        <td className="py-2 text-muted-foreground">{s.aplicacao}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </div>

          {/* Coluna Lateral - Resumo */}
          <div className="space-y-6">
            <Card className="sticky top-24 bg-gradient-to-br from-blue-500/10 to-indigo-500/5 border-blue-500/20">
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
                  {calculos.massaAdicoes > 0 && (
                    <>
                      <div className="text-center p-3 bg-card rounded-lg border">
                        <p className="text-xs text-muted-foreground">Aglomerante</p>
                        <p className="text-xl font-bold">{calculos.aglomeranteTotal.toFixed(0)}</p>
                        <p className="text-xs">kg/m³</p>
                      </div>
                      <div className="text-center p-3 bg-card rounded-lg border">
                        <p className="text-xs text-muted-foreground">a/a</p>
                        <p className="text-xl font-bold">{calculos.relacaoAA.toFixed(2)}</p>
                      </div>
                    </>
                  )}
                </div>

                <Separator />

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>{cimentoNome}:</span>
                    <span className="font-mono">{calculos.consumoCimento.toFixed(1)} kg</span>
                  </div>
                  {adicoes.map(a => (
                    <div key={a.id} className="flex justify-between">
                      <span>{a.nome}:</span>
                      <span className="font-mono">{a.quantidade.toFixed(1)} kg</span>
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
                  {calculos.aguaAdicoes > 0 && (
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Água das adições:</span>
                      <span className="font-mono">-{calculos.aguaAdicoes.toFixed(1)} L</span>
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
                  <Button className="flex-1 bg-blue-500 hover:bg-blue-600" onClick={enviarWhatsApp}>
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
