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

/// The trailing-parentheticals we treat as SECTION markers ("(CP233-R26-…)",
/// "(AR221)") vs those as part of the course's own name ("Physics (Lab)").
/// Rule: content is a section marker when it contains a digit and either
/// a dash or a run of uppercase-letters-then-digits like "CP233" AND no
/// spaces (a section code never contains spaces: "AR221-R26-BS-CS-S25-C2"
/// or "CP233"). A section marker is anything containing at least one dash
/// (full section code) or looking like a short course code (3+ letters
/// + digits, e.g. "CP233"). Everything else is kept as part of the name.
const SECTION_PAREN =
  /\(\s*([A-Za-z]+[A-Za-z0-9]*-[A-Za-z0-9-]*|[A-Za-z]{1,4}\d{3,5})\s*\)\s*$/;

/// True when the trailing parenthetical of [name] is a section code.
export function hasSectionParen(name) {
  return SECTION_PAREN.test(String(name ?? ''));
}

export function canonicalCourseKey(name) {
  if (typeof name !== 'string') return '';
  let out = name.replace(/\s+/g, ' ').trim();
  if (hasSectionParen(out)) {
    out = out.replace(SECTION_PAREN, '').trim();
  }
  return out.toLowerCase();
  // NOTE: "- Lab" and meaningful parens like "Physics (Lab)" are kept —
  // labs are separate courses and semi-formal titles must stay distinct.
}

/// Section code inside the last parenthetical, lowercased ('' when the
/// trailing parenthetical is NOT a section marker or when absent).
export function sectionOf(name) {
  if (typeof name !== 'string') return '';
  const m = name.match(SECTION_PAREN);
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
  let out = name.replace(/\s+/g, ' ').trim();
  if (hasSectionParen(out)) {
    out = out.replace(SECTION_PAREN, '').trim();
  }
  return out;
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
