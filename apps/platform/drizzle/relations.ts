import { relations } from "drizzle-orm";
import {
  users,
  materiais,
  tracos,
  ensaios,
  curvasAbrams,
  historicoCustos,
  licencas,
  historicoLicencas,
  assinaturasHotmart,
} from "./schema";

// Users relations
export const usersRelations = relations(users, ({ many, one }) => ({
  materiais: many(materiais),
  tracos: many(tracos),
  ensaios: many(ensaios),
  curvasAbrams: many(curvasAbrams),
  historicoCustos: many(historicoCustos),
  licenca: one(licencas), // 1:1 (userId unique em licencas)
}));

// Materiais relations
export const materiaisRelations = relations(materiais, ({ one }) => ({
  user: one(users, {
    fields: [materiais.userId],
    references: [users.id],
  }),
}));

// Traços relations
export const tracosRelations = relations(tracos, ({ one, many }) => ({
  user: one(users, {
    fields: [tracos.userId],
    references: [users.id],
  }),
  ensaios: many(ensaios),
  historicoCustos: many(historicoCustos),
}));

// Ensaios relations
export const ensaiosRelations = relations(ensaios, ({ one }) => ({
  user: one(users, {
    fields: [ensaios.userId],
    references: [users.id],
  }),
  traco: one(tracos, {
    fields: [ensaios.tracoId],
    references: [tracos.id],
  }),
}));

// Curvas de Abrams relations
export const curvasAbransRelations = relations(curvasAbrams, ({ one }) => ({
  user: one(users, {
    fields: [curvasAbrams.userId],
    references: [users.id],
  }),
}));

// Histórico de Custos relations
export const historicoCustosRelations = relations(historicoCustos, ({ one }) => ({
  user: one(users, {
    fields: [historicoCustos.userId],
    references: [users.id],
  }),
  traco: one(tracos, {
    fields: [historicoCustos.tracoId],
    references: [tracos.id],
  }),
}));

// Licenças relations
export const licencasRelations = relations(licencas, ({ one, many }) => ({
  user: one(users, {
    fields: [licencas.userId],
    references: [users.id],
  }),
  criadoPorUser: one(users, {
    fields: [licencas.criadoPor],
    references: [users.id],
  }),
  historico: many(historicoLicencas),
  assinaturasHotmart: many(assinaturasHotmart),
}));

// Histórico de Licenças relations
export const historicoLicencasRelations = relations(historicoLicencas, ({ one }) => ({
  licenca: one(licencas, {
    fields: [historicoLicencas.licencaId],
    references: [licencas.id],
  }),
  user: one(users, {
    fields: [historicoLicencas.userId],
    references: [users.id],
  }),
  realizadoPorUser: one(users, {
    fields: [historicoLicencas.realizadoPor],
    references: [users.id],
  }),
}));

// Assinaturas Hotmart relations
export const assinaturasHotmartRelations = relations(assinaturasHotmart, ({ one }) => ({
  user: one(users, {
    fields: [assinaturasHotmart.userId],
    references: [users.id],
  }),
  licenca: one(licencas, {
    fields: [assinaturasHotmart.licencaId],
    references: [licencas.id],
  }),
}));
