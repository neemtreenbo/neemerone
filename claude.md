# Claude Code Guidelines - Insurance Advisor Performance Portal

A comprehensive guide for developing our insurance advisor monitoring portal using Claude Code.

## Project Overview

**Project**: Neem Tree advisor performance monitoring portal  
**Branch**: Neem Tree (New Business Office of Sun Life of Canada Philippines)  
**Audience**: Personal agency management  
**Tech Stack**: Next.js + TypeScript + Tailwind CSS + Shadcn UI + Supabase

## Core Requirements for Claude

### 1. Certainty Threshold (90% Rule)
Claude must ask for clarification if confidence level is below 90% before:
- Making architectural decisions
- Modifying database schemas
- Implementing new features
- Changing existing business logic
- Making performance optimizations

**Example Clarification Prompts:**
- "I'm only 80% certain about the advisor hierarchy structure. Should advisors report to team leads, managers, or both?"
- "The performance metrics calculation isn't clear. Should we track monthly, quarterly, or custom date ranges?"

### 2. Honest Feedback & Course Correction
Claude should actively warn about:
- Potential architectural issues
- Performance bottlenecks
- Security vulnerabilities
- Code complexity that could harm maintainability
- Deviations from Next.js/React best practices

**Required Responses:**
- "This approach might create performance issues because..."
- "I recommend reconsidering this pattern as it could lead to..."
- "We're heading toward technical debt with this solution. Alternative approaches are..."

## Tech Stack Guidelines

### Next.js Best Practices
- Use App Router (not Pages Router)
- Implement proper Server Components vs Client Components
- Optimize for Core Web Vitals
- Use proper data fetching patterns (server-side when possible)
- Implement proper error boundaries and loading states

### TypeScript Requirements
- Strict mode enabled
- No `any` types (use proper typing)
- Define interfaces for all data structures
- Use generic types for reusable components
- Proper error handling with typed exceptions

### Supabase Integration (Critical)
- **ALWAYS use MCP (Model Context Protocol) for Supabase**
- Consult Supabase schema before making changes
- Sync all database operations through MCP
- Validate data integrity before mutations
- Use proper RLS (Row Level Security) policies
- Implement proper error handling for database operations

### UI/UX Standards
- Use Shadcn UI components as foundation
- Follow Tailwind CSS utility-first approach
- Ensure responsive design (mobile-first)
- Implement proper accessibility (ARIA labels, keyboard navigation)
- Consistent design system across all components

## Architecture Principles

### Memory Management
- Proper cleanup of event listeners
- Unsubscribe from subscriptions in useEffect cleanup
- Avoid memory leaks in data fetching
- Optimize component re-renders
- Use React.memo() judiciously
- Implement proper error boundaries

### Database Architecture
- Normalize data structure appropriately
- Use proper indexing for queries
- Implement efficient pagination
- Use database views for complex queries
- Proper foreign key relationships
- Regular backup strategies

### Performance Optimization
- Code splitting at route level
- Lazy loading for non-critical components
- Image optimization with Next.js Image component
- Proper caching strategies
- Bundle analysis and optimization

## Business Logic Guidelines

### Neem Tree Business Context

Before implementing features, Claude should understand:
- **Advisor hierarchy**: Individual → Manager Candidate → Unit Manager → Sales Manager → New Business Manager
- Performance metrics (Sales volume, client retention, policy types, commissions)
- Sun Life product portfolios and commission structures
- Team development and promotion tracking
- Client acquisition and management workflows

### Data Security (Basic)
- Secure user authentication and authorization
- Proper data validation and sanitization
- Audit trails for performance data changes
- Basic encryption for sensitive advisor information

## Required Checks Before Implementation

### Pre-Development Checklist
1. **Supabase Schema Review**: Check current schema via MCP
2. **Business Logic Validation**: Confirm understanding of Neem Tree workflows and Sun Life processes
3. **Performance Impact**: Assess potential performance implications
4. **Security Review**: Identify potential security risks
5. **User Experience**: Consider impact on agency leaders' workflow

### Code Review Standards
- Type safety validation
- Memory leak prevention
- Error handling completeness
- Performance optimization opportunities
- Business logic accuracy

## Communication Patterns

### Required Questions from Claude
- "Before proceeding, let me verify the advisor performance calculation logic..."
- "Should I check the current Supabase schema to ensure compatibility with Neem Tree data structure?"
- "This change might affect the advisor performance dashboard. Should we discuss the impact on your team management?"
- "I'm not entirely certain about the Sun Life commission calculation for Manager Candidates. Can you clarify?"

### Status Updates
- Progress reports on complex implementations
- Warnings about potential issues discovered
- Recommendations for alternative approaches
- Performance metrics and optimization suggestions

## Emergency Protocols

### When to Stop and Ask
- Database schema conflicts detected
- Potential data integrity issues
- Performance degradation risks
- Security vulnerability discoveries
- Business logic inconsistencies

### Escalation Triggers
- Cannot achieve 90% certainty
- Conflicting requirements detected
- Technical limitations discovered
- Architectural concerns identified

## Success Metrics

- Zero memory leaks in production
- Sub-2 second page load times
- 100% type safety (no `any` types)
- Proper error handling coverage
- Scalable architecture for growing advisor networks
- Maintainable codebase for future developers

## Quick Reference Commands

```bash
# Start development with proper environment
npm run dev

# Type checking
npm run type-check

# Build for production
npm run build

# Database operations (via MCP)
# Always consult Supabase schema first

# Performance analysis
npm run analyze
```

## Remember
- **Ask when uncertain (90% rule)**
- **Always consult Supabase via MCP**
- **Warn about architectural issues**
- **Focus on solid, leak-free architecture**
- **Consider Neem Tree's specific advisor hierarchy**
- **Prioritize personal agency management efficiency**