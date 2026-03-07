import { describe, it, expect, beforeEach } from "vitest";

// Mock do banco de dados para testes
const mockLeads: Array<{
  id: number;
  email: string;
  nome: string | null;
  telefone: string | null;
  origem: string;
  ferramenta: string | null;
  interesse: string | null;
}> = [];

let nextId = 1;

// Funções de validação e processamento de leads
function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function validateOrigem(origem: string): boolean {
  return origem.length > 0;
}

function findLeadByEmail(email: string) {
  return mockLeads.find(lead => lead.email === email);
}

function createLead(data: {
  email: string;
  nome?: string;
  telefone?: string;
  origem: string;
  ferramenta?: string;
  interesse?: string;
}): { success: boolean; isNew: boolean; id: number } {
  if (!validateEmail(data.email)) {
    throw new Error("Invalid email format");
  }
  
  if (!validateOrigem(data.origem)) {
    throw new Error("Origem is required");
  }

  const existing = findLeadByEmail(data.email);
  
  if (existing) {
    // Atualizar lead existente
    existing.nome = data.nome || existing.nome;
    existing.telefone = data.telefone || existing.telefone;
    existing.ferramenta = data.ferramenta || existing.ferramenta;
    existing.interesse = data.interesse || existing.interesse;
    return { success: true, isNew: false, id: existing.id };
  }
  
  // Criar novo lead
  const newLead = {
    id: nextId++,
    email: data.email,
    nome: data.nome || null,
    telefone: data.telefone || null,
    origem: data.origem,
    ferramenta: data.ferramenta || null,
    interesse: data.interesse || null,
  };
  
  mockLeads.push(newLead);
  return { success: true, isNew: true, id: newLead.id };
}

function checkEmailExists(email: string): { exists: boolean } {
  if (!validateEmail(email)) {
    throw new Error("Invalid email format");
  }
  return { exists: !!findLeadByEmail(email) };
}

describe("Leads - Validação de Email", () => {
  it("deve aceitar email válido", () => {
    expect(validateEmail("test@example.com")).toBe(true);
    expect(validateEmail("user.name@domain.com.br")).toBe(true);
    expect(validateEmail("user+tag@example.org")).toBe(true);
  });

  it("deve rejeitar email inválido", () => {
    expect(validateEmail("invalid-email")).toBe(false);
    expect(validateEmail("@example.com")).toBe(false);
    expect(validateEmail("test@")).toBe(false);
    expect(validateEmail("test")).toBe(false);
    expect(validateEmail("")).toBe(false);
  });
});

describe("Leads - Validação de Origem", () => {
  it("deve aceitar origem válida", () => {
    expect(validateOrigem("ferramenta_gratuita")).toBe(true);
    expect(validateOrigem("landing_page")).toBe(true);
  });

  it("deve rejeitar origem vazia", () => {
    expect(validateOrigem("")).toBe(false);
  });
});

describe("Leads - Criação", () => {
  beforeEach(() => {
    // Limpar mock antes de cada teste
    mockLeads.length = 0;
    nextId = 1;
  });

  it("deve criar novo lead com dados válidos", () => {
    const result = createLead({
      email: "test@example.com",
      nome: "Teste Usuario",
      origem: "ferramenta_gratuita",
      ferramenta: "otimizacao_agregados",
    });

    expect(result.success).toBe(true);
    expect(result.isNew).toBe(true);
    expect(result.id).toBe(1);
    expect(mockLeads.length).toBe(1);
    expect(mockLeads[0].email).toBe("test@example.com");
  });

  it("deve atualizar lead existente com mesmo email", () => {
    // Criar primeiro lead
    const first = createLead({
      email: "duplicate@example.com",
      nome: "Primeiro Nome",
      origem: "ferramenta_gratuita",
    });

    expect(first.isNew).toBe(true);
    expect(mockLeads.length).toBe(1);

    // Tentar criar com mesmo email
    const second = createLead({
      email: "duplicate@example.com",
      nome: "Segundo Nome",
      origem: "landing_page",
      ferramenta: "calculadora",
    });

    expect(second.isNew).toBe(false);
    expect(second.id).toBe(first.id);
    expect(mockLeads.length).toBe(1);
    expect(mockLeads[0].nome).toBe("Segundo Nome");
    expect(mockLeads[0].ferramenta).toBe("calculadora");
  });

  it("deve lançar erro para email inválido", () => {
    expect(() => createLead({
      email: "invalid-email",
      origem: "ferramenta_gratuita",
    })).toThrow("Invalid email format");
  });

  it("deve lançar erro para origem vazia", () => {
    expect(() => createLead({
      email: "test@example.com",
      origem: "",
    })).toThrow("Origem is required");
  });

  it("deve criar lead apenas com campos obrigatórios", () => {
    const result = createLead({
      email: "minimal@example.com",
      origem: "test",
    });

    expect(result.success).toBe(true);
    expect(mockLeads[0].nome).toBeNull();
    expect(mockLeads[0].telefone).toBeNull();
    expect(mockLeads[0].ferramenta).toBeNull();
  });
});

describe("Leads - Verificação de Email", () => {
  beforeEach(() => {
    mockLeads.length = 0;
    nextId = 1;
  });

  it("deve retornar exists: false para email novo", () => {
    const result = checkEmailExists("nonexistent@example.com");
    expect(result.exists).toBe(false);
  });

  it("deve retornar exists: true para email existente", () => {
    createLead({
      email: "existing@example.com",
      origem: "test",
    });

    const result = checkEmailExists("existing@example.com");
    expect(result.exists).toBe(true);
  });

  it("deve lançar erro para email inválido", () => {
    expect(() => checkEmailExists("invalid")).toThrow("Invalid email format");
  });
});

describe("Leads - Fluxo Completo", () => {
  beforeEach(() => {
    mockLeads.length = 0;
    nextId = 1;
  });

  it("deve simular fluxo de captura de lead na ferramenta gratuita", () => {
    // 1. Verificar se email já existe
    const check1 = checkEmailExists("usuario@gmail.com");
    expect(check1.exists).toBe(false);

    // 2. Criar lead
    const create = createLead({
      email: "usuario@gmail.com",
      nome: "João Silva",
      origem: "ferramenta_gratuita",
      ferramenta: "otimizacao_agregados",
    });
    expect(create.success).toBe(true);
    expect(create.isNew).toBe(true);

    // 3. Verificar novamente
    const check2 = checkEmailExists("usuario@gmail.com");
    expect(check2.exists).toBe(true);

    // 4. Tentar criar novamente (deve atualizar)
    const update = createLead({
      email: "usuario@gmail.com",
      interesse: "plano_tecnico",
      origem: "landing_page",
    });
    expect(update.isNew).toBe(false);
    expect(update.id).toBe(create.id);

    // 5. Verificar dados atualizados
    const lead = mockLeads[0];
    expect(lead.nome).toBe("João Silva"); // Mantém nome original
    expect(lead.interesse).toBe("plano_tecnico"); // Atualiza interesse
  });
});
