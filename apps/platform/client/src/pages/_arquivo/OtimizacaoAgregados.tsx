import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ArrowLeft, ExternalLink, Gift, Sparkles, Mail, CheckCircle2, Rocket, Crown, Zap, ArrowRight, X } from "lucide-react";
import { Link } from "wouter";
import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

const LEAD_STORAGE_KEY = "mestres_lead_email";
const TOOL_USAGE_KEY = "mestres_tool_usage_count";

export default function OtimizacaoAgregados() {
  const [showLeadCapture, setShowLeadCapture] = useState(false);
  const [showUpsell, setShowUpsell] = useState(false);
  const [email, setEmail] = useState("");
  const [nome, setNome] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasAccess, setHasAccess] = useState(false);
  const [toolUsageCount, setToolUsageCount] = useState(0);

  const createLead = trpc.leads.create.useMutation();

  // Verificar se usuário já tem acesso (já forneceu email)
  useEffect(() => {
    const savedEmail = localStorage.getItem(LEAD_STORAGE_KEY);
    const usageCount = parseInt(localStorage.getItem(TOOL_USAGE_KEY) || "0");
    setToolUsageCount(usageCount);
    
    if (savedEmail) {
      setHasAccess(true);
      setEmail(savedEmail);
    } else {
      // Mostrar captura de leads após 3 segundos
      const timer = setTimeout(() => {
        setShowLeadCapture(true);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, []);

  // Mostrar upsell após usar a ferramenta algumas vezes
  useEffect(() => {
    if (hasAccess && toolUsageCount > 0 && toolUsageCount % 3 === 0) {
      const timer = setTimeout(() => {
        setShowUpsell(true);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [hasAccess, toolUsageCount]);

  // Incrementar contador de uso quando acessar a ferramenta
  useEffect(() => {
    if (hasAccess) {
      const newCount = toolUsageCount + 1;
      setToolUsageCount(newCount);
      localStorage.setItem(TOOL_USAGE_KEY, newCount.toString());
    }
  }, [hasAccess]);

  const handleSubmitLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsSubmitting(true);
    try {
      await createLead.mutateAsync({
        email,
        nome: nome || undefined,
        origem: "ferramenta_gratuita",
        ferramenta: "otimizacao_agregados",
      });

      // Salvar email no localStorage
      localStorage.setItem(LEAD_STORAGE_KEY, email);
      setHasAccess(true);
      setShowLeadCapture(false);
      toast.success("Acesso liberado! Aproveite a ferramenta.");
    } catch (error) {
      toast.error("Erro ao processar. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkipLead = () => {
    // Permitir acesso limitado sem email
    setShowLeadCapture(false);
    setHasAccess(true);
    toast.info("Você pode usar a ferramenta, mas algumas funcionalidades são limitadas.");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header da Ferramenta */}
      <div className="bg-gradient-to-r from-primary/20 to-orange-500/20 border-b border-primary/30">
        <div className="container py-4">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" asChild>
                <Link href="/">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Voltar
                </Link>
              </Button>
              <div>
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary" />
                  <h1 className="text-xl font-bold">Otimização de Agregados por Densidade</h1>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-500 text-black text-xs font-bold">
                    <Gift className="w-3 h-3" />
                    GRÁTIS
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Método de Massa Unitária Compactada (NBR NM 45) - Metodologia Tutikian
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" asChild>
                <a href="/otimizacao-agregados.html" target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Abrir em Nova Aba
                </a>
              </Button>
              <Button size="sm" asChild>
                <Link href="/pricing">
                  Ver Planos Premium
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Iframe com a ferramenta */}
      <div className="w-full" style={{ height: "calc(100vh - 140px)" }}>
        <iframe
          src="/otimizacao-agregados.html"
          className="w-full h-full border-0"
          title="Otimização de Agregados por Densidade"
        />
      </div>

      {/* Modal de Captura de Leads */}
      <Dialog open={showLeadCapture} onOpenChange={setShowLeadCapture}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Gift className="w-6 h-6 text-green-500" />
              Ferramenta 100% Gratuita
            </DialogTitle>
            <DialogDescription>
              Informe seu e-mail para liberar o acesso completo à ferramenta de otimização de agregados.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitLead} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Seu nome (opcional)</Label>
              <Input
                id="nome"
                type="text"
                placeholder="Como podemos te chamar?"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Seu melhor e-mail *</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <p className="text-sm font-medium">Ao se cadastrar você recebe:</p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  Acesso completo à ferramenta
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  Dicas exclusivas de dosagem
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  Novidades e atualizações
                </li>
              </ul>
            </div>

            <div className="flex flex-col gap-2">
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? (
                  "Liberando acesso..."
                ) : (
                  <>
                    <Mail className="w-4 h-4 mr-2" />
                    Liberar Acesso Gratuito
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full text-muted-foreground"
                onClick={handleSkipLead}
              >
                Continuar sem cadastro
              </Button>
            </div>

            <p className="text-xs text-center text-muted-foreground">
              Não enviamos spam. Você pode cancelar a qualquer momento.
            </p>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal de Upsell */}
      <Dialog open={showUpsell} onOpenChange={setShowUpsell}>
        <DialogContent className="sm:max-w-lg">
          <button
            onClick={() => setShowUpsell(false)}
            className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Fechar</span>
          </button>

          <div className="text-center py-4">
            <div className="w-16 h-16 bg-gradient-to-br from-primary to-orange-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <Rocket className="w-8 h-8 text-white" />
            </div>
            <DialogTitle className="text-2xl font-bold mb-2">
              Gostando da Ferramenta?
            </DialogTitle>
            <DialogDescription className="text-base">
              Desbloqueie todo o potencial das suas dosagens com nossos planos premium!
            </DialogDescription>
          </div>

          <div className="grid gap-4 mt-4">
            {/* Benefícios */}
            <div className="bg-gradient-to-r from-primary/10 to-orange-500/10 rounded-lg p-4 border border-primary/20">
              <h3 className="font-bold mb-3 flex items-center gap-2">
                <Crown className="w-5 h-5 text-primary" />
                Com os Planos Premium você tem:
              </h3>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-primary" />
                  <span><strong>4 níveis</strong> de calculadoras (Básico ao Científico)</span>
                </li>
                <li className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-primary" />
                  <span><strong>Curva de Abrams</strong> com calibração automática</span>
                </li>
                <li className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-primary" />
                  <span><strong>Banco de materiais</strong> ilimitado na nuvem</span>
                </li>
                <li className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-primary" />
                  <span><strong>Exportação</strong> para Excel e PDF</span>
                </li>
                <li className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-primary" />
                  <span><strong>Metodologia UHPC</strong> (Ductal, de Larrard)</span>
                </li>
              </ul>
            </div>

            {/* Oferta especial */}
            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 text-center">
              <p className="text-sm text-green-600 font-medium mb-1">
                🎁 OFERTA ESPECIAL
              </p>
              <p className="text-lg font-bold">
                7 dias grátis para testar!
              </p>
              <p className="text-sm text-muted-foreground">
                Cancele quando quiser, sem compromisso
              </p>
            </div>

            {/* CTAs */}
            <div className="flex flex-col gap-2">
              <Button size="lg" className="w-full" asChild>
                <Link href="/pricing">
                  Ver Planos e Preços
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </Button>
              <Button
                variant="ghost"
                className="w-full text-muted-foreground"
                onClick={() => setShowUpsell(false)}
              >
                Continuar usando a versão gratuita
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
