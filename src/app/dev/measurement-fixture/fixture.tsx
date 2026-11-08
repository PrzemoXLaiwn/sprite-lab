"use client";

import { reportServerPurchase } from "@/lib/analytics/purchase";

const FIXTURE_PURCHASE = {
  success: true,
  purchase: {
    transactionId: "pi_fixture200",
    value: 7.99,
    currency: "GBP",
    itemId: "PACK_200",
    itemName: "Inferno",
  },
};

export function MeasurementFixture() {
  return (
    <main className="min-h-screen bg-[#131A31] px-4 py-16 text-[#FFF1E8]">
      <h1 className="font-display text-[28px]">Measurement fixture</h1>
      <p className="mt-2 max-w-xl text-[14px] text-[#A7ADD4]">
        Local only. The button records a fake confirmed receipt. It does not charge a card or call Google.
      </p>
      <button
        type="button"
        data-record-purchase
        className="mt-6 inline-flex min-h-11 items-center rounded-[10px] bg-[#FFA300] px-4 text-[14px] font-semibold text-[#131A31]"
        onClick={() => {
          const status = reportServerPurchase(FIXTURE_PURCHASE);
          document.documentElement.dataset.purchaseStatus = status;
        }}
      >
        Record fixture purchase
      </button>
      <p data-purchase-status className="mt-3 text-[13px] text-[#C8CCE8]" />
    </main>
  );
}
