import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { digest, sha256 } from './util.ts';

export function sourceFingerprint() {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const files = ['package.json', 'package-lock.json', 'tsconfig.json'].filter(f => existsSync(path.join(root, f)));
  const walk = (relative: string) => {
    for (const e of readdirSync(path.join(root, relative), { withFileTypes: true })) {
      const child = path.posix.join(relative, e.name);
      if (e.isDirectory()) walk(child); else if (e.isFile() && e.name.endsWith('.ts')) files.push(child);
    }
  };
  for (const dir of ['src', 'tests', 'scripts']) if (existsSync(path.join(root, dir))) walk(dir);
  const hashes = Object.fromEntries(files.sort().map(f => [f, sha256(readFileSync(path.join(root, f)))]));
  return { digest: digest(hashes), files: hashes };
}
