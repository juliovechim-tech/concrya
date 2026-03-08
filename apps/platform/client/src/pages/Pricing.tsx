import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Check, 
  X, 
  Zap, 
  Crown, 
  Rocket, 
  Star,
  ArrowRight,
  Shield,
  Clock,
  Users,
  Download,
  Calculator,
  FlaskConical,
  Beaker,
  FileSpreadsheet
} from "lucide-react";
import { Link } from "wouter";
import { useState } from "react";

export default function Pricing() {
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('yearly');

  const planos = [
    {
      id: "gratuito",
      nome: "Gratuito",
      descricao: "Para quem está começando a explorar dosagem de concreto",
      precoMensal: 0,
      precoAnual: 0,
      icon: Calculator,
      cor: "border-border",
      corBotao: "bg-muted hover:bg-primary hover:text-white text-foreground",
      popular: false,
      funcionalidades: [
        { nome: "Calculadora Básica completa", incluso: true },
        { nome: "Traços em latas e baldes", incluso: true },
        { nome: "Tabelas prontas", incluso: true },
        { nome: "Até 3 traços salvos", incluso: true },
        { nome: "Calculadora Técnica", incluso: false },
        { nome: "Curva de Abrams", incluso: false },
        { nome: "Exportação Excel/PDF", incluso: false },
        { nome: "Calculadora Avançada (CAA)", incluso: false },
        { nome: "Calculadora Científica (UHPC)", incluso: false },
        { nome: "Laboratório completo", incluso: false },
        { nome: "Suporte prioritário", incluso: false },
      ]
    },
    {
      id: "tecnico",
      nome: "Técnico",
      descricao: "Para engenheiros e concreteiras que precisam de precisão",
      precoMensal: 29.90,
      precoAnual: 249,
      icon: Beaker,
      cor: "border-blue-500/50",
      corBotao: "bg-blue-600 hover:bg-blue-700 text-white",
      popular: false,
      funcionalidades: [
        { nome: "Tudo do plano Gratuito", incluso: true },
        { nome: "Calculadora Técnica ABCP/ACI", incluso: true },
        { nome: "Curva de Abrams", incluso: true },
        { nome: "Traços ilimitados", incluso: true },
        { nome: "Exportação Excel", incluso: true },
        { nome: "Ajuste de umidade", incluso: true },
        { nome: "Carta traço", incluso: true },
        { nome: "Calculadora Avançada (CAA)", incluso: false },
        { nome: "Calculadora Científica (UHPC)", incluso: false },
        { nome: "Laboratório completo", incluso: false },
        { nome: "Suporte prioritário", incluso: false },
      ]
    },
    {
      id: "avancado",
      nome: "Avançado",
      descricao: "Para produção de CAA, HPC e pré-moldados de alta performance",
      precoMensal: 59.90,
      precoAnual: 499,
      icon: FlaskConical,
      cor: "border-primary",
      corBotao: "bg-primary hover:bg-white hover:text-black text-white",
      popular: true,
      funcionalidades: [
        { nome: "Tudo do plano Técnico", incluso: true },
        { nome: "Calculadora Avançada (CAA)", incluso: true },
        { nome: "Empacotamento de partículas", incluso: true },
        { nome: "Múltiplos agregados", incluso: true },
        { nome: "Laboratório: Bateladas", incluso: true },
        { nome: "Laboratório: Corte de Água", incluso: true },
        { nome: "Laboratório: Cadastro de Ensaios", incluso: true },
        { nome: "Exportação PDF profissional", incluso: true },
        { nome: "Calculadora Científica (UHPC)", incluso: false },
        { nome: "Metodologia de Larrard", incluso: false },
        { nome: "Suporte prioritário", incluso: false },
      ]
    },
    {
      id: "cientifico",
      nome: "Científico",
      descricao: "Acesso total: UHPC, Ductal, Larrard e suporte premium",
      precoMensal: 99.90,
      precoAnual: 899,
      icon: Rocket,
      cor: "border-purple-500/50",
      corBotao: "bg-purple-600 hover:bg-purple-700 text-white",
      popular: false,
      funcionalidades: [
        { nome: "Tudo do plano Avançado", incluso: true },
        { nome: "Calculadora Científica (UHPC)", incluso: true },
        { nome: "Metodologia Ductal/BSI/Ceracem", incluso: true },
        { nome: "Modelo de Larrard (MEC)", incluso: true },
        { nome: "Curvas Funk-Dinger", incluso: true },
        { nome: "BET & Blaine para finos", incluso: true },
        { nome: "Fibras metálicas e sintéticas", incluso: true },
        { nome: "Suporte prioritário WhatsApp", incluso: true },
        { nome: "Consultoria Express inclusa (1/mês)", incluso: true },
        { nome: "Acesso antecipado a novidades", incluso: true },
        { nome: "Badge de Mestre Científico", incluso: true },
      ]
    }
  ];

  const economia = (plano: typeof planos[0]) => {
    if (plano.precoMensal === 0) return 0;
    const custoAnualMensal = plano.precoMensal * 12;
    return Math.round(((custoAnualMensal - plano.precoAnual) / custoAnualMensal) * 100);
  };

  return (
    <div className="container py-12">
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto mb-12">
        <div className="inline-flex items-center gap-2 px-3 py-1 border border-primary/50 bg-primary/10 mb-6">
          <Star className="w-4 h-4 text-primary" />
          <span className="text-xs font-mono text-primary uppercase tracking-widest">7 dias grátis em todos os planos</span>
        </div>
        <h1 className="text-4xl md:text-6xl font-bold uppercase tracking-tighter mb-6">
          Escolha Seu <span className="text-primary">Plano</span>
        </h1>
        <p className="text-xl text-muted-foreground font-light mb-8">
          Do pedreiro ao cientista da NASA. Ferramentas profissionais de dosagem 
          para cada nível de expertise.
        </p>

        {/* Toggle Mensal/Anual */}
        <div className="inline-flex items-center gap-4 p-1 bg-muted/50 border border-border">
          <button
            onClick={() => setBillingPeriod('monthly')}
            className={`px-6 py-2 text-sm font-bold uppercase tracking-wider transition-all ${
              billingPeriod === 'monthly' 
                ? 'bg-primary text-white' 
                : 'text-muted-foreground hover:text-white'
            }`}
          >
            Mensal
          </button>
          <button
            onClick={() => setBillingPeriod('yearly')}
            className={`px-6 py-2 text-sm font-bold uppercase tracking-wider transition-all flex items-center gap-2 ${
              billingPeriod === 'yearly' 
                ? 'bg-primary text-white' 
                : 'text-muted-foreground hover:text-white'
            }`}
          >
            Anual
            <Badge variant="secondary" className="bg-green-500/20 text-green-400 text-xs">
              -30%
            </Badge>
          </button>
        </div>
      </div>

      {/* Planos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
        {planos.map((plano, index) => (
          <Card 
            key={index} 
            className={`rounded-none bg-card flex flex-col relative overflow-hidden transition-all duration-300 hover:scale-[1.02] ${plano.cor} ${plano.popular ? 'shadow-lg shadow-primary/20 border-2' : 'border'}`}
          >
            {plano.popular && (
              <div className="absolute top-0 left-0 right-0 bg-primary text-white text-xs font-bold uppercase py-2 text-center">
                Mais Popular
              </div>
            )}
            <CardHeader className={plano.popular ? 'pt-12' : ''}>
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-12 h-12 flex items-center justify-center ${plano.popular ? 'bg-primary/20' : 'bg-muted'}`}>
                  <plano.icon className={`w-6 h-6 ${plano.popular ? 'text-primary' : 'text-muted-foreground'}`} />
                </div>
                <div>
                  <CardTitle className="text-xl font-bold uppercase tracking-tight">{plano.nome}</CardTitle>
                </div>
              </div>
              <CardDescription className="text-sm min-h-[40px]">{plano.descricao}</CardDescription>
            </CardHeader>
            <CardContent className="flex-1">
              <div className="mb-6">
                {plano.precoMensal === 0 ? (
                  <div className="text-4xl font-bold text-primary">Grátis</div>
                ) : (
                  <>
                    <div className="flex items-baseline gap-1">
                      <span className="text-sm text-muted-foreground">R$</span>
                      <span className="text-4xl font-bold text-primary">
                        {billingPeriod === 'monthly' 
                          ? plano.precoMensal.toFixed(2).replace('.', ',')
                          : (plano.precoAnual / 12).toFixed(2).replace('.', ',')
                        }
                      </span>
                      <span className="text-sm text-muted-foreground">/mês</span>
                    </div>
                    {billingPeriod === 'yearly' && plano.precoAnual > 0 && (
                      <div className="text-xs text-muted-foreground mt-1">
                        R$ {plano.precoAnual.toFixed(2).replace('.', ',')} cobrado anualmente
                        <span className="text-green-400 ml-2">({economia(plano)}% off)</span>
                      </div>
                    )}
                  </>
                )}
              </div>

              <ul className="space-y-2">
                {plano.funcionalidades.map((func, i) => (
                  <li key={i} className={`flex items-start gap-2 text-sm ${func.incluso ? 'text-foreground' : 'text-muted-foreground/50'}`}>
                    {func.incluso ? (
                      <Check className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                    ) : (
                      <X className="w-4 h-4 text-muted-foreground/30 shrink-0 mt-0.5" />
                    )}
                    {func.nome}
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter>
              <Button 
                className={`w-full font-bold uppercase tracking-wider rounded-none h-12 ${plano.corBotao}`}
                asChild
              >
                <Link href={plano.precoMensal === 0 ? "/" : "/planos"}>
                  {plano.precoMensal === 0 ? 'Começar Grátis' : 'Assinar Agora'}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      {/* Garantias */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
        <div className="flex items-start gap-4 p-6 border border-border bg-card">
          <Shield className="w-10 h-10 text-primary shrink-0" />
          <div>
            <h3 className="font-bold uppercase text-sm mb-2">Garantia de 7 Dias</h3>
            <p className="text-sm text-muted-foreground">
              Teste qualquer plano por 7 dias. Se não gostar, devolvemos 100% do valor.
            </p>
          </div>
        </div>
        <div className="flex items-start gap-4 p-6 border border-border bg-card">
          <Clock className="w-10 h-10 text-primary shrink-0" />
          <div>
            <h3 className="font-bold uppercase text-sm mb-2">Cancele Quando Quiser</h3>
            <p className="text-sm text-muted-foreground">
              Sem fidelidade, sem burocracia. Cancele sua assinatura a qualquer momento.
            </p>
          </div>
        </div>
        <div className="flex items-start gap-4 p-6 border border-border bg-card">
          <Users className="w-10 h-10 text-primary shrink-0" />
          <div>
            <h3 className="font-bold uppercase text-sm mb-2">Suporte Humanizado</h3>
            <p className="text-sm text-muted-foreground">
              Equipe técnica real pronta para ajudar. Nada de robôs ou respostas automáticas.
            </p>
          </div>
        </div>
      </div>

      {/* FAQ Rápido */}
      <div className="bg-muted/10 border border-border p-8 md:p-12 text-center">
        <h2 className="text-2xl font-bold uppercase tracking-tighter mb-4">Ainda tem dúvidas?</h2>
        <p className="text-muted-foreground max-w-2xl mx-auto mb-6">
          Confira nossa página de perguntas frequentes ou fale diretamente conosco.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button variant="outline" className="border-primary text-primary hover:bg-primary hover:text-white font-bold uppercase tracking-wider h-12 px-8 rounded-none" asChild>
            <Link href="/faq">
              Ver FAQ
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button className="bg-green-600 hover:bg-green-700 text-white font-bold uppercase tracking-wider h-12 px-8 rounded-none" asChild>
            <a href="https://wa.me/5511982618300" target="_blank" rel="noreferrer">
              Falar no WhatsApp
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
}
