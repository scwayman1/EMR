import { OrderStatus, STATUS_BG, STATUS_FG, STATUS_LABEL } from "@/components/leafmart/AccountData";

export function AccountStatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span
      className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-[12px] font-medium"
      style={{ background: STATUS_BG[status], color: STATUS_FG[status] }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{ background: STATUS_FG[status] }}
      />
      {STATUS_LABEL[status]}
    </span>
  );
}
