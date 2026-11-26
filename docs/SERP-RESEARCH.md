# SERP research — what to actually do

Condensed from the Nov 2026 toilet-search research. The caveats, the unverified
cells and the Brave-vs-Google argument are removed. What is left is what changes
a page.

**Source note:** the SERP order observed was Brave India (Mumbai-localised), not
Google. Treat the *patterns* as the finding, not the exact positions.

---

## 1. The 15 queries Indians actually type

Harvested verbatim from "People also ask" and related-query boxes.

```
toilet near me
public toilet near me
free public toilet near me
private toilet near me
pay and use toilet near me
washroom near me for ladies
Are public toilets in Delhi free?
How many public toilets are mapped in Delhi?
Are there free public toilets in Mumbai?
How many public toilets are there in Mumbai?
sbm toilet new delhi
sbm toilet mumbai maharashtra
sulabh toilet price
sulabh shauchalaya
Is toilet paper available in Indian train toilets?
```

**The shape of the demand:** free vs paid · ladies-only · SBM-branded ·
Sulabh pricing · city counts · train toilets.

We own every one of those facts in the facility data. We put none of them where
a crawler can read them.

---

## 2. The six gaps that decide the click

Ranking pages have these. A map-only page does not.

| # | Gap | What to add |
|---|---|---|
| 1 | Fee stated per facility | free / ₹5 / pay-and-use |
| 2 | Open-now logic from real hours | "closed · opens 7am" |
| 3 | Ladies-only and women-friendly flag | filter + label |
| 4 | Landmark + pincode per facility | street-level address text |
| 5 | "Last verified" date | trust + freshness |
| 6 | 4–6 FAQ answers on the page | the PAA box |

Also worth copying: wheelchair and baby-changing flags as visible text, walking
time rather than straight-line distance, and an honest "not recorded" label
instead of a blank.

---

## 3. The one title pattern that beat everything

Only one page in the whole set carried a number plus an intent promise:

`Public Toilets in Mumbai, India | 275 Toilets | Toilet Map`

Everything else was a bare brand or a newspaper headline. **This is an open gap,
not a crowded one.**

### Title formula

```
<Power word> <Public|Free> <category> Near Me — <number> <unit>, <filter 1> & <filter 2>
```

Worked example:

```
Clean Public Toilet Near Me — 7,714 Washrooms, Free & 24-Hour
```

Rules:
- Keep it under 62 characters so nothing truncates.
- Always keep the exact query phrase, in the order people type it.
- One number, one power word, at most two filters.
- Never drop a phrase that is already ranking. Add, do not swap.

### Meta description formula

```
<Power word> <category> near you — <number> mapped across <n> cities.
<number> free, <number> open 24 hours. <action>. No signup.
```

---

## 4. Power words that fit this niche

Not hype. These are the ones a person in a hurry reacts to.

| Word | Why it works here |
|---|---|
| Clean | the single biggest worry about a public toilet |
| Free | the second biggest |
| Public | matches the literal query |
| Open now | the moment of need |
| Nearest | promises the shortest path |
| Verified | answers "is this real" |
| No signup | removes the last objection |
| Safe | matters most at night, and for women |

Avoid: "best", "ultimate", "amazing" — nobody searching for a toilet wants a
superlative, they want one nearby.

---

## 5. Why the map pack matters more than the title

Where a local pack sits above organic, the pack takes roughly 44% of clicks
against about 29% for everything below it. At position 8 under a pack, a title
rewrite moves CTR from 0.2% to maybe 1.2%. It cannot reach 3–8%.

Two ways out, and both are content work:

1. **Win the PAA box.** Answer "Are public toilets in Delhi free?" in one
   sentence on a Delhi page. That is a click above the organic list.
2. **Target queries with no pack.** "Are public toilets in India free",
   "Sulabh toilet price", "Is toilet paper available in Indian train toilets"
   — informational, no map, and we own the answers.

---

## 6. What this means for the build

| Do | Do not |
|---|---|
| Add the six gaps as visible text | Add another map |
| One city page per city, answering the local question | Spin one template across 500 URLs |
| Answer-block + FAQ on every page | Long intro paragraphs |
| Keep the ranking phrase in the title | Swap it for a nicer-sounding one |
