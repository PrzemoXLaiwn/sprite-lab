import { GA_MEASUREMENT_ID } from "@/lib/analytics/measurement-id";
import {
  MEASUREMENT_CHOICE_KEY,
  parseMeasurementChoice,
  purchaseConsent,
  readCountryCookie,
  type PurchaseConsent,
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

/**
 * `acked` means this page's gtag called `event_callback`. It does not mean
 * Google Analytics stored the hit.
 */
export type PurchaseReportStatus = "acked" | "dispatching" | "queued" | "withheld" | "duplicate" | "rejected";

/** How long a handoff blocks another dispatch. After this the same reporter retries. */
export const PURCHASE_HANDOFF_MS = 2000;
/** Consented receipts are not kept longer than this, and never across an account change. */
export const PURCHASE_QUEUE_TTL_MS = 15 * 60 * 1000;
export const PURCHASE_QUEUE_LIMIT = 3;

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
  consent: PurchaseConsent;
  /** Signed-in account. Null is this anonymous page only and is never persisted. */
  ownerId?: string | null;
  now?: number;
}

interface HeldPurchase {
  purchase: VerifiedPurchase;
  ownerId: string | null;
  expiresAt: number;
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

function persistentFrom(entry: unknown, now: number): HeldPurchase | "legacy" | null {
  if (!entry || typeof entry !== "object") return null;
  const record = entry as {
    purchase?: unknown;
    ownerId?: unknown;
    expiresAt?: unknown;
    handedAt?: unknown;
  };
  const purchase = parseVerifiedPurchase(record.purchase);
  if (!purchase) return null;
  if (typeof record.ownerId !== "string" || record.ownerId.length < 1 || record.ownerId.length > 80) return "legacy";
  if (typeof record.expiresAt !== "number" || record.expiresAt <= now) return null;
  const handedAt = typeof record.handedAt === "number" && Number.isFinite(record.handedAt) ? record.handedAt : null;
  return { purchase, ownerId: record.ownerId, expiresAt: record.expiresAt, handedAt };
}

export function createPurchaseReporter(store: PurchaseStore, measurementId = GA_MEASUREMENT_ID) {
  let memory: HeldPurchase[] = [];
  let generation = 0;
  const inflight = new Map<string, { at: number; generation: number }>();

  function ackedIds(): string[] {
    return readList(store, ACKED_KEY).filter((id): id is string => typeof id === "string");
  }

  function isAcked(id: string): boolean {
    return ackedIds().includes(id);
  }

  function clearPending() {
    store.set(PENDING_KEY, "[]");
  }

  function discard() {
    memory = [];
    inflight.clear();
    clearPending();
    store.set(ACKED_KEY, "[]");
  }

  function writePersistent(entries: HeldPurchase[]) {
    const minimal = entries.slice(-PURCHASE_QUEUE_LIMIT).map((entry) => ({
      purchase: entry.purchase,
      ownerId: entry.ownerId,
      expiresAt: entry.expiresAt,
      handedAt: entry.handedAt,
    }));
    store.set(PENDING_KEY, JSON.stringify(minimal));
  }

  function loadPersistent(now: number, ownerId: string): HeldPurchase[] {
    let legacy = false;
    const kept: HeldPurchase[] = [];
    for (const entry of readList(store, PENDING_KEY)) {
      const parsed = persistentFrom(entry, now);
      if (parsed === "legacy") {
        legacy = true;
        continue;
      }
      if (!parsed || parsed.ownerId !== ownerId) continue;
      kept.push(parsed);
    }
    if (legacy) clearPending();
    else writePersistent(kept);
    return legacy ? [] : kept;
  }

  function remember(entry: HeldPurchase, persist: boolean) {
    memory = [...memory.filter((item) => item.purchase.transactionId !== entry.purchase.transactionId), entry]
      .slice(-PURCHASE_QUEUE_LIMIT);
    if (persist && entry.ownerId) writePersistent(memory.filter((item) => item.ownerId === entry.ownerId));
  }

  function ack(id: string, gen: number) {
    const current = inflight.get(id);
    if (!current || current.generation !== gen) return;
    inflight.delete(id);
    const ids = ackedIds().filter((existing) => existing !== id);
    ids.push(id);
    store.set(ACKED_KEY, JSON.stringify(ids.slice(-50)));
    memory = memory.filter((item) => item.purchase.transactionId !== id);
    const persisted = readList(store, PENDING_KEY)
      .map((entry) => persistentFrom(entry, 0))
      .filter((entry): entry is HeldPurchase => entry !== null && entry !== "legacy" && entry.purchase.transactionId !== id && entry.expiresAt > Date.now());
    writePersistent(persisted);
  }

  function lockFresh(id: string, now: number): boolean {
    const row = inflight.get(id);
    if (!row) return false;
    if (now - row.at >= PURCHASE_HANDOFF_MS) {
      inflight.delete(id);
      return false;
    }
    return true;
  }

  function dispatchPurchase(entry: HeldPurchase, context: PurchaseDispatch, now: number): PurchaseReportStatus {
    if (!context.tagReady || typeof context.gtag !== "function") return "queued";
    if (lockFresh(entry.purchase.transactionId, now)) return "dispatching";
    if (entry.handedAt !== null && now - entry.handedAt < PURCHASE_HANDOFF_MS) return "dispatching";
    const gen = ++generation;
    const id = entry.purchase.transactionId;
    inflight.set(id, { at: now, generation: gen });
    entry.handedAt = now;
    remember(entry, context.consent === "allowed" && Boolean(entry.ownerId));
    try {
      context.gtag("event", "purchase", purchasePayload(entry.purchase, measurementId, () => ack(id, gen)));
    } catch {
      inflight.delete(id);
      entry.handedAt = null;
      remember(entry, context.consent === "allowed" && Boolean(entry.ownerId));
      return "queued";
    }
    return isAcked(id) ? "acked" : "dispatching";
  }

  function report(input: unknown, dispatch?: PurchaseDispatch): PurchaseReportStatus {
    const purchase = parseVerifiedPurchase(input);
    if (!purchase) return "rejected";
    const context: PurchaseDispatch = dispatch ?? { tagReady: false, consent: "denied" };
    const now = context.now ?? Date.now();
    const ownerId = context.ownerId ?? null;

    if (context.consent === "denied") {
      discard();
      return "withheld";
    }

    if (isAcked(purchase.transactionId)) return "duplicate";
    memory = memory.filter((item) => item.expiresAt > now && item.ownerId === ownerId);

    if (context.consent === "awaiting") {
      clearPending();
      remember({
        purchase,
        ownerId,
        expiresAt: now + PURCHASE_QUEUE_TTL_MS,
        handedAt: null,
      }, false);
      return "withheld";
    }

    const previous = memory.find((item) => item.purchase.transactionId === purchase.transactionId);
    const stored = ownerId ? loadPersistent(now, ownerId).find((item) => item.purchase.transactionId === purchase.transactionId) : undefined;
    const entry: HeldPurchase = previous ?? stored ?? {
      purchase,
      ownerId,
      expiresAt: now + PURCHASE_QUEUE_TTL_MS,
      handedAt: null,
    };
    entry.purchase = purchase;
    entry.ownerId = ownerId;
    if (entry.expiresAt <= now) entry.expiresAt = now + PURCHASE_QUEUE_TTL_MS;
    remember(entry, Boolean(ownerId));
    return dispatchPurchase(entry, context, now);
  }

  function flush(dispatch?: PurchaseDispatch) {
    const context: PurchaseDispatch = dispatch ?? { tagReady: false, consent: "denied" };
    if (context.consent === "denied") {
      discard();
      return;
    }
    const now = context.now ?? Date.now();
    const ownerId = context.ownerId ?? null;
    memory = memory.filter((item) => item.expiresAt > now && item.ownerId === ownerId);
    if (context.consent === "allowed" && ownerId) {
      for (const item of loadPersistent(now, ownerId)) {
        if (!memory.some((held) => held.purchase.transactionId === item.purchase.transactionId)) memory.push(item);
      }
    }
    if (context.consent === "awaiting") return;
    for (const entry of [...memory]) dispatchPurchase(entry, context, now);
  }

  function claimAnonymous(nextOwner: string) {
    for (const item of memory) {
      if (item.ownerId === null) item.ownerId = nextOwner;
    }
  }

  return { report, flush, discard, claimAnonymous };
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
let boundOwner: string | null = null;

function reporter(): ReturnType<typeof createPurchaseReporter> {
  browserReporter ??= createPurchaseReporter(browserPurchaseStore());
  return browserReporter;
}

/** Drop every queued receipt. Reject and sign-out call this. The account id stays. */
export function discardPurchaseQueue(): void {
  reporter().discard();
}

/**
 * Account id for the queue. The first id claims anonymous receipts from this
 * page. A different id, or sign-out, deletes them instead of sending them.
 */
export function bindPurchaseOwner(next: string | null): void {
  if (next === boundOwner) return;
  if (boundOwner === null && next) {
    boundOwner = next;
    reporter().claimAnonymous(next);
    return;
  }
  boundOwner = next;
  reporter().discard();
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
    consent: purchaseConsent({ choice, country }),
    ownerId: boundOwner,
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
