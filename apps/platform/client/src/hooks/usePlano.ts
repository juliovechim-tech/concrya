import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";

const isDev = import.meta.env.DEV && !import.meta.env.VITE_OAUTH_PORTAL_URL;

export type NivelPlano = "gratuito" | "tecnico" | "avancado" | "cientifico";

export interface PlanoInfo {
  nivel: NivelPlano;
  nome: string;
  trial: boolean;
  diasRestantes: number | null;
  expirado: boolean;
  limites: {
    maxTracos: number;
    exportacao: boolean;
    curvaAbrams: boolean;
    laboratorio: boolean;
    calculadoraTecnica: boolean;
    calculadoraAvancada: boolean;
    calculadoraCientifica: boolean;
    suportePrioritario: boolean;
  };
}

const PLANOS_CONFIG: Record<NivelPlano, PlanoInfo["limites"]> = {
  gratuito: {
    maxTracos: 3,
    exportacao: false,
    curvaAbrams: false,
    laboratorio: false,
    calculadoraTecnica: false,
    calculadoraAvancada: false,
    calculadoraCientifica: false,
    suportePrioritario: false,
  },
  tecnico: {
    maxTracos: -1, // ilimitado
    exportacao: true,
    curvaAbrams: true,
    laboratorio: false,
    calculadoraTecnica: true,
    calculadoraAvancada: false,
    calculadoraCientifica: false,
    suportePrioritario: false,
  },
  avancado: {
    maxTracos: -1,
    exportacao: true,
    curvaAbrams: true,
    laboratorio: true,
    calculadoraTecnica: true,
    calculadoraAvancada: true,
    calculadoraCientifica: false,
    suportePrioritario: false,
  },
  cientifico: {
    maxTracos: -1,
    exportacao: true,
    curvaAbrams: true,
    laboratorio: true,
    calculadoraTecnica: true,
    calculadoraAvancada: true,
    calculadoraCientifica: true,
    suportePrioritario: true,
  },
};

export function usePlano() {
  const { user, isAuthenticated } = useAuth();

  const { data: licencaData, isLoading } = trpc.minhaLicenca.get.useQuery(undefined, {
    enabled: !isDev && isAuthenticated && !!user?.id,
    staleTime: 1000 * 60 * 5, // 5 minutos
  });

  const getNivelFromLicenca = (): NivelPlano => {
    if (isDev) return "cientifico";
    if (!licencaData?.licenca) return "gratuito";
    
    const licenca = licencaData.licenca;
    
    // Verificar se está expirada
    if (licenca.status !== "ativa") return "gratuito";
    if (licenca.dataExpiracao && new Date(licenca.dataExpiracao) < new Date()) {
      return "gratuito";
    }
    
    // Mapear nível da licença para nível do plano
    const nivelMap: Record<string, NivelPlano> = {
      basico: "gratuito",
      tecnico: "tecnico",
      avancado: "avancado",
      cientifico: "cientifico",
      completo: "cientifico",
    };
    
    return nivelMap[licenca.nivel] || "gratuito";
  };

  const calcularDiasRestantes = (): number | null => {
    if (!licencaData?.licenca?.dataExpiracao) return null;
    
    const expiracao = new Date(licencaData.licenca.dataExpiracao);
    const hoje = new Date();
    const diff = expiracao.getTime() - hoje.getTime();
    
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  const nivel = getNivelFromLicenca();
  const diasRestantes = calcularDiasRestantes();
  const isTrial = licencaData?.licenca?.tipo === "trial";
  const isExpirado = diasRestantes !== null && diasRestantes <= 0;

  const planoInfo: PlanoInfo = {
    nivel,
    nome: nivel.charAt(0).toUpperCase() + nivel.slice(1),
    trial: isTrial,
    diasRestantes,
    expirado: isExpirado,
    limites: PLANOS_CONFIG[nivel],
  };

  // Funções de verificação de permissão
  const podeAcessar = (funcionalidade: keyof PlanoInfo["limites"]): boolean => {
    if (funcionalidade === "maxTracos") {
      return true; // Sempre pode acessar, mas com limite
    }
    return planoInfo.limites[funcionalidade] as boolean;
  };

  const podeSalvarTraco = (totalTracosAtuais: number): boolean => {
    const max = planoInfo.limites.maxTracos;
    if (max === -1) return true; // ilimitado
    return totalTracosAtuais < max;
  };

  const nivelMinimo = (nivelRequerido: NivelPlano): boolean => {
    const ordem: NivelPlano[] = ["gratuito", "tecnico", "avancado", "cientifico"];
    return ordem.indexOf(nivel) >= ordem.indexOf(nivelRequerido);
  };

  return {
    plano: planoInfo,
    isLoading,
    podeAcessar,
    podeSalvarTraco,
    nivelMinimo,
    isAuthenticated,
  };
}

export default usePlano;
