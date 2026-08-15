import { AmbassadorAdminDetailClient } from "@/components/admin/AmbassadorAdminDetailClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminAmbassadorDetailPage({ params }: PageProps) {
  const { id } = await params;
  return <AmbassadorAdminDetailClient ambassadorId={id} />;
}
