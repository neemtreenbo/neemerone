'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { TrendingUp, AlertCircle, CheckCircle, Trash2 } from 'lucide-react';
import { DataPreviewTable } from '../data-preview-table';

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

export function FYCommissionUpload() {
  const [pasteData, setPasteData] = useState('');
  const [parsedData, setParsedData] = useState<ParsedFYCommission[]>([]);
  const [isValidData, setIsValidData] = useState(false);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const expectedColumns = [
    { key: 'code', label: 'Advisor Code', required: true },
    { key: 'process_date', label: 'Process Date (YYYY-MM-DD)', required: false },
    { key: 'insured_name', label: 'Insured Name', required: false },
    { key: 'policy_number', label: 'Policy Number', required: false },
    { key: 'transaction_type', label: 'Transaction Type', required: false },
    { key: 'fy_premium_php', label: 'FY Premium (PHP)', required: false },
    { key: 'due_date', label: 'Due Date (YYYY-MM-DD)', required: false },
    { key: 'rate', label: 'Commission Rate (0-1)', required: false },
    { key: 'fy_commission_php', label: 'FY Commission (PHP)', required: false }
  ];

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
    const parsed: ParsedFYCommission[] = [];

    // Map headers to expected columns
    const columnMapping: Record<string, number> = {};
    expectedColumns.forEach(col => {
      const headerIndex = headers.findIndex(h =>
        h.includes(col.key.replace('_', ' ')) ||
        h.includes(col.label.toLowerCase()) ||
        h === col.key ||
        (col.key === 'code' && (h.includes('advisor') || h.includes('code'))) ||
        (col.key === 'fy_premium_php' && h.includes('premium')) ||
        (col.key === 'fy_commission_php' && h.includes('commission'))
      );
      if (headerIndex !== -1) {
        columnMapping[col.key] = headerIndex;
      }
    });

    dataRows.forEach((row, index) => {
      const cells = row.split('\t');
      const rowErrors: string[] = [];

      const item: ParsedFYCommission = {
        rowIndex: index + 2
      };

      // Parse code (required)
      if (columnMapping.code !== undefined) {
        const value = cells[columnMapping.code]?.trim();
        if (value) {
          item.code = value;
        } else {
          rowErrors.push('Advisor Code is required');
        }
      } else {
        rowErrors.push('Advisor Code column not found');
      }

      // Parse optional text fields
      ['insured_name', 'policy_number', 'transaction_type'].forEach(field => {
        if (columnMapping[field] !== undefined) {
          const value = cells[columnMapping[field]]?.trim();
          if (value) (item as unknown as Record<string, unknown>)[field] = value;
        }
      });

      // Parse date fields
      ['process_date', 'due_date'].forEach(field => {
        if (columnMapping[field] !== undefined) {
          const value = cells[columnMapping[field]]?.trim();
          if (value) {
            if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
              rowErrors.push(`${field.replace('_', ' ')} must be YYYY-MM-DD format`);
            } else {
              (item as unknown as Record<string, unknown>)[field] = value;
            }
          }
        }
      });

      // Parse numeric fields
      if (columnMapping.fy_premium_php !== undefined) {
        const value = cells[columnMapping.fy_premium_php]?.trim();
        if (value) {
          const numValue = parseFloat(value.replace(/[^0-9.-]/g, '')); // Remove currency symbols
          if (isNaN(numValue) || numValue < 0) {
            rowErrors.push('FY Premium must be a positive number');
          } else {
            item.fy_premium_php = numValue;
          }
        }
      }

      if (columnMapping.fy_commission_php !== undefined) {
        const value = cells[columnMapping.fy_commission_php]?.trim();
        if (value) {
          const numValue = parseFloat(value.replace(/[^0-9.-]/g, ''));
          if (isNaN(numValue) || numValue < 0) {
            rowErrors.push('FY Commission must be a positive number');
          } else {
            item.fy_commission_php = numValue;
          }
        }
      }

      // Parse rate (0-1)
      if (columnMapping.rate !== undefined) {
        const value = cells[columnMapping.rate]?.trim();
        if (value) {
          const numValue = parseFloat(value);
          if (isNaN(numValue) || numValue < 0 || numValue > 1) {
            rowErrors.push('Rate must be between 0 and 1 (e.g., 0.15 for 15%)');
          } else {
            item.rate = numValue;
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
  };

  const handleUpload = async () => {
    if (!isValidData || parsedData.length === 0) return;

    setIsUploading(true);
    try {
      console.log('Uploading FY commission data:', parsedData);
      await new Promise(resolve => setTimeout(resolve, 2000));
      alert('Upload functionality will be implemented in the next phase');
    } catch (error) {
      console.error('Upload error:', error);
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

      {isValidData && parsedData.length > 0 && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            Data parsed successfully! {parsedData.length} record{parsedData.length !== 1 ? 's' : ''} ready for upload.
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
    </div>
  );
}