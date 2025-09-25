'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { 
  Trash2, 
  AlertTriangle, 
  CheckCircle, 
  FileSpreadsheet, 
  Database, 
  TrendingUp,
  RefreshCw 
} from 'lucide-react';

interface TableStatistics {
  total_records: number;
  duplicate_records: number;
  unique_records: number;
  error?: string;
}

interface DuplicateStats {
  [tableName: string]: TableStatistics;
}

interface RemovalResult {
  [tableName: string]: {
    duplicates_removed: number;
    success: boolean;
    error?: string;
  };
}

interface RemovalResponse {
  success: boolean;
  action: 'preview' | 'remove';
  tables: string[];
  statistics?: DuplicateStats;
  total_duplicates_removed?: number;
  tables_processed?: number;
  table_results?: RemovalResult;
  errors?: string[];
}

const tableConfig = {
  'submitted_apps_details': {
    label: 'Submitted Apps',
    icon: FileSpreadsheet,
    color: 'bg-blue-500'
  },
  'settled_apps_details': {
    label: 'Settled Apps', 
    icon: Database,
    color: 'bg-green-500'
  },
  'fy_commission_details': {
    label: 'FY Commission',
    icon: TrendingUp,
    color: 'bg-purple-500'
  },
  'rn_commission_details': {
    label: 'RN Commission',
    icon: TrendingUp,
    color: 'bg-orange-500'
  }
};

export function DuplicateRemoval() {
  const [selectedTables, setSelectedTables] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [statistics, setStatistics] = useState<DuplicateStats | null>(null);
  const [removalResults, setRemovalResults] = useState<RemovalResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const allTables = Object.keys(tableConfig);

  const handleTableSelection = (tableName: string) => {
    setSelectedTables(prev => 
      prev.includes(tableName) 
        ? prev.filter(t => t !== tableName)
        : [...prev, tableName]
    );
  };

  const selectAllTables = () => {
    setSelectedTables(allTables);
  };

  const clearSelection = () => {
    setSelectedTables([]);
  };

  const previewDuplicates = async () => {
    if (selectedTables.length === 0) {
      setError('Please select at least one table');
      return;
    }

    setIsLoading(true);
    setError(null);
    setStatistics(null);
    setRemovalResults(null);

    try {
      const response = await fetch('/api/admin/remove-duplicates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tables: selectedTables,
          action: 'preview'
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const result: RemovalResponse = await response.json();
      setStatistics(result.statistics || {});
      
    } catch (err) {
      console.error('Preview duplicates error:', err);
      setError(err instanceof Error ? err.message : 'Failed to preview duplicates');
    } finally {
      setIsLoading(false);
    }
  };

  const removeDuplicates = async () => {
    if (selectedTables.length === 0) {
      setError('Please select at least one table');
      return;
    }

    // Calculate total duplicates that will be removed
    const totalDuplicates = statistics ? 
      Object.values(statistics).reduce((sum, stat) => sum + (stat.duplicate_records || 0), 0) : 0;

    if (totalDuplicates === 0) {
      setError('No duplicates found to remove. Please preview duplicates first.');
      return;
    }

    // Confirm the action
    const confirmed = window.confirm(
      `Are you sure you want to remove ${totalDuplicates} duplicate records from ${selectedTables.length} table(s)?\n\n` +
      'This action cannot be undone. The latest record (by created_at) will be kept for each duplicate group.'
    );

    if (!confirmed) {
      return;
    }

    setIsRemoving(true);
    setError(null);
    setRemovalResults(null);

    try {
      const response = await fetch('/api/admin/remove-duplicates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tables: selectedTables,
          action: 'remove'
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const result: RemovalResponse = await response.json();
      setRemovalResults(result);
      
      // Clear statistics to force a refresh if user wants to preview again
      setStatistics(null);
      
    } catch (err) {
      console.error('Remove duplicates error:', err);
      setError(err instanceof Error ? err.message : 'Failed to remove duplicates');
    } finally {
      setIsRemoving(false);
    }
  };

  const getTotalDuplicates = () => {
    if (!statistics) return 0;
    return Object.values(statistics).reduce((sum, stat) => sum + (stat.duplicate_records || 0), 0);
  };

  const getTotalRecords = () => {
    if (!statistics) return 0;
    return Object.values(statistics).reduce((sum, stat) => sum + (stat.total_records || 0), 0);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Trash2 className="h-5 w-5 text-red-500" />
          <span>Duplicate Data Cleanup</span>
        </CardTitle>
        <CardDescription>
          Remove duplicate records from commission tables. Latest records (by created_at) are preserved.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Table Selection */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">Select Tables to Clean</h4>
            <div className="space-x-2">
              <Button variant="outline" size="sm" onClick={selectAllTables}>
                Select All
              </Button>
              <Button variant="outline" size="sm" onClick={clearSelection}>
                Clear
              </Button>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            {allTables.map((tableName) => {
              const config = tableConfig[tableName as keyof typeof tableConfig];
              const Icon = config.icon;
              const isSelected = selectedTables.includes(tableName);
              
              return (
                <button
                  key={tableName}
                  onClick={() => handleTableSelection(tableName)}
                  className={`p-3 rounded-lg border-2 transition-all duration-200 text-left ${
                    isSelected 
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-950' 
                      : 'border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded ${config.color} text-white`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="font-medium">{config.label}</div>
                      <div className="text-xs text-gray-500">{tableName}</div>
                    </div>
                    {isSelected && (
                      <CheckCircle className="h-5 w-5 text-blue-500 ml-auto" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-4">
          <Button 
            onClick={previewDuplicates} 
            disabled={isLoading || selectedTables.length === 0}
            variant="outline"
            className="flex items-center space-x-2"
          >
            {isLoading ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <FileSpreadsheet className="h-4 w-4" />
            )}
            <span>{isLoading ? 'Analyzing...' : 'Preview Duplicates'}</span>
          </Button>
          
          <Button 
            onClick={removeDuplicates} 
            disabled={isRemoving || selectedTables.length === 0 || !statistics || getTotalDuplicates() === 0}
            variant="destructive"
            className="flex items-center space-x-2"
          >
            {isRemoving ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
            <span>{isRemoving ? 'Removing...' : 'Remove Duplicates'}</span>
          </Button>
        </div>

        {/* Error Display */}
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Statistics Display */}
        {statistics && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">Duplicate Analysis Results</h4>
              <div className="flex space-x-4 text-sm">
                <Badge variant="outline">
                  Total Records: {getTotalRecords()}
                </Badge>
                <Badge variant={getTotalDuplicates() > 0 ? "destructive" : "secondary"}>
                  Duplicates: {getTotalDuplicates()}
                </Badge>
              </div>
            </div>
            
            <div className="grid gap-3">
              {Object.entries(statistics).map(([tableName, stats]) => {
                const config = tableConfig[tableName as keyof typeof tableConfig];
                const Icon = config.icon;
                
                return (
                  <div key={tableName} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <Icon className="h-4 w-4" />
                        <span className="font-medium">{config.label}</span>
                      </div>
                      <div className="flex space-x-2 text-sm">
                        <Badge variant="outline">
                          Total: {stats.total_records}
                        </Badge>
                        <Badge variant={stats.duplicate_records > 0 ? "destructive" : "secondary"}>
                          Duplicates: {stats.duplicate_records}
                        </Badge>
                      </div>
                    </div>
                    
                    {stats.duplicate_records > 0 && (
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs text-gray-500">
                          <span>Cleanup Progress</span>
                          <span>{stats.duplicate_records} records will be removed</span>
                        </div>
                        <Progress 
                          value={(stats.duplicate_records / stats.total_records) * 100} 
                          className="h-2" 
                        />
                      </div>
                    )}
                    
                    {stats.error && (
                      <Alert variant="destructive" className="mt-2">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>{stats.error}</AlertDescription>
                      </Alert>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Removal Results Display */}
        {removalResults && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">Cleanup Results</h4>
              <Badge variant={removalResults.success ? "default" : "destructive"}>
                {removalResults.success ? 'Success' : 'Failed'}
              </Badge>
            </div>
            
            {removalResults.success && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  Successfully removed {removalResults.total_duplicates_removed} duplicate records 
                  from {removalResults.tables_processed} table(s).
                </AlertDescription>
              </Alert>
            )}
            
            {removalResults.table_results && (
              <div className="grid gap-3">
                {Object.entries(removalResults.table_results).map(([tableName, result]) => {
                  const config = tableConfig[tableName as keyof typeof tableConfig];
                  const Icon = config.icon;
                  
                  return (
                    <div key={tableName} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Icon className="h-4 w-4" />
                          <span className="font-medium">{config.label}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant={result.success ? "default" : "destructive"}>
                            {result.success ? 'Success' : 'Failed'}
                          </Badge>
                          {result.success && (
                            <Badge variant="outline">
                              Removed: {result.duplicates_removed}
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      {result.error && (
                        <Alert variant="destructive" className="mt-2">
                          <AlertTriangle className="h-4 w-4" />
                          <AlertDescription>{result.error}</AlertDescription>
                        </Alert>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            
            {removalResults.errors && removalResults.errors.length > 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <div>Errors occurred during cleanup:</div>
                  <ul className="mt-1 list-disc list-inside text-sm">
                    {removalResults.errors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}