import sharp from "sharp";
import { readdirSync, existsSync, statSync, writeFileSync, renameSync, unlinkSync } from "fs";
import { join, extname, dirname } from "path";
import { tmpdir } from "os";
import { randomBytes } from "crypto";

const EXERCISES_DIR = "public/exercises";

const exDirs = readdirSync(EXERCISES_DIR, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name);

console.log(`Found ${exDirs.length} exercise directories`);

let totalBefore = 0;
let totalAfter = 0;
let processed = 0;
let skipped = 0;
let errors = 0;

for (const dir of exDirs) {
  const dirPath = join(EXERCISES_DIR, dir);
  let files;
  try {
    files = readdirSync(dirPath).filter((f) => extname(f).toLowerCase() === ".jpg");
  } catch {
    continue;
  }

  for (const file of files) {
    const filePath = join(dirPath, file);
    try {
      const stat = statSync(filePath);
      const beforeSize = stat.size;
      totalBefore += beforeSize;

      const img = sharp(filePath);
      const metadata = await img.metadata();

      const longEdge = Math.max(metadata.width || 0, metadata.height || 0);

      let pipeline = img;
      if (longEdge > 1024) {
        if ((metadata.width || 0) >= (metadata.height || 0)) {
          pipeline = pipeline.resize(1024, undefined, { fit: "inside", withoutEnlargement: true });
        } else {
          pipeline = pipeline.resize(undefined, 1024, { fit: "inside", withoutEnlargement: true });
        }
      }

      pipeline = pipeline.jpeg({
        quality: 81,
        chromaSubsampling: "4:4:4",
        mozjpeg: true,
      }).withMetadata();

      const buffer = await pipeline.toBuffer();
      const afterSize = buffer.length;

      if (afterSize < beforeSize) {
        // Write to temp file first, then rename (avoids Windows locking issues)
        const tmpFile = join(tmpdir(), "fit-compress-" + randomBytes(4).toString("hex") + ".jpg");
        writeFileSync(tmpFile, buffer);
        renameSync(tmpFile, filePath);
        totalAfter += afterSize;
        processed++;
      } else {
        totalAfter += beforeSize;
        skipped++;
      }
    } catch (err) {
      errors++;
      totalAfter += statSync(filePath).size;
    }
  }
}

const saved = totalBefore - totalAfter;
const pct = totalBefore > 0 ? ((saved / totalBefore) * 100).toFixed(1) : "0";
console.log(`\nDone: ${processed} compressed, ${skipped} skipped, ${errors} errors`);
console.log(`Before: ${(totalBefore / 1024 / 1024).toFixed(1)} MB`);
console.log(`After:  ${(totalAfter / 1024 / 1024).toFixed(1)} MB`);
console.log(`Saved:  ${(saved / 1024 / 1024).toFixed(1)} MB (${pct}%)`);
