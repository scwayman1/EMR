import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

// Render background workers or Vercel Cron will hit this endpoint daily
export const runtime = "nodejs";

export async function GET(req: Request) {
  // Validate standard cron auth header (replace with real secret validation in prod)
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET || 'dev-secret'}`) {
    if (process.env.NODE_ENV === 'production') {
      return new NextResponse("Unauthorized", { status: 401 });
    }
  }

  // Find appointments scheduled between 24 and 48 hours from now
  const tomorrowStart = new Date();
  tomorrowStart.setHours(tomorrowStart.getHours() + 24);
  
  const tomorrowEnd = new Date();
  tomorrowEnd.setHours(tomorrowEnd.getHours() + 48);

  try {
    const upcomingEncounters = await prisma.encounter.findMany({
      where: {
        status: "scheduled",
        scheduledFor: {
          gte: tomorrowStart,
          lt: tomorrowEnd,
        },
      },
      include: {
        patient: {
          select: {
            firstName: true,
            email: true,
            phone: true,
          }
        },
        provider: {
          select: {
            firstName: true,
            lastName: true,
          }
        }
      }
    });

    let sentCount = 0;

    for (const encounter of upcomingEncounters) {
      if (!encounter.scheduledFor) continue;

      const timeString = new Date(encounter.scheduledFor).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
      });
      const providerName = encounter.provider ? `Dr. ${encounter.provider.lastName}` : "your care provider";
      const modalityText = encounter.modality === "video" ? "telehealth video" : 
                           encounter.modality === "phone" ? "phone" : "in-person";

      // Mock sending email / SMS via Twilio/SendGrid
      console.log(`[CRON] Sending reminder to ${encounter.patient.email}:`);
      console.log(`Hi ${encounter.patient.firstName}, just a reminder about your upcoming ${modalityText} visit with ${providerName} tomorrow at ${timeString}. Please complete any pending intake forms in your portal.`);
      
      // Update briefingContext to mark reminder as sent to avoid duplicates
      const currentContext = (encounter.briefingContext as any) || {};
      await prisma.encounter.update({
        where: { id: encounter.id },
        data: {
          briefingContext: {
            ...currentContext,
            reminderSentAt: new Date().toISOString(),
          }
        }
      });

      sentCount++;
    }

    return NextResponse.json({
      success: true,
      processed: upcomingEncounters.length,
      sent: sentCount,
    });
  } catch (error) {
    console.error("[CRON] Failed to run appointment reminders:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
