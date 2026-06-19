/** Wizard sends encoded teaching_mode values (online|person|home|all|both), not UI enum keys. */
export function resolveWizardHomeLessonEnabled(input: {
  home_lesson_enabled?: unknown;
  teaching_mode?: string | null;
}): boolean {
  if (input.home_lesson_enabled === true) return true;
  const mode = typeof input.teaching_mode === "string" ? input.teaching_mode.trim() : "";
  return mode === "home" || mode === "all";
}

export function buildTeacherOnboardingUpdate(input: Record<string, unknown>): Record<string, unknown> {
  const trimStr = (v: unknown): string | null => {
    if (typeof v !== "string") return null;
    const t = v.trim();
    return t.length > 0 ? t : null;
  };

  const homeOn = resolveWizardHomeLessonEnabled({
    home_lesson_enabled: input.home_lesson_enabled,
    teaching_mode: trimStr(input.teaching_mode),
  });

  const teacherUpdate: Record<string, unknown> = {};
  const nameHint = trimStr(input.name);
  if (nameHint) teacherUpdate.name = nameHint;
  const discipline = trimStr(input.discipline);
  if (discipline) teacherUpdate.discipline = discipline;
  const category = trimStr(input.category);
  if (category) teacherUpdate.category = category;
  const bio = trimStr(input.bio);
  if (bio) teacherUpdate.bio = bio;
  if (Array.isArray(input.levels)) teacherUpdate.levels = input.levels;
  const teachingMode = trimStr(input.teaching_mode);
  if (teachingMode) teacherUpdate.teaching_mode = teachingMode;
  const city = trimStr(input.city);
  if (city) teacherUpdate.city = city;
  const region = trimStr(input.region);
  if (region) teacherUpdate.region = region;
  const countryCode = trimStr(input.country_code);
  if (countryCode) teacherUpdate.country_code = countryCode;
  const timezone = trimStr(input.timezone);
  if (timezone) teacherUpdate.timezone = timezone;
  const currency = trimStr(input.currency);
  if (currency) teacherUpdate.currency = currency;
  const priceRaw = input.price_per_lesson;
  const price = priceRaw != null ? Number(priceRaw) : null;
  if (price !== null && Number.isFinite(price)) teacherUpdate.price_per_lesson = price;
  if (Array.isArray(input.availability)) teacherUpdate.availability = input.availability;
  if (typeof input.default_lesson_duration_minutes === "number") {
    teacherUpdate.default_lesson_duration_minutes = input.default_lesson_duration_minutes;
  }
  if (input.location && typeof input.location === "object" && !Array.isArray(input.location)) {
    teacherUpdate.location = input.location;
  }

  teacherUpdate.home_lesson_enabled = homeOn;
  if (homeOn) {
    const homePrice =
      input.home_lesson_price != null ? Number(input.home_lesson_price) : price;
    if (homePrice !== null && Number.isFinite(homePrice) && homePrice > 0) {
      teacherUpdate.home_lesson_price = homePrice;
    }
    const homeRadius = input.home_lesson_radius_km != null ? Number(input.home_lesson_radius_km) : null;
    if (homeRadius !== null && Number.isFinite(homeRadius) && homeRadius > 0) {
      teacherUpdate.home_lesson_radius_km = homeRadius;
    }
  }

  return teacherUpdate;
}
