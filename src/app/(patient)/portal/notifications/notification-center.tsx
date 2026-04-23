"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import type {
  Notification,
  NotificationType,
  NotificationChannel,
  NotificationPreference,
} from "@/lib/domain/notifications";
import {
  NOTIFICATION_CONFIG,
  getDefaultPreferences,
} from "@/lib/domain/notifications";

// ── Demo notifications ──────────────────────────────────

const DEMO_NOTIFICATIONS: Notification[] = [
  {
    id: "n-1",
    userId: "u-1",
    type: "appointment_reminder",
    priority: "normal",
    title: "Upcoming appointment tomorrow",
    body: "You have a telehealth visit with Dr. Rivera tomorrow at 2:00 PM. Make sure your camera and microphone are working.",
    href: "/portal/schedule",
    read: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
  },
  {
    id: "n-2",
    userId: "u-1",
    type: "message_received",
    priority: "normal",
    title: "New message from Dr. Rivera",
    body: "Your provider has responded to your question about adjusting your evening dose. Check your messages to read the full response.",
    href: "/portal/messages",
    read: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
  },
  {
    id: "n-3",
    userId: "u-1",
    type: "lab_results",
    priority: "normal",
    title: "Lab results are ready",
    body: "Your blood work results from April 10th are now available. Your care team has reviewed them.",
    href: "/portal/records",
    read: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
  },
  {
    id: "n-4",
    userId: "u-1",
    type: "prescription_ready",
    priority: "normal",
    title: "Prescription ready for pickup",
    body: "Your CBD tincture (30mL, 25mg/mL) is ready at Green Leaf Dispensary. Remember to bring your medical card.",
    href: "/portal/medications",
    read: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
  },
  {
    id: "n-5",
    userId: "u-1",
    type: "care_plan_update",
    priority: "normal",
    title: "Care plan updated",
    body: "Dr. Rivera has made adjustments to your treatment plan based on your latest assessment. Review the changes in your care plan.",
    href: "/portal/care-plan",
    read: true,
    readAt: new Date(Date.now() - 1000 * 60 * 60 * 20).toISOString(),
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
  },
  {
    id: "n-6",
    userId: "u-1",
    type: "assessment_due",
    priority: "normal",
    title: "Weekly symptom check-in due",
    body: "It's time for your weekly symptom assessment. This helps your care team track your progress and adjust your treatment.",
    href: "/portal/assessments",
    read: true,
    readAt: new Date(Date.now() - 1000 * 60 * 60 * 30).toISOString(),
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
  },
  {
    id: "n-7",
    userId: "u-1",
    type: "dosing_reminder",
    priority: "low",
    title: "Evening dose reminder",
    body: "Time for your evening CBD dose (10mg sublingual). Remember to hold under your tongue for 60 seconds.",
    read: true,
    readAt: new Date(Date.now() - 1000 * 60 * 60 * 36).toISOString(),
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(),
  },
  {
    id: "n-8",
    userId: "u-1",
    type: "billing_statement",
    priority: "normal",
    title: "New billing statement available",
    body: "Your statement for March 2026 is ready. Your insurance covered $145.00 of the total charges. View the full breakdown.",
    href: "/portal/billing",
    read: true,
    readAt: new Date(Date.now() - 1000 * 60 * 60 * 100).toISOString(),
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 120).toISOString(),
  },
  {
    id: "n-9",
    userId: "u-1",
    type: "system",
    priority: "low",
    title: "Portal maintenance scheduled",
    body: "The patient portal will be briefly unavailable on Saturday, April 18th from 2:00-4:00 AM for scheduled maintenance.",
    read: true,
    readAt: new Date(Date.now() - 1000 * 60 * 60 * 140).toISOString(),
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 168).toISOString(),
  },
  {
    id: "n-10",
    userId: "u-1",
    type: "agent_approval",
    priority: "urgent",
    title: "Nurse Nora needs your input",
    body: "Nora has a follow-up question about the side effects you reported. Please respond so your provider can review your case.",
    href: "/portal/messages",
    read: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
  },
];

// ── Helpers ────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return `${Math.floor(days / 7)}w ago`;
}

function NotificationIcon({ type }: { type: NotificationType }) {
  const config = NOTIFICATION_CONFIG[type];
  return (
    <div
      className={cn(
        "h-9 w-9 rounded-lg flex items-center justify-center text-xs font-bold shrink-0",
        config.color,
        "bg-current/10"
      )}
      style={{ backgroundColor: "color-mix(in srgb, currentColor 10%, transparent)" }}
    >
      {config.icon}
    </div>
  );
}

// ── Filter tabs ───────────────────────────────────────

type FilterValue = "all" | "unread" | NotificationType;

const FILTER_TABS: { label: string; value: FilterValue }[] = [
  { label: "All", value: "all" },
  { label: "Unread", value: "unread" },
  { label: "Messages", value: "message_received" },
  { label: "Appointments", value: "appointment_reminder" },
  { label: "Lab Results", value: "lab_results" },
  { label: "Prescriptions", value: "prescription_ready" },
  { label: "Dosing", value: "dosing_reminder" },
  { label: "Billing", value: "billing_statement" },
];

// ── Main component ────────────────────────────────────

export function NotificationCenter() {
  const [notifications, setNotifications] = useState<Notification[]>(DEMO_NOTIFICATIONS);
  const [activeFilter, setActiveFilter] = useState<FilterValue>("all");
  const [preferences, setPreferences] = useState<NotificationPreference[]>(
    getDefaultPreferences()
  );

  const unreadCount = notifications.filter((n) => !n.read).length;

  const filtered = useMemo(() => {
    if (activeFilter === "all") return notifications;
    if (activeFilter === "unread") return notifications.filter((n) => !n.read);
    return notifications.filter((n) => n.type === activeFilter);
  }, [notifications, activeFilter]);

  function markAsRead(id: string) {
    setNotifications((prev) =>
      prev.map((n) =>
        n.id === id ? { ...n, read: true, readAt: new Date().toISOString() } : n
      )
    );
  }

  function markAllAsRead() {
    setNotifications((prev) =>
      prev.map((n) =>
        n.read ? n : { ...n, read: true, readAt: new Date().toISOString() }
      )
    );
  }

  function toggleChannel(type: NotificationType, channel: NotificationChannel) {
    setPreferences((prev) =>
      prev.map((p) => {
        if (p.type !== type) return p;
        const channels = p.channels.includes(channel)
          ? p.channels.filter((c) => c !== channel)
          : [...p.channels, channel];
        return { ...p, channels };
      })
    );
  }

  function toggleEnabled(type: NotificationType) {
    setPreferences((prev) =>
      prev.map((p) =>
        p.type === type ? { ...p, enabled: !p.enabled } : p
      )
    );
  }

  return (
    <div className="space-y-8">
      {/* Header with mark all read */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-medium text-text">
            Notifications
          </h2>
          {unreadCount > 0 && (
            <Badge tone="accent">{unreadCount} unread</Badge>
          )}
        </div>
        {unreadCount > 0 && (
          <Button variant="ghost" size="sm" onClick={markAllAsRead}>
            Mark all as read
          </Button>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
        {FILTER_TABS.map((tab) => {
          const isActive = activeFilter === tab.value;
          return (
            <button
              key={tab.value}
              onClick={() => setActiveFilter(tab.value)}
              className={cn(
                "inline-flex items-center px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors duration-200 whitespace-nowrap",
                isActive
                  ? "bg-accent text-accent-ink shadow-sm"
                  : "bg-surface-muted/70 text-text-muted hover:bg-surface-muted hover:text-text"
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Notification list */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center p-12 rounded-xl border border-dashed border-border-strong/60 bg-surface/60">
          <h3 className="font-display text-lg text-text">No notifications</h3>
          <p className="text-sm text-text-muted mt-2 max-w-sm leading-relaxed">
            {activeFilter === "unread"
              ? "You're all caught up. No unread notifications."
              : "No notifications match this filter."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((notification) => {
            const config = NOTIFICATION_CONFIG[notification.type];
            return (
              <Card
                key={notification.id}
                tone={notification.read ? "default" : "raised"}
                className={cn(
                  "cursor-pointer transition-all duration-200 hover:shadow-md",
                  !notification.read && "border-l-4 border-l-accent"
                )}
                onClick={() => markAsRead(notification.id)}
              >
                <CardContent className="py-4">
                  <div className="flex items-start gap-3">
                    <NotificationIcon type={notification.type} />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <h4
                              className={cn(
                                "text-sm truncate",
                                notification.read
                                  ? "text-text-muted font-normal"
                                  : "text-text font-medium"
                              )}
                            >
                              {notification.title}
                            </h4>
                            <Badge
                              tone="neutral"
                              className="text-[10px] shrink-0"
                            >
                              {config.label}
                            </Badge>
                          </div>
                          <p className="text-sm text-text-muted leading-relaxed line-clamp-2">
                            {notification.body}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-xs text-text-subtle whitespace-nowrap">
                            {timeAgo(notification.createdAt)}
                          </span>
                          {!notification.read && (
                            <span className="h-2.5 w-2.5 rounded-full bg-accent shrink-0" />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* ── Notification Preferences ──────────────────── */}
      <div className="pt-4">
        <Card tone="raised">
          <CardHeader>
            <CardTitle>Notification preferences</CardTitle>
            <p className="text-sm text-text-muted mt-1">
              Choose how you want to be notified for each type of update.
            </p>
          </CardHeader>
          <CardContent>
            {/* Column headers */}
            <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-x-4 items-center mb-3 pb-3 border-b border-border">
              <span className="text-xs font-medium uppercase tracking-wider text-text-subtle">
                Notification type
              </span>
              <span className="text-xs font-medium uppercase tracking-wider text-text-subtle text-center w-16">
                Enabled
              </span>
              <span className="text-xs font-medium uppercase tracking-wider text-text-subtle text-center w-16">
                In-app
              </span>
              <span className="text-xs font-medium uppercase tracking-wider text-text-subtle text-center w-16">
                Email
              </span>
              <span className="text-xs font-medium uppercase tracking-wider text-text-subtle text-center w-16">
                SMS
              </span>
            </div>

            <div className="space-y-1">
              {preferences.map((pref) => {
                const config = NOTIFICATION_CONFIG[pref.type];
                return (
                  <div
                    key={pref.type}
                    className={cn(
                      "grid grid-cols-[1fr_auto_auto_auto_auto] gap-x-4 items-center py-2.5 rounded-lg px-2",
                      !pref.enabled && "opacity-50"
                    )}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className={cn("text-xs font-bold", config.color)}>
                        {config.icon}
                      </span>
                      <span className="text-sm text-text">{config.label}</span>
                    </div>

                    {/* Enabled toggle */}
                    <div className="flex justify-center w-16">
                      <button
                        onClick={() => toggleEnabled(pref.type)}
                        className={cn(
                          "h-5 w-9 rounded-full transition-colors duration-200 relative",
                          pref.enabled ? "bg-accent" : "bg-border-strong/40"
                        )}
                      >
                        <span
                          className={cn(
                            "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200",
                            pref.enabled ? "translate-x-4" : "translate-x-0.5"
                          )}
                        />
                      </button>
                    </div>

                    {/* Channel toggles */}
                    {(["in_app", "email", "sms"] as NotificationChannel[]).map(
                      (channel) => (
                        <div key={channel} className="flex justify-center w-16">
                          <button
                            disabled={!pref.enabled}
                            onClick={() => toggleChannel(pref.type, channel)}
                            className={cn(
                              "h-5 w-5 rounded border-2 transition-all duration-200 flex items-center justify-center",
                              pref.channels.includes(channel)
                                ? "bg-accent border-accent text-white"
                                : "border-border-strong/60 hover:border-accent/40"
                            )}
                          >
                            {pref.channels.includes(channel) && (
                              <svg
                                className="h-3 w-3"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={3}
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M5 13l4 4L19 7"
                                />
                              </svg>
                            )}
                          </button>
                        </div>
                      )
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
