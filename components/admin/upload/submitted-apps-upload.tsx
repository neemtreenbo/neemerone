'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FileSpreadsheet, AlertCircle, CheckCircle, Trash2, Copy, Plus, RotateCcw, TrendingUp, AlertTriangle } from 'lucide-react';
import { DataPreviewTable } from '../data-preview-table';
import { detectDataSchema, isSchemaCompatible, getCorrectUploadSuggestion } from '@/lib/upload-schema-detector';

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
    recordsUpdated: number;
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
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [schemaWarning, setSchemaWarning] = useState<string | null>(null);

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

  // Helper function to parse numeric values (handles negative values in parentheses)
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
    const parsed: ParsedSubmittedApp[] = [];

    // Detect data schema to prevent wrong table uploads
    const schemaDetection = detectDataSchema(headers);
    const compatibility = isSchemaCompatible(schemaDetection.detectedSchema, 'submitted_apps', schemaDetection.confidence);

    if (!compatibility.compatible && compatibility.warning) {
      setSchemaWarning(compatibility.warning + ' ' + getCorrectUploadSuggestion(schemaDetection.detectedSchema));
    } else {
      setSchemaWarning(null);
    }

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

      // Parse each expected column - remove leading zeros to match manpower table
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

      // Parse submitted_apps (supports negative values in parentheses)
      if (columnMapping.submitted_apps !== undefined) {
        const value = cells[columnMapping.submitted_apps]?.trim();
        if (value) {
          const numValue = parseCurrencyString(value);
          if (numValue === null) {
            rowErrors.push('Submitted Apps must be a valid number (negatives in parentheses)');
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
  };

  const copyStatsToClipboard = async () => {
    if (!uploadResult) return;

    const statsText = `Submitted Apps Upload Results:
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
    // Don't clear data when closing dialog - user might want to see results
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

      // Show success dialog
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

      {/* Success Dialog */}
      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <CheckCircle className="h-6 w-6 text-green-500" />
              <span>Upload Successful!</span>
            </DialogTitle>
            <DialogDescription>
              Your submitted applications data has been uploaded successfully.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="text-center space-y-3">
              <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <div className="flex items-center space-x-2">
                  <Plus className="h-4 w-4 text-green-600 dark:text-green-400" />
                  <span className="text-sm font-medium text-green-700 dark:text-green-300">New Records</span>
                </div>
                <span className="text-lg font-bold text-green-600 dark:text-green-400">
                  {uploadResult?.stats.recordsInserted || 0}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="flex items-center space-x-2">
                  <RotateCcw className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <span className="text-sm font-medium text-blue-700 dark:text-blue-300">Updated (Duplicates)</span>
                </div>
                <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                  {uploadResult?.stats.recordsUpdated || 0}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Total Processed</span>
                </div>
                <span className="text-lg font-bold text-gray-600 dark:text-gray-300">
                  {uploadResult?.stats.recordsProcessed || 0}
                </span>
              </div>

              {(uploadResult?.stats.errors || 0) > 0 && (
                <div className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                    <span className="text-sm font-medium text-red-700 dark:text-red-300">Errors</span>
                  </div>
                  <span className="text-lg font-bold text-red-600 dark:text-red-400">
                    {uploadResult?.stats.errors}
                  </span>
                </div>
              )}
            </div>

            {uploadResult?.errors && uploadResult.errors.length > 0 && (
              <details className="text-sm">
                <summary className="cursor-pointer text-red-600 dark:text-red-400 mb-2">View Error Details</summary>
                <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg max-h-32 overflow-y-auto border border-red-200 dark:border-red-800">
                  <ul className="list-disc list-inside space-y-1">
                    {uploadResult.errors.slice(0, 5).map((error, index) => (
                      <li key={index} className="text-red-600 dark:text-red-400 text-xs">{error}</li>
                    ))}
                    {uploadResult.errors.length > 5 && (
                      <li className="text-red-600 dark:text-red-400 text-xs">... and {uploadResult.errors.length - 5} more errors</li>
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