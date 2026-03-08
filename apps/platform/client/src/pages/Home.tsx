import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Calculator, 
  Beaker, 
  FlaskConical, 
  Atom,
  HardHat,
  Building2,
  Factory,
  Rocket,
  ArrowRight,
  Play,
  ShoppingBag,
  GraduationCap,
  Instagram,
  MessageCircle,
  ExternalLink,
  Sparkles,
  ChevronRight
} from "lucide-react";
import { Link } from "wouter";
import { motion } from "framer-motion";

const niveis = [
  {
    id: "basico",
    titulo: "Básico",
    subtitulo: "Pedreiros & Construtores",
    descricao: "Traços práticos em latas, baldes e carrinhos. Tabelas prontas para contrapiso, laje, pilar e viga.",
    icon: HardHat,
    cor: "from-green-500 to-emerald-600",
    corBorda: "border-green-500/50",
    link: "/nivel/basico",
    features: ["Medidas práticas", "Tabelas prontas", "Dicas de execução"],
  },
  {
    id: "tecnico",
    titulo: "Técnico",
    subtitulo: "Engenheiros & Concreteiras",
    descricao: "Método ABCP/ACI, Curva de Abrams, controle tecnológico e carta traço para produção industrial.",
    icon: Building2,
    cor: "from-blue-500 to-indigo-600",
    corBorda: "border-blue-500/50",
    link: "/nivel/tecnico",
    features: ["Curva de Abrams", "Ajuste de umidade", "Carta traço"],
  },
  {
    id: "avancado",
    titulo: "Avançado",
    subtitulo: "CAA, HPC & Pré-moldados",
    descricao: "Concreto auto-adensável, alto desempenho, empacotamento de partículas e curvas granulométricas.",
    icon: Factory,
    cor: "from-orange-500 to-amber-600",
    corBorda: "border-orange-500/50",
    link: "/nivel/avancado",
    features: ["CAA (SF1-SF3)", "Empacotamento", "Múltiplos agregados"],
  },
  {
    id: "cientifico",
    titulo: "Científico",
    subtitulo: "UHPC, Ductal & de Larrard",
    descricao: "Modelo de Empacotamento Compressível (MEC), metodologia Ductal, Funk-Dinger e otimização por coeficiente q.",
    icon: Rocket,
    cor: "from-purple-500 to-violet-600",
    corBorda: "border-purple-500/50",
    link: "/nivel/cientifico",
    features: ["Modelo de Larrard", "UHPC 150+ MPa", "BET & Blaine"],
  },
];

const ferramentasRapidas = [
  { nome: "Curva de Abrams", link: "/abrams", icon: Beaker },
  { nome: "Downloads", link: "/downloads", icon: GraduationCap },
  { nome: "Granulometria", link: "/granulometria", icon: FlaskConical },
  { nome: "Meus Traços", link: "/materiais", icon: Calculator },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-[url('/images/hero-bg.png')] bg-cover bg-center opacity-10" />
        <div className="absolute inset-0 bg-gradient-to-b from-background via-background/95 to-background" />
        
        <div className="container relative py-16 md:py-24">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-4xl mx-auto text-center"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary">Plataforma Completa de Dosagem</span>
            </div>
            
            <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tighter mb-6">
              Da Betoneira
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-primary via-orange-500 to-primary">
                ao Foguete
              </span>
            </h1>
            
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
              A única plataforma que atende desde traços práticos em latas até 
              metodologias científicas como <strong>Ductal</strong> e <strong>de Larrard</strong>.
            </p>

            <blockquote className="text-sm italic text-muted-foreground border-l-2 border-primary pl-4 max-w-xl mx-auto mb-8">
              "O concreto é o material mais utilizado pelo homem depois da água. 
              Dominá-lo é dominar o futuro da construção."
              <footer className="mt-1 text-xs">— François de Larrard, Pesquisador LCPC</footer>
            </blockquote>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="group" asChild>
                <Link href="/otimizacao-agregados">
                  Ferramenta Gratuita
                  <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/tutoriais">
                  <Play className="mr-2 w-4 h-4" />
                  Ver Tutoriais
                </Link>
              </Button>
            </div>

            {/* Banner Site Principal */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="mt-8"
            >
              <a 
                href="https://concrya.com.br" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-gradient-to-r from-primary/20 to-orange-500/20 border border-primary/30 hover:border-primary/50 transition-all duration-300 group"
              >
                <ExternalLink className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">Conheça o site completo</span>
                <span className="text-primary font-bold">concrya.com.br</span>
                <ChevronRight className="w-4 h-4 text-primary group-hover:translate-x-1 transition-transform" />
              </a>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Níveis de Expertise */}
      <section className="py-16 bg-muted/30">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold uppercase tracking-tight mb-4">
              Escolha Seu Nível
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Ferramentas adaptadas para cada perfil profissional. 
              Do básico ao científico, encontre exatamente o que você precisa.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {niveis.map((nivel, index) => (
              <motion.div
                key={nivel.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
              >
                <Link href={nivel.link}>
                  <Card className={`h-full cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-xl border-2 ${nivel.corBorda} bg-card/50 backdrop-blur group`}>
                    <CardHeader>
                      <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${nivel.cor} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                        <nivel.icon className="w-7 h-7 text-white" />
                      </div>
                      <CardTitle className="text-xl">{nivel.titulo}</CardTitle>
                      <CardDescription className="font-medium text-primary">
                        {nivel.subtitulo}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-4">
                        {nivel.descricao}
                      </p>
                      <ul className="space-y-2">
                        {nivel.features.map((feature) => (
                          <li key={feature} className="flex items-center gap-2 text-sm">
                            <ChevronRight className="w-4 h-4 text-primary" />
                            {feature}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Ferramentas Rápidas */}
      <section className="py-16">
        <div className="container">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8 mb-12">
            <div>
              <h2 className="text-3xl font-bold uppercase tracking-tight mb-2">
                Acesso Rápido
              </h2>
              <p className="text-muted-foreground">
                Ferramentas avançadas para usuários experientes
              </p>
            </div>
            <div className="flex gap-3">
              {ferramentasRapidas.map((ferramenta) => (
                <Button key={ferramenta.nome} variant="outline" asChild>
                  <Link href={ferramenta.link}>
                    <ferramenta.icon className="w-4 h-4 mr-2" />
                    {ferramenta.nome}
                  </Link>
                </Button>
              ))}
            </div>
          </div>

          {/* Cards de Destaque */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Cursos */}
            <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
              <CardHeader>
                <GraduationCap className="w-10 h-10 text-primary mb-2" />
                <CardTitle>Cursos Online</CardTitle>
                <CardDescription>
                  Aprenda dosagem de concreto com os melhores especialistas do Brasil
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full" asChild>
                  <a href="https://concrya.com.br/" target="_blank" rel="noopener noreferrer">
                    Ver Cursos
                    <ExternalLink className="w-4 h-4 ml-2" />
                  </a>
                </Button>
              </CardContent>
            </Card>

            {/* Kits */}
            <Card className="bg-gradient-to-br from-orange-500/10 to-orange-500/5 border-orange-500/20">
              <CardHeader>
                <ShoppingBag className="w-10 h-10 text-orange-500 mb-2" />
                <CardTitle>Kits & Insumos</CardTitle>
                <CardDescription>
                  Pigmentos, aditivos, fibras e materiais especiais para concreto
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full bg-orange-500 hover:bg-orange-600" asChild>
                  <a href="https://concrya.com.br/kits" target="_blank" rel="noreferrer">
                    Ver Produtos
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </a>
                </Button>
              </CardContent>
            </Card>

            {/* Consultoria */}
            <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20">
              <CardHeader>
                <MessageCircle className="w-10 h-10 text-green-500 mb-2" />
                <CardTitle>Consultoria</CardTitle>
                <CardDescription>
                  Suporte técnico especializado para seu projeto de concreto
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full bg-green-500 hover:bg-green-600" asChild>
                  <a href="https://wa.me/5511982618300" target="_blank" rel="noopener noreferrer">
                    Falar no WhatsApp
                    <MessageCircle className="w-4 h-4 ml-2" />
                  </a>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Citação Final */}
      <section className="py-16 bg-muted/30">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center">
            <blockquote className="text-xl md:text-2xl italic text-muted-foreground mb-6">
              "A dosagem de concreto é uma ciência e uma arte. 
              A ciência nos dá as ferramentas, a arte nos dá a sensibilidade 
              para criar materiais que transcendem sua função estrutural."
            </blockquote>
            <footer className="text-sm font-medium">
              — Julio Vechim, CONCRYA Technologies
            </footer>
          </div>
        </div>
      </section>

      {/* Social Links */}
      <section className="py-8 border-t border-border">
        <div className="container">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              Siga a CONCRYA Technologies nas redes sociais
            </p>
            <div className="flex gap-4">
              <Button variant="ghost" size="icon" asChild>
                <a href="https://www.instagram.com/concrya.tech/" target="_blank" rel="noopener noreferrer">
                  <Instagram className="w-5 h-5" />
                </a>
              </Button>
              <Button variant="ghost" size="icon" asChild>
                <a href="https://wa.me/5511982618300" target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="w-5 h-5" />
                </a>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <a href="https://bit.ly/m/Juliovechim" target="_blank" rel="noopener noreferrer">
                  Todos os Links
                  <ExternalLink className="w-4 h-4 ml-2" />
                </a>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
