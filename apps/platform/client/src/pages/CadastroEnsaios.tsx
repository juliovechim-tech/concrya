import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  ClipboardList, 
  FileText,
  ChevronRight,
  Save,
  Plus,
  Trash2,
  FlaskConical
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Link } from "wouter";

// Idades padrão para ensaios de resistência
const IDADES_PADRAO = [1, 3, 7, 14, 28, 63, 90, 180];

interface ResultadoIdade {
  idade: number;
  cp1: string;
  cp2: string;
  cp3: string;
  media: number;
}

interface DadosConcreto {
  slump0: string;
  slump15: string;
  slump30: string;
  slump45: string;
  slump60: string;
  slumpFinal: string;
  perdaAbatimento: number;
  arIncorporado: string;
  massaEspecifica: string;
  temperatura: string;
  aspectoConcreto: string;
}

export default function CadastroEnsaios() {
  const [tracoSelecionado, setTracoSelecionado] = useState<string>("");
  const [nomeEnsaio, setNomeEnsaio] = useState<string>("");
  const [dataEnsaio, setDataEnsaio] = useState<string>(new Date().toISOString().split('T')[0]);
  const [observacoes, setObservacoes] = useState<string>("");
  
  // Dados do concreto fresco
  const [dadosConcreto, setDadosConcreto] = useState<DadosConcreto>({
    slump0: "",
    slump15: "",
    slump30: "",
    slump45: "",
    slump60: "",
    slumpFinal: "",
    perdaAbatimento: 0,
    arIncorporado: "",
    massaEspecifica: "",
    temperatura: "",
    aspectoConcreto: ""
  });

  // Resultados por idade
  const [resultados, setResultados] = useState<ResultadoIdade[]>(
    IDADES_PADRAO.map(idade => ({
      idade,
      cp1: "",
      cp2: "",
      cp3: "",
      media: 0
    }))
  );

  // Buscar traços do usuário
  const { data: tracos, isLoading: loadingTracos } = trpc.tracos.list.useQuery();

  // Mutation para criar ensaio
  const createEnsaio = trpc.ensaios.create.useMutation({
    onSuccess: () => {
      toast.success("Ensaio cadastrado com sucesso!");
      // Limpar formulário
      setNomeEnsaio("");
      setObservacoes("");
      setResultados(IDADES_PADRAO.map(idade => ({
        idade,
        cp1: "",
        cp2: "",
        cp3: "",
        media: 0
      })));
    },
    onError: (error) => {
      toast.error(`Erro ao cadastrar: ${error.message}`);
    }
  });

  // Traço selecionado
  const tracoAtual = useMemo(() => {
    if (!tracos || !tracoSelecionado) return null;
    return tracos.find(t => t.id.toString() === tracoSelecionado);
  }, [tracos, tracoSelecionado]);

  // Calcular média quando valores mudam
  const handleResultadoChange = (index: number, field: 'cp1' | 'cp2' | 'cp3', value: string) => {
    setResultados(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      
      // Calcular média
      const cp1 = parseFloat(updated[index].cp1) || 0;
      const cp2 = parseFloat(updated[index].cp2) || 0;
      const cp3 = parseFloat(updated[index].cp3) || 0;
      
      const valores = [cp1, cp2, cp3].filter(v => v > 0);
      updated[index].media = valores.length > 0 
        ? valores.reduce((a, b) => a + b, 0) / valores.length 
        : 0;
      
      return updated;
    });
  };

  // Calcular perda de abatimento
  const perdaAbatimento = useMemo(() => {
    const slump0 = parseFloat(dadosConcreto.slump0) || 0;
    const slumpFinal = parseFloat(dadosConcreto.slumpFinal) || 0;
    return slump0 - slumpFinal;
  }, [dadosConcreto.slump0, dadosConcreto.slumpFinal]);

  const handleSalvar = () => {
    if (!tracoSelecionado) {
      toast.error("Selecione um traço");
      return;
    }
    if (!nomeEnsaio.trim()) {
      toast.error("Informe o nome do ensaio");
      return;
    }

    // Preparar dados para salvar
    const resultadosParaSalvar = resultados.reduce((acc, r) => {
      if (r.cp1 || r.cp2 || r.cp3) {
        acc[`R${r.idade}`] = {
          cp1: parseFloat(r.cp1) || null,
          cp2: parseFloat(r.cp2) || null,
          cp3: parseFloat(r.cp3) || null,
          media: r.media
        };
      }
      return acc;
    }, {} as Record<string, any>);

    createEnsaio.mutate({
      nome: nomeEnsaio,
      tracoId: parseInt(tracoSelecionado),
      dataEnsaio: dataEnsaio,
      resultados: {
        ...resultadosParaSalvar,
        concretoFresco: dadosConcreto
      },
      observacoes: observacoes || undefined
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card/50">
        <div className="container py-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <Link href="/">Início</Link>
            <ChevronRight className="w-4 h-4" />
            <span>Laboratório</span>
            <ChevronRight className="w-4 h-4" />
            <span className="text-foreground">Cadastro de Ensaios</span>
          </div>
          <h1 className="text-3xl font-bold uppercase tracking-tight flex items-center gap-3">
            <ClipboardList className="w-8 h-8 text-primary" />
            Cadastro de Ensaios
          </h1>
          <p className="text-muted-foreground mt-2">
            Registre os resultados de ensaios vinculados a um traço
          </p>
        </div>
      </div>

      <div className="container py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Coluna 1: Dados do Ensaio */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                Dados do Ensaio
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Traço</Label>
                <Select value={tracoSelecionado} onValueChange={setTracoSelecionado}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {loadingTracos ? (
                      <SelectItem value="loading" disabled>Carregando...</SelectItem>
                    ) : tracos && tracos.length > 0 ? (
                      tracos.map((traco) => (
                        <SelectItem key={traco.id} value={traco.id.toString()}>
                          {traco.nome}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="empty" disabled>Nenhum traço</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Nome do Ensaio</Label>
                <Input
                  value={nomeEnsaio}
                  onChange={(e) => setNomeEnsaio(e.target.value)}
                  placeholder="Ex: Ensaio 001 - CAA"
                />
              </div>

              <div className="space-y-2">
                <Label>Data</Label>
                <Input
                  type="date"
                  value={dataEnsaio}
                  onChange={(e) => setDataEnsaio(e.target.value)}
                />
              </div>

              {tracoAtual && (
                <div className="p-3 bg-muted/50 rounded-lg text-sm space-y-1">
                  <p><span className="text-muted-foreground">Tipo:</span> {tracoAtual.tipoConcreto}</p>
                  <p><span className="text-muted-foreground">fck:</span> {tracoAtual.fckAlvo} MPa</p>
                  <p><span className="text-muted-foreground">a/c:</span> {tracoAtual.relacaoAC}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Coluna 2: Concreto Fresco */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FlaskConical className="w-5 h-5 text-primary" />
                Concreto Fresco
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Slump 0"</Label>
                  <Input
                    type="number"
                    value={dadosConcreto.slump0}
                    onChange={(e) => setDadosConcreto(prev => ({ ...prev, slump0: e.target.value }))}
                    placeholder="mm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Slump 15"</Label>
                  <Input
                    type="number"
                    value={dadosConcreto.slump15}
                    onChange={(e) => setDadosConcreto(prev => ({ ...prev, slump15: e.target.value }))}
                    placeholder="mm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Slump 30"</Label>
                  <Input
                    type="number"
                    value={dadosConcreto.slump30}
                    onChange={(e) => setDadosConcreto(prev => ({ ...prev, slump30: e.target.value }))}
                    placeholder="mm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Slump 45"</Label>
                  <Input
                    type="number"
                    value={dadosConcreto.slump45}
                    onChange={(e) => setDadosConcreto(prev => ({ ...prev, slump45: e.target.value }))}
                    placeholder="mm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Slump 60"</Label>
                  <Input
                    type="number"
                    value={dadosConcreto.slump60}
                    onChange={(e) => setDadosConcreto(prev => ({ ...prev, slump60: e.target.value }))}
                    placeholder="mm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Slump Final</Label>
                  <Input
                    type="number"
                    value={dadosConcreto.slumpFinal}
                    onChange={(e) => setDadosConcreto(prev => ({ ...prev, slumpFinal: e.target.value }))}
                    placeholder="mm"
                  />
                </div>
              </div>

              <div className="p-3 bg-yellow-500/10 rounded-lg">
                <div className="flex justify-between">
                  <span className="text-sm">Perda de Abatimento:</span>
                  <span className="font-bold text-yellow-600">{perdaAbatimento} mm</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Ar Incorp. (%)</Label>
                  <Input
                    type="number"
                    value={dadosConcreto.arIncorporado}
                    onChange={(e) => setDadosConcreto(prev => ({ ...prev, arIncorporado: e.target.value }))}
                    step={0.1}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Massa Esp. (kg/m³)</Label>
                  <Input
                    type="number"
                    value={dadosConcreto.massaEspecifica}
                    onChange={(e) => setDadosConcreto(prev => ({ ...prev, massaEspecifica: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Aspecto</Label>
                <Select 
                  value={dadosConcreto.aspectoConcreto} 
                  onValueChange={(v) => setDadosConcreto(prev => ({ ...prev, aspectoConcreto: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bom">Bom aspecto</SelectItem>
                    <SelectItem value="muito_argamassado">Muito argamassado</SelectItem>
                    <SelectItem value="pouco_argamassado">Pouco argamassado</SelectItem>
                    <SelectItem value="aspero">Áspero</SelectItem>
                    <SelectItem value="empedrado">Empedrado</SelectItem>
                    <SelectItem value="segregacao">Tendência à segregação</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Coluna 3-4: Resultados de Resistência */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-primary" />
                Resistência à Compressão (MPa)
              </CardTitle>
              <CardDescription>
                Informe os resultados dos corpos de prova por idade
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 px-2 font-medium">Idade</th>
                      <th className="text-center py-2 px-2 font-medium">CP 1</th>
                      <th className="text-center py-2 px-2 font-medium">CP 2</th>
                      <th className="text-center py-2 px-2 font-medium">CP 3</th>
                      <th className="text-center py-2 px-2 font-medium text-primary">Fcj</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resultados.map((resultado, index) => (
                      <tr key={resultado.idade} className="border-b border-border/50">
                        <td className="py-2 px-2 font-medium">R{resultado.idade}</td>
                        <td className="py-2 px-1">
                          <Input
                            type="number"
                            value={resultado.cp1}
                            onChange={(e) => handleResultadoChange(index, 'cp1', e.target.value)}
                            className="h-8 text-center"
                            step={0.1}
                          />
                        </td>
                        <td className="py-2 px-1">
                          <Input
                            type="number"
                            value={resultado.cp2}
                            onChange={(e) => handleResultadoChange(index, 'cp2', e.target.value)}
                            className="h-8 text-center"
                            step={0.1}
                          />
                        </td>
                        <td className="py-2 px-1">
                          <Input
                            type="number"
                            value={resultado.cp3}
                            onChange={(e) => handleResultadoChange(index, 'cp3', e.target.value)}
                            className="h-8 text-center"
                            step={0.1}
                          />
                        </td>
                        <td className="py-2 px-2 text-center">
                          <span className={`font-bold ${resultado.media > 0 ? 'text-primary' : 'text-muted-foreground'}`}>
                            {resultado.media > 0 ? resultado.media.toFixed(1) : '-'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-6 space-y-4">
                <div className="space-y-2">
                  <Label>Observações</Label>
                  <Textarea
                    value={observacoes}
                    onChange={(e) => setObservacoes(e.target.value)}
                    placeholder="Anotações sobre o ensaio..."
                    rows={3}
                  />
                </div>

                <Button 
                  className="w-full" 
                  onClick={handleSalvar}
                  disabled={createEnsaio.isPending}
                >
                  <Save className="w-4 h-4 mr-2" />
                  {createEnsaio.isPending ? "Salvando..." : "Salvar Ensaio"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
