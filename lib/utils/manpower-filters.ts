// Utility functions for manpower filtering

export type ClassCategory = 'advisors' | 'managers' | 'all';
export type MonthFilter = '01' | '02' | '03' | '04' | '05' | '06' | '07' | '08' | '09' | '10' | '11' | '12' | 'all';

// Class categorization constants
export const ADVISOR_CLASSES = ['A', 'B', 'C', 'D', 'E'];
export const MANAGER_CLASSES = ['NBM', 'SM', 'UM', 'MC'];

// Month names for dropdowns
export const MONTHS = [
  { value: '01', label: 'January' },
  { value: '02', label: 'February' },
  { value: '03', label: 'March' },
  { value: '04', label: 'April' },
  { value: '05', label: 'May' },
  { value: '06', label: 'June' },
  { value: '07', label: 'July' },
  { value: '08', label: 'August' },
  { value: '09', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' },
];

/**
 * Categorize a class into advisor or manager
 */
export function categorizeClass(classValue?: string): ClassCategory {
  if (!classValue) return 'all';

  const upperClass = classValue.toUpperCase();

  if (ADVISOR_CLASSES.includes(upperClass)) {
    return 'advisors';
  }

  if (MANAGER_CLASSES.includes(upperClass)) {
    return 'managers';
  }

  return 'all';
}

/**
 * Check if a class matches the selected category filter
 */
export function classMatchesCategory(categoryFilter: ClassCategory, classValue?: string): boolean {
  if (categoryFilter === 'all') return true;

  const category = categorizeClass(classValue);
  return category === categoryFilter;
}

/**
 * Extract month from a date string (YYYY-MM-DD format)
 */
export function extractMonthFromDate(dateString?: string): string | null {
  if (!dateString) return null;

  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return null;

    // Return month as 2-digit string (01-12)
    return String(date.getMonth() + 1).padStart(2, '0');
  } catch {
    return null;
  }
}

/**
 * Check if a date matches the selected month filter
 */
export function dateMatchesMonth(monthFilter: MonthFilter, dateString?: string): boolean {
  if (monthFilter === 'all') return true;

  const dateMonth = extractMonthFromDate(dateString);
  return dateMonth === monthFilter;
}

/**
 * Get unique teams from manpower data
 */
export function getUniqueTeams(data: Array<{ team_name?: string }> = []): Array<{ value: string; label: string }> {
  if (!data || !Array.isArray(data)) {
    return [];
  }

  const teams = new Set<string>();

  data.forEach(record => {
    if (record?.team_name && record.team_name.trim()) {
      teams.add(record.team_name.trim());
    }
  });

  return Array.from(teams)
    .sort()
    .map(team => ({ value: team, label: team }));
}

/**
 * Check if a record matches the selected team filter
 */
export function recordMatchesTeam(teamFilter: string, teamName?: string): boolean {
  if (teamFilter === 'all') return true;

  return teamName?.trim() === teamFilter;
}

/**
 * Get month name from month value
 */
export function getMonthName(monthValue: MonthFilter): string {
  if (monthValue === 'all') return 'All Months';

  const month = MONTHS.find(m => m.value === monthValue);
  return month?.label || 'Unknown Month';
}

/**
 * Get class category display name
 */
export function getClassCategoryName(category: ClassCategory): string {
  switch (category) {
    case 'advisors':
      return 'Advisors (A-E)';
    case 'managers':
      return 'Managers (NBM, SM, UM, MC)';
    case 'all':
      return 'All Classes';
    default:
      return 'All Classes';
  }
}