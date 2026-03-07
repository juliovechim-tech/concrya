import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calculator, ArrowRight, RefreshCw, Download } from "lucide-react";

export default function Calculadora() {
  const [volume, setVolume] = useState<number>(1000); // Litros
  const [fck, setFck] = useState<string>("30");
  const [slump, setSlump] = useState<string>("100");
  
  // Resultados simulados
  const [results, setResults] = useState<any>(null);

  const handleCalculate = () => {
    // Lógica simplificada de dosagem (apenas para demonstração visual)
    // Em um app real, isso usaria as fórmulas complexas da planilha
    const volM3 = volume / 1000;
    
    const cimento = 350 * volM3;
    const areia = 800 * volM3;
    const brita0 = 400 * volM3;
    const brita1 = 550 * volM3;
    const agua = 180 * volM3;
    const aditivo = cimento * 0.01;

    setResults({
      cimento: cimento.toFixed(1),
      areia: areia.toFixed(1),
      brita0: brita0.toFixed(1),
      brita1: brita1.toFixed(1),
      agua: agua.toFixed(1),
      aditivo: aditivo.toFixed(2),
      densidade: 2350
    });
  };

  return (
    <div className="container py-12">
      <div className="flex flex-col md:flex-row justify-between items-end mb-12 border-b border-border pb-6">
        <div>
          <h1 className="text-4xl font-bold uppercase tracking-tighter mb-2 flex items-center gap-3">
            <Calculator className="w-10 h-10 text-primary" />
            Calculadora de Traço
          </h1>
          <p className="text-muted-foreground font-mono text-sm">DOSAGEM RACIONAL DE CONCRETO</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Inputs */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="rounded-none border-border bg-card">
            <CardHeader className="bg-muted/20 border-b border-border">
              <CardTitle className="uppercase tracking-wide text-sm font-bold">Parâmetros de Entrada</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="space-y-2">
                <Label className="uppercase text-xs font-bold tracking-wider text-muted-foreground">Volume Desejado (Litros)</Label>
                <div className="flex gap-2">
                  <Input 
                    type="number" 
                    value={volume} 
                    onChange={(e) => setVolume(Number(e.target.value))}
                    className="font-mono text-lg rounded-none border-border focus:border-primary"
                  />
                  <div className="bg-muted flex items-center px-3 border border-border font-mono text-sm">L</div>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="uppercase text-xs font-bold tracking-wider text-muted-foreground">Resistência (fck)</Label>
                <Select value={fck} onValueChange={setFck}>
                  <SelectTrigger className="rounded-none border-border font-mono">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent className="rounded-none">
                    <SelectItem value="20">20 MPa</SelectItem>
                    <SelectItem value="25">25 MPa</SelectItem>
                    <SelectItem value="30">30 MPa</SelectItem>
                    <SelectItem value="35">35 MPa</SelectItem>
                    <SelectItem value="40">40 MPa</SelectItem>
                    <SelectItem value="50">50 MPa</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="uppercase text-xs font-bold tracking-wider text-muted-foreground">Abatimento (Slump)</Label>
                <Select value={slump} onValueChange={setSlump}>
                  <SelectTrigger className="rounded-none border-border font-mono">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent className="rounded-none">
                    <SelectItem value="60">60 +/- 10 mm</SelectItem>
                    <SelectItem value="80">80 +/- 10 mm</SelectItem>
                    <SelectItem value="100">100 +/- 20 mm</SelectItem>
                    <SelectItem value="120">120 +/- 20 mm</SelectItem>
                    <SelectItem value="160">160 +/- 20 mm</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button 
                onClick={handleCalculate}
                className="w-full bg-primary hover:bg-white hover:text-black text-white font-bold uppercase tracking-wider h-12 rounded-none transition-all duration-300"
              >
                Calcular Traço
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>

          <div className="bg-muted/10 p-6 border border-border border-l-4 border-l-primary">
            <h3 className="font-bold uppercase tracking-tight mb-2 text-sm">Nota Técnica</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              "O concreto não é uma receita de bolo. É uma ciência de materiais que exige controle rigoroso de umidade e pesagem."
            </p>
            <p className="text-xs font-mono mt-2 text-primary">— P.K. Mehta</p>
          </div>
        </div>

        {/* Results */}
        <div className="lg:col-span-2">
          {results ? (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="rounded-none border-primary bg-primary/5">
                  <CardHeader className="pb-2">
                    <CardTitle className="uppercase tracking-wide text-xs font-bold text-primary">Cimento CPV</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-4xl font-mono font-bold">{results.cimento} <span className="text-lg text-muted-foreground">kg</span></div>
                  </CardContent>
                </Card>
                <Card className="rounded-none border-border bg-card">
                  <CardHeader className="pb-2">
                    <CardTitle className="uppercase tracking-wide text-xs font-bold text-muted-foreground">Água Total</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-4xl font-mono font-bold">{results.agua} <span className="text-lg text-muted-foreground">L</span></div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="rounded-none border-border bg-card">
                  <CardHeader className="pb-2">
                    <CardTitle className="uppercase tracking-wide text-xs font-bold text-muted-foreground">Areia Média</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-mono font-bold">{results.areia} <span className="text-sm text-muted-foreground">kg</span></div>
                  </CardContent>
                </Card>
                <Card className="rounded-none border-border bg-card">
                  <CardHeader className="pb-2">
                    <CardTitle className="uppercase tracking-wide text-xs font-bold text-muted-foreground">Brita 0</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-mono font-bold">{results.brita0} <span className="text-sm text-muted-foreground">kg</span></div>
                  </CardContent>
                </Card>
                <Card className="rounded-none border-border bg-card">
                  <CardHeader className="pb-2">
                    <CardTitle className="uppercase tracking-wide text-xs font-bold text-muted-foreground">Brita 1</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-mono font-bold">{results.brita1} <span className="text-sm text-muted-foreground">kg</span></div>
                  </CardContent>
                </Card>
              </div>

              <Card className="rounded-none border-border bg-card">
                <CardHeader className="bg-muted/20 border-b border-border flex flex-row items-center justify-between">
                  <CardTitle className="uppercase tracking-wide text-sm font-bold">Resumo do Traço (1 : m : a/c)</CardTitle>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0"><Download className="h-4 w-4" /></Button>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="grid grid-cols-4 divide-x divide-border">
                    <div className="p-4 text-center">
                      <span className="block text-xs uppercase text-muted-foreground mb-1">Cimento</span>
                      <span className="font-mono font-bold text-xl">1.0</span>
                    </div>
                    <div className="p-4 text-center">
                      <span className="block text-xs uppercase text-muted-foreground mb-1">Areia</span>
                      <span className="font-mono font-bold text-xl">{(results.areia / results.cimento).toFixed(2)}</span>
                    </div>
                    <div className="p-4 text-center">
                      <span className="block text-xs uppercase text-muted-foreground mb-1">Brita</span>
                      <span className="font-mono font-bold text-xl">{((Number(results.brita0) + Number(results.brita1)) / results.cimento).toFixed(2)}</span>
                    </div>
                    <div className="p-4 text-center bg-primary/10">
                      <span className="block text-xs uppercase text-primary mb-1 font-bold">a/c</span>
                      <span className="font-mono font-bold text-xl text-primary">{(results.agua / results.cimento).toFixed(2)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-end gap-4">
                <Button variant="outline" className="rounded-none border-border" onClick={() => setResults(null)}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Novo Cálculo
                </Button>
                <Button className="bg-secondary text-secondary-foreground hover:bg-white font-bold uppercase tracking-wider rounded-none">
                  Salvar Traço
                </Button>
              </div>
            </div>
          ) : (
            <div className="h-full min-h-[400px] flex flex-col items-center justify-center border border-dashed border-border bg-muted/5 p-12 text-center">
              <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-6">
                <Calculator className="w-10 h-10 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-bold uppercase tracking-tight mb-2">Aguardando Dados</h3>
              <p className="text-muted-foreground max-w-md">
                Preencha os parâmetros ao lado e clique em "Calcular Traço" para gerar a dosagem ideal.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
