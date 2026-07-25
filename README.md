# EVEN ODDS — Thunderdome draw terminal

A front-end-only Vue 3 app for running a cyberpunk D&D one-shot at the Thunderdome. Contenders
draft classes, corporate sponsors supply the summons, and the ledger records who drew what. No
server, no database, no accounts — the whole session lives in the browser and travels as a
single JSON file.

**This season's rule is Even Odds:** a draw is one die with a single face per asset still in the
slot. Every asset is exactly as likely as any other, and rarity is descriptive only. There is
nothing to weight and nothing to configure.

**Live site:** https://c2so.github.io/dnd-gacha-management/

## What it does

- **Draft** — each contender draws a D&D class. A class is never handed out twice, and nobody
  gets to pick.
- **Summon** — pick a contender, a broadcast slot, and 1–5 draws. Each draw rolls a die with one
  face per remaining asset, so a 5★ is no rarer to draw than a 3★. Anything drawn leaves the slot
  **for the whole arena**, so no asset is ever sponsored twice.
- **Codex** — every asset on file, filterable by sponsor, slot, rarity, role and status, showing
  what is still up for draw and who holds the rest.
- **Ledger** — the full draw history, chronologically or grouped per contender.
- **Session** — export/import the save file, re-import `characters.csv`, rename slots, reset.

There is no pity system, no reroll card, no rarity weighting, and no auto-rolled HP — HP comes
from the CSV.

### A note on rarity

Rarity never changes a draw's probability. It does still shape what you see overall, because the
slots hold different mixes: slot 1 is 17/9/4 across 3★/4★/5★ while slot 3 is 12/10/8. Drawing
from slot 3 yields more 5★s simply because more of them are in the bowl — not because the die is
tilted. The summon console shows both the flat per-asset odds and the current mix.


## Character data

`data/characters.csv` is the source of truth. `npm run catalog` (which also runs automatically
before every build) converts it into `src/data/catalog.generated.json`, which the app bundles.

**Two ways to update characters:**

1. **Permanent** — edit `data/characters.csv`, commit, push. The deploy workflow rebuilds the
   catalog and the live site picks up the change. If the CSV has an error the build fails with a
   row-numbered message instead of shipping a broken catalog.
2. **Mid-session** — Session tab → *Import characters CSV*. Applies immediately in that browser,
   no push required. This does not change the repo, so make the same edit in the CSV when you
   want it to stick.

Either way, **existing draws are never cleared**. Characters are matched on the `ID` column:

| Situation | What happens |
| --- | --- |
| ID in both the old and new data | Stats are updated in place; whoever pulled them keeps them |
| ID only in the new CSV | Added to the pool as summonable |
| ID gone, nobody had pulled them | Removed |
| ID gone, but someone already pulled them | Kept and marked **retired** — out of the pool, still in the codex and ledger |

Because identity is the `ID` column, you can rename a character freely without breaking history.
Changing an `ID`, on the other hand, makes it a different character.

### CSV columns

`ID`, `Name`, `Game`, `Type` (role), `Banner`, and `Rarity` are required. Everything else is
optional and renders only when present.

| Column | Notes |
| --- | --- |
| `ID` | Positive whole number, unique. The stable identity. |
| `Name` | Display name. |
| `Game` | Source franchise — shown in-app as the character's corporate sponsor. |
| `Type` | DPS / Support / Tank — free text, used for filtering. |
| `Banner` | Which broadcast slot the asset can be drawn from. |
| `Rarity` | `3`, `4` or `5`. Shown on the card; has no effect on draw probability. |
| `HP`, `HPFormula` | Fixed HP value plus the formula shown beneath it (e.g. `6d8+8`). |
| `AC`, `AttackBonus`, `Speed` | Shown in the stat strip. |
| `AttackKind`, `AttackAbility`, `AttackRange`, `AttackTargets` | Joined into the profile line. |
| `Damage`, `DamageType`, `BonusDamage`, `BonusDamageType` | Damage line. |
| `Saves` | Free-text summary, e.g. `WIS +8 / CHA +7`. |
| `SaveSTR` … `SaveCHA` | Per-ability modifiers for the save row. |
| `SaveProficient` | Proficient abilities, separated by `;`, `/`, `,` or `and`. |
| `Attack`, `BaselineName`, `BaselineText`, `Healing`, `Special`, `CapstoneType`, `CapstoneText` | Ability blocks. Empty ones are hidden. |
| `ImageURL` | Portrait. If the image fails to load, a monogram is shown instead. |

Unrecognised columns are ignored (with a note), so extra columns for your own notes are safe.

The importer detects the file's encoding: strict UTF-8 first, falling back to windows-1252, which
is what Excel usually writes. It also repairs the classic double-encoding artefact (`SÃ£o` →
`São`) and reports every cell it touched.

## The save file

*Export session JSON* writes one file containing the catalog, contenders, slots, settings and the
complete ledger, so importing it elsewhere restores the session exactly. The app also autosaves
to `localStorage` after every change; the chip in the header shows the last write. In a browser
where storage is blocked the chip warns that only exports will persist.

```jsonc
{
  "format": "dnd-gacha-session",
  "version": 2,
  "savedAt": "2026-07-25T21:00:00.000Z",
  "settings": {
    "classes": ["Barbarian", "..."],
    "banners": [{ "id": 1, "name": "Opening Slate" }]   // name only — nothing to weight
  },
  "catalog": [{ "id": 1, "name": "Rawiyah", "bannerId": 1, "rarity": 3, "...": "..." }],
  "players": [{ "id": "contender-…", "name": "Contender 1", "className": "Rogue" }],
  "draws": [
    {
      "seq": 1,
      "unitId": 4,
      "playerId": "contender-…",
      "bannerId": 1,
      "roll": 17,       // face rolled
      "poolSize": 30,   // faces on the die, i.e. assets available at the time
      "at": "2026-07-25T21:00:00.000Z"
    }
  ]
}
```

Rarity is not stored on a draw — it is read from the catalog, so re-grading a character in the
CSV updates past ledger entries too.

Save files written before the Even Odds rewrite (`version: 1`) still load: their banner
thresholds and per-draw rarity fields are dropped, and everything else is preserved.

## Running it locally

Requires **Node 22.18 or newer** — the catalog build step imports the app's TypeScript parser
directly and relies on Node's built-in type stripping.

```bash
npm install
npm run dev      # http://localhost:5173/dnd-gacha-management/
npm run build    # production build into dist/
npm run preview  # serve the production build
```

## Deploying

`.github/workflows/deploy.yml` builds and publishes to GitHub Pages on every push to the default
branch (or on demand from the Actions tab → *Deploy to GitHub Pages* → *Run workflow*).

**One-time setup:**

1. **The repository must be public**, unless the account has GitHub Pro/Team/Enterprise — Pages
   for private repositories is a paid feature. *Settings → General → Danger Zone → Change
   visibility.*
2. *Settings → Pages → Build and deployment → Source = **GitHub Actions***.
3. Push, or trigger the workflow manually. The first run takes about a minute.

The site is then served at `https://<user>.github.io/dnd-gacha-management/`.

If you fork this or rename the repo, update `base` in `vite.config.ts` to match the new repo name
or the assets will 404.

## Project layout

```
data/characters.csv          source of truth for characters
scripts/build-catalog.mjs    CSV -> src/data/catalog.generated.json, fails loudly on bad data
src/data/parseCatalog.ts     the parser, shared by the build script and the in-app CSV import
src/utils/drawEngine.ts      pure draw logic (d100, tiers, global no-duplicates)
src/composables/useSession.ts    reactive session state + localStorage autosave
src/composables/useSessionFile.ts JSON export/import, CSV import
src/components/              one component per tab, plus UnitCard
```
