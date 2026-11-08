import { GA_MEASUREMENT_ID } from "@/lib/analytics/measurement-id";
import {
  MEASUREMENT_CHOICE_KEY,
  measurementAllowed,
  parseMeasurementChoice,
  readCountryCookie,
  regionRequiresChoice,
} from "@/lib/analytics/consent";

/**
 * A purchase GA4 may record. Built only from a Stripe object the server has
 * already checked (paid, owned by the caller). Never from a success-page URL.
 *
 * A receipt is acked only from gtag's event_callback after a ready tag was
 * asked to send it, and only when measurement is allowed. Calling the stub,
 * a throw, or a refused consent does not count as delivered. A later retry
 * can still duplicate a hit that left the browser without running the
 * callback. GA4 may collapse those by transaction_id. This is not exactly-once.
 */

export interface VerifiedPurchase {
  transactionId: string;
  /** Major units (GBP pounds, not pence). */
  value: number;
  currency: string;
  itemId: string;
  itemName: string;
}

export type PurchaseReportStatus = "acked" | "dispatching" | "queued" | "withheld" | "duplicate" | "rejected";

/** How long a handoff blocks another tab or remount. A dead page can retry after this. */
export const PURCHASE_HANDOFF_MS = 2000;

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

const ACKED_KEY = "sl:ga4-purchase-acked";
const PENDING_KEY = "sl:ga4-purchase-pending";

export interface PurchaseDispatch {
  gtag?: (...args: unknown[]) => void;
  /** True only when gtag.js has taken over, not when the stub merely exists. */
  tagReady: boolean;
  measurementAllowed: boolean;
  now?: number;
}

interface HeldPurchase {
  purchase: VerifiedPurchase;
  handedAt: number | null;
}

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

function purchasePayload(purchase: VerifiedPurchase, measurementId: string, onAck: () => void) {
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
    event_callback: onAck,
  };
}

function readHeld(store: PurchaseStore): HeldPurchase[] {
  const held: HeldPurchase[] = [];
  for (const entry of readList(store, PENDING_KEY)) {
    if (!entry || typeof entry !== "object") continue;
    const record = entry as { purchase?: unknown; handedAt?: unknown };
    const purchase = parseVerifiedPurchase(record.purchase ?? entry);
    if (!purchase) continue;
    const handedAt = typeof record.handedAt === "number" && Number.isFinite(record.handedAt)
      ? record.handedAt
      : null;
    held.push({ purchase, handedAt });
  }
  return held;
}

export function createPurchaseReporter(store: PurchaseStore, measurementId = GA_MEASUREMENT_ID) {
  const memoryInflight = new Set<string>();

  function ackedIds(): string[] {
    return readList(store, ACKED_KEY).filter((id): id is string => typeof id === "string");
  }

  function isAcked(id: string): boolean {
    return ackedIds().includes(id);
  }

  function ack(id: string) {
    memoryInflight.delete(id);
    const ids = ackedIds().filter((existing) => existing !== id);
    ids.push(id);
    store.set(ACKED_KEY, JSON.stringify(ids.slice(-50)));
    const rest = readHeld(store).filter((entry) => entry.purchase.transactionId !== id);
    store.set(PENDING_KEY, JSON.stringify(rest.slice(-10)));
  }

  function writeHeld(entries: HeldPurchase[]) {
    store.set(PENDING_KEY, JSON.stringify(entries.slice(-10).map((entry) => ({
      purchase: entry.purchase,
      handedAt: entry.handedAt,
    }))));
  }

  function report(input: unknown, dispatch?: PurchaseDispatch): PurchaseReportStatus {
    const purchase = parseVerifiedPurchase(input);
    if (!purchase) return "rejected";
    const context: PurchaseDispatch = dispatch ?? { tagReady: false, measurementAllowed: false };
    if (isAcked(purchase.transactionId)) return "duplicate";

    const now = context.now ?? Date.now();
    const current = readHeld(store);
    const previous = current.find((entry) => entry.purchase.transactionId === purchase.transactionId);
    const next: HeldPurchase = {
      purchase,
      handedAt: previous?.handedAt ?? null,
    };
    writeHeld([...current.filter((entry) => entry.purchase.transactionId !== purchase.transactionId), next]);

    if (!context.measurementAllowed) return "withheld";
    if (!context.tagReady || typeof context.gtag !== "function") return "queued";
    if (memoryInflight.has(purchase.transactionId)) return "dispatching";
    if (next.handedAt !== null && now - next.handedAt < PURCHASE_HANDOFF_MS) return "dispatching";

    memoryInflight.add(purchase.transactionId);
    next.handedAt = now;
    writeHeld([...current.filter((entry) => entry.purchase.transactionId !== purchase.transactionId), next]);
    try {
      context.gtag("event", "purchase", purchasePayload(purchase, measurementId, () => ack(purchase.transactionId)));
    } catch {
      memoryInflight.delete(purchase.transactionId);
      next.handedAt = null;
      writeHeld([...readHeld(store).filter((entry) => entry.purchase.transactionId !== purchase.transactionId), next]);
      return "queued";
    }
    return isAcked(purchase.transactionId) ? "acked" : "dispatching";
  }

  function flush(dispatch?: PurchaseDispatch) {
    for (const entry of readHeld(store)) report(entry.purchase, dispatch);
  }

  return { report, flush, ack };
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

export function isGoogleTagReady(): boolean {
  return typeof window !== "undefined"
    && typeof window.google_tag_manager === "object"
    && window.google_tag_manager !== null;
}

export function browserPurchaseDispatch(now = Date.now()): PurchaseDispatch {
  const country = typeof document === "undefined" ? null : readCountryCookie(document.cookie);
  const choice = parseMeasurementChoice(
    typeof window === "undefined" ? null : browserPurchaseStore().get(MEASUREMENT_CHOICE_KEY),
  );
  return {
    gtag: typeof window === "undefined" ? undefined : window.gtag,
    tagReady: isGoogleTagReady(),
    measurementAllowed: measurementAllowed({
      choice,
      regionRequiresChoice: regionRequiresChoice(country || null),
    }),
    now,
  };
}

export function reportServerPurchase(body: unknown): PurchaseReportStatus {
  const purchase = purchaseFromConfirmBody(body);
  if (!purchase) return "rejected";
  if (typeof window === "undefined") return "queued";
  return reporter().report(purchase, browserPurchaseDispatch());
}

/** Retry receipts that were withheld or waiting for a ready tag. */
export function flushHeldPurchases(): void {
  if (typeof window === "undefined") return;
  reporter().flush(browserPurchaseDispatch());
}

declare global {
  interface Window {
    google_tag_manager?: object;
  }
}
