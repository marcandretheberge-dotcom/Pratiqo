# SEO production QA checklist

Manual checks to run after each production deploy of public marketing / SEO surfaces.  
Automated gates before deploy: `npm run validate:i18n` and `npm run build`.

---

## 1. Homepage and locale hub

Open:

- https://www.pratiqo.ca/fr
- https://www.pratiqo.ca/en
- https://www.pratiqo.ca/es

Verify:

- [ ] Header: logo, currency switcher, language switcher
- [ ] Nav: Tarifs / Resources / Become a teacher / Sign in
- [ ] Mobile nav row (second row on small screens)
- [ ] Footer: product links + legal + contact email
- [ ] No raw translation keys (e.g. `seoLanding…`)
- [ ] No horizontal overflow on mobile

---

## 2. Priority French SEO pages

Open:

- https://www.pratiqo.ca/fr/cours/piano/montreal
- https://www.pratiqo.ca/fr/cours/guitare/quebec
- https://www.pratiqo.ca/fr/cours/mathematiques/laval
- https://www.pratiqo.ca/fr/cours/francisation/montreal
- https://www.pratiqo.ca/fr/tuteurs-prive/montreal
- https://www.pratiqo.ca/fr/tuteurs-prive/saint-georges

Verify:

- [ ] Shared marketing header + footer
- [ ] Exactly one visible H1
- [ ] Trust chips, how-it-works, transparency blocks in French
- [ ] FAQ accordions open; questions match page locale
- [ ] Discovery / related links use `/fr/…` prefixes
- [ ] Empty state (if no teachers): intentional copy + CTAs, no fake counts
- [ ] Teacher cards: “Nouveau” only when `reviews === 0`; star rating only when reviews > 0
- [ ] View page source: body copy present (not client-only shell)

---

## 3. EN / ES spot checks

Open:

- https://www.pratiqo.ca/en/cours/piano/montreal
- https://www.pratiqo.ca/es/cours/piano/montreal
- https://www.pratiqo.ca/en/tuteurs-prive/montreal
- https://www.pratiqo.ca/es/tuteurs-prive/montreal
- https://www.pratiqo.ca/en/become-teacher
- https://www.pratiqo.ca/es/become-teacher

Verify:

- [ ] UI chrome (header, CTAs, chips, FAQ titles) in English / Spanish
- [ ] No French UI strings except proper nouns (Montréal, Québec, Pratiqo)
- [ ] Long SEO body may be shorter in EN/ES (by design); FR pages keep deepest copy

---

## 4. Supporting marketing pages

- https://www.pratiqo.ca/fr/trouver-un-prof
- https://www.pratiqo.ca/fr/devenir-enseignant
- https://www.pratiqo.ca/fr/tarifs
- https://www.pratiqo.ca/fr/blog
- https://www.pratiqo.ca/fr/blog/donner-cours-prives-quebec
- https://www.pratiqo.ca/fr/contact
- https://www.pratiqo.ca/fr/charte-de-confiance
- https://www.pratiqo.ca/fr/cgu
- https://www.pratiqo.ca/fr/confidentialite
- https://www.pratiqo.ca/fr/annulation

Verify header/footer and locale-appropriate labels.

---

## 5. Redirect tests (expect 301)

Unprefixed → French:

- https://www.pratiqo.ca/ → `/fr`
- https://www.pratiqo.ca/cours/piano/montreal → `/fr/cours/piano/montreal`
- https://www.pratiqo.ca/tuteurs-prive/montreal → `/fr/tuteurs-prive/montreal`
- https://www.pratiqo.ca/blog/donner-cours-prives-quebec → `/fr/blog/donner-cours-prives-quebec`
- https://www.pratiqo.ca/tarifs → `/fr/tarifs`
- https://www.pratiqo.ca/trouver-un-prof → `/fr/trouver-un-prof`
- https://www.pratiqo.ca/devenir-enseignant → `/fr/devenir-enseignant`

Wrong slug per locale:

- https://www.pratiqo.ca/fr/become-teacher → `/fr/devenir-enseignant`
- https://www.pratiqo.ca/fr/find-a-teacher → `/fr/trouver-un-prof`
- https://www.pratiqo.ca/fr/pricing → `/fr/tarifs`
- https://www.pratiqo.ca/en/devenir-enseignant → `/en/become-teacher`

No redirect expected (valid paths):

- https://www.pratiqo.ca/en/trouver-un-prof
- https://www.pratiqo.ca/en/tarifs

Legacy alias:

- https://www.pratiqo.ca/fr/standards-communaute → `/fr/charte-de-confiance`

---

## 6. Metadata and structured data (DevTools or curl)

On a priority FR course page, confirm in `<head>`:

- [ ] Localized `<title>` and `meta description`
- [ ] `link rel="canonical"` → `https://www.pratiqo.ca/fr/…`
- [ ] `hreflang` alternates for en / fr / es
- [ ] `og:url` matches current locale URL
- [ ] `og:locale` = `fr_CA` (en → `en_CA`, es → `es_UY`)
- [ ] `robots` allows index (no accidental `noindex`)

In page source, confirm JSON-LD:

- [ ] `FAQPage` questions match visible FAQ
- [ ] `BreadcrumbList` present
- [ ] `Service` block present; no `aggregateRating` on city/course hubs
- [ ] No invented teacher counts in copy or schema

---

## 7. Sitemap and robots

- https://www.pratiqo.ca/robots.txt — allows `/`, disallows `/student`, `/dashboard`, `/api`, etc.; points to sitemap
- https://www.pratiqo.ca/sitemap.xml — locale-prefixed URLs only; includes course×city, tutor×city, blog posts, verified teacher profiles; no `/login`

---

## 8. Google Search Console (post-deploy)

Submit sitemap:

- https://www.pratiqo.ca/sitemap.xml

Request indexing (priority URLs):

- https://www.pratiqo.ca/fr
- https://www.pratiqo.ca/fr/trouver-un-prof
- https://www.pratiqo.ca/fr/devenir-enseignant
- https://www.pratiqo.ca/fr/cours/piano/montreal
- https://www.pratiqo.ca/fr/cours/guitare/quebec
- https://www.pratiqo.ca/fr/cours/mathematiques/laval
- https://www.pratiqo.ca/fr/cours/francisation/montreal
- https://www.pratiqo.ca/fr/tuteurs-prive/montreal
- https://www.pratiqo.ca/fr/tuteurs-prive/saint-georges
- https://www.pratiqo.ca/fr/blog/donner-cours-prives-quebec

---

## 9. Automated pre-deploy commands

```bash
npm run validate:i18n
npm run build
```

`npm run lint` is optional; the repo may have unrelated existing lint noise.

---

## Known intentional choices (not bugs)

- **Canonical default locale**: marketing canonicals use `/fr/…`; hreflang lists EN/ES alternates.
- **French-first long copy**: priority course/tutor bodies are longest in FR; EN/ES are shorter where configured.
- **Blog index metadata**: blog listing OG/title may remain French-forward; article pages use locale bundles where available.
- **No `/fr/a-propos`**: route does not exist in the app tree.
