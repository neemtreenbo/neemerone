'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Database, AlertCircle, CheckCircle, Trash2, Copy, Plus, RotateCcw, TrendingUp } from 'lucide-react';
import { DataPreviewTable } from '../data-preview-table';

interface ParsedSettledApp {
  advisor_code?: string;
  advisor_name?: string;
  process_date?: string;
  insured_name?: string;
  policy_number?: string;
  settled_apps?: number;
  agency_credits?: number;
  net_sales_credits?: number;
  rowIndex: number;
  errors?: string[];
}

interface UploadResponse {
  success: boolean;
  message: string;
  stats: {
    recordsProcessed: number;
    recordsInserted: number;
    recordsUpdated: number;
    errors: number;
  };
  errors?: string[];
}

export function SettledAppsUpload() {
  const [pasteData, setPasteData] = useState('');
  const [parsedData, setParsedData] = useState<ParsedSettledApp[]>([]);
  const [isValidData, setIsValidData] = useState(false);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResponse | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);

  const expectedColumns = [
    { key: 'advisor_code', label: 'Advisor Code', required: true },
    { key: 'advisor_name', label: 'Advisor Name', required: false },
    { key: 'process_date', label: 'Process Date (Month DD, YYYY)', required: false },
    { key: 'insured_name', label: 'Insured Name', required: false },
    { key: 'policy_number', label: 'Policy Number', required: false },
    { key: 'settled_apps', label: 'Settled Apps', required: false },
    { key: 'agency_credits', label: 'Agency Credits', required: false },
    { key: 'net_sales_credits', label: 'Net Sales Credits', required: false }
  ];

  // Helper function to parse date from "Month DD, YYYY" format to "YYYY-MM-DD"
  const parseDateString = (dateStr: string): string | null => {
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) {
        return null;
      }
      return date.toISOString().split('T')[0]; // Returns YYYY-MM-DD format
    } catch {
      return null;
    }
  };

  // Helper function to parse currency string (removes commas and converts to number)
  // Handles negative values in parentheses format: (1.0) = -1.0
  const parseCurrencyString = (currencyStr: string): number | null => {
    try {
      let cleanStr = currencyStr.trim();
      let isNegative = false;

      // Check for parentheses notation (negative values)
      if (cleanStr.startsWith('(') && cleanStr.endsWith(')')) {
        isNegative = true;
        cleanStr = cleanStr.slice(1, -1).trim(); // Remove parentheses
      }

      // Remove commas and any currency symbols
      cleanStr = cleanStr.replace(/[,\$₱]/g, '').trim();

      const num = parseFloat(cleanStr);
      if (isNaN(num)) return null;

      return isNegative ? -num : num;
    } catch {
      return null;
    }
  };

  const parseExcelData = (data: string) => {
    if (!data.trim()) {
      setParsedData([]);
      setIsValidData(false);
      setParseErrors([]);
      return;
    }

    const lines = data.trim().split('\n');
    if (lines.length < 2) {
      setParseErrors(['Data must include at least headers and one data row']);
      setParsedData([]);
      setIsValidData(false);
      return;
    }

    const headers = lines[0].split('\t').map(h => h.trim().toLowerCase());
    const dataRows = lines.slice(1);
    const errors: string[] = [];
    const parsed: ParsedSettledApp[] = [];

    // Map headers to expected columns (exact mapping for the Excel format)
    const columnMapping: Record<string, number> = {};

    // Find exact column positions based on expected Excel headers
    const headerMappings = {
      advisor_code: ['advisor code'],
      advisor_name: ['advisor name'],
      process_date: ['process date'],
      insured_name: ['insured name'],
      policy_number: ['policy number'],
      settled_apps: ['settled apps'],
      agency_credits: ['agency credits'],
      net_sales_credits: ['net sales credits']
    };

    Object.entries(headerMappings).forEach(([key, possibleHeaders]) => {
      const headerIndex = headers.findIndex(h =>
        possibleHeaders.some(ph => h.includes(ph))
      );
      if (headerIndex !== -1) {
        columnMapping[key] = headerIndex;
      }
    });

    dataRows.forEach((row, index) => {
      const cells = row.split('\t');
      const rowErrors: string[] = [];

      const item: ParsedSettledApp = {
        rowIndex: index + 2
      };

      // Parse advisor_code (required) - remove leading zeros to match manpower table
      if (columnMapping.advisor_code !== undefined) {
        const value = cells[columnMapping.advisor_code]?.trim();
        if (value) {
          // Remove leading zeros from advisor code (091395 -> 91395)
          item.advisor_code = value.replace(/^0+/, '') || '0'; // Keep at least one zero if all zeros
        } else {
          rowErrors.push('Advisor Code is required');
        }
      } else {
        rowErrors.push('Advisor Code column not found');
      }

      // Parse advisor_name
      if (columnMapping.advisor_name !== undefined) {
        const value = cells[columnMapping.advisor_name]?.trim();
        if (value) item.advisor_name = value;
      }

      // Parse date field with new format
      if (columnMapping.process_date !== undefined) {
        const value = cells[columnMapping.process_date]?.trim();
        if (value) {
          // Try to parse date from "Month DD, YYYY" format
          const parsedDate = parseDateString(value);
          if (parsedDate) {
            item.process_date = parsedDate;
          } else {
            rowErrors.push('Process Date must be in "Month DD, YYYY" format (e.g., "September 24, 2025")');
          }
        }
      }

      // Parse insured_name
      if (columnMapping.insured_name !== undefined) {
        const value = cells[columnMapping.insured_name]?.trim();
        if (value) item.insured_name = value;
      }

      // Parse policy_number
      if (columnMapping.policy_number !== undefined) {
        const value = cells[columnMapping.policy_number]?.trim();
        if (value) item.policy_number = value;
      }

      // Parse settled_apps (regular number)
      if (columnMapping.settled_apps !== undefined) {
        const value = cells[columnMapping.settled_apps]?.trim();
        if (value) {
          const numValue = parseFloat(value);
          if (isNaN(numValue) || numValue < 0) {
            rowErrors.push('Settled Apps must be a positive number');
          } else {
            item.settled_apps = numValue;
          }
        }
      }

      // Parse agency_credits (currency format, supports negative values in parentheses)
      if (columnMapping.agency_credits !== undefined) {
        const value = cells[columnMapping.agency_credits]?.trim();
        if (value) {
          const numValue = parseCurrencyString(value);
          if (numValue === null) {
            rowErrors.push('Agency Credits must be a valid number (currency format accepted, negatives in parentheses)');
          } else {
            item.agency_credits = numValue;
          }
        }
      }

      // Parse net_sales_credits (currency format, supports negative values in parentheses)
      if (columnMapping.net_sales_credits !== undefined) {
        const value = cells[columnMapping.net_sales_credits]?.trim();
        if (value) {
          const numValue = parseCurrencyString(value);
          if (numValue === null) {
            rowErrors.push('Net Sales Credits must be a valid number (currency format accepted, negatives in parentheses)');
          } else {
            item.net_sales_credits = numValue;
          }
        }
      }

      if (rowErrors.length > 0) {
        item.errors = rowErrors;
        errors.push(`Row ${index + 2}: ${rowErrors.join(', ')}`);
      }

      parsed.push(item);
    });

    setParsedData(parsed);
    setParseErrors(errors);
    setIsValidData(errors.length === 0 && parsed.length > 0);
  };

  const handlePaste = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const data = e.target.value;
    setPasteData(data);
    parseExcelData(data);
  };

  const clearData = () => {
    setPasteData('');
    setParsedData([]);
    setIsValidData(false);
    setParseErrors([]);
    setUploadResult(null);
    setUploadError(null);
    setShowSuccessDialog(false);
  };

  const copyStatsToClipboard = async () => {
    if (!uploadResult) return;

    const statsText = `Settled Apps Upload Results:
• Records processed: ${uploadResult.stats.recordsProcessed}
• Records inserted: ${uploadResult.stats.recordsInserted}
• Records updated (duplicates): ${uploadResult.stats.recordsUpdated}
• Errors: ${uploadResult.stats.errors}`;

    try {
      await navigator.clipboard.writeText(statsText);
    } catch (err) {
      console.error('Failed to copy stats:', err);
    }
  };

  const handleUploadMore = () => {
    clearData();
  };

  const handleCloseDialog = () => {
    setShowSuccessDialog(false);
  };

  const handleUpload = async () => {
    if (!isValidData || parsedData.length === 0) return;

    setIsUploading(true);
    setUploadError(null);
    setUploadResult(null);

    try {
      // Filter out valid records only (those without errors)
      const validRecords = parsedData
        .filter(record => !record.errors || record.errors.length === 0)
        .map(record => ({
          advisor_code: record.advisor_code!,
          advisor_name: record.advisor_name,
          process_date: record.process_date,
          insured_name: record.insured_name,
          policy_number: record.policy_number,
          settled_apps: record.settled_apps,
          agency_credits: record.agency_credits,
          net_sales_credits: record.net_sales_credits
        }));

      const response = await fetch('/api/admin/upload/settled-apps', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ data: validRecords }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Upload failed');
      }

      setUploadResult(result);

      // Show success dialog instead of auto-clearing
      if (result.success) {
        setShowSuccessDialog(true);
      }
    } catch (error) {
      console.error('Upload error:', error);
      setUploadError(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Database className="h-5 w-5 text-green-500" />
            <span>Settled Applications Import</span>
          </CardTitle>
          <CardDescription>
            Import settled application data with agency credits and net sales credits from Excel.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <h4 className="text-sm font-medium mb-2">Expected Columns:</h4>
            <div className="flex flex-wrap gap-2">
              {expectedColumns.map((col) => (
                <Badge
                  key={col.key}
                  variant={col.required ? "default" : "secondary"}
                  className="text-xs"
                >
                  {col.label} {col.required && '*'}
                </Badge>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <Textarea
              placeholder="Paste your Excel data here..."
              value={pasteData}
              onChange={handlePaste}
              className="min-h-[200px] font-mono text-sm"
            />

            {pasteData && (
              <div className="flex justify-between items-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearData}
                  className="flex items-center space-x-2"
                >
                  <Trash2 className="h-4 w-4" />
                  <span>Clear Data</span>
                </Button>

                {parsedData.length > 0 && (
                  <Badge variant="outline">
                    {parsedData.length} row{parsedData.length !== 1 ? 's' : ''} parsed
                  </Badge>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {parseErrors.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-1">
              <div>Found {parseErrors.length} error{parseErrors.length !== 1 ? 's' : ''}:</div>
              <ul className="list-disc list-inside text-sm">
                {parseErrors.slice(0, 5).map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
                {parseErrors.length > 5 && (
                  <li>... and {parseErrors.length - 5} more errors</li>
                )}
              </ul>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {isValidData && parsedData.length > 0 && !uploadResult && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            Data parsed successfully! {parsedData.length} record{parsedData.length !== 1 ? 's' : ''} ready for upload.
          </AlertDescription>
        </Alert>
      )}

      {/* Upload Error */}
      {uploadError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Upload failed: {uploadError}
          </AlertDescription>
        </Alert>
      )}


      {/* Data Preview */}
      {parsedData.length > 0 && (
        <DataPreviewTable
          data={parsedData as unknown as Record<string, unknown>[]}
          title="Settled Applications Preview"
          onUpload={handleUpload}
          isUploading={isUploading}
          isValidData={isValidData}
        />
      )}

      {/* Success Dialog */}
      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <CheckCircle className="h-6 w-6 text-green-500" />
              <span>Upload Successful!</span>
            </DialogTitle>
            <DialogDescription>
              Your settled applications data has been uploaded successfully.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="text-center space-y-3">
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div className="flex items-center space-x-2">
                  <Plus className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium">New Records</span>
                </div>
                <span className="text-lg font-bold text-green-600">
                  {uploadResult?.stats.recordsInserted || 0}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center space-x-2">
                  <RotateCcw className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium">Updated (Duplicates)</span>
                </div>
                <span className="text-lg font-bold text-blue-600">
                  {uploadResult?.stats.recordsUpdated || 0}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="h-4 w-4 text-gray-600" />
                  <span className="text-sm font-medium">Total Processed</span>
                </div>
                <span className="text-lg font-bold text-gray-600">
                  {uploadResult?.stats.recordsProcessed || 0}
                </span>
              </div>

              {(uploadResult?.stats.errors || 0) > 0 && (
                <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <AlertCircle className="h-4 w-4 text-red-600" />
                    <span className="text-sm font-medium">Errors</span>
                  </div>
                  <span className="text-lg font-bold text-red-600">
                    {uploadResult?.stats.errors}
                  </span>
                </div>
              )}
            </div>

            {uploadResult?.errors && uploadResult.errors.length > 0 && (
              <details className="text-sm">
                <summary className="cursor-pointer text-red-600 mb-2">View Error Details</summary>
                <div className="bg-red-50 p-3 rounded-lg max-h-32 overflow-y-auto">
                  <ul className="list-disc list-inside space-y-1">
                    {uploadResult.errors.slice(0, 5).map((error, index) => (
                      <li key={index} className="text-red-600 text-xs">{error}</li>
                    ))}
                    {uploadResult.errors.length > 5 && (
                      <li className="text-red-600 text-xs">... and {uploadResult.errors.length - 5} more errors</li>
                    )}
                  </ul>
                </div>
              </details>
            )}
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={copyStatsToClipboard} className="flex items-center space-x-2">
              <Copy className="h-4 w-4" />
              <span>Copy Stats</span>
            </Button>
            <div className="flex space-x-2">
              <Button variant="outline" onClick={handleCloseDialog}>
                Close
              </Button>
              <Button onClick={handleUploadMore} className="flex items-center space-x-2">
                <Plus className="h-4 w-4" />
                <span>Upload More</span>
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}