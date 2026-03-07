import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  CheckCircle, 
  Mail, 
  ArrowRight, 
  Play,
  Download,
  MessageCircle,
  Calendar,
  Gift,
  Sparkles,
  Clock,
  Users,
  Star,
  Zap,
  BookOpen,
  Share2
} from "lucide-react";
import { Link } from "wouter";

// Declaração do tipo para o Calendly global
declare global {
  interface Window {
    Calendly?: {
      initPopupWidget: (options: { url: string }) => void;
    };
  }
}

export default function Obrigado() {
  // URL base do Calendly
  const CALENDLY_URL = "https://calendly.com/juliovechim/consultoria-tecnica";

  // Facebook Pixel - Rastrear conversão de compra
  useEffect(() => {
    // Inicializar Facebook Pixel
    const fbPixelId = '1872294346254749';
    
    // Verificar se o pixel já foi carregado
    if (!(window as any).fbq) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (function(f: any, b: any, e: any, v: any, n?: any, t?: any, s?: any) {
        if (f.fbq) return;
        n = f.fbq = function() {
          n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
        };
        if (!f._fbq) f._fbq = n;
        n.push = n;
        n.loaded = !0;
        n.version = '2.0';
        n.queue = [];
        t = b.createElement(e);
        t.async = !0;
        t.src = v;
        s = b.getElementsByTagName(e)[0];
        s.parentNode.insertBefore(t, s);
      })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
    }
    
    // Inicializar e disparar evento de conversão
    (window as any).fbq('init', fbPixelId);
    (window as any).fbq('track', 'PageView');
    (window as any).fbq('track', 'Purchase', {
      value: 29.90,
      currency: 'BRL',
      content_name: 'Mestres do Concreto - Assinatura',
      content_type: 'product'
    });
  }, []);

  // Carregar script do Calendly
  useEffect(() => {
    const existingLink = document.querySelector('link[href="https://assets.calendly.com/assets/external/widget.css"]');
    if (!existingLink) {
      const link = document.createElement('link');
      link.href = 'https://assets.calendly.com/assets/external/widget.css';
      link.rel = 'stylesheet';
      document.head.appendChild(link);
    }

    const existingScript = document.querySelector('script[src="https://assets.calendly.com/assets/external/widget.js"]');
    if (!existingScript) {
      const script = document.createElement('script');
      script.src = 'https://assets.calendly.com/assets/external/widget.js';
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  const openCalendlyPopup = () => {
    if (window.Calendly) {
      window.Calendly.initPopupWidget({ url: CALENDLY_URL });
    } else {
      window.open(CALENDLY_URL, '_blank');
    }
  };

  const passos = [
    {
      numero: 1,
      titulo: "Verifique seu E-mail",
      descricao: "Enviamos um e-mail com seus dados de acesso. Verifique também a caixa de spam.",
      icon: Mail
    },
    {
      numero: 2,
      titulo: "Faça Login na Plataforma",
      descricao: "Use o e-mail cadastrado na compra para acessar sua conta.",
      icon: Users
    },
    {
      numero: 3,
      titulo: "Assista ao Tutorial Inicial",
      descricao: "Em 10 minutos você domina todas as funcionalidades básicas.",
      icon: Play
    },
    {
      numero: 4,
      titulo: "Calcule seu Primeiro Traço",
      descricao: "Comece pela calculadora básica e evolua para os níveis avançados.",
      icon: Sparkles
    }
  ];

  const recursos = [
    { titulo: "4 Calculadoras", desc: "Básica, Técnica, Avançada e Científica", icon: Zap },
    { titulo: "Traços Ilimitados", desc: "Salve e organize todos seus projetos", icon: Download },
    { titulo: "Exportação Excel", desc: "Baixe planilhas profissionais", icon: Download },
    { titulo: "Tutoriais Completos", desc: "Aprenda no seu ritmo", icon: BookOpen },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero de Confirmação */}
      <section className="py-16 px-4 text-center border-b border-border">
        <div className="container max-w-3xl mx-auto">
          <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-green-500" />
          </div>
          
          <h1 className="text-4xl md:text-5xl font-bold uppercase tracking-tighter mb-4">
            Parabéns! <span className="text-primary">Compra Confirmada</span>
          </h1>
          
          <p className="text-xl text-muted-foreground mb-6">
            Bem-vindo à família Mestres do Concreto! Seu acesso já está liberado.
          </p>

          <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-500/10 border border-green-500/30 text-green-500 text-sm font-bold uppercase tracking-wider">
            <CheckCircle className="w-4 h-4" />
            Pagamento aprovado com sucesso
          </div>

          {/* Botão de Compartilhamento WhatsApp */}
          <div className="mt-8 p-6 bg-card border border-border">
            <p className="text-muted-foreground mb-4">
              Gostou? Compartilhe com seus colegas engenheiros!
            </p>
            <Button
              className="bg-[#25D366] hover:bg-[#128C7E] text-white rounded-none font-bold uppercase tracking-wider"
              onClick={() => {
                const texto = encodeURIComponent(
                  `🏗️ Acabei de assinar o Mestres do Concreto!\n\n` +
                  `A melhor plataforma de dosagem de concreto do Brasil.\n` +
                  `Do pedreiro ao cientista da NASA!\n\n` +
                  `👉 Confira: https://mestresconcreto.com`
                );
                window.open(`https://wa.me/?text=${texto}`, '_blank');
              }}
            >
              <Share2 className="mr-2 h-5 w-5" />
              Compartilhar no WhatsApp
            </Button>
          </div>
        </div>
      </section>

      {/* Passos para Começar */}
      <section className="py-16 px-4">
        <div className="container max-w-4xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-center uppercase tracking-tighter mb-12">
            Como <span className="text-primary">Começar</span> Agora
          </h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            {passos.map((passo) => (
              <Card key={passo.numero} className="rounded-none border-border bg-card hover:border-primary transition-colors">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-primary text-white flex items-center justify-center font-bold text-xl shrink-0">
                      {passo.numero}
                    </div>
                    <div>
                      <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
                        <passo.icon className="w-5 h-5 text-primary" />
                        {passo.titulo}
                      </h3>
                      <p className="text-sm text-muted-foreground">{passo.descricao}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="text-center mt-10">
            <Button 
              size="lg" 
              className="bg-primary hover:bg-primary/90 text-white font-bold uppercase tracking-wider h-14 px-8 rounded-none"
              asChild
            >
              <Link href="/calculadora">
                Acessar Minha Conta
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Recursos Liberados */}
      <section className="py-16 px-4 bg-muted/5">
        <div className="container max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-center uppercase tracking-tighter mb-8">
            Recursos <span className="text-primary">Liberados</span> Para Você
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {recursos.map((recurso, index) => (
              <div key={index} className="p-4 border border-border bg-card text-center">
                <recurso.icon className="w-8 h-8 text-primary mx-auto mb-2" />
                <h3 className="font-bold text-sm mb-1">{recurso.titulo}</h3>
                <p className="text-xs text-muted-foreground">{recurso.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* UPSELL - Consultoria */}
      <section className="py-16 px-4">
        <div className="container max-w-4xl mx-auto">
          <Card className="rounded-none border-primary bg-primary/5 overflow-hidden">
            <CardHeader className="bg-primary/10 border-b border-primary/30 p-6">
              <div className="flex items-center gap-2 text-primary mb-2">
                <Gift className="w-5 h-5" />
                <span className="text-sm font-bold uppercase tracking-wider">Oferta Exclusiva para Novos Membros</span>
              </div>
              <CardTitle className="text-2xl md:text-3xl font-bold uppercase tracking-tighter">
                Acelere Seus Resultados com Consultoria Técnica
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <p className="text-muted-foreground mb-6">
                    Você já tem a ferramenta. Agora imagine ter um especialista ao seu lado para:
                  </p>
                  <ul className="space-y-3">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                      <span>Otimizar seus traços atuais e reduzir custos em até 20%</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                      <span>Resolver problemas específicos da sua produção</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                      <span>Desenvolver traços especiais para aplicações únicas</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                      <span>Treinar sua equipe nas melhores práticas</span>
                    </li>
                  </ul>
                </div>
                <div className="bg-card border border-border p-6">
                  <div className="text-center mb-6">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-red-500/10 border border-red-500/30 text-red-500 text-xs font-bold uppercase tracking-wider mb-4">
                      <Clock className="w-3 h-3" />
                      Desconto válido por 48h
                    </div>
                    <div className="text-muted-foreground line-through">De R$ 450</div>
                    <div className="text-4xl font-bold text-primary">R$ 297</div>
                    <div className="text-sm text-muted-foreground">Consultoria Técnica (1h30)</div>
                  </div>
                  
                  <div className="space-y-3 mb-6 text-sm">
                    <div className="flex items-center gap-2">
                      <Star className="w-4 h-4 text-yellow-500" />
                      <span>Análise completa do seu traço</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Star className="w-4 h-4 text-yellow-500" />
                      <span>Relatório técnico detalhado</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Star className="w-4 h-4 text-yellow-500" />
                      <span>7 dias de acompanhamento</span>
                    </div>
                  </div>

                  <Button 
                    className="w-full bg-primary hover:bg-white hover:text-black text-white font-bold uppercase tracking-wider h-12 rounded-none"
                    onClick={openCalendlyPopup}
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    Agendar Consultoria
                  </Button>
                  
                  <p className="text-xs text-center text-muted-foreground mt-3">
                    Pagamento após a sessão • Satisfação garantida
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Suporte */}
      <section className="py-12 px-4 bg-muted/5 border-t border-border">
        <div className="container max-w-3xl mx-auto text-center">
          <h3 className="text-lg font-bold uppercase tracking-tight mb-4">Precisa de Ajuda?</h3>
          <p className="text-muted-foreground mb-6">
            Nossa equipe está pronta para te ajudar a aproveitar ao máximo a plataforma.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button variant="outline" className="rounded-none" asChild>
              <a href="https://wa.me/5511982618300" target="_blank" rel="noreferrer">
                <MessageCircle className="mr-2 h-4 w-4" />
                WhatsApp
              </a>
            </Button>
            <Button variant="outline" className="rounded-none" asChild>
              <a href="mailto:suporte@mestresconcreto.com">
                <Mail className="mr-2 h-4 w-4" />
                suporte@mestresconcreto.com
              </a>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 text-center text-sm text-muted-foreground border-t border-border">
        <p>© 2024 Mestres do Concreto. Todos os direitos reservados.</p>
        <div className="flex justify-center gap-4 mt-4">
          <Link href="/" className="hover:text-primary">Início</Link>
          <Link href="/calculadora" className="hover:text-primary">Calculadora</Link>
          <Link href="/tutoriais" className="hover:text-primary">Tutoriais</Link>
          <Link href="/consultoria" className="hover:text-primary">Consultoria</Link>
        </div>
      </footer>
    </div>
  );
}
