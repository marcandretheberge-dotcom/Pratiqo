import { cafePhotoHandler } from "@/lib/cafe/communityPhotos";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const PUT = (request: Request) => cafePhotoHandler(request);
export const DELETE = (request: Request) => cafePhotoHandler(request);
