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

export default function ManpowerTable({ data }: ManpowerTableProps) {
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
            <TableHead>Profile</TableHead>
            <TableHead>Display Name</TableHead>
            <TableHead>Code Number</TableHead>
            <TableHead>Date Hired</TableHead>
            <TableHead>Birthday</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((record) => (
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