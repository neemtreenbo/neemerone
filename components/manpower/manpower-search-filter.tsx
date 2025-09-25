'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, X, Filter } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ClassCategory,
  MonthFilter,
  MONTHS,
} from '@/lib/utils/manpower-filters';

type StatusFilter = 'active' | 'cancelled' | 'all';

interface ManpowerSearchFilterProps {
  searchQuery: string;
  statusFilter: StatusFilter;
  classFilter: ClassCategory;
  dateHiredMonthFilter: MonthFilter;
  birthdayMonthFilter: MonthFilter;
  teamFilter: string;
  availableTeams?: Array<{ value: string; label: string }>;
  onSearchChange: (query: string) => void;
  onStatusFilterChange: (filter: StatusFilter) => void;
  onClassFilterChange: (filter: ClassCategory) => void;
  onDateHiredMonthFilterChange: (filter: MonthFilter) => void;
  onBirthdayMonthFilterChange: (filter: MonthFilter) => void;
  onTeamFilterChange: (filter: string) => void;
  onClearSearch: () => void;
  onClearFilters: () => void;
}

export function ManpowerSearchFilter({
  searchQuery,
  statusFilter,
  classFilter,
  dateHiredMonthFilter,
  birthdayMonthFilter,
  teamFilter,
  availableTeams = [],
  onSearchChange,
  onStatusFilterChange,
  onClassFilterChange,
  onDateHiredMonthFilterChange,
  onBirthdayMonthFilterChange,
  onTeamFilterChange,
  onClearSearch,
  onClearFilters,
}: ManpowerSearchFilterProps) {
  const hasActiveFilters =
    searchQuery ||
    statusFilter !== 'all' ||
    classFilter !== 'all' ||
    dateHiredMonthFilter !== 'all' ||
    birthdayMonthFilter !== 'all' ||
    teamFilter !== 'all';

  return (
    <div className="space-y-4">
      {/* First Row: Search Bar */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search advisors..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10 pr-10"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearSearch}
              className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>

        {/* Clear All Filters Button */}
        {hasActiveFilters && (
          <Button variant="outline" size="sm" onClick={onClearFilters}>
            Clear All Filters
          </Button>
        )}
      </div>

      {/* Second Row: Filter Dropdowns */}
      <div className="flex flex-wrap gap-3 items-center">
        <Filter className="h-4 w-4 text-gray-400" />

        {/* Status Filter */}
        <Select value={statusFilter} onValueChange={onStatusFilterChange}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>

        {/* Class Filter */}
        <Select value={classFilter} onValueChange={onClassFilterChange}>
          <SelectTrigger className="w-[100px]">
            <SelectValue placeholder="Class" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Classes</SelectItem>
            <SelectItem value="advisors">Advisor</SelectItem>
            <SelectItem value="managers">Manager</SelectItem>
          </SelectContent>
        </Select>

        {/* Date Hired Month Filter */}
        <Select value={dateHiredMonthFilter} onValueChange={onDateHiredMonthFilterChange}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Sunniversary" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Sunniversary</SelectItem>
            {MONTHS.map(month => (
              <SelectItem key={month.value} value={month.value}>
                {month.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Birthday Month Filter */}
        <Select value={birthdayMonthFilter} onValueChange={onBirthdayMonthFilterChange}>
          <SelectTrigger className="w-[120px]">
            <SelectValue placeholder="Birthday" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Birthday</SelectItem>
            {MONTHS.map(month => (
              <SelectItem key={month.value} value={month.value}>
                {month.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Team Filter */}
        <Select value={teamFilter} onValueChange={onTeamFilterChange}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Team" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Teams</SelectItem>
            {availableTeams.map(team => (
              <SelectItem key={team.value} value={team.value}>
                {team.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}