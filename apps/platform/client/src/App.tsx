import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Layout from "./components/Layout";
import { lazy, Suspense } from "react";

// Lazy load de todas as páginas para melhor performance
const Home = lazy(() => import("./pages/Home"));
const Kits = lazy(() => import("./pages/Kits"));
const Tutoriais = lazy(() => import("./pages/Tutoriais"));
const Materiais = lazy(() => import("./pages/Materiais"));
const Ensaios = lazy(() => import("./pages/Ensaios"));
const Admin = lazy(() => import("./pages/Admin"));
const Downloads = lazy(() => import("./pages/Downloads"));
const CadastroEnsaios = lazy(() => import("./pages/CadastroEnsaios"));
const Consultoria = lazy(() => import("./pages/Consultoria"));
const Pricing = lazy(() => import("./pages/Pricing"));
const FAQ = lazy(() => import("./pages/FAQ"));
const LandingVendas = lazy(() => import("./pages/LandingVendas"));
const Obrigado = lazy(() => import("./pages/Obrigado"));
const AdminLeads = lazy(() => import("./pages/AdminLeads"));
const DashboardCustos = lazy(() => import("./pages/DashboardCustos"));
const CompensaCore = lazy(() => import("./pages/CompensaCore"));
const NivelixCore = lazy(() => import("./pages/NivelixCore"));
const EcoriskCore = lazy(() => import("./pages/EcoriskCore"));
const Historico = lazy(() => import("./pages/Historico"));
const DensusEnginePage = lazy(() => import("./pages/DensusEngine"));
const NexusCore = lazy(() => import("./pages/NexusCore"));
const NotFound = lazy(() => import("./pages/NotFound"));

function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" />
    </div>
  );
}

function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <Layout>
      <Suspense fallback={<PageLoader />}>
        <Switch>
          <Route path={"/"} component={Home} />
          <Route path={"/materiais"} component={Materiais} />
          <Route path={"/ensaios"} component={Ensaios} />
          <Route path={"/kits"} component={Kits} />
          <Route path={"/consultoria"} component={Consultoria} />
          <Route path={"/pricing"} component={Pricing} />
          <Route path={"/planos"} component={Pricing} />
          <Route path={"/faq"} component={FAQ} />
          <Route path={"/oferta"} component={LandingVendas} />
          <Route path={"/vendas"} component={LandingVendas} />
          <Route path={"/obrigado"} component={Obrigado} />
          <Route path={"/thank-you"} component={Obrigado} />
          <Route path={"/tutoriais"} component={Tutoriais} />
          <Route path={"/admin"} component={Admin} />
          <Route path={"/admin/leads"} component={AdminLeads} />
          <Route path={"/dashboard-custos"} component={DashboardCustos} />
          <Route path={"/downloads"} component={Downloads} />
          {/* Laboratório */}
          <Route path={"/laboratorio/cadastro-ensaios"} component={CadastroEnsaios} />
          {/* Solucoes Verticais */}
          <Route path={"/compensa"} component={CompensaCore} />
          <Route path={"/nivelix"} component={NivelixCore} />
          <Route path={"/ecorisk"} component={EcoriskCore} />
          <Route path={"/historico"} component={Historico} />
          <Route path={"/dosagem"} component={DensusEnginePage} />
          <Route path={"/nexus"} component={NexusCore} />
          <Route path={"/404"} component={NotFound} />
          {/* Final fallback route */}
          <Route component={NotFound} />
        </Switch>
      </Suspense>
    </Layout>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
