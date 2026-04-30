export default function BookingSuccessLoading() {
  return (
    <div className="max-w-xl mx-auto flex flex-col items-center justify-center gap-6 py-24">
      {/* Spinner */}
      <div
        className="w-14 h-14 rounded-full border-4 border-[#1D9E75]/20 border-t-[#1D9E75] animate-spin"
        role="status"
        aria-label="Vérification du paiement en cours…"
      />
      <div className="text-center space-y-1">
        <p className="text-[15px] font-semibold text-[var(--p-text)]">
          Vérification du paiement…
        </p>
        <p className="text-sm text-[var(--p-text-muted)]">
          Un instant, nous confirmons votre réservation.
        </p>
      </div>
    </div>
  );
}
