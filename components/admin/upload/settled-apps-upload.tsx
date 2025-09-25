'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Database, AlertCircle, CheckCircle, Trash2 } from 'lucide-react';
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

export function SettledAppsUpload() {
  const [pasteData, setPasteData] = useState('');
  const [parsedData, setParsedData] = useState<ParsedSettledApp[]>([]);
  const [isValidData, setIsValidData] = useState(false);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const expectedColumns = [
    { key: 'advisor_code', label: 'Advisor Code', required: true },
    { key: 'advisor_name', label: 'Advisor Name', required: false },
    { key: 'process_date', label: 'Process Date (YYYY-MM-DD)', required: false },
    { key: 'insured_name', label: 'Insured Name', required: false },
    { key: 'policy_number', label: 'Policy Number', required: false },
    { key: 'settled_apps', label: 'Settled Apps', required: false },
    { key: 'agency_credits', label: 'Agency Credits', required: false },
    { key: 'net_sales_credits', label: 'Net Sales Credits', required: false }
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
    const parsed: ParsedSettledApp[] = [];

    // Map headers to expected columns
    const columnMapping: Record<string, number> = {};
    expectedColumns.forEach(col => {
      const headerIndex = headers.findIndex(h =>
        h.includes(col.key.replace('_', ' ')) ||
        h.includes(col.label.toLowerCase()) ||
        h === col.key
      );
      if (headerIndex !== -1) {
        columnMapping[col.key] = headerIndex;
      }
    });

    dataRows.forEach((row, index) => {
      const cells = row.split('\t');
      const rowErrors: string[] = [];

      const item: ParsedSettledApp = {
        rowIndex: index + 2
      };

      // Parse advisor_code (required)
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

      // Parse optional text fields
      ['advisor_name', 'insured_name', 'policy_number'].forEach(field => {
        if (columnMapping[field] !== undefined) {
          const value = cells[columnMapping[field]]?.trim();
          if (value) (item as unknown as Record<string, unknown>)[field] = value;
        }
      });

      // Parse date field
      if (columnMapping.process_date !== undefined) {
        const value = cells[columnMapping.process_date]?.trim();
        if (value) {
          if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
            rowErrors.push('Process Date must be YYYY-MM-DD format');
          } else {
            item.process_date = value;
          }
        }
      }

      // Parse numeric fields
      ['settled_apps', 'agency_credits', 'net_sales_credits'].forEach(field => {
        if (columnMapping[field] !== undefined) {
          const value = cells[columnMapping[field]]?.trim();
          if (value) {
            const numValue = parseFloat(value);
            if (isNaN(numValue) || numValue < 0) {
              rowErrors.push(`${field.replace('_', ' ')} must be a positive number`);
            } else {
              (item as unknown as Record<string, unknown>)[field] = numValue;
            }
          }
        }
      });

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
      console.log('Uploading settled apps data:', parsedData);
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
          title="Settled Applications Preview"
          onUpload={handleUpload}
          isUploading={isUploading}
          isValidData={isValidData}
        />
      )}
    </div>
  );
}