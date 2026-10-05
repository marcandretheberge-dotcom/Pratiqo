import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Contact | Pratiqo",
  description: "Contactez Pratiqo — support utilisateur, questions générales et partenariats.",
};

export default function ContactPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-[#2C2C2A] mb-2">
        Contact
      </h1>
      <p className="text-[#6B6A65] mb-8">
        On est là pour toi. Choisis le bon canal selon ta question.
      </p>

      <div className="space-y-6">
        <div className="rounded-2xl border border-[#E8E6DF] bg-white p-6">
          <h2 className="font-bold text-lg text-[#2C2C2A] mb-2">
            🛟 Besoin d&apos;aide ?
          </h2>
          <p className="text-sm text-[#555550] mb-3">
            Question sur ton compte, problème technique, ou aide pour réserver un cours ?
          </p>
          <a
            href="mailto:info@pratiqo.ca"
            className="inline-flex items-center text-teal-700 font-semibold hover:underline"
          >
            info@pratiqo.ca →
          </a>
        </div>

        <div className="rounded-2xl border border-[#E8E6DF] bg-white p-6">
          <h2 className="font-bold text-lg text-[#2C2C2A] mb-2">
            📩 Questions générales
          </h2>
          <p className="text-sm text-[#555550] mb-3">
            Partenariats, presse, opportunités d&apos;affaires, ou simplement nous dire bonjour.
          </p>
          <a
            href="mailto:info@pratiqo.ca"
            className="inline-flex items-center text-teal-700 font-semibold hover:underline"
          >
            info@pratiqo.ca →
          </a>
        </div>

        <div className="rounded-2xl border border-[#E8E6DF] bg-[#F1EFE8] p-6">
          <h2 className="font-bold text-lg text-[#2C2C2A] mb-2">
            🌍 Pratiqo
          </h2>
          <p className="text-sm text-[#555550]">
            La plateforme québécoise pour apprendre, ici.<br />
            D&apos;ici, pour ici.
          </p>
        </div>
      </div>

      <div className="mt-10 pt-6 border-t border-[var(--p-border-light)]">
        <Link href="/" className="text-sm text-[var(--p-text-muted)] hover:text-teal-700 transition-colors">
          ← Retour à l&apos;accueil
        </Link>
      </div>
    </div>
  );
}
