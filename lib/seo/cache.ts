import { unstable_cache } from "next/cache";

export const SEO_CACHE_REVALIDATE_SECONDS = 3600;
export const SEO_TEACHER_PROFILE_REVALIDATE_SECONDS = 1800;
export const SEO_SITEMAP_REVALIDATE_SECONDS = 3600;

export function cacheSeoData<Args extends unknown[], Result>(
  fn: (...args: Args) => Promise<Result>,
  keyParts: string[],
  options?: { revalidate?: number; tags?: string[] },
): (...args: Args) => Promise<Result> {
  const cached = unstable_cache(fn, keyParts, {
    revalidate: options?.revalidate ?? SEO_CACHE_REVALIDATE_SECONDS,
    tags: options?.tags,
  }) as (...args: Args) => Promise<Result>;

  return async (...args: Args): Promise<Result> => {
    try {
      return await cached(...args);
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (message.includes("incrementalCache missing")) {
        return fn(...args);
      }
      throw error;
    }
  };
}
