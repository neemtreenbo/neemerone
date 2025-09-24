'use client';

import { useState } from 'react';
import Image from 'next/image';
import { ManpowerRecord } from '@/lib/types/database';
import { deleteManpowerRecord } from '@/lib/actions/manpower';
import ManpowerForm from '../admin/manpower-form';
import { PhotoZoomModal } from '../admin/photo-zoom-modal';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import {
  ChevronUpIcon,
  ChevronDownIcon,
  Plus,
  Pencil,
  Trash2,
  Search,
  X,
  Filter
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface UnifiedManpowerTableProps {
  data: (ManpowerRecord & { hierarchy_level?: string })[];
  mode?: 'admin' | 'regular';
  title?: string;
  description?: string;
}

interface ProfileAvatarProps {
  photoUrl?: string;
  advisorName?: string;
  codeNumber: string;
  size?: 'sm' | 'md';
  onClick?: () => void;
}

function ProfileAvatar({ photoUrl, advisorName, codeNumber, size = 'md', onClick }: ProfileAvatarProps) {
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

function StatusBadge({ status }: { status?: string }) {
  if (!status) return <Badge variant="secondary">Unknown</Badge>;

  const variant = status === 'Active' ? 'default' :
                  status === 'Inactive' ? 'secondary' :
                  status === 'Terminated' || status === 'Resigned' ? 'destructive' :
                  'outline';

  return <Badge variant={variant}>{status}</Badge>;
}

function ClassBadge({ advisorClass }: { advisorClass?: string }) {
  return <Badge variant="outline">{advisorClass || 'Individual'}</Badge>;
}

function HierarchyBadge({ level }: { level?: string }) {
  if (!level) return null;

  const variant = level === 'Direct' ? 'default' :
                  level === 'Indirect 1' ? 'secondary' :
                  'outline';

  return <Badge variant={variant} className="text-xs">{level}</Badge>;
}

type SortField = 'advisor_name' | 'code_number' | 'date_hired' | 'birthday' | 'status' | 'class' | 'hierarchy_level';
type SortDirection = 'asc' | 'desc';
type StatusFilter = 'active' | 'cancelled' | 'all';

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

export default function UnifiedManpowerTable({
  data,
  mode = 'regular',
  title = 'Manpower',
  description
}: UnifiedManpowerTableProps) {
  const [sortConfig, setSortConfig] = useState<{
    field: SortField | null;
    direction: SortDirection;
  }>({
    field: null,
    direction: 'asc',
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all'); // Show all by default
  const [showForm, setShowForm] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [selectedRecord, setSelectedRecord] = useState<ManpowerRecord | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState<ManpowerRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [selectedPhotoRecord, setSelectedPhotoRecord] = useState<ManpowerRecord | null>(null);

  const isAdminMode = mode === 'admin';

  // Helper function to determine if status is active or cancelled
  const isActiveStatus = (status?: string): boolean => {
    return status === 'active';
  };

  const isCancelledStatus = (status?: string): boolean => {
    return status === 'cancelled';
  };

  // Filter data based on search query and status filter
  const filteredData = data.filter(record => {
    // Apply status filter first
    let statusMatch = true;
    if (statusFilter === 'active') {
      statusMatch = isActiveStatus(record.status);
    } else if (statusFilter === 'cancelled') {
      statusMatch = isCancelledStatus(record.status);
    }
    // If statusFilter is 'all', statusMatch remains true

    if (!statusMatch) return false;

    // Apply search filter
    if (!searchQuery.trim()) return true;

    const query = searchQuery.toLowerCase();
    return (
      record.advisor_name?.toLowerCase().includes(query) ||
      record.nickname?.toLowerCase().includes(query) ||
      record.code_number.toLowerCase().includes(query) ||
      record.advisor_email?.toLowerCase().includes(query) ||
      record.status?.toLowerCase().includes(query) ||
      record.class?.toLowerCase().includes(query)
    );
  });

  const handleSort = (field: SortField) => {
    setSortConfig(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const sortedData = [...filteredData].sort((a, b) => {
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
      case 'status':
        aValue = a.status;
        bValue = b.status;
        break;
      case 'class':
        aValue = a.class;
        bValue = b.class;
        break;
      case 'hierarchy_level':
        aValue = a.hierarchy_level;
        bValue = b.hierarchy_level;
        break;
    }

    if (!aValue && !bValue) return 0;
    if (!aValue) return 1;
    if (!bValue) return -1;

    if (sortConfig.field === 'date_hired' || sortConfig.field === 'birthday') {
      const aDate = new Date(aValue);
      const bDate = new Date(bValue);
      const comparison = aDate.getTime() - bDate.getTime();
      return sortConfig.direction === 'asc' ? comparison : -comparison;
    }

    if (sortConfig.field === 'hierarchy_level') {
      // Custom sorting for hierarchy levels: Direct < Indirect 1 < Indirect 2
      const levelOrder: Record<string, number> = {
        'Direct': 1,
        'Indirect 1': 2,
        'Indirect 2': 3
      };

      const aOrder = levelOrder[aValue] || 999;
      const bOrder = levelOrder[bValue] || 999;
      const comparison = aOrder - bOrder;
      return sortConfig.direction === 'asc' ? comparison : -comparison;
    }

    const comparison = aValue.localeCompare(bValue);
    return sortConfig.direction === 'asc' ? comparison : -comparison;
  });

  const handleCreate = () => {
    setFormMode('create');
    setSelectedRecord(null);
    setShowForm(true);
  };

  const handleEdit = (record: ManpowerRecord) => {
    setFormMode('edit');
    setSelectedRecord(record);
    setShowForm(true);
  };

  const handleDeleteClick = (record: ManpowerRecord) => {
    setRecordToDelete(record);
    setShowDeleteDialog(true);
  };

  const handleDeleteConfirm = async () => {
    if (!recordToDelete) return;

    setIsDeleting(true);
    try {
      const result = await deleteManpowerRecord(recordToDelete.code_number);
      if (result.success) {
        setShowDeleteDialog(false);
        setRecordToDelete(null);
      } else {
        console.error('Delete failed:', result.message);
      }
    } catch (error) {
      console.error('Delete error:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
  };

  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter('all'); // Reset to default
  };

  return (
    <div className="space-y-4">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-lg font-semibold">{title}</h2>
          {description && (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {description}
            </p>
          )}
        </div>
        {isAdminMode && (
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Add Advisor
          </Button>
        )}
      </div>

      {/* Search and Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search Bar */}
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search advisors..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-10"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearSearch}
              className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-400" />
          <Select value={statusFilter} onValueChange={(value: StatusFilter) => setStatusFilter(value)}>
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
            <Button variant="outline" size="sm" onClick={clearFilters}>
              Clear Filters
            </Button>
          )}
        </div>
      </div>

      {/* Results Count */}
      {data.length > 0 && (
        <div className="flex justify-between items-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Showing {data.length} advisor{data.length !== 1 ? 's' : ''}
          </p>
        </div>
      )}

      {/* Table */}
      {sortedData.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="p-8 text-center">
            {searchQuery ? (
              <>
                <p className="text-gray-500 dark:text-gray-400 mb-2">
                  No advisors found matching "{searchQuery}"
                </p>
                <Button variant="outline" onClick={clearSearch}>
                  Clear search
                </Button>
              </>
            ) : (
              <>
                <p className="text-gray-500 dark:text-gray-400 mb-4">No manpower records found.</p>
                {isAdminMode && (
                  <Button onClick={handleCreate}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add First Advisor
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Profile</TableHead>
                <SortableHeader field="advisor_name" currentSort={sortConfig} onSort={handleSort}>
                  Display Name
                </SortableHeader>
                <SortableHeader field="hierarchy_level" currentSort={sortConfig} onSort={handleSort}>
                  Hierarchy
                </SortableHeader>
                <SortableHeader field="code_number" currentSort={sortConfig} onSort={handleSort}>
                  Code
                </SortableHeader>
                <SortableHeader field="date_hired" currentSort={sortConfig} onSort={handleSort}>
                  Date Hired
                </SortableHeader>
                <SortableHeader field="birthday" currentSort={sortConfig} onSort={handleSort}>
                  Birthdate
                </SortableHeader>
                {isAdminMode && <TableHead>Actions</TableHead>}
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
                      size={isAdminMode ? 'sm' : 'md'}
                      onClick={record.photo_url ? () => {
                        setSelectedPhotoRecord(record);
                        setShowPhotoModal(true);
                      } : undefined}
                    />
                  </TableCell>
                  <TableCell className="font-medium">
                    <div>
                      <div>{record.advisor_name || record.nickname || '-'}</div>
                      {record.advisor_name && record.nickname && record.advisor_name !== record.nickname && (
                        <div className="text-xs text-gray-500">({record.nickname})</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {record.hierarchy_level ? (
                      <HierarchyBadge level={record.hierarchy_level} />
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
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
                  {isAdminMode && (
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(record)}
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeleteClick(record)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Admin Form Modal */}
      {isAdminMode && (
        <ManpowerForm
          isOpen={showForm}
          onOpenChange={setShowForm}
          record={selectedRecord}
          mode={formMode}
        />
      )}

      {/* Delete Confirmation Modal */}
      {isAdminMode && (
        <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Advisor</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete {recordToDelete?.advisor_name || recordToDelete?.code_number}?
                This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowDeleteDialog(false)}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Photo Zoom Modal */}
      {selectedPhotoRecord && selectedPhotoRecord.photo_url && (
        <PhotoZoomModal
          isOpen={showPhotoModal}
          onOpenChange={setShowPhotoModal}
          photoUrl={selectedPhotoRecord.photo_url}
          advisorName={selectedPhotoRecord.advisor_name}
          codeNumber={selectedPhotoRecord.code_number}
        />
      )}
    </div>
  );
}