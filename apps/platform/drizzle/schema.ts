import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, decimal, json } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Materiais - Banco de dados de matérias-primas
 */
export const materiais = mysqlTable("materiais", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  nome: varchar("nome", { length: 255 }).notNull(),
  tipo: mysqlEnum("tipo", [
    "cimento",
    "areia",
    "brita",
    "filler_reativo",
    "filler_inerte",
    "aditivo",
    "fibra",
    "pigmento",
    "agua"
  ]).notNull(),
  fornecedor: varchar("fornecedor", { length: 255 }),
  densidade: decimal("densidade", { precision: 6, scale: 3 }).notNull(),
  custoUnitario: decimal("custoUnitario", { precision: 10, scale: 2 }),
  custoFrete: decimal("custoFrete", { precision: 10, scale: 2 }),
  embalagem: varchar("embalagem", { length: 100 }),
  qtdEmbalagem: decimal("qtdEmbalagem", { precision: 10, scale: 2 }),
  // Campos específicos para classificação
  moduloFinura: decimal("moduloFinura", { precision: 4, scale: 2 }),
  dmaxCaract: decimal("dmaxCaract", { precision: 6, scale: 2 }),
  blaine: int("blaine"),
  bet: decimal("bet", { precision: 8, scale: 2 }),
  malhaRetencao: varchar("malhaRetencao", { length: 50 }),
  // Para sílica em suspensão
  teorSolidos: decimal("teorSolidos", { precision: 5, scale: 2 }),
  teorAgua: decimal("teorAgua", { precision: 5, scale: 2 }),
  // Granulometria (JSON com peneiras)
  granulometria: json("granulometria"),
  observacoes: text("observacoes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Material = typeof materiais.$inferSelect;
export type InsertMaterial = typeof materiais.$inferInsert;

/**
 * Traços - Formulações salvas pelos usuários
 */
export const tracos = mysqlTable("tracos", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  nome: varchar("nome", { length: 255 }).notNull(),
  descricao: text("descricao"),
  tipoConcreto: mysqlEnum("tipoConcreto", [
    "convencional",
    "caa",
    "hpc",
    "uhpc",
    "grc",
    "colorido",
    "leve",
    "bloco",
    "paver",
    "arquitetonico"
  ]).notNull(),
  fckAlvo: int("fckAlvo"),
  slumpAlvo: int("slumpAlvo"),
  flowAlvo: int("flowAlvo"),
  teorArgamassa: decimal("teorArgamassa", { precision: 5, scale: 2 }),
  relacaoAC: decimal("relacaoAC", { precision: 4, scale: 3 }),
  teorArIncorporado: decimal("teorArIncorporado", { precision: 4, scale: 2 }),
  // Composição do traço (JSON com materiais e quantidades)
  composicao: json("composicao"),
  // Resultados calculados
  consumoCimento: decimal("consumoCimento", { precision: 8, scale: 2 }),
  custoM3: decimal("custoM3", { precision: 10, scale: 2 }),
  massaEspecifica: decimal("massaEspecifica", { precision: 8, scale: 2 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Traco = typeof tracos.$inferSelect;
export type InsertTraco = typeof tracos.$inferInsert;

/**
 * Ensaios - Resultados de resistência por idade
 */
export const ensaios = mysqlTable("ensaios", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  tracoId: int("tracoId"),
  nome: varchar("nome", { length: 255 }).notNull(),
  dataEnsaio: timestamp("dataEnsaio").notNull(),
  // Resultados por idade (JSON: {idade: {cp1: valor, cp2: valor, media: valor}})
  resultados: json("resultados"),
  // Parâmetros da curva de Abrams calculada
  k1: decimal("k1", { precision: 10, scale: 4 }),
  k2: decimal("k2", { precision: 10, scale: 4 }),
  r2: decimal("r2", { precision: 6, scale: 4 }),
  observacoes: text("observacoes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Ensaio = typeof ensaios.$inferSelect;
export type InsertEnsaio = typeof ensaios.$inferInsert;

/**
 * Curvas de Abrams - Curvas calibradas salvas
 */
export const curvasAbrams = mysqlTable("curvas_abrams", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  nome: varchar("nome", { length: 255 }).notNull(),
  tipoCimento: varchar("tipoCimento", { length: 100 }),
  idade: int("idade").notNull(), // dias
  // Pontos da curva (JSON: [{ac: valor, fc: valor}])
  pontos: json("pontos"),
  // Parâmetros calculados
  k1: decimal("k1", { precision: 10, scale: 4 }).notNull(),
  k2: decimal("k2", { precision: 10, scale: 4 }).notNull(),
  r2: decimal("r2", { precision: 6, scale: 4 }),
  observacoes: text("observacoes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CurvaAbrams = typeof curvasAbrams.$inferSelect;
export type InsertCurvaAbrams = typeof curvasAbrams.$inferInsert;

/**
 * Histórico de Custos - Para dashboard de evolução
 */
export const historicoCustos = mysqlTable("historico_custos", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  tracoId: int("tracoId"),
  data: timestamp("data").notNull(),
  custoM3: decimal("custoM3", { precision: 10, scale: 2 }).notNull(),
  detalhes: json("detalhes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type HistoricoCusto = typeof historicoCustos.$inferSelect;
export type InsertHistoricoCusto = typeof historicoCustos.$inferInsert;

/**
 * Licenças - Sistema de controle de acesso por licença
 */
export const licencas = mysqlTable("licencas", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  tipo: mysqlEnum("tipo", ["mensal", "anual", "vitalicia", "trial"]).notNull(),
  status: mysqlEnum("status", ["ativa", "expirada", "cancelada", "suspensa"]).default("ativa").notNull(),
  dataInicio: timestamp("dataInicio").defaultNow().notNull(),
  dataExpiracao: timestamp("dataExpiracao"),
  nivel: mysqlEnum("nivel", ["basico", "tecnico", "avancado", "cientifico", "completo"]).default("basico").notNull(),
  observacoes: text("observacoes"),
  criadoPor: int("criadoPor"), // Admin que criou
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Licenca = typeof licencas.$inferSelect;
export type InsertLicenca = typeof licencas.$inferInsert;

/**
 * Histórico de Licenças - Log de alterações
 */
export const historicoLicencas = mysqlTable("historico_licencas", {
  id: int("id").autoincrement().primaryKey(),
  licencaId: int("licencaId").notNull(),
  userId: int("userId").notNull(),
  acao: mysqlEnum("acao", ["criada", "renovada", "cancelada", "suspensa", "reativada", "alterada"]).notNull(),
  detalhes: text("detalhes"),
  realizadoPor: int("realizadoPor"), // Admin que realizou
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type HistoricoLicenca = typeof historicoLicencas.$inferSelect;
export type InsertHistoricoLicenca = typeof historicoLicencas.$inferInsert;

/**
 * Assinaturas Hotmart - Integração com plataforma de vendas
 */
export const assinaturasHotmart = mysqlTable("assinaturas_hotmart", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  licencaId: int("licencaId"),
  // Dados do Hotmart
  transactionId: varchar("transactionId", { length: 100 }).unique(),
  subscriptionId: varchar("subscriptionId", { length: 100 }),
  productId: varchar("productId", { length: 100 }),
  planId: varchar("planId", { length: 100 }),
  // Status da assinatura
  status: mysqlEnum("status", [
    "active",
    "inactive",
    "delayed",
    "cancelled_by_customer",
    "cancelled_by_seller",
    "cancelled_by_admin",
    "overdue",
    "expired",
    "trial",
    "refunded"
  ]).default("active").notNull(),
  // Dados de pagamento
  valorPago: decimal("valorPago", { precision: 10, scale: 2 }),
  moeda: varchar("moeda", { length: 10 }).default("BRL"),
  metodoPagamento: varchar("metodoPagamento", { length: 50 }),
  // Datas
  dataCompra: timestamp("dataCompra"),
  dataProximaCobranca: timestamp("dataProximaCobranca"),
  dataCancelamento: timestamp("dataCancelamento"),
  // Dados do comprador (do webhook)
  compradorEmail: varchar("compradorEmail", { length: 320 }),
  compradorNome: varchar("compradorNome", { length: 255 }),
  compradorDocumento: varchar("compradorDocumento", { length: 20 }),
  // Webhook raw data
  webhookPayload: json("webhookPayload"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AssinaturaHotmart = typeof assinaturasHotmart.$inferSelect;
export type InsertAssinaturaHotmart = typeof assinaturasHotmart.$inferInsert;

/**
 * Planos - Configuração dos planos disponíveis
 */
export const planos = mysqlTable("planos", {
  id: int("id").autoincrement().primaryKey(),
  codigo: varchar("codigo", { length: 50 }).notNull().unique(), // gratuito, tecnico, avancado, cientifico
  nome: varchar("nome", { length: 100 }).notNull(),
  descricao: text("descricao"),
  precoMensal: decimal("precoMensal", { precision: 10, scale: 2 }).notNull(),
  precoAnual: decimal("precoAnual", { precision: 10, scale: 2 }).notNull(),
  // IDs do Hotmart
  hotmartProductIdMensal: varchar("hotmartProductIdMensal", { length: 100 }),
  hotmartProductIdAnual: varchar("hotmartProductIdAnual", { length: 100 }),
  // Limites e permissões (JSON)
  permissoes: json("permissoes"),
  limites: json("limites"),
  ativo: mysqlEnum("ativo", ["sim", "nao"]).default("sim").notNull(),
  ordem: int("ordem").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Plano = typeof planos.$inferSelect;
export type InsertPlano = typeof planos.$inferInsert;

/**
 * Leads - Captura de e-mails de visitantes
 */
export const leads = mysqlTable("leads", {
  id: int("id").autoincrement().primaryKey(),
  email: varchar("email", { length: 320 }).notNull(),
  nome: varchar("nome", { length: 255 }),
  telefone: varchar("telefone", { length: 20 }),
  origem: varchar("origem", { length: 100 }).notNull(), // ferramenta_gratuita, landing_page, etc
  ferramenta: varchar("ferramenta", { length: 100 }), // otimizacao_agregados, calculadora, etc
  interesse: varchar("interesse", { length: 100 }), // plano de interesse
  // Dados adicionais
  utmSource: varchar("utmSource", { length: 100 }),
  utmMedium: varchar("utmMedium", { length: 100 }),
  utmCampaign: varchar("utmCampaign", { length: 100 }),
  // Status
  status: mysqlEnum("status", ["novo", "contatado", "qualificado", "convertido", "descartado"]).default("novo").notNull(),
  observacoes: text("observacoes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Lead = typeof leads.$inferSelect;
export type InsertLead = typeof leads.$inferInsert;

/**
 * Calculations - Log de calculos executados (COMPENSA, NIVELIX, etc.)
 */
export const calculations = mysqlTable("calculations", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  feature: varchar("feature", { length: 32 }).notNull(), // "compensa" | "nivelix" | "ecorisk"
  input: json("input").notNull(),
  output: json("output").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  deletedAt: timestamp("deleted_at"),
});

export type Calculation = typeof calculations.$inferSelect;
export type InsertCalculation = typeof calculations.$inferInsert;
