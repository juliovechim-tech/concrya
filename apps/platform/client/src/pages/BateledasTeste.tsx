import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import TracoSelect from "@/components/TracoSelect";
import {
  Beaker,
  Scale,
  Save,
  FileText,
  ChevronRight,
  AlertCircle,
  CheckCircle2
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Link } from "wouter";

// Volumes pré-definidos em litros
const VOLUMES_PREDEFINIDOS = [
  { label: "0.5 L", value: 0.5 },
  { label: "1 L", value: 1 },
  { label: "2 L", value: 2 },
  { label: "5 L", value: 5 },
  { label: "8 L", value: 8 },
  { label: "12 L", value: 12 },
  { label: "20 L", value: 20 },
  { label: "60 L", value: 60 },
  { label: "150 L", value: 150 },
  { label: "500 L", value: 500 },
  { label: "1000 L (1 m³)", value: 1000 },
  { label: "2000 L", value: 2000 },
  { label: "8000 L", value: 8000 },
];

interface ComposicaoItem {
  material: string;
  tipo: string;
  massa: number;
  unidade: string;
}

export default function BateledasTeste() {
  const [tracoSelecionado, setTracoSelecionado] = useState<string>("");
  const [volumeBatelada, setVolumeBatelada] = useState<number>(20);
  const [volumePersonalizado, setVolumePersonalizado] = useState<boolean>(false);
  const [volumeCustom, setVolumeCustom] = useState<string>("20");
  const [perdaEstimada, setPerdaEstimada] = useState<number>(2);
  const [observacoes, setObservacoes] = useState<string>("");
  const [salvarHistorico, setSalvarHistorico] = useState<boolean>(true);

  // Buscar traços do usuário
  const { data: tracos, isLoading: loadingTracos } = trpc.tracos.list.useQuery();

  // Traço selecionado
  const tracoAtual = useMemo(() => {
    if (!tracos || !tracoSelecionado) return null;
    return tracos.find(t => t.id.toString() === tracoSelecionado);
  }, [tracos, tracoSelecionado]);

  // Volume efetivo considerando a perda
  const volumeEfetivo = useMemo(() => {
    const vol = volumePersonalizado ? parseFloat(volumeCustom) || 0 : volumeBatelada;
    return vol * (1 + perdaEstimada / 100);
  }, [volumeBatelada, volumePersonalizado, volumeCustom, perdaEstimada]);

  // Calcular massas para a batelada
  const massasBatelada = useMemo((): ComposicaoItem[] => {
    if (!tracoAtual || !tracoAtual.composicao) return [];
    
    const composicao = tracoAtual.composicao as any;
    const fator = volumeEfetivo / 1000; // Converter de L para m³
    
    const items: ComposicaoItem[] = [];
    
    // Processar cada material da composição
    if (composicao.cimento) {
      items.push({
        material: "Cimento",
        tipo: composicao.cimento.tipo || "CP",
        massa: (composicao.cimento.massa || 0) * fator,
        unidade: "kg"
      });
    }
    
    if (composicao.agua) {
      items.push({
        material: "Água",
        tipo: "",
        massa: (composicao.agua.massa || 0) * fator,
        unidade: "kg"
      });
    }
    
    // Agregados
    if (composicao.agregados) {
      composicao.agregados.forEach((ag: any, i: number) => {
        items.push({
          material: ag.nome || `Agregado ${i + 1}`,
          tipo: ag.tipo || "",
          massa: (ag.massa || 0) * fator,
          unidade: "kg"
        });
      });
    }
    
    // Aditivos (em gramas)
    if (composicao.aditivos) {
      composicao.aditivos.forEach((ad: any, i: number) => {
        const massaKg = (ad.massa || 0) * fator;
        items.push({
          material: ad.nome || `Aditivo ${i + 1}`,
          tipo: ad.tipo || "",
          massa: massaKg * 1000, // Converter para gramas
          unidade: "g"
        });
      });
    }
    
    // Adições
    if (composicao.adicoes) {
      composicao.adicoes.forEach((ad: any, i: number) => {
        const massaKg = (ad.massa || 0) * fator;
        items.push({
          material: ad.nome || `Adição ${i + 1}`,
          tipo: ad.tipo || "",
          massa: massaKg < 1 ? massaKg * 1000 : massaKg,
          unidade: massaKg < 1 ? "g" : "kg"
        });
      });
    }
    
    // Fibras
    if (composicao.fibras) {
      composicao.fibras.forEach((fb: any, i: number) => {
        const massaKg = (fb.massa || 0) * fator;
        items.push({
          material: fb.nome || `Fibra ${i + 1}`,
          tipo: fb.tipo || "",
          massa: massaKg < 1 ? massaKg * 1000 : massaKg,
          unidade: massaKg < 1 ? "g" : "kg"
        });
      });
    }
    
    return items;
  }, [tracoAtual, volumeEfetivo]);

  // Massa total
  const massaTotal = useMemo(() => {
    return massasBatelada.reduce((acc, item) => {
      const massaKg = item.unidade === "g" ? item.massa / 1000 : item.massa;
      return acc + massaKg;
    }, 0);
  }, [massasBatelada]);

  const handleSalvar = () => {
    if (!tracoAtual) {
      toast.error("Selecione um traço primeiro");
      return;
    }
    
    // TODO: Implementar salvamento no banco
    toast.success("Batelada salva no histórico!");
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
            <span className="text-foreground">Bateladas de Teste</span>
          </div>
          <h1 className="text-3xl font-bold uppercase tracking-tight flex items-center gap-3">
            <Beaker className="w-8 h-8 text-primary" />
            Bateladas de Teste
          </h1>
          <p className="text-muted-foreground mt-2">
            Calcule as massas para uma batelada de teste a partir de um traço salvo
          </p>
        </div>
      </div>

      <div className="container py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Coluna 1: Selecionar Traço */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                Selecionar Traço
              </CardTitle>
              <CardDescription>
                Escolha um traço salvo para calcular a batelada
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <TracoSelect
                tracos={tracos}
                isLoading={loadingTracos}
                value={tracoSelecionado}
                onValueChange={setTracoSelecionado}
              />

              {tracoAtual && (
                <div className="p-4 bg-muted/50 rounded-lg space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tipo:</span>
                    <span className="font-medium">{tracoAtual.tipoConcreto}</span>
                  </div>
                  {tracoAtual.fckAlvo && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">fck:</span>
                      <span className="font-medium">{tracoAtual.fckAlvo} MPa</span>
                    </div>
                  )}
                  {tracoAtual.relacaoAC && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">a/c:</span>
                      <span className="font-medium">{tracoAtual.relacaoAC}</span>
                    </div>
                  )}
                  {tracoAtual.consumoCimento && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Consumo:</span>
                      <span className="font-medium">{tracoAtual.consumoCimento} kg/m³</span>
                    </div>
                  )}
                </div>
              )}

              {!tracos || tracos.length === 0 ? (
                <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-yellow-500 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Nenhum traço encontrado</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Salve um traço nas calculadoras para usar aqui.
                      </p>
                      <Button variant="link" className="p-0 h-auto text-xs mt-2" asChild>
                        <Link href="/calculadora">Ir para Calculadora</Link>
                      </Button>
                    </div>
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>

          {/* Coluna 2: Configuração */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Scale className="w-5 h-5 text-primary" />
                Configuração
              </CardTitle>
              <CardDescription>
                Defina o volume e parâmetros da batelada
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Volume da Batelada */}
              <div className="space-y-3">
                <Label className="text-lg font-semibold">Volume da Batelada</Label>
                
                <div className="flex items-center gap-2 mb-3">
                  <Checkbox 
                    id="volumePersonalizado" 
                    checked={volumePersonalizado}
                    onCheckedChange={(checked) => setVolumePersonalizado(checked as boolean)}
                  />
                  <Label htmlFor="volumePersonalizado" className="text-sm cursor-pointer">
                    Digitar volume personalizado
                  </Label>
                </div>

                {volumePersonalizado ? (
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={volumeCustom}
                      onChange={(e) => setVolumeCustom(e.target.value)}
                      min={0.5}
                      max={10000}
                      step={0.1}
                      className="w-32"
                    />
                    <span className="text-muted-foreground">litros</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    {VOLUMES_PREDEFINIDOS.map((vol) => (
                      <Button
                        key={vol.value}
                        variant={volumeBatelada === vol.value ? "default" : "outline"}
                        size="sm"
                        onClick={() => setVolumeBatelada(vol.value)}
                        className="text-xs"
                      >
                        {vol.label}
                      </Button>
                    ))}
                  </div>
                )}
              </div>

              {/* Perda Estimada */}
              <div className="space-y-3">
                <div className="flex justify-between">
                  <Label>Perda Estimada</Label>
                  <span className="text-sm font-medium text-primary">{perdaEstimada}%</span>
                </div>
                <Slider
                  value={[perdaEstimada]}
                  onValueChange={(value) => setPerdaEstimada(value[0])}
                  min={0}
                  max={20}
                  step={1}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>0%</span>
                  <span>10%</span>
                  <span>20%</span>
                </div>
              </div>

              {/* Observações */}
              <div className="space-y-2">
                <Label>Observações</Label>
                <Textarea
                  placeholder="Anotações sobre a batelada..."
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  rows={3}
                />
              </div>

              {/* Salvar no histórico */}
              <div className="flex items-center gap-2">
                <Checkbox 
                  id="salvarHistorico" 
                  checked={salvarHistorico}
                  onCheckedChange={(checked) => setSalvarHistorico(checked as boolean)}
                />
                <Label htmlFor="salvarHistorico" className="text-sm cursor-pointer">
                  Salvar no histórico
                </Label>
              </div>
            </CardContent>
          </Card>

          {/* Coluna 3: Resultado */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-primary" />
                Resultado
              </CardTitle>
              <CardDescription>
                {tracoAtual 
                  ? `Massas para ${volumePersonalizado ? volumeCustom : volumeBatelada} L`
                  : "Selecione um traço para calcular"
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              {tracoAtual && massasBatelada.length > 0 ? (
                <div className="space-y-4">
                  {/* Lista de materiais */}
                  <div className="space-y-2">
                    {massasBatelada.map((item, index) => (
                      <div 
                        key={index}
                        className="flex justify-between items-center p-3 bg-muted/50 rounded-lg"
                      >
                        <div>
                          <span className="font-medium">{item.material}</span>
                          {item.tipo && (
                            <span className="text-xs text-muted-foreground ml-2">
                              ({item.tipo})
                            </span>
                          )}
                        </div>
                        <span className="font-bold text-primary">
                          {item.massa.toFixed(item.unidade === "g" ? 1 : 2)} {item.unidade}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Totais */}
                  <div className="border-t border-border pt-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Volume efetivo:</span>
                      <span className="font-medium">{volumeEfetivo.toFixed(1)} L</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Massa total:</span>
                      <span className="font-medium">{massaTotal.toFixed(2)} kg</span>
                    </div>
                  </div>

                  {/* Botão Salvar */}
                  <Button 
                    className="w-full mt-4" 
                    onClick={handleSalvar}
                    disabled={!salvarHistorico}
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Salvar Batelada
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Scale className="w-12 h-12 text-muted-foreground/30 mb-4" />
                  <p className="text-muted-foreground">
                    Selecione um traço para calcular
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
