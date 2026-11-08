import { GA_MEASUREMENT_ID } from "@/lib/analytics/measurement-id";

/**
 * A purchase GA4 may record. Built only from a Stripe object the server has
 * already checked (paid, owned by the caller). Never from a success-page URL.
 *
 * Reporting calls the existing gtag function, which already applies Consent
 * Mode. This module does not update consent and does not mark a denied
 * region as granted.
 */

export interface VerifiedPurchase {
  transactionId: string;
  /** Major units (GBP pounds, not pence). */
  value: number;
  currency: string;
  itemId: string;
  itemName: string;
}

export type PurchaseReportStatus = "sent" | "duplicate" | "rejected" | "unavailable";

const ZERO_DECIMAL = new Set([
  "BIF", "CLP", "DJF", "GNF", "JPY", "KMF", "KRW", "MGA", "PYG", "RWF",
  "UGX", "VND", "VUV", "XAF", "XOF", "XPF",
]);
const THREE_DECIMAL = new Set(["BHD", "JOD", "KWD", "OMR", "TND"]);

const TRANSACTION_ID = /^(pi|in)_[A-Za-z0-9]+$/;
const SETUP_INTENT_ID = /^seti_[A-Za-z0-9]+$/;
const ITEM_ID = /^[A-Za-z0-9_-]{1,64}$/;

export interface PurchaseStore {
  get(key: string): string | null;
  set(key: string, value: string): void;
}

const REPORTED_KEY = "sl:ga4-purchase-reported";
const PENDING_KEY = "sl:ga4-purchase-pending";

function currencyExponent(currency: string): number | null {
  if (!/^[A-Z]{3}$/.test(currency)) return null;
  if (ZERO_DECIMAL.has(currency)) return 0;
  if (THREE_DECIMAL.has(currency)) return 3;
  return 2;
}

/** Stripe minor units → major units. Returns null rather than guessing. */
export function majorFromMinor(amountMinor: unknown, currency: unknown): number | null {
  if (typeof amountMinor !== "number" || !Number.isInteger(amountMinor) || amountMinor < 0) return null;
  if (typeof currency !== "string") return null;
  const code = currency.toUpperCase();
  const exp = currencyExponent(code);
  if (exp === null) return null;
  const factor = 10 ** exp;
  const whole = Math.trunc(amountMinor / factor);
  const frac = amountMinor % factor;
  if (exp === 0) return whole;
  return Number(`${whole}.${String(frac).padStart(exp, "0")}`);
}

export function purchaseFromMinor(input: {
  transactionId: unknown;
  amountMinor: unknown;
  currency: unknown;
  itemId: unknown;
  itemName: unknown;
}): VerifiedPurchase | null {
  if (typeof input.transactionId !== "string" || !TRANSACTION_ID.test(input.transactionId)) return null;
  if (typeof input.itemId !== "string" || !ITEM_ID.test(input.itemId)) return null;
  if (typeof input.itemName !== "string") return null;
  const itemName = input.itemName.trim();
  if (itemName.length < 1 || itemName.length > 80) return null;
  if (typeof input.currency !== "string") return null;
  const currency = input.currency.toUpperCase();
  const value = majorFromMinor(input.amountMinor, currency);
  if (value === null) return null;
  return {
    transactionId: input.transactionId,
    value,
    currency,
    itemId: input.itemId,
    itemName,
  };
}

/**
 * First subscription charge only. Renewals (`subscription_cycle`) and unpaid
 * invoices are not purchases for this measurement.
 */
/**
 * The caller's first paid subscription invoice. A renewal, or a subscription
 * whose metadata belongs to someone else or a different plan, is not usable.
 */
export function firstPaidSubscriptionInvoice<T extends {
  status?: string | null;
  billing_reason?: string | null;
}>(
  invoices: T[],
  subscription: { metadata?: { userId?: string | null; plan?: string | null } | null },
  userId: string,
  plan: string,
): T | null {
  if (subscription.metadata?.userId !== userId) return null;
  if (subscription.metadata?.plan !== plan) return null;
  return invoices.find((invoice) =>
    invoice.status === "paid" && invoice.billing_reason === "subscription_create"
  ) ?? null;
}

export function purchaseFromSubscriptionInvoice(
  invoice: {
    id?: string | null;
    status?: string | null;
    billing_reason?: string | null;
    amount_paid?: number | null;
    currency?: string | null;
  },
  item: { itemId: string; itemName: string },
): VerifiedPurchase | null {
  if (invoice.status !== "paid") return null;
  if (invoice.billing_reason !== "subscription_create") return null;
  return purchaseFromMinor({
    transactionId: invoice.id,
    amountMinor: invoice.amount_paid,
    currency: invoice.currency,
    itemId: item.itemId,
    itemName: item.itemName,
  });
}

export function purchaseFromPaymentIntent(
  paymentIntent: {
    id?: string | null;
    status?: string | null;
    amount?: number | null;
    amount_received?: number | null;
    currency?: string | null;
  },
  item: { itemId: string; itemName: string },
): VerifiedPurchase | null {
  if (paymentIntent.status !== "succeeded") return null;
  const amountMinor = typeof paymentIntent.amount_received === "number"
    ? paymentIntent.amount_received
    : paymentIntent.amount;
  return purchaseFromMinor({
    transactionId: paymentIntent.id,
    amountMinor,
    currency: paymentIntent.currency,
    itemId: item.itemId,
    itemName: item.itemName,
  });
}

export function parseVerifiedPurchase(input: unknown): VerifiedPurchase | null {
  if (!input || typeof input !== "object") return null;
  const record = input as Record<string, unknown>;
  if (typeof record.value !== "number" || !Number.isFinite(record.value) || record.value < 0) return null;
  if (typeof record.currency !== "string") return null;
  const exp = currencyExponent(record.currency.toUpperCase());
  if (exp === null) return null;
  // Reject values with extra precision, then rebuild from integer minor units
  // so 7.99 survives binary float and a non-number cannot sneak through.
  const fixed = record.value.toFixed(exp);
  if (Math.abs(Number(fixed) - record.value) > 10 ** -(exp + 2)) return null;
  const amountMinor = exp === 0 ? Math.round(record.value) : Number(fixed.replace(".", ""));
  return purchaseFromMinor({
    transactionId: record.transactionId,
    amountMinor,
    currency: record.currency,
    itemId: record.itemId,
    itemName: record.itemName,
  });
}

/**
 * Receipt from a confirm response. URL prices, plan list prices and a
 * `purchase` object on an error body are ignored.
 */
export function purchaseFromConfirmBody(body: unknown): VerifiedPurchase | null {
  if (!body || typeof body !== "object") return null;
  const record = body as Record<string, unknown>;
  if (record.success !== true) return null;
  if (record.error) return null;
  return parseVerifiedPurchase(record.purchase);
}

export function stripeReturnIds(params: { get(name: string): string | null }): {
  setupIntentId: string | null;
  paymentIntentId: string | null;
} {
  const setup = params.get("setup_intent");
  const payment = params.get("payment_intent");
  return {
    setupIntentId: setup && SETUP_INTENT_ID.test(setup) ? setup : null,
    paymentIntentId: payment && /^pi_[A-Za-z0-9]+$/.test(payment) ? payment : null,
  };
}

const SUBSCRIPTION_PLANS = new Set(["STARTER", "PRO", "UNLIMITED"]);

/**
 * Identifiers the success page may send to confirm. `redirect_status`, price
 * and session_id are not proof and are not returned.
 */
export function subscriptionReturnToConfirm(params: { get(name: string): string | null }): {
  setupIntentId: string;
  plan: string;
} | null {
  const { setupIntentId } = stripeReturnIds(params);
  const plan = (params.get("plan") || "").toUpperCase();
  if (!setupIntentId || !SUBSCRIPTION_PLANS.has(plan)) return null;
  return { setupIntentId, plan };
}

export function paymentReturnToConfirm(params: { get(name: string): string | null }): {
  paymentIntentId: string;
} | null {
  const { paymentIntentId } = stripeReturnIds(params);
  if (!paymentIntentId) return null;
  return { paymentIntentId };
}

function readList(store: PurchaseStore, key: string): unknown[] {
  try {
    const raw = store.get(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function purchasePayload(purchase: VerifiedPurchase, measurementId: string) {
  return {
    send_to: measurementId,
    transaction_id: purchase.transactionId,
    value: purchase.value,
    currency: purchase.currency,
    items: [{
      item_id: purchase.itemId,
      item_name: purchase.itemName,
      price: purchase.value,
      quantity: 1,
    }],
  };
}

export function createPurchaseReporter(store: PurchaseStore, measurementId = GA_MEASUREMENT_ID) {
  const memoryReported = new Set<string>();
  const inflight = new Set<string>();

  function reportedIds(): string[] {
    return readList(store, REPORTED_KEY).filter((id): id is string => typeof id === "string");
  }

  function isReported(id: string): boolean {
    return memoryReported.has(id) || reportedIds().includes(id);
  }

  function markReported(id: string) {
    memoryReported.add(id);
    const ids = reportedIds().filter((existing) => existing !== id);
    ids.push(id);
    store.set(REPORTED_KEY, JSON.stringify(ids.slice(-50)));
  }

  function pending(): VerifiedPurchase[] {
    return readList(store, PENDING_KEY)
      .map((entry) => parseVerifiedPurchase(entry))
      .filter((entry): entry is VerifiedPurchase => entry !== null);
  }

  function writePending(purchases: VerifiedPurchase[]) {
    store.set(PENDING_KEY, JSON.stringify(purchases.slice(-10)));
  }

  function hold(purchase: VerifiedPurchase) {
    const rest = pending().filter((entry) => entry.transactionId !== purchase.transactionId);
    rest.push(purchase);
    writePending(rest);
  }

  function report(input: unknown, gtag?: (...args: unknown[]) => void): PurchaseReportStatus {
    const purchase = parseVerifiedPurchase(input);
    if (!purchase) return "rejected";
    if (isReported(purchase.transactionId) || inflight.has(purchase.transactionId)) return "duplicate";
    if (typeof gtag !== "function") {
      hold(purchase);
      return "unavailable";
    }
    inflight.add(purchase.transactionId);
    markReported(purchase.transactionId);
    writePending(pending().filter((entry) => entry.transactionId !== purchase.transactionId));
    try {
      gtag("event", "purchase", purchasePayload(purchase, measurementId));
    } catch {
      // The id is already recorded, so a later remount cannot send a second hit.
    } finally {
      inflight.delete(purchase.transactionId);
    }
    return "sent";
  }

  function flush(gtag?: (...args: unknown[]) => void) {
    for (const purchase of pending()) report(purchase, gtag);
  }

  return { report, flush };
}

export function memoryPurchaseStore(): PurchaseStore {
  const data = new Map<string, string>();
  return {
    get: (key) => data.get(key) ?? null,
    set: (key, value) => { data.set(key, value); },
  };
}

function browserPurchaseStore(): PurchaseStore {
  return {
    get: (key) => {
      try { return window.localStorage.getItem(key); } catch { return null; }
    },
    set: (key, value) => {
      try { window.localStorage.setItem(key, value); } catch { /* private mode */ }
    },
  };
}

let browserReporter: ReturnType<typeof createPurchaseReporter> | null = null;

function reporter(): ReturnType<typeof createPurchaseReporter> {
  browserReporter ??= createPurchaseReporter(browserPurchaseStore());
  return browserReporter;
}

export function reportServerPurchase(body: unknown): PurchaseReportStatus {
  const purchase = purchaseFromConfirmBody(body);
  if (!purchase) return "rejected";
  const gtag = typeof window === "undefined" ? undefined : window.gtag;
  return reporter().report(purchase, gtag);
}

/** Retry a receipt that was saved because gtag was not ready yet. */
export function flushHeldPurchases(): void {
  if (typeof window === "undefined") return;
  reporter().flush(window.gtag);
}
