import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/auth/admin";
import { productForPath, productLoginHref, productReturnPath, YO_ACCOUNT_PATH } from "@/lib/auth/productReturn";
import { hasStudentOnboardingConsent, YO_PROGRESS_CONSENT_VERSION } from "@/lib/auth/studentOnboardingConsent";
import { CafeNavLink } from "@/components/cafe/community/CafeNavLink";
import { YoProgressConsent } from "@/components/yo/YoProgressConsent";
import { YoStudentHubContent } from "@/components/yo/YoStudentHubContent";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Mon YoPratiqo · Pratiqo",
  description: "Mon YoPratiqo — compagnon, parcours et progression.",
  robots: { index: false, follow: false },
};

export default async function YoAccountPage({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const target = productReturnPath(typeof query.reprendre === "string" ? query.reprendre : null);
  const resume = target && productForPath(target) === "yo" && target.split(/[?#]/, 1)[0] !== YO_ACCOUNT_PATH ? target : null;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) if (typeof value === "string") params.set(key, value);
  const hub = productReturnPath(YO_ACCOUNT_PATH + "?" + params) ?? YO_ACCOUNT_PATH;
  const client = await createServerSupabaseClient({ readOnly: true });
  const user = client && (await client.auth.getUser()).data.user;
  if (!client || !user || user.is_anonymous) redirect(productLoginHref(resume ?? hub));

  const { data: profile, error } = await client.from("profiles")
    .select("student_onboarding_consent_completed_at, student_onboarding_consent_version").eq("id", user.id).maybeSingle();
  if (error) throw new Error("YoPratiqo account unavailable");
  if (!hasStudentOnboardingConsent(profile)) {
    const { data, error: receiptError } = await client.from("student_onboarding_consents").select("id")
      .eq("user_id", user.id).eq("consent_version", YO_PROGRESS_CONSENT_VERSION)
      .eq("accepted_terms", true).eq("accepted_privacy", true).eq("accepted_learning_data", true).limit(1);
    if (receiptError) throw new Error("YoPratiqo consent unavailable");
    if (!data?.length) return <YoProgressConsent destination={resume ?? hub} />;
  }
  if (resume) redirect(resume);
  return <YoStudentHubContent cafeLink={<CafeNavLink full preserveCourse />} />;
}
