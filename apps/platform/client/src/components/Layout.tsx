import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from "@/components/ui/dropdown-menu";
import {
  Menu,
  Calculator,
  BookOpen,
  ShoppingBag,
  MessageCircle,
  Instagram,
  Globe,
  FlaskConical,
  Beaker,
  Droplets,
  ClipboardList,
  ChevronDown,
  CreditCard,
  Gift,
  BarChart3,
  Shield,
  Layers,
  Wrench,
  Leaf,
  History,
} from "lucide-react";
import { useState } from "react";

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [labOpen, setLabOpen] = useState(false);
  const [solOpen, setSolOpen] = useState(false);

  const navItems = [
    { label: "Site Principal", path: "https://mestresconcreto.com", icon: Globe, external: true },
    { label: "Calculadora", path: "/", icon: Calculator },
    { label: "Tutoriais", path: "/tutoriais", icon: BookOpen },
    { label: "Kits & Insumos", path: "https://mestresconcreto.com/kits", icon: ShoppingBag, external: true },
    { label: "Consultoria", path: "/consultoria", icon: MessageCircle },
    { label: "Planos", path: "/pricing", icon: CreditCard },
    { label: "Historico", path: "/historico", icon: History },
  ];

  const labItems = [
    { label: "Bateladas de Teste", path: "/laboratorio/bateladas", icon: Beaker },
    { label: "Corte de Água", path: "/laboratorio/corte-agua", icon: Droplets },
    { label: "Cadastro de Ensaios", path: "/laboratorio/cadastro-ensaios", icon: ClipboardList },
    { label: "Dashboard de Custos", path: "/dashboard-custos", icon: BarChart3 },
  ];

  const solucoesItems = [
    { label: "COMPENSA CORE", path: "/compensa", icon: Shield },
    { label: "NIVELIX", path: "/nivelix", icon: Layers },
    { label: "ECORISK", path: "/ecorisk", icon: Leaf },
  ];

  const isLabActive = location.startsWith("/laboratorio") || location === "/dashboard-custos";
  const isSolActive = location === "/compensa" || location === "/nivelix" || location === "/ecorisk";

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground font-sans selection:bg-primary selection:text-primary-foreground">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/">
            <div className="flex items-center gap-2 cursor-pointer group">
              <div className="w-10 h-10 flex items-center justify-center rounded-full overflow-hidden">
                <img src="/logo-mestres-circular.png" alt="Mestres do Concreto" className="w-10 h-10 object-cover" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-lg leading-none tracking-tighter uppercase">Mestres do</span>
                <span className="font-bold text-lg leading-none tracking-tighter uppercase text-primary group-hover:text-white transition-colors">Concreto</span>
              </div>
            </div>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-6">
            {navItems.map((item) => (
              'external' in item && item.external ? (
                <a key={item.path} href={item.path} target="_blank" rel="noreferrer">
                  <span className="text-sm font-medium uppercase tracking-wide hover:text-primary transition-colors cursor-pointer flex items-center gap-2 text-muted-foreground">
                    {item.label}
                  </span>
                </a>
              ) : (
                <Link key={item.path} href={item.path}>
                  <span className={`text-sm font-medium uppercase tracking-wide hover:text-primary transition-colors cursor-pointer flex items-center gap-2 ${location === item.path ? "text-primary" : "text-muted-foreground"}`}>
                    {item.label}
                  </span>
                </Link>
              )
            ))}
            
            {/* Soluções Verticais Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className={`text-sm font-medium uppercase tracking-wide hover:text-primary transition-colors cursor-pointer flex items-center gap-1 ${isSolActive ? "text-primary" : "text-muted-foreground"}`}>
                  <Wrench className="w-4 h-4" />
                  Soluções
                  <ChevronDown className="w-3 h-3" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="text-xs text-muted-foreground uppercase tracking-wider">
                  Soluções Verticais
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {solucoesItems.map((item) => (
                  <DropdownMenuItem key={item.path} asChild>
                    <Link href={item.path}>
                      <div className={`flex items-center gap-3 w-full cursor-pointer ${location === item.path ? "text-primary" : ""}`}>
                        <item.icon className="w-4 h-4" />
                        <span>{item.label}</span>
                      </div>
                    </Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Laboratório Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className={`text-sm font-medium uppercase tracking-wide hover:text-primary transition-colors cursor-pointer flex items-center gap-1 ${isLabActive ? "text-primary" : "text-muted-foreground"}`}>
                  <FlaskConical className="w-4 h-4" />
                  Laboratório
                  <ChevronDown className="w-3 h-3" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="text-xs text-muted-foreground uppercase tracking-wider">
                  Ferramentas de Laboratório
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {labItems.map((item) => (
                  <DropdownMenuItem key={item.path} asChild>
                    <Link href={item.path}>
                      <div className={`flex items-center gap-3 w-full cursor-pointer ${location === item.path ? "text-primary" : ""}`}>
                        <item.icon className="w-4 h-4" />
                        <span>{item.label}</span>
                      </div>
                    </Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <Button variant="outline" className="border-green-500 text-green-500 hover:bg-green-500 hover:text-black font-bold uppercase tracking-wider rounded-none transition-all duration-300" asChild>
              <Link href="/otimizacao-agregados">
                <Gift className="w-4 h-4 mr-2" />
                Ferramenta Grátis
              </Link>
            </Button>
            <Button variant="default" className="bg-primary hover:bg-white hover:text-black text-white font-bold uppercase tracking-wider rounded-none border border-primary transition-all duration-300 shadow-[4px_4px_0px_0px_rgba(255,255,255,0.2)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px]" asChild>
              <Link href="/pricing">Ver Planos</Link>
            </Button>
          </nav>

          {/* Mobile Nav */}
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon" className="rounded-none">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] bg-background border-l border-border p-0">
              <div className="flex flex-col h-full">
                <div className="p-6 border-b border-border">
                  <span className="font-bold text-xl uppercase tracking-tighter">Menu</span>
                </div>
                <div className="flex-1 overflow-y-auto py-6 px-4 flex flex-col gap-2">
                  {navItems.map((item) => (
                    'external' in item && item.external ? (
                      <a key={item.path} href={item.path} target="_blank" rel="noreferrer" onClick={() => setIsOpen(false)}>
                        <div className="flex items-center gap-4 p-4 hover:bg-muted transition-colors cursor-pointer border border-transparent hover:border-border">
                          <item.icon className="h-5 w-5" />
                          <span className="font-bold uppercase tracking-wide">{item.label}</span>
                        </div>
                      </a>
                    ) : (
                      <Link key={item.path} href={item.path} onClick={() => setIsOpen(false)}>
                        <div className={`flex items-center gap-4 p-4 hover:bg-muted transition-colors cursor-pointer border border-transparent hover:border-border ${location === item.path ? "bg-muted border-primary/50" : ""}`}>
                          <item.icon className={`h-5 w-5 ${location === item.path ? "text-primary" : ""}`} />
                          <span className="font-bold uppercase tracking-wide">{item.label}</span>
                        </div>
                      </Link>
                    )
                  ))}
                  
                  {/* Soluções Verticais Section Mobile */}
                  <div className="mt-4">
                    <button
                      onClick={() => setSolOpen(!solOpen)}
                      className={`flex items-center justify-between w-full p-4 hover:bg-muted transition-colors cursor-pointer border border-transparent hover:border-border ${isSolActive ? "bg-muted border-primary/50" : ""}`}
                    >
                      <div className="flex items-center gap-4">
                        <Wrench className={`h-5 w-5 ${isSolActive ? "text-primary" : ""}`} />
                        <span className="font-bold uppercase tracking-wide">Soluções</span>
                      </div>
                      <ChevronDown className={`h-4 w-4 transition-transform ${solOpen ? "rotate-180" : ""}`} />
                    </button>

                    {solOpen && (
                      <div className="ml-4 border-l-2 border-primary/30 pl-4 mt-2 space-y-1">
                        {solucoesItems.map((item) => (
                          <Link key={item.path} href={item.path} onClick={() => setIsOpen(false)}>
                            <div className={`flex items-center gap-3 p-3 hover:bg-muted transition-colors cursor-pointer rounded ${location === item.path ? "bg-muted text-primary" : ""}`}>
                              <item.icon className="h-4 w-4" />
                              <span className="text-sm">{item.label}</span>
                            </div>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Laboratório Section Mobile */}
                  <div className="mt-4">
                    <button
                      onClick={() => setLabOpen(!labOpen)}
                      className={`flex items-center justify-between w-full p-4 hover:bg-muted transition-colors cursor-pointer border border-transparent hover:border-border ${isLabActive ? "bg-muted border-primary/50" : ""}`}
                    >
                      <div className="flex items-center gap-4">
                        <FlaskConical className={`h-5 w-5 ${isLabActive ? "text-primary" : ""}`} />
                        <span className="font-bold uppercase tracking-wide">Laboratório</span>
                      </div>
                      <ChevronDown className={`h-4 w-4 transition-transform ${labOpen ? "rotate-180" : ""}`} />
                    </button>

                    {labOpen && (
                      <div className="ml-4 border-l-2 border-primary/30 pl-4 mt-2 space-y-1">
                        {labItems.map((item) => (
                          <Link key={item.path} href={item.path} onClick={() => setIsOpen(false)}>
                            <div className={`flex items-center gap-3 p-3 hover:bg-muted transition-colors cursor-pointer rounded ${location === item.path ? "bg-muted text-primary" : ""}`}>
                              <item.icon className="h-4 w-4" />
                              <span className="text-sm">{item.label}</span>
                            </div>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="p-6 border-t border-border bg-muted/20">
                  <Link href="/otimizacao-agregados" onClick={() => setIsOpen(false)}>
                    <Button className="w-full bg-green-500 text-black font-bold uppercase rounded-none mb-3">
                      <Gift className="w-4 h-4 mr-2" />
                      Ferramenta Grátis
                    </Button>
                  </Link>
                  <Link href="/pricing" onClick={() => setIsOpen(false)}>
                    <Button className="w-full bg-primary text-white font-bold uppercase rounded-none mb-4">
                      Ver Planos
                    </Button>
                  </Link>
                  <div className="flex justify-center gap-6">
                    <a href="https://www.instagram.com/mestresdoconcreto/" target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
                      <Instagram className="h-6 w-6" />
                    </a>
                    <a href="https://mestresconcreto.com/" target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
                      <Globe className="h-6 w-6" />
                    </a>
                    <a href="https://wa.me/5511982618300" target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
                      <MessageCircle className="h-6 w-6" />
                    </a>
                  </div>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-muted/10 pt-16 pb-8">
        <div className="container">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center gap-2 mb-6">
                <div className="w-10 h-10 flex items-center justify-center rounded-full overflow-hidden">
                  <img src="/logo-mestres-circular.png" alt="Mestres do Concreto" className="w-10 h-10 object-cover" />
                </div>
                <span className="font-bold text-xl uppercase tracking-tighter">Mestres do Concreto</span>
              </div>
              <p className="text-muted-foreground max-w-md mb-6 font-mono text-sm">
                Método, Critério e Evolução Real. Transformando a maneira como você trabalha com concreto, do hobby à profissão.
              </p>
              <div className="flex gap-4">
                <Button variant="outline" size="icon" className="rounded-none border-border hover:bg-primary hover:text-white hover:border-primary transition-all" asChild>
                  <a href="https://www.instagram.com/mestresdoconcreto/" target="_blank" rel="noreferrer"><Instagram className="h-5 w-5" /></a>
                </Button>
                <Button variant="outline" size="icon" className="rounded-none border-border hover:bg-primary hover:text-white hover:border-primary transition-all" asChild>
                  <a href="https://wa.me/5511982618300" target="_blank" rel="noreferrer"><MessageCircle className="h-5 w-5" /></a>
                </Button>
                <Button variant="outline" size="icon" className="rounded-none border-border hover:bg-primary hover:text-white hover:border-primary transition-all" asChild>
                  <a href="https://mestresconcreto.com/" target="_blank" rel="noreferrer"><Globe className="h-5 w-5" /></a>
                </Button>
              </div>
            </div>
            
            <div>
              <h3 className="font-bold uppercase tracking-wider mb-6 text-primary">Ferramentas</h3>
              <ul className="space-y-3 font-mono text-sm">
                <li><Link href="/otimizacao-agregados"><span className="text-green-500 hover:text-green-400 cursor-pointer transition-colors font-bold">Ferramenta Grátis</span></Link></li>
                <li><Link href="/"><span className="text-muted-foreground hover:text-white cursor-pointer transition-colors">Calculadora de Traço</span></Link></li>
                <li><Link href="/abrams"><span className="text-muted-foreground hover:text-white cursor-pointer transition-colors">Curva de Abrams</span></Link></li>
                <li><Link href="/laboratorio/bateladas"><span className="text-muted-foreground hover:text-white cursor-pointer transition-colors">Bateladas de Teste</span></Link></li>
                <li><Link href="/laboratorio/corte-agua"><span className="text-muted-foreground hover:text-white cursor-pointer transition-colors">Corte de Água</span></Link></li>
              </ul>
            </div>

            <div>
              <h3 className="font-bold uppercase tracking-wider mb-6 text-primary">Recursos</h3>
              <ul className="space-y-3 font-mono text-sm">
                <li><a href="https://mestresconcreto.com/cursos" target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-white transition-colors">Cursos Online</a></li>
                <li><a href="https://mestresconcreto.com/kits" target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-white transition-colors">Kits Dry Mix</a></li>
                <li><a href="https://mestresconcreto.com/consultoria" target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-white transition-colors">Consultoria Técnica</a></li>
                <li><a href="https://mestresconcreto.com/blog" target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-white transition-colors">Blog Técnico</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-border pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-xs text-muted-foreground font-mono">
              © 2025 MESTRES DO CONCRETO. TODOS OS DIREITOS RESERVADOS.
            </p>
            <p className="text-xs text-muted-foreground font-mono">
              DESENVOLVIDO COM MANUS
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
