"use client";

import type { RefObject } from "react";
import { CheckCircle2, Loader2, Paperclip, ShieldCheck, UploadCloud, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { VerificationStepState } from "@/lib/verificationState";
import type { TranslationKey } from "@/lib/translations";

type Props = {
  diploma: VerificationStepState;
  busy: string | null;
  diplomaFile: File | null;
  diplomaNote: string;
  fileInputRef: RefObject<HTMLInputElement | null>;
  onFileChange: (file: File | null) => void;
  onNoteChange: (note: string) => void;
  onUpload: () => void;
  t: (key: TranslationKey) => string;
};

export function DiplomaStep({
  diploma,
  busy,
  diplomaFile,
  diplomaNote,
  fileInputRef,
  onFileChange,
  onNoteChange,
  onUpload,
  t,
}: Props) {
  const hasDiplomaUploaded = diploma.kind !== "not_started";

  return (
    <div className="rounded-2xl border border-[#E8E6DF] bg-white p-5 space-y-3">
      <div className="flex gap-3">
        <ShieldCheck className="text-[#534AB7] shrink-0 mt-0.5" size={22} />
        <div className="flex-1 min-w-0">
          {diploma.kind === "verified" ? (
            <p className="mt-2 text-sm font-semibold text-teal-700">
              {t("verificationDiplomaValidated")}
            </p>
          ) : (
            <div className="mt-3 space-y-3">
              {hasDiplomaUploaded ? (
                <div className="flex items-center gap-2 rounded-xl bg-teal-50 border border-teal-500/25 px-4 py-2.5">
                  <CheckCircle2 size={16} className="text-teal-700 shrink-0" />
                  <p className="text-sm text-teal-800 font-medium">{t("diplomaReceived")}</p>
                </div>
              ) : null}

              <div>
                <label
                  htmlFor="diploma-file"
                  className={cn(
                    "flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-6 cursor-pointer transition-colors",
                    diplomaFile
                      ? "border-teal-500 bg-teal-500/10"
                      : "border-[#E8E6DF] hover:border-teal-500/50 hover:bg-slate-50",
                  )}
                >
                  {diplomaFile ? (
                    <>
                      <Paperclip size={22} className="text-teal-700" />
                      <span className="text-sm font-medium text-[#2C2C2A] text-center truncate max-w-xs">
                        {diplomaFile.name}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          onFileChange(null);
                          if (fileInputRef.current) fileInputRef.current.value = "";
                        }}
                        className="text-xs text-rose-500 hover:underline flex items-center gap-1"
                      >
                        <X size={12} /> {t("removeFile")}
                      </button>
                    </>
                  ) : (
                    <>
                      <UploadCloud size={24} className="text-[#6B6A65]" />
                      <span className="text-sm text-[#6B6A65] text-center">
                        <span className="font-semibold text-teal-700">{t("chooseFile")}</span>{" "}
                        {t("orDropFile")}
                      </span>
                      <span className="text-[11px] text-[#6B6A65]">{t("fileTypes")}</span>
                    </>
                  )}
                </label>
                <input
                  id="diploma-file"
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  className="sr-only"
                  onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
                />
              </div>

              <textarea
                value={diplomaNote}
                onChange={(e) => onNoteChange(e.target.value)}
                placeholder={t("verificationDiplomaPlaceholder")}
                rows={2}
                className="w-full rounded-xl border border-[#E8E6DF] px-3 py-2 text-sm outline-none focus:border-teal-500"
              />

              <button
                type="button"
                disabled={busy !== null || !diplomaFile}
                onClick={onUpload}
                className="h-11 rounded-xl bg-[#534AB7] px-5 text-sm font-semibold text-white hover:brightness-105 disabled:opacity-50 inline-flex items-center gap-2"
              >
                {busy === "diploma" ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <UploadCloud size={16} />
                )}
                {hasDiplomaUploaded ? t("replaceDiploma") : t("verificationRequest")}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
