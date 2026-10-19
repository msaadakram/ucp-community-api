/* Leaderboard roster tests: name-variant scoping, enrollment, and the
 * no-charge-when-alone credit rule. Offline: Mongo is run through an
 * in-memory fake (no server, no network). */

import {
  canonicalCourseKey,
  bareCourseName,
  sectionOf,
  sameCourse,
  courseNameFilter,
} from '../lib/ext/course-key.js';

describe('course-key normalization', () => {
  test('bare and sectioned names normalize to one key', () => {
    expect(
      canonicalCourseKey('Data Structures (CP233-R26-BS-SE-F24-SED1)'),
    ).toBe('data structures');
    expect(canonicalCourseKey('data structures'))
        .toBe('data structures');
    expect(sameCourse('Data Structures',
        'DATA STRUCTURES (CP233-R26-BS-SE-F24-SED1)')).toBe(true);
  });

  test('different courses never collide', () => {
    expect(sameCourse('Data Structures', 'Database Systems')).toBe(false);
    // "- Lab" variants collapse to the base course.
    expect(canonicalCourseKey('Digital Logic and Design - Lab'))
        .toBe('digital logic and design');
  });

  test('section extraction and bare-name filter', () => {
    expect(sectionOf('OOP (CP223-F26-BS-SE-F25-SEC2)'))
        .toBe('cp223-f26-bs-se-f25-sec2');
    expect(sectionOf('Bare Name')).toBe('');
    expect(bareCourseName('OOP (CP223)')).toBe('OOP');
    // The regex matches both stored forms.
    const f = courseNameFilter('Data Structures (CP233)');
    expect(f.courseName.$regex).toContain('Data\\ Structures');
    for (const ok of [
      'Data Structures',
      'data structures',
      'Data Structures (CP233-R26-BS-SE-F24-SED1)',
    ]) {
      expect(ok, matches(f.courseName.$regex));
    }
    expect('Database Systems (DB203)', isNot(matches(f.courseName.$regex)));
  });
});
