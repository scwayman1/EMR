import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { PageShell, PageHeader } from "@/components/shell/PageHeader";
import { PatientSectionNav } from "@/components/shell/PatientSectionNav";
import { CommunityView } from "./community-view";
import {
  generateHandle,
  type CommunityPost,
} from "@/lib/domain/journal-community";

export const metadata = { title: "Community" };

function buildDemoPosts(seedPatientId: string): CommunityPost[] {
  // Use varied seeds to produce a mix of anonymous handles
  const handle = (s: string) => generateHandle(s);
  const now = Date.now();
  const min = 60 * 1000;
  const hr = 60 * min;
  const day = 24 * hr;

  const posts: Array<Omit<CommunityPost, "anonymousHandle"> & { seed: string }> = [
    {
      id: "c-1",
      seed: seedPatientId + "-self",
      category: "sleep",
      body:
        "Three weeks on the 1:1 tincture before bed and I'm finally sleeping through the night. Anyone else find that the timing matters more than the dose?",
      supportCount: 18,
      replyCount: 6,
      createdAt: new Date(now - 2 * hr).toISOString(),
      isClinicianReplied: true,
    },
    {
      id: "c-2",
      seed: "user-mountain-rose-44",
      category: "pain",
      body:
        "Chronic lower back pain here. Topical balm + a low-dose edible has been the combo that finally let me garden again this spring. 🌷",
      supportCount: 24,
      replyCount: 9,
      createdAt: new Date(now - 5 * hr).toISOString(),
      isClinicianReplied: false,
    },
    {
      id: "c-3",
      seed: "user-amber-trail-7",
      category: "anxiety",
      body:
        "First month microdosing for social anxiety. Going to my niece's graduation tomorrow. Wish me luck.",
      supportCount: 31,
      replyCount: 12,
      createdAt: new Date(now - 8 * hr).toISOString(),
      isClinicianReplied: true,
    },
    {
      id: "c-4",
      seed: "user-coral-grove-99",
      category: "product_share",
      body:
        "Switched from a sativa cart to a CBN-heavy gummy in the evenings — way less paranoia, easier mornings. YMMV.",
      supportCount: 9,
      replyCount: 3,
      createdAt: new Date(now - 14 * hr).toISOString(),
      isClinicianReplied: false,
    },
    {
      id: "c-5",
      seed: "user-violet-meadow-17",
      category: "support",
      body:
        "Cancer survivor, two years out. Cannabis got me through chemo nausea and now helps with the neuropathy. Sending love to anyone in treatment right now. 💚",
      supportCount: 47,
      replyCount: 15,
      createdAt: new Date(now - 1 * day).toISOString(),
      isClinicianReplied: true,
    },
    {
      id: "c-6",
      seed: "user-teal-river-55",
      category: "general",
      body:
        "Friendly reminder: hydrate. Especially with edibles. Especially in spring. You're welcome.",
      supportCount: 22,
      replyCount: 4,
      createdAt: new Date(now - 1 * day - 3 * hr).toISOString(),
      isClinicianReplied: false,
    },
    {
      id: "c-7",
      seed: "user-indigo-valley-33",
      category: "sleep",
      body:
        "Anyone else find vapes hit too fast for sleep? The come-down wakes me up an hour later. Switched to tincture and night and day difference.",
      supportCount: 14,
      replyCount: 7,
      createdAt: new Date(now - 2 * day).toISOString(),
      isClinicianReplied: false,
    },
    {
      id: "c-8",
      seed: "user-sage-orchard-12",
      category: "anxiety",
      body:
        "Started a wellness journal here in the portal and it's helped me notice patterns way faster. Highly recommend even one sentence a day.",
      supportCount: 16,
      replyCount: 5,
      createdAt: new Date(now - 3 * day).toISOString(),
      isClinicianReplied: false,
    },
  ];

  return posts.map(({ seed, ...rest }) => ({
    ...rest,
    anonymousHandle: handle(seed),
  }));
}

export default async function CommunityPage() {
  const user = await requireRole("patient");
  const patient = await prisma.patient.findUnique({
    where: { userId: user.id },
    select: { id: true },
  });
  if (!patient) redirect("/portal/intake");

  const posts = buildDemoPosts(patient.id);
  const myHandle = generateHandle(patient.id + "-self");

  return (
    <PageShell maxWidth="max-w-[860px]">
      <PageHeader
        eyebrow="Community"
        title="Community"
        description="Anonymous peer support — moderated and never tied to your real name."
      />
      <PatientSectionNav section="account" />
      <CommunityView initialPosts={posts} myHandle={myHandle} />
    </PageShell>
  );
}
