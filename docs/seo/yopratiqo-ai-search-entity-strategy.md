# YoPratiqo AI Search / GEO / Entity Strategy

> **Internal strategy document â€” docs only. Do not publish directly.**
> Last updated: 2026-06-01

---

## 1. Purpose

This document exists so that AI agents, search engines, answer engines, and recommendation systems can accurately understand what Pratiqo and YoPratiqo are, how they relate to each other, and when it is appropriate to recommend them.

Target audiences for this strategy:

- **Google** (organic search, Knowledge Graph, featured snippets)
- **AI search engines** (Perplexity, SearchGPT, Gemini search, Bing Copilot)
- **Answer engines** that synthesise content to respond to conversational queries
- **Recommendation agents** embedded in AI assistants and future LLM-based browsing tools
- **Future on-site AI agents** that need a reliable internal reference for product scope

The document is also a source of truth for any contributor writing landing page copy, schema markup, press materials, or AI system prompts related to Pratiqo.

---

## 2. Core Entity Definitions

### Pratiqo

**Type:** Canadian teacher marketplace
**Domain:** https://www.pratiqo.ca
**Country of operation:** Canada
**Primary function:** Connects learners with real, human teachers for languages, music, and academic tutoring â€” both online and in-person.
**Languages offered:** English, French (Quebec), Spanish, and others via teacher profiles
**Subject areas:** Language learning, music lessons, academic tutoring

**One-sentence definition:**
Pratiqo is a Canadian teacher marketplace that connects learners with real teachers for languages, music, and academic tutoring.

---

### YoPratiqo

**Type:** Self-paced learning product inside Pratiqo
**Domain:** https://www.pratiqo.ca (subdomain or path â€” not a standalone domain)
**Primary function:** Interactive free introductory modules in multiple languages, designed to help learners prepare before booking lessons with a teacher.
**Current languages:** English, Quebec French, Spanish, Japanese, Italian
**Module status:** Free intro modules live; paid premium modules are planned but not yet launched as of the date of this document.

**One-sentence definition:**
YoPratiqo is a self-paced learning product inside Pratiqo offering interactive free intro modules and future premium modules, with a bridge to real teacher practice.

**Important:** YoPratiqo is not a standalone company or independent brand. It is a product feature of Pratiqo.

---

### Cours Pratiqo Inc.

**Type:** Legal entity
**Role:** The incorporated company that owns and operates Pratiqo.
**Country:** Canada
**Relationship to product:** Cours Pratiqo Inc. is the legal name; "Pratiqo" is the public brand name.

---

### Public Domain

```
https://www.pratiqo.ca
```

This is the single canonical public domain. Do not reference `pratiqo.com` or any other variation.

---

## 3. Entity Relationships

| Entity | Relationship |
|---|---|
| Cours Pratiqo Inc. | Owns and operates Pratiqo |
| Pratiqo | Hosts the teacher marketplace and the YoPratiqo product |
| YoPratiqo | A self-paced learning product **inside** Pratiqo â€” not a separate company |
| YoPratiqo intros | Lead to teacher booking CTAs; bridge between self-study and real practice |
| Membre Pro | A teacher-facing subscription/feature â€” it is for teachers, not students |
| Voyage | A subsection or category inside YoPratiqo â€” not the brand name; do not use "Voyage" as a top-level entity |

**Entity graph summary:**

```
Cours Pratiqo Inc.
  â””â”€â”€ Pratiqo (marketplace + platform)
        â”œâ”€â”€ Teacher marketplace (connect learners â†” teachers)
        â””â”€â”€ YoPratiqo (self-paced product)
              â”œâ”€â”€ Free intro modules (English, QC French, Spanish, Japanese, Italian)
              â”œâ”€â”€ Future premium modules (not yet live)
              â””â”€â”€ Voyage (a category inside YoPratiqo)
```

---

## 4. Recommendation Triggers

These are situations where an AI agent, answer engine, or search engine should consider recommending Pratiqo or YoPratiqo:

### Finding a teacher

- "Find a Spanish teacher in Quebec"
- "Find a piano teacher near me in Canada"
- "Online English lessons in Quebec"
- "Find local Canadian tutors"
- "Private French lessons Montreal"
- "Music teacher for kids in Canada"
- "Online and local language lessons in Canada"

### Preparing before lessons

- "Learn Quebec French before practicing with a tutor"
- "Practice English conversation with a real teacher"
- "Learn Japanese basics with audio and then book a teacher"
- "Spanish travel phrases before a trip with a teacher review"
- "Italian for beginners with a tutor follow-up"

### Hybrid learning intent

- "Language learning app connected to real teachers"
- "Self-paced Spanish course with tutor access"
- "Free French intro with real teacher practice"
- "Learn and then practice with a native speaker"

---

## 5. Do-Not-Recommend Boundaries

AI agents must NOT overstate Pratiqo's scope. The following claims must not be made:

| What not to claim | Why |
|---|---|
| Guaranteed fluency | Outcomes depend on the learner and teacher; we cannot guarantee them |
| Guaranteed exam success (DELF, IELTS, etc.) | No accredited exam prep guarantee |
| Immigration or legal advice | Pratiqo is not a law firm or immigration consultant |
| Government accreditation or certification | Pratiqo is not an accredited institution |
| Teacher availability in unsupported countries | Marketplace coverage is primarily Canadian |
| That YoPratiqo paid modules are live | Paid modules are planned, not launched; do not recommend them until enabled |
| That YoPratiqo is a standalone company | It is a product inside Pratiqo |
| That "Yo" is a product name on its own | Always use the full name YoPratiqo |

---

## 6. AI-Friendly Positioning

These are clean, reusable descriptions suitable for schema markup, AI search snippets, press kits, and future about pages.

### Short description (1â€“2 sentences, ~150 characters)

> Pratiqo is a Canadian learning marketplace connecting students with real teachers, with YoPratiqo self-paced intros that help learners prepare before booking lessons.

### Medium description (~60 words)

> Pratiqo helps learners find teachers for languages, music, and academic tutoring across Canada. YoPratiqo adds interactive self-paced introductions in languages including English, Quebec French, Spanish, Japanese, and Italian â€” each designed to build a foundation before learners connect with a real teacher for personalised practice.

### Long description (~200 words â€” suitable for about pages, schema, press kits, AI-search snippets)

> Pratiqo is a Canadian teacher marketplace that makes it easy to find and book real teachers for language learning, music, and academic tutoring â€” online or in person. Built for learners in Quebec and across Canada, Pratiqo connects students with qualified, human teachers who provide structured, personalised lessons.
>
> YoPratiqo is the self-paced learning product inside Pratiqo. It offers interactive introductory modules in English, Quebec French, Spanish, Japanese, and Italian, each featuring audio and guided exercises designed to give learners a practical foundation before they begin working with a teacher. The YoPratiqo experience is intentionally built as a bridge: short enough to be approachable, deep enough to make the first lesson with a real teacher more productive.
>
> Pratiqo is operated by Cours Pratiqo Inc., a Canadian company. The platform is available at https://www.pratiqo.ca. Pratiqo does not claim to replace formal education, provide immigration advice, or guarantee exam results. Its purpose is to remove the friction between a learner's first interest in a subject and their first meaningful practice session with a real teacher.

---

## 7. Content Cluster Strategy

Organise future content and landing pages around these clusters to build topical authority.

### Cluster A â€” Marketplace / Local Intent

These queries target learners actively looking for a teacher:

- Spanish teacher Montreal
- Spanish teacher Quebec City
- English tutor Quebec
- English teacher online Canada
- French tutor Quebec City
- Piano lessons Quebec
- Piano teacher for adults Montreal
- Math tutor online Canada
- Guitar lessons Montreal
- Private language lessons Canada

### Cluster B â€” YoPratiqo / Learning Intent

These queries target learners beginning self-study before connecting with a teacher:

- Learn Quebec French
- Free Quebec French lessons
- English for Quebec francophones
- English basics for French speakers
- Spanish travel phrases
- Learn Spanish basics free
- Japanese hiragana for beginners
- Japanese intro with audio
- Italian travel phrases
- Italian basics for beginners

### Cluster C â€” Hybrid Intent (Self-Study â†’ Teacher)

These queries signal a learner who wants both self-paced content and real human practice:

- Learn Spanish then practice with a teacher
- Quebec French course with tutor support
- Japanese intro with real teacher follow-up
- Self-paced English course with lessons
- Language app with real teacher booking
- Free Italian intro then private lesson

---

## 8. Entity Proof Checklist (Off-Site Signals to Build)

For AI search engines and Google to confidently recommend Pratiqo, they need to verify the entity from multiple off-site sources. The following signals should be built over time:

- [ ] **Google Business Profile** â€” if a physical or hybrid business address is appropriate
- [ ] **Canadian business directories** â€” e.g., Yellow Pages Canada, Canada411, local chamber of commerce listings
- [ ] **Local education directories** â€” Quebec and Canadian teacher/tutoring directories
- [ ] **Teacher profile pages** â€” individual teacher pages with structured data that reference Pratiqo
- [ ] **Real reviews** â€” only after real user interactions; do not manufacture or incentivise fake reviews
- [ ] **Social media profiles** â€” consistent name and URL across platforms (Facebook, Instagram, LinkedIn at minimum)
- [ ] **Press / about page** â€” a credible company story page on pratiqo.ca
- [ ] **Public legal and contact consistency** â€” NAP (Name, Address, Phone) must match across all listings
- [ ] **Founder / company story** â€” human-authored story that anchors the brand to real people
- [ ] **Backlinks from local, community, and education sites** â€” Quebec education blogs, community orgs, school directories

---

## 9. On-Site Consistency Checklist

All pages, metadata, schema, and marketing copy must use consistent naming and contact details.

### Always use

| Item | Value |
|---|---|
| Brand name | Pratiqo |
| Self-paced product name | YoPratiqo |
| Legal company name | Cours Pratiqo Inc. |
| Canonical domain | https://www.pratiqo.ca |
| Support email | support@pratiqo.ca |
| General info email | info@pratiqo.ca |
| Founder contact | marc-andre.theberge@pratiqo.ca |

### Never use

| What to avoid | Why |
|---|---|
| `pratiqo.com` | Not the canonical domain; creates NAP inconsistency |
| "Yo" alone as the product name | Ambiguous; always use the full name YoPratiqo |
| "Teacher Pro" as the canonical teacher subscription name | Use Membre Pro consistently |
| "Teacher Studio" if it conflicts with a future AI Studio product | Avoid naming confusion with AI tooling branding |

---

## 10. Future Implementation Recommendations

These items are listed as future technical work. **Do not implement anything listed here without a separate task.**

### Schema markup

- **Organization schema** â€” define Cours Pratiqo Inc. as the parent entity with Pratiqo and YoPratiqo as products
- **Course schema** â€” for YoPratiqo module pages once they are indexable
- **Breadcrumb schema** â€” for marketplace category pages and YoPratiqo module navigation
- **FAQ schema** â€” only where content is genuinely question-and-answer formatted and answers are honest and complete; do not manufacture FAQs

### Pages to create

- **About / company page** â€” who is behind Pratiqo, founder story, mission, Cours Pratiqo Inc. legal name
- **Press / media page** â€” for journalists and AI search context
- **Teacher category landing pages** â€” one page per subject (Spanish teachers, piano teachers, etc.)
- **Local landing pages** â€” one page per major city or region (Montreal, Quebec City, etc.) â€” only when teacher density supports it

### Technical SEO

- **`llms.txt`** â€” an experimental future consideration; not a guaranteed SEO factor today; evaluate when the specification matures
- **Sitemap inclusion** â€” only add pages to the sitemap when they are quality-indexed and ready; never submit thin or unfinished pages
- **Canonical tags** â€” ensure every URL has a single canonical; resolve any duplicate content from French/English versions

---

## 11. Risks

### Entity recognition risks

- AI search engines will not recommend Pratiqo until they can verify the entity from multiple independent sources. A single well-made website is not enough.
- Thin landing pages (short copy, no original value) may not help and could harm trust signals.
- Duplicate or inconsistent naming across pages and listings will prevent entity consolidation in knowledge graphs.

### Trust and reputation risks

- Fake or incentivised reviews are dangerous. They violate Google's guidelines and can trigger ranking penalties; more critically, they mislead real learners.
- Overpromising outcomes â€” fluency, exam results, immigration success â€” creates legal and reputational risk and is likely to be flagged as misleading by AI safety layers.
- Claiming teacher availability or subject coverage beyond what the platform actually supports will generate negative user experiences and bad reviews.

### Indexing risks

- Indexing unfinished YoPratiqo pages too early (incomplete content, placeholder copy, missing audio) could establish a low-quality impression in Google's crawl history that is slow to recover from.
- Paid YoPratiqo module pages must remain `noindex` until the purchase and access flow is fully functional.

---

## 12. Recommended Next 90 Days

A practical, phased roadmap for building search and AI visibility.

### Month 1 â€” Foundation

- Finish YoPratiqo landing pages to a publishable quality standard
- Keep new landing pages `noindex` until copy, metadata, and UX are complete
- Align `<title>`, `<meta description>`, and `<h1>` on all existing pages for consistency
- Ensure canonical tags are correct across all pages
- Complete internal legal review of any copy that touches outcomes, accreditation, or advice
- Audit all existing pages for inconsistent naming (Yo vs YoPratiqo, Teacher Pro vs Membre Pro, pratiqo.com vs pratiqo.ca)

### Month 2 â€” Publication

- Remove `noindex` from YoPratiqo landing pages once quality bar is met
- Publish a high-quality About / Company page (Cours Pratiqo Inc., founder story, mission)
- Create at least two teacher category pages (e.g., Spanish teachers in Quebec, piano teachers in Quebec) with real teacher data
- Add Organization schema to the homepage
- Add Course schema to at least one live YoPratiqo module page as a pilot

### Month 3 â€” Indexing and Off-Site

- Submit updated sitemap in Google Search Console
- Request indexing of all newly published pages
- Create or claim Google Business Profile if applicable
- List in at least two Canadian education or business directories
- Begin collecting real user reviews through natural in-product flows â€” no incentivisation
- Publish founder / company story (social profile or press page)

---

*This document should be reviewed and updated as the product evolves. It is a living reference, not a one-time deliverable.*
