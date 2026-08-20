// One-time (re-run-when-needed) generator for the Subject attribute
// picker's option thumbnails - see PUNCHLIST.md Phase 9. Crops a hand-
// curated rectangle out of each full `public/subjects/*.png` source and
// writes a small banner-shaped thumbnail to `public/subjects/thumbnails/`.
//
// Deliberately NOT computed at request time and NOT a runtime dictionary:
// the app just references `/subjects/thumbnails/${subject}.png`, same
// naming convention as the full-size source images. All the curation
// (and the reasoning behind each rectangle) lives here, once.
//
// Run: node scripts/generate-subject-thumbnails.mjs
// Re-run whenever a new Subject enum value's source art is added, or an
// existing crop needs adjusting - add/edit its entry in CROPS below.

import sharp from "sharp";
import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SUBJECTS_DIR = path.join(__dirname, "../public/subjects");
const OUT_DIR = path.join(SUBJECTS_DIR, "thumbnails");

// Every source is 1024x1024. Each entry is a crop rectangle in that
// coordinate space, hand-picked by eye per subject (not derived from a
// shared rule - the source art isn't composed to one, see the writeup
// this script's commit references). All rectangles are deliberately the
// same size (460x168, ~2.74:1) so every option reads at the same zoom
// level in the list - only the position moves, not the amount of zoom.
const CROP_SIZE = { width: 460, height: 168 };

const CROPS = {
  "helping-friendly-book": { left: 282, top: 216 }, // title text, centered
  "lizard": { left: 450, top: 216 }, // eye + snout
  "famous-mockingbird": { left: 140, top: 216 }, // head, some wing either side
  "llama": { left: 560, top: 190 }, // face + donut-patterned scarf
  "sloth": { left: 470, top: 346 }, // face - the one that needed a real script,
  // not CSS object-position, to reach at all (see PUNCHLIST.md Phase 9)
  "multibeast": { left: 520, top: 66 }, // all three heads
  "harpua": { left: 180, top: 256 }, // face + donut-patterned bandana
  "poster-nutbag": { left: 250, top: 236 }, // face + donut-patterned bandana
};

const run = async () => {
  if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

  for (const [subject, { left, top }] of Object.entries(CROPS)) {
    const src = path.join(SUBJECTS_DIR, `${subject}.png`);
    const out = path.join(OUT_DIR, `${subject}.png`);
    await sharp(src)
      .extract({ left, top, width: CROP_SIZE.width, height: CROP_SIZE.height })
      .png({ compressionLevel: 9 })
      .toFile(out);
    console.log(`wrote ${path.relative(process.cwd(), out)}`);
  }
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
