import { cafePhotoHandler } from "@/lib/cafe/communityPhotos";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request, { params }: { params: Promise<{ memberId: string }> }) {
  return cafePhotoHandler(request, (await params).memberId);
}
