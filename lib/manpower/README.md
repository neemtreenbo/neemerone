# Manpower Pages Refactoring

This document explains the refactored structure for the manpower pages, designed for better maintainability and reusability.

## Overview

The manpower functionality is now organized into reusable components and utilities that eliminate code duplication between `/manpower` and `/admin/manpower` pages.

## Architecture

### 🗂️ **File Structure**

```
├── lib/
│   ├── auth/
│   │   └── manpower-auth.ts          # Authentication utilities
│   └── data/
│       └── manpower.ts               # Data fetching utilities
├── components/
│   ├── manpower/
│   │   └── manpower-page-wrapper.tsx # Reusable page components
│   └── shared/
│       └── unified-manpower-table.tsx # Table component (unchanged)
└── app/
    ├── manpower/page.tsx              # Regular manpower page
    └── admin/manpower/page.tsx        # Admin manpower page
```

### 🔧 **Components Breakdown**

#### **1. Authentication Layer** (`lib/auth/manpower-auth.ts`)
- `authenticateRegularManpower()` - Handles regular user auth + admin redirect
- `authenticateAdminManpower()` - Handles admin-only authentication
- Centralized authentication logic with proper redirects

#### **2. Data Layer** (`lib/data/manpower.ts`)
- `fetchManpowerData()` - Single source of truth for manpower data fetching
- Consistent error handling and data transformation
- Shared between both pages

#### **3. Presentation Layer** (`components/manpower/manpower-page-wrapper.tsx`)
- `ManpowerPageWrapper` - Success state component
- `ManpowerErrorPage` - Error state component
- `MANPOWER_PAGE_CONFIGS` - Predefined configurations for each page type
- Type-safe configuration system

## Benefits

### ✅ **Code Reusability**
- **Before**: ~77 lines of duplicated code per page
- **After**: ~37 lines per page, shared utilities
- **Reduction**: ~52% less code duplication

### ✅ **Maintainability**
- Single point of failure for data fetching
- Centralized authentication logic
- Consistent error handling across pages
- Type-safe configurations

### ✅ **Scalability**
- Easy to add new manpower page variants
- Simple configuration-based approach
- Shared utilities can be extended for other features

### ✅ **Developer Experience**
- Clear separation of concerns
- Self-documenting configuration system
- Easier testing and debugging

## Usage

### Adding a New Manpower Page Variant

1. **Add configuration:**
```typescript
export const MANPOWER_PAGE_CONFIGS = {
  // ... existing configs
  newVariant: {
    mode: 'regular' as const,
    pageTitle: 'New Variant Title',
    pageDescription: 'Description...',
    tableTitle: 'Table Title',
    tableDescription: 'Table description...'
  }
} as const;
```

2. **Create the page:**
```typescript
export default async function NewVariantPage() {
  await authenticateRegularManpower(); // or authenticateAdminManpower()
  const { data, error } = await fetchManpowerData();

  if (error || !data) {
    return <ManpowerErrorPage error={error} config={MANPOWER_PAGE_CONFIGS.newVariant} />;
  }

  return <ManpowerPageWrapper data={data} config={MANPOWER_PAGE_CONFIGS.newVariant} />;
}
```

### Customizing Authentication

The authentication utilities can be extended:

```typescript
// Custom authentication for specific use cases
export async function authenticateManagersOnly(): Promise<void> {
  // Implementation for managers-only access
}
```

## Migration Notes

The refactoring maintains 100% backward compatibility:
- All existing functionality preserved
- Same authentication flows
- Same UI/UX behavior
- Same data fetching patterns
- All photo upload and status filtering features intact

## Future Enhancements

This architecture supports easy extension for:
- Role-based page variants
- Different data sources
- Custom filtering logic
- Additional authentication strategies
- Page-specific customizations