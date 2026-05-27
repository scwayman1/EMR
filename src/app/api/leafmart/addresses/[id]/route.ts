import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import {
  updateAddressForUser,
  deleteAddressForUser,
} from "@/lib/leafmart/addresses";

export const dynamic = "force-dynamic";

const UpdateSchema = z.object({
  label: z.string().max(40).optional(),
  firstName: z.string().min(1).max(80).optional(),
  lastName: z.string().min(1).max(80).optional(),
  address1: z.string().min(1).max(160).optional(),
  address2: z.string().max(160).optional(),
  city: z.string().min(1).max(80).optional(),
  state: z.string().length(2).optional(),
  postalCode: z.string().regex(/^\d{5}(-\d{4})?$/).optional(),
  phone: z.string().max(20).optional(),
  isDefault: z.boolean().optional(),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  let parsed: z.infer<typeof UpdateSchema>;
  try {
    parsed = UpdateSchema.parse(await req.json());
  } catch (err) {
    return NextResponse.json(
      { error: "Invalid address", detail: (err as Error).message },
      { status: 400 },
    );
  }

  try {
    const address = await updateAddressForUser(user, params.id, parsed);
    return NextResponse.json({ address });
  } catch (err) {
    if ((err as Error).message === "NOT_FOUND") {
      return NextResponse.json({ error: "Address not found" }, { status: 404 });
    }
    throw err;
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  try {
    await deleteAddressForUser(user, params.id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if ((err as Error).message === "NOT_FOUND") {
      return NextResponse.json({ error: "Address not found" }, { status: 404 });
    }
    throw err;
  }
}
