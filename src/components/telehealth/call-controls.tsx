"use client";

import React, { useState } from "react";

export interface CallControlState {
  micMuted: boolean;
  cameraOff: boolean;
  screenSharing: boolean;
  chatOpen: boolean;
}

export interface CallControlsProps {
  initial?: Partial<CallControlState>;
  onChange?: (state: CallControlState) => void;
  onLeave?: () => void;
  unreadChatCount?: number;
}

const DEFAULTS: CallControlState = {
  micMuted: false,
  cameraOff: false,
  screenSharing: false,
  chatOpen: false,
};

interface ControlButtonProps {
  label: string;
  active: boolean;
  danger?: boolean;
  badge?: number;
  onClick: () => void;
  iconOn: string;
  iconOff: string;
}

function ControlButton({ label, active, danger, badge, onClick, iconOn, iconOff }: ControlButtonProps) {
  const tone = danger
    ? "bg-red-500 text-white hover:bg-red-600 border-red-500"
    : active
      ? "bg-[var(--accent)] text-white border-[var(--accent)] hover:bg-[var(--accent)]/90"
      : "bg-white text-text border-[var(--border)] hover:border-[var(--accent)]";
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={label}
      className={`relative w-14 h-14 rounded-2xl border grid place-items-center text-xl transition-colors ${tone}`}
    >
      <span aria-hidden="true">{active ? iconOn : iconOff}</span>
      {badge != null && badge > 0 && (
        <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold grid place-items-center">
          {badge > 99 ? "99+" : badge}
        </span>
      )}
    </button>
  );
}

export function CallControls({ initial, onChange, onLeave, unreadChatCount = 0 }: CallControlsProps) {
  const [state, setState] = useState<CallControlState>({ ...DEFAULTS, ...initial });

  const update = <K extends keyof CallControlState>(key: K, value: CallControlState[K]) => {
    setState((prev) => {
      const next = { ...prev, [key]: value };
      onChange?.(next);
      return next;
    });
  };

  return (
    <div
      role="toolbar"
      aria-label="Call controls"
      className="inline-flex items-center gap-3 bg-white border border-[var(--border)] rounded-3xl shadow-sm px-4 py-3"
    >
      <ControlButton
        label={state.micMuted ? "Unmute microphone" : "Mute microphone"}
        active={!state.micMuted}
        onClick={() => update("micMuted", !state.micMuted)}
        iconOn="🎙️"
        iconOff="🔇"
      />
      <ControlButton
        label={state.cameraOff ? "Turn camera on" : "Turn camera off"}
        active={!state.cameraOff}
        onClick={() => update("cameraOff", !state.cameraOff)}
        iconOn="📷"
        iconOff="🚫"
      />
      <ControlButton
        label={state.screenSharing ? "Stop sharing screen" : "Share screen"}
        active={state.screenSharing}
        onClick={() => update("screenSharing", !state.screenSharing)}
        iconOn="🖥️"
        iconOff="🖥️"
      />
      <ControlButton
        label={state.chatOpen ? "Close chat" : "Open chat"}
        active={state.chatOpen}
        badge={unreadChatCount}
        onClick={() => update("chatOpen", !state.chatOpen)}
        iconOn="💬"
        iconOff="💬"
      />
      <div className="w-px h-10 bg-[var(--border)] mx-1" aria-hidden="true" />
      <ControlButton
        label="Leave call"
        active={false}
        danger
        onClick={() => onLeave?.()}
        iconOn="📞"
        iconOff="📞"
      />
    </div>
  );
}

export default CallControls;
