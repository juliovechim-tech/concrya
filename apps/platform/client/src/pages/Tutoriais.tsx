import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { PlayCircle, BookOpen, Download, Lock } from "lucide-react";

export default function Tutoriais() {
  const videos = [
    {
      title: "Introdução ao UHPC",
      description: "Conceitos fundamentais do concreto de ultra desempenho.",
      duration: "15:30",
      thumbnail: "/images/uhpc-texture.png",
      locked: false
    },
    {
      title: "Dosagem de GRC",
      description: "Como calcular a quantidade correta de fibras de vidro.",
      duration: "22:45",
      thumbnail: "/images/grc-panel.png",
      locked: false
    },
    {
      title: "Pigmentação Avançada",
      description: "Técnicas para cores vibrantes e duradouras.",
      duration: "18:10",
      thumbnail: "/images/colored-concrete.png",
      locked: true
    }
  ];

  return (
    <div className="container py-12">
      <div className="text-center max-w-3xl mx-auto mb-16">
        <div className="inline-flex items-center gap-2 px-3 py-1 border border-primary/50 bg-primary/10 mb-6">
          <span className="text-xs font-mono text-primary uppercase tracking-widest">Academia CONCRYA</span>
        </div>
        <h1 className="text-4xl md:text-6xl font-bold uppercase tracking-tighter mb-6">
          Tutoriais & <span className="text-primary">Aulas</span>
        </h1>
        <p className="text-xl text-muted-foreground font-light">
          Aprenda com quem faz. Conteúdo técnico direto da bancada do laboratório.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
        {videos.map((video, index) => (
          <Card key={index} className="rounded-none border-border bg-card group hover:border-primary transition-all duration-300">
            <div className="aspect-video relative overflow-hidden bg-muted">
              <img 
                src={video.thumbnail} 
                alt={video.title} 
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-60 group-hover:opacity-100"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                {video.locked ? (
                  <div className="w-12 h-12 bg-background/80 rounded-full flex items-center justify-center backdrop-blur-sm">
                    <Lock className="w-6 h-6 text-muted-foreground" />
                  </div>
                ) : (
                  <div className="w-16 h-16 bg-primary/90 rounded-full flex items-center justify-center cursor-pointer hover:scale-110 transition-transform shadow-lg group-hover:bg-primary">
                    <PlayCircle className="w-8 h-8 text-white ml-1" />
                  </div>
                )}
              </div>
              <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs font-mono px-2 py-1 rounded-sm">
                {video.duration}
              </div>
            </div>
            <CardHeader>
              <CardTitle className="text-xl font-bold uppercase tracking-tight group-hover:text-primary transition-colors">{video.title}</CardTitle>
              <CardDescription className="font-mono text-xs uppercase tracking-wider">{video.description}</CardDescription>
            </CardHeader>
            <CardFooter>
              {video.locked ? (
                <Button variant="outline" className="w-full border-dashed border-border text-muted-foreground cursor-not-allowed">
                  Exclusivo para Alunos
                </Button>
              ) : (
                <Button className="w-full bg-muted hover:bg-primary hover:text-white text-foreground font-bold uppercase tracking-wider rounded-none border border-transparent hover:border-primary transition-all">
                  Assistir Agora
                </Button>
              )}
            </CardFooter>
          </Card>
        ))}
      </div>

      <div className="bg-muted/10 border border-border p-8 md:p-12 grid grid-cols-1 lg:grid-cols-2 gap-12">
        <div>
          <h2 className="text-2xl font-bold uppercase tracking-tighter mb-4 flex items-center gap-3">
            <BookOpen className="w-6 h-6 text-primary" />
            Materiais Complementares
          </h2>
          <p className="text-muted-foreground mb-6 leading-relaxed">
            Acesse nossa biblioteca exclusiva de conteúdos técnicos. Baixe planilhas de dosagem, e-books sobre UHPC e guias de patologia do concreto.
          </p>
          <ul className="space-y-3 mb-8">
            <li className="flex items-center gap-2 text-sm font-mono uppercase tracking-wide">
              <div className="w-1.5 h-1.5 bg-primary rounded-full" />
              Planilha de Dosagem Automatizada
            </li>
            <li className="flex items-center gap-2 text-sm font-mono uppercase tracking-wide">
              <div className="w-1.5 h-1.5 bg-primary rounded-full" />
              E-book: Segredos do UHPC
            </li>
            <li className="flex items-center gap-2 text-sm font-mono uppercase tracking-wide">
              <div className="w-1.5 h-1.5 bg-primary rounded-full" />
              Guia de Pigmentação de Concreto
            </li>
          </ul>
        </div>

        <Card className="rounded-none border-border bg-card">
          <CardHeader className="bg-primary text-white border-b border-primary-foreground/20">
            <CardTitle className="uppercase tracking-wide text-lg font-bold">Download Gratuito</CardTitle>
            <CardDescription className="text-primary-foreground/80">Preencha para receber o acesso no seu e-mail.</CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="space-y-2">
              <label className="text-xs uppercase font-bold text-muted-foreground">Nome Completo</label>
              <input className="flex h-10 w-full rounded-none border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" placeholder="Seu nome" />
            </div>
            <div className="space-y-2">
              <label className="text-xs uppercase font-bold text-muted-foreground">E-mail Profissional</label>
              <input className="flex h-10 w-full rounded-none border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" placeholder="seu@email.com" />
            </div>
            <Button className="w-full bg-primary hover:bg-primary/90 text-white font-bold uppercase tracking-wider rounded-none h-12 mt-2">
              <Download className="mr-2 h-4 w-4" />
              Baixar Material Agora
            </Button>
            <p className="text-[10px] text-center text-muted-foreground uppercase tracking-widest mt-4">
              Seus dados estão seguros. Não enviamos spam.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
