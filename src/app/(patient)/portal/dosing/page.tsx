import { redirect } from "next/navigation";

export const metadata = { title: "Dosing Plan" };

// Per EMR-355: Medications + Dosing Plan are now a single page. Old links
// to /portal/dosing land on the merged Medications page anchored to the
// dosing-plan section.
export default function DosingPage(): never {
  redirect("/portal/medications#dosing-plan");
}
