import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { MessageCircle, ArrowRight, HelpCircle } from "lucide-react";
import { Link } from "wouter";

export default function FAQ() {
  const categorias = [
    {
      titulo: "Sobre a Plataforma",
      perguntas: [
        {
          pergunta: "O que é o Mestres do Concreto?",
          resposta: "O Mestres do Concreto é uma plataforma completa de dosagem de concreto que atende desde pedreiros até engenheiros e pesquisadores. Oferecemos calculadoras para diferentes níveis de complexidade: Básico (traços em latas), Técnico (ABCP/ACI), Avançado (CAA e empacotamento) e Científico (UHPC e metodologia de Larrard)."
        },
        {
          pergunta: "Preciso instalar algum software?",
          resposta: "Não! O Mestres do Concreto funciona 100% online, direto no navegador. Você pode acessar de qualquer dispositivo: computador, tablet ou celular. Seus traços ficam salvos na nuvem e sincronizados automaticamente."
        },
        {
          pergunta: "A plataforma funciona offline?",
          resposta: "Atualmente a plataforma requer conexão com internet para funcionar. Estamos desenvolvendo um modo offline para assinantes dos planos pagos, que será lançado em breve."
        },
        {
          pergunta: "Posso usar no celular?",
          resposta: "Sim! A plataforma é totalmente responsiva e funciona perfeitamente em smartphones e tablets. A experiência é otimizada para telas menores, mantendo todas as funcionalidades."
        }
      ]
    },
    {
      titulo: "Planos e Pagamento",
      perguntas: [
        {
          pergunta: "Qual a diferença entre os planos?",
          resposta: "O plano Gratuito inclui apenas a Calculadora Básica com limite de 3 traços. O Técnico adiciona a calculadora ABCP/ACI, Curva de Abrams e exportação. O Avançado inclui CAA, empacotamento e Laboratório. O Científico dá acesso total incluindo UHPC, Larrard e suporte prioritário."
        },
        {
          pergunta: "Posso testar antes de assinar?",
          resposta: "Sim! Oferecemos 7 dias de teste gratuito em qualquer plano pago. Durante o trial você tem acesso completo a todas as funcionalidades do plano escolhido. Se não gostar, basta cancelar antes do fim do período."
        },
        {
          pergunta: "Quais formas de pagamento são aceitas?",
          resposta: "Aceitamos cartão de crédito (Visa, Mastercard, Elo, Amex), boleto bancário e PIX. Para planos anuais, também oferecemos parcelamento em até 12x no cartão."
        },
        {
          pergunta: "Posso cancelar a qualquer momento?",
          resposta: "Sim! Não há fidelidade ou multa por cancelamento. Você pode cancelar sua assinatura a qualquer momento pelo painel de configurações. O acesso continua até o fim do período já pago."
        },
        {
          pergunta: "Tem desconto para pagamento anual?",
          resposta: "Sim! O plano anual oferece até 30% de desconto em relação ao pagamento mensal. Além da economia, você garante o preço atual por 12 meses, mesmo que haja reajustes."
        },
        {
          pergunta: "Emitem nota fiscal?",
          resposta: "Sim! Emitimos nota fiscal para todos os pagamentos. A NF é enviada automaticamente para o e-mail cadastrado em até 5 dias úteis após a confirmação do pagamento."
        }
      ]
    },
    {
      titulo: "Funcionalidades",
      perguntas: [
        {
          pergunta: "O que é a Curva de Abrams?",
          resposta: "A Curva de Abrams é uma ferramenta que relaciona a resistência do concreto (fck) com a relação água/cimento (a/c). Com ela você pode estimar a resistência esperada ou calcular a relação a/c necessária para atingir uma resistência específica."
        },
        {
          pergunta: "O que é empacotamento de partículas?",
          resposta: "Empacotamento de partículas é uma técnica para otimizar a distribuição granulométrica dos agregados, reduzindo vazios e melhorando a trabalhabilidade e resistência do concreto. Usamos modelos como Andreassen e Funk-Dinger."
        },
        {
          pergunta: "O que é a metodologia de Larrard?",
          resposta: "François de Larrard desenvolveu o Modelo de Empacotamento Compressível (MEC), base para dosagem de concretos de ultra-alto desempenho (UHPC). Essa metodologia permite atingir resistências acima de 150 MPa com controle preciso da reologia."
        },
        {
          pergunta: "Posso exportar meus traços?",
          resposta: "Sim! Nos planos pagos você pode exportar seus traços em formato Excel (.xlsx) e PDF. O PDF inclui uma ficha técnica profissional com todos os dados do traço, ideal para documentação e controle de qualidade."
        },
        {
          pergunta: "O que é o Laboratório?",
          resposta: "O Laboratório é um conjunto de ferramentas para acompanhamento prático: Bateladas de Teste (cálculo de massas para volumes específicos), Corte de Água (ajuste por umidade dos agregados) e Cadastro de Ensaios (registro de slump e resistência por idade)."
        }
      ]
    },
    {
      titulo: "Suporte e Consultoria",
      perguntas: [
        {
          pergunta: "Como funciona o suporte?",
          resposta: "O suporte básico é feito por e-mail com resposta em até 48h. Assinantes do plano Científico têm suporte prioritário via WhatsApp com resposta em até 4h durante horário comercial."
        },
        {
          pergunta: "Vocês oferecem consultoria técnica?",
          resposta: "Sim! Além da plataforma, oferecemos consultoria técnica para projetos específicos. Temos opções desde consultoria express (30 min) até mentoria contínua mensal. Acesse a página de Consultoria para mais detalhes."
        },
        {
          pergunta: "Posso solicitar uma funcionalidade nova?",
          resposta: "Claro! Adoramos feedback dos usuários. Envie sua sugestão pelo WhatsApp ou e-mail. Funcionalidades mais solicitadas entram na nossa lista de prioridades para desenvolvimento."
        }
      ]
    },
    {
      titulo: "Técnico",
      perguntas: [
        {
          pergunta: "Quais normas são utilizadas nos cálculos?",
          resposta: "Utilizamos as normas brasileiras (ABNT NBR) como referência principal, incluindo NBR 12655 (Concreto de cimento Portland), NBR 7211 (Agregados) e NBR 6118 (Projeto de estruturas de concreto). Para métodos internacionais, seguimos ACI 211.1 e ACI 318."
        },
        {
          pergunta: "Os cálculos são validados?",
          resposta: "Sim! Todos os algoritmos foram validados com dados de laboratório e comparados com resultados de dosagens reais. A equipe técnica inclui engenheiros civis e tecnologistas de concreto com mais de 15 anos de experiência."
        },
        {
          pergunta: "Posso usar para concreto estrutural?",
          resposta: "Sim, mas lembre-se que a dosagem final deve ser validada por ensaios de laboratório conforme exigido pela NBR 12655. A plataforma é uma ferramenta de apoio ao dimensionamento, não substitui o controle tecnológico obrigatório."
        }
      ]
    }
  ];

  return (
    <div className="container py-12">
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto mb-16">
        <div className="inline-flex items-center gap-2 px-3 py-1 border border-primary/50 bg-primary/10 mb-6">
          <HelpCircle className="w-4 h-4 text-primary" />
          <span className="text-xs font-mono text-primary uppercase tracking-widest">Central de Ajuda</span>
        </div>
        <h1 className="text-4xl md:text-6xl font-bold uppercase tracking-tighter mb-6">
          Perguntas <span className="text-primary">Frequentes</span>
        </h1>
        <p className="text-xl text-muted-foreground font-light">
          Encontre respostas para as dúvidas mais comuns sobre a plataforma, 
          planos, funcionalidades e suporte técnico.
        </p>
      </div>

      {/* FAQ por Categoria */}
      <div className="max-w-4xl mx-auto space-y-8 mb-16">
        {categorias.map((categoria, catIndex) => (
          <div key={catIndex} className="border border-border bg-card">
            <div className="bg-muted/50 px-6 py-4 border-b border-border">
              <h2 className="text-lg font-bold uppercase tracking-tight">{categoria.titulo}</h2>
            </div>
            <Accordion type="single" collapsible className="px-6">
              {categoria.perguntas.map((item, index) => (
                <AccordionItem key={index} value={`${catIndex}-${index}`} className="border-border">
                  <AccordionTrigger className="text-left font-medium hover:text-primary">
                    {item.pergunta}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground leading-relaxed">
                    {item.resposta}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div className="bg-primary/10 border border-primary/30 p-8 md:p-12 text-center max-w-4xl mx-auto">
        <h2 className="text-2xl font-bold uppercase tracking-tighter mb-4">Não encontrou sua resposta?</h2>
        <p className="text-muted-foreground max-w-2xl mx-auto mb-8">
          Nossa equipe está pronta para ajudar. Entre em contato pelo WhatsApp 
          ou agende uma consultoria técnica.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button size="lg" className="bg-green-600 hover:bg-green-700 text-white font-bold uppercase tracking-wider h-14 px-8 rounded-none" asChild>
            <a href="https://wa.me/5511982618300" target="_blank" rel="noreferrer">
              <MessageCircle className="mr-2 h-5 w-5" />
              Falar no WhatsApp
            </a>
          </Button>
          <Button size="lg" variant="outline" className="border-primary text-primary hover:bg-primary hover:text-white font-bold uppercase tracking-wider h-14 px-8 rounded-none" asChild>
            <Link href="/consultoria">
              Ver Consultoria
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
