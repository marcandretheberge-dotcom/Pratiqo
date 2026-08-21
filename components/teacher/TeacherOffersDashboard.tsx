"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, NotebookPen, Plus, X } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { TeacherOfferCard } from "@/components/teacher/TeacherOfferCard";
import { TeacherOfferForm } from "@/components/teacher/TeacherOfferForm";
import { TeacherOfferMissingFieldsAlert } from "@/components/teacher/TeacherOfferMissingFieldsAlert";
import { useLocale } from "@/lib/locale-context";
import {
  buildTeacherOfferWritePayload,
  emptyTeacherOfferFormValues,
  teacherOfferToFormValues,
  type TeacherOfferFormFieldError,
  type TeacherOfferFormValues,
} from "@/lib/offers/clientPayload";
import {
  formatTeacherOfferStatusLabel,
  resolveTeacherOfferMissingFieldPaths,
  teacherOfferApiErrorMessage,
  type TeacherOfferStatusAction,
} from "@/lib/offers/display";
import {
  getMissingPublishFieldsForForm,
  getMissingPublishFieldsForOffer,
  isTeacherOfferFormPublishReady,
} from "@/lib/offers/publishReadiness";
import { sortTeacherOffersForDashboard } from "@/lib/offers/sortTeacherOffers";
import {
  archiveTeacherOffer,
  createTeacherOffer,
  fetchTeacherOffers,
  updateTeacherOffer,
} from "@/lib/offers/teacherOffersClient";
import type { TeacherOfferDto, TeacherOfferStatus } from "@/lib/offers/types";
import { cn } from "@/lib/utils";

type EditorMode = "create" | "edit" | "view";

const STATUS_SECTIONS: TeacherOfferStatus[] = ["published", "paused", "draft", "archived"];

export function TeacherOffersDashboard() {
  const { user, profile, loading: authLoading } = useAuth();
  const { t } = useLocale();
  const router = useRouter();
  const isTeacher = (profile?.role as string | undefined) === "teacher";

  const [loading, setLoading] = useState(true);
  const [offers, setOffers] = useState<TeacherOfferDto[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editor, setEditor] = useState<EditorMode | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);
  const [formValues, setFormValues] = useState<TeacherOfferFormValues>(emptyTeacherOfferFormValues);
  const [formErrors, setFormErrors] = useState<TeacherOfferFormFieldError[]>([]);
  const [archiveTarget, setArchiveTarget] = useState<TeacherOfferDto | null>(null);
  const [publishMissingFields, setPublishMissingFields] = useState<string[]>([]);

  useEffect(() => {
    if (authLoading || !user) return;
    if (!isTeacher) router.replace("/dashboard");
  }, [authLoading, isTeacher, router, user]);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const result = await fetchTeacherOffers();
      if (!result.ok) {
        setLoadError(teacherOfferApiErrorMessage(result.error, t));
        setOffers([]);
        return;
      }
      setOffers(sortTeacherOffersForDashboard(result.data.offers));
    } catch {
      setLoadError(t("teacherOffersLoadError"));
      setOffers([]);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (!user || !isTeacher) {
      setLoading(false);
      return;
    }
    void load();
  }, [isTeacher, load, user]);

  const grouped = useMemo(() => {
    const map = new Map<TeacherOfferStatus, TeacherOfferDto[]>();
    for (const status of STATUS_SECTIONS) map.set(status, []);
    for (const offer of offers) {
      map.get(offer.status)?.push(offer);
    }
    return map;
  }, [offers]);

  const openCreate = () => {
    setEditor("create");
    setEditingId(null);
    setCoverImageUrl(null);
    setFormValues(emptyTeacherOfferFormValues());
    setFormErrors([]);
    setActionError(null);
    setPublishMissingFields([]);
  };

  const openEditor = (offer: TeacherOfferDto, mode: "edit" | "view") => {
    setEditor(mode);
    setEditingId(offer.id);
    setCoverImageUrl(offer.imageUrl ?? null);
    setFormValues(teacherOfferToFormValues(offer));
    setFormErrors([]);
    setActionError(null);
    setPublishMissingFields([]);
  };

  const closeEditor = () => {
    if (saving) return;
    setEditor(null);
    setEditingId(null);
    setCoverImageUrl(null);
    setFormErrors([]);
  };

  const upsertOffer = (offer: TeacherOfferDto) => {
    setOffers((current) => sortTeacherOffersForDashboard([offer, ...current.filter((row) => row.id !== offer.id)]));
  };

  const handleSave = async (status: "draft" | "published") => {
    const parsed = buildTeacherOfferWritePayload(formValues);
    if (!parsed.ok) {
      setFormErrors(parsed.errors);
      return;
    }
    if (status === "published" && !isTeacherOfferFormPublishReady(formValues)) {
      setActionError(t("teacherOffersNotPublishable"));
      setPublishMissingFields(getMissingPublishFieldsForForm(formValues));
      return;
    }
    setFormErrors([]);
    setSaving(true);
    setActionError(null);
    setPublishMissingFields([]);
    try {
      const body = { ...parsed.body, status };
      const result =
        editor === "create"
          ? await createTeacherOffer(body)
          : editingId
            ? await updateTeacherOffer(editingId, body)
            : null;
      if (!result) return;
      if (!result.ok) {
        setActionError(teacherOfferApiErrorMessage(result.error, t));
        if (result.error.error === "offer_not_publishable") {
          setPublishMissingFields(resolveTeacherOfferMissingFieldPaths(result.error));
        }
        if (result.error.error === "invalid_payload") setFormErrors(["title"]);
        return;
      }
      upsertOffer(result.data.offer);
      setNotice(status === "published" ? t("teacherOffersPublished") : t("teacherOffersSaved"));
      if (editor === "create") {
        setEditor("edit");
        setEditingId(result.data.offer.id);
        setCoverImageUrl(result.data.offer.imageUrl ?? null);
      } else {
        setEditor(null);
        setEditingId(null);
        setCoverImageUrl(null);
      }
    } catch {
      setActionError(t("teacherOffersSaveError"));
    } finally {
      setSaving(false);
    }
  };

  const runStatusAction = async (offer: TeacherOfferDto, action: TeacherOfferStatusAction) => {
    if (action === "edit") {
      openEditor(offer, "edit");
      return;
    }
    if (action === "view") {
      openEditor(offer, "view");
      return;
    }
    if (action === "archive") {
      setArchiveTarget(offer);
      return;
    }
    if (action === "publish") {
      const missing = getMissingPublishFieldsForOffer(offer);
      if (missing.length > 0) {
        setActionError(t("teacherOffersNotPublishable"));
        setPublishMissingFields(missing);
        openEditor(offer, "edit");
        return;
      }
    }
    if (busyId) return;
    setBusyId(offer.id);
    setActionError(null);
    setPublishMissingFields([]);
    try {
      // Future: published offer limits will depend on plan/founder status.
      const status = action === "pause" ? "paused" : "published";
      const result = await updateTeacherOffer(offer.id, { status });
      if (!result.ok) {
        setActionError(teacherOfferApiErrorMessage(result.error, t));
        if (result.error.error === "offer_not_publishable") {
          setPublishMissingFields(resolveTeacherOfferMissingFieldPaths(result.error));
          openEditor(offer, "edit");
        }
        return;
      }
      upsertOffer(result.data.offer);
    } catch {
      setActionError(t("teacherOffersActionError"));
    } finally {
      setBusyId(null);
    }
  };

  const confirmArchive = async () => {
    if (!archiveTarget || busyId) return;
    setBusyId(archiveTarget.id);
    setActionError(null);
    try {
      const result = await archiveTeacherOffer(archiveTarget.id);
      if (!result.ok) {
        setActionError(teacherOfferApiErrorMessage(result.error, t));
        return;
      }
      setOffers((current) =>
        sortTeacherOffersForDashboard(
          current.map((row) =>
            row.id === archiveTarget.id
              ? { ...row, status: "archived", archivedAt: new Date().toISOString() }
              : row,
          ),
        ),
      );
      void load();
      setArchiveTarget(null);
    } catch {
      setActionError(t("teacherOffersActionError"));
    } finally {
      setBusyId(null);
    }
  };

  if (authLoading || !user) {
    return (
      <div className="flex items-center justify-center py-16 text-sm font-semibold text-slate-600" role="status" aria-busy="true">
        <Loader2 className="mr-2 h-5 w-5 animate-spin text-teal-700" />
        {t("loading")}
      </div>
    );
  }

  if (!isTeacher) {
    return (
      <div className="rounded-2xl border border-[#E8E6DF] bg-white p-6 text-center sm:p-8">
        <p className="font-semibold text-[#2C2C2A]">{t("verificationTeachersOnly")}</p>
        <Link href="/dashboard" className="mt-4 inline-flex min-h-11 items-center justify-center rounded-full px-4 text-sm font-semibold text-teal-700 hover:underline">
          {t("back")}
        </Link>
      </div>
    );
  }

  const editorTitle =
    editor === "create"
      ? t("teacherOffersCreateTitle")
      : editor === "view"
        ? t("teacherOffersViewTitle")
        : t("teacherOffersEditTitle");

  return (
    <div className="space-y-6 sm:pb-2">
      <section className="rounded-3xl border border-[#DCEAE3] bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-teal-50 text-teal-700">
              <NotebookPen size={26} />
            </span>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">{t("teacherSpaceLabel")}</p>
              <h1 className="mt-1 text-2xl font-bold text-[#2C2C2A]">{t("teacherOffersTitle")}</h1>
              <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600">{t("teacherOffersSubtitle")}</p>
              <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-500" data-testid="teacher-offers-marketplace-notice">
                {t("teacherOffersMarketplaceNotice")}
              </p>
            </div>
          </div>
          <button
            type="button"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-teal-700 px-4 text-sm font-semibold text-white hover:bg-teal-800"
            onClick={openCreate}
          >
            <Plus size={16} />
            {t("teacherOffersCreateCta")}
          </button>
        </div>
      </section>

      {notice ? (
        <p className="rounded-xl border border-teal-100 bg-teal-50 px-4 py-3 text-sm font-semibold text-teal-800" role="status">
          {notice}
        </p>
      ) : null}
      {actionError || publishMissingFields.length > 0 ? (
        <div className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3" role="alert">
          {publishMissingFields.length > 0 ? (
            <TeacherOfferMissingFieldsAlert
              className="border-0 bg-transparent p-0"
              missingFields={publishMissingFields}
              onComplete={
                editor
                  ? undefined
                  : () => {
                      const draft = offers.find((row) => row.status === "draft");
                      if (draft) openEditor(draft, "edit");
                    }
              }
            />
          ) : (
            <p className="text-sm font-semibold text-rose-800">{actionError}</p>
          )}
        </div>
      ) : null}

      {loading ? (
        <div className="flex items-center justify-center rounded-3xl border border-[#DCEAE3] bg-white py-16 text-sm font-semibold text-slate-600" role="status" aria-busy="true">
          <Loader2 className="mr-2 h-5 w-5 animate-spin text-teal-700" />
          {t("teacherOffersLoading")}
        </div>
      ) : loadError ? (
        <div className="rounded-3xl border border-rose-100 bg-white p-8 text-center">
          <p className="font-semibold text-rose-800">{loadError}</p>
          <button
            type="button"
            className="mt-4 inline-flex h-11 items-center justify-center rounded-full bg-rose-800 px-4 text-sm font-semibold text-white"
            onClick={() => void load()}
          >
            {t("teacherOffersRetry")}
          </button>
        </div>
      ) : offers.length === 0 ? (
        <div className="rounded-3xl border border-[#DCEAE3] bg-white px-6 py-12 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-50 text-teal-700">
            <NotebookPen size={26} />
          </div>
          <h2 className="mt-4 text-lg font-bold text-[#2C2C2A]">{t("teacherOffersEmptyTitle")}</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-slate-600">{t("teacherOffersEmptyBody")}</p>
          <p className="mx-auto mt-3 max-w-xl text-xs leading-relaxed text-slate-400">{t("teacherOffersEmptyNote")}</p>
          <button
            type="button"
            className="mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-full bg-teal-700 px-5 text-sm font-semibold text-white hover:bg-teal-800"
            onClick={openCreate}
          >
            <Plus size={16} />
            {t("teacherOffersCreateCta")}
          </button>
        </div>
      ) : (
        STATUS_SECTIONS.map((status) => {
          const rows = grouped.get(status) ?? [];
          if (rows.length === 0) return null;
          return (
            <section key={status} className="space-y-3">
              <h2 className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                {formatTeacherOfferStatusLabel(status, t)}
              </h2>
              {rows.map((offer) => (
                <TeacherOfferCard
                  key={offer.id}
                  offer={offer}
                  busy={busyId === offer.id}
                  onAction={(action) => void runStatusAction(offer, action)}
                />
              ))}
            </section>
          );
        })
      )}

      {editor ? (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4">
          <div className="max-h-[92dvh] w-full max-w-5xl overflow-y-auto rounded-t-3xl bg-white p-5 shadow-xl sm:rounded-3xl sm:p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-lg font-bold text-[#2C2C2A]">{editorTitle}</h2>
              <button type="button" className="rounded-lg p-2 hover:bg-slate-50" onClick={closeEditor} aria-label={t("teacherOffersClose")}>
                <X size={18} />
              </button>
            </div>
            {actionError && editor ? (
              <p className="mb-3 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-800" role="alert">
                {actionError}
              </p>
            ) : null}
            <TeacherOfferForm
              values={formValues}
              errors={formErrors}
              readOnly={editor === "view"}
              saving={saving}
              offerId={editingId}
              coverImageUrl={coverImageUrl}
              onCoverUploaded={(offer) => {
                upsertOffer(offer);
                setCoverImageUrl(offer.imageUrl ?? null);
              }}
              onCoverRemoved={(offer) => {
                upsertOffer(offer);
                setCoverImageUrl(null);
              }}
              onChange={(patch) => setFormValues((current) => ({ ...current, ...patch }))}
              onSaveDraft={() => void handleSave("draft")}
              onPublish={() => void handleSave("published")}
              onCancel={closeEditor}
            />
          </div>
        </div>
      ) : null}

      {archiveTarget ? (
        <div className="fixed inset-0 z-[75] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-bold text-[#2C2C2A]">{t("teacherOffersArchiveConfirmTitle")}</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">{t("teacherOffersArchiveConfirmBody")}</p>
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                className="inline-flex h-11 items-center justify-center rounded-full px-4 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                onClick={() => setArchiveTarget(null)}
              >
                {t("teacherOffersCancel")}
              </button>
              <button
                type="button"
                disabled={Boolean(busyId)}
                className={cn(
                  "inline-flex h-11 items-center justify-center rounded-full bg-slate-800 px-4 text-sm font-semibold text-white hover:bg-slate-900 disabled:opacity-60",
                )}
                onClick={() => void confirmArchive()}
              >
                {busyId ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {t("teacherOffersArchive")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
