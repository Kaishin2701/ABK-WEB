# CREATE-DESCRIPTION

A small, static description builder for KFK 2026/27 football-kit listings. It
turns verified product facts into consistent, customer-facing HTML and a
readable audit result.

It is a drafting and checking tool. It does not publish to WooCommerce, verify
supplier claims, or replace human approval.

## Start here

There is nothing to install. Open [`index.html`](./index.html) in a browser.

1. Stay in **Product** mode for individual products.
2. Enter only confirmed facts: product identity, contents, socks status, sizes,
   main colours and the correct print configuration.
3. Fixed KFK facts are pre-applied: Fan version, Polyester and a £3.99
   league-specific sleeve-badge price when a badge option is available.
4. Select the sleeve-badge availability and enter the badge league when it is
   available.
5. For shirt-only products, the shorts-colour field is disabled and omitted
   from the description.
6. Add a verified design detail only when the image or approved record supports
   it. Leave it blank when unsure.
7. Select **Generate**.
8. Check the Preview, HTML and Audit tabs before copying the HTML into a
   human-review workflow.

In **Bundle** mode, enter a Bundle name and optional customer-facing label,
then configure and add each Piece independently. Every Piece keeps its own
recipient, product facts, colours, size range, personalisation and badge
settings. Add between two and four valid Pieces before generating the Bundle
HTML.
Men and Women can be selected directly as Piece recipients for couple bundles
or bundles containing multiple adult shirts.

Use the explicit **KFK Birthday Gift Pack: 2–4 Kids Kits** Bundle type only for
the Boss-approved gift-pack configuration. It requires two to four Kids kits
with distinct kit types for the same team and season. Each Piece may be With
Socks or No Socks; its generated contents, colours and order warning follow the
saved selection. The branch also requires confirmation
of the controlled personalised-returns, promotion and packaging statements;
these policies are never inherited by a Standard Piece Bundle.

Product and Bundle badge selectors share one maintained league list. This list
includes FIFA World Cup, FIFA Club World Cup, Saudi Pro League and MLS alongside
the supported European competitions. National-team titles may use a standalone
tournament year, for example `Spain World Cup Champions 2026` maps to season
`2026`; club-season titles continue to use the `YYYY/YY` format.

The **Load sample** button is for testing the builder only. Do not use sample
facts as evidence for a real product.

## What the builder checks

- full kit versus shirt-only contents;
- socks included, unavailable or not applicable;
- plain customisable versus fixed player-print listings;
- visible size range and Size Guide wording;
- required player name and number for fixed-print products;
- fixed KFK facts and approved material wording;
- main-colour and sleeve-badge details, including the league when available; and
- unsupported claims and unsafe HTML.

For KFK no-socks products, **What’s Included** lists only the shirt and
matching shorts. `Socks are not included` appears in the opening and **Before
You Order**, where customers are most likely to need the warning.

## Product copy approach

Product descriptions use one clear pattern for each meaningful configuration:

1. Plain full kit, socks included
2. Plain full kit, no socks
3. Player-print full kit, socks included
4. Player-print full kit, no socks
5. Plain shirt only
6. Player-print shirt only

The copy changes with real facts such as the product name, included pieces,
size range, main colours, badge availability, player print and optional verified
design detail. Approved wording pools may rotate only for controlled areas such as
material notes, sizing warnings and plain-product personalisation. Critical facts,
prices, limits and return warnings must keep their approved meaning.

Women’s and baby inputs are available in the form, but their broader KFK rollout
and product-fact validation are separate work. Do not treat an available input
as approval to publish a listing.

## Before approving a real description

Use this short check:

- The product name, team, season and product type match the listing.
- The included items and socks status match the final product configuration.
- The visible size range matches the selectable sizes and the Size Guide is
  present on the product page.
- A fixed player listing has the exact name and number, and offers no additional
  name-and-number personalisation.
- Optional visual wording is genuinely verified.
- The Audit tab has no blockers.

## Project structure

```text
index.html                         App layout and fact-input form
styles.css                         Interface styling
app.js                             Fact normalisation, branch selection, HTML rendering and audit
templates/product/                 Product copy patterns
templates/bundle/                  Existing bundle copy patterns
templates/template-registry.js     Makes both template families available to the app
```

See [`templates/README.md`](./templates/README.md) before changing template
copy or adding a branch.

## Scope and ownership

Keep detailed sizing tables, delivery, returns, care and general personalisation
policy in their approved site components. Product descriptions may include the
short, approved sizing and personalisation warnings used by this builder. The
KFK content knowledge base remains the source of truth for claim safety and
publishing approval.

Bundle descriptions are assembled from the verified Piece records using the
Boss-approved deterministic four-section structure: What's Included, Product
Details, Options You Can Add and Before You Order. Standard Bundles and the
Birthday Gift Pack branch now share this structure; Gift Pack returns,
promotion and packaging statements remain exclusive to the explicitly selected
and confirmed Birthday Gift Pack branch.
When a Bundle Piece uses the pre-applied-player configuration, its exact player
name and number are shown on that Piece under What's Included and Product
Details. It is never presented as an option the customer can add. Before You
Order makes clear that another name and number cannot be selected for that
Piece.
