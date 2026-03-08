import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, ShoppingBag, ArrowRight, Star } from "lucide-react";

export default function Kits() {
  const kits = [
    {
      title: "Kit Iniciante",
      description: "Para quem está começando e quer segurança.",
      price: "R$ 189,90",
      features: ["Aditivo Superplastificante", "Pigmento Óxido de Ferro", "Fibra de Vidro AR", "Acesso ao Curso Básico"],
      image: "/images/colored-concrete.png",
      popular: false
    },
    {
      title: "Kit Profissional",
      description: "Para produção em escala e alta performance.",
      price: "R$ 459,90",
      features: ["Aditivo Alta Performance", "Sílica Ativa", "Fibras Estruturais", "Pigmentos Premium", "Consultoria Express"],
      image: "/images/uhpc-texture.png",
      popular: true
    },
    {
      title: "Kit UHPC",
      description: "O estado da arte do concreto de ultra desempenho.",
      price: "R$ 899,90",
      features: ["Premix UHPC", "Fibras Metálicas", "Aditivo 3ª Geração", "Cura Química", "Mentoria Técnica"],
      image: "/images/grc-panel.png",
      popular: false
    }
  ];

  return (
    <div className="container py-12">
      <div className="text-center max-w-3xl mx-auto mb-16">
        <div className="inline-flex items-center gap-2 px-3 py-1 border border-primary/50 bg-primary/10 mb-6">
          <span className="text-xs font-mono text-primary uppercase tracking-widest">Loja Oficial</span>
        </div>
        <h1 className="text-4xl md:text-6xl font-bold uppercase tracking-tighter mb-6">
          Kits & Insumos <span className="text-primary">Validados</span>
        </h1>
        <p className="text-xl text-muted-foreground font-light">
          Pare de errar por causa de material ruim. Use os mesmos insumos que utilizamos em nossas obras e cursos.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
        {kits.map((kit, index) => (
          <Card key={index} className={`rounded-none border-border bg-card flex flex-col relative overflow-hidden transition-all duration-300 hover:border-primary group ${kit.popular ? 'border-primary shadow-lg shadow-primary/10' : ''}`}>
            {kit.popular && (
              <div className="absolute top-0 right-0 bg-primary text-white text-xs font-bold uppercase px-3 py-1 z-10">
                Mais Vendido
              </div>
            )}
            <div className="h-48 overflow-hidden relative">
              <img 
                src={kit.image} 
                alt={kit.title} 
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 grayscale group-hover:grayscale-0"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />
            </div>
            <CardHeader>
              <CardTitle className="text-2xl font-bold uppercase tracking-tight">{kit.title}</CardTitle>
              <CardDescription className="font-mono text-xs uppercase tracking-wider">{kit.description}</CardDescription>
            </CardHeader>
            <CardContent className="flex-1">
              <div className="text-3xl font-bold text-primary mb-6">{kit.price}</div>
              <ul className="space-y-3">
                {kit.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-muted-foreground">
                    <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    {feature}
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter>
              <Button className={`w-full font-bold uppercase tracking-wider rounded-none h-12 ${kit.popular ? 'bg-primary hover:bg-white hover:text-black text-white' : 'bg-muted hover:bg-primary hover:text-white text-foreground'}`}>
                Comprar Agora
                <ShoppingBag className="ml-2 h-4 w-4" />
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      <div className="bg-muted/10 border border-border p-8 md:p-12 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('/images/workshop-bg.png')] opacity-5 bg-cover bg-center" />
        <div className="relative z-10">
          <h2 className="text-3xl font-bold uppercase tracking-tighter mb-4">Precisa de algo específico?</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto mb-8">
            Temos uma linha completa de pigmentos, desmoldantes, selantes e aditivos especiais para cada tipo de aplicação.
          </p>
          <Button variant="outline" size="lg" className="border-primary text-primary hover:bg-primary hover:text-white font-bold uppercase tracking-wider h-14 px-8 rounded-none transition-all" asChild>
            <a href="https://concrya.com.br/insumos" target="_blank" rel="noreferrer">
              Ver Catálogo Completo
              <ArrowRight className="ml-2 h-5 w-5" />
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
}
