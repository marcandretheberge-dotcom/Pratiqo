import { parseHHMMToMinutes, slotStartMinutes } from "@/lib/slots";

export type BookingStartSortFields = {
  id?: string | null;
  created_at?: string | null;
  slot_date?: string | null;
  date?: string | null;
  time_slot?: string | null;
  time?: string | null;
};

function normalizedDate(value: string | null | undefined): string {
  return typeof value === "string" ? value.trim() : "";
}

export function bookingStartMinutes(value: string | null | undefined): number {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw) return Number.MAX_SAFE_INTEGER;
  const firstToken = raw.split(/\s|-/)[0]?.trim() ?? raw;
  const compactMinutes = slotStartMinutes(firstToken);
  if (compactMinutes >= 0) return compactMinutes;
  const colonMinutes = parseHHMMToMinutes(firstToken.replace("h", ":"));
  return colonMinutes ?? Number.MAX_SAFE_INTEGER;
}

export function compareBookingsByStartAsc(a: BookingStartSortFields, b: BookingStartSortFields): number {
  const dateA = normalizedDate(a.slot_date ?? a.date);
  const dateB = normalizedDate(b.slot_date ?? b.date);
  if (dateA !== dateB) return dateA.localeCompare(dateB);

  const minutesA = bookingStartMinutes(a.time_slot ?? a.time);
  const minutesB = bookingStartMinutes(b.time_slot ?? b.time);
  if (minutesA !== minutesB) return minutesA - minutesB;

  const createdA = normalizedDate(a.created_at);
  const createdB = normalizedDate(b.created_at);
  if (createdA !== createdB) return createdA.localeCompare(createdB);

  return normalizedDate(a.id).localeCompare(normalizedDate(b.id));
}
