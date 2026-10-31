// Cookie assignment. The live list is empty: nothing is experimented on until
// an entry is added here. Assignment is a pure function of visitor id + id,
// so the same visitor stays on the same variant.

export interface ExperimentDef {
  id: string;
  variants: readonly [string, ...string[]];
}

export const EXPERIMENTS: readonly ExperimentDef[] = [];

export function assignVariant(
  visitorId: string,
  experimentId: string,
  experiments: readonly ExperimentDef[] = EXPERIMENTS,
): string | null {
  const experiment = experiments.find((item) => item.id === experimentId);
  if (!experiment || experiment.variants.length < 2) return null;
  let hash = 2166136261;
  const key = `${experimentId}\0${visitorId}`;
  for (let i = 0; i < key.length; i++) {
    hash ^= key.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const index = (hash >>> 0) % experiment.variants.length;
  return experiment.variants[index] ?? null;
}
