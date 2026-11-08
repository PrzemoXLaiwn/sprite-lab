import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MeasurementFixture } from "./fixture";

export const metadata: Metadata = {
  title: "Measurement fixture",
  robots: { index: false, follow: false },
};

/** Local-only. Production proxy returns 404 before this renders. */
export default function MeasurementFixturePage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <MeasurementFixture />;
}
