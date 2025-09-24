'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, UserCheck, Users2, Network } from 'lucide-react';
import { ManpowerRecord } from '@/lib/types/database';

interface SummaryCardProps {
  title: string;
  count: number;
  icon: React.ReactNode;
  description: string;
}

function SummaryCard({ title, count, icon, description }: SummaryCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{count}</div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

interface ManpowerSummaryCardsProps {
  data: (ManpowerRecord & { hierarchy_level?: string })[];
}

export function ManpowerSummaryCards({ data }: ManpowerSummaryCardsProps) {
  // Helper function to determine if status is active
  const isActiveStatus = (status?: string): boolean => {
    return status === 'active';
  };

  // Calculate summary statistics
  const summaryStats = {
    totalActive: data.filter(record => isActiveStatus(record.status)).length,
    direct: data.filter(record => record.hierarchy_level === 'Direct' && isActiveStatus(record.status)).length,
    indirect1: data.filter(record => record.hierarchy_level === 'Indirect 1' && isActiveStatus(record.status)).length,
    indirect2: data.filter(record => record.hierarchy_level === 'Indirect 2' && isActiveStatus(record.status)).length
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <SummaryCard
        title="Total Active"
        count={summaryStats.totalActive}
        icon={<Users className="h-4 w-4 text-muted-foreground" />}
        description="Active team members"
      />
      <SummaryCard
        title="Direct"
        count={summaryStats.direct}
        icon={<UserCheck className="h-4 w-4 text-muted-foreground" />}
        description="Direct reports"
      />
      <SummaryCard
        title="Indirect 1"
        count={summaryStats.indirect1}
        icon={<Users2 className="h-4 w-4 text-muted-foreground" />}
        description="Second level reports"
      />
      <SummaryCard
        title="Indirect 2"
        count={summaryStats.indirect2}
        icon={<Network className="h-4 w-4 text-muted-foreground" />}
        description="Third+ level reports"
      />
    </div>
  );
}