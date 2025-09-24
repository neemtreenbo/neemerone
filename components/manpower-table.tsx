'use client';

import { useState } from 'react';
import Image from 'next/image';
import { ManpowerRecord } from '@/lib/types/database';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { ChevronUpIcon, ChevronDownIcon } from 'lucide-react';

interface ManpowerTableProps {
  data: ManpowerRecord[];
}

interface ProfileAvatarProps {
  photoUrl?: string;
  advisorName?: string;
  codeNumber: string;
}

function ProfileAvatar({ photoUrl, advisorName, codeNumber }: ProfileAvatarProps) {
  if (photoUrl) {
    return (
      <div className="flex items-center justify-center w-10 h-10 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700">
        <Image
          src={photoUrl}
          alt={`${advisorName || codeNumber} profile`}
          width={40}
          height={40}
          className="w-full h-full object-cover"
        />
      </div>
    );
  }

  // Fallback to initials or code
  const initials = advisorName
    ? advisorName
        .split(' ')
        .map(name => name.charAt(0).toUpperCase())
        .slice(0, 2)
        .join('')
    : codeNumber.slice(0, 2).toUpperCase();

  return (
    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-500 text-white text-sm font-medium">
      {initials}
    </div>
  );
}

function formatDate(dateString?: string): string {
  if (!dateString) return '-';

  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  } catch {
    return '-';
  }
}

type SortField = 'advisor_name' | 'code_number' | 'date_hired' | 'birthday';
type SortDirection = 'asc' | 'desc';

interface SortableHeaderProps {
  children: React.ReactNode;
  field?: SortField;
  currentSort: { field: SortField | null; direction: SortDirection };
  onSort: (field: SortField) => void;
}

function SortableHeader({ children, field, currentSort, onSort }: SortableHeaderProps) {
  if (!field) {
    return <TableHead>{children}</TableHead>;
  }

  const isActive = currentSort.field === field;
  const isAsc = isActive && currentSort.direction === 'asc';

  return (
    <TableHead>
      <Button
        variant="ghost"
        className="h-auto p-0 font-medium hover:bg-transparent"
        onClick={() => onSort(field)}
      >
        <span className="flex items-center gap-1">
          {children}
          {isActive ? (
            isAsc ? (
              <ChevronUpIcon className="h-4 w-4" />
            ) : (
              <ChevronDownIcon className="h-4 w-4" />
            )
          ) : (
            <div className="h-4 w-4" />
          )}
        </span>
      </Button>
    </TableHead>
  );
}

export default function ManpowerTable({ data }: ManpowerTableProps) {
  const [sortConfig, setSortConfig] = useState<{
    field: SortField | null;
    direction: SortDirection;
  }>({
    field: null,
    direction: 'asc',
  });

  const handleSort = (field: SortField) => {
    setSortConfig(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const sortedData = [...data].sort((a, b) => {
    if (!sortConfig.field) return 0;

    let aValue: string | undefined;
    let bValue: string | undefined;

    switch (sortConfig.field) {
      case 'advisor_name':
        aValue = a.advisor_name || a.nickname;
        bValue = b.advisor_name || b.nickname;
        break;
      case 'code_number':
        aValue = a.code_number;
        bValue = b.code_number;
        break;
      case 'date_hired':
        aValue = a.date_hired;
        bValue = b.date_hired;
        break;
      case 'birthday':
        aValue = a.birthday;
        bValue = b.birthday;
        break;
    }

    // Handle undefined/null values
    if (!aValue && !bValue) return 0;
    if (!aValue) return 1;
    if (!bValue) return -1;

    // For date fields, convert to Date objects for proper comparison
    if (sortConfig.field === 'date_hired' || sortConfig.field === 'birthday') {
      const aDate = new Date(aValue);
      const bDate = new Date(bValue);
      const comparison = aDate.getTime() - bDate.getTime();
      return sortConfig.direction === 'asc' ? comparison : -comparison;
    }

    // For text fields, use localeCompare for proper string comparison
    const comparison = aValue.localeCompare(bValue);
    return sortConfig.direction === 'asc' ? comparison : -comparison;
  });

  if (data.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="p-8 text-center">
          <p className="text-gray-500 dark:text-gray-400">No manpower records found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <SortableHeader currentSort={sortConfig} onSort={handleSort}>
              Profile
            </SortableHeader>
            <SortableHeader field="advisor_name" currentSort={sortConfig} onSort={handleSort}>
              Display Name
            </SortableHeader>
            <SortableHeader field="code_number" currentSort={sortConfig} onSort={handleSort}>
              Code Number
            </SortableHeader>
            <SortableHeader field="date_hired" currentSort={sortConfig} onSort={handleSort}>
              Date Hired
            </SortableHeader>
            <SortableHeader field="birthday" currentSort={sortConfig} onSort={handleSort}>
              Birthday
            </SortableHeader>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedData.map((record) => (
            <TableRow key={record.code_number}>
              <TableCell>
                <ProfileAvatar
                  photoUrl={record.photo_url}
                  advisorName={record.advisor_name}
                  codeNumber={record.code_number}
                />
              </TableCell>
              <TableCell className="font-medium">
                {record.advisor_name || record.nickname || '-'}
              </TableCell>
              <TableCell className="font-mono text-sm">
                {record.code_number}
              </TableCell>
              <TableCell>
                {formatDate(record.date_hired)}
              </TableCell>
              <TableCell>
                {formatDate(record.birthday)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}