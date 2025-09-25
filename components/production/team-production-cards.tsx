'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, UserCheck, DollarSign, TrendingUp } from 'lucide-react';
import { formatCurrency, formatNumber } from '@/lib/utils';

export interface TeamProductionTotals {
  totalSubmittedApps: number;
  totalLives: number; // total_settled_apps
  totalAC: number; // total_agency_credits
  totalNSC: number; // total_net_sales_credits
}

interface ProductionMetricCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  description: string;
  formatter?: (value: number) => string;
  isLoading?: boolean;
}

function ProductionMetricCard({
  title,
  value,
  icon,
  description,
  formatter = formatNumber,
  isLoading = false
}: ProductionMetricCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            <div className="h-8 bg-gray-200 dark:bg-gray-800 rounded animate-pulse"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded animate-pulse w-3/4"></div>
          </div>
        ) : (
          <>
            <div className="text-2xl font-bold">{formatter(value)}</div>
            <p className="text-xs text-muted-foreground">{description}</p>
          </>
        )}
      </CardContent>
    </Card>
  );
}

interface TeamProductionCardsProps {
  data: TeamProductionTotals | null;
  timeFrame: 'monthly' | 'annual';
  periodType: 'calendar' | 'systems';
  isLoading?: boolean;
}

export function TeamProductionCards({
  data,
  timeFrame,
  periodType,
  isLoading = false
}: TeamProductionCardsProps) {
  const totals = data || {
    totalSubmittedApps: 0,
    totalLives: 0,
    totalAC: 0,
    totalNSC: 0
  };

  const periodLabel = `${timeFrame} (${periodType})`;
  const teamLabel = "team and subordinates";

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <ProductionMetricCard
        title="Total Submitted"
        value={totals.totalSubmittedApps}
        icon={<FileText className="h-4 w-4 text-blue-500" />}
        description={`Submitted apps for ${teamLabel} - ${periodLabel}`}
        isLoading={isLoading}
      />

      <ProductionMetricCard
        title="Total Lives"
        value={totals.totalLives}
        icon={<UserCheck className="h-4 w-4 text-green-500" />}
        description={`Settled apps for ${teamLabel} - ${periodLabel}`}
        isLoading={isLoading}
      />

      <ProductionMetricCard
        title="Total AC"
        value={totals.totalAC}
        icon={<DollarSign className="h-4 w-4 text-purple-500" />}
        description={`Agency credits for ${teamLabel} - ${periodLabel}`}
        formatter={formatCurrency}
        isLoading={isLoading}
      />

      <ProductionMetricCard
        title="Total NSC"
        value={totals.totalNSC}
        icon={<TrendingUp className="h-4 w-4 text-orange-500" />}
        description={`Net sales credits for ${teamLabel} - ${periodLabel}`}
        formatter={formatCurrency}
        isLoading={isLoading}
      />
    </div>
  );
}