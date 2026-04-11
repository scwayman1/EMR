import type { PaymentGateway } from "./types";
import { StubPaymentGateway } from "./stub-gateway";
import { PayabliGateway } from "./payabli-gateway";

export * from "./types";
export { StubPaymentGateway } from "./stub-gateway";
export { PayabliGateway } from "./payabli-gateway";

/**
 * Resolve the active payment gateway based on environment.
 *
 * PAYMENT_GATEWAY=payabli → PayabliGateway (requires PAYABLI_API_TOKEN + PAYABLI_ENTRY_POINT)
 * Otherwise                → StubPaymentGateway (dev/demo default)
 *
 * Singleton-per-process — resolved once and cached.
 */
let cached: PaymentGateway | null = null;

export function resolvePaymentGateway(): PaymentGateway {
  if (cached) return cached;

  const kind = (process.env.PAYMENT_GATEWAY ?? "stub").toLowerCase();

  if (kind === "payabli") {
    try {
      cached = new PayabliGateway();
      return cached;
    } catch (err) {
      console.error(
        "[payments] Payabli gateway failed to initialize, falling back to stub:",
        err instanceof Error ? err.message : err,
      );
      cached = new StubPaymentGateway();
      return cached;
    }
  }

  cached = new StubPaymentGateway();
  return cached;
}

/** Reset the cached gateway — useful in tests. */
export function resetPaymentGatewayCache() {
  cached = null;
}
