// Real Telehealth Video — Daily.co SDK Integration
// Wraps the Daily.co REST API for room creation + management.
// In production, set DAILY_API_KEY in environment.

export interface DailyRoom {
  id: string;
  name: string;
  url: string;
  createdAt: string;
  expiresAt: string;
  maxParticipants: number;
  privacyMode: "public" | "private";
}

export interface DailyToken {
  token: string;
  roomName: string;
  userName: string;
  isOwner: boolean;
  expiresAt: string;
}

const DAILY_API_BASE = "https://api.daily.co/v1";

/**
 * Create a Daily.co room for a telehealth encounter.
 * Falls back to a deterministic demo URL if no API key is configured.
 */
export async function createVideoRoom(encounterId: string): Promise<DailyRoom> {
  const apiKey = process.env.DAILY_API_KEY;

  if (!apiKey) {
    // Demo mode — generate a deterministic room
    const roomName = `lj-visit-${encounterId.slice(0, 8)}`;
    return {
      id: `demo-${roomName}`,
      name: roomName,
      url: `https://leafjourney.daily.co/${roomName}`,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 3600000).toISOString(), // 1 hour
      maxParticipants: 4,
      privacyMode: "private",
    };
  }

  // Production: create a real Daily.co room
  const roomName = `lj-${encounterId.slice(0, 12)}-${Date.now().toString(36)}`;
  const expiresAt = Math.floor(Date.now() / 1000) + 7200; // 2 hours

  const res = await fetch(`${DAILY_API_BASE}/rooms`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      name: roomName,
      privacy: "private",
      properties: {
        exp: expiresAt,
        max_participants: 4,
        enable_chat: true,
        enable_screenshare: true,
        enable_recording: false, // HIPAA: default off
        start_video_off: false,
        start_audio_off: false,
        eject_at_room_exp: true,
      },
    }),
  });

  if (!res.ok) {
    const errBody = await res.text();
    console.error("[Daily.co] Room creation failed:", res.status, errBody);
    throw new Error(`Failed to create video room: ${res.status}`);
  }

  const room = await res.json();
  return {
    id: room.id,
    name: room.name,
    url: room.url,
    createdAt: room.created_at,
    expiresAt: new Date(expiresAt * 1000).toISOString(),
    maxParticipants: 4,
    privacyMode: room.privacy ?? "private",
  };
}

/**
 * Create a meeting token for a participant (provider or patient).
 * Tokens restrict access and set display names.
 */
export async function createMeetingToken(
  roomName: string,
  userName: string,
  isOwner: boolean = false
): Promise<DailyToken> {
  const apiKey = process.env.DAILY_API_KEY;

  if (!apiKey) {
    // Demo mode
    return {
      token: `demo-token-${Date.now().toString(36)}`,
      roomName,
      userName,
      isOwner,
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
    };
  }

  const expiresAt = Math.floor(Date.now() / 1000) + 7200;

  const res = await fetch(`${DAILY_API_BASE}/meeting-tokens`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      properties: {
        room_name: roomName,
        user_name: userName,
        is_owner: isOwner,
        exp: expiresAt,
        enable_screenshare: true,
      },
    }),
  });

  if (!res.ok) {
    console.error("[Daily.co] Token creation failed:", res.status);
    throw new Error(`Failed to create meeting token: ${res.status}`);
  }

  const data = await res.json();
  return {
    token: data.token,
    roomName,
    userName,
    isOwner,
    expiresAt: new Date(expiresAt * 1000).toISOString(),
  };
}

/**
 * Delete a room (cleanup after visit).
 */
export async function deleteVideoRoom(roomName: string): Promise<void> {
  const apiKey = process.env.DAILY_API_KEY;
  if (!apiKey) return;

  await fetch(`${DAILY_API_BASE}/rooms/${roomName}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${apiKey}` },
  }).catch(() => {}); // Best-effort cleanup
}
