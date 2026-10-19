/* Course-key normalization.
 *
 * The extension scrapes grades with the BARE course name
 * ("Data Structures") but builds class rosters (SubjectGroup) and
 * timetable rows from the SECTIONED name
 * ("Data Structures (CP233-R26-BS-SE-F24-SED1)"). Exact matching
 * between the two forms silently drops classmates from the
 * leaderboard, so every lookup normalizes through this module.
 *
 *   canonicalCourseKey("Data Structures (CP233-R26-BS-SE-F24-SED1)")
 *     === canonicalCourseKey("data structures") === "data structures"
 */

export function canonicalCourseKey(name) {
  if (typeof name !== 'string') return '';
  return name
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\(\s*[^)]*\)\s*$/, '') // drop trailing "(section)"
    .replace(/\s*[-–—]\s*(lab|lecture|tutorial)s?\s*$/i, '')
    .trim()
    .toLowerCase();
}

/// Section code inside the last parenthetical, lowercased ('' when none).
export function sectionOf(name) {
  if (typeof name !== 'string') return '';
  const m = name.match(/\(\s*([^)]+)\s*\)\s*$/);
  return m ? m[1].trim().toLowerCase() : '';
}

export function escapeRegex(string) {
  if (typeof string !== 'string') return '';
  const sanitized = string.replace(/\0/g, '');
  return sanitized.replace(/[.*+\-?^${}()|[\]\\/]/g, '\\$&');
}

/// Mongoose filter matching the bare name AND any sectioned variant:
/// "Data Structures", "data structures (CP233-R26-BS-SE-F24-SED1)".
export function courseNameFilter(name) {
  const bare = bareCourseName(name);
  if (!bare) return { courseName: { $in: [] } };
  return {
    courseName: {
      $regex: `^${escapeRegex(bare)}\\s*(\\(|$)`,
      $options: 'i',
    },
  };
}

/// The bare course name, trimmed of section: "Data Structures".
export function bareCourseName(name) {
  if (typeof name !== 'string') return '';
  return name
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\(\s*[^)]*\)\s*$/, '')
    .trim();
}

/// True when both names point at the same course (either format).
export function sameCourse(a, b) {
  const ka = canonicalCourseKey(a);
  const kb = canonicalCourseKey(b);
  return ka.isNotEmpty && ka === kb;
}
