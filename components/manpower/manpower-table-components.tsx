'use client';

import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TableHead } from '@/components/ui/table';
import { ChevronUpIcon, ChevronDownIcon } from 'lucide-react';

// Profile Avatar Component
interface ProfileAvatarProps {
  photoUrl?: string;
  advisorName?: string;
  codeNumber: string;
  size?: 'sm' | 'md';
  onClick?: () => void;
}

export function ProfileAvatar({ photoUrl, advisorName, codeNumber, size = 'md', onClick }: ProfileAvatarProps) {
  const dimensions = size === 'sm' ? 'w-8 h-8' : 'w-10 h-10';
  const imageSize = size === 'sm' ? 32 : 40;
  const textSize = size === 'sm' ? 'text-xs' : 'text-sm';

  if (photoUrl) {
    return (
      <div
        className={`flex items-center justify-center ${dimensions} rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 ${onClick ? 'cursor-pointer hover:ring-2 hover:ring-primary transition-all' : ''}`}
        onClick={onClick}
      >
        <Image
          src={photoUrl}
          alt={`${advisorName || codeNumber} profile`}
          width={imageSize}
          height={imageSize}
          className="w-full h-full object-cover"
        />
      </div>
    );
  }

  const initials = advisorName
    ? advisorName
        .split(' ')
        .map(name => name.charAt(0).toUpperCase())
        .slice(0, 2)
        .join('')
    : codeNumber.slice(0, 2).toUpperCase();

  return (
    <div className={`flex items-center justify-center ${dimensions} rounded-full bg-blue-500 text-white ${textSize} font-medium`}>
      {initials}
    </div>
  );
}

// Status Badge Component
export function StatusBadge({ status }: { status?: string }) {
  if (!status) return <Badge variant="secondary">Unknown</Badge>;

  const variant = status.toLowerCase() === 'active' ? 'default' :
                  status.toLowerCase() === 'inactive' ? 'secondary' :
                  status.toLowerCase() === 'terminated' || status.toLowerCase() === 'resigned' ? 'destructive' :
                  status.toLowerCase() === 'cancelled' ? 'destructive' :
                  'outline';

  return <Badge variant={variant}>{status}</Badge>;
}

// Class Badge Component
export function ClassBadge({ advisorClass }: { advisorClass?: string }) {
  if (!advisorClass) return <Badge variant="outline">Individual</Badge>;

  const variant = advisorClass.toLowerCase().includes('manager') ? 'default' :
                  advisorClass.toLowerCase().includes('candidate') ? 'secondary' :
                  'outline';

  return <Badge variant={variant}>{advisorClass}</Badge>;
}

// Unit Code Display Component
export function UnitCodeDisplay({ unitCode }: { unitCode?: string }) {
  if (!unitCode) return <span className="text-gray-400 text-sm">-</span>;

  return <span className="font-mono text-sm text-gray-700 dark:text-gray-300">{unitCode}</span>;
}

// Hierarchy Badge Component
export function HierarchyBadge({ level }: { level?: string }) {
  if (!level) return null;

  const variant = level === 'Direct' ? 'default' :
                  level === 'Indirect 1' ? 'secondary' :
                  'outline';

  return <Badge variant={variant} className="text-xs">{level}</Badge>;
}

// Sortable Header Component
export type SortField = 'advisor_name' | 'code_number' | 'unit_code' | 'status' | 'class' | 'hierarchy_level' | 'date_hired' | 'birthday';
export type SortDirection = 'asc' | 'desc';

interface SortableHeaderProps {
  children: React.ReactNode;
  field?: SortField;
  currentSort: { field: SortField | null; direction: SortDirection };
  onSort: (field: SortField) => void;
}

export function SortableHeader({ children, field, currentSort, onSort }: SortableHeaderProps) {
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

// Utility Functions
export function formatDate(dateString?: string): string {
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