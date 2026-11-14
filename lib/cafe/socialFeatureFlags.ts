/**
 * Café social modules — each can ship independently.
 * Production stays off until explicit approval.
 */

function flag(name: string): boolean {
  return process.env[name]?.trim().toLowerCase() === "true";
}

/** Master shell: welcome → language → live café chrome. */
export function isCafeSocialV1Enabled(): boolean {
  return flag("CAFE_SOCIAL_V1_ENABLED");
}

export function isCafePresenceEnabled(): boolean {
  return isCafeSocialV1Enabled() && flag("CAFE_PRESENCE_ENABLED");
}

export function isCafeLoungeChatEnabled(): boolean {
  return isCafeSocialV1Enabled() && flag("CAFE_LOUNGE_CHAT_ENABLED");
}

export function isCafePrivateChatEnabled(): boolean {
  return isCafeSocialV1Enabled() && flag("CAFE_PRIVATE_CHAT_ENABLED");
}

/** Self-created live tables — keep off until secure architecture is ready. */
export function isCafeLiveTablesEnabled(): boolean {
  return isCafeSocialV1Enabled() && flag("CAFE_LIVE_TABLES_ENABLED");
}

export type CafeSocialFlags = {
  socialV1: boolean;
  presence: boolean;
  loungeChat: boolean;
  privateChat: boolean;
  liveTables: boolean;
};

export function getCafeSocialFlags(): CafeSocialFlags {
  return {
    socialV1: isCafeSocialV1Enabled(),
    presence: isCafePresenceEnabled(),
    loungeChat: isCafeLoungeChatEnabled(),
    privateChat: isCafePrivateChatEnabled(),
    liveTables: isCafeLiveTablesEnabled(),
  };
}
