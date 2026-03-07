import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Droplets, ClipboardList, Plus, Trash2, Save, ArrowRight, FileSpreadsheet } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { exportarRelatorioEnsaios, exportarRelatorioEnsaiosCSV } from "@/lib/excel-export";
import { toast } from "sonner";

export default function Ensaios() {
  // Estado para Ajuste de Umidade
  const [umidadeAreia, setUmidadeAreia] = useState<number>(3.5); // %
  const [umidadeBrita, setUmidadeBrita] = useState<number>(0.5); // %
  const [pesoAreiaSeca, setPesoAreiaSeca] = useState<number>(800); // kg
  const [pesoBritaSeca, setPesoBritaSeca] = useState<number>(950); // kg
  const [aguaInicial, setAguaInicial] = useState<number>(180); // kg

  // Estado para Registro de Ensaios (Evolução da Resistência)
  const [ensaios, setEnsaios] = useState([
    { idade: 1, resistencia: 12.5, cp1: 12.0, cp2: 13.0 },
    { idade: 3, resistencia: 22.0, cp1: 21.5, cp2: 22.5 },
    { idade: 7, resistencia: 32.0, cp1: 31.0, cp2: 33.0 },
    { idade: 28, resistencia: 45.0, cp1: 44.0, cp2: 46.0 },
  ]);

  // Cálculos de Umidade
  const calcularCorrecaoAgua = () => {
    const aguaNaAreia = pesoAreiaSeca * (umidadeAreia / 100);
    const aguaNaBrita = pesoBritaSeca * (umidadeBrita / 100);
    const aguaTotalAgregados = aguaNaAreia + aguaNaBrita;
    
    const aguaCorrigida = aguaInicial - aguaTotalAgregados;
    const areiaUmida = pesoAreiaSeca + aguaNaAreia;
    const britaUmida = pesoBritaSeca + aguaNaBrita;

    return {
      aguaNaAreia,
      aguaNaBrita,
      aguaCorrigida,
      areiaUmida,
      britaUmida
    };
  };

  const correcao = calcularCorrecaoAgua();

  // Funções para Ensaios
  const adicionarEnsaio = () => {
    setEnsaios([...ensaios, { idade: 0, resistencia: 0, cp1: 0, cp2: 0 }]);
  };

  const atualizarEnsaio = (index: number, campo: string, valor: number) => {
    const novosEnsaios = [...ensaios];
    novosEnsaios[index] = { ...novosEnsaios[index], [campo]: valor };
    
    // Recalcular média se alterar CP1 ou CP2
    if (campo === 'cp1' || campo === 'cp2') {
      const cp1 = campo === 'cp1' ? valor : novosEnsaios[index].cp1;
      const cp2 = campo === 'cp2' ? valor : novosEnsaios[index].cp2;
      novosEnsaios[index].resistencia = (cp1 + cp2) / 2;
    }
    
    setEnsaios(novosEnsaios);
  };

  const removerEnsaio = (index: number) => {
    setEnsaios(ensaios.filter((_, i) => i !== index));
  };

  return (
    <div className="container py-12">
      <div className="flex flex-col md:flex-row justify-between items-end mb-12 border-b border-border pb-6">
        <div>
          <h1 className="text-4xl font-bold uppercase tracking-tighter mb-2 flex items-center gap-3">
            <ClipboardList className="w-10 h-10 text-primary" />
            Controle Tecnológico
          </h1>
          <p className="text-muted-foreground font-mono text-sm">UMIDADE & RESISTÊNCIA</p>
        </div>
      </div>

      <Tabs defaultValue="umidade" className="space-y-8">
        <TabsList className="w-full justify-start rounded-none border-b border-border bg-transparent p-0 h-auto">
          <TabsTrigger value="umidade" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary px-6 py-3 font-bold uppercase tracking-wider">
            Ajuste de Umidade
          </TabsTrigger>
          <TabsTrigger value="resistencia" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary px-6 py-3 font-bold uppercase tracking-wider">
            Evolução da Resistência
          </TabsTrigger>
        </TabsList>

        <TabsContent value="umidade" className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Inputs */}
            <Card className="rounded-none border-border bg-card">
              <CardHeader className="bg-muted/20 border-b border-border">
                <CardTitle className="uppercase tracking-wide text-sm font-bold">Dados de Entrada</CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-xs uppercase font-bold text-muted-foreground">Umidade Areia (%)</Label>
                    <Input 
                      type="number" 
                      step="0.1"
                      value={umidadeAreia} 
                      onChange={(e) => setUmidadeAreia(Number(e.target.value))}
                      className="font-mono text-lg"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs uppercase font-bold text-muted-foreground">Peso Areia Seca (kg)</Label>
                    <Input 
                      type="number" 
                      value={pesoAreiaSeca} 
                      onChange={(e) => setPesoAreiaSeca(Number(e.target.value))}
                      className="font-mono text-lg"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs uppercase font-bold text-muted-foreground">Umidade Brita (%)</Label>
                    <Input 
                      type="number" 
                      step="0.1"
                      value={umidadeBrita} 
                      onChange={(e) => setUmidadeBrita(Number(e.target.value))}
                      className="font-mono text-lg"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs uppercase font-bold text-muted-foreground">Peso Brita Seca (kg)</Label>
                    <Input 
                      type="number" 
                      value={pesoBritaSeca} 
                      onChange={(e) => setPesoBritaSeca(Number(e.target.value))}
                      className="font-mono text-lg"
                    />
                  </div>
                </div>
                <div className="space-y-2 pt-4 border-t border-border">
                  <Label className="text-xs uppercase font-bold text-primary">Água de Amassamento Inicial (kg)</Label>
                  <Input 
                    type="number" 
                    value={aguaInicial} 
                    onChange={(e) => setAguaInicial(Number(e.target.value))}
                    className="font-mono text-xl font-bold border-primary"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Resultados */}
            <Card className="rounded-none border-primary bg-primary/5">
              <CardHeader className="bg-primary text-white border-b border-primary-foreground/20">
                <CardTitle className="uppercase tracking-wide text-lg font-bold flex items-center gap-2">
                  <Droplets className="w-6 h-6" />
                  Traço Corrigido
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8 space-y-8">
                <div className="flex justify-between items-center border-b border-primary/20 pb-4">
                  <span className="text-sm uppercase font-bold text-primary">Água a Adicionar</span>
                  <div className="text-right">
                    <span className="text-4xl font-mono font-bold text-primary">{correcao.aguaCorrigida.toFixed(1)}</span>
                    <span className="text-sm ml-2 font-bold text-primary">kg</span>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm uppercase text-muted-foreground">Areia Úmida (Corrigida)</span>
                    <span className="font-mono font-bold text-xl">{correcao.areiaUmida.toFixed(1)} kg</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm uppercase text-muted-foreground">Brita Úmida (Corrigida)</span>
                    <span className="font-mono font-bold text-xl">{correcao.britaUmida.toFixed(1)} kg</span>
                  </div>
                </div>

                <div className="bg-background/50 p-4 text-xs font-mono text-muted-foreground border border-primary/20">
                  <p>Desconto de água da areia: {correcao.aguaNaAreia.toFixed(1)} kg</p>
                  <p>Desconto de água da brita: {correcao.aguaNaBrita.toFixed(1)} kg</p>
                  <p className="mt-2 font-bold text-primary">Total descontado: {(correcao.aguaNaAreia + correcao.aguaNaBrita).toFixed(1)} kg</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="resistencia" className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Tabela de Ensaios */}
            <div className="lg:col-span-5 space-y-6">
              <Card className="rounded-none border-border bg-card">
                <CardHeader className="bg-muted/20 border-b border-border flex flex-row items-center justify-between">
                  <CardTitle className="uppercase tracking-wide text-sm font-bold">Registro de CPs</CardTitle>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => { exportarRelatorioEnsaios(ensaios); toast.success("Relatório exportado!"); }} className="rounded-none bg-muted hover:bg-primary hover:text-white text-foreground font-bold uppercase tracking-wider">
                      <FileSpreadsheet className="h-4 w-4 mr-2" /> Excel
                    </Button>
                    <Button size="sm" onClick={() => { exportarRelatorioEnsaiosCSV(ensaios); toast.success("Relatório CSV exportado!"); }} className="rounded-none bg-muted hover:bg-primary hover:text-white text-foreground font-bold uppercase tracking-wider">
                      <FileSpreadsheet className="h-4 w-4 mr-2" /> CSV
                    </Button>
                    <Button size="sm" onClick={adicionarEnsaio} className="rounded-none bg-primary hover:bg-white hover:text-black text-white font-bold uppercase tracking-wider">
                      <Plus className="h-4 w-4 mr-2" /> Idade
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="text-center w-16">Idade</TableHead>
                        <TableHead className="text-center">CP 1 (MPa)</TableHead>
                        <TableHead className="text-center">CP 2 (MPa)</TableHead>
                        <TableHead className="text-center font-bold text-primary">Média</TableHead>
                        <TableHead className="w-10"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {ensaios.sort((a,b) => a.idade - b.idade).map((ensaio, index) => (
                        <TableRow key={index} className="hover:bg-muted/50">
                          <TableCell className="p-2">
                            <Input 
                              type="number" 
                              value={ensaio.idade} 
                              onChange={(e) => atualizarEnsaio(index, 'idade', Number(e.target.value))}
                              className="h-8 text-center font-mono"
                            />
                          </TableCell>
                          <TableCell className="p-2">
                            <Input 
                              type="number" 
                              step="0.1"
                              value={ensaio.cp1} 
                              onChange={(e) => atualizarEnsaio(index, 'cp1', Number(e.target.value))}
                              className="h-8 text-center font-mono"
                            />
                          </TableCell>
                          <TableCell className="p-2">
                            <Input 
                              type="number" 
                              step="0.1"
                              value={ensaio.cp2} 
                              onChange={(e) => atualizarEnsaio(index, 'cp2', Number(e.target.value))}
                              className="h-8 text-center font-mono"
                            />
                          </TableCell>
                          <TableCell className="text-center font-mono font-bold text-primary">
                            {ensaio.resistencia.toFixed(1)}
                          </TableCell>
                          <TableCell className="p-2">
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => removerEnsaio(index)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>

            {/* Gráfico de Evolução */}
            <div className="lg:col-span-7 space-y-6">
              <Card className="rounded-none border-border bg-card h-[400px] flex flex-col">
                <CardHeader className="bg-muted/20 border-b border-border py-3">
                  <CardTitle className="uppercase tracking-wide text-sm font-bold">Curva de Evolução da Resistência</CardTitle>
                </CardHeader>
                <CardContent className="flex-1 p-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={ensaios.sort((a,b) => a.idade - b.idade)} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis 
                        dataKey="idade" 
                        type="number" 
                        domain={['dataMin', 'dataMax']} 
                        tickCount={6}
                        label={{ value: 'Idade (dias)', position: 'insideBottom', offset: -5, fill: 'var(--muted-foreground)', fontSize: 12 }} 
                        stroke="var(--muted-foreground)"
                        fontSize={12}
                      />
                      <YAxis 
                        label={{ value: 'Resistência (MPa)', angle: -90, position: 'insideLeft', fill: 'var(--muted-foreground)', fontSize: 12 }} 
                        stroke="var(--muted-foreground)"
                        fontSize={12}
                      />
                      <Tooltip 
                        contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', borderRadius: '0px' }}
                        itemStyle={{ color: 'var(--foreground)' }}
                        formatter={(value: number) => [`${value.toFixed(1)} MPa`, 'Resistência']}
                        labelFormatter={(label) => `${label} dias`}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="resistencia" 
                        stroke="var(--primary)" 
                        strokeWidth={3} 
                        dot={{ r: 4, fill: 'var(--primary)' }} 
                        activeDot={{ r: 6, fill: 'var(--primary)' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
