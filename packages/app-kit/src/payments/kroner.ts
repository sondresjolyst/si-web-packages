/**
 * Kroner typed into a form as whole øre. It takes whole kroner, or kroner with one or two decimals
 * after a comma or a dot, and ignores space around it. Anything else gives `null`, such as a minus
 * sign, a thousands separator, or a third decimal. The sum is done on integers, so `0.29` is always
 * 29 øre.
 */
export function parseKroner(typed: string): number | null {
  const match = /^(\d+)(?:[.,](\d{1,2}))?$/.exec(typed.trim());
  if (!match) return null;
  return Number(match[1]) * 100 + Number((match[2] ?? "").padEnd(2, "0"));
}

/** Øre as kroner for an input or an accounting system: no grouping, a comma decimal and two decimals, such as `373,75`. */
export function kroner(ore: number): string {
  return (ore / 100).toFixed(2).replace(".", ",");
}
