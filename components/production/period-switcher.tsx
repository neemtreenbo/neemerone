'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Settings } from 'lucide-react';
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
      <CardContent className="pt-6">
        <Tabs
          value={timeFrame}
          onValueChange={(value) => onTimeFrameChange(value as TimeFrame)}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="monthly" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Monthly
            </TabsTrigger>
            <TabsTrigger value="annual" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Annual
            </TabsTrigger>
          </TabsList>

          <TabsContent value="monthly" className="mt-6">
            <div className="space-y-6">
              {/* Enhanced Month and Year Selection */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 mb-4">
                  <Calendar className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    Select Period
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                      Month
                    </label>
                    <Select
                      value={selectedMonth.toString()}
                      onValueChange={(value) => onMonthChange(parseInt(value))}
                    >
                      <SelectTrigger className="h-11 border-2 border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 transition-colors focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                        <SelectValue placeholder="Select month" />
                      </SelectTrigger>
                      <SelectContent className="max-h-60">
                        {months.map((month) => (
                          <SelectItem
                            key={month.value}
                            value={month.value.toString()}
                            className="hover:bg-blue-50 dark:hover:bg-blue-900/20 focus:bg-blue-100 dark:focus:bg-blue-900/30"
                          >
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-xs font-semibold text-blue-700 dark:text-blue-300">
                                {month.value.toString().padStart(2, '0')}
                              </div>
                              {month.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                      Year
                    </label>
                    <Select
                      value={selectedYear.toString()}
                      onValueChange={(value) => onYearChange(parseInt(value))}
                    >
                      <SelectTrigger className="h-11 border-2 border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 transition-colors focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                        <SelectValue placeholder="Select year" />
                      </SelectTrigger>
                      <SelectContent className="max-h-60">
                        {years.map((year) => (
                          <SelectItem
                            key={year}
                            value={year.toString()}
                            className="hover:bg-blue-50 dark:hover:bg-blue-900/20 focus:bg-blue-100 dark:focus:bg-blue-900/30"
                          >
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-xs font-semibold text-gray-700 dark:text-gray-300">
                                {year.toString().slice(-2)}
                              </div>
                              {year}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Enhanced Period Type Selection */}
              <div className="space-y-4 border-t border-gray-100 dark:border-gray-800 pt-6">
                <div className="flex items-center gap-2">
                  <Settings className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    Period Type
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Button
                    variant={periodType === 'calendar' ? 'default' : 'outline'}
                    onClick={() => onPeriodTypeChange('calendar')}
                    className={cn(
                      'h-12 flex items-center justify-start gap-3 px-4 text-left transition-all',
                      periodType === 'calendar'
                        ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg scale-105'
                        : 'border-2 hover:border-blue-300 dark:hover:border-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/10'
                    )}
                  >
                    <div className={cn(
                      'w-8 h-8 rounded-lg flex items-center justify-center',
                      periodType === 'calendar'
                        ? 'bg-white/20'
                        : 'bg-blue-100 dark:bg-blue-900/30'
                    )}>
                      <Calendar className={cn(
                        'h-4 w-4',
                        periodType === 'calendar'
                          ? 'text-white'
                          : 'text-blue-600 dark:text-blue-400'
                      )} />
                    </div>
                    <span className="font-medium">Calendar</span>
                  </Button>

                  <Button
                    variant={periodType === 'systems' ? 'default' : 'outline'}
                    onClick={() => onPeriodTypeChange('systems')}
                    className={cn(
                      'h-12 flex items-center justify-start gap-3 px-4 text-left transition-all',
                      periodType === 'systems'
                        ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg scale-105'
                        : 'border-2 hover:border-blue-300 dark:hover:border-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/10'
                    )}
                  >
                    <div className={cn(
                      'w-8 h-8 rounded-lg flex items-center justify-center',
                      periodType === 'systems'
                        ? 'bg-white/20'
                        : 'bg-emerald-100 dark:bg-emerald-900/30'
                    )}>
                      <Settings className={cn(
                        'h-4 w-4',
                        periodType === 'systems'
                          ? 'text-white'
                          : 'text-emerald-600 dark:text-emerald-400'
                      )} />
                    </div>
                    <span className="font-medium">Systems</span>
                  </Button>
                </div>

                <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                  <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                    <span className="font-medium">
                      {periodType === 'calendar' ? 'Calendar:' : 'Systems:'}
                    </span>{' '}
                    {periodType === 'calendar'
                      ? 'Standard calendar months (1st to last day of month)'
                      : 'Systems closing periods (custom Sun Life closing dates)'}
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="annual" className="mt-6">
            <div className="space-y-6">
              {/* Enhanced Year Selection */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 mb-4">
                  <Calendar className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    Select Year
                  </h3>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                    Year
                  </label>
                  <div className="w-full sm:w-48">
                    <Select
                      value={selectedYear.toString()}
                      onValueChange={(value) => onYearChange(parseInt(value))}
                    >
                      <SelectTrigger className="h-11 border-2 border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-600 transition-colors focus:ring-2 focus:ring-purple-500 focus:border-purple-500">
                        <SelectValue placeholder="Select year" />
                      </SelectTrigger>
                      <SelectContent className="max-h-60">
                        {years.map((year) => (
                          <SelectItem
                            key={year}
                            value={year.toString()}
                            className="hover:bg-purple-50 dark:hover:bg-purple-900/20 focus:bg-purple-100 dark:focus:bg-purple-900/30"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-xs font-semibold text-purple-700 dark:text-purple-300">
                                {year.toString().slice(-2)}
                              </div>
                              <span className="font-medium">{year}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Enhanced Period Type Selection */}
              <div className="space-y-4 border-t border-gray-100 dark:border-gray-800 pt-6">
                <div className="flex items-center gap-2">
                  <Settings className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    Period Type
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Button
                    variant={periodType === 'calendar' ? 'default' : 'outline'}
                    onClick={() => onPeriodTypeChange('calendar')}
                    className={cn(
                      'h-12 flex items-center justify-start gap-3 px-4 text-left transition-all',
                      periodType === 'calendar'
                        ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg scale-105'
                        : 'border-2 hover:border-blue-300 dark:hover:border-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/10'
                    )}
                  >
                    <div className={cn(
                      'w-8 h-8 rounded-lg flex items-center justify-center',
                      periodType === 'calendar'
                        ? 'bg-white/20'
                        : 'bg-blue-100 dark:bg-blue-900/30'
                    )}>
                      <Calendar className={cn(
                        'h-4 w-4',
                        periodType === 'calendar'
                          ? 'text-white'
                          : 'text-blue-600 dark:text-blue-400'
                      )} />
                    </div>
                    <span className="font-medium">Calendar</span>
                  </Button>

                  <Button
                    variant={periodType === 'systems' ? 'default' : 'outline'}
                    onClick={() => onPeriodTypeChange('systems')}
                    className={cn(
                      'h-12 flex items-center justify-start gap-3 px-4 text-left transition-all',
                      periodType === 'systems'
                        ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg scale-105'
                        : 'border-2 hover:border-blue-300 dark:hover:border-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/10'
                    )}
                  >
                    <div className={cn(
                      'w-8 h-8 rounded-lg flex items-center justify-center',
                      periodType === 'systems'
                        ? 'bg-white/20'
                        : 'bg-emerald-100 dark:bg-emerald-900/30'
                    )}>
                      <Settings className={cn(
                        'h-4 w-4',
                        periodType === 'systems'
                          ? 'text-white'
                          : 'text-emerald-600 dark:text-emerald-400'
                      )} />
                    </div>
                    <span className="font-medium">Systems</span>
                  </Button>
                </div>

                <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                  <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                    <span className="font-medium">
                      {periodType === 'calendar' ? 'Calendar:' : 'Systems:'}
                    </span>{' '}
                    {periodType === 'calendar'
                      ? 'Standard calendar year (January to December)'
                      : 'Systems fiscal year (custom Sun Life fiscal periods)'}
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}