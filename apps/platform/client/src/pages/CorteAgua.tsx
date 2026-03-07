import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import TracoSelect from "@/components/TracoSelect";
import {
  Droplets,
  FileText,
  ChevronRight,
  AlertCircle,
  Calculator,
  ArrowDown,
  Minus
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";

interface UmidadeMaterial {
  nome: string;
  tipo: string;
  massaSeca: number;
  umidade: number;
  aguaContida: number;
  massaUmida: number;
}

export default function CorteAgua() {
  const [tracoSelecionado, setTracoSelecionado] = useState<string>("");
  const [volumeBatelada, setVolumeBatelada] = useState<number>(1000);
  
  // Umidades dos materiais (editáveis)
  const [umidades, setUmidades] = useState<Record<string, number>>({
    areia1: 5.0,
    areia2: 4.0,
    brita0: 1.0,
    brita1: 0.5,
    silica: 50.0, // % de água na sílica em suspensão
    aditivo1: 60.0, // % de água no aditivo
    aditivo2: 0,
  });

  // Buscar traços do usuário
  const { data: tracos, isLoading: loadingTracos } = trpc.tracos.list.useQuery();

  // Traço selecionado
  const tracoAtual = useMemo(() => {
    if (!tracos || !tracoSelecionado) return null;
    return tracos.find(t => t.id.toString() === tracoSelecionado);
  }, [tracos, tracoSelecionado]);

  // Calcular água total e correções
  const calculoAgua = useMemo(() => {
    if (!tracoAtual || !tracoAtual.composicao) {
      return {
        aguaTraco: 0,
        aguaSilica: 0,
        aguaAreia1: 0,
        aguaAreia2: 0,
        aguaBrita0: 0,
        aguaBrita1: 0,
        aguaAditivo1: 0,
        aguaAditivo2: 0,
        aguaTotal: 0,
        aguaEfetiva: 0,
        materiais: [] as UmidadeMaterial[]
      };
    }

    const composicao = tracoAtual.composicao as any;
    const fator = volumeBatelada / 1000;
    
    // Água do traço (a/c × cimento)
    const consumoCimento = parseFloat(tracoAtual.consumoCimento || "0") * fator;
    const relacaoAC = parseFloat(tracoAtual.relacaoAC || "0");
    const aguaTraco = consumoCimento * relacaoAC;

    // Materiais com umidade
    const materiais: UmidadeMaterial[] = [];
    
    // Agregados
    if (composicao.agregados) {
      composicao.agregados.forEach((ag: any, i: number) => {
        const massaSeca = (ag.massa || 0) * fator;
        const umidadeKey = i === 0 ? 'areia1' : i === 1 ? 'areia2' : i === 2 ? 'brita0' : 'brita1';
        const umidade = umidades[umidadeKey] || 0;
        const aguaContida = massaSeca * (umidade / 100);
        
        materiais.push({
          nome: ag.nome || `Agregado ${i + 1}`,
          tipo: ag.tipo || "",
          massaSeca,
          umidade,
          aguaContida,
          massaUmida: massaSeca + aguaContida
        });
      });
    }

    // Sílica em suspensão
    let aguaSilica = 0;
    if (composicao.adicoes) {
      composicao.adicoes.forEach((ad: any) => {
        if (ad.tipo?.toLowerCase().includes('silica') || ad.nome?.toLowerCase().includes('silica')) {
          const massaTotal = (ad.massa || 0) * fator;
          aguaSilica = massaTotal * (umidades.silica / 100);
        }
      });
    }

    // Aditivos com água
    let aguaAditivo1 = 0;
    let aguaAditivo2 = 0;
    if (composicao.aditivos) {
      composicao.aditivos.forEach((ad: any, i: number) => {
        const massaTotal = (ad.massa || 0) * fator;
        if (i === 0) {
          aguaAditivo1 = massaTotal * (umidades.aditivo1 / 100);
        } else if (i === 1) {
          aguaAditivo2 = massaTotal * (umidades.aditivo2 / 100);
        }
      });
    }

    // Somar água dos agregados
    const aguaAreia1 = materiais[0]?.aguaContida || 0;
    const aguaAreia2 = materiais[1]?.aguaContida || 0;
    const aguaBrita0 = materiais[2]?.aguaContida || 0;
    const aguaBrita1 = materiais[3]?.aguaContida || 0;

    const aguaTotal = aguaSilica + aguaAreia1 + aguaAreia2 + aguaBrita0 + aguaBrita1 + aguaAditivo1 + aguaAditivo2;
    const aguaEfetiva = Math.max(0, aguaTraco - aguaTotal);

    return {
      aguaTraco,
      aguaSilica,
      aguaAreia1,
      aguaAreia2,
      aguaBrita0,
      aguaBrita1,
      aguaAditivo1,
      aguaAditivo2,
      aguaTotal,
      aguaEfetiva,
      materiais
    };
  }, [tracoAtual, volumeBatelada, umidades]);

  const handleUmidadeChange = (key: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    setUmidades(prev => ({ ...prev, [key]: numValue }));
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
            <span className="text-foreground">Corte de Água</span>
          </div>
          <h1 className="text-3xl font-bold uppercase tracking-tight flex items-center gap-3">
            <Droplets className="w-8 h-8 text-primary" />
            Corte de Água
          </h1>
          <p className="text-muted-foreground mt-2">
            Ajuste a água do traço baseado na umidade dos agregados e aditivos
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
            </CardHeader>
            <CardContent className="space-y-4">
              <TracoSelect
                tracos={tracos}
                isLoading={loadingTracos}
                value={tracoSelecionado}
                onValueChange={setTracoSelecionado}
              />

              <div className="space-y-2">
                <Label>Volume (L)</Label>
                <Input
                  type="number"
                  value={volumeBatelada}
                  onChange={(e) => setVolumeBatelada(parseFloat(e.target.value) || 0)}
                  min={0.5}
                  max={10000}
                />
              </div>

              {tracoAtual && (
                <div className="p-4 bg-muted/50 rounded-lg space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">a/c:</span>
                    <span className="font-medium">{tracoAtual.relacaoAC}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Consumo:</span>
                    <span className="font-medium">{tracoAtual.consumoCimento} kg/m³</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Coluna 2: Umidades */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="w-5 h-5 text-primary" />
                Umidades (%)
              </CardTitle>
              <CardDescription>
                Informe a umidade de cada material
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs">Areia 1 (%)</Label>
                  <Input
                    type="number"
                    value={umidades.areia1}
                    onChange={(e) => handleUmidadeChange('areia1', e.target.value)}
                    step={0.1}
                    min={0}
                    max={20}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Areia 2 (%)</Label>
                  <Input
                    type="number"
                    value={umidades.areia2}
                    onChange={(e) => handleUmidadeChange('areia2', e.target.value)}
                    step={0.1}
                    min={0}
                    max={20}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Brita 0 (%)</Label>
                  <Input
                    type="number"
                    value={umidades.brita0}
                    onChange={(e) => handleUmidadeChange('brita0', e.target.value)}
                    step={0.1}
                    min={0}
                    max={10}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Brita 1 (%)</Label>
                  <Input
                    type="number"
                    value={umidades.brita1}
                    onChange={(e) => handleUmidadeChange('brita1', e.target.value)}
                    step={0.1}
                    min={0}
                    max={10}
                  />
                </div>
              </div>

              <div className="border-t border-border pt-4 space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs">Água na Sílica (%)</Label>
                  <Input
                    type="number"
                    value={umidades.silica}
                    onChange={(e) => handleUmidadeChange('silica', e.target.value)}
                    step={1}
                    min={0}
                    max={100}
                  />
                  <p className="text-xs text-muted-foreground">
                    Sílica em suspensão: 50% água típico
                  </p>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Água no Aditivo SP (%)</Label>
                  <Input
                    type="number"
                    value={umidades.aditivo1}
                    onChange={(e) => handleUmidadeChange('aditivo1', e.target.value)}
                    step={1}
                    min={0}
                    max={100}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Coluna 3: Resultado */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Droplets className="w-5 h-5 text-primary" />
                Balanço de Água
              </CardTitle>
            </CardHeader>
            <CardContent>
              {tracoAtual ? (
                <div className="space-y-3">
                  {/* Água do traço */}
                  <div className="flex justify-between items-center p-3 bg-blue-500/10 rounded-lg">
                    <span>Água do Traço (a/c)</span>
                    <span className="font-bold text-blue-500">
                      {calculoAgua.aguaTraco.toFixed(2)} kg
                    </span>
                  </div>

                  {/* Descontos */}
                  <div className="space-y-2 text-sm">
                    {calculoAgua.aguaSilica > 0 && (
                      <div className="flex justify-between items-center p-2 bg-muted/50 rounded">
                        <span className="flex items-center gap-2">
                          <Minus className="w-3 h-3 text-red-500" />
                          Água Sílica
                        </span>
                        <span className="text-red-500">-{calculoAgua.aguaSilica.toFixed(2)} kg</span>
                      </div>
                    )}
                    {calculoAgua.aguaAreia1 > 0 && (
                      <div className="flex justify-between items-center p-2 bg-muted/50 rounded">
                        <span className="flex items-center gap-2">
                          <Minus className="w-3 h-3 text-red-500" />
                          Água Areia 1
                        </span>
                        <span className="text-red-500">-{calculoAgua.aguaAreia1.toFixed(2)} kg</span>
                      </div>
                    )}
                    {calculoAgua.aguaAreia2 > 0 && (
                      <div className="flex justify-between items-center p-2 bg-muted/50 rounded">
                        <span className="flex items-center gap-2">
                          <Minus className="w-3 h-3 text-red-500" />
                          Água Areia 2
                        </span>
                        <span className="text-red-500">-{calculoAgua.aguaAreia2.toFixed(2)} kg</span>
                      </div>
                    )}
                    {calculoAgua.aguaBrita0 > 0 && (
                      <div className="flex justify-between items-center p-2 bg-muted/50 rounded">
                        <span className="flex items-center gap-2">
                          <Minus className="w-3 h-3 text-red-500" />
                          Água Brita 0
                        </span>
                        <span className="text-red-500">-{calculoAgua.aguaBrita0.toFixed(2)} kg</span>
                      </div>
                    )}
                    {calculoAgua.aguaBrita1 > 0 && (
                      <div className="flex justify-between items-center p-2 bg-muted/50 rounded">
                        <span className="flex items-center gap-2">
                          <Minus className="w-3 h-3 text-red-500" />
                          Água Brita 1
                        </span>
                        <span className="text-red-500">-{calculoAgua.aguaBrita1.toFixed(2)} kg</span>
                      </div>
                    )}
                    {calculoAgua.aguaAditivo1 > 0 && (
                      <div className="flex justify-between items-center p-2 bg-muted/50 rounded">
                        <span className="flex items-center gap-2">
                          <Minus className="w-3 h-3 text-red-500" />
                          Água Aditivo SP
                        </span>
                        <span className="text-red-500">-{calculoAgua.aguaAditivo1.toFixed(2)} kg</span>
                      </div>
                    )}
                  </div>

                  {/* Total descontado */}
                  <div className="flex justify-between items-center p-2 border-t border-border">
                    <span className="text-muted-foreground">Total a descontar:</span>
                    <span className="font-medium text-red-500">
                      -{calculoAgua.aguaTotal.toFixed(2)} kg
                    </span>
                  </div>

                  {/* Água efetiva */}
                  <div className="flex justify-between items-center p-4 bg-green-500/10 rounded-lg border-2 border-green-500/30">
                    <div>
                      <span className="font-bold text-lg">ÁGUA EFETIVA</span>
                      <p className="text-xs text-muted-foreground">A adicionar na betoneira</p>
                    </div>
                    <span className="font-bold text-2xl text-green-500">
                      {calculoAgua.aguaEfetiva.toFixed(2)} kg
                    </span>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Droplets className="w-12 h-12 text-muted-foreground/30 mb-4" />
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
