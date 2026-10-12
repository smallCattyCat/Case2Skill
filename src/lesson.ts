import type { CasePack } from './case.ts';
import { boundedText, exactKeys, object, relativeName } from './util.ts';

export type Ref = { file: string; start_line: number; end_line: number };
export type Note = { text: string; basis: 'observed' | 'documented' | 'inferred'; evidence: Ref[] };
export type Lesson = { schema_version: 'case2skill.lesson.v0'; name: string; description: string; goal: string; source_case_id: string; conditions: { requires: Note[]; excludes: Note[]; unknowns: Note[] }; steps: Note[]; status: 'candidate' };

const refSchema = { type: 'object', additionalProperties: false, properties: { file: { type: 'string' }, start_line: { type: 'integer' }, end_line: { type: 'integer' } }, required: ['file', 'start_line', 'end_line'] };
const noteSchema = { type: 'object', additionalProperties: false, properties: { text: { type: 'string', maxLength: 1200 }, basis: { type: 'string', enum: ['observed', 'documented', 'inferred'] }, evidence: { type: 'array', items: refSchema, minItems: 1, maxItems: 8 } }, required: ['text', 'basis', 'evidence'] };
export const LESSON_SCHEMA = { type: 'object', additionalProperties: false, properties: {
  schema_version: { type: 'string', enum: ['case2skill.lesson.v0'] }, name: { type: 'string', pattern: '^[a-z0-9]+(?:-[a-z0-9]+)*$', maxLength: 64 }, description: { type: 'string', maxLength: 1024 }, goal: { type: 'string', maxLength: 500 }, source_case_id: { type: 'string', maxLength: 100 },
  conditions: { type: 'object', additionalProperties: false, properties: { requires: { type: 'array', items: noteSchema }, excludes: { type: 'array', items: noteSchema }, unknowns: { type: 'array', items: noteSchema } }, required: ['requires', 'excludes', 'unknowns'] },
  steps: { type: 'array', items: noteSchema }, status: { type: 'string', enum: ['candidate'] }
}, required: ['schema_version', 'name', 'description', 'goal', 'source_case_id', 'conditions', 'steps', 'status'] };

function parseNotes(raw: unknown, label: string): Note[] {
  if (!Array.isArray(raw) || raw.length > 16) throw new Error(label + ': expected at most 16 notes');
  return raw.map((value): Note => {
    const n = object(value, label); exactKeys(n, ['text', 'basis', 'evidence'], label);
    if (!['observed', 'documented', 'inferred'].includes(n.basis as string)) throw new Error('Invalid evidence basis');
    if (!Array.isArray(n.evidence) || !n.evidence.length || n.evidence.length > 8) throw new Error('Each note needs 1..8 references');
    const evidence = n.evidence.map((entry): Ref => {
      const e = object(entry, 'reference'); exactKeys(e, ['file', 'start_line', 'end_line'], 'reference');
      const file = relativeName(boundedText(e.file, 'file', 160));
      if (!Number.isSafeInteger(e.start_line) || !Number.isSafeInteger(e.end_line) || (e.start_line as number) < 1 || (e.end_line as number) < (e.start_line as number) || (e.end_line as number) - (e.start_line as number) > 80) throw new Error('Invalid source range');
      return { file, start_line: e.start_line as number, end_line: e.end_line as number };
    });
    return { text: boundedText(n.text, 'note', 1200), basis: n.basis as Note['basis'], evidence };
  });
}
export function parseLesson(raw: unknown): Lesson {
  const l = object(raw, 'lesson'); exactKeys(l, ['schema_version', 'name', 'description', 'goal', 'source_case_id', 'conditions', 'steps', 'status'], 'lesson');
  if (l.schema_version !== 'case2skill.lesson.v0' || l.status !== 'candidate') throw new Error('Unsupported lesson or fabricated status');
  const name = boundedText(l.name, 'name', 64);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(name)) throw new Error('Invalid skill name');
  relativeName(name);
  const c = object(l.conditions, 'conditions'); exactKeys(c, ['requires', 'excludes', 'unknowns'], 'conditions');
  const steps = parseNotes(l.steps, 'steps'); if (!steps.length) throw new Error('At least one step is required');
  return { schema_version: 'case2skill.lesson.v0', name, description: boundedText(l.description, 'description', 1024), goal: boundedText(l.goal, 'goal', 500), source_case_id: boundedText(l.source_case_id, 'source_case_id', 100),
    conditions: { requires: parseNotes(c.requires, 'requires'), excludes: parseNotes(c.excludes, 'excludes'), unknowns: parseNotes(c.unknowns, 'unknowns') }, steps, status: 'candidate' };
}
export function notes(lesson: Lesson): Note[] { return [...lesson.conditions.requires, ...lesson.conditions.excludes, ...lesson.conditions.unknowns, ...lesson.steps]; }
export function validateReferences(lesson: Lesson, pack: CasePack): void {
  if (lesson.source_case_id !== pack.id) throw new Error('Source case mismatch');
  for (const note of notes(lesson)) {
    for (const ref of note.evidence) {
      const source = pack.sources.find(s => s.path === ref.file);
      if (!source || ref.end_line > source.lines.length) throw new Error('Unresolvable evidence range: ' + ref.file);
    }
    if (note.basis === 'observed' && !note.evidence.some(r => pack.sources.find(s => s.path === r.file)?.kind === 'runtime_log')) throw new Error('Observed note must reference a runtime log');
    if (note.basis === 'documented' && !note.evidence.some(r => ['contract', 'narrative'].includes(pack.sources.find(s => s.path === r.file)?.kind || ''))) throw new Error('Documented note must reference an explicit text source');
  }
}
export function renderSkill(lesson: Lesson): string {
  const lines = ['---', 'name: ' + lesson.name, 'description: ' + JSON.stringify(lesson.description), '---', '', '# ' + lesson.name, '', lesson.goal, '', '> Candidate extracted from a case. References are inspectable; semantic correctness and transfer are not implied by formatting checks.', ''];
  for (const [key, title] of [['requires', 'When to use'], ['excludes', 'When not to apply directly'], ['unknowns', 'Resolve these uncertainties']] as const) {
    lines.push('## ' + title, '');
    const values = lesson.conditions[key];
    lines.push(...(values.length ? values.map(n => '- ' + n.text + (n.basis === 'inferred' ? ' [inference — review]' : '')) : ['No additional condition established by this source case.']), '');
  }
  lines.push('## Procedure', '', ...lesson.steps.map((n, i) => `${i + 1}. ${n.text}${n.basis === 'inferred' ? ' [inference — review]' : ''}`), '', '## Evidence', '', 'See references/evidence.md for exact source ranges and evidence classifications.', '');
  return lines.join('\n');
}
