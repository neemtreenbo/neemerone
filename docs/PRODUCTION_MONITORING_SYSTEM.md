# Production Monitoring System Documentation

## Overview

A comprehensive production monitoring system for insurance advisor performance tracking with support for both **calendar periods** (Jan-Dec) and **systems closing periods** (custom date ranges). The system provides real-time aggregation of production data with automatic updates when new data is uploaded.

## Architecture

### Data Flow
```
Source Tables → Monthly Summaries → Annual Summaries → Dashboard RPC Functions
     ↓               ↓                    ↓                      ↓
Raw Production → Real-time Triggers → Cascading Updates → Sub-second Queries
```

## Core Tables

### 1. Foundation Tables

#### `cal_systems_closing_periods`
Defines custom systems closing periods with flexible date ranges.

**Structure:**
- `period_year` - The year this period represents (2023, 2024, 2025)
- `period_month` - The month this period represents (1-12)
- `start_date` - Systems closing start date (e.g., Dec 19, 2024)
- `end_date` - Systems closing end date (e.g., Dec 18, 2025)

**Example:**
```sql
-- Systems closing for "January 2025" runs Dec 19, 2024 - Dec 18, 2025
INSERT INTO cal_systems_closing_periods (period_year, period_month, start_date, end_date)
VALUES (2025, 1, '2024-12-19', '2025-12-18');
```

#### `cal_contest_periods`
Tracks dynamic contest periods for special promotions and competitions.

**Structure:**
- `contest_name` - Name of the contest (e.g., "Q1 2025 Premium Push")
- `start_date` - Contest start date
- `end_date` - Contest end date
- `description` - Optional contest details

### 2. Summary Tables

#### `monthly_production_summary`
**Purpose:** Pre-aggregated monthly production data for fast dashboard queries

**Key Features:**
- **3-Year Rolling Window:** Automatically maintains 2023-2025 data
- **Dual Period Support:** Both calendar months and systems closing periods
- **Real-Time Updates:** Triggers automatically update summaries when source data changes
- **Complete Advisor Context:** Includes advisor hierarchy and team information

**Core Metrics:**
```sql
-- Production Metrics
total_settled_apps          -- Sum of settled applications
total_agency_credits        -- Sum of agency credits
total_net_sales_credits     -- Sum of net sales credits

-- Commission Metrics
total_rn_commission_php     -- Sum of renewal commission in PHP

-- Application Metrics
total_submitted_apps        -- Sum of submitted applications

-- Metadata
transaction_count           -- Number of source transactions
last_updated               -- When this summary was last calculated
```

**Period Types:**
- `'calendar'` - Standard calendar months (Jan 1-31, Feb 1-28/29, etc.)
- `'systems'` - Custom systems closing periods from `cal_systems_closing_periods`

#### `annual_production_summary`
**Purpose:** Pre-aggregated annual production data with advanced yearly insights

**Key Features:**
- **Enhanced Analytics:** Peak performance tracking, activity patterns, averages
- **Team Intelligence:** Manager and unit-level aggregations
- **Growth Analysis:** Year-over-year comparison capabilities
- **Top Performer Identification:** Built-in ranking and performance insights

**Advanced Annual Metrics:**
```sql
-- Basic Annual Totals (same as monthly)
total_settled_apps, total_agency_credits, total_net_sales_credits,
total_rn_commission_php, total_submitted_apps

-- Annual-Specific Insights
months_with_activity        -- Number of months with any production (0-12)
avg_monthly_settled_apps    -- Average monthly performance
avg_monthly_agency_credits  -- Monthly averages for consistent comparisons

-- Peak Performance Tracking
peak_month_settled_apps     -- Best single month in the year
peak_month_agency_credits   -- Highest monthly achievement
peak_month_net_sales_credits -- Peak monthly net sales
```

**Period Types:**
- `'calendar'` - Standard calendar years (Jan 1 - Dec 31)
- `'systems'` - Custom systems closing years (aggregated from systems periods)

## RPC Functions (API Endpoints)

### Monthly Production RPC Functions

#### `get_monthly_production_data()`
**Purpose:** Main flexible query function for monthly production data

**Parameters:**
- `p_start_year` (integer) - Start year (default: current year - 2)
- `p_end_year` (integer) - End year (default: current year)
- `p_period_type` (text) - 'calendar', 'systems', or 'both'
- `p_advisor_codes` (text[]) - Filter by specific advisors (optional)
- `p_manager_ids` (text[]) - Filter by managers (optional)
- `p_unit_codes` (text[]) - Filter by units (optional)
- `p_start_month` (integer) - Start month 1-12 (optional)
- `p_end_month` (integer) - End month 1-12 (optional)

**Usage Examples:**
```sql
-- Get 3-year monthly data for specific advisor
SELECT * FROM get_monthly_production_data(
    2023, 2025, 'calendar', ARRAY['ADV123']
);

-- Get Q1 data for all advisors (calendar periods)
SELECT * FROM get_monthly_production_data(
    2025, 2025, 'calendar', NULL, NULL, NULL, 1, 3
);

-- Compare calendar vs systems for same period
SELECT * FROM get_monthly_production_data(
    2024, 2024, 'both'
);
```

#### `get_team_production_summary()`
**Purpose:** Aggregated team/manager monthly performance summaries

**Parameters:**
- `p_year` (integer) - Target year
- `p_period_type` (text) - 'calendar' or 'systems'
- `p_aggregation_level` (text) - 'manager', 'unit', or 'overall'

**Usage Examples:**
```sql
-- Get manager performance summaries for 2025
SELECT * FROM get_team_production_summary(2025, 'calendar', 'manager');

-- Get unit-level performance
SELECT * FROM get_team_production_summary(2025, 'calendar', 'unit');

-- Get overall organization summary
SELECT * FROM get_team_production_summary(2025, 'calendar', 'overall');
```

### Annual Production RPC Functions

#### `get_annual_production_data()`
**Purpose:** Main flexible query function for annual production data

**Parameters:**
- `p_start_year` (integer) - Start year (default: current year - 2)
- `p_end_year` (integer) - End year (default: current year)
- `p_period_type` (text) - 'calendar', 'systems', or 'both'
- `p_advisor_codes` (text[]) - Filter by specific advisors (optional)
- `p_manager_ids` (text[]) - Filter by managers (optional)
- `p_unit_codes` (text[]) - Filter by units (optional)

**Usage Examples:**
```sql
-- Get 3-year annual comparison for specific advisor
SELECT * FROM get_annual_production_data(
    2023, 2025, 'calendar', ARRAY['ADV123']
);

-- Get all managers' team annual performance
SELECT * FROM get_annual_production_data(
    2025, 2025, 'calendar', NULL, ARRAY['MGR001', 'MGR002']
);

-- Compare calendar vs systems annual performance
SELECT * FROM get_annual_production_data(
    2024, 2024, 'both'
);
```

#### `get_annual_team_summary()`
**Purpose:** Annual team/manager performance with top performer identification

**Parameters:**
- `p_year` (integer) - Target year
- `p_period_type` (text) - 'calendar' or 'systems'
- `p_aggregation_level` (text) - 'manager', 'unit', or 'overall'

**Returns Enhanced Data:**
- All standard aggregations (totals, averages, counts)
- `top_performer_code` - Code of top performer in each group
- `top_performer_name` - Name of top performer
- `top_performer_net_sales` - Top performer's net sales credits

**Usage Examples:**
```sql
-- Get manager annual performance with top performers identified
SELECT
    grouping_name as manager_name,
    advisor_count,
    total_net_sales_credits,
    top_performer_name,
    top_performer_net_sales
FROM get_annual_team_summary(2025, 'calendar', 'manager');

-- Get unit annual performance rankings
SELECT * FROM get_annual_team_summary(2025, 'calendar', 'unit')
ORDER BY total_net_sales_credits DESC;
```

## Data Population & Maintenance

### Population Functions

#### `populate_monthly_production_summary()`
**Purpose:** Initial population of monthly summaries from existing data

```sql
-- Populate for 3-year window (2023-2025)
SELECT populate_monthly_production_summary(2023, 2025);

-- Populate for specific year only
SELECT populate_monthly_production_summary(2024, 2024);
```

#### `populate_annual_production_summary()`
**Purpose:** Initial population of annual summaries (aggregates from monthly data)

```sql
-- Populate annual summaries for 3-year window
SELECT populate_annual_production_summary(2023, 2025);
```

### Maintenance Functions

#### `cleanup_old_production_summaries()`
**Purpose:** Remove data outside 3-year rolling window

```sql
-- Clean up old monthly summaries
SELECT cleanup_old_production_summaries();

-- Clean up old annual summaries
SELECT cleanup_old_annual_summaries();
```

## Real-Time Update System

### Automatic Triggers

The system uses PostgreSQL triggers to maintain real-time accuracy:

1. **Source Table Changes** → **Monthly Summary Updates**
   - `settled_apps_details` changes → Update affected monthly periods
   - `rn_commission_details` changes → Update affected monthly periods
   - `submitted_apps_details` changes → Update affected monthly periods

2. **Monthly Summary Changes** → **Annual Summary Updates**
   - Monthly summary changes → Recalculate affected annual summaries
   - Supports both calendar and systems closing periods

### Performance Optimization

#### Indexes
Both summary tables include optimized indexes for:
- **Advisor lookups:** Fast individual advisor queries
- **Time-based filtering:** Efficient year/month/period filtering
- **Hierarchical queries:** Manager and unit-based filtering
- **Ranking queries:** Performance-based ordering

#### Caching Strategy
- **Pre-aggregated data:** No real-time calculation needed
- **3-year window:** Automatic data retention management
- **Efficient updates:** Only affected periods are recalculated

## Dashboard Integration

### Frontend Usage Patterns

#### Monthly Dashboard Components
```typescript
// Get 3-year monthly trend for specific advisor
const monthlyData = await supabase.rpc('get_monthly_production_data', {
  p_start_year: 2023,
  p_end_year: 2025,
  p_period_type: 'calendar',
  p_advisor_codes: ['ADV123']
});

// Monthly team performance comparison
const teamData = await supabase.rpc('get_team_production_summary', {
  p_year: 2025,
  p_period_type: 'calendar',
  p_aggregation_level: 'manager'
});
```

#### Annual Dashboard Components
```typescript
// Annual performance overview
const annualData = await supabase.rpc('get_annual_production_data', {
  p_start_year: 2023,
  p_end_year: 2025,
  p_period_type: 'both' // Show calendar and systems
});

// Annual team rankings with top performers
const teamRankings = await supabase.rpc('get_annual_team_summary', {
  p_year: 2025,
  p_period_type: 'calendar',
  p_aggregation_level: 'manager'
});
```

### Performance Expectations

- **Monthly queries:** < 100ms for 3-year data
- **Annual queries:** < 50ms for 3-year summaries
- **Team aggregations:** < 200ms for full organization
- **Real-time updates:** Instant via triggers (no manual refresh)

## Security & Access Control

### Row Level Security (RLS)
- **View Access:** Users with `app_role` can view all production data
- **Management Access:** Admin/Manager roles can manage summary data
- **Data Isolation:** All queries respect user permissions automatically

### Audit Trail
- **Last Updated:** Every summary record tracks when it was last calculated
- **Change Detection:** Triggers ensure data consistency across all levels
- **Data Integrity:** Foreign key constraints maintain referential integrity

## Best Practices

### When to Use Monthly vs Annual Summaries

**Use Monthly Summaries for:**
- Detailed trend analysis
- Month-over-month comparisons
- Seasonal pattern identification
- Granular performance tracking

**Use Annual Summaries for:**
- Year-over-year growth analysis
- Annual goal tracking
- Team performance rankings
- High-level executive reporting

### Query Optimization Tips

1. **Always specify date ranges:** Use start_year/end_year parameters
2. **Filter by advisor/manager when possible:** Reduces result set size
3. **Choose appropriate period type:** 'calendar' vs 'systems' vs 'both'
4. **Use team summaries for aggregations:** More efficient than client-side grouping

### Troubleshooting

#### Common Issues

1. **Missing Data in Summaries**
   - **Solution:** Run population functions to rebuild summaries
   - **Prevention:** Ensure source data upload processes are working

2. **Stale Summary Data**
   - **Solution:** Triggers should update automatically, check trigger status
   - **Prevention:** Monitor trigger performance and error logs

3. **Performance Issues**
   - **Solution:** Review query patterns and add specific indexes if needed
   - **Prevention:** Use RPC functions instead of direct table queries

#### Monitoring Queries

```sql
-- Check summary data freshness
SELECT
    period_year,
    period_type,
    COUNT(*) as summary_count,
    MAX(last_updated) as most_recent_update
FROM monthly_production_summary
GROUP BY period_year, period_type
ORDER BY period_year, period_type;

-- Identify advisors with no recent activity
SELECT advisor_code, advisor_name, last_updated
FROM monthly_production_summary
WHERE period_year = EXTRACT(year FROM CURRENT_DATE)
  AND last_updated < CURRENT_DATE - INTERVAL '7 days';
```