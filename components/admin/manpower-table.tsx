'use client';

import { useState } from 'react';
import Image from 'next/image';
import { ManpowerRecord } from '@/lib/types/database';
import { deleteManpowerRecord } from '@/lib/actions/manpower';
import ManpowerForm from './manpower-form';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ChevronUpIcon, ChevronDownIcon, Plus, Pencil, Trash2 } from 'lucide-react';

interface AdminManpowerTableProps {
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
      <div className="flex items-center justify-center w-8 h-8 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700">
        <Image
          src={photoUrl}
          alt={`${advisorName || codeNumber} profile`}
          width={32}
          height={32}
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
    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-500 text-white text-xs font-medium">
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

type SortField = 'advisor_name' | 'code_number' | 'date_hired' | 'status' | 'class';
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

export default function AdminManpowerTable({ data }: AdminManpowerTableProps) {
  const [sortConfig, setSortConfig] = useState<{
    field: SortField | null;
    direction: SortDirection;
  }>({
    field: null,
    direction: 'asc',
  });

  const [showForm, setShowForm] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [selectedRecord, setSelectedRecord] = useState<ManpowerRecord | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState<ManpowerRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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
      case 'status':
        aValue = a.status;
        bValue = b.status;
        break;
      case 'class':
        aValue = a.class;
        bValue = b.class;
        break;
    }

    if (!aValue && !bValue) return 0;
    if (!aValue) return 1;
    if (!bValue) return -1;

    if (sortConfig.field === 'date_hired') {
      const aDate = new Date(aValue);
      const bDate = new Date(bValue);
      const comparison = aDate.getTime() - bDate.getTime();
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

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold">Manpower Management</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Manage advisor records in the manpower database
          </p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Add Advisor
        </Button>
      </div>

      {data.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="p-8 text-center">
            <p className="text-gray-500 dark:text-gray-400">No manpower records found.</p>
            <Button onClick={handleCreate} className="mt-4">
              <Plus className="h-4 w-4 mr-2" />
              Add First Advisor
            </Button>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Profile</TableHead>
                <SortableHeader field="advisor_name" currentSort={sortConfig} onSort={handleSort}>
                  Name
                </SortableHeader>
                <SortableHeader field="code_number" currentSort={sortConfig} onSort={handleSort}>
                  Code
                </SortableHeader>
                <SortableHeader field="status" currentSort={sortConfig} onSort={handleSort}>
                  Status
                </SortableHeader>
                <SortableHeader field="class" currentSort={sortConfig} onSort={handleSort}>
                  Class
                </SortableHeader>
                <SortableHeader field="date_hired" currentSort={sortConfig} onSort={handleSort}>
                  Date Hired
                </SortableHeader>
                <TableHead>Actions</TableHead>
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
                    <div>
                      <div>{record.advisor_name || record.nickname || '-'}</div>
                      {record.advisor_name && record.nickname && record.advisor_name !== record.nickname && (
                        <div className="text-xs text-gray-500">({record.nickname})</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {record.code_number}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={record.status} />
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{record.class || 'Individual'}</Badge>
                  </TableCell>
                  <TableCell>
                    {formatDate(record.date_hired)}
                  </TableCell>
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
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <ManpowerForm
        isOpen={showForm}
        onOpenChange={setShowForm}
        record={selectedRecord}
        mode={formMode}
      />

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
    </div>
  );
}