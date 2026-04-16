import { requireUser } from "@/lib/auth/session";
import { PageHeader, PageShell } from "@/components/shell/PageHeader";
import { AnnouncementsView, type Announcement } from "./announcements-view";

export const metadata = { title: "Team Announcements" };

const DEMO: Announcement[] = [
  {
    id: "a-1",
    title: "All-staff meeting · Friday 4:00pm",
    body: "Quarterly update in the conference room. We'll cover new patient growth, upcoming schedule changes, and the new ChatCB rollout.",
    author: "Dr. Patel",
    category: "Ops",
    createdAt: "2026-04-14T15:00:00Z",
    pinned: true,
    reactions: { "👍": 8, "❤️": 3, "🎉": 1 },
    comments: [
      { id: "c1", author: "Taylor Kim", text: "Will this be recorded for remote staff?", createdAt: "2026-04-14T15:22:00Z" },
    ],
  },
  {
    id: "a-2",
    title: "New dosing protocol: insomnia w/ CBN",
    body: "Dr. Chen has published an updated CBN-forward dosing protocol for sleep. Review before your next insomnia consult.",
    author: "Dr. Chen",
    category: "Clinical",
    createdAt: "2026-04-13T10:30:00Z",
    pinned: true,
    reactions: { "👍": 12, "❤️": 5, "🎉": 0 },
    comments: [],
  },
  {
    id: "a-3",
    title: "Welcome to our newest nurse, Jordan Rivera!",
    body: "Jordan is joining us from Northside Health — stop by room 3 and say hello.",
    author: "Ops Team",
    category: "Celebrations",
    createdAt: "2026-04-10T09:00:00Z",
    pinned: false,
    reactions: { "👍": 14, "❤️": 11, "🎉": 22 },
    comments: [
      { id: "c2", author: "Morgan Patel", text: "Welcome Jordan!", createdAt: "2026-04-10T09:05:00Z" },
      { id: "c3", author: "Riley Okafor", text: "So excited you're here.", createdAt: "2026-04-10T09:11:00Z" },
    ],
  },
  {
    id: "a-4",
    title: "HIPAA training due by April 30",
    body: "Please complete the HIPAA Basics module under Team > Training. It's required for all staff annually.",
    author: "Compliance",
    category: "Reminders",
    createdAt: "2026-04-08T08:00:00Z",
    pinned: false,
    reactions: { "👍": 4, "❤️": 0, "🎉": 0 },
    comments: [],
  },
  {
    id: "a-5",
    title: "Coffee machine upgrade next Tuesday",
    body: "Break room will be briefly offline between 10-11am while the new espresso bar is installed. ☕",
    author: "Ops Team",
    category: "Ops",
    createdAt: "2026-04-05T14:10:00Z",
    pinned: false,
    reactions: { "👍": 6, "❤️": 2, "🎉": 9 },
    comments: [],
  },
  {
    id: "a-6",
    title: "Kudos — best Net Promoter week ever",
    body: "Our NPS last week was 72. Proud of the whole team — this is the best week since launch. Keep it up.",
    author: "Dr. Patel",
    category: "Celebrations",
    createdAt: "2026-04-02T16:00:00Z",
    pinned: false,
    reactions: { "👍": 18, "❤️": 20, "🎉": 14 },
    comments: [],
  },
];

export default async function AnnouncementsPage() {
  const user = await requireUser();

  return (
    <PageShell maxWidth="max-w-[1000px]">
      <PageHeader
        eyebrow="Team"
        title="Announcements"
        description="A shared feed for clinical updates, ops notes, reminders, and celebrations."
      />
      <AnnouncementsView initialAnnouncements={DEMO} currentAuthor={`${user.firstName} ${user.lastName}`} />
    </PageShell>
  );
}
