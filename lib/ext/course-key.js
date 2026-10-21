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
    .trim()
    .toLowerCase();
  // NOTE: "- Lab" is intentionally PRESERVED — lab and theory are
  // separate courses with separate marks; merging them would corrupt
  // the gradebook.
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
/// "- Lab" variants are separate courses by design.
export function sameCourse(a, b) {
  const ka = canonicalCourseKey(a);
  const kb = canonicalCourseKey(b);
  return ka !== '' && ka === kb;
}

/// Name variants to try when matching a course against stored rows.
/// The extension's TIMETABLE labels often DROP the "- Lab" suffix while
/// its GRADE names keep it ("Computer Organization and Assembly Language
/// (AR221-...)" vs "... - Lab"), so both spellings must match.
export function courseKeyVariants(name) {
  const key = canonicalCourseKey(name);
  if (!key) return [];
  const out = new Set([key]);
  const noLab = key.replace(/\s*-\s*lab\s*$/, '');
  if (noLab && noLab !== key) out.add(noLab);
  return [...out];
}

/// Mongo filter matching any course-name variant (regex, case-insensitive).
export function courseNameVariantsFilter(name) {
  const variants = courseKeyVariants(name);
  if (!variants.length) return { courseName: { $in: [] } };
  return {
    courseName: {
      $in: variants.map(
        (v) => new RegExp(`^${escapeRegex(v)}\\s*(\\(|$)`, 'i'),
      ),
    },
  };
}

/// Filter matching a stored course NAME that carries the given section
/// code, e.g. "Computer Organization and Assembly Language (AR221-F26-...)".
/// Theory and lab sections share the course name and are only told apart
/// by their section code, so the code scopes the roster.
export function courseSectionCodeFilter(code) {
  const c = String(code || '').trim();
  if (!c) return null;
  return new RegExp(`\\(\\s*${escapeRegex(c)}\\s*[-)]`, 'i');
}
