import { isCafeV1Enabled } from "@/lib/cafe/featureFlag";

export function isCafeRoomProviderEnabled(): boolean {
  return (
    isCafeV1Enabled() &&
    process.env.CAFE_ROOM_PROVIDER_ENABLED?.trim().toLowerCase() === "true"
  );
}
