import { fillTemplate } from "../ui/fillTemplate";
import { apiErrorCode } from "./apiErrorCode";
import { apiFieldErrorDetails, type ApiFieldError } from "./apiFieldErrors";

/**
 * The app's text for a field error when `validation` has text for the error's code, with `{max}`
 * filled in from the error's limit. Otherwise the API's message.
 */
export function fieldErrorText(error: ApiFieldError, validation: object): string {
  const code = error.code ?? "";
  const template = Object.hasOwn(validation, code) ? (validation as Record<string, string>)[code] : undefined;
  if (template === undefined) return error.message;
  if (!template.includes("{max}")) return template;
  return error.limit === undefined ? error.message : fillTemplate(template, { max: error.limit });
}

/**
 * The text for each field error of a failed call, keyed by field like `apiFieldErrors`, from
 * `fieldErrorText`. Empty when the call has no field errors.
 */
export function fieldErrorTexts(error: unknown, validation: object): Record<string, string[]> {
  const details = apiFieldErrorDetails(error) ?? {};
  return Object.fromEntries(Object.entries(details).map(([field, list]) => [field, list.map(e => fieldErrorText(e, validation))]));
}

/**
 * The app's text for a failed call's code that is not about one field, such as `lockedOut`, when
 * `errors` has text for it. Otherwise the failure's own message, or `fallback` when it has none.
 */
export function errorText(error: unknown, errors: object, fallback: string): string {
  const message = error instanceof Error && error.message ? error.message : fallback;
  return fieldErrorText({ message, code: apiErrorCode(error) ?? "" }, errors);
}
