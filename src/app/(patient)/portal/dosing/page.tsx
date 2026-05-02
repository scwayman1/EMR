import { redirect } from "next/navigation";

// EMR-355: /portal/dosing was merged into /portal/medications. The dosing
// recommendation now renders inline at the bottom of the medications page.
// We keep this route as a permanent server-side redirect so existing deep
// links and bookmarks continue to land on the right anchor.
export default function DosingPage() {
  redirect("/portal/medications#dosing-plan");
}
