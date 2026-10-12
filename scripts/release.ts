import { copyFileSync, existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { digest, jsonWrite, relativeName, sha256 } from '../src/util.ts';

export const PROJECT_ROOT = fileURLToPath(new URL('../', import.meta.url));
const ROOT_FILES = ['README.md', 'README.zh-CN.md', 'LICENSE', 'NOTICE.md', 'SECURITY.md', 'CONTRIBUTING.md', 'CHANGELOG.md', 'AGENTS.md', 'package.json', 'package-lock.json', 'tsconfig.json', '.gitignore', '.gitattributes', '.editorconfig', '.node-version'];
const DOC_FILES = ['docs/CLI.md', 'docs/ARCHITECTURE.md', 'docs/EVIDENCE.md', 'docs/RELEASING.md', 'docs/preview.png', 'docs/gallery.html'];
const PUBLIC_DIRS = ['src', 'tests', 'scripts', 'examples', '.github'];
const forbiddenSegment = /^(?:\.git|\.env(?:\..*)?|\.codex|\.agents|node_modules|runs|exports|artifacts|releases|coverage)$/iu;

export function scanPublicText(text: string): string[] {
  const problems: string[] = [];
  if (/\b(?:sk-[A-Za-z0-9_-]{24,}|gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,}|AKIA[A-Z0-9]{16})\b/u.test(text) || /\bBearer\s+[A-Za-z0-9._~-]{24,}/u.test(text)) problems.push('credential-like value');
  if (/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----\s+[A-Za-z0-9+/=]{32,}/u.test(text)) problems.push('private key material');
  if (/[A-Za-z]:[\\/]+Users[\\/]+[A-Za-z0-9_-]+/iu.test(text) || /\/(?:Users|home)\/[A-Za-z0-9_-]+\//u.test(text)) problems.push('personal absolute path');
  return problems;
}

export function collectPublicFiles(root = PROJECT_ROOT): string[] {
  const files = [...ROOT_FILES, ...DOC_FILES];
  const walk = (relative: string) => {
    if (!existsSync(path.join(root, relative))) throw new Error('Missing public directory: ' + relative);
    for (const entry of readdirSync(path.join(root, relative), { withFileTypes: true })) {
      const rel = path.posix.join(relative, entry.name); relativeName(rel);
      if (forbiddenSegment.test(entry.name) || entry.isSymbolicLink()) throw new Error('Private or linked entry inside public tree: ' + rel);
      if (entry.isDirectory()) walk(rel);
      else if (entry.isFile() && /\.(?:ts|json|jsonl|md|yml|yaml)$/u.test(entry.name)) files.push(rel);
      else throw new Error('Unapproved file in public tree: ' + rel);
    }
  };
  for (const dir of PUBLIC_DIRS) walk(dir);
  if (files.length > 2000) throw new Error('Public file count exceeds release bound');
  return [...new Set(files)].sort();
}

export function auditPublicFiles(root = PROJECT_ROOT) {
  const files = collectPublicFiles(root), hashes: Record<string, string> = {};
  const errors: string[] = []; let bytes = 0;
  for (const relative of files) {
    const absolute = path.join(root, relative);
    if (!existsSync(absolute)) { errors.push('Missing required file: ' + relative); continue; }
    const stat = lstatSync(absolute);
    if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 2097152) { errors.push('Invalid public file: ' + relative); continue; }
    const content = readFileSync(absolute); bytes += content.length; hashes[relative] = sha256(content);
    if (relative.endsWith('.png')) {
      if (content.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') errors.push('Invalid PNG: ' + relative);
      continue;
    }
    let text: string;
    try { text = new TextDecoder('utf-8', { fatal: true }).decode(content); } catch { errors.push('Invalid UTF-8: ' + relative); continue; }
    for (const issue of scanPublicText(text)) errors.push(relative + ': ' + issue);
    if (relative.endsWith('.md')) {
      for (const match of text.matchAll(/\[[^\]]*\]\(([^\s)]+)\)/gu)) {
        const target = match[1].split('#')[0];
        if (!target || /^[a-z][a-z0-9+.-]*:/iu.test(target)) continue;
        const resolved = path.resolve(path.dirname(absolute), decodeURIComponent(target));
        const within = path.relative(root, resolved);
        if (within.startsWith('..') || path.isAbsolute(within) || !existsSync(resolved) || !files.includes(within.split(path.sep).join('/'))) errors.push(relative + ': unresolved public link ' + target);
      }
    }
  }
  if (bytes > 26214400) errors.push('Release exceeds 25 MiB bound');
  const pkg = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));
  const lock = JSON.parse(readFileSync(path.join(root, 'package-lock.json'), 'utf8'));
  if (pkg.version !== lock.version || pkg.version !== lock.packages[''].version || pkg.license !== 'MIT' || lock.packages[''].license !== 'MIT') errors.push('Package/lock version or license mismatch');
  return { schema_version: 'case2skill.release-check.v1', version: pkg.version as string, status: errors.length ? 'failed' : 'passed', files, file_count: files.length, bytes, hashes, content_digest: digest(hashes), errors };
}

export function stageRelease(destination: string, root = PROJECT_ROOT) {
  const out = path.resolve(destination);
  if (existsSync(out)) throw new Error('Release destination already exists');
  const audit = auditPublicFiles(root);
  if (audit.status !== 'passed') throw new Error('Release checks failed: ' + audit.errors.join('; '));
  const temp = out + '.tmp-' + randomUUID();
  try {
    mkdirSync(temp, { recursive: true });
    for (const file of audit.files) {
      const target = path.join(temp, file); mkdirSync(path.dirname(target), { recursive: true });
      copyFileSync(path.join(root, file), target);
      if (sha256(readFileSync(target)) !== audit.hashes[file]) throw new Error('Source changed during staging: ' + file);
    }
    const copied = auditPublicFiles(temp);
    if (copied.status !== 'passed' || copied.content_digest !== audit.content_digest) throw new Error('Staged content differs from checked source');
    jsonWrite(path.join(temp, 'RELEASE-MANIFEST.json'), { schema_version: 'case2skill.source-release.v1', version: audit.version, content_digest: audit.content_digest, files: audit.hashes, file_count: audit.file_count, check_status: 'passed', checks: ['allowlisted_files', 'bounded_regular_files', 'credential_and_personal_path_patterns', 'local_markdown_links', 'package_lock_metadata', 'copied_content_hashes'], model_calls: 0 });
    if (existsSync(out)) throw new Error('Release destination already exists');
    renameSync(temp, out);
  } catch (error) { rmSync(temp, { recursive: true, force: true }); throw error; }
  return { directory: out, version: audit.version, file_count: audit.file_count + 1, content_digest: audit.content_digest, status: 'source_staged_not_published' };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const args = process.argv.slice(2);
    if (args.length === 1 && args[0] === '--check') {
      const result = auditPublicFiles(); console.log(JSON.stringify({ status: result.status, version: result.version, file_count: result.file_count, bytes: result.bytes, content_digest: result.content_digest, errors: result.errors }, null, 2)); if (result.status !== 'passed') process.exitCode = 1;
    } else {
      if (args.length && (args.length !== 2 || args[0] !== '--out' || !args[1])) throw new Error('Usage: node scripts/release.ts [--check | --out NEW_DIRECTORY]');
      const version = JSON.parse(readFileSync(path.join(PROJECT_ROOT, 'package.json'), 'utf8')).version;
      console.log(JSON.stringify(stageRelease(args[1] || path.join(PROJECT_ROOT, 'releases', 'case2skill-' + version)), null, 2));
    }
  } catch (error) { console.error('Case2Skill release: ' + (error as Error).message); process.exitCode = 1; }
}
