# ManpowerQuery Component Documentation

## Overview

The `ManpowerQuery` component is a comprehensive, reusable solution for displaying manpower data across different pages in the Neem Tree insurance advisor performance portal. It provides flexible configurations, multiple display modes, and consistent data handling.

## Quick Start

```tsx
import { ManpowerQuery } from '@/components/manpower/manpower-query';
import { useManpowerQuery } from '@/hooks/useManpowerQuery';

function MyPage() {
  const { data, isLoading, error } = useManpowerQuery();

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  if (!data) return <div>No data</div>;

  return <ManpowerQuery data={data} />;
}
```

## Components

### Core Components

#### `ManpowerQuery`
Main component that orchestrates all manpower display functionality.

#### Pre-configured Components
- `ManpowerFullTable` - Complete table with all features (equivalent to `mode: 'full'`)
- `ManpowerStatsCards` - Summary cards only (equivalent to `mode: 'stats-only'`)

**Note**: For maximum flexibility, use the main `ManpowerQuery` component with different `mode` configurations instead of the pre-configured components.

#### Hook
- `useManpowerQuery` - Custom hook for data fetching
- `useManpowerStats` - Hook for statistics only

## Display Modes

### 1. Full Mode (`full`)
**Use Case**: Main manpower pages, comprehensive views
**Features**:
- ✅ Summary cards
- ✅ Search & filter
- ✅ All columns (Profile, Name, Hierarchy, Code, Unit Code, Status, Class, Dates)
- ✅ Results count
- ✅ Admin actions (if enabled)

```tsx
<ManpowerQuery data={manpowerData} config={{ mode: 'full' }} />
// or use the pre-configured component:
<ManpowerFullTable data={manpowerData} />
```

### 2. Compact Mode (`compact`)
**Use Case**: Dashboard widgets, space-constrained views
**Features**:
- ❌ Summary cards
- ✅ Search & filter
- ✅ Essential columns only (Profile, Name, Hierarchy, Code, Status)
- ✅ Results count

```tsx
<ManpowerQuery data={manpowerData} config={{ mode: 'compact' }} />
```

### 3. Stats-Only Mode (`stats-only`)
**Use Case**: Dashboard metrics, quick insights
**Features**:
- ✅ Summary cards only
- ❌ No table
- ❌ No search/filter

```tsx
<ManpowerQuery data={manpowerData} config={{ mode: 'stats-only' }} />
// or use the pre-configured component:
<ManpowerStatsCards data={manpowerData} />
```

### 4. Selector Mode (`selector`)
**Use Case**: Dropdowns, modals for record selection
**Features**:
- ❌ Summary cards
- ✅ Search & filter
- ✅ Selection-optimized columns
- ✅ Click handlers for selection

```tsx
<ManpowerQuery
  data={manpowerData}
  config={{
    mode: 'selector',
    onRecordSelect: (record) => console.log('Selected:', record)
  }}
/>
```

### 5. Minimal Mode (`minimal`)
**Use Case**: Embedded tables, simple displays
**Features**:
- ❌ Summary cards
- ❌ Search & filter
- ✅ Basic columns only (Name, Code, Status)

```tsx
<ManpowerQuery data={manpowerData} config={{ mode: 'minimal' }} />
```

## Configuration Options

### `ManpowerQueryConfig`

```tsx
interface ManpowerQueryConfig {
  mode: ManpowerQueryMode;
  showSummaryCards?: boolean;
  showSearchFilter?: boolean;
  showResultsCount?: boolean;
  allowAdminActions?: boolean;
  customTitle?: string;
  customDescription?: string;
  visibleColumns?: ColumnName[];
  onRecordSelect?: (record: ManpowerRecord) => void;
  onRecordMultiSelect?: (records: ManpowerRecord[]) => void;
}
```

### Available Columns
- `profile` - Avatar/photo
- `name` - Display name with nickname
- `hierarchy` - Direct/Indirect level badge
- `code` - Advisor code
- `unit_code` - Unit code
- `status` - Active/Cancelled status badge
- `class` - Individual/Manager/Candidate badge
- `date_hired` - Hire date
- `birthday` - Birth date

## Data Hook (`useManpowerQuery`)

### Basic Usage
```tsx
const { data, isLoading, error, refetch } = useManpowerQuery();
```

### With Options
```tsx
const { data, isLoading, error } = useManpowerQuery({
  enabled: true,           // Auto-fetch on mount
  refetchInterval: 60000,  // Refetch every minute
  cacheTime: 300000       // Cache for 5 minutes
});
```

### Manual Operations
```tsx
const { data, refetch, invalidate, isRefetching } = useManpowerQuery();

// Manual refetch (uses cache if valid)
await refetch();

// Force fresh data (ignores cache)
await invalidate();
```

### Stats Hook
```tsx
const { stats, isLoading, error } = useManpowerStats();

// stats = {
//   totalActive: 45,
//   direct: 12,
//   indirect1: 23,
//   indirect2: 10,
//   total: 50,
//   cancelled: 5
// }
```

## Page Integration Examples

### Dashboard Page
```tsx
'use client';

import { ManpowerStatsCards } from '@/components/manpower/manpower-query';
import { useManpowerQuery } from '@/hooks/useManpowerQuery';

export default function Dashboard() {
  const { data, isLoading } = useManpowerQuery();

  return (
    <div className="space-y-6">
      <h1>Dashboard</h1>

      {/* Quick stats overview */}
      {data && <ManpowerStatsCards data={data} />}

      {/* Other dashboard content */}
    </div>
  );
}
```

### Production Page
```tsx
'use client';

import { ManpowerQuery } from '@/components/manpower/manpower-query';
import { useManpowerQuery } from '@/hooks/useManpowerQuery';

export default function ProductionPage() {
  const { data, isLoading } = useManpowerQuery();

  return (
    <div className="space-y-6">
      <h1>Production Analysis</h1>

      {/* Compact table for advisor selection */}
      {data && (
        <ManpowerQuery
          data={data}
          config={{
            mode: 'compact',
            customTitle: "Select Advisor for Production Report",
            onRecordSelect: (advisor) => {
              // Handle advisor selection for reports
              console.log('Selected advisor:', advisor);
            }
          }}
        />
      )}
    </div>
  );
}
```

### Bonus Calculation Page
```tsx
'use client';

import { ManpowerQuery } from '@/components/manpower/manpower-query';
import { useManpowerQuery } from '@/hooks/useManpowerQuery';

export default function BonusPage() {
  const { data } = useManpowerQuery();
  const [selectedAdvisors, setSelectedAdvisors] = useState([]);

  return (
    <div>
      <h1>Bonus Calculation</h1>

      {/* Multi-select for bonus eligibility */}
      {data && (
        <ManpowerQuery
          data={data.filter(advisor => advisor.status === 'active')}
          config={{
            mode: 'selector',
            customTitle: "Select Advisors for Bonus Calculation",
            onRecordMultiSelect: setSelectedAdvisors,
            visibleColumns: ['profile', 'name', 'code', 'unit_code', 'class']
          }}
        />
      )}

      <div>Selected: {selectedAdvisors.length} advisors</div>
    </div>
  );
}
```

### Modal/Dropdown Usage
```tsx
'use client';

import { Dialog } from '@/components/ui/dialog';
import { ManpowerQuery } from '@/components/manpower/manpower-query';

function AdvisorSelectModal({ open, onClose, onSelect, data }) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Select Advisor</DialogTitle>
        </DialogHeader>

        <ManpowerQuery
          data={data}
          config={{
            mode: 'minimal',
            onRecordSelect: (advisor) => {
              onSelect(advisor);
              onClose();
            }
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
```

## Styling & Customization

### Custom CSS Classes
```tsx
<ManpowerQuery
  data={data}
  className="custom-manpower-table"
  config={{
    customTitle: "My Custom Title",
    customDescription: "Custom description here"
  }}
/>
```

### Theme Support
The component automatically supports dark/light mode through Tailwind CSS classes.

## Performance Considerations

### Caching
- Data is automatically cached for 5 minutes by default
- Use `invalidate()` to force fresh data
- Use `refetchInterval` for auto-updates

### Optimization Tips
```tsx
// For frequently updated data
const { data } = useManpowerQuery({
  cacheTime: 60000,      // 1 minute cache
  refetchInterval: 30000  // Refetch every 30 seconds
});

// For rarely changing data
const { data } = useManpowerQuery({
  cacheTime: 600000      // 10 minute cache
});
```

### Large Datasets
```tsx
// Use compact mode for better performance with many records
<ManpowerCompactTable data={largeDataset} />

// Or minimal mode for maximum performance
<ManpowerMinimalTable data={largeDataset} />
```

## Error Handling

### Component Level
```tsx
function MyPage() {
  const { data, error, isLoading } = useManpowerQuery();

  if (error) {
    return (
      <div className="text-red-500">
        Error loading manpower data: {error.message}
        <button onClick={() => window.location.reload()}>
          Retry
        </button>
      </div>
    );
  }

  return <ManpowerQuery data={data || []} />;
}
```

### Global Error Boundary
```tsx
import { ErrorBoundary } from 'react-error-boundary';

function ErrorFallback({error, resetErrorBoundary}) {
  return (
    <div role="alert">
      <h2>Something went wrong with manpower data:</h2>
      <pre>{error.message}</pre>
      <button onClick={resetErrorBoundary}>Try again</button>
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <MyManpowerPage />
    </ErrorBoundary>
  );
}
```

## Advanced Usage

### Custom Filtering
```tsx
// Filter data before passing to component
const activeAdvisors = data?.filter(advisor =>
  advisor.status === 'active' &&
  advisor.hierarchy_level === 'Direct'
);

<ManpowerQuery data={activeAdvisors || []} />
```

### Data Transformation
```tsx
// Add custom fields to data
const enhancedData = data?.map(advisor => ({
  ...advisor,
  displayName: advisor.advisor_name || advisor.nickname,
  isEligibleForBonus: advisor.status === 'active' && advisor.class !== 'Individual'
}));
```

## Troubleshooting

### Common Issues

#### 1. Data Not Loading
```tsx
// Check hook configuration
const { data, isLoading, error } = useManpowerQuery({ enabled: true });

if (isLoading) return <div>Loading...</div>;
if (error) console.error('Manpower error:', error);
```

#### 2. Stale Data
```tsx
// Force refresh
const { invalidate } = useManpowerQuery();

// Call when needed
await invalidate();
```

#### 3. Performance Issues
```tsx
// Use appropriate mode
<ManpowerQuery
  data={data}
  config={{ mode: 'compact' }} // Instead of 'full'
/>
```

## Migration Guide

### From Old UnifiedManpowerTable
```tsx
// Old way
<UnifiedManpowerTable data={data} mode="regular" title="My Title" />

// New way
<ManpowerQuery
  data={data}
  config={{
    mode: 'full',
    allowAdminActions: false,
    customTitle: "My Title"
  }}
/>
```

## API Reference

### Types
```tsx
type ManpowerQueryMode = 'full' | 'compact' | 'stats-only' | 'selector' | 'minimal';

interface ManpowerQueryConfig {
  mode: ManpowerQueryMode;
  showSummaryCards?: boolean;
  showSearchFilter?: boolean;
  showResultsCount?: boolean;
  allowAdminActions?: boolean;
  customTitle?: string;
  customDescription?: string;
  visibleColumns?: ColumnName[];
  onRecordSelect?: (record: ManpowerRecord) => void;
  onRecordMultiSelect?: (records: ManpowerRecord[]) => void;
}

interface UseManpowerQueryOptions {
  enabled?: boolean;
  refetchInterval?: number;
  cacheTime?: number;
}
```

## Best Practices

1. **Choose the Right Mode**: Use the most appropriate mode for your use case
2. **Handle Loading States**: Always handle loading and error states
3. **Cache Wisely**: Adjust cache settings based on data freshness requirements
4. **Filter Appropriately**: Filter data before passing to component when possible
5. **Performance**: Use compact/minimal modes for large datasets
6. **Error Boundaries**: Wrap components in error boundaries for better UX

## Support

For issues or questions about the ManpowerQuery component:
1. Check this documentation first
2. Review the component source code
3. Test with minimal examples
4. Check browser console for errors
5. Verify data structure matches expected format