'use client';

import { useState } from 'react';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import {
  ProfileAvatar,
  HierarchyBadge,
  SortableHeader,
  formatDate,
  type SortField,
  type SortDirection,
} from './manpower-table-components';

interface ManpowerDataTableProps {
  data: (ManpowerRecord & { hierarchy_level?: string })[];
  mode?: 'admin' | 'regular';
  searchQuery: string;
  statusFilter: 'active' | 'cancelled' | 'all';
}

export function ManpowerDataTable({
  data,
  mode = 'regular',
  searchQuery,
  statusFilter
}: ManpowerDataTableProps) {
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
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [selectedPhotoRecord, setSelectedPhotoRecord] = useState<ManpowerRecord | null>(null);

  const isAdminMode = mode === 'admin';

  // Helper functions
  const isActiveStatus = (status?: string): boolean => status === 'active';
  const isCancelledStatus = (status?: string): boolean => status === 'cancelled';

  // Filter data
  const filteredData = data.filter(record => {
    // Apply status filter
    let statusMatch = true;
    if (statusFilter === 'active') {
      statusMatch = isActiveStatus(record.status);
    } else if (statusFilter === 'cancelled') {
      statusMatch = isCancelledStatus(record.status);
    }
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

  // Sort data
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

  const handleSort = (field: SortField) => {
    setSortConfig(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

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

  if (sortedData.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="p-8 text-center">
          {searchQuery ? (
            <p className="text-gray-500 dark:text-gray-400 mb-2">
              No advisors found matching "{searchQuery}"
            </p>
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
    );
  }

  return (
    <>
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
    </>
  );
}