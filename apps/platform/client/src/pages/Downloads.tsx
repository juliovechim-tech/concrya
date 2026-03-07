import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { 
  ArrowLeft, 
  Download, 
  FileSpreadsheet, 
  Gift, 
  CheckCircle, 
  Mail,
  Lock,
  Sparkles,
  AlertTriangle,
  BookOpen,
  Calculator,
  Beaker
} from "lucide-react";
import { Link } from "wouter";
import { toast } from "sonner";
import { motion } from "framer-motion";

const brindes = [
  {
    id: "planilha-profissional",
    titulo: "Planilha Profissional Mestres do Concreto",
    descricao: "Planilha completa com identidade visual Mestres do Concreto. Inclui cadastro de materiais, cálculo de traço, correção de água para sílica em suspensão e hyperlinks para nossas redes. Senha: mestres2024",
    arquivo: "/downloads/MESTRES-Dosagem-Profissional.xlsx",
    tipo: "Excel",
    tamanho: "20 KB",
    icon: FileSpreadsheet,
    destaque: true,
    correcoesAplicadas: [
      "Identidade visual Mestres do Concreto (laranja, preto, branco)",
      "Hyperlinks para site, Instagram e WhatsApp",
      "Cálculo automático de desconto de água da sílica",
      "Proteção por senha (mestres2024)",
      "Cadastro de até 10 materiais com propriedades completas"
    ],
    liberado: true, // Brinde gratuito
  },
  {
    id: "tabela-slump",
    titulo: "Tabela de Slump por Aplicação",
    descricao: "Tabela completa com faixas de slump recomendadas para cada tipo de aplicação: fundações, pilares, vigas, lajes, pisos, etc.",
    arquivo: "/downloads/tabela-slump.pdf",
    tipo: "PDF",
    tamanho: "150 KB",
    icon: BookOpen,
    destaque: false,
    liberado: false, // Requer cadastro
  },
  {
    id: "calculadora-abrams",
    titulo: "Calculadora Curva de Abrams",
    descricao: "Planilha para calibração da curva de Abrams com seus próprios dados de ensaio. Calcula k1, k2 e R² automaticamente.",
    arquivo: "/downloads/calculadora-abrams.xlsx",
    tipo: "Excel",
    tamanho: "35 KB",
    icon: Calculator,
    destaque: false,
    liberado: false, // Requer cadastro
  },
  {
    id: "guia-uhpc",
    titulo: "Guia Introdutório UHPC",
    descricao: "E-book com os fundamentos do concreto de ultra-alto desempenho: materiais, proporções típicas e metodologia de dosagem.",
    arquivo: "/downloads/guia-uhpc.pdf",
    tipo: "PDF",
    tamanho: "2.5 MB",
    icon: Beaker,
    destaque: false,
    liberado: false, // Requer cadastro
  },
];

export default function Downloads() {
  const [email, setEmail] = useState("");
  const [nome, setNome] = useState("");
  const [cadastrado, setCadastrado] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleCadastro = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !nome) {
      toast.error("Preencha todos os campos");
      return;
    }
    
    setLoading(true);
    // Simular envio (em produção, enviaria para API)
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    setCadastrado(true);
    setLoading(false);
    toast.success("Cadastro realizado! Todos os materiais foram liberados.");
  };

  const handleDownload = (brinde: typeof brindes[0]) => {
    if (!brinde.liberado && !cadastrado) {
      toast.error("Cadastre-se para liberar este material");
      return;
    }
    
    // Verificar se arquivo existe
    if (brinde.arquivo.includes("MESTRES-Dosagem")) {
      // Arquivo real - fazer download
      const link = document.createElement("a");
      link.href = brinde.arquivo;
      link.download = brinde.arquivo.split("/").pop() || "download";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success(`Download iniciado: ${brinde.titulo}`);
    } else {
      // Arquivo placeholder
      toast.info("Este material estará disponível em breve!");
    }
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
                <Gift className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold uppercase tracking-tight">Downloads</h1>
                <p className="text-xs text-muted-foreground">Materiais Gratuitos</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container py-8">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-500/10 border border-orange-500/20 mb-4">
            <Sparkles className="w-4 h-4 text-orange-500" />
            <span className="text-sm font-medium text-orange-500">Materiais Exclusivos</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-black uppercase tracking-tighter mb-4">
            Ferramentas para <span className="text-orange-500">Mestres</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Baixe planilhas, calculadoras e guias desenvolvidos pela equipe Mestres do Concreto. 
            Materiais técnicos de qualidade para elevar seu trabalho.
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Lista de Downloads */}
          <div className="lg:col-span-2 space-y-4">
            {brindes.map((brinde, index) => (
              <motion.div
                key={brinde.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className={`relative overflow-hidden ${brinde.destaque ? 'border-orange-500/50 bg-orange-500/5' : ''}`}>
                  {brinde.destaque && (
                    <div className="absolute top-0 right-0 bg-orange-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
                      DESTAQUE
                    </div>
                  )}
                  <CardContent className="p-6">
                    <div className="flex gap-4">
                      <div className={`w-14 h-14 rounded-xl flex items-center justify-center shrink-0 ${
                        brinde.destaque 
                          ? 'bg-gradient-to-br from-orange-500 to-amber-600' 
                          : 'bg-muted'
                      }`}>
                        <brinde.icon className={`w-7 h-7 ${brinde.destaque ? 'text-white' : 'text-muted-foreground'}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4 mb-2">
                          <div>
                            <h3 className="font-bold text-lg">{brinde.titulo}</h3>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="secondary" className="text-xs">{brinde.tipo}</Badge>
                              <span className="text-xs text-muted-foreground">{brinde.tamanho}</span>
                              {brinde.liberado ? (
                                <Badge className="bg-green-500 text-xs">
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  Gratuito
                                </Badge>
                              ) : cadastrado ? (
                                <Badge className="bg-green-500 text-xs">
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  Liberado
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-xs">
                                  <Lock className="w-3 h-3 mr-1" />
                                  Requer cadastro
                                </Badge>
                              )}
                            </div>
                          </div>
                          <Button
                            onClick={() => handleDownload(brinde)}
                            disabled={!brinde.liberado && !cadastrado}
                            className={brinde.destaque ? 'bg-orange-500 hover:bg-orange-600' : ''}
                          >
                            <Download className="w-4 h-4 mr-2" />
                            Baixar
                          </Button>
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">{brinde.descricao}</p>
                        
                        {brinde.correcoesAplicadas && (
                          <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 mt-3">
                            <h4 className="text-xs font-bold text-green-600 mb-2 flex items-center gap-1">
                              <CheckCircle className="w-3 h-3" />
                              CORREÇÕES APLICADAS:
                            </h4>
                            <ul className="text-xs text-muted-foreground space-y-1">
                              {brinde.correcoesAplicadas.map((correcao, i) => (
                                <li key={i} className="flex items-start gap-2">
                                  <span className="text-green-500">✓</span>
                                  {correcao}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Formulário de Cadastro */}
          <div className="lg:col-span-1">
            <Card className="sticky top-24">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {cadastrado ? (
                    <>
                      <CheckCircle className="w-5 h-5 text-green-500" />
                      Acesso Liberado!
                    </>
                  ) : (
                    <>
                      <Mail className="w-5 h-5 text-orange-500" />
                      Libere Todos os Materiais
                    </>
                  )}
                </CardTitle>
                <CardDescription>
                  {cadastrado 
                    ? "Você tem acesso a todos os materiais disponíveis."
                    : "Cadastre-se gratuitamente para acessar todos os downloads."
                  }
                </CardDescription>
              </CardHeader>
              <CardContent>
                {cadastrado ? (
                  <div className="text-center py-4">
                    <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
                      <CheckCircle className="w-8 h-8 text-green-500" />
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">
                      Obrigado, <strong>{nome}</strong>! Todos os materiais foram liberados para você.
                    </p>
                    <Separator className="my-4" />
                    <p className="text-xs text-muted-foreground">
                      Você receberá novidades e materiais exclusivos no email cadastrado.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleCadastro} className="space-y-4">
                    <div>
                      <Label htmlFor="nome">Nome</Label>
                      <Input
                        id="nome"
                        value={nome}
                        onChange={(e) => setNome(e.target.value)}
                        placeholder="Seu nome"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="seu@email.com"
                        required
                      />
                    </div>
                    <Button type="submit" className="w-full bg-orange-500 hover:bg-orange-600" disabled={loading}>
                      {loading ? "Cadastrando..." : "Liberar Downloads"}
                    </Button>
                    <p className="text-xs text-muted-foreground text-center">
                      Ao cadastrar, você concorda em receber comunicações da Mestres do Concreto.
                    </p>
                  </form>
                )}
              </CardContent>
            </Card>

            {/* Aviso sobre planilha */}
            <Card className="mt-4 border-amber-500/50 bg-amber-500/5">
              <CardContent className="p-4">
                <div className="flex gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-sm mb-1">Sobre a Planilha Corrigida</h4>
                    <p className="text-xs text-muted-foreground">
                      A planilha de dosagem foi corrigida para resolver erros de cálculo quando se adiciona sílica. 
                      Os principais problemas corrigidos foram: erro de parênteses na fórmula de massa e uso de densidade incorreta para cálculo de volume.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
