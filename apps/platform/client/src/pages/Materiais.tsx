import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Plus, Save, Database, Calculator, Package, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import { exportarFichaDosagem, exportarFichaDosagemCSV } from "@/lib/excel-export";

interface Material {
  id: string;
  nome: string;
  tipo: 'cimento' | 'areia' | 'brita' | 'aditivo' | 'agua' | 'pigmento' | 'fibra';
  densidade: number; // kg/dm³
  custo: number; // R$/kg
  fornecedor: string;
}

export default function Materiais() {
  // Banco de dados inicial de materiais
  const [materiais, setMateriais] = useState<Material[]>([
    { id: '1', nome: 'Cimento CPV-ARI', tipo: 'cimento', densidade: 3.10, custo: 0.65, fornecedor: 'Votorantim' },
    { id: '2', nome: 'Areia Média Quartzosa', tipo: 'areia', densidade: 2.65, custo: 0.12, fornecedor: 'Porto de Areia' },
    { id: '3', nome: 'Brita 0', tipo: 'brita', densidade: 2.72, custo: 0.09, fornecedor: 'Pedreira Local' },
    { id: '4', nome: 'Brita 1', tipo: 'brita', densidade: 2.72, custo: 0.08, fornecedor: 'Pedreira Local' },
    { id: '5', nome: 'Água Potável', tipo: 'agua', densidade: 1.00, custo: 0.01, fornecedor: 'Sabesp' },
    { id: '6', nome: 'Superplastificante', tipo: 'aditivo', densidade: 1.10, custo: 15.00, fornecedor: 'MC Bauchemie' },
    { id: '7', nome: 'Sílica Ativa', tipo: 'aditivo', densidade: 2.20, custo: 4.50, fornecedor: 'Tecnosil' },
  ]);

  // Estado para cálculo de traço
  const [volumeDesejado, setVolumeDesejado] = useState<number>(150); // Litros (massada)
  const [tracoSelecionado, setTracoSelecionado] = useState({
    cimento: '1',
    areia: '2',
    brita: '3',
    agua: '5',
    aditivo: '6'
  });
  
  // Proporções do traço (1 : m : a/c)
  const [proporcoes, setProporcoes] = useState({
    cimento: 1,
    areia: 2.2,
    brita: 2.8,
    agua: 0.55,
    aditivo: 0.01 // % sobre cimento
  });

  const adicionarMaterial = () => {
    const novo: Material = {
      id: Date.now().toString(),
      nome: 'Novo Material',
      tipo: 'areia',
      densidade: 2.65,
      custo: 0.00,
      fornecedor: '-'
    };
    setMateriais([...materiais, novo]);
  };

  const atualizarMaterial = (id: string, campo: keyof Material, valor: any) => {
    setMateriais(materiais.map(m => m.id === id ? { ...m, [campo]: valor } : m));
  };

  const removerMaterial = (id: string) => {
    setMateriais(materiais.filter(m => m.id !== id));
  };

  // Cálculo do traço
  const calcularMassada = () => {
    // Encontrar materiais selecionados
    const matCimento = materiais.find(m => m.id === tracoSelecionado.cimento);
    const matAreia = materiais.find(m => m.id === tracoSelecionado.areia);
    const matBrita = materiais.find(m => m.id === tracoSelecionado.brita);
    const matAgua = materiais.find(m => m.id === tracoSelecionado.agua);
    const matAditivo = materiais.find(m => m.id === tracoSelecionado.aditivo);

    if (!matCimento || !matAreia || !matBrita || !matAgua) return null;

    // Volume absoluto unitário (para 1kg de cimento)
    // V = M / D
    const volCimento = 1 / matCimento.densidade;
    const volAreia = proporcoes.areia / matAreia.densidade;
    const volBrita = proporcoes.brita / matBrita.densidade;
    const volAgua = proporcoes.agua / matAgua.densidade;
    const volAditivo = (proporcoes.aditivo * 1) / (matAditivo?.densidade || 1);

    const volTotalUnitario = volCimento + volAreia + volBrita + volAgua + volAditivo; // dm³

    // Fator de escala para o volume desejado
    // Volume desejado em dm³ (litros)
    const fator = volumeDesejado / volTotalUnitario;

    return {
      cimento: (1 * fator).toFixed(2),
      areia: (proporcoes.areia * fator).toFixed(2),
      brita: (proporcoes.brita * fator).toFixed(2),
      agua: (proporcoes.agua * fator).toFixed(2),
      aditivo: (proporcoes.aditivo * fator).toFixed(3),
      custoTotal: (
        (1 * fator * matCimento.custo) +
        (proporcoes.areia * fator * matAreia.custo) +
        (proporcoes.brita * fator * matBrita.custo) +
        (proporcoes.agua * fator * matAgua.custo) +
        (proporcoes.aditivo * fator * (matAditivo?.custo || 0))
      ).toFixed(2)
    };
  };

  const resultado = calcularMassada();

  return (
    <div className="container py-12">
      <div className="flex flex-col md:flex-row justify-between items-end mb-12 border-b border-border pb-6">
        <div>
          <h1 className="text-4xl font-bold uppercase tracking-tighter mb-2 flex items-center gap-3">
            <Database className="w-10 h-10 text-primary" />
            Gestão de Materiais
          </h1>
          <p className="text-muted-foreground font-mono text-sm">BANCO DE DADOS E CÁLCULO DE MASSADA</p>
        </div>
      </div>

      <Tabs defaultValue="calculo" className="space-y-8">
        <TabsList className="w-full justify-start rounded-none border-b border-border bg-transparent p-0 h-auto">
          <TabsTrigger value="calculo" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary px-6 py-3 font-bold uppercase tracking-wider">
            Cálculo de Massada
          </TabsTrigger>
          <TabsTrigger value="materiais" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary px-6 py-3 font-bold uppercase tracking-wider">
            Banco de Materiais
          </TabsTrigger>
        </TabsList>

        <TabsContent value="calculo" className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Configuração do Traço */}
            <div className="lg:col-span-4 space-y-6">
              <Card className="rounded-none border-border bg-card">
                <CardHeader className="bg-muted/20 border-b border-border">
                  <CardTitle className="uppercase tracking-wide text-sm font-bold">Seleção de Materiais</CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs uppercase font-bold text-muted-foreground">Cimento</Label>
                    <Select value={tracoSelecionado.cimento} onValueChange={(v) => setTracoSelecionado({...tracoSelecionado, cimento: v})}>
                      <SelectTrigger className="rounded-none"><SelectValue /></SelectTrigger>
                      <SelectContent className="rounded-none">
                        {materiais.filter(m => m.tipo === 'cimento').map(m => (
                          <SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs uppercase font-bold text-muted-foreground">Areia</Label>
                    <Select value={tracoSelecionado.areia} onValueChange={(v) => setTracoSelecionado({...tracoSelecionado, areia: v})}>
                      <SelectTrigger className="rounded-none"><SelectValue /></SelectTrigger>
                      <SelectContent className="rounded-none">
                        {materiais.filter(m => m.tipo === 'areia').map(m => (
                          <SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs uppercase font-bold text-muted-foreground">Brita</Label>
                    <Select value={tracoSelecionado.brita} onValueChange={(v) => setTracoSelecionado({...tracoSelecionado, brita: v})}>
                      <SelectTrigger className="rounded-none"><SelectValue /></SelectTrigger>
                      <SelectContent className="rounded-none">
                        {materiais.filter(m => m.tipo === 'brita').map(m => (
                          <SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs uppercase font-bold text-muted-foreground">Aditivo</Label>
                    <Select value={tracoSelecionado.aditivo} onValueChange={(v) => setTracoSelecionado({...tracoSelecionado, aditivo: v})}>
                      <SelectTrigger className="rounded-none"><SelectValue /></SelectTrigger>
                      <SelectContent className="rounded-none">
                        {materiais.filter(m => m.tipo === 'aditivo').map(m => (
                          <SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-none border-border bg-card">
                <CardHeader className="bg-muted/20 border-b border-border">
                  <CardTitle className="uppercase tracking-wide text-sm font-bold">Proporções (em massa)</CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs uppercase font-bold text-muted-foreground">Cimento</Label>
                      <Input value="1.0" disabled className="font-mono bg-muted" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs uppercase font-bold text-muted-foreground">Areia (m)</Label>
                      <Input 
                        type="number" 
                        value={proporcoes.areia} 
                        onChange={(e) => setProporcoes({...proporcoes, areia: Number(e.target.value)})}
                        className="font-mono" 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs uppercase font-bold text-muted-foreground">Brita (m)</Label>
                      <Input 
                        type="number" 
                        value={proporcoes.brita} 
                        onChange={(e) => setProporcoes({...proporcoes, brita: Number(e.target.value)})}
                        className="font-mono" 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs uppercase font-bold text-muted-foreground">Água (a/c)</Label>
                      <Input 
                        type="number" 
                        value={proporcoes.agua} 
                        onChange={(e) => setProporcoes({...proporcoes, agua: Number(e.target.value)})}
                        className="font-mono text-primary font-bold" 
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Resultados */}
            <div className="lg:col-span-8 space-y-6">
              <Card className="rounded-none border-primary bg-card h-full flex flex-col">
                <CardHeader className="bg-primary text-white border-b border-primary-foreground/20">
                  <div className="flex justify-between items-center">
                    <CardTitle className="uppercase tracking-wide text-lg font-bold flex items-center gap-2">
                      <Package className="w-6 h-6" />
                      Ficha de Pesagem
                    </CardTitle>
                    <div className="flex items-center gap-2 bg-white/10 px-3 py-1 rounded-sm">
                      <span className="text-xs font-mono uppercase">Volume da Massada:</span>
                      <Input 
                        type="number" 
                        value={volumeDesejado} 
                        onChange={(e) => setVolumeDesejado(Number(e.target.value))}
                        className="w-20 h-6 bg-transparent border-none text-white font-bold font-mono text-right p-0 focus-visible:ring-0"
                      />
                      <span className="text-xs font-mono">Litros</span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-8 flex-1 flex flex-col justify-center">
                  {resultado && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      <div className="bg-muted/10 border border-border p-6 text-center hover:border-primary transition-colors">
                        <span className="block text-xs uppercase text-muted-foreground mb-2 font-bold tracking-widest">Cimento</span>
                        <div className="text-5xl font-mono font-bold text-foreground mb-1">{resultado.cimento}</div>
                        <span className="text-sm text-muted-foreground">kg</span>
                      </div>
                      
                      <div className="bg-muted/10 border border-border p-6 text-center hover:border-primary transition-colors">
                        <span className="block text-xs uppercase text-muted-foreground mb-2 font-bold tracking-widest">Areia</span>
                        <div className="text-5xl font-mono font-bold text-foreground mb-1">{resultado.areia}</div>
                        <span className="text-sm text-muted-foreground">kg</span>
                      </div>

                      <div className="bg-muted/10 border border-border p-6 text-center hover:border-primary transition-colors">
                        <span className="block text-xs uppercase text-muted-foreground mb-2 font-bold tracking-widest">Brita</span>
                        <div className="text-5xl font-mono font-bold text-foreground mb-1">{resultado.brita}</div>
                        <span className="text-sm text-muted-foreground">kg</span>
                      </div>

                      <div className="bg-primary/5 border border-primary/30 p-6 text-center hover:bg-primary/10 transition-colors col-span-1 md:col-span-2 lg:col-span-1">
                        <span className="block text-xs uppercase text-primary mb-2 font-bold tracking-widest">Água</span>
                        <div className="text-5xl font-mono font-bold text-primary mb-1">{resultado.agua}</div>
                        <span className="text-sm text-primary/80">kg (Litros)</span>
                      </div>

                      <div className="bg-muted/10 border border-border p-6 text-center hover:border-primary transition-colors col-span-1 md:col-span-2 lg:col-span-2">
                        <span className="block text-xs uppercase text-muted-foreground mb-2 font-bold tracking-widest">Aditivo</span>
                        <div className="text-5xl font-mono font-bold text-foreground mb-1">{resultado.aditivo}</div>
                        <span className="text-sm text-muted-foreground">kg</span>
                      </div>
                    </div>
                  )}
                  
                  <div className="mt-8 pt-6 border-t border-border flex justify-between items-center">
                    <div>
                      <span className="text-xs uppercase text-muted-foreground font-bold tracking-widest block">Custo Estimado</span>
                      <span className="text-3xl font-mono font-bold text-foreground">R$ {resultado?.custoTotal}</span>
                    </div>
                    <Button 
                      onClick={() => {
                        if (resultado) {
                          exportarFichaDosagem({
                            volume: volumeDesejado,
                            cimento: resultado.cimento,
                            custoCimento: (Number(resultado.cimento) * (materiais.find(m => m.id === tracoSelecionado.cimento)?.custo || 0)).toFixed(2),
                            areia: resultado.areia,
                            custoAreia: (Number(resultado.areia) * (materiais.find(m => m.id === tracoSelecionado.areia)?.custo || 0)).toFixed(2),
                            brita: resultado.brita,
                            custoBrita: (Number(resultado.brita) * (materiais.find(m => m.id === tracoSelecionado.brita)?.custo || 0)).toFixed(2),
                            agua: resultado.agua,
                            custoAgua: (Number(resultado.agua) * (materiais.find(m => m.id === tracoSelecionado.agua)?.custo || 0)).toFixed(2),
                            aditivo: resultado.aditivo,
                            custoAditivo: (Number(resultado.aditivo) * (materiais.find(m => m.id === tracoSelecionado.aditivo)?.custo || 0)).toFixed(2),
                            custoTotal: resultado.custoTotal
                          });
                          toast.success("Ficha exportada com sucesso!");
                        }
                      }}
                      className="bg-foreground text-background hover:bg-primary hover:text-white font-bold uppercase tracking-wider rounded-none h-12 px-8"
                    >
                      <FileSpreadsheet className="mr-2 h-4 w-4" />
                      Exportar Excel
                    </Button>
                    <Button 
                      onClick={() => {
                        if (resultado) {
                          exportarFichaDosagemCSV({
                            volume: volumeDesejado,
                            cimento: resultado.cimento,
                            custoCimento: (Number(resultado.cimento) * (materiais.find(m => m.id === tracoSelecionado.cimento)?.custo || 0)).toFixed(2),
                            areia: resultado.areia,
                            custoAreia: (Number(resultado.areia) * (materiais.find(m => m.id === tracoSelecionado.areia)?.custo || 0)).toFixed(2),
                            brita: resultado.brita,
                            custoBrita: (Number(resultado.brita) * (materiais.find(m => m.id === tracoSelecionado.brita)?.custo || 0)).toFixed(2),
                            agua: resultado.agua,
                            custoAgua: (Number(resultado.agua) * (materiais.find(m => m.id === tracoSelecionado.agua)?.custo || 0)).toFixed(2),
                            aditivo: resultado.aditivo,
                            custoAditivo: (Number(resultado.aditivo) * (materiais.find(m => m.id === tracoSelecionado.aditivo)?.custo || 0)).toFixed(2),
                            custoTotal: resultado.custoTotal
                          });
                          toast.success("Ficha CSV exportada com sucesso!");
                        }
                      }}
                      className="bg-muted text-foreground hover:bg-primary hover:text-white font-bold uppercase tracking-wider rounded-none h-12 px-8 ml-2"
                    >
                      <FileSpreadsheet className="mr-2 h-4 w-4" />
                      CSV (Seguro)
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="materiais">
          <Card className="rounded-none border-border bg-card">
            <CardHeader className="bg-muted/20 border-b border-border flex flex-row items-center justify-between">
              <div>
                <CardTitle className="uppercase tracking-wide text-sm font-bold">Banco de Dados</CardTitle>
                <CardDescription className="text-xs">Gerencie seus insumos e custos</CardDescription>
              </div>
              <Button size="sm" onClick={adicionarMaterial} className="rounded-none bg-primary hover:bg-white hover:text-black text-white font-bold uppercase tracking-wider">
                <Plus className="h-4 w-4 mr-2" /> Novo Material
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-[300px]">Material</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-right">Densidade (kg/dm³)</TableHead>
                    <TableHead className="text-right">Custo (R$/kg)</TableHead>
                    <TableHead>Fornecedor</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {materiais.map((material) => (
                    <TableRow key={material.id} className="hover:bg-muted/50">
                      <TableCell className="font-medium">
                        <Input 
                          value={material.nome} 
                          onChange={(e) => atualizarMaterial(material.id, 'nome', e.target.value)}
                          className="h-8 border-transparent hover:border-border focus:border-primary bg-transparent"
                        />
                      </TableCell>
                      <TableCell>
                        <Select 
                          value={material.tipo} 
                          onValueChange={(v) => atualizarMaterial(material.id, 'tipo', v)}
                        >
                          <SelectTrigger className="h-8 border-transparent hover:border-border focus:border-primary bg-transparent w-[120px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="cimento">Cimento</SelectItem>
                            <SelectItem value="areia">Areia</SelectItem>
                            <SelectItem value="brita">Brita</SelectItem>
                            <SelectItem value="agua">Água</SelectItem>
                            <SelectItem value="aditivo">Aditivo</SelectItem>
                            <SelectItem value="pigmento">Pigmento</SelectItem>
                            <SelectItem value="fibra">Fibra</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-right">
                        <Input 
                          type="number" 
                          step="0.01"
                          value={material.densidade} 
                          onChange={(e) => atualizarMaterial(material.id, 'densidade', Number(e.target.value))}
                          className="h-8 border-transparent hover:border-border focus:border-primary bg-transparent text-right font-mono"
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Input 
                          type="number" 
                          step="0.01"
                          value={material.custo} 
                          onChange={(e) => atualizarMaterial(material.id, 'custo', Number(e.target.value))}
                          className="h-8 border-transparent hover:border-border focus:border-primary bg-transparent text-right font-mono"
                        />
                      </TableCell>
                      <TableCell>
                        <Input 
                          value={material.fornecedor} 
                          onChange={(e) => atualizarMaterial(material.id, 'fornecedor', e.target.value)}
                          className="h-8 border-transparent hover:border-border focus:border-primary bg-transparent"
                        />
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => removerMaterial(material.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
