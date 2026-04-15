import { redirect } from "next/navigation";

// EMR-97: Achievements merged into Lifestyle tab
// Redirect existing bookmarks to the lifestyle page
export default function AchievementsPage() {
  redirect("/portal/lifestyle");
}
