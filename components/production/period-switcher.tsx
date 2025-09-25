'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

type PeriodType = 'calendar' | 'systems';
type TimeFrame = 'monthly' | 'annual';

interface PeriodSwitcherProps {
  timeFrame: TimeFrame;
  periodType: PeriodType;
  selectedMonth: number;
  selectedYear: number;
  onTimeFrameChange: (timeFrame: TimeFrame) => void;
  onPeriodTypeChange: (periodType: PeriodType) => void;
  onMonthChange: (month: number) => void;
  onYearChange: (year: number) => void;
}

export function PeriodSwitcher({
  timeFrame,
  periodType,
  selectedMonth,
  selectedYear,
  onTimeFrameChange,
  onPeriodTypeChange,
  onMonthChange,
  onYearChange
}: PeriodSwitcherProps) {

  // Generate month options
  const months = [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' }
  ];

  // Generate year options (last 3 years including current year)
  const currentYear = new Date().getFullYear();
  const years = [];
  for (let i = currentYear - 2; i <= currentYear; i++) {
    years.push(i);
  }
  return (
    <Card>
      <CardContent className="p-6">
        {/* Simple Inline Controls */}
        <div className="flex flex-wrap items-center gap-4">

          {/* Time Frame Toggle */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">View:</span>
            <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
              <button
                onClick={() => onTimeFrameChange('monthly')}
                className={cn(
                  'px-4 py-2 text-sm font-medium transition-colors',
                  timeFrame === 'monthly'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                )}
              >
                Monthly
              </button>
              <button
                onClick={() => onTimeFrameChange('annual')}
                className={cn(
                  'px-4 py-2 text-sm font-medium transition-colors border-l border-gray-200 dark:border-gray-700',
                  timeFrame === 'annual'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                )}
              >
                Annual
              </button>
            </div>
          </div>

          {/* Month Selector (only for monthly) */}
          {timeFrame === 'monthly' && (
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Month:</span>
              <Select
                value={selectedMonth.toString()}
                onValueChange={(value) => onMonthChange(parseInt(value))}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {months.map((month) => (
                    <SelectItem key={month.value} value={month.value.toString()}>
                      {month.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Year Selector */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Year:</span>
            <Select
              value={selectedYear.toString()}
              onValueChange={(value) => onYearChange(parseInt(value))}
            >
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {years.map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Period Type Toggle */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Type:</span>
            <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
              <button
                onClick={() => onPeriodTypeChange('calendar')}
                className={cn(
                  'px-3 py-2 text-sm font-medium transition-colors',
                  periodType === 'calendar'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                )}
              >
                Calendar
              </button>
              <button
                onClick={() => onPeriodTypeChange('systems')}
                className={cn(
                  'px-3 py-2 text-sm font-medium transition-colors border-l border-gray-200 dark:border-gray-700',
                  periodType === 'systems'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                )}
              >
                Systems
              </button>
            </div>
          </div>

        </div>
      </CardContent>
    </Card>
  );
}