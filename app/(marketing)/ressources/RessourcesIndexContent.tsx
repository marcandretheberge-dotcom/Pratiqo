import Link from "next/link";
import type { ResourceArticleMeta } from "@/lib/seo/resourceArticles";
import { LandingHeader } from "@/components/marketing/LandingHeader";
import { LandingFooter } from "@/components/marketing/LandingFooter";

export default function RessourcesIndexContent({ articles }: { articles: ResourceArticleMeta[] }) {
  return (
    <div className="min-h-[100dvh] flex flex-col bg-[#FAFCFB]">
      <LandingHeader />
      <main className="flex-1 mx-auto w-full max-w-4xl px-4 sm:px-6 py-10 sm:py-14">
        <p className="text-xs font-bold uppercase tracking-widest text-teal-700/80">Ressources</p>
        <h1 className="mt-2 text-3xl sm:text-4xl font-bold text-[#2C2C2A] text-balance">
          Guides pour choisir un professeur privé au Québec
        </h1>
        <p className="mt-4 text-base text-[#6B6A65] leading-relaxed max-w-2xl">
          Articles pratiques pour parents, élèves et adultes qui cherchent un professeur local ou en ligne —
          sans promesses marketing ni inventaire fictif.
        </p>

        <div className="mt-10 grid gap-4">
          {articles.map((article) => (
            <article
              key={article.slug}
              className="rounded-2xl border border-[#E8E6DF] bg-white p-6 shadow-sm hover:shadow-md transition-shadow"
            >
              <p className="text-[11px] font-bold uppercase tracking-widest text-[#6B6760]">{article.category}</p>
              <h2 className="mt-2 text-xl font-bold text-[#2C2C2A]">
                <Link href={`/ressources/${article.slug}`} className="hover:text-teal-700">
                  {article.title}
                </Link>
              </h2>
              <p className="mt-2 text-sm text-[#6B6A65] leading-relaxed">{article.description}</p>
              <Link
                href={`/ressources/${article.slug}`}
                className="mt-4 inline-flex text-sm font-semibold text-teal-700 hover:underline"
              >
                Lire le guide →
              </Link>
            </article>
          ))}
        </div>

        <section className="mt-12 rounded-2xl border border-[#E8E6DF] bg-[#FAFAF8] p-6">
          <h2 className="text-lg font-bold text-[#2C2C2A]">Prêt à chercher un professeur ?</h2>
          <p className="mt-2 text-sm text-[#6B6A65]">
            Parcourez les profils réellement disponibles sur Pratiqo — en ligne ou près de chez vous.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href="/trouver-un-prof"
              className="inline-flex rounded-xl bg-teal-700 px-5 py-2.5 text-sm font-bold text-white hover:brightness-105"
            >
              Voir les professeurs disponibles
            </Link>
            <Link
              href="/blog"
              className="inline-flex rounded-xl border border-[#E8E6DF] px-5 py-2.5 text-sm font-semibold text-teal-700 hover:bg-white"
            >
              Blog Pratiqo
            </Link>
          </div>
        </section>
      </main>
      <LandingFooter />
    </div>
  );
}
