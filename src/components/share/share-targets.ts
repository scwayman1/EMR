// ---------------------------------------------------------------------------
// EMR-308 — Share targets registry
// ---------------------------------------------------------------------------
// Each platform's deep-link format. Encoders are not the same across
// platforms — Reddit wants `title`, X wants `text`, FB wants the bare
// URL — so we centralize the formatting here. If a platform changes
// its share URL format, only this file needs an edit.
// ---------------------------------------------------------------------------

import type { SharePayload, ShareTarget } from "./types";

const enc = encodeURIComponent;

export const SHARE_TARGETS: ShareTarget[] = [
  {
    id: "x",
    label: "X",
    iconName: "Twitter",
    buildUrl: (p: SharePayload) => {
      const text = p.title;
      const tags = p.hashtags?.join(",");
      const params = new URLSearchParams({ url: p.url, text });
      if (tags) params.set("hashtags", tags);
      return `https://twitter.com/intent/tweet?${params.toString()}`;
    },
  },
  {
    id: "facebook",
    label: "Facebook",
    iconName: "Facebook",
    buildUrl: (p) => `https://www.facebook.com/sharer/sharer.php?u=${enc(p.url)}`,
  },
  {
    id: "linkedin",
    label: "LinkedIn",
    iconName: "Linkedin",
    buildUrl: (p) => `https://www.linkedin.com/sharing/share-offsite/?url=${enc(p.url)}`,
  },
  {
    id: "threads",
    label: "Threads",
    iconName: "MessageCircle",
    buildUrl: (p) => {
      const text = `${p.title}\n${p.url}`;
      return `https://www.threads.net/intent/post?text=${enc(text)}`;
    },
  },
  {
    id: "reddit",
    label: "Reddit",
    iconName: "Globe",
    buildUrl: (p) =>
      `https://www.reddit.com/submit?url=${enc(p.url)}&title=${enc(p.title)}`,
  },
  {
    id: "whatsapp",
    label: "WhatsApp",
    iconName: "Phone",
    buildUrl: (p) =>
      `https://api.whatsapp.com/send?text=${enc(`${p.title} ${p.url}`)}`,
  },
  {
    id: "email",
    label: "Email",
    iconName: "Mail",
    buildUrl: (p) => {
      const subject = enc(p.title);
      const body = enc(`${p.description ? p.description + "\n\n" : ""}${p.url}`);
      return `mailto:?subject=${subject}&body=${body}`;
    },
  },
  {
    id: "sms",
    label: "SMS",
    iconName: "MessageSquare",
    buildUrl: (p) => `sms:?&body=${enc(`${p.title} ${p.url}`)}`,
  },
  {
    id: "copy-link",
    label: "Copy link",
    iconName: "Link",
    buildUrl: () => null,
  },
  {
    id: "native",
    label: "More…",
    iconName: "Share2",
    buildUrl: () => null,
  },
];
