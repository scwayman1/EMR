"use server";

// TODO(EMR-794): the Architect PR ships the real implementations of these
// supply-order server actions. This stub lets EMR-791 land as a draft PR
// with a stable call-site contract; each export throws on invocation so
// misuse before EMR-794 lands fails loudly.

const NOT_IMPL = (name: string) => () => {
  throw new Error(`${name} not implemented — waits on EMR-794`);
};

export async function approveSupplyOrder(orderId: string): Promise<void> {
  void orderId;
  NOT_IMPL("approveSupplyOrder")();
}
export async function rejectSupplyOrder(orderId: string, reason: string): Promise<void> {
  void orderId;
  void reason;
  NOT_IMPL("rejectSupplyOrder")();
}
export async function editSupplyOrderDraft(
  orderId: string,
  patch: { qty?: number; unitCostCents?: number },
): Promise<void> {
  void orderId;
  void patch;
  NOT_IMPL("editSupplyOrderDraft")();
}
export async function markSupplyOrderShipped(orderId: string, supplierPoRef?: string): Promise<void> {
  void orderId;
  void supplierPoRef;
  NOT_IMPL("markSupplyOrderShipped")();
}
export async function markSupplyOrderDelivered(orderId: string, deliveredQty?: number): Promise<void> {
  void orderId;
  void deliveredQty;
  NOT_IMPL("markSupplyOrderDelivered")();
}
export async function cancelSupplyOrder(orderId: string, reason: string): Promise<void> {
  void orderId;
  void reason;
  NOT_IMPL("cancelSupplyOrder")();
}
