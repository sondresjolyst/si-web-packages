/**
 * Turns a Norwegian mobile number into the digits Vipps takes, such as `4791234567`, or `null` when it
 * is not one. Spaces, dashes, brackets, and a leading `+` are dropped, and an eight-digit number gets
 * the `47` country code. It follows `VippsPhoneNumber.TryNormalize` in SjolystInnovation.AppKit.Vipps,
 * so the form and the API agree on what is valid.
 */
export function normalizeNoPhone(raw: string | null | undefined): string | null {
  let digits = (raw ?? "").replace(/[^0-9]/g, "");
  if (digits.length === 8) digits = `47${digits}`;
  return digits.length === 10 && digits.startsWith("47") ? digits : null;
}
