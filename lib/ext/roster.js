/* Roster lookup — shared by the leaderboard and the roster endpoint.
 *
 * A "roster" is the set of students sitting in the SAME class section.
 * It is built from the timetable rows of every client (app and
 * extension), so the lookup has to be tolerant:
 *
 *   - the section code is the authority ("AR221-R26-BS-CS-S25-C2");
 *   - the course name is only a fallback, because the portal truncates
 *     long names and the two clients spell them differently;
 *   - a group is one weekly slot (section + day + time).
 */

import { SubjectGroup } from './models.js';
import {
  courseNameVariantsFilter,
  courseSectionCodeFilter,
} from './course-key.js';
import { normalizeSectionCode, isFullSectionCode } from './identity.js';

/// Ordered filter list for "the groups of this section". The first one
/// that matches wins; the rest are graceful fallbacks.
export function rosterGroupFilters(courseName, courseCode) {
  const requested = normalizeSectionCode(courseCode);
  const filters = [];
  if (requested && isFullSectionCode(requested)) {
    // Canonical groups carry the section key.
    filters.push({ sectionKey: requested });
  }
  if (requested) {
    // Legacy groups carry the code inside the course name.
    const codeFilter = courseSectionCodeFilter(requested);
    if (codeFilter) filters.push({ courseName: codeFilter });
  }
  filters.push(courseNameVariantsFilter(courseName));
  return filters;
}

/// Groups (class slots) for a section, optionally restricted to the
/// groups the given student sits in.
export async function findRosterGroups({
  courseName,
  courseCode,
  studentId,
  select = 'courseName studentIds',
} = {}) {
  const filters = rosterGroupFilters(courseName, courseCode);
  const query = studentId ? { studentIds: studentId } : {};
  for (const filter of filters) {
    const groups = await SubjectGroup.find({ ...filter, ...query })
      .select(select)
      .lean();
    if (groups.length) return groups;
  }
  return [];
}

/// Every student id in the given groups.
export function rosterMemberIds(groups) {
  const ids = new Set();
  for (const g of groups) {
    for (const id of g.studentIds || []) ids.add(id);
  }
  return ids;
}
