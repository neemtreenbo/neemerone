'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { TrendingUp, AlertCircle, CheckCircle, Trash2, Copy, Plus, RotateCcw, AlertTriangle } from 'lucide-react';
import { DataPreviewTable } from '../data-preview-table';
import { detectDataSchema, isSchemaCompatible, getCorrectUploadSuggestion } from '@/lib/upload-schema-detector';

interface ParsedFYCommission {
  code?: string;
  process_date?: string;
  insured_name?: string;
  policy_number?: string;
  transaction_type?: string;
  fy_premium_php?: number;
  due_date?: string;
  rate?: number;
  fy_commission_php?: number;
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

export function FYCommissionUpload() {
  const [pasteData, setPasteData] = useState('');
  const [parsedData, setParsedData] = useState<ParsedFYCommission[]>([]);
  const [isValidData, setIsValidData] = useState(false);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResponse | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [schemaWarning, setSchemaWarning] = useState<string | null>(null);
  const [showSchemaConfirmDialog, setShowSchemaConfirmDialog] = useState(false);

  const expectedColumns = [
    { key: 'code', label: 'Advisor Code', required: true },
    { key: 'process_date', label: 'Process Date (Month DD, YYYY)', required: false },
    { key: 'insured_name', label: 'Insured Name', required: false },
    { key: 'policy_number', label: 'Policy Number', required: false },
    { key: 'transaction_type', label: 'Transaction Type', required: false },
    { key: 'fy_premium_php', label: 'FY Premium (PHP)', required: false },
    { key: 'due_date', label: 'Due Date (Month DD, YYYY)', required: false },
    { key: 'rate', label: 'Commission Rate (decimal)', required: false },
    { key: 'fy_commission_php', label: 'FY Commission (PHP)', required: false }
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
      setSchemaWarning(null);
      return;
    }

    const lines = data.trim().split('\n');
    if (lines.length < 2) {
      setParseErrors(['Data must include at least headers and one data row']);
      setParsedData([]);
      setIsValidData(false);
      setSchemaWarning(null);
      return;
    }

    const headers = lines[0].split('\t').map(h => h.trim().toLowerCase());
    const dataRows = lines.slice(1);
    const errors: string[] = [];
    const parsed: ParsedFYCommission[] = [];

    // Detect data schema to prevent wrong table uploads
    const schemaDetection = detectDataSchema(headers);
    const compatibility = isSchemaCompatible(schemaDetection.detectedSchema, 'fy_commission', schemaDetection.confidence);

    if (!compatibility.compatible && compatibility.warning) {
      setSchemaWarning(compatibility.warning + ' ' + getCorrectUploadSuggestion(schemaDetection.detectedSchema));
    } else {
      setSchemaWarning(null);
    }

    // Map headers to expected columns (exact mapping for the Excel format)
    const columnMapping: Record<string, number> = {};

    // Find exact column positions based on expected Excel headers
    const headerMappings = {
      code: ['advisor code'],
      process_date: ['process date'],
      insured_name: ['insured name'],
      policy_number: ['policy number'],
      transaction_type: ['transaction type'],
      fy_premium_php: ['fy premium (php)'],
      due_date: ['due date'],
      rate: ['rate'],
      fy_commission_php: ['fy commission (php)']
    };

    Object.entries(headerMappings).forEach(([key, possibleHeaders]) => {
      let headerIndex = -1;

      // For 'rate' field, match exactly to avoid confusion with 'conversion rate'
      if (key === 'rate') {
        headerIndex = headers.findIndex(h => h === 'rate');
      } else {
        headerIndex = headers.findIndex(h =>
          possibleHeaders.some(ph => h.includes(ph))
        );
      }

      if (headerIndex !== -1) {
        columnMapping[key] = headerIndex;
      }
    });

    // Debug: Log column mapping and headers for troubleshooting
    console.log('FY Commission Headers detected:', headers);
    console.log('FY Commission Column mapping:', columnMapping);

    dataRows.forEach((row, index) => {
      const cells = row.split('\t');
      const rowErrors: string[] = [];

      const item: ParsedFYCommission = {
        rowIndex: index + 2
      };

      // Parse code (required) - remove leading zeros to match manpower table
      if (columnMapping.code !== undefined) {
        const value = cells[columnMapping.code]?.trim();
        if (value) {
          // Remove leading zeros from advisor code (091395 -> 91395)
          item.code = value.replace(/^0+/, '') || '0'; // Keep at least one zero if all zeros
        } else {
          rowErrors.push('Advisor Code is required');
        }
      } else {
        rowErrors.push('Advisor Code column not found');
      }

      // Parse process_date with new format
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

      // Parse transaction_type
      if (columnMapping.transaction_type !== undefined) {
        const value = cells[columnMapping.transaction_type]?.trim();
        if (value) item.transaction_type = value;
      }

      // Parse fy_premium_php (currency format, supports negative values in parentheses)
      if (columnMapping.fy_premium_php !== undefined) {
        const value = cells[columnMapping.fy_premium_php]?.trim();
        if (value) {
          const numValue = parseCurrencyString(value);
          if (numValue === null) {
            rowErrors.push('FY Premium (PHP) must be a valid number (currency format accepted, negatives in parentheses)');
          } else {
            item.fy_premium_php = numValue;
          }
        }
      }

      // Parse due_date with new format
      if (columnMapping.due_date !== undefined) {
        const value = cells[columnMapping.due_date]?.trim();
        if (value) {
          // Try to parse date from "Month DD, YYYY" format
          const parsedDate = parseDateString(value);
          if (parsedDate) {
            item.due_date = parsedDate;
          } else {
            rowErrors.push('Due Date must be in "Month DD, YYYY" format (e.g., "September 24, 2025")');
          }
        }
      }

      // Parse rate (decimal format)
      if (columnMapping.rate !== undefined) {
        const value = cells[columnMapping.rate]?.trim();
        if (value && value !== '-' && value !== '') {
          // Handle different rate formats - remove any non-numeric characters except decimal point
          const cleanValue = value.replace(/[^\d.-]/g, '');
          const numValue = parseFloat(cleanValue);

          if (isNaN(numValue) || numValue < 0) {
            rowErrors.push(`Rate must be a positive decimal number (got: "${value}", cleaned: "${cleanValue}")`);
          } else {
            item.rate = numValue;
          }
        }
      } else {
        rowErrors.push('Rate column not found in headers');
      }

      // Parse fy_commission_php (currency format, supports negative values in parentheses)
      if (columnMapping.fy_commission_php !== undefined) {
        const value = cells[columnMapping.fy_commission_php]?.trim();
        if (value) {
          const numValue = parseCurrencyString(value);
          if (numValue === null) {
            rowErrors.push('FY Commission (PHP) must be a valid number (currency format accepted, negatives in parentheses)');
          } else {
            item.fy_commission_php = numValue;
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

    // Block upload if schema is incompatible
    const hasSchemaIssue = !compatibility.compatible && compatibility.warning;
    setIsValidData(errors.length === 0 && parsed.length > 0 && !hasSchemaIssue);
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
    setSchemaWarning(null);
    setShowSchemaConfirmDialog(false);
  };

  const copyStatsToClipboard = async () => {
    if (!uploadResult) return;

    const statsText = `FY Commission Upload Results:
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
          code: record.code!,
          process_date: record.process_date,
          insured_name: record.insured_name,
          policy_number: record.policy_number,
          transaction_type: record.transaction_type,
          fy_premium_php: record.fy_premium_php,
          due_date: record.due_date,
          rate: record.rate,
          fy_commission_php: record.fy_commission_php
        }));

      const response = await fetch('/api/admin/upload/fy-commission', {
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
            <TrendingUp className="h-5 w-5 text-purple-500" />
            <span>First Year Commission Import</span>
          </CardTitle>
          <CardDescription>
            Import first year commission data from Excel. Include advisor codes, premiums, and commission details.
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
            <p className="text-xs text-gray-500 mt-2">
              * Commission rate should be decimal format (e.g., 0.15 for 15%)
            </p>
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

      {/* Schema Error - Blocks Upload */}
      {schemaWarning && (
        <Alert variant="destructive" className="border-red-600 bg-red-50 dark:bg-red-950/50">
          <AlertTriangle className="h-5 w-5 text-red-600" />
          <AlertDescription>
            <div className="space-y-3">
              <div className="font-bold text-red-800 dark:text-red-200 text-lg">
                🚫 UPLOAD BLOCKED - Wrong Data Type
              </div>
              <div className="font-medium text-red-700 dark:text-red-300">
                {schemaWarning}
              </div>
              <div className="text-sm text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30 p-3 rounded-lg border border-red-300 dark:border-red-700">
                <strong>Upload is disabled</strong> to prevent data corruption. Please use the correct upload page for your data type.
              </div>
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

      {parsedData.length > 0 && (
        <DataPreviewTable
          data={parsedData as unknown as Record<string, unknown>[]}
          title="First Year Commission Preview"
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
              Your first year commission data has been uploaded successfully.
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