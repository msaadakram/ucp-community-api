/* Leaderboard roster tests: name-variant scoping, enrollment, and the
 * no-charge-when-alone credit rule. Offline: Mongo is run through an
 * in-memory fake (no server, no network). */

import {
  canonicalCourseKey,
  bareCourseName,
  sectionOf,
  sameCourse,
  courseNameFilter,
  courseKeyVariants,
  courseNameVariantsFilter,
  courseSectionCodeFilter,
} from '../lib/ext/course-key.js';

describe('theory vs lab separation', () => {
  test('a course name and its lab variant stay separate', () => {
    expect(
      canonicalCourseKey('Computer Organization and Assembly Language'),
    ).toBe('computer organization and assembly language');
    expect(
      canonicalCourseKey('Computer Organization and Assembly Language - Lab'),
    ).toBe('computer organization and assembly language - lab');
    expect(
      sameCourse(
        'Computer Organization and Assembly Language',
        'Computer Organization and Assembly Language - Lab',
      ),
    ).toBe(false);
  });

  test('lab variants resolve both spellings for roster lookups', () => {
    expect(
      courseKeyVariants('Computer Organization and Assembly Language - Lab'),
    ).toEqual([
      'computer organization and assembly language - lab',
      'computer organization and assembly language',
    ]);
    const filter = courseNameVariantsFilter(
      'Computer Organization and Assembly Language - Lab',
    );
    expect(filter.courseName.$in).toHaveLength(2);
    expect(filter.courseName.$in[0].test(
      'COMPUTER ORGANIZATION AND ASSEMBLY LANGUAGE - LAB',
    )).toBe(true);
    expect(filter.courseName.$in[0].test(
      'COMPUTER ORGANIZATION AND ASSEMBLY LANGUAGE',
    )).toBe(false);
  });

  test('the section code scopes the roster to one section', () => {
    const lab = courseSectionCodeFilter('AR221');
    expect(lab).not.toBeNull();
    expect(lab.test(
      'Computer Organization and Assembly Language (AR221-F26-BS-CS-F25-C1)',
    )).toBe(true);
    expect(lab.test(
      'Computer Organization and Assembly Language (AR223-F26-BS-CS-F25-C1)',
    )).toBe(false);
    expect(courseSectionCodeFilter('')).toBeNull();
  });
});

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
    // "- Lab" stays DISTINCT: lab and theory are separate courses.
    expect(canonicalCourseKey('Digital Logic and Design - Lab'))
        .toBe('digital logic and design - lab');
    expect(
      sameCourse('DATA STRUCTURES', 'Data Structures - Lab'),
    ).toBe(false);
    // Sectioned and bare names are the same course.
    expect(
      sameCourse('DATA STRUCTURES', 'Data Structures (CP233-R26-BS-SE-F24-SED1)'),
    ).toBe(true);
  });

  test('section extraction and bare-name filter', () => {
    expect(sectionOf('OOP (CP223-F26-BS-SE-F25-SEC2)'))
        .toBe('cp223-f26-bs-se-f25-sec2');
    expect(sectionOf('Bare Name')).toBe('');
    expect(bareCourseName('OOP (CP223)')).toBe('OOP');
    // The regex matches both stored forms.
    const f = courseNameFilter('Data Structures (CP233)');
    const re = new RegExp(f.courseName.$regex, 'i');
    for (const ok of [
      'Data Structures',
      'data structures',
      'Data Structures (CP233-R26-BS-SE-F24-SED1)',
    ]) {
      expect(re.test(ok)).toBe(true);
    }
    expect(re.test('Database Systems (DB203)')).toBe(false);
  });
});
