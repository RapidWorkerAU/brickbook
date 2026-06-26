/**
 * Audit script: enumerate every getFaceDesignData combination and flag suspect text.
 *
 * Usage:
 *   node scripts/audit-sun-commentary.mjs
 *   node scripts/audit-sun-commentary.mjs --face west
 *   node scripts/audit-sun-commentary.mjs --season winter
 *   node scripts/audit-sun-commentary.mjs --flagged-only
 *
 * Output:
 *   A table of every face × illumination × season × zone-group combination.
 *   Lines with a possible season mismatch are prefixed with ⚠.
 */

import { getFaceDesignData } from "../src/lib/sun-planner/sunCommentary.js";

// ── Config ────────────────────────────────────────────────────────────────────
const FACES    = ["north", "east", "south", "west"];
const ILLUMS   = ["direct", "partial", "shaded"];
const SEASONS  = ["winter", "summer", "equinox"];

// One representative zone per branch group
const ZONE_GROUPS = [
  { label: "Z1 hot",       zone: 1 },
  { label: "Z3 hot-dry",   zone: 3 },
  { label: "Z5 warm-temp", zone: 5 },
  { label: "Z6 mild-temp", zone: 6 },
  { label: "Z7 cool",      zone: 7 },
  { label: "Z8 alpine",    zone: 8 },
];

// ── Flag heuristics ───────────────────────────────────────────────────────────
// Keywords that are suspicious in a given season.
const WINTER_SUSPECT = [
  /cool naturally/i,
  /hold.{0,20}coolness/i,
  /comfortable evening/i,
  /cooling energy/i,
  /afternoon heat peak/i,
  /heat load/i,
  /summer overheating/i,
  /block.{0,15}sun/i,
];
const SUMMER_SUSPECT = [
  /passive warm(?!th from me)/i,
  /capture.{0,30}warmth/i,
  /solar gain.*winter/i,
  /winter warmth/i,
  /winter afternoon/i,
  /heating gain/i,
  /passive heating/i,
];

function isSuspect(season, text) {
  if (!text) return false;
  const patterns = season === "winter" ? WINTER_SUSPECT
                 : season === "summer" ? SUMMER_SUSPECT
                 : [];
  return patterns.some((p) => p.test(text));
}

function checkEntry(season, data) {
  const fields = [data.statusLabel, data.rooms, data.glazingGuide, data.nccNote]
    .filter(Boolean).join(" ");
  return isSuspect(season, fields);
}

// ── CLI args ──────────────────────────────────────────────────────────────────
const args          = process.argv.slice(2);
const filterFace    = args.includes("--face")         ? args[args.indexOf("--face")    + 1] : null;
const filterSeason  = args.includes("--season")       ? args[args.indexOf("--season")  + 1] : null;
const flaggedOnly   = args.includes("--flagged-only");

// ── Run ───────────────────────────────────────────────────────────────────────
const faces   = filterFace   ? FACES.filter(f => f === filterFace)     : FACES;
const seasons = filterSeason ? SEASONS.filter(s => s === filterSeason) : SEASONS;

let totalChecked = 0;
let totalFlagged = 0;

for (const face of faces) {
  console.log(`\n${"═".repeat(80)}`);
  console.log(`  FACE: ${face.toUpperCase()}`);
  console.log("═".repeat(80));

  for (const illum of ILLUMS) {
    console.log(`\n  ── illum: ${illum} ─────────────────────────────────────`);

    for (const season of seasons) {
      for (const { label, zone } of ZONE_GROUPS) {
        const data    = getFaceDesignData(face, illum, zone, season);
        const flagged = checkEntry(season, data);

        totalChecked++;
        if (flagged) totalFlagged++;

        if (flaggedOnly && !flagged) continue;

        const prefix   = flagged ? "⚠ " : "  ";
        const roomsStr = (data.rooms ?? "(no rooms text)").slice(0, 90);
        const label_   = `${season.padEnd(7)} ${label.padEnd(12)}`;

        console.log(`${prefix}${label_}  [${data.statusLabel}]`);
        if (data.rooms) {
          console.log(`    rooms:    ${roomsStr}${data.rooms.length > 90 ? "…" : ""}`);
        }
        if (flagged) {
          // Show which field triggered the flag
          const fields = { statusLabel: data.statusLabel, rooms: data.rooms, glazingGuide: data.glazingGuide, nccNote: data.nccNote };
          for (const [field, text] of Object.entries(fields)) {
            if (text && isSuspect(season, text)) {
              console.log(`    *** FLAGGED in ${field}: ${text.slice(0, 120)}…`);
            }
          }
        }
      }
    }
  }
}

console.log(`\n${"═".repeat(80)}`);
console.log(`  SUMMARY: ${totalChecked} combinations checked, ${totalFlagged} flagged`);
if (totalFlagged === 0) {
  console.log("  All clear — no season-inconsistent patterns detected.");
} else {
  console.log(`  Review the ⚠ entries above. False positives are possible where`);
  console.log(`  the text legitimately contrasts seasons (e.g. "unlike summer...").`);
}
console.log("═".repeat(80));
