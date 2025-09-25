'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { TrendingUp, AlertCircle, CheckCircle, Trash2 } from 'lucide-react';
import { DataPreviewTable } from '../data-preview-table';

interface ParsedRNCommission {
  code?: string;
  process_date?: string;
  insured_name?: string;
  policy_number?: string;
  transaction_type?: string;
  rn_premium_php?: number;
  due_date?: string;
  rate?: number;
  year?: number;
  rn_commission_php?: number;
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

export function RNCommissionUpload() {
  const [pasteData, setPasteData] = useState('');
  const [parsedData, setParsedData] = useState<ParsedRNCommission[]>([]);
  const [isValidData, setIsValidData] = useState(false);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResponse | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const expectedColumns = [
    { key: 'code', label: 'Advisor Code', required: true },
    { key: 'process_date', label: 'Process Date (Month DD, YYYY)', required: false },
    { key: 'insured_name', label: 'Insured Name', required: false },
    { key: 'policy_number', label: 'Policy Number', required: false },
    { key: 'transaction_type', label: 'Transaction Type', required: false },
    { key: 'rn_premium_php', label: 'RN Premium (PHP)', required: false },
    { key: 'due_date', label: 'Due Date (Month DD, YYYY)', required: false },
    { key: 'rate', label: 'Commission Rate (decimal)', required: false },
    { key: 'year', label: 'Year', required: false },
    { key: 'rn_commission_php', label: 'RN Commission (PHP)', required: false }
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
    const parsed: ParsedRNCommission[] = [];

    // Map headers to expected columns (exact mapping for the Excel format)
    const columnMapping: Record<string, number> = {};

    // Find exact column positions based on expected Excel headers
    const headerMappings = {
      code: ['advisor code'],
      process_date: ['process date'],
      insured_name: ['insured name'],
      policy_number: ['policy number'],
      transaction_type: ['transaction type'],
      rn_premium_php: ['rn premium (php)'],
      due_date: ['due date'],
      rate: ['rate'],
      year: ['year'],
      rn_commission_php: ['rn commission (php)']
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
    console.log('RN Commission Headers detected:', headers);
    console.log('RN Commission Column mapping:', columnMapping);

    dataRows.forEach((row, index) => {
      const cells = row.split('\t');
      const rowErrors: string[] = [];

      const item: ParsedRNCommission = {
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

      // Parse rn_premium_php (currency format, allows negative values in parentheses and zero)
      if (columnMapping.rn_premium_php !== undefined) {
        const value = cells[columnMapping.rn_premium_php]?.trim();
        if (value) {
          const numValue = parseCurrencyString(value);
          if (numValue === null) {
            rowErrors.push('RN Premium (PHP) must be a valid number (currency format accepted, negatives in parentheses)');
          } else {
            item.rn_premium_php = numValue;
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
          let numValue = parseFloat(cleanValue);

          if (isNaN(numValue) || numValue < 0) {
            rowErrors.push(`Rate must be a positive decimal number (got: "${value}", cleaned: "${cleanValue}")`);
          } else {
            // Convert percentage to decimal if needed (values > 1 are assumed to be percentages)
            if (numValue > 1) {
              numValue = numValue / 100;
            }

            // Database constraint: rate must be between 0 and 1
            if (numValue > 1) {
              rowErrors.push(`Rate must be between 0 and 1 (got: ${numValue}). Use decimal format: 0.15 for 15%`);
            } else {
              item.rate = numValue;
            }
          }
        }
      }

      // Parse year (integer) - keep policy year as is
      if (columnMapping.year !== undefined) {
        const value = cells[columnMapping.year]?.trim();
        if (value && value !== '-' && value !== '') {
          const numValue = parseInt(value);
          if (isNaN(numValue) || numValue < 1 || numValue > 50) {
            rowErrors.push('Year must be a valid integer (1-50)');
          } else {
            item.year = numValue;
          }
        }
      }

      // Parse rn_commission_php (currency format, supports negative values in parentheses)
      if (columnMapping.rn_commission_php !== undefined) {
        const value = cells[columnMapping.rn_commission_php]?.trim();
        if (value) {
          const numValue = parseCurrencyString(value);
          if (numValue === null) {
            rowErrors.push('RN Commission (PHP) must be a valid number (currency format accepted, negatives in parentheses)');
          } else {
            item.rn_commission_php = numValue;
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
          rn_premium_php: record.rn_premium_php,
          due_date: record.due_date,
          rate: record.rate,
          year: record.year,
          rn_commission_php: record.rn_commission_php
        }));

      console.log('Starting RN Commission upload with', validRecords.length, 'records');
      console.log('First few records to upload:', validRecords.slice(0, 3));

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout

      try {
        const response = await fetch('/api/admin/upload/rn-commission', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ data: validRecords }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        console.log('RN Commission upload response:', response.status, response.statusText);

        if (!response.ok) {
          const errorResult = await response.json();
          throw new Error(errorResult.error || `HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();
        console.log('RN Commission upload result:', result);

        setUploadResult(result);

        // Clear data on successful upload
        if (result.success) {
          setTimeout(() => {
            clearData();
          }, 3000); // Clear after 3 seconds to show success message
        }
      } catch (fetchError: unknown) {
        clearTimeout(timeoutId);
        if (fetchError instanceof Error && fetchError.name === 'AbortError') {
          throw new Error('Upload timed out after 60 seconds. Please try with smaller batches.');
        }
        throw fetchError;
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
            <TrendingUp className="h-5 w-5 text-orange-500" />
            <span>Renewal Commission Import</span>
          </CardTitle>
          <CardDescription>
            Import renewal commission data from Excel. Include advisor codes, premiums, and commission details.
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

      {/* Upload Success */}
      {uploadResult && uploadResult.success && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <div>{uploadResult.message}</div>
              <div className="text-sm text-gray-600">
                • Records processed: {uploadResult.stats.recordsProcessed}
                • Records inserted: {uploadResult.stats.recordsInserted}
                • Records updated (duplicates): {uploadResult.stats.recordsUpdated}
                {uploadResult.stats.errors > 0 && (
                  <div className="text-red-600">• Errors: {uploadResult.stats.errors}</div>
                )}
              </div>
              {uploadResult.errors && uploadResult.errors.length > 0 && (
                <div className="mt-2">
                  <details className="text-sm">
                    <summary className="cursor-pointer text-red-600">View Errors ({uploadResult.errors.length})</summary>
                    <ul className="mt-1 list-disc list-inside">
                      {uploadResult.errors.slice(0, 5).map((error, index) => (
                        <li key={index} className="text-red-600">{error}</li>
                      ))}
                      {uploadResult.errors.length > 5 && (
                        <li className="text-red-600">... and {uploadResult.errors.length - 5} more errors</li>
                      )}
                    </ul>
                  </details>
                </div>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {parsedData.length > 0 && (
        <DataPreviewTable
          data={parsedData as unknown as Record<string, unknown>[]}
          title="Renewal Commission Preview"
          onUpload={handleUpload}
          isUploading={isUploading}
          isValidData={isValidData}
        />
      )}
    </div>
  );
}