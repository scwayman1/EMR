/**
 * Race a promise against a wall-clock timeout.
 *
 * If `promise` has not settled within `ms`, resolve with `fallback` instead.
 * The original promise is allowed to finish in the background — any late
 * rejection is swallowed (logged) so it doesn't crash the Node process.
 *
 * Intended for Server Components where a hung downstream call (DB, cache,
 * upstream API) would otherwise wedge the Suspense boundary forever,
 * blocking hydration and making the whole route feel broken.
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  fallback: T,
  label = "withTimeout",
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let timedOut = false;

  const timeoutPromise = new Promise<T>((resolve) => {
    timer = setTimeout(() => {
      timedOut = true;
      resolve(fallback);
    }, ms);
  });

  const result = await Promise.race([promise, timeoutPromise]);
  if (timer) clearTimeout(timer);

  if (timedOut) {
    console.warn(`[${label}] timed out after ${ms}ms — serving fallback`);
    Promise.resolve(promise).catch((err) => {
      console.warn(`[${label}] late rejection after timeout:`, err);
    });
  }

  return result;
}
