import { Request, Response } from "express";
import { getDb } from "./db";
import { assinaturasHotmart, licencas, historicoLicencas, users } from "../drizzle/schema";
import { eq } from "drizzle-orm";

/**
 * Webhook Handler para Hotmart
 * 
 * Eventos suportados:
 * - PURCHASE_COMPLETE: Compra aprovada
 * - PURCHASE_CANCELED: Compra cancelada
 * - PURCHASE_REFUNDED: Compra reembolsada
 * - SUBSCRIPTION_CANCELLATION: Assinatura cancelada
 * - SWITCH_PLAN: Mudança de plano
 * - PURCHASE_DELAYED: Pagamento atrasado
 * - PURCHASE_PROTEST: Protesto/chargeback
 * 
 * Documentação: https://developers.hotmart.com/docs/pt-BR/webhooks/
 */

// Mapeamento de Product IDs do Hotmart para níveis de plano
// Você deve configurar esses IDs no painel do Hotmart
const PRODUCT_NIVEL_MAP: Record<string, "tecnico" | "avancado" | "cientifico"> = {
  // Mensal
  "HOTMART_TECNICO_MENSAL": "tecnico",
  "HOTMART_AVANCADO_MENSAL": "avancado",
  "HOTMART_CIENTIFICO_MENSAL": "cientifico",
  // Anual
  "HOTMART_TECNICO_ANUAL": "tecnico",
  "HOTMART_AVANCADO_ANUAL": "avancado",
  "HOTMART_CIENTIFICO_ANUAL": "cientifico",
};

const PRODUCT_TIPO_MAP: Record<string, "mensal" | "anual"> = {
  "HOTMART_TECNICO_MENSAL": "mensal",
  "HOTMART_AVANCADO_MENSAL": "mensal",
  "HOTMART_CIENTIFICO_MENSAL": "mensal",
  "HOTMART_TECNICO_ANUAL": "anual",
  "HOTMART_AVANCADO_ANUAL": "anual",
  "HOTMART_CIENTIFICO_ANUAL": "anual",
};

interface HotmartWebhookPayload {
  event: string;
  version: string;
  id: string;
  creation_date: number;
  data: {
    product: {
      id: number;
      name: string;
      has_co_production: boolean;
    };
    buyer: {
      email: string;
      name: string;
      document: string;
      phone?: string;
    };
    purchase: {
      transaction: string;
      order_date: number;
      approved_date?: number;
      status: string;
      payment: {
        type: string;
        installments_number: number;
      };
      price: {
        value: number;
        currency_code: string;
      };
    };
    subscription?: {
      subscriber_code: string;
      status: string;
      plan: {
        id: number;
        name: string;
      };
      next_charge_date?: number;
    };
  };
}

export async function hotmartWebhookHandler(req: Request, res: Response) {
  try {
    const payload = req.body as HotmartWebhookPayload;
    const event = payload.event;
    
    console.log(`[Hotmart Webhook] Evento recebido: ${event}`);
    console.log(`[Hotmart Webhook] Transaction: ${payload.data?.purchase?.transaction}`);
    
    // Validar token do webhook (opcional, mas recomendado)
    const hottok = req.headers["x-hotmart-hottok"];
    const expectedHottok = process.env.HOTMART_HOTTOK;
    
    if (expectedHottok && hottok !== expectedHottok) {
      console.error("[Hotmart Webhook] Token inválido");
      return res.status(401).json({ error: "Token inválido" });
    }
    
    const db = await getDb();
    if (!db) {
      console.error("[Hotmart Webhook] Database não disponível");
      return res.status(500).json({ error: "Database não disponível" });
    }
    
    switch (event) {
      case "PURCHASE_COMPLETE":
      case "PURCHASE_APPROVED":
        await handlePurchaseComplete(db, payload);
        break;
        
      case "PURCHASE_CANCELED":
      case "PURCHASE_REFUNDED":
      case "PURCHASE_CHARGEBACK":
        await handlePurchaseCanceled(db, payload);
        break;
        
      case "SUBSCRIPTION_CANCELLATION":
        await handleSubscriptionCancellation(db, payload);
        break;
        
      case "PURCHASE_DELAYED":
        await handlePurchaseDelayed(db, payload);
        break;
        
      default:
        console.log(`[Hotmart Webhook] Evento não tratado: ${event}`);
    }
    
    res.status(200).json({ success: true });
  } catch (error) {
    console.error("[Hotmart Webhook] Erro:", error);
    res.status(500).json({ error: "Erro interno" });
  }
}

async function handlePurchaseComplete(db: any, payload: HotmartWebhookPayload) {
  const { buyer, purchase, subscription, product } = payload.data;
  
  // Buscar ou criar usuário pelo email
  let userResult = await db.select().from(users)
    .where(eq(users.email, buyer.email))
    .limit(1);
  
  let userId: number;
  
  if (userResult.length === 0) {
    // Criar usuário placeholder (será completado no primeiro login)
    const insertResult = await db.insert(users).values({
      openId: `hotmart_${purchase.transaction}`,
      name: buyer.name,
      email: buyer.email,
      loginMethod: "hotmart",
    });
    userId = insertResult[0].insertId;
    console.log(`[Hotmart Webhook] Usuário criado: ${userId}`);
  } else {
    userId = userResult[0].id;
    console.log(`[Hotmart Webhook] Usuário existente: ${userId}`);
  }
  
  // Determinar nível e tipo do plano
  const productId = product.id.toString();
  const nivel = PRODUCT_NIVEL_MAP[productId] || "tecnico";
  const tipo = PRODUCT_TIPO_MAP[productId] || "mensal";
  
  // Calcular data de expiração
  const dataExpiracao = new Date();
  if (tipo === "mensal") {
    dataExpiracao.setMonth(dataExpiracao.getMonth() + 1);
  } else {
    dataExpiracao.setFullYear(dataExpiracao.getFullYear() + 1);
  }
  
  // Criar ou atualizar licença
  const licencaExistente = await db.select().from(licencas)
    .where(eq(licencas.userId, userId))
    .limit(1);
  
  let licencaId: number;
  
  if (licencaExistente.length > 0) {
    await db.update(licencas)
      .set({
        tipo,
        nivel,
        status: "ativa",
        dataExpiracao,
      })
      .where(eq(licencas.userId, userId));
    licencaId = licencaExistente[0].id;
    console.log(`[Hotmart Webhook] Licença atualizada: ${licencaId}`);
  } else {
    const insertResult = await db.insert(licencas).values({
      userId,
      tipo,
      nivel,
      status: "ativa",
      dataExpiracao,
    });
    licencaId = insertResult[0].insertId;
    console.log(`[Hotmart Webhook] Licença criada: ${licencaId}`);
  }
  
  // Registrar assinatura Hotmart
  await db.insert(assinaturasHotmart).values({
    userId,
    licencaId,
    transactionId: purchase.transaction,
    subscriptionId: subscription?.subscriber_code || null,
    productId: product.id.toString(),
    planId: subscription?.plan?.id?.toString() || null,
    status: "active",
    valorPago: purchase.price.value.toString(),
    moeda: purchase.price.currency_code,
    metodoPagamento: purchase.payment.type,
    dataCompra: new Date(purchase.approved_date || purchase.order_date),
    dataProximaCobranca: subscription?.next_charge_date 
      ? new Date(subscription.next_charge_date) 
      : null,
    compradorEmail: buyer.email,
    compradorNome: buyer.name,
    compradorDocumento: buyer.document,
    webhookPayload: payload,
  });
  
  // Registrar histórico
  await db.insert(historicoLicencas).values({
    licencaId,
    userId,
    acao: "criada",
    detalhes: `Compra via Hotmart - Plano ${nivel} ${tipo} - Transaction: ${purchase.transaction}`,
  });
  
  console.log(`[Hotmart Webhook] Compra processada com sucesso`);
}

async function handlePurchaseCanceled(db: any, payload: HotmartWebhookPayload) {
  const { purchase } = payload.data;
  
  // Buscar assinatura pela transaction
  const assinatura = await db.select().from(assinaturasHotmart)
    .where(eq(assinaturasHotmart.transactionId, purchase.transaction))
    .limit(1);
  
  if (assinatura.length === 0) {
    console.log(`[Hotmart Webhook] Assinatura não encontrada: ${purchase.transaction}`);
    return;
  }
  
  const { userId, licencaId } = assinatura[0];
  
  // Atualizar status da assinatura
  await db.update(assinaturasHotmart)
    .set({
      status: payload.event === "PURCHASE_REFUNDED" ? "refunded" : "cancelled_by_customer",
      dataCancelamento: new Date(),
    })
    .where(eq(assinaturasHotmart.transactionId, purchase.transaction));
  
  // Cancelar licença
  await db.update(licencas)
    .set({
      status: "cancelada",
    })
    .where(eq(licencas.id, licencaId));
  
  // Registrar histórico
  await db.insert(historicoLicencas).values({
    licencaId,
    userId,
    acao: "cancelada",
    detalhes: `${payload.event} - Transaction: ${purchase.transaction}`,
  });
  
  console.log(`[Hotmart Webhook] Cancelamento processado: ${purchase.transaction}`);
}

async function handleSubscriptionCancellation(db: any, payload: HotmartWebhookPayload) {
  const { subscription, purchase } = payload.data;
  
  if (!subscription) return;
  
  // Buscar assinatura pelo subscriber_code
  const assinatura = await db.select().from(assinaturasHotmart)
    .where(eq(assinaturasHotmart.subscriptionId, subscription.subscriber_code))
    .limit(1);
  
  if (assinatura.length === 0) {
    console.log(`[Hotmart Webhook] Assinatura não encontrada: ${subscription.subscriber_code}`);
    return;
  }
  
  const { userId, licencaId } = assinatura[0];
  
  // Atualizar status
  await db.update(assinaturasHotmart)
    .set({
      status: "cancelled_by_customer",
      dataCancelamento: new Date(),
    })
    .where(eq(assinaturasHotmart.subscriptionId, subscription.subscriber_code));
  
  // Não cancelar imediatamente - deixar ativo até expirar
  await db.update(licencas)
    .set({
      observacoes: "Assinatura cancelada pelo cliente. Acesso até expiração.",
    })
    .where(eq(licencas.id, licencaId));
  
  // Registrar histórico
  await db.insert(historicoLicencas).values({
    licencaId,
    userId,
    acao: "cancelada",
    detalhes: `Cancelamento de assinatura - Subscriber: ${subscription.subscriber_code}`,
  });
  
  console.log(`[Hotmart Webhook] Cancelamento de assinatura processado`);
}

async function handlePurchaseDelayed(db: any, payload: HotmartWebhookPayload) {
  const { purchase, subscription } = payload.data;
  
  const transactionId = purchase.transaction;
  const subscriberId = subscription?.subscriber_code;
  
  // Buscar assinatura
  let assinatura;
  if (subscriberId) {
    assinatura = await db.select().from(assinaturasHotmart)
      .where(eq(assinaturasHotmart.subscriptionId, subscriberId))
      .limit(1);
  } else {
    assinatura = await db.select().from(assinaturasHotmart)
      .where(eq(assinaturasHotmart.transactionId, transactionId))
      .limit(1);
  }
  
  if (assinatura.length === 0) {
    console.log(`[Hotmart Webhook] Assinatura não encontrada para atraso`);
    return;
  }
  
  const { userId, licencaId } = assinatura[0];
  
  // Atualizar status para atrasado
  await db.update(assinaturasHotmart)
    .set({ status: "delayed" })
    .where(eq(assinaturasHotmart.id, assinatura[0].id));
  
  // Suspender licença
  await db.update(licencas)
    .set({ status: "suspensa" })
    .where(eq(licencas.id, licencaId));
  
  // Registrar histórico
  await db.insert(historicoLicencas).values({
    licencaId,
    userId,
    acao: "suspensa",
    detalhes: `Pagamento atrasado - Transaction: ${transactionId}`,
  });
  
  console.log(`[Hotmart Webhook] Atraso de pagamento processado`);
}
