import { redirect } from "next/navigation";

// ---------------------------------------------------------------------------
// My Story → Storybook redirect (EMR-98 / EMR-162)
// ---------------------------------------------------------------------------
// My Story has been folded into the expanded Storybook experience.
// This redirect ensures any existing bookmarks or links still work.
// ---------------------------------------------------------------------------

export default function MyStoryPage() {
  redirect("/portal/storybook");
}
