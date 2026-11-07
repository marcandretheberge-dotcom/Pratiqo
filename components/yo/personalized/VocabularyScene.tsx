"use client";
import Image from "next/image";
import { useState } from "react";
import { CakeSlice, Heart, MapPin, UserRound, ImageOff } from "lucide-react";
import type { VocabularyPicture } from "@/lib/yo/personalized/types";
import type { YoLocale } from "@/lib/yo/types";
import { approvedPicture, artworkPath, vocabularyArtwork } from "@/lib/yo/personalized/approvedVocabulary";

/** Real image assets inside real answer buttons. Captions remain selectable, localizable HTML. */
export function VocabularyScene({ picture, locale }: { picture: VocabularyPicture; locale: YoLocale }) {
  const p = picture.artwork ? picture : approvedPicture(picture);
  const artwork = p.artwork ?? "meeting", asset = vocabularyArtwork[artwork], src = artworkPath(artwork);
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const failed = failedSrc === src;
  const Icon = p.kind === "age" || p.detail === "AGE" ? CakeSlice : p.detail === "MAP" || p.detail === "CITY" ? MapPin : p.detail === "FEELING" ? Heart : UserRound;
  const hasCaption = Boolean(p.caption);
  return <span className="block h-full overflow-hidden rounded-[inherit]" data-vocabulary-artwork={artwork}>
    <span className="relative block aspect-[4/3] w-full overflow-hidden bg-emerald-50">
      {failed ? <span className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-3 text-center text-xs leading-5 text-emerald-950" data-artwork-unavailable>
        <ImageOff size={22} aria-hidden />
        <span>{{ fr: "Image indisponible", en: "Image unavailable", es: "Imagen no disponible" }[locale]}</span>
      </span> : <Image key={src} src={src} alt="" width={asset.width} height={asset.height}
        sizes="(max-width: 639px) 44vw, 300px" loading="eager"
        className="absolute inset-0 h-full w-full object-cover" onError={() => setFailedSrc(src)} />}
      {p.kind === "question" ? <span aria-hidden className="absolute inset-x-0 bottom-0 flex justify-center bg-gradient-to-t from-emerald-950/65 to-transparent pb-3 pt-8">
        <span className="flex items-center gap-2 rounded-full bg-white px-3 py-2 text-emerald-950 shadow-sm"><Icon size={22} /><span className="text-xl font-black">?</span></span>
      </span> : null}
    </span>
    {hasCaption ? <span aria-hidden className="block bg-white px-2 py-2.5 text-center text-emerald-950 sm:px-3">
      <span className="block text-[11px] font-medium leading-4 sm:text-xs">{p.caption![locale]}</span>
      {p.kind !== "question" ? <span className={`mt-0.5 block break-words font-bold leading-tight ${p.kind === "age" ? "text-2xl" : "text-base sm:text-lg"}`}>{p.label}</span> : null}
    </span> : null}
    {failed ? <span className="block bg-white p-2 text-xs leading-5">{picture.alt[locale]}</span> : null}
  </span>;
}
