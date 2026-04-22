import Link from "next/link";
import { CheckCircle2, Calendar, LayoutDashboard, User } from "lucide-react";
import { stripe } from "@/lib/stripe";

export const dynamic = "force-dynamic";

type Search = { session_id?: string };

export default async function BookingSuccessPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const sp = await searchParams;
  const sessionId = sp.session_id;

  if (!sessionId) {
    return (
      <div className="max-w-lg mx-auto space-y-6">
        <div className="ds-card p-8 text-center border border-[var(--p-border-light)]">
          <p className="text-[var(--p-text-muted)] text-sm font-medium">
            Lien de confirmation invalide (session Stripe manquante).
          </p>
          <Link href="/booking" className="mt-6 inline-flex ds-btn-primary text-sm px-6 py-3 rounded-2xl">
            Retour à la réservation
          </Link>
        </div>
      </div>
    );
  }

  let amountLabel = "";
  let descriptionLine = "";
  let teacherRef = "";

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["line_items"],
    });

    const total = session.amount_total;
    const cur = (session.currency || "eur").toUpperCase();
    if (total != null) {
      amountLabel = new Intl.NumberFormat("fr-FR", {
        style: "currency",
        currency: cur,
      }).format(total / 100);
    }

    const meta = session.metadata || {};
    if (typeof meta.teacher_id === "string") {
      teacherRef = `Professeur (réf.) : ${meta.teacher_id}`;
    }

    const desc = session.line_items?.data?.[0]?.description;
    if (desc) {
      descriptionLine = desc;
    }
  } catch (err) {
    console.error("[booking/success] Stripe session retrieve failed:", sessionId, err);
    return (
      <div className="max-w-lg mx-auto space-y-6">
        <div className="ds-card p-8 text-center border border-[var(--p-border-light)]">
          <p className="text-[var(--p-text-muted)] text-sm font-medium">
            Impossible de charger les détails du paiement. Si le prélèvement a réussi, vérifiez votre tableau de bord.
          </p>
          <Link href="/dashboard" className="mt-6 inline-flex ds-btn-primary text-sm px-6 py-3 rounded-2xl">
            Tableau de bord
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto space-y-8">
      <div
        className="rounded-[28px] p-8 sm:p-10 text-white shadow-[0_24px_80px_rgba(29,158,117,0.25)] border border-white/20"
        style={{ background: "linear-gradient(145deg, #1D9E75 0%, #0f6e56 100%)" }}
      >
        <div className="flex flex-col items-center text-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-white/15 flex items-center justify-center border border-white/25">
            <CheckCircle2 className="w-9 h-9 text-white" strokeWidth={2} />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#9fe1cb]">Paiement réussi</p>
            <h1 className="text-[28px] sm:text-[34px] font-semibold leading-tight mt-2">Merci ! Votre cours est payé.</h1>
            <p className="text-sm text-white/90 mt-3 leading-relaxed">
              Votre réservation est confirmée. Le professeur et vous recevrez une notification.
            </p>
          </div>
        </div>
      </div>

      <div className="ds-card p-6 sm:p-8 space-y-5 border border-[var(--p-light-teal-bg)]">
        <h2 className="text-sm font-bold text-[var(--p-text)] uppercase tracking-widest">Détails</h2>
        <ul className="space-y-4 text-[15px] text-[var(--p-text)]">
          {amountLabel ? (
            <li className="flex items-center justify-between gap-4 border-b border-[var(--p-light-teal-bg)] pb-4">
              <span className="text-[var(--p-text-muted)] font-medium">Montant</span>
              <span className="font-semibold tabular-nums" style={{ color: "#1D9E75" }}>
                {amountLabel}
              </span>
            </li>
          ) : null}
          {descriptionLine ? (
            <li className="flex items-start gap-3">
              <Calendar className="w-5 h-5 shrink-0 mt-0.5" style={{ color: "#1D9E75" }} />
              <span>{descriptionLine}</span>
            </li>
          ) : null}
          {teacherRef ? (
            <li className="flex items-start gap-3">
              <User className="w-5 h-5 shrink-0 mt-0.5" style={{ color: "#1D9E75" }} />
              <span className="text-[var(--p-text-muted)] text-sm">{teacherRef}</span>
            </li>
          ) : null}
        </ul>

        <div className="pt-2 flex flex-col sm:flex-row gap-3">
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center gap-2 rounded-2xl px-6 py-3.5 text-sm font-semibold text-white shadow-lg transition hover:opacity-95"
            style={{ backgroundColor: "#1D9E75" }}
          >
            <LayoutDashboard className="w-4 h-4" />
            Tableau de bord
          </Link>
          <Link
            href="/booking"
            className="inline-flex items-center justify-center rounded-2xl px-6 py-3.5 text-sm font-semibold border border-[var(--p-border-light)] text-[var(--p-text)] hover:bg-[var(--p-light-teal-bg)]/60 transition"
          >
            Autres réservations
          </Link>
        </div>
      </div>
    </div>
  );
}
