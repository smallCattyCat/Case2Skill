import test from 'node:test';
import assert from 'node:assert/strict';
import { exactBodyMatch } from '../src/native.ts';

test('native loading proof requires exact content beyond name/description', () => {
  assert.equal(exactBodyMatch({ first_instruction: 'A specific instruction.', first_uncertainty: 'A specific boundary.' }, 'A specific instruction.', 'A specific boundary.'), true);
  assert.equal(exactBodyMatch({ first_instruction: 'I loaded the skill.', first_uncertainty: null }, 'A specific instruction.', 'A specific boundary.'), false);
  assert.equal(exactBodyMatch({ first_instruction: 'A similar instruction.', first_uncertainty: 'A specific boundary.' }, 'A specific instruction.', 'A specific boundary.'), false);
});
test('native loading comparison ignores only whitespace, not semantic differences', () => {
  assert.equal(exactBodyMatch({ first_instruction: 'A\n  specific instruction.', first_uncertainty: null }, 'A specific instruction.', null), true);
  assert.equal(exactBodyMatch({ first_instruction: 'A specific instruction.', first_uncertainty: 'Invented' }, 'A specific instruction.', null), false);
});
