import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  CheckCircle, 
  Play, 
  Star, 
  Users, 
  Award, 
  Zap,
  Shield,
  Clock,
  TrendingUp,
  Calculator,
  FileSpreadsheet,
  FlaskConical,
  Rocket,
  ArrowRight,
  Gift,
  Timer,
  BadgeCheck
} from "lucide-react";
import { Link } from "wouter";

export default function LandingVendas() {
  // URL do Hotmart - substituir pelo link real
  const HOTMART_URL = "https://pay.hotmart.com/SEU_PRODUTO_AQUI";
  
  const beneficios = [
    { icon: Calculator, titulo: "4 Calculadoras Completas", desc: "Do básico ao científico UHPC" },
    { icon: FileSpreadsheet, titulo: "Exportação Excel", desc: "Baixe traços em planilha profissional" },
    { icon: FlaskConical, titulo: "Laboratório Integrado", desc: "Bateladas, corte de água e ensaios" },
    { icon: TrendingUp, titulo: "Curva de Abrams", desc: "Otimize resistência vs. custo" },
    { icon: Shield, titulo: "Traços Ilimitados", desc: "Salve e organize todos seus traços" },
    { icon: Zap, titulo: "Atualizações Gratuitas", desc: "Novas funcionalidades sem custo extra" },
  ];

  const depoimentos = [
    {
      nome: "Carlos Silva",
      cargo: "Engenheiro de Produção",
      empresa: "Concreteira ABC",
      texto: "Reduzi o custo do traço em 15% mantendo a mesma resistência. A ferramenta se pagou no primeiro mês!",
      avatar: "CS",
      estrelas: 5
    },
    {
      nome: "Maria Santos",
      cargo: "Diretora Técnica",
      empresa: "Pré-moldados XYZ",
      texto: "O projeto de dosagem para CAA revolucionou nossa produção. Acabamento perfeito e sem segregação.",
      avatar: "MS",
      estrelas: 5
    },
    {
      nome: "Roberto Oliveira",
      cargo: "Proprietário",
      empresa: "Artefatos de Concreto RO",
      texto: "Ferramenta indispensável! Economizo horas de cálculo toda semana e os traços saem perfeitos.",
      avatar: "RO",
      estrelas: 5
    }
  ];

  const garantias = [
    { icon: Shield, titulo: "7 Dias de Garantia", desc: "Não gostou? Devolvemos 100% do valor" },
    { icon: Clock, titulo: "Acesso Imediato", desc: "Comece a usar em menos de 2 minutos" },
    { icon: BadgeCheck, titulo: "Suporte Técnico", desc: "Tire dúvidas com especialistas" },
  ];

  const comparativo = [
    { feature: "Calculadora Básica (traço em latas)", gratuito: true, pago: true },
    { feature: "Calculadora Técnica (ABCP/ACI)", gratuito: false, pago: true },
    { feature: "Calculadora Avançada (CAA, empacotamento)", gratuito: false, pago: true },
    { feature: "Calculadora Científica (UHPC, Larrard)", gratuito: false, pago: true },
    { feature: "Traços salvos ilimitados", gratuito: false, pago: true },
    { feature: "Exportação para Excel", gratuito: false, pago: true },
    { feature: "Laboratório (bateladas, ensaios)", gratuito: false, pago: true },
    { feature: "Curva de Abrams", gratuito: false, pago: true },
    { feature: "Suporte prioritário", gratuito: false, pago: true },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative py-20 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent" />
        <div className="container max-w-5xl mx-auto relative z-10">
          {/* Badge de urgência */}
          <div className="flex justify-center mb-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/30 text-red-500 text-sm font-bold uppercase tracking-wider animate-pulse">
              <Timer className="w-4 h-4" />
              Oferta por tempo limitado
            </div>
          </div>

          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-center uppercase tracking-tighter mb-6">
            Domine a <span className="text-primary">Dosagem de Concreto</span> de Uma Vez Por Todas
          </h1>
          
          <p className="text-xl md:text-2xl text-center text-muted-foreground max-w-3xl mx-auto mb-8">
            A plataforma completa que vai do <strong>pedreiro ao cientista da NASA</strong>. 
            Calcule traços perfeitos em segundos, economize materiais e impressione seus clientes.
          </p>

          {/* Video Placeholder */}
          <div className="max-w-3xl mx-auto mb-10">
            <div className="relative aspect-video bg-muted/20 border border-border rounded-lg overflow-hidden group cursor-pointer hover:border-primary transition-colors">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-20 h-20 bg-primary rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Play className="w-8 h-8 text-white ml-1" />
                </div>
              </div>
              <div className="absolute bottom-4 left-4 right-4 text-center">
                <p className="text-sm text-muted-foreground">Clique para ver como funciona (2 min)</p>
              </div>
              {/* Substituir por iframe do YouTube quando tiver o vídeo */}
              {/* <iframe src="https://www.youtube.com/embed/SEU_VIDEO" className="w-full h-full" /> */}
            </div>
          </div>

          {/* CTA Principal */}
          <div className="text-center">
            <Button 
              size="lg" 
              className="bg-primary hover:bg-primary/90 text-white font-bold uppercase tracking-wider h-16 px-12 text-lg rounded-none shadow-lg shadow-primary/30"
              asChild
            >
              <a href={HOTMART_URL} target="_blank" rel="noreferrer">
                Quero Acesso Agora
                <ArrowRight className="ml-2 h-5 w-5" />
              </a>
            </Button>
            <p className="text-sm text-muted-foreground mt-4">
              <Gift className="w-4 h-4 inline mr-1" />
              Bônus exclusivos para os primeiros 50 assinantes
            </p>
          </div>

          {/* Prova Social Rápida */}
          <div className="flex flex-wrap justify-center gap-8 mt-12 pt-8 border-t border-border">
            <div className="text-center">
              <div className="text-3xl font-bold text-primary">500+</div>
              <div className="text-sm text-muted-foreground">Usuários ativos</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-primary">10.000+</div>
              <div className="text-sm text-muted-foreground">Traços calculados</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-primary">4.9/5</div>
              <div className="text-sm text-muted-foreground">Avaliação média</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-primary">15%</div>
              <div className="text-sm text-muted-foreground">Economia média</div>
            </div>
          </div>
        </div>
      </section>

      {/* Problema / Dor */}
      <section className="py-16 px-4 bg-muted/5">
        <div className="container max-w-4xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center uppercase tracking-tighter mb-8">
            Você Ainda Calcula Traço <span className="text-red-500">Na Mão?</span>
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="p-6 border border-red-500/30 bg-red-500/5">
              <h3 className="font-bold text-red-500 mb-3">❌ Sem a ferramenta:</h3>
              <ul className="space-y-2 text-muted-foreground">
                <li>• Horas perdidas em cálculos manuais</li>
                <li>• Erros que custam caro em materiais</li>
                <li>• Traços inconsistentes e imprevisíveis</li>
                <li>• Dificuldade em otimizar custos</li>
                <li>• Planilhas confusas e desatualizadas</li>
              </ul>
            </div>
            <div className="p-6 border border-green-500/30 bg-green-500/5">
              <h3 className="font-bold text-green-500 mb-3">✓ Com Mestres do Concreto:</h3>
              <ul className="space-y-2 text-muted-foreground">
                <li>• Traços calculados em segundos</li>
                <li>• Precisão técnica garantida</li>
                <li>• Resultados consistentes sempre</li>
                <li>• Otimização automática de custos</li>
                <li>• Tudo organizado em um só lugar</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Benefícios */}
      <section className="py-16 px-4">
        <div className="container max-w-5xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center uppercase tracking-tighter mb-4">
            Tudo Que Você <span className="text-primary">Precisa</span> Em Um Só Lugar
          </h2>
          <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
            Ferramentas profissionais que antes só grandes empresas tinham acesso
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            {beneficios.map((beneficio, index) => (
              <div key={index} className="p-6 border border-border bg-card hover:border-primary transition-colors group">
                <beneficio.icon className="w-10 h-10 text-primary mb-4 group-hover:scale-110 transition-transform" />
                <h3 className="font-bold text-lg mb-2">{beneficio.titulo}</h3>
                <p className="text-sm text-muted-foreground">{beneficio.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Níveis de Calculadora */}
      <section className="py-16 px-4 bg-muted/5">
        <div className="container max-w-5xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center uppercase tracking-tighter mb-4">
            4 Níveis de <span className="text-primary">Calculadora</span>
          </h2>
          <p className="text-center text-muted-foreground mb-12">
            Do pedreiro ao cientista da NASA - escolha seu nível
          </p>
          <div className="grid md:grid-cols-4 gap-4">
            <Card className="rounded-none border-border bg-card">
              <CardContent className="p-6 text-center">
                <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Calculator className="w-8 h-8 text-blue-500" />
                </div>
                <h3 className="font-bold uppercase mb-2">Básico</h3>
                <p className="text-xs text-muted-foreground">Traço em latas para obras simples</p>
              </CardContent>
            </Card>
            <Card className="rounded-none border-border bg-card">
              <CardContent className="p-6 text-center">
                <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FileSpreadsheet className="w-8 h-8 text-green-500" />
                </div>
                <h3 className="font-bold uppercase mb-2">Técnico</h3>
                <p className="text-xs text-muted-foreground">ABCP/ACI com múltiplos agregados</p>
              </CardContent>
            </Card>
            <Card className="rounded-none border-border bg-card">
              <CardContent className="p-6 text-center">
                <div className="w-16 h-16 bg-purple-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FlaskConical className="w-8 h-8 text-purple-500" />
                </div>
                <h3 className="font-bold uppercase mb-2">Avançado</h3>
                <p className="text-xs text-muted-foreground">CAA, empacotamento, aditivos</p>
              </CardContent>
            </Card>
            <Card className="rounded-none border-border bg-card border-primary">
              <CardContent className="p-6 text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Rocket className="w-8 h-8 text-primary" />
                </div>
                <h3 className="font-bold uppercase mb-2 text-primary">Científico</h3>
                <p className="text-xs text-muted-foreground">UHPC, Ductal, Larrard</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Depoimentos */}
      <section className="py-16 px-4">
        <div className="container max-w-5xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center uppercase tracking-tighter mb-4">
            O Que Dizem Nossos <span className="text-primary">Clientes</span>
          </h2>
          <p className="text-center text-muted-foreground mb-12">
            Profissionais reais com resultados reais
          </p>
          <div className="grid md:grid-cols-3 gap-6">
            {depoimentos.map((dep, index) => (
              <Card key={index} className="rounded-none border-border bg-card">
                <CardContent className="p-6">
                  <div className="flex gap-1 mb-4">
                    {[...Array(dep.estrelas)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-yellow-500 text-yellow-500" />
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground italic mb-4">"{dep.texto}"</p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">
                      {dep.avatar}
                    </div>
                    <div>
                      <div className="font-bold text-sm">{dep.nome}</div>
                      <div className="text-xs text-muted-foreground">{dep.cargo} - {dep.empresa}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Comparativo */}
      <section className="py-16 px-4 bg-muted/5">
        <div className="container max-w-3xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center uppercase tracking-tighter mb-12">
            Gratuito vs. <span className="text-primary">Premium</span>
          </h2>
          <div className="border border-border bg-card overflow-hidden">
            <div className="grid grid-cols-3 bg-muted/20 p-4 font-bold text-sm uppercase">
              <div>Funcionalidade</div>
              <div className="text-center">Gratuito</div>
              <div className="text-center text-primary">Premium</div>
            </div>
            {comparativo.map((item, index) => (
              <div key={index} className="grid grid-cols-3 p-4 border-t border-border text-sm">
                <div>{item.feature}</div>
                <div className="text-center">
                  {item.gratuito ? (
                    <CheckCircle className="w-5 h-5 text-green-500 mx-auto" />
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </div>
                <div className="text-center">
                  <CheckCircle className="w-5 h-5 text-primary mx-auto" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Preço e CTA */}
      <section className="py-20 px-4">
        <div className="container max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/30 text-primary text-sm font-bold uppercase tracking-wider mb-6">
            <Gift className="w-4 h-4" />
            Oferta Especial de Lançamento
          </div>
          
          <h2 className="text-3xl md:text-5xl font-bold uppercase tracking-tighter mb-4">
            Acesso Completo Por Apenas
          </h2>
          
          <div className="mb-8">
            <div className="text-muted-foreground line-through text-2xl">De R$ 99,90/mês</div>
            <div className="text-6xl md:text-7xl font-bold text-primary">
              R$ 29<span className="text-3xl">,90</span><span className="text-xl text-muted-foreground">/mês</span>
            </div>
            <div className="text-lg text-muted-foreground mt-2">ou R$ 249/ano (economize 30%)</div>
          </div>

          <Button 
            size="lg" 
            className="bg-primary hover:bg-primary/90 text-white font-bold uppercase tracking-wider h-16 px-12 text-lg rounded-none shadow-lg shadow-primary/30 mb-6"
            asChild
          >
            <a href={HOTMART_URL} target="_blank" rel="noreferrer">
              Garantir Minha Vaga Agora
              <ArrowRight className="ml-2 h-5 w-5" />
            </a>
          </Button>

          {/* Garantias */}
          <div className="flex flex-wrap justify-center gap-6 mt-8">
            {garantias.map((garantia, index) => (
              <div key={index} className="flex items-center gap-2 text-sm text-muted-foreground">
                <garantia.icon className="w-4 h-4 text-primary" />
                {garantia.titulo}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Rápido */}
      <section className="py-16 px-4 bg-muted/5">
        <div className="container max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-center uppercase tracking-tighter mb-12">
            Perguntas <span className="text-primary">Frequentes</span>
          </h2>
          <div className="space-y-4">
            <div className="p-6 border border-border bg-card">
              <h3 className="font-bold mb-2">Preciso ter conhecimento técnico para usar?</h3>
              <p className="text-sm text-muted-foreground">Não! A calculadora básica é intuitiva e qualquer pessoa consegue usar. Para níveis mais avançados, oferecemos tutoriais completos.</p>
            </div>
            <div className="p-6 border border-border bg-card">
              <h3 className="font-bold mb-2">Posso cancelar a qualquer momento?</h3>
              <p className="text-sm text-muted-foreground">Sim! Você pode cancelar quando quiser, sem multas ou burocracia. Nos primeiros 7 dias, devolvemos 100% do valor.</p>
            </div>
            <div className="p-6 border border-border bg-card">
              <h3 className="font-bold mb-2">Funciona no celular?</h3>
              <p className="text-sm text-muted-foreground">Sim! A plataforma é 100% responsiva e funciona perfeitamente em smartphones e tablets.</p>
            </div>
            <div className="p-6 border border-border bg-card">
              <h3 className="font-bold mb-2">Quanto tempo leva para dominar a ferramenta?</h3>
              <p className="text-sm text-muted-foreground">A maioria dos usuários já está calculando traços em menos de 10 minutos. É muito intuitivo!</p>
            </div>
          </div>
          <div className="text-center mt-8">
            <Link href="/faq" className="text-primary hover:underline">
              Ver todas as perguntas →
            </Link>
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="py-20 px-4 bg-primary/10 border-y border-primary/30">
        <div className="container max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold uppercase tracking-tighter mb-4">
            Não Perca Mais Tempo Com Cálculos Manuais
          </h2>
          <p className="text-xl text-muted-foreground mb-8">
            Junte-se a mais de 500 profissionais que já transformaram sua forma de trabalhar
          </p>
          <Button 
            size="lg" 
            className="bg-primary hover:bg-white hover:text-black text-white font-bold uppercase tracking-wider h-16 px-12 text-lg rounded-none"
            asChild
          >
            <a href={HOTMART_URL} target="_blank" rel="noreferrer">
              Começar Agora - 7 Dias Grátis
              <ArrowRight className="ml-2 h-5 w-5" />
            </a>
          </Button>
          <p className="text-sm text-muted-foreground mt-4">
            Pagamento seguro via Hotmart • Acesso imediato • Cancele quando quiser
          </p>
        </div>
      </section>

      {/* Footer simples */}
      <footer className="py-8 px-4 text-center text-sm text-muted-foreground">
        <p>© 2024 Mestres do Concreto. Todos os direitos reservados.</p>
        <p className="mt-2">
          <Link href="/pricing" className="hover:text-primary">Planos</Link>
          {" • "}
          <Link href="/faq" className="hover:text-primary">FAQ</Link>
          {" • "}
          <Link href="/consultoria" className="hover:text-primary">Consultoria</Link>
        </p>
      </footer>
    </div>
  );
}
