# NEUROSUMMON — D&D one-shot draw terminal

A front-end-only Vue 3 app for running a cyberpunk D&D one-shot: draft classes, run gacha-style
summons, and keep a ledger of who pulled what. No server, no database, no accounts — the whole
session lives in the browser and travels as a single JSON file.

**Live site:** https://c2so.github.io/dnd-gacha-management/

## What it does

- **Draft** — each runner draws a D&D class. A class is never handed out twice.
- **Summon** — pick a runner, a banner, and 1–5 draws. A d100 decides the rarity per draw.
  Anything pulled leaves the pool **for the whole table**, so no character is ever summoned twice.
  If a rarity runs out, the draw steps to the nearest tier that still has stock and says so.
- **Codex** — every character on file, filterable, showing whether they are still summonable and
  who claimed them if not.
- **Ledger** — the full draw history, chronologically or grouped per runner.
- **Session** — export/import the save file, re-import `characters.csv`, edit banner names and
  odds, reset.

There is no pity system, no reroll card, and no auto-rolled HP — HP comes from the CSV.


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
| `Game` | Source franchise. |
| `Type` | DPS / Support / Tank — free text, used for filtering. |
| `Banner` | Which banner the character can be summoned from. |
| `Rarity` | `3`, `4` or `5`. |
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

*Export session JSON* writes one file containing the catalog, runners, banners, settings and the
complete ledger, so importing it elsewhere restores the session exactly. The app also autosaves
to `localStorage` after every change; the chip in the header shows the last write. In a browser
where storage is blocked the chip warns that only exports will persist.

```jsonc
{
  "format": "dnd-gacha-session",
  "version": 1,
  "savedAt": "2026-07-25T21:00:00.000Z",
  "settings": {
    "classes": ["Barbarian", "..."],
    "banners": [{ "id": 1, "name": "Cold Boot — Street Grid", "t3": 57, "t4": 87 }]
  },
  "catalog": [{ "id": 1, "name": "Rawiyah", "bannerId": 1, "rarity": 3, "...": "..." }],
  "players": [{ "id": "runner-…", "name": "Runner 1", "className": "Rogue" }],
  "draws": [
    {
      "seq": 1,
      "unitId": 4,
      "playerId": "runner-…",
      "bannerId": 1,
      "roll": 92,      // the d100
      "tier": 5,       // rarity awarded
      "shiftedFrom": null, // set when the rolled tier was empty
      "at": "2026-07-25T21:00:00.000Z"
    }
  ]
}
```

Banner thresholds are read as: `d100 ≤ t3` → 3★, `≤ t4` → 4★, above → 5★.

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
