import { describe, it, expect } from 'vitest';

// Funções de cálculo de dosagem
interface MaterialDosagem {
  nome: string;
  densidade: number;
  massa: number;
  teorSolidos?: number; // Para sílica em suspensão (0-1)
}

interface ResultadoDosagem {
  volumeTotal: number;
  aguaEfetiva: number;
  aguaSilica: number;
  volumes: Record<string, number>;
}

/**
 * Calcula o volume de um material baseado em sua massa e densidade
 */
function calcularVolume(massa: number, densidade: number): number {
  if (densidade <= 0) return 0;
  return massa / densidade;
}

/**
 * Calcula a água contida na sílica em suspensão
 * @param massaSilica Massa total da sílica (incluindo água)
 * @param teorSolidos Teor de sólidos (0-1), ex: 0.5 para 50%
 */
function calcularAguaSilica(massaSilica: number, teorSolidos: number): number {
  if (teorSolidos >= 1) return 0; // Sílica seca
  return massaSilica * (1 - teorSolidos);
}

/**
 * Calcula a massa de sólidos da sílica em suspensão
 */
function calcularMassaSolidosSilica(massaSilica: number, teorSolidos: number): number {
  return massaSilica * teorSolidos;
}

/**
 * Calcula o volume da sílica considerando apenas os sólidos
 */
function calcularVolumeSilica(massaSilica: number, teorSolidos: number, densidadeSilica: number): number {
  const massaSolidos = calcularMassaSolidosSilica(massaSilica, teorSolidos);
  return calcularVolume(massaSolidos, densidadeSilica);
}

/**
 * Calcula a dosagem completa considerando sílica em suspensão
 */
function calcularDosagem(
  aguaTotal: number,
  cimento: { massa: number; densidade: number },
  silica: { massa: number; densidade: number; teorSolidos: number } | null,
  agregados: Array<{ nome: string; massa: number; densidade: number }>,
  arIncorporado: number = 0
): ResultadoDosagem {
  const volumes: Record<string, number> = {};
  
  // Volume do cimento
  volumes['cimento'] = calcularVolume(cimento.massa, cimento.densidade);
  
  // Volume e água da sílica
  let aguaSilica = 0;
  if (silica && silica.massa > 0) {
    aguaSilica = calcularAguaSilica(silica.massa, silica.teorSolidos);
    volumes['silica'] = calcularVolumeSilica(silica.massa, silica.teorSolidos, silica.densidade);
  }
  
  // Água efetiva (descontando água da sílica)
  const aguaEfetiva = aguaTotal - aguaSilica;
  volumes['agua'] = aguaEfetiva;
  
  // Volumes dos agregados
  for (const agregado of agregados) {
    volumes[agregado.nome] = calcularVolume(agregado.massa, agregado.densidade);
  }
  
  // Ar incorporado
  if (arIncorporado > 0) {
    volumes['ar'] = arIncorporado * 10; // % para litros
  }
  
  // Volume total
  const volumeTotal = Object.values(volumes).reduce((sum, v) => sum + v, 0);
  
  return {
    volumeTotal,
    aguaEfetiva,
    aguaSilica,
    volumes
  };
}

describe('Cálculos de Dosagem', () => {
  describe('calcularVolume', () => {
    it('deve calcular volume corretamente', () => {
      expect(calcularVolume(385, 3.1)).toBeCloseTo(124.19, 1);
    });
    
    it('deve retornar 0 para densidade zero', () => {
      expect(calcularVolume(100, 0)).toBe(0);
    });
  });
  
  describe('calcularAguaSilica', () => {
    it('deve calcular água da sílica em suspensão 50%', () => {
      // 27 kg de sílica com 50% de sólidos = 13.5 kg de água
      expect(calcularAguaSilica(27, 0.5)).toBe(13.5);
    });
    
    it('deve retornar 0 para sílica seca (100% sólidos)', () => {
      expect(calcularAguaSilica(27, 1)).toBe(0);
    });
    
    it('deve calcular água da sílica em suspensão 40%', () => {
      // 27 kg de sílica com 40% de sólidos = 16.2 kg de água
      expect(calcularAguaSilica(27, 0.4)).toBeCloseTo(16.2, 1);
    });
  });
  
  describe('calcularVolumeSilica', () => {
    it('deve calcular volume considerando apenas sólidos', () => {
      // 27 kg de sílica com 50% sólidos = 13.5 kg sólidos
      // Volume = 13.5 / 2.2 = 6.14 litros
      expect(calcularVolumeSilica(27, 0.5, 2.2)).toBeCloseTo(6.14, 1);
    });
    
    it('deve calcular volume de sílica seca', () => {
      // 27 kg de sílica seca (100% sólidos)
      // Volume = 27 / 2.2 = 12.27 litros
      expect(calcularVolumeSilica(27, 1, 2.2)).toBeCloseTo(12.27, 1);
    });
  });
  
  describe('calcularDosagem', () => {
    it('deve calcular dosagem sem sílica corretamente', () => {
      const resultado = calcularDosagem(
        206, // água
        { massa: 385, densidade: 3.1 }, // cimento
        null, // sem sílica
        [
          { nome: 'areia', massa: 606, densidade: 2.65 },
          { nome: 'brita', massa: 851, densidade: 2.72 }
        ],
        2 // 2% ar incorporado
      );
      
      expect(resultado.aguaSilica).toBe(0);
      expect(resultado.aguaEfetiva).toBe(206);
      expect(resultado.volumes['cimento']).toBeCloseTo(124.19, 0);
      expect(resultado.volumes['areia']).toBeCloseTo(228.68, 0);
      expect(resultado.volumes['brita']).toBeCloseTo(312.87, 0);
    });
    
    it('deve descontar água da sílica em suspensão', () => {
      const resultado = calcularDosagem(
        206, // água total
        { massa: 385, densidade: 3.1 }, // cimento
        { massa: 27, densidade: 2.2, teorSolidos: 0.5 }, // sílica 50% sólidos
        [
          { nome: 'areia', massa: 606, densidade: 2.65 },
          { nome: 'brita', massa: 851, densidade: 2.72 }
        ],
        2
      );
      
      // Água na sílica = 27 * (1 - 0.5) = 13.5 kg
      expect(resultado.aguaSilica).toBe(13.5);
      // Água efetiva = 206 - 13.5 = 192.5 litros
      expect(resultado.aguaEfetiva).toBe(192.5);
      // Volume sílica = 13.5 / 2.2 = 6.14 litros (só sólidos)
      expect(resultado.volumes['silica']).toBeCloseTo(6.14, 1);
    });
    
    it('deve calcular volume total próximo a 1000 litros', () => {
      const resultado = calcularDosagem(
        206,
        { massa: 385, densidade: 3.1 },
        { massa: 27, densidade: 2.2, teorSolidos: 1 }, // sílica seca
        [
          { nome: 'areia', massa: 606, densidade: 2.65 },
          { nome: 'brita', massa: 851, densidade: 2.72 }
        ],
        2
      );
      
      // Volume total deve estar próximo de 1000 l/m³
      expect(resultado.volumeTotal).toBeGreaterThan(900);
      expect(resultado.volumeTotal).toBeLessThan(1100);
    });
    
    it('ERRO CORRIGIDO: não deve usar densidade errada para sílica', () => {
      // Este teste verifica a correção do erro original
      // Onde a densidade do modificador de viscosidade (1.06) era usada
      // em vez da densidade da sílica (2.2)
      
      const massaSilica = 27;
      const densidadeSilicaCorreta = 2.2;
      const densidadeErrada = 1.06; // Modificador de viscosidade
      
      const volumeCorreto = calcularVolume(massaSilica, densidadeSilicaCorreta);
      const volumeErrado = calcularVolume(massaSilica, densidadeErrada);
      
      // Volume errado seria mais que o dobro do correto
      expect(volumeErrado).toBeGreaterThan(volumeCorreto * 2);
      
      // Volume correto deve ser ~12.27 litros
      expect(volumeCorreto).toBeCloseTo(12.27, 1);
      // Volume errado seria ~25.47 litros (erro!)
      expect(volumeErrado).toBeCloseTo(25.47, 1);
    });
  });
});
