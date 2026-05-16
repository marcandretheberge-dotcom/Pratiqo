import type { TeacherBookKind } from "@/components/TeacherProfile";
import {
  setMarketplaceResumeIntent,
  type MarketplaceResumeSource,
} from "@/lib/marketplaceResumeIntent";

export const STUDENT_SEARCH_LOGIN_NEXT = "/student/search";

export function guestBookLoginHref(params: {
  teacherId: string;
  bookKind?: TeacherBookKind;
  source: MarketplaceResumeSource;
}): string {
  setMarketplaceResumeIntent({
    teacherId: params.teacherId,
    bookKind: params.bookKind,
    source: params.source,
  });
  return `/login?next=${encodeURIComponent(STUDENT_SEARCH_LOGIN_NEXT)}`;
}
