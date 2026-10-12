import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, realpathSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';

export function canonical(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    const result = JSON.stringify(value);
    if (result === undefined) throw new Error('Cannot hash undefined');
    return result;
  }
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  const object = value as Record<string, unknown>;
  return '{' + Object.keys(object).sort().map(k => JSON.stringify(k) + ':' + canonical(object[k])).join(',') + '}';
}
export const sha256 = (value: string | Buffer): string => createHash('sha256').update(value).digest('hex');
export const digest = (value: unknown): string => sha256(canonical(value));
export function jsonWrite(file: string, value: unknown): void {
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
}
export function textWrite(file: string, value: string): void {
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, value, { flag: 'wx' });
}
export function readJSON(file: string): unknown { return JSON.parse(readFileSync(file, 'utf8')); }
export function object(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(label + ': expected object');
  return value as Record<string, unknown>;
}
export function exactKeys(value: Record<string, unknown>, keys: string[], label: string): void {
  if (Object.keys(value).some(k => !keys.includes(k)) || keys.some(k => !(k in value))) throw new Error(label + ': unexpected or missing fields');
}
export function boundedText(value: unknown, label: string, max = 1600): string {
  if (typeof value !== 'string' || !value.trim() || value.length > max || /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/u.test(value)) throw new Error(label + ': invalid text');
  return value.trim();
}
export function relativeName(name: string): string {
  if (!name || /[\\:*?"<>|\x00-\x1f\x7f]/u.test(name) || path.posix.isAbsolute(name) || name.split('/').some(p => !p || p === '.' || p === '..' || /[ .]$/u.test(p) || /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/iu.test(p))) throw new Error('Unsafe relative path');
  return name;
}
export function readTextBounded(file: string, max = 1048576): string {
  const stat = statSync(file);
  if (!stat.isFile() || stat.size > max) throw new Error('Input file exceeds the regular-file size limit');
  return new TextDecoder('utf-8', { fatal: true }).decode(readFileSync(file));
}
export function insideFile(root: string, name: string): string {
  relativeName(name);
  const realRoot = realpathSync(root), resolved = realpathSync(path.join(realRoot, name));
  const rel = path.relative(realRoot, resolved);
  if (rel.startsWith('..' + path.sep) || rel === '..' || path.isAbsolute(rel)) throw new Error('Path escapes source directory');
  return resolved;
}
export function newRun(root: string, prefix: string): string {
  mkdirSync(root, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  let name = path.join(root, prefix + '-' + stamp), n = 1;
  while (existsSync(name)) name = path.join(root, prefix + '-' + stamp + '-' + n++);
  mkdirSync(name);
  return name;
}
