import { existsSync, mkdirSync, readFileSync, renameSync, rmSync } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import type { CasePack } from './case.ts';
import { assertCaseSnapshot } from './case.ts';
import { notes, parseLesson, renderSkill, validateReferences } from './lesson.ts';
import type { Lesson } from './lesson.ts';
import { digest, exactKeys, insideFile, jsonWrite, object, readTextBounded, sha256, textWrite } from './util.ts';
import { validateSkillMarkdown } from './skill-format.ts';

export type Origin = 'codex_generated' | 'user_supplied_candidate' | 'handwritten_test_fixture';
const CORE_FILES = ['lesson.json', 'SKILL.md', 'references/evidence.md'];

export function compileCandidate(raw: unknown, pack: CasePack, out: string, origin: Origin) {
  assertCaseSnapshot(pack);
  const lesson = parseLesson(raw); validateReferences(lesson, pack);
  validateSkillMarkdown(renderSkill(lesson));
  if (existsSync(out)) throw new Error('Candidate output already exists');
  const evidence = ['# Evidence ledger', '', 'These excerpts locate evidence; they do not certify that each inference is justified.', '', `Source case: ${pack.id}`, `Source digest: ${pack.sourceDigest}`, ''];
  notes(lesson).forEach((note, i) => {
    evidence.push(`## Statement ${i + 1} (${note.basis})`, '', note.text, '');
    for (const ref of note.evidence) {
      const s = pack.sources.find(s => s.path === ref.file)!;
      evidence.push(`Source: ${ref.file}:${ref.start_line}-${ref.end_line}; file SHA-256 ${s.sha256}`, '', ...s.lines.slice(ref.start_line - 1, ref.end_line).map(line => '    ' + line), '');
    }
  });
  const texts: Record<string, string> = { 'lesson.json': JSON.stringify(lesson, null, 2) + '\n', 'SKILL.md': renderSkill(lesson), 'references/evidence.md': evidence.join('\n') };
  const lessonHash = digest(lesson), contentHash = digest({ lesson_hash: lessonHash, source_digest: pack.sourceDigest });
  const manifest = { schema_version: 'case2skill.bundle.v0', content_hash: contentHash, lesson_hash: lessonHash, source_digest: pack.sourceDigest, origin, status: 'candidate', semantic_review: 'not_performed', transfer_validation: 'not_run', files: Object.fromEntries(CORE_FILES.map(f => [f, sha256(texts[f])])) };
  const tmp = out + '.tmp-' + randomUUID(); mkdirSync(tmp, { recursive: true });
  try {
    for (const file of CORE_FILES) textWrite(path.join(tmp, file), texts[file]);
    jsonWrite(path.join(tmp, 'manifest.json'), manifest); renameSync(tmp, out);
  } catch (e) { rmSync(tmp, { recursive: true, force: true }); throw e; }
  return { directory: path.resolve(out), manifest, lesson };
}

export function inspectBundle(directory: string) {
  const manifest = object(JSON.parse(readTextBounded(insideFile(directory, 'manifest.json'), 16384)), 'manifest');
  exactKeys(manifest, ['schema_version', 'content_hash', 'lesson_hash', 'source_digest', 'origin', 'status', 'semantic_review', 'transfer_validation', 'files'], 'manifest');
  if (manifest.schema_version !== 'case2skill.bundle.v0' || manifest.status !== 'candidate' || manifest.semantic_review !== 'not_performed' || manifest.transfer_validation !== 'not_run') throw new Error('Invalid or unearned bundle status');
  if (!['codex_generated', 'user_supplied_candidate', 'handwritten_test_fixture'].includes(manifest.origin as string)) throw new Error('Unknown candidate origin');
  const files = object(manifest.files, 'manifest files'); exactKeys(files, CORE_FILES, 'manifest files');
  for (const field of ['content_hash', 'lesson_hash', 'source_digest']) if (typeof manifest[field] !== 'string' || !/^[a-f0-9]{64}$/u.test(manifest[field] as string)) throw new Error('Invalid bundle digest');
  for (const file of CORE_FILES) if (sha256(readTextBounded(insideFile(directory, file))) !== files[file]) throw new Error('Bundle changed since compilation: ' + file);
  const lesson = parseLesson(JSON.parse(readFileSync(insideFile(directory, 'lesson.json'), 'utf8')));
  if (digest(lesson) !== manifest.lesson_hash || digest({ lesson_hash: manifest.lesson_hash, source_digest: manifest.source_digest }) !== manifest.content_hash) throw new Error('Candidate content hash mismatch');
  if (renderSkill(lesson) !== readFileSync(insideFile(directory, 'SKILL.md'), 'utf8')) throw new Error('SKILL.md diverges from lesson');
  return { manifest, lesson, skill: renderSkill(lesson) };
}

export function exportCandidate(directory: string, destination: string) {
  const bundle = inspectBundle(directory);
  if (existsSync(destination)) throw new Error('Export destination already exists');
  const tmp = destination + '.tmp-' + randomUUID();
  try {
    mkdirSync(tmp, { recursive: true });
    for (const file of [...CORE_FILES, 'manifest.json']) textWrite(path.join(tmp, file), readFileSync(insideFile(directory, file), 'utf8'));
    inspectBundle(tmp);
    textWrite(path.join(tmp, 'REVIEW_BEFORE_INSTALL.md'), '# Candidate export\n\nReview the instructions and source excerpts before installing this skill. No owner approval or general performance claim is implied. No executable scripts are included.\n');
    if (existsSync(destination)) throw new Error('Export destination already exists');
    renameSync(tmp, destination);
  } catch (error) { rmSync(tmp, { recursive: true, force: true }); throw error; }
  return { destination: path.resolve(destination), content_hash: bundle.manifest.content_hash, status: 'candidate_exported_not_installed' };
}

/** Development-only fixture to test compiler mechanics; never presented as model learning. */
export function mechanicalLesson(pack: CasePack): Lesson {
  return parseLesson({ schema_version: 'case2skill.lesson.v0', name: 'mechanical-test-only', description: 'Handwritten fixture for compiler tests, not learned experience.', goal: 'Verify that a source-linked candidate can be packaged without a model.', source_case_id: pack.id,
    conditions: { requires: [], excludes: [], unknowns: [] }, steps: [{ text: 'Inspect the supplied service contract before considering the recorded operation.', basis: 'documented', evidence: [{ file: 'service-contract.md', start_line: 2, end_line: 3 }] }], status: 'candidate' });
}
