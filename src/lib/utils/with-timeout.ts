/**
 * Race a promise against a wall-clock timeout.
 *
 * If `promise` has not settled within `ms`, resolve with `fallback` instead.
 * If `promise` rejects before the timeout, resolve with `fallback` too — the
 * rejection is swallowed (logged). Any late rejection after a timeout is also
 * swallowed so it doesn't crash the Node process.
 *
 * Intended for Server Components where a hung or failing downstream call
 * (DB, cache, upstream API) would otherwise wedge the Suspense boundary
 * forever, blocking hydration and making the whole route feel broken.
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

  // Swallow rejections on the wrapped promise so Promise.race never rejects —
  // a slow-or-broken downstream should never surface as an unhandled error.
  const safePromise = Promise.resolve(promise).catch((err) => {
    console.warn(`[${label}] rejected — serving fallback:`, err);
    return fallback;
  });

  const result = await Promise.race([safePromise, timeoutPromise]);
  if (timer) clearTimeout(timer);

  if (timedOut) {
    console.warn(`[${label}] timed out after ${ms}ms — serving fallback`);
    Promise.resolve(promise).catch((err) => {
      console.warn(`[${label}] late rejection after timeout:`, err);
    });
  }

  return result;
}
