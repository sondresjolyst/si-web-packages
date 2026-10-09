/**
 * Asks the app's revalidate route to purge the pages behind `target`, so an admin edit shows at
 * once. Best effort: on failure the pages' revalidate window is the fallback.
 */
export async function requestRevalidate(target: string, endpoint = "/api/revalidate"): Promise<void> {
  try {
    await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ target }),
    });
  } catch {
    // Best effort, see above.
  }
}
