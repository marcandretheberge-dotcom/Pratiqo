import { nativePaymentReturn } from "@/lib/mobile/server";

export const dynamic = "force-dynamic";

export function GET(request: Request) {
  return nativePaymentReturn(new URL(request.url));
}
