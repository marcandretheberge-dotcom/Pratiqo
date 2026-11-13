export const CAFE_HERO_POSTER_SRC = "/images/yo/mandarin/cafe.webp";
export const CAFE_WORLD_VIDEO_SRC = "/videos/cafe-world-journey.mp4";

/** Activate the exact local source only after the reviewed MP4 is committed with the site. */
export const cafeHeroMedia: { readonly videoSrc: string | null; readonly posterSrc: string } = {
  videoSrc: null,
  posterSrc: CAFE_HERO_POSTER_SRC,
};
