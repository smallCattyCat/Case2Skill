import { relativeName } from './util.ts';
/** Supported output subset, not a validator for every legal Agent Skills/YAML file. */
export function validateSkillMarkdown(text: string): { name: string; description: string } {
  if (!text.trim() || text.length > 8000) throw new Error('SKILL.md must contain 1..8000 characters');
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  if (lines[0] !== '---') throw new Error('SKILL.md needs YAML frontmatter');
  const end = lines.indexOf('---', 1);
  if (end < 0 || end > 20) throw new Error('Missing frontmatter terminator');
  const fields: Record<string, string> = {};
  for (const line of lines.slice(1, end)) {
    const match = /^(name|description): (.+)$/u.exec(line);
    if (!match || fields[match[1]] !== undefined) throw new Error('Use unindented single-line name and description fields exactly once');
    let value = match[2];
    if (value.startsWith('"')) {
      try { value = JSON.parse(value) as string; } catch { throw new Error('Invalid quoted frontmatter field'); }
    } else if (value.startsWith("'") || /[:#]\s|^[>|!&*[{]/u.test(value)) {
      throw new Error('Use a JSON-quoted string for complex frontmatter text');
    }
    if (typeof value !== 'string' || !value.trim() || /[\r\n\x00]/u.test(value)) throw new Error('Invalid frontmatter text');
    fields[match[1]] = value;
  }
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(fields.name || '') || fields.name.length > 64) throw new Error('Invalid skill name');
  relativeName(fields.name);
  if (!fields.description || fields.description.length > 1024) throw new Error('Invalid skill description');
  if (!lines.slice(end + 1).join('\n').trim()) throw new Error('Skill body is empty');
  return { name: fields.name, description: fields.description };
}
