"use client";

import Image from "next/image";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { Camera, Trash2 } from "lucide-react";
import { cafeCommunityTransport, type CafeCommunityTransport, type CafeIdentity } from "@/lib/cafe/communityClient";
import type { CafeMember } from "@/lib/cafe/communityTypes";
import { CAFE_PHOTO_MAX_BYTES } from "@/lib/cafe/communityPhotoPolicy";
import { cafeText, communityError, type CommunityLocale } from "./copy";
import styles from "./people.module.css";

const Photos = createContext<{ identity: CafeIdentity; transport: CafeCommunityTransport } | null>(null);
export function CafePhotoProvider({ identity, transport = cafeCommunityTransport, children }: {
  identity: CafeIdentity; transport?: CafeCommunityTransport; children: ReactNode;
}) { return <Photos.Provider value={{ identity, transport }}>{children}</Photos.Provider>; }

export function CafeAvatar({ member, large = false }: { member: CafeMember; large?: boolean }) {
  const context = useContext(Photos);
  const token = context?.identity.accessToken, actor = context?.identity.userId, photo = context?.transport.photo;
  const [image, setImage] = useState<{ key: string; url: string } | null>(null);
  const key = `${actor}:${member.id}:${member.avatarVersion}`;
  useEffect(() => {
    if (!token || !photo || !member.avatarVersion) return;
    const controller = new AbortController();
    let url: string | null = null;
    void photo(token, member.id, controller.signal).then(blob => {
      if (!blob || controller.signal.aborted) return;
      url = URL.createObjectURL(blob); setImage({ key, url });
    }).catch(() => undefined);
    return () => { controller.abort(); if (url) URL.revokeObjectURL(url); };
  }, [token, photo, member.id, member.avatarVersion, key]);
  return <span className={`${styles.avatar} ${large ? styles.avatarLarge : ""}`}>
    {image?.key === key ? <Image src={image.url} alt="" width={large ? 88 : 48} height={large ? 88 : 48} unoptimized /> : <span aria-hidden>{Array.from(member.displayName)[0]?.toUpperCase()}</span>}
  </span>;
}

export function CafePhotoEditor({ member, locale, onSaved }: { member: CafeMember; locale: CommunityLocale; onSaved: () => Promise<void> }) {
  const context = useContext(Photos);
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  const t = (fr: string, en: string, es: string) => cafeText(locale, fr, en, es);
  const save = async (file: File | null) => {
    if (!context?.transport.savePhoto || busy) return;
    if (file && (file.size > CAFE_PHOTO_MAX_BYTES || !["image/jpeg", "image/png", "image/webp"].includes(file.type))) {
      setError(t("Choisissez une photo JPG, PNG ou WebP de 4 Mo maximum.", "Choose a JPG, PNG or WebP photo up to 4 MB.", "Elige una foto JPG, PNG o WebP de hasta 4 MB.")); return;
    }
    setBusy(true); setError("");
    try {
      const result = await context.transport.savePhoto(context.identity.accessToken, file);
      if (result.ok) await onSaved(); else setError(communityError(result.code, locale));
    } catch { setError(communityError("network_error", locale)); }
    finally { setBusy(false); }
  };
  return <section className={styles.photoEditor}>
    <CafeAvatar member={member} large />
    <div><label className={styles.upload}><Camera size={18} />
      {busy ? t("Enregistrement…", "Saving…", "Guardando…") : t("Choisir une photo", "Choose a photo", "Elegir una foto")}
      <input aria-label={t("Photo du Café", "Café photo", "Foto del Café")} type="file" accept="image/jpeg,image/png,image/webp" disabled={busy}
        onChange={event => { const file = event.target.files?.[0]; if (file) void save(file); event.target.value = ""; }} />
    </label>
    {member.avatarVersion && <button className={styles.iconButton} title={t("Retirer la photo", "Remove photo", "Quitar foto")} aria-label={t("Retirer la photo", "Remove photo", "Quitar foto")} disabled={busy} onClick={() => void save(null)}><Trash2 size={18} /></button>}
    <p className={styles.note}>{t("Facultatif · visible par les membres du Café. Photo recadrée en carré.", "Optional · visible to Café members. Cropped to a square.", "Opcional · visible para miembros del Café. Recorte cuadrado.")}</p></div>
    {error && <p role="alert">{error}</p>}
  </section>;
}
