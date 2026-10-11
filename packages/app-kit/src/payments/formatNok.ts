/** An amount in øre as Norwegian kroner, such as `NOK 373,75`. */
export function formatNok(ore: number): string {
  return `NOK ${(ore / 100).toFixed(2).replace(".", ",")}`;
}
