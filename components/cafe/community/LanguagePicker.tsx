"use client";

import { useId, useMemo, useState } from "react";
import { cafeLanguageLabel, cafeLanguageOptions, canonicalCafeLanguage } from "@/lib/cafe/communityLanguages";
import { cafeText, type CommunityLocale } from "./copy";
import styles from "./community.module.css";

export function LanguagePicker({ label, value, onChange, locale, disabled = false }: {
  label: string; value: string[]; onChange: (value: string[]) => void; locale: CommunityLocale; disabled?: boolean;
}) {
  const [search, setSearch] = useState("");
  const [custom, setCustom] = useState("");
  const id = useId();
  const t = (fr: string, en: string, es: string) => cafeText(locale, fr, en, es);
  const options = useMemo(() => cafeLanguageOptions(locale, value), [locale, value]);
  const query = search.trim().toLocaleLowerCase(locale).normalize("NFD").replace(/\p{Diacritic}/gu, "");
  const visible = options.filter((option) => `${option.label} ${option.code}`.toLocaleLowerCase(locale).normalize("NFD").replace(/\p{Diacritic}/gu, "").includes(query));
  const code = canonicalCafeLanguage(custom);
  const toggle = (language: string) => onChange(value.includes(language) ? value.filter((item) => item !== language) : [...value, language].slice(0, 10));
  return <fieldset className={styles.picker} disabled={disabled}>
    <legend>{label}</legend>
    {value.length > 0 && <div className={styles.pills}>{value.map((language) => <span className={styles.pill} key={language}>
      {cafeLanguageLabel(language, locale)}
      <button type="button" onClick={() => toggle(language)} aria-label={`${t("Retirer", "Remove", "Quitar")} ${cafeLanguageLabel(language, locale)}`}>×</button>
    </span>)}</div>}
    <label className={styles.small} htmlFor={`${id}-search`}>{t("Rechercher une langue", "Search languages", "Buscar un idioma")}</label>
    <input className={styles.search} id={`${id}-search`} type="search" value={search} onChange={(event) => setSearch(event.target.value)} autoComplete="off" />
    <div className={styles.pickerOptions}>
      {visible.map((option) => <label className={styles.pickerOption} key={option.code}>
        <input type="checkbox" checked={value.includes(option.code)} disabled={!value.includes(option.code) && value.length >= 10} onChange={() => toggle(option.code)} />
        <span>{option.label}</span>
      </label>)}
      {visible.length === 0 && <p className={styles.small}>{t("Aucune correspondance. Vous pouvez ajouter un code ci-dessous.", "No matches. You can add a language code below.", "Sin resultados. Puedes añadir un código abajo.")}</p>}
    </div>
    <details>
      <summary className={styles.small}>{t("Une autre langue ou variante ?", "Another language or variety?", "¿Otro idioma o variedad?")}</summary>
      <p className={styles.small}>{t("Ajoutez son code ISO / BCP 47, par exemple cmn, yue ou pt-br. Jusqu’à 10 langues.", "Add its ISO / BCP 47 code, such as cmn, yue or pt-br. Up to 10 languages.", "Añade su código ISO / BCP 47, por ejemplo cmn, yue o pt-br. Hasta 10 idiomas.")}</p>
      <div className={styles.customCode}>
        <input className={styles.search} aria-label={t("Code de langue", "Language code", "Código de idioma")} value={custom} maxLength={35} onChange={(event) => setCustom(event.target.value)} />
        <button className={styles.button} type="button" disabled={!code || value.includes(code) || value.length >= 10} onClick={() => { if (code) { toggle(code); setCustom(""); } }}>{t("Ajouter", "Add", "Añadir")}</button>
      </div>
    </details>
  </fieldset>;
}
