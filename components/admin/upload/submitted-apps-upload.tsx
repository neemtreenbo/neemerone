'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FileSpreadsheet, AlertCircle, CheckCircle, Trash2 } from 'lucide-react';
import { DataPreviewTable } from '../data-preview-table';

interface ParsedSubmittedApp {
  advisor_code?: string;
  advisor_name?: string;
  process_date?: string;
  insured_name?: string;
  policy_number?: string;
  submitted_apps?: number;
  rowIndex: number;
  errors?: string[];
}

interface UploadResponse {
  success: boolean;
  message: string;
  stats: {
    recordsProcessed: number;
    recordsInserted: number;
    duplicatesRemoved: number;
    errors: number;
  };
  errors?: string[];
}

export function SubmittedAppsUpload() {
  const [pasteData, setPasteData] = useState('');
  const [parsedData, setParsedData] = useState<ParsedSubmittedApp[]>([]);
  const [isValidData, setIsValidData] = useState(false);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResponse | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const expectedColumns = [
    { key: 'advisor_code', label: 'Advisor Code', required: true },
    { key: 'advisor_name', label: 'Advisor Name', required: false },
    { key: 'process_date', label: 'Process Date (Month DD, YYYY)', required: false },
    { key: 'insured_name', label: 'Insured Name', required: false },
    { key: 'policy_number', label: 'Policy Number', required: false },
    { key: 'submitted_apps', label: 'Submitted Apps', required: false }
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
    const parsed: ParsedSubmittedApp[] = [];

    // Map headers to expected columns (exact mapping for the Excel format)
    const columnMapping: Record<string, number> = {};

    // Find exact column positions based on expected Excel headers
    const headerMappings = {
      advisor_code: ['advisor code'],
      advisor_name: ['advisor name'],
      process_date: ['process date'],
      insured_name: ['insured name'],
      policy_number: ['policy number'],
      submitted_apps: ['submitted apps']
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

      const item: ParsedSubmittedApp = {
        rowIndex: index + 2 // +2 because index starts at 0 and we skip header
      };

      // Parse each expected column
      if (columnMapping.advisor_code !== undefined) {
        const value = cells[columnMapping.advisor_code]?.trim();
        if (value) {
          item.advisor_code = value;
        } else {
          rowErrors.push('Advisor Code is required');
        }
      } else {
        rowErrors.push('Advisor Code column not found');
      }

      if (columnMapping.advisor_name !== undefined) {
        const value = cells[columnMapping.advisor_name]?.trim();
        if (value) item.advisor_name = value;
      }

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

      if (columnMapping.insured_name !== undefined) {
        const value = cells[columnMapping.insured_name]?.trim();
        if (value) item.insured_name = value;
      }

      if (columnMapping.policy_number !== undefined) {
        const value = cells[columnMapping.policy_number]?.trim();
        if (value) item.policy_number = value;
      }

      if (columnMapping.submitted_apps !== undefined) {
        const value = cells[columnMapping.submitted_apps]?.trim();
        if (value) {
          const numValue = parseFloat(value);
          if (isNaN(numValue) || numValue < 0) {
            rowErrors.push('Submitted Apps must be a positive number');
          } else {
            item.submitted_apps = numValue;
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
          advisor_code: record.advisor_code!,
          advisor_name: record.advisor_name,
          process_date: record.process_date,
          insured_name: record.insured_name,
          policy_number: record.policy_number,
          submitted_apps: record.submitted_apps
        }));

      const response = await fetch('/api/admin/upload/submitted-apps', {
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

      // Clear data on successful upload
      if (result.success) {
        setTimeout(() => {
          clearData();
        }, 3000); // Clear after 3 seconds to show success message
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
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileSpreadsheet className="h-5 w-5 text-blue-500" />
            <span>Submitted Applications Import</span>
          </CardTitle>
          <CardDescription>
            Import submitted application data from Excel. Paste your Excel data below to preview and upload.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Expected Columns */}
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

          {/* Paste Area */}
          <div className="space-y-4">
            <Textarea
              placeholder="Paste your Excel data here (Ctrl+V or Cmd+V)..."
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

      {/* Parse Errors */}
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

      {/* Success State */}
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
                • Duplicates removed: {uploadResult.stats.duplicatesRemoved}
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

      {/* Data Preview */}
      {parsedData.length > 0 && (
        <DataPreviewTable
          data={parsedData as unknown as Record<string, unknown>[]}
          title="Submitted Applications Preview"
          onUpload={handleUpload}
          isUploading={isUploading}
          isValidData={isValidData}
        />
      )}
    </div>
  );
}