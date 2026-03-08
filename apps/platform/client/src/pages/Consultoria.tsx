import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  MessageCircle, 
  Phone, 
  Mail, 
  Clock, 
  CheckCircle, 
  Building2,
  Factory,
  FlaskConical,
  Rocket,
  Calendar,
  FileText,
  Users,
  ExternalLink
} from "lucide-react";

// Declaração do tipo para o Calendly global
declare global {
  interface Window {
    Calendly?: {
      initPopupWidget: (options: { url: string }) => void;
    };
  }
}

export default function Consultoria() {
  // URL base do Calendly
  const CALENDLY_BASE_URL = "https://calendly.com/juliovechim";

  // Carregar script do Calendly no mount
  useEffect(() => {
    // Carregar o CSS do Calendly
    const existingLink = document.querySelector('link[href="https://assets.calendly.com/assets/external/widget.css"]');
    if (!existingLink) {
      const link = document.createElement('link');
      link.href = 'https://assets.calendly.com/assets/external/widget.css';
      link.rel = 'stylesheet';
      document.head.appendChild(link);
    }

    // Carregar o script do Calendly
    const existingScript = document.querySelector('script[src="https://assets.calendly.com/assets/external/widget.js"]');
    if (!existingScript) {
      const script = document.createElement('script');
      script.src = 'https://assets.calendly.com/assets/external/widget.js';
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  const servicos = [
    {
      titulo: "Consultoria Express",
      descricao: "Tire dúvidas rápidas sobre dosagem, materiais ou execução.",
      preco: "R$ 150",
      tempo: "30 min",
      icon: MessageCircle,
      features: ["Chamada de vídeo", "Resposta em 24h", "Relatório resumido"],
      popular: false,
      calendlySlug: "consultoria-express"
    },
    {
      titulo: "Consultoria Técnica",
      descricao: "Análise completa do seu traço com recomendações detalhadas.",
      preco: "R$ 450",
      tempo: "1h30",
      icon: FileText,
      features: ["Análise de traço", "Otimização de custos", "Relatório técnico", "Acompanhamento 7 dias"],
      popular: true,
      calendlySlug: "consultoria-tecnica"
    },
    {
      titulo: "Projeto de Dosagem",
      descricao: "Desenvolvimento completo de traço personalizado para sua aplicação.",
      preco: "R$ 1.200",
      tempo: "Sob demanda",
      icon: FlaskConical,
      features: ["Estudo de materiais", "Curva de dosagem", "Ensaios laboratoriais", "Carta traço completa", "Suporte 30 dias"],
      popular: false,
      calendlySlug: "projeto-dosagem"
    },
    {
      titulo: "Mentoria Contínua",
      descricao: "Acompanhamento mensal para concreteiras e pré-moldados.",
      preco: "R$ 2.500/mês",
      tempo: "Mensal",
      icon: Users,
      features: ["4 reuniões mensais", "Suporte WhatsApp", "Análise de produção", "Treinamento de equipe", "Auditorias técnicas"],
      popular: false,
      calendlySlug: "mentoria-continua"
    }
  ];

  const especialidades = [
    { nome: "Concreto Convencional", icon: Building2, desc: "Dosagem ABCP/ACI para obras civis" },
    { nome: "Concreto Usinado", icon: Factory, desc: "Otimização para centrais de concreto" },
    { nome: "CAA & Alto Desempenho", icon: FlaskConical, desc: "Concretos especiais e auto-adensáveis" },
    { nome: "UHPC & Ductal", icon: Rocket, desc: "Ultra-alto desempenho e metodologia de Larrard" },
  ];

  const depoimentos = [
    {
      nome: "Carlos Silva",
      cargo: "Engenheiro de Produção",
      empresa: "Concreteira ABC",
      texto: "A consultoria técnica nos ajudou a reduzir o custo do traço em 15% mantendo a mesma resistência. Excelente trabalho!",
      avatar: "CS"
    },
    {
      nome: "Maria Santos",
      cargo: "Diretora Técnica",
      empresa: "Pré-moldados XYZ",
      texto: "O projeto de dosagem para CAA revolucionou nossa produção de painéis. Acabamento perfeito e sem segregação.",
      avatar: "MS"
    },
    {
      nome: "Roberto Oliveira",
      cargo: "Proprietário",
      empresa: "Artefatos de Concreto RO",
      texto: "A mentoria contínua transformou nossa fábrica. Equipe treinada, processos otimizados e qualidade consistente.",
      avatar: "RO"
    }
  ];

  // Função para abrir popup do Calendly
  const openCalendlyPopup = (slug: string) => {
    const url = `${CALENDLY_BASE_URL}/${slug}`;
    
    if (window.Calendly) {
      window.Calendly.initPopupWidget({ url });
    } else {
      // Fallback: abrir em nova aba se o script não carregou
      window.open(url, '_blank');
    }
  };

  return (
    <div className="container py-12">
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto mb-16">
        <div className="inline-flex items-center gap-2 px-3 py-1 border border-primary/50 bg-primary/10 mb-6">
          <span className="text-xs font-mono text-primary uppercase tracking-widest">Suporte Especializado</span>
        </div>
        <h1 className="text-4xl md:text-6xl font-bold uppercase tracking-tighter mb-6">
          Consultoria <span className="text-primary">Técnica</span>
        </h1>
        <p className="text-xl text-muted-foreground font-light">
          Resolva problemas complexos de dosagem com quem entende do assunto. 
          Mais de 15 anos de experiência em tecnologia do concreto.
        </p>
        
        {/* Link para site principal */}
        <div className="mt-6">
          <Button 
            variant="outline" 
            className="rounded-none border-primary text-primary hover:bg-primary hover:text-white"
            asChild
          >
            <a href="https://concrya.com.br/consultoria" target="_blank" rel="noreferrer">
              <ExternalLink className="mr-2 h-4 w-4" />
              Ver mais no site principal
            </a>
          </Button>
        </div>
      </div>

      {/* Especialidades */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-16">
        {especialidades.map((esp, index) => (
          <div key={index} className="p-4 border border-border bg-card hover:border-primary transition-colors group">
            <esp.icon className="w-8 h-8 text-primary mb-3 group-hover:scale-110 transition-transform" />
            <h3 className="font-bold text-sm uppercase tracking-tight mb-1">{esp.nome}</h3>
            <p className="text-xs text-muted-foreground">{esp.desc}</p>
          </div>
        ))}
      </div>

      {/* Serviços */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
        {servicos.map((servico, index) => (
          <Card key={index} className={`rounded-none border-border bg-card flex flex-col relative overflow-hidden transition-all duration-300 hover:border-primary group ${servico.popular ? 'border-primary shadow-lg shadow-primary/10' : ''}`}>
            {servico.popular && (
              <div className="absolute top-0 right-0 bg-primary text-white text-xs font-bold uppercase px-3 py-1 z-10">
                Mais Procurado
              </div>
            )}
            <CardHeader>
              <div className="w-12 h-12 bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                <servico.icon className="w-6 h-6 text-primary" />
              </div>
              <CardTitle className="text-xl font-bold uppercase tracking-tight">{servico.titulo}</CardTitle>
              <CardDescription className="font-mono text-xs uppercase tracking-wider">{servico.descricao}</CardDescription>
            </CardHeader>
            <CardContent className="flex-1">
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-3xl font-bold text-primary">{servico.preco}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
                <Clock className="w-4 h-4" />
                <span>{servico.tempo}</span>
              </div>
              <ul className="space-y-2">
                {servico.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <CheckCircle className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    {feature}
                  </li>
                ))}
              </ul>
            </CardContent>
            <div className="p-6 pt-0">
              <Button 
                className={`w-full font-bold uppercase tracking-wider rounded-none h-12 ${servico.popular ? 'bg-primary hover:bg-white hover:text-black text-white' : 'bg-muted hover:bg-primary hover:text-white text-foreground'}`}
                onClick={() => openCalendlyPopup(servico.calendlySlug)}
              >
                Agendar
                <Calendar className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {/* Depoimentos */}
      <div className="mb-16">
        <h2 className="text-2xl font-bold uppercase tracking-tighter mb-8 text-center">
          O Que Nossos <span className="text-primary">Clientes</span> Dizem
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {depoimentos.map((depoimento, index) => (
            <Card key={index} className="rounded-none border-border bg-card">
              <CardContent className="p-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 bg-primary/20 flex items-center justify-center text-primary font-bold">
                    {depoimento.avatar}
                  </div>
                  <div>
                    <h4 className="font-bold text-sm">{depoimento.nome}</h4>
                    <p className="text-xs text-muted-foreground">{depoimento.cargo}</p>
                    <p className="text-xs text-primary">{depoimento.empresa}</p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground italic">"{depoimento.texto}"</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Como Funciona */}
      <div className="bg-muted/10 border border-border p-8 md:p-12 mb-16">
        <h2 className="text-2xl font-bold uppercase tracking-tighter mb-8 text-center">Como Funciona</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="text-center">
            <div className="w-12 h-12 bg-primary text-white flex items-center justify-center mx-auto mb-4 text-xl font-bold">1</div>
            <h3 className="font-bold uppercase text-sm mb-2">Escolha o Serviço</h3>
            <p className="text-sm text-muted-foreground">Selecione o tipo de consultoria que melhor atende sua necessidade.</p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-primary text-white flex items-center justify-center mx-auto mb-4 text-xl font-bold">2</div>
            <h3 className="font-bold uppercase text-sm mb-2">Agende Online</h3>
            <p className="text-sm text-muted-foreground">Escolha o melhor horário diretamente no calendário integrado.</p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-primary text-white flex items-center justify-center mx-auto mb-4 text-xl font-bold">3</div>
            <h3 className="font-bold uppercase text-sm mb-2">Pagamento Seguro</h3>
            <p className="text-sm text-muted-foreground">Pague com cartão, PIX ou boleto de forma segura.</p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-primary text-white flex items-center justify-center mx-auto mb-4 text-xl font-bold">4</div>
            <h3 className="font-bold uppercase text-sm mb-2">Consultoria</h3>
            <p className="text-sm text-muted-foreground">Reunião por vídeo com relatório técnico entregue após a sessão.</p>
          </div>
        </div>
      </div>

      {/* CTA com Calendly */}
      <div className="bg-primary/10 border border-primary/30 p-8 md:p-12 text-center mb-16">
        <h2 className="text-3xl font-bold uppercase tracking-tighter mb-4">Agende Sua Consultoria Agora</h2>
        <p className="text-muted-foreground max-w-2xl mx-auto mb-8">
          Escolha o melhor horário e resolva seus problemas de dosagem com um especialista. 
          Atendimento personalizado e relatório técnico incluso.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button 
            size="lg" 
            className="bg-primary hover:bg-white hover:text-black text-white font-bold uppercase tracking-wider h-14 px-8 rounded-none"
            onClick={() => openCalendlyPopup('consultoria-tecnica')}
          >
            <Calendar className="mr-2 h-5 w-5" />
            Agendar Consultoria
          </Button>
          <Button 
            size="lg" 
            variant="outline" 
            className="border-green-600 text-green-500 hover:bg-green-600 hover:text-white font-bold uppercase tracking-wider h-14 px-8 rounded-none" 
            asChild
          >
            <a href="https://wa.me/5511982618300" target="_blank" rel="noreferrer">
              <MessageCircle className="mr-2 h-5 w-5" />
              WhatsApp
            </a>
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-4">
          <ExternalLink className="w-3 h-3 inline mr-1" />
          O agendamento abrirá em uma nova janela do Calendly
        </p>
      </div>

      {/* Contato Alternativo */}
      <div className="text-center">
        <h3 className="text-lg font-bold uppercase tracking-tight mb-4">Prefere outro canal?</h3>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button variant="ghost" className="text-muted-foreground hover:text-primary" asChild>
            <a href="mailto:contato@concrya.com.br">
              <Mail className="mr-2 h-4 w-4" />
              contato@concrya.com.br
            </a>
          </Button>
          <Button variant="ghost" className="text-muted-foreground hover:text-primary" asChild>
            <a href="tel:+5511982618300">
              <Phone className="mr-2 h-4 w-4" />
              (11) 98261-8300
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
}
