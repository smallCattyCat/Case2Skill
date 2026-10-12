import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { jsonWrite, readTextBounded, sha256, textWrite } from './util.ts';
import { exportCandidate, inspectBundle } from './bundle.ts';

export type CodexOptions = { model?: string; timeoutMs?: number; executable?: string; nativeSkillDirectory?: string; onProgress?: (message: string) => void };
export function validateCodexOptions(options: CodexOptions): void {
  if (options.model !== undefined && !/^[A-Za-z0-9._:-]{1,100}$/u.test(options.model)) throw new Error('Invalid model identifier');
  const timeout = options.timeoutMs ?? 120000;
  if (!Number.isSafeInteger(timeout) || timeout < 1000 || timeout > 300000) throw new Error('Invalid model call timeout (1000..300000 ms)');
}

/** Only the model client's OS, authentication and networking necessities are inherited. */
export function modelEnvironment(environment: NodeJS.ProcessEnv = process.env): NodeJS.ProcessEnv {
  const allowed = new Set(['path', 'systemroot', 'windir', 'comspec', 'pathext', 'temp', 'tmp', 'home', 'userprofile', 'appdata', 'localappdata', 'codex_home', 'openai_api_key', 'https_proxy', 'http_proxy', 'all_proxy', 'no_proxy', 'lang', 'lc_all', 'ssl_cert_file', 'ssl_cert_dir']);
  return { ...Object.fromEntries(Object.entries(environment).filter(([key, value]) => allowed.has(key.toLowerCase()) && value !== undefined)), NO_COLOR: '1' };
}

export function resolveCodex(explicit?: string): { executable: string; prefix: string[] } {
  const requested = explicit || process.env.CASE2SKILL_CODEX;
  if (requested) {
    if (!path.isAbsolute(requested) || !existsSync(requested)) throw new Error('CASE2SKILL_CODEX must be an existing absolute .js or native executable path');
    if (/\.(cmd|bat)$/iu.test(requested)) throw new Error('Use the Codex .js entry or native executable, not a shell wrapper');
    return /\.m?js$/iu.test(requested) ? { executable: process.execPath, prefix: [requested] } : { executable: requested, prefix: [] };
  }
  if (process.platform === 'win32') {
    const candidates = [
      path.join(process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming'), 'npm', 'node_modules', '@openai', 'codex', 'bin', 'codex.js'),
      ...(process.env.PATH || '').split(path.delimiter).map(p => path.join(p, 'node_modules', '@openai', 'codex', 'bin', 'codex.js'))
    ];
    const entry = candidates.find(p => existsSync(p)); if (!entry) throw new Error('Codex native/Node entry not found; set CASE2SKILL_CODEX');
    return { executable: process.execPath, prefix: [entry] };
  }
  return { executable: 'codex', prefix: [] };
}

export function codexDoctor() {
  let command: ReturnType<typeof resolveCodex>;
  try { command = resolveCodex(); } catch {
    return { node: process.version, codex_version: null, adapter_supported: false, model_calls: 0, authentication_checked: false, global_config_modified: false, limitation: 'Codex not found. Offline replay, compile and tests remain available. Install a compatible Codex CLI or set CASE2SKILL_CODEX to its absolute native/Node entry.' };
  }
  const version = spawnSync(command.executable, [...command.prefix, '--version'], { encoding: 'utf8', timeout: 10000, windowsHide: true });
  const help = spawnSync(command.executable, [...command.prefix, 'exec', '--help'], { encoding: 'utf8', timeout: 10000, windowsHide: true });
  const required = ['--ignore-user-config', '--output-schema', '--ephemeral', '--sandbox'];
  return { node: process.version, codex_version: version.status === 0 ? version.stdout.trim() : null,
    adapter_supported: help.status === 0 && required.every(flag => help.stdout.includes(flag)),
    required_flags: required, model_calls: 0, authentication_checked: false, global_config_modified: false,
    limitation: 'CLI presence is not authentication or live model validation.' };
}

export function codexArguments(schemaFile: string, outputFile: string, model?: string): string[] {
  const args = ['exec', '--ignore-user-config', '--ephemeral', '--skip-git-repo-check', '--sandbox', 'read-only', '--json', '--color', 'never',
    '-c', 'features.shell_tool=false', '-c', 'features.unified_exec=false', '-c', 'features.apps=false', '-c', 'features.hooks=false',
    '-c', 'features.multi_agent=false', '-c', 'features.skill_mcp_dependency_install=false',
    '-c', 'web_search="disabled"', '-c', 'memories.use_memories=false', '-c', 'memories.generate_memories=false',
    '-c', 'project_doc_max_bytes=0', '-c', 'model_reasoning_effort="low"', '--output-schema', schemaFile, '-o', outputFile];
  if (model) {
    if (!/^[A-Za-z0-9._:-]{1,100}$/u.test(model)) throw new Error('Invalid model identifier');
    args.push('--model', model);
  }
  args.push('-'); return args;
}

/** One structured-output turn. No model-produced shell, network URL, or code is executed by this adapter. */
export async function callCodex(prompt: string, schema: unknown, directory: string, options: CodexOptions = {}) {
  validateCodexOptions(options);
  if (Buffer.byteLength(prompt) > 1048576) throw new Error('Model prompt exceeds 1 MiB');
  const command = resolveCodex(options.executable);
  if (existsSync(directory)) throw new Error('Model run directory already exists');
  mkdirSync(directory, { recursive: true });
  // Root marker plus a zero AGENTS byte limit prevent parent project/evaluator instructions from being injected.
  mkdirSync(path.join(directory, '.git'));
  let nativeSkill: { name: string; sha256: string; relative_path: string } | null = null;
  if (options.nativeSkillDirectory) {
    const bundle = inspectBundle(options.nativeSkillDirectory);
    const relative = '.agents/skills/' + bundle.lesson.name;
    exportCandidate(options.nativeSkillDirectory, path.join(directory, relative));
    nativeSkill = { name: bundle.lesson.name, sha256: sha256(bundle.skill), relative_path: relative + '/SKILL.md' };
    // Only the native mention enters user input. This adapter never concatenates skill contents.
    prompt = '$' + nativeSkill.name + '\n' + prompt;
  }
  const inputFile = path.resolve(directory, 'prompt.txt'), schemaFile = path.resolve(directory, 'output-schema.json'), outputFile = path.resolve(directory, 'response.json');
  textWrite(inputFile, prompt); jsonWrite(schemaFile, schema);
  const args = [...command.prefix, ...codexArguments(schemaFile, outputFile, options.model)];
  const started = Date.now(), timeoutMs = options.timeoutMs ?? 120000;
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1000 || timeoutMs > 300000) throw new Error('Invalid model call timeout');
  const metadata = { runner: 'codex_exec_structured_json', requested_model: options.model || null, effective_model: null, prompt_sha256: sha256(prompt), schema_sha256: sha256(JSON.stringify(schema)), arguments: args.slice(command.prefix.length), timeout_ms: timeoutMs, global_config_modified: false, native_skill_discovery_test: !!nativeSkill, native_skill: nativeSkill, skill_body_in_user_prompt: nativeSkill ? false : null };
  jsonWrite(path.join(directory, 'request.json'), metadata);
  options.onProgress?.('Model call started; bounded timeout ' + timeoutMs + ' ms');
  let stdout = '', stderr = '', termination: string | null = null;
  const result = await new Promise<{ code: number | null; error: string | null }>(resolve => {
    const child = spawn(command.executable, args, { cwd: path.resolve(directory), stdio: ['pipe', 'pipe', 'pipe'], shell: false, windowsHide: true, detached: process.platform !== 'win32', env: modelEnvironment() });
    let settled = false;
    const finish = (code: number | null, error: string | null) => { if (settled) return; settled = true; clearTimeout(timer); resolve({ code, error }); };
    const terminate = (why: string) => {
      if (termination) return; termination = why;
      if (process.platform === 'win32' && child.pid) spawnSync('taskkill', ['/pid', String(child.pid), '/t', '/f'], { windowsHide: true, timeout: 10000, stdio: 'ignore' });
      else if (child.pid) { try { process.kill(-child.pid, 'SIGKILL'); } catch { child.kill('SIGKILL'); } }
    };
    const timer = setTimeout(() => terminate('model_timeout'), timeoutMs);
    child.stdout.on('data', chunk => { stdout += chunk.toString(); if (Buffer.byteLength(stdout) > 1048576) terminate('stdout_limit'); });
    child.stderr.on('data', chunk => { stderr += chunk.toString(); if (Buffer.byteLength(stderr) > 262144) terminate('stderr_limit'); });
    child.on('error', err => finish(null, err.message));
    child.on('close', code => finish(code, null));
    child.stdin.on('error', () => {}); child.stdin.end(prompt, 'utf8');
  });
  textWrite(path.join(directory, 'events.jsonl'), stdout); textWrite(path.join(directory, 'stderr.txt'), stderr);
  const events: Record<string, any>[] = [];
  for (const line of stdout.split(/\r?\n/u)) { try { const event = JSON.parse(line); if (event && typeof event === 'object' && !Array.isArray(event)) events.push(event); } catch { /* Raw diagnostics remain in the run log. */ } }
  const forbidden = events.filter(e => e.item && ['command_execution', 'mcp_tool_call', 'web_search', 'file_change'].includes(e.item.type));
  const completed = events.findLast(e => e.type === 'turn.completed');
  let status = termination || result.error || (result.code !== 0 ? 'codex_exit_' + result.code : !completed ? 'missing_turn_completion' : forbidden.length ? 'unexpected_native_tool_activity' : !existsSync(outputFile) ? 'missing_response' : 'completed');
  let value: unknown = null, responseText: string | null = null;
  if (status === 'completed') { try { responseText = readTextBounded(outputFile); value = JSON.parse(responseText); } catch { status = 'invalid_or_oversized_json_response'; } }
  const receipt = { ...metadata, status, exit_code: result.code, elapsed_ms: Date.now() - started, usage: completed?.usage || null, native_tool_events: forbidden.length, model_call_attempts: 1,
    response_sha256: responseText !== null ? sha256(responseText) : null, events_sha256: sha256(stdout) };
  jsonWrite(path.join(directory, 'receipt.json'), receipt);
  options.onProgress?.('Model call finished: ' + status);
  if (status !== 'completed') throw new Error('Codex call failed: ' + status + '; see ' + path.join(directory, 'receipt.json'));
  return { value, receipt, directory: path.resolve(directory) };
}
