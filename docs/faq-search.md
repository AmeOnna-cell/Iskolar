# FAQ search and suggestions: how the scoring works

Iskolar suggests FAQ answers with fixed rules inside PostgreSQL. There is no AI and no outside service: the same text always gets the same results, and every step can be checked in SQL.

- **Where it runs:** the `search_faqs(p_query, p_limit default 3)` function, migration `supabase/migrations/20261110120000_faqs.sql`.
- **Where it's used:**
  - Help page, "Ask the scholarship office": as a student types (300ms after they stop, from 3 characters), up to 3 matches show above Send under "These answers might help".
  - Help page, the search box over "Common questions": the same function. When nothing matches, it offers the ask form.
- **Tests:** `supabase/tests/97_faqs.test.sql` (pgTAP) and `e2e/faqs.spec.ts`.

## 1. What gets searched

Each FAQ has a stored, automatically updated search column (`faqs.search`, a `tsvector`):

| Part | Weight | Why |
|---|---|---|
| Question and keywords | **A** (1.0) | The question is what a student is most likely to type. Keywords hold other words students use, including Filipino and Taglish ("paalala", "brgy", "pasado"). |
| Answer | **B** (0.4) | An answer that mentions the word counts, but less than the question. |

Every part is indexed twice:

- **`english`:** reduces words to their stem, so "reminders", "remind" and "reminding" all match each other.
- **`simple`:** keeps words exactly as typed (lowercased). Filipino words have no English stem, so this is how "paalala" or "kahirapan" still match.

There's a GIN index on the search column, and a GIN trigram index on the question for the typo check below.

## 2. Reading the student's text

`faq_query_words()` turns the text into its **meaningful words**:

1. Lowercase it, and split it on anything that isn't a letter or a digit.
2. Drop words shorter than 2 characters.
3. Drop English stopwords ("what", "is", "the", "can", "do", "I").
4. Drop common Filipino function words ("ang", "ng", "sa", "po", "ba", "paano", "saan", "pwede" and a few more; the full list is in the migration).
5. Keep at most 12 words from the first 200 characters.

For example, "Saan kukuha ng barangay certificate?" becomes `kukuha`, `barangay`, `certificate`.

If no meaningful words are left (for example "what is the"), there are no results.

## 3. The score

**Score = text match + typo match.**

### Text match (full-text rank)

- The meaningful words are joined with **OR**, in both their stemmed and as-typed forms. For example, "reminders paalala" becomes `'remind' | 'reminders' | 'paalala'`.
- Because it's OR:
  - **Word order doesn't matter.** "find gwa where" scores the same as "where find gwa".
  - **Missing words don't matter.** One matching word is enough to be considered.
- The rank is PostgreSQL's `ts_rank_cd` (cover density):
  - Each matched word counts by the weight of where it was found: 1.0 in the question or keywords, 0.4 in the answer.
  - Matched words close together count more.
  - The result is scaled to between 0 and 1 (normalization 32: rank / (rank + 1)).

### Typo match (pg_trgm)

- Each meaningful word of 4 or more letters is compared with every **whole word** of the question, using `strict_word_similarity`. This compares the sets of 3-letter pieces (trigrams) of the two words, and gives a number from 0 to 1.
- The best value counts if it is at least **0.5**. Below that it counts as 0.
- Examples:

  | Typed | Question word | Similarity |
  |---|---|---|
  | indigensy | Indigency | 0.54 |
  | remnders | reminders | 0.58 |
  | scholarshp | scholarship | 0.64 |
  | school | scholarship | 0.27, so not counted |

- We use `strict_word_similarity` and not plain `word_similarity` because the plain version also matches parts of words. It gave "school" 0.57 against "scholarship", so "school uniform" would have suggested the FAQ about receiving two scholarships.
- A word spelled correctly that is in the question also scores 1.0 here. This lifts question matches above answer-only matches.

### Minimum score

- **Only FAQs scoring 0.5 or more are shown.**
- A single word found only in an answer scores about 0.44, so it stays out. Examples are "school" in "school uniform" and "apply" in "how do I apply".
- Two answer words together, or any question or keyword word, or a typo of a question word, reach 0.5.

Results are sorted by score (highest first), then by the oldest FAQ. Each one returns its id, slug (for the `/help#faq-…` link), question, a short snippet and the score:

- **Snippet:** the answer with link markup removed, cut at a word boundary under 140 characters, with "…" added.
- **Full answer:** also returned, so a suggestion can open in place.

## 4. Examples (from the local seed)

| Student types | Top result | Score | Why |
|---|---|---|---|
| where do I find my GWA | What is GWA… | 1.83 | "gwa" and "find" are in the question (rank 0.83, plus 1.0 for the exact question word) |
| gwa find where | What is GWA… | same | Word order doesn't matter |
| saan kukuha ng indigency | Certificate of Indigency | 1.75 | Filipino function words are ignored; "indigency" is in the question |
| paalala sa deadline | How do reminders work? | 0.80 | "paalala" and "deadline" are keywords |
| indigensy certificate | Certificate of Indigency | 1.67 | "certificate" matches exactly; "indigensy" is a typo match |
| remnders | How do reminders work? | 0.58 | Typo match only |
| school uniform | (nothing) | under 0.5 | "school" is only in one answer, and is too far from "scholarship" |
| banana smoothie recipe | (nothing) | 0 | No meaningful word matches |

## 5. Rules around the search

- **Approved only:** drafts and archived FAQs never appear. The function runs as its owner, so it checks `status = 'approved'` itself and doesn't rely on row-level security.
- **Rate limit:** 60 searches a minute.
  - Counted per signed-in user, or per IP address for visitors, using the same `check_rate_limit` counter as sign-in and questions.
  - Over the limit, the function raises `PT429` and the page shows "Too many searches. Wait a minute and try again."
  - Typing with the 300ms pause stays well under the limit.
- **Who can change FAQs** (RLS, tested in pgTAP):

  | | Read | Create | Edit | Approve or archive |
  |---|---|---|---|---|
  | Visitor, student | Approved only | No | No | No |
  | Coordinator | All | Drafts | Drafts | No |
  | Admin | All | Yes | All | Yes |

  - Nobody deletes FAQs; archive instead.
  - Every create, edit, approval and archive is in the audit log (`faq.create`, `faq.update`, `faq.approve`, `faq.archive`, `faq.return_to_draft`).

## 6. Tuning

The numbers are in one place, `search_faqs` in the migration:

| Setting | Value |
|---|---|
| Weights | A = 1.0, B = 0.4 |
| Typo threshold | 0.5 |
| Minimum score | 0.5 |
| Shortest word for the typo check | 4 letters |
| Default number of results | 3 (at most 10) |

- **To make an FAQ easier to find:** add keywords (the words students actually type, in any language). Don't lower the minimum score.
- **Known limits:**
  - Very common words in a scholarship site ("scholarship", "listing") match many FAQs. The minimum score and the ranking keep the best ones on top, but they all count.
  - A typo in a word that appears only in an answer or in keywords isn't caught: the typo check looks at the question.
