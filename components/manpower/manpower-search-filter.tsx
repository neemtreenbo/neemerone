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

type StatusFilter = 'active' | 'cancelled' | 'all';

interface ManpowerSearchFilterProps {
  searchQuery: string;
  statusFilter: StatusFilter;
  onSearchChange: (query: string) => void;
  onStatusFilterChange: (filter: StatusFilter) => void;
  onClearSearch: () => void;
  onClearFilters: () => void;
}

export function ManpowerSearchFilter({
  searchQuery,
  statusFilter,
  onSearchChange,
  onStatusFilterChange,
  onClearSearch,
  onClearFilters,
}: ManpowerSearchFilterProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-4">
      {/* Search Bar */}
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

      {/* Status Filter */}
      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-gray-400" />
        <Select value={statusFilter} onValueChange={onStatusFilterChange}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
            <SelectItem value="all">All Status</SelectItem>
          </SelectContent>
        </Select>

        {/* Clear Filters Button */}
        {(searchQuery || statusFilter !== 'all') && (
          <Button variant="outline" size="sm" onClick={onClearFilters}>
            Clear Filters
          </Button>
        )}
      </div>
    </div>
  );
}