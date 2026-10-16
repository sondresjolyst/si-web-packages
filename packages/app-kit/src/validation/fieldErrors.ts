import type { z } from "zod";

/** A function that picks the text shown for an issue, such as a translated message by the issue's code. */
export type IssueMessage = (issue: z.core.$ZodIssue) => string;

/**
 * Groups a failed parse's issues by the top-level field they belong to, for showing beside each
 * input. By default each field gets its first issue's message. With `all: true` it gets every
 * message, in order.
 * `message` replaces zod's text, such as with the app's own translations. Issues without a field,
 * from a refinement of the whole object, are left out.
 */
export function zodFieldErrors<T>(
  error: z.ZodError<T>,
  options?: { all?: false; message?: IssueMessage },
): Partial<Record<Extract<keyof T, string>, string>>;
export function zodFieldErrors<T>(
  error: z.ZodError<T>,
  options: { all: true; message?: IssueMessage },
): Partial<Record<Extract<keyof T, string>, string[]>>;
export function zodFieldErrors<T>(
  error: z.ZodError<T>,
  options: { all?: boolean; message?: IssueMessage } = {},
): object {
  // A Map, so a field named like an Object property such as "constructor" is still just a field.
  const errors = new Map<string, string[]>();
  for (const issue of error.issues) {
    const field = issue.path[0];
    if (typeof field !== "string") continue;
    const messages = errors.get(field) ?? [];
    messages.push(options.message ? options.message(issue) : issue.message);
    errors.set(field, messages);
  }
  return Object.fromEntries([...errors].map(([field, messages]) => [field, options.all ? messages : messages[0]]));
}
