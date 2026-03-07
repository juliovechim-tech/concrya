import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { trpc } from "@/lib/trpc";
import { getLoginUrl } from "@/const";
import { useState, useEffect, useMemo } from "react";
import { ArrowLeft, Plus, Trash2, Save, Calculator, FileDown, Send, Loader2 } from "lucide-react";
import { Link } from "wouter";
import { toast } from "sonner";

// Tipos de materiais para o formulário
interface MaterialSelecionado {
  id: string;
  materialId?: number;
  nome: string;
  tipo: string;
  densidade: number;
  custo: number;
  quantidade: number;
  teorSolidos?: number;
  teorAgua?: number;
}

interface ComposicaoTraco {
  cimentos: MaterialSelecionado[];
  fillersReativos: MaterialSelecionado[];
  fillersInertes: MaterialSelecionado[];
  agregadosMiudos: MaterialSelecionado[];
  britas: MaterialSelecionado[];
  aditivos: MaterialSelecionado[];
  fibras: MaterialSelecionado[];
  agua: { quantidade: number; correcao: number };
}

const tiposConcreto = [
  { value: "convencional", label: "Convencional" },
  { value: "caa", label: "CAA - Concreto Auto-Adensável" },
  { value: "hpc", label: "HPC - High Performance" },
  { value: "uhpc", label: "UHPC - Ultra High Performance" },
  { value: "grc", label: "GRC - Glass Reinforced Concrete" },
  { value: "colorido", label: "Colorido / Pigmentado" },
  { value: "leve", label: "Concreto Leve" },
  { value: "bloco", label: "Bloco de Concreto" },
  { value: "paver", label: "Paver / Piso Intertravado" },
  { value: "arquitetonico", label: "Arquitetônico" },
];

export default function DosagemAvancada() {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const { data: materiaisDB, isLoading: loadingMateriais } = trpc.materiais.list.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  
  const salvarTracoMutation = trpc.tracos.create.useMutation({
    onSuccess: () => {
      toast.success("Traço salvo com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao salvar traço: " + error.message);
    },
  });

  // Estado do formulário
  const [nomeTraco, setNomeTraco] = useState("");
  const [tipoConcreto, setTipoConcreto] = useState("convencional");
  const [fckAlvo, setFckAlvo] = useState(30);
  const [slumpAlvo, setSlumpAlvo] = useState(100);
  const [flowAlvo, setFlowAlvo] = useState(650);
  const [teorArgamassa, setTeorArgamassa] = useState(54);
  const [relacaoAC, setRelacaoAC] = useState(0.45);
  const [teorArIncorporado, setTeorArIncorporado] = useState(2);
  const [volumeMassada, setVolumeMassada] = useState(1000); // litros
  
  // Composição do traço
  const [composicao, setComposicao] = useState<ComposicaoTraco>({
    cimentos: [{ id: "c1", nome: "Cimento CP V ARI", tipo: "cimento", densidade: 3.1, custo: 0.55, quantidade: 400 }],
    fillersReativos: [],
    fillersInertes: [],
    agregadosMiudos: [{ id: "am1", nome: "Areia Média", tipo: "areia", densidade: 2.65, custo: 0.08, quantidade: 800 }],
    britas: [{ id: "b1", nome: "Brita 0", tipo: "brita", densidade: 2.72, custo: 0.06, quantidade: 950 }],
    aditivos: [],
    fibras: [],
    agua: { quantidade: 180, correcao: 0 },
  });

  // Cálculos automáticos
  const calculos = useMemo(() => {
    // Soma de todos os materiais sólidos
    let massaTotal = 0;
    let volumeTotal = 0;
    let custoTotal = 0;
    let aguaAditivos = 0;

    // Cimentos
    composicao.cimentos.forEach(m => {
      massaTotal += m.quantidade;
      volumeTotal += m.quantidade / m.densidade;
      custoTotal += m.quantidade * m.custo;
    });

    // Fillers Reativos (com desconto de água para sílica em suspensão)
    composicao.fillersReativos.forEach(m => {
      if (m.teorSolidos && m.teorAgua) {
        // Sílica em suspensão: calcular parte sólida e água
        const massaSolidos = m.quantidade * (m.teorSolidos / 100);
        const massaAgua = m.quantidade * (m.teorAgua / 100);
        massaTotal += massaSolidos;
        volumeTotal += massaSolidos / m.densidade;
        aguaAditivos += massaAgua;
      } else {
        massaTotal += m.quantidade;
        volumeTotal += m.quantidade / m.densidade;
      }
      custoTotal += m.quantidade * m.custo;
    });

    // Fillers Inertes
    composicao.fillersInertes.forEach(m => {
      massaTotal += m.quantidade;
      volumeTotal += m.quantidade / m.densidade;
      custoTotal += m.quantidade * m.custo;
    });

    // Agregados Miúdos
    composicao.agregadosMiudos.forEach(m => {
      massaTotal += m.quantidade;
      volumeTotal += m.quantidade / m.densidade;
      custoTotal += m.quantidade * m.custo;
    });

    // Britas
    composicao.britas.forEach(m => {
      massaTotal += m.quantidade;
      volumeTotal += m.quantidade / m.densidade;
      custoTotal += m.quantidade * m.custo;
    });

    // Aditivos (com teor de água)
    composicao.aditivos.forEach(m => {
      if (m.teorAgua) {
        aguaAditivos += m.quantidade * (m.teorAgua / 100);
      }
      massaTotal += m.quantidade;
      custoTotal += m.quantidade * m.custo;
    });

    // Fibras
    composicao.fibras.forEach(m => {
      massaTotal += m.quantidade;
      volumeTotal += m.quantidade / m.densidade;
      custoTotal += m.quantidade * m.custo;
    });

    // Água (descontando água dos aditivos e sílica)
    const aguaEfetiva = Math.max(0, composicao.agua.quantidade - aguaAditivos + composicao.agua.correcao);
    massaTotal += aguaEfetiva;
    volumeTotal += aguaEfetiva; // 1 kg = 1 litro
    custoTotal += aguaEfetiva * 0.005; // custo simbólico da água

    // Ar incorporado
    const volumeAr = volumeTotal * (teorArIncorporado / 100);
    volumeTotal += volumeAr;

    // Consumo de cimento
    const consumoCimento = composicao.cimentos.reduce((acc, c) => acc + c.quantidade, 0);

    // Relação a/c efetiva
    const acEfetivo = consumoCimento > 0 ? aguaEfetiva / consumoCimento : 0;

    // Massa específica
    const massaEspecifica = volumeTotal > 0 ? (massaTotal / volumeTotal) * 1000 : 0;

    // Fator de conversão para massada
    const fatorMassada = volumeMassada / 1000;

    return {
      massaTotal,
      volumeTotal,
      custoTotal,
      aguaEfetiva,
      aguaAditivos,
      consumoCimento,
      acEfetivo,
      massaEspecifica,
      fatorMassada,
      custoM3: custoTotal,
    };
  }, [composicao, teorArIncorporado, volumeMassada]);

  // Funções para adicionar/remover materiais
  const adicionarMaterial = (categoria: keyof ComposicaoTraco, limite: number) => {
    if (categoria === "agua") return;
    
    const lista = composicao[categoria] as MaterialSelecionado[];
    if (lista.length >= limite) {
      toast.error(`Máximo de ${limite} ${categoria} permitido`);
      return;
    }

    const novoMaterial: MaterialSelecionado = {
      id: `${categoria}_${Date.now()}`,
      nome: "",
      tipo: categoria,
      densidade: 2.5,
      custo: 0,
      quantidade: 0,
    };

    setComposicao(prev => ({
      ...prev,
      [categoria]: [...(prev[categoria] as MaterialSelecionado[]), novoMaterial],
    }));
  };

  const removerMaterial = (categoria: keyof ComposicaoTraco, id: string) => {
    if (categoria === "agua") return;
    
    setComposicao(prev => ({
      ...prev,
      [categoria]: (prev[categoria] as MaterialSelecionado[]).filter(m => m.id !== id),
    }));
  };

  const atualizarMaterial = (categoria: keyof ComposicaoTraco, id: string, campo: string, valor: any) => {
    if (categoria === "agua") {
      setComposicao(prev => ({
        ...prev,
        agua: { ...prev.agua, [campo]: valor },
      }));
      return;
    }

    setComposicao(prev => ({
      ...prev,
      [categoria]: (prev[categoria] as MaterialSelecionado[]).map(m =>
        m.id === id ? { ...m, [campo]: valor } : m
      ),
    }));
  };

  const selecionarMaterialDB = (categoria: keyof ComposicaoTraco, id: string, materialId: number) => {
    const material = materiaisDB?.find(m => m.id === materialId);
    if (!material) return;

    setComposicao(prev => ({
      ...prev,
      [categoria]: (prev[categoria] as MaterialSelecionado[]).map(m =>
        m.id === id ? {
          ...m,
          materialId: material.id,
          nome: material.nome,
          densidade: parseFloat(material.densidade),
          custo: material.custoUnitario ? parseFloat(material.custoUnitario) : 0,
          teorSolidos: material.teorSolidos ? parseFloat(material.teorSolidos) : undefined,
          teorAgua: material.teorAgua ? parseFloat(material.teorAgua) : undefined,
        } : m
      ),
    }));
  };

  // Salvar traço
  const salvarTraco = () => {
    if (!nomeTraco.trim()) {
      toast.error("Informe o nome do traço");
      return;
    }

    salvarTracoMutation.mutate({
      nome: nomeTraco,
      tipoConcreto: tipoConcreto as any,
      fckAlvo,
      slumpAlvo: tipoConcreto === "caa" ? undefined : slumpAlvo,
      flowAlvo: tipoConcreto === "caa" ? flowAlvo : undefined,
      teorArgamassa: teorArgamassa.toString(),
      relacaoAC: calculos.acEfetivo.toFixed(3),
      teorArIncorporado: teorArIncorporado.toString(),
      composicao,
      consumoCimento: calculos.consumoCimento.toFixed(2),
      custoM3: calculos.custoM3.toFixed(2),
      massaEspecifica: calculos.massaEspecifica.toFixed(0),
    });
  };

  // Enviar para WhatsApp
  const enviarWhatsApp = () => {
    const texto = `*FICHA DE DOSAGEM - ${nomeTraco || "Novo Traço"}*%0A%0A` +
      `Tipo: ${tiposConcreto.find(t => t.value === tipoConcreto)?.label}%0A` +
      `fck: ${fckAlvo} MPa%0A` +
      `a/c: ${calculos.acEfetivo.toFixed(3)}%0A` +
      `Consumo Cimento: ${calculos.consumoCimento.toFixed(0)} kg/m³%0A` +
      `Custo: R$ ${calculos.custoM3.toFixed(2)}/m³%0A%0A` +
      `*Para ${volumeMassada} litros:*%0A` +
      composicao.cimentos.map(c => `${c.nome}: ${(c.quantidade * calculos.fatorMassada).toFixed(2)} kg`).join("%0A") + "%0A" +
      composicao.agregadosMiudos.map(a => `${a.nome}: ${(a.quantidade * calculos.fatorMassada).toFixed(2)} kg`).join("%0A") + "%0A" +
      composicao.britas.map(b => `${b.nome}: ${(b.quantidade * calculos.fatorMassada).toFixed(2)} kg`).join("%0A") + "%0A" +
      `Água: ${(calculos.aguaEfetiva * calculos.fatorMassada).toFixed(2)} litros`;

    window.open(`https://wa.me/5511982618300?text=${texto}`, "_blank");
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Acesso Restrito</CardTitle>
            <CardDescription>
              Faça login para acessar a Dosagem Avançada e salvar seus traços na nuvem.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Button asChild className="w-full">
              <a href={getLoginUrl()}>Fazer Login</a>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/">Voltar ao Início</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-50">
        <div className="container py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-bold uppercase tracking-tight">Dosagem Avançada</h1>
              <p className="text-xs text-muted-foreground font-mono">UHPC • HPC • CAA • GRC • COLORIDO</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={enviarWhatsApp}>
              <Send className="w-4 h-4 mr-2" />
              WhatsApp
            </Button>
            <Button size="sm" onClick={salvarTraco} disabled={salvarTracoMutation.isPending}>
              {salvarTracoMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Salvar
            </Button>
          </div>
        </div>
      </header>

      <main className="container py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Coluna Principal - Formulário */}
          <div className="lg:col-span-2 space-y-6">
            {/* Informações Básicas */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Informações do Traço</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <Label>Nome do Traço</Label>
                  <Input
                    value={nomeTraco}
                    onChange={(e) => setNomeTraco(e.target.value)}
                    placeholder="Ex: UHPC 120 MPa - Projeto X"
                  />
                </div>
                <div>
                  <Label>Tipo de Concreto</Label>
                  <Select value={tipoConcreto} onValueChange={setTipoConcreto}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {tiposConcreto.map(t => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>fck Alvo (MPa)</Label>
                  <Input
                    type="number"
                    value={fckAlvo}
                    onChange={(e) => setFckAlvo(Number(e.target.value))}
                  />
                </div>
                {tipoConcreto === "caa" ? (
                  <div>
                    <Label>Flow Alvo (mm)</Label>
                    <Input
                      type="number"
                      value={flowAlvo}
                      onChange={(e) => setFlowAlvo(Number(e.target.value))}
                    />
                  </div>
                ) : (
                  <div>
                    <Label>Slump Alvo (mm)</Label>
                    <Input
                      type="number"
                      value={slumpAlvo}
                      onChange={(e) => setSlumpAlvo(Number(e.target.value))}
                    />
                  </div>
                )}
                <div>
                  <Label>Teor de Argamassa (%)</Label>
                  <Input
                    type="number"
                    value={teorArgamassa}
                    onChange={(e) => setTeorArgamassa(Number(e.target.value))}
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
              </CardContent>
            </Card>

            {/* Tabs de Materiais */}
            <Tabs defaultValue="cimentos" className="w-full">
              <TabsList className="grid grid-cols-4 lg:grid-cols-7 h-auto">
                <TabsTrigger value="cimentos" className="text-xs">Cimentos</TabsTrigger>
                <TabsTrigger value="fillers" className="text-xs">Fillers</TabsTrigger>
                <TabsTrigger value="miudos" className="text-xs">Miúdos</TabsTrigger>
                <TabsTrigger value="britas" className="text-xs">Britas</TabsTrigger>
                <TabsTrigger value="aditivos" className="text-xs">Aditivos</TabsTrigger>
                <TabsTrigger value="fibras" className="text-xs">Fibras</TabsTrigger>
                <TabsTrigger value="agua" className="text-xs">Água</TabsTrigger>
              </TabsList>

              {/* Cimentos (até 2) */}
              <TabsContent value="cimentos">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-base">Cimentos</CardTitle>
                      <CardDescription>Até 2 tipos de cimento</CardDescription>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => adicionarMaterial("cimentos", 2)}
                      disabled={composicao.cimentos.length >= 2}
                    >
                      <Plus className="w-4 h-4 mr-1" /> Adicionar
                    </Button>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {composicao.cimentos.map((material, index) => (
                      <div key={material.id} className="grid grid-cols-12 gap-2 items-end p-4 bg-muted/50 rounded-lg">
                        <div className="col-span-12 md:col-span-3">
                          <Label className="text-xs">Nome</Label>
                          <Input
                            value={material.nome}
                            onChange={(e) => atualizarMaterial("cimentos", material.id, "nome", e.target.value)}
                            placeholder="CP V ARI"
                          />
                        </div>
                        <div className="col-span-4 md:col-span-2">
                          <Label className="text-xs">Densidade</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={material.densidade}
                            onChange={(e) => atualizarMaterial("cimentos", material.id, "densidade", Number(e.target.value))}
                          />
                        </div>
                        <div className="col-span-4 md:col-span-2">
                          <Label className="text-xs">Custo (R$/kg)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={material.custo}
                            onChange={(e) => atualizarMaterial("cimentos", material.id, "custo", Number(e.target.value))}
                          />
                        </div>
                        <div className="col-span-4 md:col-span-3">
                          <Label className="text-xs">Quantidade (kg/m³)</Label>
                          <Input
                            type="number"
                            value={material.quantidade}
                            onChange={(e) => atualizarMaterial("cimentos", material.id, "quantidade", Number(e.target.value))}
                          />
                        </div>
                        <div className="col-span-12 md:col-span-2 flex justify-end">
                          {index > 0 && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removerMaterial("cimentos", material.id)}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Fillers (Reativos até 3, Inertes até 3) */}
              <TabsContent value="fillers">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Fillers Reativos</CardTitle>
                    <CardDescription>Micro sílica, sílica em suspensão, metacaulim (até 3)</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => adicionarMaterial("fillersReativos", 3)}
                      disabled={composicao.fillersReativos.length >= 3}
                    >
                      <Plus className="w-4 h-4 mr-1" /> Adicionar Filler Reativo
                    </Button>
                    {composicao.fillersReativos.map((material) => (
                      <div key={material.id} className="grid grid-cols-12 gap-2 items-end p-4 bg-muted/50 rounded-lg">
                        <div className="col-span-12 md:col-span-2">
                          <Label className="text-xs">Nome</Label>
                          <Input
                            value={material.nome}
                            onChange={(e) => atualizarMaterial("fillersReativos", material.id, "nome", e.target.value)}
                            placeholder="Micro Sílica"
                          />
                        </div>
                        <div className="col-span-3 md:col-span-1">
                          <Label className="text-xs">Dens.</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={material.densidade}
                            onChange={(e) => atualizarMaterial("fillersReativos", material.id, "densidade", Number(e.target.value))}
                          />
                        </div>
                        <div className="col-span-3 md:col-span-2">
                          <Label className="text-xs">Custo (R$/kg)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={material.custo}
                            onChange={(e) => atualizarMaterial("fillersReativos", material.id, "custo", Number(e.target.value))}
                          />
                        </div>
                        <div className="col-span-3 md:col-span-2">
                          <Label className="text-xs">Qtd (kg/m³)</Label>
                          <Input
                            type="number"
                            value={material.quantidade}
                            onChange={(e) => atualizarMaterial("fillersReativos", material.id, "quantidade", Number(e.target.value))}
                          />
                        </div>
                        <div className="col-span-3 md:col-span-2">
                          <Label className="text-xs">% Sólidos</Label>
                          <Input
                            type="number"
                            step="0.1"
                            value={material.teorSolidos || ""}
                            onChange={(e) => atualizarMaterial("fillersReativos", material.id, "teorSolidos", Number(e.target.value))}
                            placeholder="50"
                          />
                        </div>
                        <div className="col-span-3 md:col-span-2">
                          <Label className="text-xs">% Água</Label>
                          <Input
                            type="number"
                            step="0.1"
                            value={material.teorAgua || ""}
                            onChange={(e) => atualizarMaterial("fillersReativos", material.id, "teorAgua", Number(e.target.value))}
                            placeholder="50"
                          />
                        </div>
                        <div className="col-span-12 md:col-span-1 flex justify-end">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removerMaterial("fillersReativos", material.id)}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card className="mt-4">
                  <CardHeader>
                    <CardTitle className="text-base">Fillers Inertes</CardTitle>
                    <CardDescription>Fíler calcário, pó de quartzo (até 3)</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => adicionarMaterial("fillersInertes", 3)}
                      disabled={composicao.fillersInertes.length >= 3}
                    >
                      <Plus className="w-4 h-4 mr-1" /> Adicionar Filler Inerte
                    </Button>
                    {composicao.fillersInertes.map((material) => (
                      <div key={material.id} className="grid grid-cols-12 gap-2 items-end p-4 bg-muted/50 rounded-lg">
                        <div className="col-span-12 md:col-span-3">
                          <Label className="text-xs">Nome</Label>
                          <Input
                            value={material.nome}
                            onChange={(e) => atualizarMaterial("fillersInertes", material.id, "nome", e.target.value)}
                            placeholder="Fíler Calcário"
                          />
                        </div>
                        <div className="col-span-4 md:col-span-2">
                          <Label className="text-xs">Densidade</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={material.densidade}
                            onChange={(e) => atualizarMaterial("fillersInertes", material.id, "densidade", Number(e.target.value))}
                          />
                        </div>
                        <div className="col-span-4 md:col-span-2">
                          <Label className="text-xs">Custo (R$/kg)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={material.custo}
                            onChange={(e) => atualizarMaterial("fillersInertes", material.id, "custo", Number(e.target.value))}
                          />
                        </div>
                        <div className="col-span-4 md:col-span-3">
                          <Label className="text-xs">Quantidade (kg/m³)</Label>
                          <Input
                            type="number"
                            value={material.quantidade}
                            onChange={(e) => atualizarMaterial("fillersInertes", material.id, "quantidade", Number(e.target.value))}
                          />
                        </div>
                        <div className="col-span-12 md:col-span-2 flex justify-end">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removerMaterial("fillersInertes", material.id)}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Agregados Miúdos (até 4 para UHPC) */}
              <TabsContent value="miudos">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-base">Agregados Miúdos</CardTitle>
                      <CardDescription>Areias e agregados &lt; 4,8mm (até 4)</CardDescription>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => adicionarMaterial("agregadosMiudos", 4)}
                      disabled={composicao.agregadosMiudos.length >= 4}
                    >
                      <Plus className="w-4 h-4 mr-1" /> Adicionar
                    </Button>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {composicao.agregadosMiudos.map((material, index) => (
                      <div key={material.id} className="grid grid-cols-12 gap-2 items-end p-4 bg-muted/50 rounded-lg">
                        <div className="col-span-12 md:col-span-3">
                          <Label className="text-xs">Nome</Label>
                          <Input
                            value={material.nome}
                            onChange={(e) => atualizarMaterial("agregadosMiudos", material.id, "nome", e.target.value)}
                            placeholder="Areia Média"
                          />
                        </div>
                        <div className="col-span-4 md:col-span-2">
                          <Label className="text-xs">Densidade</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={material.densidade}
                            onChange={(e) => atualizarMaterial("agregadosMiudos", material.id, "densidade", Number(e.target.value))}
                          />
                        </div>
                        <div className="col-span-4 md:col-span-2">
                          <Label className="text-xs">Custo (R$/kg)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={material.custo}
                            onChange={(e) => atualizarMaterial("agregadosMiudos", material.id, "custo", Number(e.target.value))}
                          />
                        </div>
                        <div className="col-span-4 md:col-span-3">
                          <Label className="text-xs">Quantidade (kg/m³)</Label>
                          <Input
                            type="number"
                            value={material.quantidade}
                            onChange={(e) => atualizarMaterial("agregadosMiudos", material.id, "quantidade", Number(e.target.value))}
                          />
                        </div>
                        <div className="col-span-12 md:col-span-2 flex justify-end">
                          {index > 0 && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removerMaterial("agregadosMiudos", material.id)}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Britas (até 3) */}
              <TabsContent value="britas">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-base">Agregados Graúdos</CardTitle>
                      <CardDescription>Britas e granilhas (até 3)</CardDescription>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => adicionarMaterial("britas", 3)}
                      disabled={composicao.britas.length >= 3}
                    >
                      <Plus className="w-4 h-4 mr-1" /> Adicionar
                    </Button>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {composicao.britas.map((material, index) => (
                      <div key={material.id} className="grid grid-cols-12 gap-2 items-end p-4 bg-muted/50 rounded-lg">
                        <div className="col-span-12 md:col-span-3">
                          <Label className="text-xs">Nome</Label>
                          <Input
                            value={material.nome}
                            onChange={(e) => atualizarMaterial("britas", material.id, "nome", e.target.value)}
                            placeholder="Brita 0"
                          />
                        </div>
                        <div className="col-span-4 md:col-span-2">
                          <Label className="text-xs">Densidade</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={material.densidade}
                            onChange={(e) => atualizarMaterial("britas", material.id, "densidade", Number(e.target.value))}
                          />
                        </div>
                        <div className="col-span-4 md:col-span-2">
                          <Label className="text-xs">Custo (R$/kg)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={material.custo}
                            onChange={(e) => atualizarMaterial("britas", material.id, "custo", Number(e.target.value))}
                          />
                        </div>
                        <div className="col-span-4 md:col-span-3">
                          <Label className="text-xs">Quantidade (kg/m³)</Label>
                          <Input
                            type="number"
                            value={material.quantidade}
                            onChange={(e) => atualizarMaterial("britas", material.id, "quantidade", Number(e.target.value))}
                          />
                        </div>
                        <div className="col-span-12 md:col-span-2 flex justify-end">
                          {index > 0 && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removerMaterial("britas", material.id)}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Aditivos (até 4) */}
              <TabsContent value="aditivos">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-base">Aditivos</CardTitle>
                      <CardDescription>Superplastificantes, retardadores, etc. (até 4)</CardDescription>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => adicionarMaterial("aditivos", 4)}
                      disabled={composicao.aditivos.length >= 4}
                    >
                      <Plus className="w-4 h-4 mr-1" /> Adicionar
                    </Button>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {composicao.aditivos.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Nenhum aditivo adicionado. Clique em "Adicionar" para incluir.
                      </p>
                    )}
                    {composicao.aditivos.map((material) => (
                      <div key={material.id} className="grid grid-cols-12 gap-2 items-end p-4 bg-muted/50 rounded-lg">
                        <div className="col-span-12 md:col-span-3">
                          <Label className="text-xs">Nome</Label>
                          <Input
                            value={material.nome}
                            onChange={(e) => atualizarMaterial("aditivos", material.id, "nome", e.target.value)}
                            placeholder="Superplastificante"
                          />
                        </div>
                        <div className="col-span-4 md:col-span-2">
                          <Label className="text-xs">Custo (R$/kg)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={material.custo}
                            onChange={(e) => atualizarMaterial("aditivos", material.id, "custo", Number(e.target.value))}
                          />
                        </div>
                        <div className="col-span-4 md:col-span-2">
                          <Label className="text-xs">Qtd (kg/m³)</Label>
                          <Input
                            type="number"
                            step="0.1"
                            value={material.quantidade}
                            onChange={(e) => atualizarMaterial("aditivos", material.id, "quantidade", Number(e.target.value))}
                          />
                        </div>
                        <div className="col-span-4 md:col-span-2">
                          <Label className="text-xs">% Água</Label>
                          <Input
                            type="number"
                            step="1"
                            value={material.teorAgua || ""}
                            onChange={(e) => atualizarMaterial("aditivos", material.id, "teorAgua", Number(e.target.value))}
                            placeholder="60"
                          />
                        </div>
                        <div className="col-span-12 md:col-span-3 flex justify-end">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removerMaterial("aditivos", material.id)}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Fibras (até 2) */}
              <TabsContent value="fibras">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-base">Fibras</CardTitle>
                      <CardDescription>Aço, vidro, PVA, polipropileno (até 2)</CardDescription>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => adicionarMaterial("fibras", 2)}
                      disabled={composicao.fibras.length >= 2}
                    >
                      <Plus className="w-4 h-4 mr-1" /> Adicionar
                    </Button>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {composicao.fibras.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Nenhuma fibra adicionada. Clique em "Adicionar" para incluir.
                      </p>
                    )}
                    {composicao.fibras.map((material) => (
                      <div key={material.id} className="grid grid-cols-12 gap-2 items-end p-4 bg-muted/50 rounded-lg">
                        <div className="col-span-12 md:col-span-3">
                          <Label className="text-xs">Nome</Label>
                          <Input
                            value={material.nome}
                            onChange={(e) => atualizarMaterial("fibras", material.id, "nome", e.target.value)}
                            placeholder="Fibra de Vidro AR"
                          />
                        </div>
                        <div className="col-span-4 md:col-span-2">
                          <Label className="text-xs">Densidade</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={material.densidade}
                            onChange={(e) => atualizarMaterial("fibras", material.id, "densidade", Number(e.target.value))}
                          />
                        </div>
                        <div className="col-span-4 md:col-span-2">
                          <Label className="text-xs">Custo (R$/kg)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={material.custo}
                            onChange={(e) => atualizarMaterial("fibras", material.id, "custo", Number(e.target.value))}
                          />
                        </div>
                        <div className="col-span-4 md:col-span-3">
                          <Label className="text-xs">Quantidade (kg/m³)</Label>
                          <Input
                            type="number"
                            step="0.1"
                            value={material.quantidade}
                            onChange={(e) => atualizarMaterial("fibras", material.id, "quantidade", Number(e.target.value))}
                          />
                        </div>
                        <div className="col-span-12 md:col-span-2 flex justify-end">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removerMaterial("fibras", material.id)}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Água */}
              <TabsContent value="agua">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Água</CardTitle>
                    <CardDescription>Quantidade de água e correções</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label>Água Base (litros/m³)</Label>
                        <Input
                          type="number"
                          value={composicao.agua.quantidade}
                          onChange={(e) => atualizarMaterial("agua", "", "quantidade", Number(e.target.value))}
                        />
                      </div>
                      <div>
                        <Label>Correção (litros)</Label>
                        <Input
                          type="number"
                          value={composicao.agua.correcao}
                          onChange={(e) => atualizarMaterial("agua", "", "correcao", Number(e.target.value))}
                        />
                      </div>
                      <div className="bg-muted p-4 rounded-lg">
                        <Label className="text-xs text-muted-foreground">Água dos Aditivos/Sílica</Label>
                        <p className="text-2xl font-bold text-primary">{calculos.aguaAditivos.toFixed(1)} L</p>
                        <p className="text-xs text-muted-foreground">Descontado automaticamente</p>
                      </div>
                    </div>
                    <Separator />
                    <div className="bg-card border border-primary/50 p-4 rounded-lg">
                      <div className="flex justify-between items-center">
                        <div>
                          <Label className="text-sm">Água Efetiva Final</Label>
                          <p className="text-xs text-muted-foreground">Base - Água Aditivos + Correção</p>
                        </div>
                        <p className="text-3xl font-bold text-primary">{calculos.aguaEfetiva.toFixed(1)} L/m³</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Coluna Lateral - Resumo */}
          <div className="space-y-6">
            {/* Resumo do Traço */}
            <Card className="sticky top-24">
              <CardHeader className="bg-primary text-primary-foreground">
                <CardTitle className="text-lg">Resumo do Traço</CardTitle>
                <CardDescription className="text-primary-foreground/80">Para 1 m³</CardDescription>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-muted rounded-lg">
                    <p className="text-xs text-muted-foreground">Consumo Cimento</p>
                    <p className="text-xl font-bold">{calculos.consumoCimento.toFixed(0)}</p>
                    <p className="text-xs">kg/m³</p>
                  </div>
                  <div className="text-center p-3 bg-muted rounded-lg">
                    <p className="text-xs text-muted-foreground">Relação a/c</p>
                    <p className="text-xl font-bold">{calculos.acEfetivo.toFixed(3)}</p>
                  </div>
                  <div className="text-center p-3 bg-muted rounded-lg">
                    <p className="text-xs text-muted-foreground">Massa Específica</p>
                    <p className="text-xl font-bold">{calculos.massaEspecifica.toFixed(0)}</p>
                    <p className="text-xs">kg/m³</p>
                  </div>
                  <div className="text-center p-3 bg-primary/10 rounded-lg border border-primary">
                    <p className="text-xs text-muted-foreground">Custo</p>
                    <p className="text-xl font-bold text-primary">R$ {calculos.custoM3.toFixed(2)}</p>
                    <p className="text-xs">/m³</p>
                  </div>
                </div>

                <Separator />

                {/* Cálculo para Massada */}
                <div>
                  <Label>Volume da Massada (litros)</Label>
                  <Input
                    type="number"
                    value={volumeMassada}
                    onChange={(e) => setVolumeMassada(Number(e.target.value))}
                    className="mt-1"
                  />
                </div>

                <div className="bg-muted p-4 rounded-lg space-y-2">
                  <p className="text-sm font-bold uppercase tracking-wider">Para {volumeMassada} litros:</p>
                  {composicao.cimentos.map(c => (
                    <div key={c.id} className="flex justify-between text-sm">
                      <span>{c.nome || "Cimento"}</span>
                      <span className="font-mono">{(c.quantidade * calculos.fatorMassada).toFixed(2)} kg</span>
                    </div>
                  ))}
                  {composicao.fillersReativos.map(f => (
                    <div key={f.id} className="flex justify-between text-sm">
                      <span>{f.nome || "Filler Reativo"}</span>
                      <span className="font-mono">{(f.quantidade * calculos.fatorMassada).toFixed(2)} kg</span>
                    </div>
                  ))}
                  {composicao.fillersInertes.map(f => (
                    <div key={f.id} className="flex justify-between text-sm">
                      <span>{f.nome || "Filler Inerte"}</span>
                      <span className="font-mono">{(f.quantidade * calculos.fatorMassada).toFixed(2)} kg</span>
                    </div>
                  ))}
                  {composicao.agregadosMiudos.map(a => (
                    <div key={a.id} className="flex justify-between text-sm">
                      <span>{a.nome || "Areia"}</span>
                      <span className="font-mono">{(a.quantidade * calculos.fatorMassada).toFixed(2)} kg</span>
                    </div>
                  ))}
                  {composicao.britas.map(b => (
                    <div key={b.id} className="flex justify-between text-sm">
                      <span>{b.nome || "Brita"}</span>
                      <span className="font-mono">{(b.quantidade * calculos.fatorMassada).toFixed(2)} kg</span>
                    </div>
                  ))}
                  {composicao.aditivos.map(a => (
                    <div key={a.id} className="flex justify-between text-sm">
                      <span>{a.nome || "Aditivo"}</span>
                      <span className="font-mono">{(a.quantidade * calculos.fatorMassada).toFixed(2)} kg</span>
                    </div>
                  ))}
                  {composicao.fibras.map(f => (
                    <div key={f.id} className="flex justify-between text-sm">
                      <span>{f.nome || "Fibra"}</span>
                      <span className="font-mono">{(f.quantidade * calculos.fatorMassada).toFixed(2)} kg</span>
                    </div>
                  ))}
                  <Separator className="my-2" />
                  <div className="flex justify-between text-sm font-bold">
                    <span>Água</span>
                    <span className="font-mono text-primary">{(calculos.aguaEfetiva * calculos.fatorMassada).toFixed(2)} L</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button className="flex-1" variant="outline" onClick={enviarWhatsApp}>
                    <Send className="w-4 h-4 mr-2" />
                    WhatsApp
                  </Button>
                  <Button className="flex-1" onClick={salvarTraco} disabled={salvarTracoMutation.isPending}>
                    <Save className="w-4 h-4 mr-2" />
                    Salvar
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
