"use client";

import { CafeConversationRoom } from "@/components/cafe/CafeConversationRoom";
import { getClientAccessToken } from "@/lib/auth/clientAccessToken";
import { getSupabaseClient } from "@/lib/supabase";

export function CafeConversationRoomLive(props: {
  slug: string;
  sessionTitle: string;
  courseReturnHref: string | null;
}) {
  return (
    <CafeConversationRoom
      mode="live"
      slug={props.slug}
      sessionTitle={props.sessionTitle}
      courseReturnHref={props.courseReturnHref}
      getAccessToken={() => getClientAccessToken(getSupabaseClient())}
    />
  );
}
