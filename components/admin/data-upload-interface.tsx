'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Upload, FileSpreadsheet, Database, TrendingUp } from 'lucide-react';

import { SubmittedAppsUpload } from './upload/submitted-apps-upload';
import { SettledAppsUpload } from './upload/settled-apps-upload';
import { FYCommissionUpload } from './upload/fy-commission-upload';
import { RNCommissionUpload } from './upload/rn-commission-upload';

export function DataUploadInterface() {
  const [activeTab, setActiveTab] = useState('submitted-apps');

  const uploadTypes = [
    {
      id: 'submitted-apps',
      label: 'Submitted Apps',
      description: 'Import submitted application data',
      icon: FileSpreadsheet,
      table: 'submitted_apps_details',
      color: 'bg-blue-500'
    },
    {
      id: 'settled-apps',
      label: 'Settled Apps',
      description: 'Import settled application data with credits',
      icon: Database,
      table: 'settled_apps_details',
      color: 'bg-green-500'
    },
    {
      id: 'fy-commission',
      label: 'FY Commission',
      description: 'Import first year commission data',
      icon: TrendingUp,
      table: 'fy_commission_details',
      color: 'bg-purple-500'
    },
    {
      id: 'rn-commission',
      label: 'RN Commission',
      description: 'Import renewal commission data',
      icon: TrendingUp,
      table: 'rn_commission_details',
      color: 'bg-orange-500'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {uploadTypes.map((type) => {
          const Icon = type.icon;
          return (
            <Card
              key={type.id}
              className={`cursor-pointer transition-all hover:shadow-md ${
                activeTab === type.id ? 'ring-2 ring-blue-500' : ''
              }`}
              onClick={() => setActiveTab(type.id)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center space-x-2">
                  <div className={`p-2 rounded-md ${type.color} text-white`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <CardTitle className="text-sm">{type.label}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-xs">
                  {type.description}
                </CardDescription>
                <Badge variant="outline" className="mt-2 text-xs">
                  {type.table}
                </Badge>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Upload Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          {uploadTypes.map((type) => (
            <TabsTrigger key={type.id} value={type.id} className="flex items-center space-x-2">
              <type.icon className="h-4 w-4" />
              <span className="hidden sm:inline">{type.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Instructions Card */}
        <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-800">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-blue-900 dark:text-blue-100">
              <Upload className="h-5 w-5" />
              <span>Excel Copy-Paste Instructions</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-semibold mb-2">How to Upload:</h4>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Open your Excel file</li>
                  <li>Select all data including headers</li>
                  <li>Copy (Ctrl+C or Cmd+C)</li>
                  <li>Paste into the text area below</li>
                  <li>Review the parsed data</li>
                  <li>Click Upload to save</li>
                </ol>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Important Notes:</h4>
                <ul className="list-disc list-inside space-y-1">
                  <li>Include column headers in first row</li>
                  <li>Date format: YYYY-MM-DD</li>
                  <li>Numbers without currency symbols</li>
                  <li>Empty cells are allowed</li>
                  <li>Data is validated before upload</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Upload Forms */}
        <TabsContent value="submitted-apps">
          <SubmittedAppsUpload />
        </TabsContent>

        <TabsContent value="settled-apps">
          <SettledAppsUpload />
        </TabsContent>

        <TabsContent value="fy-commission">
          <FYCommissionUpload />
        </TabsContent>

        <TabsContent value="rn-commission">
          <RNCommissionUpload />
        </TabsContent>
      </Tabs>
    </div>
  );
}