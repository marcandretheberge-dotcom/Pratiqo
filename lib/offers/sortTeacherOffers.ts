import type { TeacherOfferDto, TeacherOfferStatus } from "./types";

const STATUS_RANK: Record<TeacherOfferStatus, number> = {
  published: 0,
  paused: 1,
  draft: 2,
  archived: 3,
};

function dashboardSortTimestamp(offer: TeacherOfferDto): string {
  if (offer.status === "published") {
    return offer.publishedAt ?? offer.updatedAt;
  }
  if (offer.status === "archived") {
    return offer.archivedAt ?? offer.updatedAt;
  }
  return offer.updatedAt;
}

/** Deterministic Mes offres de cours dashboard order. Does not use DB default order. */
export function sortTeacherOffersForDashboard(offers: TeacherOfferDto[]): TeacherOfferDto[] {
  return [...offers].sort((a, b) => {
    const rankDelta = STATUS_RANK[a.status] - STATUS_RANK[b.status];
    if (rankDelta !== 0) return rankDelta;
    const timeDelta = dashboardSortTimestamp(b).localeCompare(dashboardSortTimestamp(a));
    if (timeDelta !== 0) return timeDelta;
    return b.id.localeCompare(a.id);
  });
}
