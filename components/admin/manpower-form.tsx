'use client';

import { useState, useEffect } from 'react';
import { ManpowerRecord, Insert, Update, Team } from '@/lib/types/database';
import { createManpowerRecord, updateManpowerRecord, deleteManpowerPhoto } from '@/lib/actions/manpower';
import { createClient } from '@/lib/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AdminPhotoUpload } from '@/components/admin/admin-photo-upload';

interface ManpowerFormProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  record?: ManpowerRecord | null;
  mode: 'create' | 'edit';
}

const ADVISOR_STATUSES = [
  'Active',
  'Inactive',
  'Terminated',
  'Resigned',
  'Retired',
  'On Leave'
];

const ADVISOR_CLASSES = [
  'Individual',
  'Manager Candidate',
  'Unit Manager',
  'Sales Manager',
  'New Business Manager'
];

export default function ManpowerForm({ isOpen, onOpenChange, record, mode }: ManpowerFormProps) {
  const [formData, setFormData] = useState<Partial<ManpowerRecord>>({
    code_number: '',
    advisor_name: '',
    nickname: '',
    advisor_email: '',
    personal_email: '',
    mobile: '',
    birthday: '',
    date_hired: '',
    status: 'Active',
    class: 'Individual',
    unit_code: '',
    team_id: '',
    photo_url: ''
  });

  const [teams, setTeams] = useState<Team[]>([]);
  const [teamsLoading, setTeamsLoading] = useState(false);

  // Update form data when record or mode changes
  useEffect(() => {
    if (mode === 'edit' && record) {
      setFormData({ ...record });
    } else if (mode === 'create') {
      setFormData({
        code_number: '',
        advisor_name: '',
        nickname: '',
        advisor_email: '',
        personal_email: '',
        mobile: '',
        birthday: '',
        date_hired: '',
        status: 'Active',
        class: 'Individual',
        unit_code: '',
        team_id: '',
        photo_url: ''
      });
    }
    setPhotoFile(null);
    setErrors({});
  }, [mode, record, isOpen]);

  // Fetch teams data
  useEffect(() => {
    if (!isOpen) return;

    const fetchTeams = async () => {
      setTeamsLoading(true);
      try {
        const supabase = createClient();
        const { data: teamsData, error } = await supabase
          .from('teams')
          .select('*')
          .order('unit_name', { ascending: true });

        if (error) {
          console.error('Error fetching teams:', error);
        } else {
          setTeams(teamsData || []);
        }
      } catch (error) {
        console.error('Unexpected error fetching teams:', error);
      } finally {
        setTeamsLoading(false);
      }
    };

    fetchTeams();
  }, [isOpen]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [photoFile, setPhotoFile] = useState<File | null>(null);

  const handleInputChange = (field: keyof ManpowerRecord, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handlePhotoSelect = (file: File | null) => {
    setPhotoFile(file);
  };

  const handlePhotoRemove = async (photoUrl: string) => {
    if (!record?.code_number) return;

    try {
      // Delete from storage
      const deleteResult = await deleteManpowerPhoto(photoUrl);
      if (!deleteResult.success) {
        throw new Error(deleteResult.message);
      }

      // Update database record to remove photo_url
      const updateResult = await updateManpowerRecord(record.code_number, {
        photo_url: undefined
      });

      if (!updateResult.success) {
        throw new Error(updateResult.message);
      }

      // Update form data
      setFormData(prev => ({ ...prev, photo_url: '' }));

    } catch (error) {
      console.error('Error removing photo:', error);
      throw error;
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.code_number?.trim()) {
      newErrors.code_number = 'Code number is required';
    }

    if (!formData.advisor_name?.trim()) {
      newErrors.advisor_name = 'Advisor name is required';
    }

    if (formData.advisor_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.advisor_email)) {
      newErrors.advisor_email = 'Invalid email format';
    }

    if (formData.personal_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.personal_email)) {
      newErrors.personal_email = 'Invalid email format';
    }

    if (formData.birthday && !/^\d{4}-\d{2}-\d{2}$/.test(formData.birthday)) {
      newErrors.birthday = 'Date must be in YYYY-MM-DD format';
    }

    if (formData.date_hired && !/^\d{4}-\d{2}-\d{2}$/.test(formData.date_hired)) {
      newErrors.date_hired = 'Date must be in YYYY-MM-DD format';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      let result;

      // Create FormData for file upload if needed
      const submitFormData = new FormData();
      if (photoFile) {
        submitFormData.append('photoFile', photoFile);
      }

      if (mode === 'create') {
        const insertData: Insert<'manpower'> = {
          code_number: formData.code_number!,
          advisor_name: formData.advisor_name || undefined,
          nickname: formData.nickname || undefined,
          advisor_email: formData.advisor_email || undefined,
          personal_email: formData.personal_email || undefined,
          mobile: formData.mobile || undefined,
          birthday: formData.birthday || undefined,
          date_hired: formData.date_hired || undefined,
          status: formData.status || undefined,
          class: formData.class || undefined,
          team_id: formData.team_id || undefined,
          photo_url: formData.photo_url || undefined,
        };
        result = await createManpowerRecord(insertData, submitFormData);
      } else {
        const updateData: Update<'manpower'> = {
          advisor_name: formData.advisor_name || undefined,
          nickname: formData.nickname || undefined,
          advisor_email: formData.advisor_email || undefined,
          personal_email: formData.personal_email || undefined,
          mobile: formData.mobile || undefined,
          birthday: formData.birthday || undefined,
          date_hired: formData.date_hired || undefined,
          status: formData.status || undefined,
          class: formData.class || undefined,
          team_id: formData.team_id || undefined,
          photo_url: formData.photo_url || undefined,
        };
        result = await updateManpowerRecord(formData.code_number!, updateData, submitFormData);
      }

      if (result.success) {
        onOpenChange(false);
        // Reset form for create mode
        if (mode === 'create') {
          setFormData({
            code_number: '',
            advisor_name: '',
            nickname: '',
            advisor_email: '',
            personal_email: '',
            mobile: '',
            birthday: '',
            date_hired: '',
            status: 'Active',
            class: 'Individual',
            unit_code: '',
            team_id: '',
            photo_url: ''
          });
          setPhotoFile(null);
        }
      } else {
        setErrors({ general: result.message });
      }
    } catch {
      setErrors({ general: 'An unexpected error occurred' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'Add New Advisor' : 'Edit Advisor'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'create'
              ? 'Create a new advisor record in the manpower database.'
              : 'Update the advisor information.'
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {errors.general && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-3 py-2 rounded-md text-sm">
              {errors.general}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="code_number">Code Number *</Label>
              <Input
                id="code_number"
                value={formData.code_number || ''}
                onChange={(e) => handleInputChange('code_number', e.target.value)}
                disabled={mode === 'edit'} // Code number cannot be changed
                className={errors.code_number ? 'border-red-500' : ''}
              />
              {errors.code_number && (
                <p className="text-red-500 text-sm">{errors.code_number}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="advisor_name">Advisor Name *</Label>
              <Input
                id="advisor_name"
                value={formData.advisor_name || ''}
                onChange={(e) => handleInputChange('advisor_name', e.target.value)}
                className={errors.advisor_name ? 'border-red-500' : ''}
              />
              {errors.advisor_name && (
                <p className="text-red-500 text-sm">{errors.advisor_name}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="nickname">Nickname</Label>
              <Input
                id="nickname"
                value={formData.nickname || ''}
                onChange={(e) => handleInputChange('nickname', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status || ''}
                onValueChange={(value) => handleInputChange('status', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {ADVISOR_STATUSES.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="class">Class</Label>
              <Select
                value={formData.class || ''}
                onValueChange={(value) => handleInputChange('class', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select class" />
                </SelectTrigger>
                <SelectContent>
                  {ADVISOR_CLASSES.map((advisorClass) => (
                    <SelectItem key={advisorClass} value={advisorClass}>
                      {advisorClass}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="team_id">Team</Label>
              <Select
                value={formData.team_id || 'none'}
                onValueChange={(value) => handleInputChange('team_id', value === 'none' ? '' : value)}
                disabled={teamsLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder={teamsLoading ? "Loading teams..." : "Select a team"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Team</SelectItem>
                  {teams.map((team) => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.unit_name || team.unit_code || 'Unnamed Team'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="advisor_email">Advisor Email</Label>
              <Input
                id="advisor_email"
                type="email"
                value={formData.advisor_email || ''}
                onChange={(e) => handleInputChange('advisor_email', e.target.value)}
                className={errors.advisor_email ? 'border-red-500' : ''}
              />
              {errors.advisor_email && (
                <p className="text-red-500 text-sm">{errors.advisor_email}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="personal_email">Personal Email</Label>
              <Input
                id="personal_email"
                type="email"
                value={formData.personal_email || ''}
                onChange={(e) => handleInputChange('personal_email', e.target.value)}
                className={errors.personal_email ? 'border-red-500' : ''}
              />
              {errors.personal_email && (
                <p className="text-red-500 text-sm">{errors.personal_email}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="mobile">Mobile Number</Label>
              <Input
                id="mobile"
                value={formData.mobile || ''}
                onChange={(e) => handleInputChange('mobile', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="birthday">Birthday</Label>
              <Input
                id="birthday"
                type="date"
                value={formData.birthday || ''}
                onChange={(e) => handleInputChange('birthday', e.target.value)}
                className={errors.birthday ? 'border-red-500' : ''}
              />
              {errors.birthday && (
                <p className="text-red-500 text-sm">{errors.birthday}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="date_hired">Date Hired</Label>
              <Input
                id="date_hired"
                type="date"
                value={formData.date_hired || ''}
                onChange={(e) => handleInputChange('date_hired', e.target.value)}
                className={errors.date_hired ? 'border-red-500' : ''}
              />
              {errors.date_hired && (
                <p className="text-red-500 text-sm">{errors.date_hired}</p>
              )}
            </div>

            <div className="col-span-1 md:col-span-2 space-y-2">
              <Label>Advisor Photo</Label>
              <AdminPhotoUpload
                onFileSelect={handlePhotoSelect}
                onPhotoRemove={mode === 'edit' ? handlePhotoRemove : undefined}
                initialPhotoUrl={formData.photo_url}
                disabled={isSubmitting}
              />
              <div className="mt-2">
                <Label htmlFor="photo_url" className="text-xs text-muted-foreground">Or enter photo URL manually:</Label>
                <Input
                  id="photo_url"
                  type="url"
                  value={formData.photo_url || ''}
                  onChange={(e) => handleInputChange('photo_url', e.target.value)}
                  placeholder="https://example.com/photo.jpg"
                  className="mt-1"
                  disabled={isSubmitting}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? (mode === 'create' ? 'Creating...' : 'Updating...')
                : (mode === 'create' ? 'Create Advisor' : 'Update Advisor')
              }
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}