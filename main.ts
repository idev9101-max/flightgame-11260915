// Skyline Rush submission entrypoint (Node 22, standard library only).
// The hand-in is two folders beside this file: game/ is the offline 3D flight game
// (index.html, ES modules, styles and vendored renderer), and screenshots/ holds the
// four final JPEGs. shots.json is only a capture record; the images are the submission.
// This script publishes those folders to MAKEFUN_OUTPUT_DIR or /output and then asks
// the unchanged vendored scorer to write the deterministic dossier.json. No build,
// no packages, no network.
//
// Play locally with `node serve.ts` and open http://localhost:8080.
// Outside the grader, stage an entry with `mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts`.

import { Buffer } from 'node:buffer';
import {
  copyFileSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { dirname, isAbsolute, join, parse, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

// Exact reference/gate.json limits. game_max_files is 993, not the output's 1000:
// game/ shares that cap with screenshots/, its images and dossier.json.
const TEXT_MAX_BYTES = 163_840;
const SCREENSHOT_MIN_COUNT = 3;
const SCREENSHOT_MAX_COUNT = 4;
const SCREENSHOT_MAX_BYTES = 262_144;
const GAME_MAX_FILES = 993;
const GAME_MAX_BYTES = 50_331_648;
const GAME_PATH_MAX_BYTES = 1_000;
const INDEX_HTML_MAX_BYTES = 1_048_576;
const MIN_IMAGE_SIDE = 360;
const MAX_IMAGE_SIDE = 1_280;

const SCORER_CAPS = {
  text_max_bytes: TEXT_MAX_BYTES,
  screenshots: { max: SCREENSHOT_MAX_COUNT, max_bytes: SCREENSHOT_MAX_BYTES },
  game_max_files: GAME_MAX_FILES,
  game_max_bytes: GAME_MAX_BYTES,
  game_path_max_bytes: GAME_PATH_MAX_BYTES,
} as const;

interface CopiedFile {
  rel: string;
  abs: string;
  bytes: number;
}

interface Tree {
  files: CopiedFile[];
  directories: string[];
  count: number;
  totalBytes: number;
}

interface Dimensions {
  width: number;
  height: number;
}

/** Code-unit order avoids locale-dependent publication order. */
function byCodeUnit(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

function fail(message: string): never {
  throw new Error(message);
}

/** Whether `child` is `parent` itself or lies beneath it. */
function isWithin(parent: string, child: string): boolean {
  const rel = relative(parent, child);
  return rel === '' || (rel !== '..' && !rel.startsWith(`..${sep}`) && !isAbsolute(rel));
}

function requireDirectory(path: string, label: string): void {
  let stat;
  try {
    stat = lstatSync(path);
  } catch {
    fail(`${label} is missing: ${label} must be a real directory beside main.ts`);
  }
  if (stat.isSymbolicLink() || !stat.isDirectory()) fail(`${label} is not a plain directory`);
}

/**
 * Lists one source folder in sorted order, refusing links, special files and paths past
 * the gate. Counting directories as entries matches how the platform sizes an output.
 */
function inventory(root: string, label: string, maxFiles: number, maxBytes: number): Tree {
  const files: CopiedFile[] = [];
  const directories: string[] = [];
  const stack: string[] = [''];
  let count = 0;
  let totalBytes = 0;

  while (stack.length > 0) {
    const rel = stack.pop()!;
    const abs = rel === '' ? root : join(root, rel);
    let entries;
    try {
      entries = readdirSync(abs, { withFileTypes: true });
    } catch (err) {
      fail(`${label}/${rel === '' ? '' : `${rel}/`} cannot be read: ${(err as Error).message}`);
    }
    entries.sort((a, b) => byCodeUnit(a.name, b.name));

    for (const entry of entries) {
      const childRel = rel === '' ? entry.name : `${rel}/${entry.name}`;
      const pathBytes = Buffer.byteLength(childRel, 'utf8');
      if (pathBytes > GAME_PATH_MAX_BYTES) {
        fail(`${label}/${childRel} has a ${pathBytes}-byte path, over ${GAME_PATH_MAX_BYTES}`);
      }
      const childAbs = join(root, childRel);
      if (entry.isSymbolicLink() || (!entry.isFile() && !entry.isDirectory())) {
        fail(`${label}/${childRel} is a symbolic link or special file; plain files only`);
      }

      let bytes = 0;
      if (entry.isFile()) {
        try {
          bytes = lstatSync(childAbs).size;
        } catch (err) {
          fail(`${label}/${childRel} cannot be inspected: ${(err as Error).message}`);
        }
      }
      count += 1;
      if (count > maxFiles) fail(`${label} holds more than ${maxFiles} files and directories`);
      totalBytes += bytes;
      if (totalBytes > maxBytes) fail(`${label} holds more than ${maxBytes} bytes of files`);

      if (entry.isDirectory()) {
        directories.push(childRel);
        stack.push(childRel);
      } else {
        files.push({ rel: childRel, abs: childAbs, bytes });
      }
    }
  }

  files.sort((a, b) => byCodeUnit(a.rel, b.rel));
  directories.sort(byCodeUnit);
  return { files, directories, count, totalBytes };
}

function pngDimensions(bytes: Buffer): Dimensions | null {
  if (bytes.length < 24 || bytes.subarray(1, 4).toString('ascii') !== 'PNG') return null;
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

function jpegDimensions(bytes: Buffer): Dimensions | null {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes[2] !== 0xff) return null;
  let at = 2;
  while (at + 9 <= bytes.length) {
    if (bytes[at] !== 0xff) {
      at += 1;
      continue;
    }
    let marker = bytes[at + 1]!;
    while (marker === 0xff) {
      at += 1;
      marker = bytes[at + 1]!;
    }
    if (marker === 0xd8 || marker === 0xd9 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      at += 2;
      continue;
    }
    const length = bytes.readUInt16BE(at + 2);
    if (length < 2 || at + 2 + length > bytes.length) return null;
    const isStartOfFrame = [0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker);
    if (isStartOfFrame) return { width: bytes.readUInt16BE(at + 7), height: bytes.readUInt16BE(at + 5) };
    at += 2 + length;
  }
  return null;
}

/** Reads the final JPEG/PNG files, checking names, bytes and frame dimensions before publication. */
function screenshotsOf(dir: string): CopiedFile[] {
  let names;
  try {
    names = readdirSync(dir, { withFileTypes: true });
  } catch (err) {
    fail(`screenshots/ cannot be read: ${(err as Error).message}`);
  }
  names.sort((a, b) => byCodeUnit(a.name, b.name));

  const shots: CopiedFile[] = [];
  for (const entry of names) {
    const name = entry.name;
    const abs = join(dir, name);
    if (entry.isSymbolicLink() || (!entry.isFile() && !entry.isDirectory())) {
      fail(`screenshots/${name} is a symbolic link or special file`);
    }
    if (entry.isDirectory()) fail(`screenshots/${name} is a directory, not an image`);
    if (!/^[A-Za-z0-9_][A-Za-z0-9._-]{0,127}$/.test(name)) fail(`screenshots/${name} is not a dossier-safe image name`);

    const ext = /\.([A-Za-z0-9]+)$/.exec(name)?.[1]?.toLowerCase() ?? '';
    if (ext !== 'jpg' && ext !== 'jpeg' && ext !== 'png') fail(`screenshots/${name} must be JPEG or PNG`);

    let bytes = 0;
    try {
      bytes = lstatSync(abs).size;
    } catch (err) {
      fail(`screenshots/${name} cannot be inspected: ${(err as Error).message}`);
    }
    if (bytes === 0) fail(`screenshots/${name} is empty`);
    if (bytes > SCREENSHOT_MAX_BYTES) fail(`screenshots/${name} is ${bytes} bytes, over ${SCREENSHOT_MAX_BYTES}`);

    const contents = readFileSync(abs);
    const size = ext === 'png' ? pngDimensions(contents) : jpegDimensions(contents);
    if (size === null) fail(`screenshots/${name} is not a readable ${ext.toUpperCase()} image`);
    const shortSide = Math.min(size.width, size.height);
    const longSide = Math.max(size.width, size.height);
    if (shortSide < MIN_IMAGE_SIDE || longSide > MAX_IMAGE_SIDE) {
      fail(`screenshots/${name} is ${size.width}x${size.height}; the short side must be at least ${MIN_IMAGE_SIDE} and the long side at most ${MAX_IMAGE_SIDE}`);
    }
    shots.push({ rel: name, abs, bytes });
  }

  if (shots.length === 0) fail('screenshots/ holds no PNG or JPEG images');
  if (shots.length < SCREENSHOT_MIN_COUNT || shots.length > SCREENSHOT_MAX_COUNT) {
    fail(`screenshots/ holds ${shots.length} images; Skyline Rush submits ${SCREENSHOT_MIN_COUNT} to ${SCREENSHOT_MAX_COUNT}`);
  }
  return shots;
}

function publishTree(dest: string, tree: Tree): void {
  mkdirSync(dest, { recursive: true });
  for (const dir of tree.directories) mkdirSync(join(dest, dir), { recursive: true });
  for (const file of tree.files) copyFileSync(file.abs, join(dest, file.rel));
}

function publishScreenshots(dest: string, shots: CopiedFile[]): void {
  mkdirSync(dest, { recursive: true });
  for (const shot of shots) copyFileSync(shot.abs, join(dest, shot.rel));
}

function outputDir(): string {
  const requested = process.env.MAKEFUN_OUTPUT_DIR;
  if (requested !== undefined && requested.trim() === '') fail('MAKEFUN_OUTPUT_DIR is set but empty');
  if (requested !== undefined && requested.includes('\0')) fail('MAKEFUN_OUTPUT_DIR contains a NUL byte');
  const out = resolve(requested ?? '/output');
  if (parse(out).root === out || dirname(out) === out) fail(`refusing to publish to filesystem root ${out}`);

  const sourceRoot = resolve(fileURLToPath(new URL('.', import.meta.url)));
  if (isWithin(out, sourceRoot)) fail(`output ${out} would overwrite this repository`);
  for (const protectedDir of ['game', 'screenshots', 'vendor'].map((name) => join(sourceRoot, name))) {
    if (isWithin(protectedDir, out)) fail(`output ${out} would overwrite source ${protectedDir}`);
  }

  let existing;
  try {
    existing = lstatSync(out);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') fail(`output ${out} cannot be inspected: ${(err as Error).message}`);
  }
  if (existing !== undefined && (existing.isSymbolicLink() || !existing.isDirectory())) {
    fail(`output ${out} is not a plain directory`);
  }
  return out;
}

function main(): void {
  const major = Number(process.versions.node.split('.')[0]);
  if (major !== 22) fail(`Skyline Rush needs Node 22; found ${process.versions.node}`);

  const sourceRoot = resolve(fileURLToPath(new URL('.', import.meta.url)));
  const gameDir = join(sourceRoot, 'game');
  const shotsDir = join(sourceRoot, 'screenshots');
  const out = outputDir();

  requireDirectory(gameDir, 'game/');
  requireDirectory(shotsDir, 'screenshots/');
  const game = inventory(gameDir, 'game', GAME_MAX_FILES, GAME_MAX_BYTES);
  const shots = screenshotsOf(shotsDir);

  if (game.directories.includes('index.html')) fail('game/index.html is a directory, not the flight game page');
  const index = game.files.find((file) => file.rel === 'index.html');
  if (index === undefined) fail('game/index.html is missing: a Skyline Rush entry needs its playable page at game/index.html');
  if (index.bytes > INDEX_HTML_MAX_BYTES) fail(`game/index.html is ${index.bytes} bytes, over ${INDEX_HTML_MAX_BYTES}`);

  mkdirSync(out, { recursive: true });
  for (const name of ['game', 'screenshots', 'dossier.json']) {
    rmSync(join(out, name), { recursive: true, force: true });
  }
  publishTree(join(out, 'game'), game);
  publishScreenshots(join(out, 'screenshots'), shots);

  if (game.count + shots.length + 2 > 1_000) {
    fail(`output would hold ${game.count + shots.length + 2} entries, over the platform's 1000`);
  }
  const dossier = buildDossier(out, SCORER_CAPS);
  writeFileSync(join(out, 'dossier.json'), dossier);
  process.stdout.write(`Skyline Rush: published game/, ${shots.length} screenshots and dossier.json to ${out}\n`);
}

try {
  main();
} catch (err) {
  const limit = (err as { limit?: unknown }).limit;
  const detail = typeof limit === 'string' ? `${(err as Error).message} (cap: ${limit})` : (err as Error).message;
  process.stderr.write(`Skyline Rush entrypoint: ${detail ?? String(err)}\n`);
  process.exitCode = 1;
}
