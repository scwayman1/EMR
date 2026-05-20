import { redirect } from "next/navigation";

// EMR-708 — disposition: merge into /clinic/messages?filter=brief.
//
// The morning-brief content (unsigned notes, no-shows, unanswered messages,
// incomplete intake, worsening patients, high-risk appointments) is being
// folded into the Smart Inbox as a new "brief" category. The standalone
// page is replaced by a redirect so inbound bookmarks, agent outputs, and
// any link in historical notes still land somewhere useful.
//
// The actual migration of brief items into MessageThread rows is tracked in
// a follow-up ticket; this redirect ships the disposition decision today
// per the EMR-708 acceptance.

export const metadata = { title: "Morning Brief" };

export default function MorningBriefPage() {
  redirect("/clinic/messages?filter=brief");
}
