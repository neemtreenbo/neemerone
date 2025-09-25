'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Upload, Eye, AlertTriangle, CheckCircle } from 'lucide-react';

interface DataPreviewTableProps {
  data: Record<string, unknown>[];
  title: string;
  onUpload: () => void;
  isUploading: boolean;
  isValidData: boolean;
  maxRows?: number;
}

export function DataPreviewTable({
  data,
  title,
  onUpload,
  isUploading,
  isValidData,
  maxRows = 10
}: DataPreviewTableProps) {
  if (!data || data.length === 0) {
    return null;
  }

  const displayData = data.slice(0, maxRows);
  const hasMoreData = data.length > maxRows;

  // Get all unique keys from data (excluding rowIndex and errors)
  const allKeys = Array.from(
    new Set(
      data.flatMap(item =>
        Object.keys(item).filter(key => key !== 'rowIndex' && key !== 'errors')
      )
    )
  );

  const formatCellValue = (value: unknown) => {
    if (value === null || value === undefined || value === '') {
      return <span className="text-gray-400">-</span>;
    }
    if (typeof value === 'number') {
      return value.toLocaleString();
    }
    return String(value);
  };

  const getRowStatus = (item: Record<string, unknown>) => {
    if (item.errors && Array.isArray(item.errors) && item.errors.length > 0) {
      return 'error';
    }
    return 'success';
  };

  const validRows = data.filter(item => !item.errors || !Array.isArray(item.errors) || item.errors.length === 0).length;
  const errorRows = data.length - validRows;

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="flex items-center space-x-2">
              <Eye className="h-5 w-5 text-gray-500" />
              <span>{title}</span>
            </CardTitle>
            <CardDescription>
              Preview of parsed data. Review before uploading.
              {hasMoreData && ` Showing first ${maxRows} of ${data.length} rows.`}
            </CardDescription>
          </div>

          <div className="flex items-center space-x-2">
            {validRows > 0 && (
              <Badge variant="default" className="flex items-center space-x-1">
                <CheckCircle className="h-3 w-3" />
                <span>{validRows} valid</span>
              </Badge>
            )}
            {errorRows > 0 && (
              <Badge variant="destructive" className="flex items-center space-x-1">
                <AlertTriangle className="h-3 w-3" />
                <span>{errorRows} errors</span>
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Data Table */}
        <ScrollArea className="w-full">
          <div className="min-w-full">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  {allKeys.map((key) => (
                    <TableHead key={key} className="whitespace-nowrap">
                      {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </TableHead>
                  ))}
                  <TableHead className="w-20">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayData.map((item, index) => {
                  const status = getRowStatus(item);
                  return (
                    <TableRow
                      key={index}
                      className={status === 'error' ? 'bg-red-50 dark:bg-red-950' : ''}
                    >
                      <TableCell className="font-mono text-sm">
                        {(typeof item.rowIndex === 'number' ? item.rowIndex : index + 1)}
                      </TableCell>
                      {allKeys.map((key) => (
                        <TableCell key={key} className="max-w-[200px] truncate">
                          {formatCellValue(item[key])}
                        </TableCell>
                      ))}
                      <TableCell>
                        {status === 'error' ? (
                          <Badge variant="destructive" className="text-xs">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Error
                          </Badge>
                        ) : (
                          <Badge variant="default" className="text-xs">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            OK
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>

        {/* Error Details */}
        {errorRows > 0 && (
          <div className="p-4 bg-red-50 dark:bg-red-950 rounded-lg border border-red-200 dark:border-red-800">
            <h4 className="text-sm font-medium text-red-900 dark:text-red-100 mb-2">
              Rows with errors:
            </h4>
            <div className="space-y-2 text-sm text-red-800 dark:text-red-200">
              {data
                .filter(item => item.errors && Array.isArray(item.errors) && item.errors.length > 0)
                .slice(0, 5)
                .map((item, index) => (
                  <div key={index} className="font-mono">
                    Row {typeof item.rowIndex === 'number' ? item.rowIndex : 'N/A'}: {Array.isArray(item.errors) ? item.errors.join(', ') : ''}
                  </div>
                ))}
              {errorRows > 5 && (
                <div className="text-red-600 dark:text-red-400">
                  ... and {errorRows - 5} more rows with errors
                </div>
              )}
            </div>
          </div>
        )}

        {/* Upload Button */}
        <div className="flex justify-end pt-4">
          <Button
            onClick={onUpload}
            disabled={!isValidData || isUploading || validRows === 0}
            className="flex items-center space-x-2"
          >
            <Upload className="h-4 w-4" />
            <span>
              {isUploading ? 'Uploading...' : `Upload ${validRows} Record${validRows !== 1 ? 's' : ''}`}
            </span>
          </Button>
        </div>

        {!isValidData && (
          <p className="text-sm text-gray-500 text-center">
            Fix all errors before uploading data.
          </p>
        )}
      </CardContent>
    </Card>
  );
}