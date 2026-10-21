/* Identity layer tests — the mixed ecosystem (app-only, extension-only,
 * both) must land on the SAME student, the SAME class and the SAME marks.
 *
 * No network, no database: these are the pure normalization rules every
 * write and read goes through.
 */

import {
  normalizeStudentId,
  normalizeSectionCode,
  sectionCourseCode,
  isFullSectionCode,
  sectionOfName,
  groupKeyFor,
  gradeSectionKey,
  gradeCourseCodeKey,
} from '../lib/ext/identity.js';

describe('student identity', () => {
  test('the same person is one student whatever the casing', () => {
    expect(normalizeStudentId('l1f25bscs0577')).toBe('L1F25BSCS0577');
    expect(normalizeStudentId('  L1F25BSCS0577 ')).toBe('L1F25BSCS0577');
    expect(normalizeStudentId('L1F25 BSCS 0577')).toBe('L1F25 BSCS 0577');
    expect(normalizeStudentId('')).toBe('');
    expect(normalizeStudentId(null)).toBe('');
  });
});

describe('section identity', () => {
  test('the section code survives every client', () => {
    expect(normalizeSectionCode(' ar221-r26-bs-cs-s25-c2 ')).toBe(
      'AR221-R26-BS-CS-S25-C2',
    );
    expect(sectionCourseCode('AR221-R26-BS-CS-S25-C2')).toBe('AR221');
    expect(isFullSectionCode('AR221-R26-BS-CS-S25-C2')).toBe(true);
    expect(isFullSectionCode('AR221')).toBe(false);
    expect(gradeSectionKey('AR221-R26-BS-CS-S25-C2')).toBe(
      'AR221-R26-BS-CS-S25-C2',
    );
    expect(gradeCourseCodeKey('AR221-R26-BS-CS-S25-C2')).toBe('AR221');
  });

  test('the section is read out of the course name', () => {
    expect(sectionOfName('Data Structures (CP233-R26-BS-SE-F24-SED1)')).toBe(
      'CP233-R26-BS-SE-F24-SED1',
    );
    expect(sectionOfName('Data Structures')).toBe('');
  });
});

describe('roster group identity', () => {
  test('the app and the extension land in ONE group for one class', () => {
    // The app restores the portal's truncated name ("Computer
    // Organization and Assembly ..") to the full course name; the
    // extension keeps the truncated text. Both are the SAME class.
    const appName = 'Computer Organization and Assembly Language (AR221-F26-BS-CS-F25-C1)';
    const extName = 'Computer Organization and Assembly .. (AR221-F26-BS-CS-F25-C1)';
    const appKey = groupKeyFor(appName, 'Monday', '08:00 - 08:55');
    const extKey = groupKeyFor(extName, 'Monday', '08:00 - 08:55');
    expect(appKey).toBe(extKey);
    expect(appKey).toBe('AR221-F26-BS-CS-F25-C1|monday|08:00-08:55');
  });

  test('theory and lab stay separate groups', () => {
    const theory = groupKeyFor(
      'Computer Organization and Assembly Language (AR223-F26-BS-CS-F25-C1)',
      'Tuesday',
      '10:00 - 10:55',
    );
    const lab = groupKeyFor(
      'Computer Organization and Assembly .. (AR221-F26-BS-CS-F25-C1)',
      'Monday',
      '08:00 - 08:55',
    );
    expect(theory).not.toBe(lab);
  });

  test('the same course in a different section is a different group', () => {
    const a = groupKeyFor(
      'Data Structures (CP233-R26-BS-SE-F24-SED1)',
      'Monday',
      '08:00 - 08:55',
    );
    const b = groupKeyFor(
      'Data Structures (CP233-R26-BS-CS-F24-D1)',
      'Monday',
      '08:00 - 08:55',
    );
    expect(a).not.toBe(b);
  });

  test('time formatting differences do not split a group', () => {
    const a = groupKeyFor('Data Structures (CP233)', 'Monday', '08:00 - 08:55');
    const b = groupKeyFor('Data Structures (CP233)', 'monday', '08:00-08:55');
    expect(a).toBe(b);
  });

  test('a course without a section still groups by name', () => {
    expect(groupKeyFor('Data Structures', 'Monday', '08:00 - 08:55')).toBe(
      'data structures|monday|08:00-08:55',
    );
  });
});
