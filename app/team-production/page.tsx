'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useTeamProductionQuery } from '@/hooks/useTeamProductionQuery';
import { TeamProductionCards } from '@/components/production/team-production-cards';
import { PeriodSwitcher } from '@/components/production/period-switcher';
import { IndividualProductionTable } from '@/components/production/individual-production-table';
import { BarChart3 } from 'lucide-react';

type PeriodType = 'calendar' | 'systems';
type TimeFrame = 'monthly' | 'annual';

export default function TeamProductionPage() {
  const [timeFrame, setTimeFrame] = useState<TimeFrame>('monthly');
  const [periodType, setPeriodType] = useState<PeriodType>('calendar');
  // Get current year and month as defaults
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  // State for selected month and year
  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonth);
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);

  // Fetch production data based on selected period
  const {
    data: productionData,
    isLoading: productionLoading,
    error: productionError,
    aggregatedTotals
  } = useTeamProductionQuery({
    timeFrame,
    periodType,
    year: selectedYear,
    month: timeFrame === 'monthly' ? selectedMonth : undefined
  });

  const isLoading = productionLoading;
  const error = productionError;

  if (error) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Team Production
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              View aggregated production metrics for your team
            </p>
          </div>
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-red-600 dark:text-red-400">
              Error loading data: {error.message}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <BarChart3 className="h-6 w-6" />
            Team Production
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            View aggregated production metrics for your team
          </p>
        </div>
      </div>

      {/* Period Switcher */}
      <PeriodSwitcher
        timeFrame={timeFrame}
        periodType={periodType}
        selectedMonth={selectedMonth}
        selectedYear={selectedYear}
        onTimeFrameChange={setTimeFrame}
        onPeriodTypeChange={setPeriodType}
        onMonthChange={setSelectedMonth}
        onYearChange={setSelectedYear}
      />

      {/* Production Metrics Cards */}
      <TeamProductionCards
        data={aggregatedTotals}
        timeFrame={timeFrame}
        periodType={periodType}
        isLoading={productionLoading}
      />

      {/* Individual Production Data Table */}
      <IndividualProductionTable
        productionData={productionData || []}
        manpowerData={[]}
        isLoading={productionLoading}
        timeFrame={timeFrame}
        periodType={periodType}
      />

    </div>
  );
}