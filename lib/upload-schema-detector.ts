/**
 * Upload Schema Detector
 * Detects the likely data type based on column headers to prevent users from
 * uploading to the wrong table (e.g., RN Commission data to FY Commission upload)
 */

export type DataSchema = 'submitted_apps' | 'settled_apps' | 'fy_commission' | 'rn_commission' | 'unknown';

export interface SchemaDetectionResult {
  detectedSchema: DataSchema;
  confidence: number; // 0-1, higher means more confident
  matchingFields: string[];
  uniqueFields: string[];
}

// Define unique field signatures for each schema
const SCHEMA_SIGNATURES = {
  submitted_apps: {
    unique: ['submitted_apps'],
    common: ['advisor_code', 'advisor_name', 'process_date', 'insured_name', 'policy_number'],
    incompatible: ['fy_premium_php', 'rn_premium_php', 'settled_apps', 'agency_credits', 'year']
  },
  settled_apps: {
    unique: ['settled_apps', 'agency_credits', 'net_sales_credits'],
    common: ['advisor_code', 'advisor_name', 'process_date', 'insured_name', 'policy_number'],
    incompatible: ['fy_premium_php', 'rn_premium_php', 'submitted_apps', 'year']
  },
  fy_commission: {
    unique: ['fy_premium_php', 'fy_commission_php'],
    common: ['code', 'process_date', 'insured_name', 'policy_number', 'transaction_type', 'due_date', 'rate'],
    incompatible: ['rn_premium_php', 'rn_commission_php', 'year', 'submitted_apps', 'settled_apps']
  },
  rn_commission: {
    unique: ['rn_premium_php', 'rn_commission_php', 'year'],
    common: ['code', 'process_date', 'insured_name', 'policy_number', 'transaction_type', 'due_date', 'rate'],
    incompatible: ['fy_premium_php', 'fy_commission_php', 'submitted_apps', 'settled_apps']
  }
};

/**
 * Detects the likely schema based on column headers from pasted Excel data
 */
export function detectDataSchema(columnHeaders: string[]): SchemaDetectionResult {
  // Normalize headers (lowercase, remove spaces, etc.)
  const normalizedHeaders = columnHeaders.map(header =>
    header.toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/[^\w]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '')
  );

  let bestMatch: SchemaDetectionResult = {
    detectedSchema: 'unknown',
    confidence: 0,
    matchingFields: [],
    uniqueFields: []
  };

  // Check each schema
  for (const [schemaName, signature] of Object.entries(SCHEMA_SIGNATURES)) {
    const schema = schemaName as DataSchema;

    // Check for unique fields (high confidence indicators)
    const foundUniqueFields = signature.unique.filter(field =>
      normalizedHeaders.some(header =>
        header.includes(field) || field.includes(header)
      )
    );

    // Check for common fields
    const foundCommonFields = signature.common.filter(field =>
      normalizedHeaders.some(header =>
        header.includes(field) || field.includes(header)
      )
    );

    // Check for incompatible fields (should reduce confidence)
    const foundIncompatibleFields = signature.incompatible.filter(field =>
      normalizedHeaders.some(header =>
        header.includes(field) || field.includes(header)
      )
    );

    // Calculate confidence score
    let confidence = 0;

    // Unique fields are worth more
    confidence += foundUniqueFields.length * 0.4;

    // Common fields add some confidence
    confidence += foundCommonFields.length * 0.1;

    // Incompatible fields reduce confidence significantly
    confidence -= foundIncompatibleFields.length * 0.3;

    // Bonus for having all unique fields
    if (foundUniqueFields.length === signature.unique.length) {
      confidence += 0.2;
    }

    // Normalize confidence to 0-1 range
    confidence = Math.max(0, Math.min(1, confidence));

    const result: SchemaDetectionResult = {
      detectedSchema: schema,
      confidence,
      matchingFields: [...foundUniqueFields, ...foundCommonFields],
      uniqueFields: foundUniqueFields
    };

    if (confidence > bestMatch.confidence) {
      bestMatch = result;
    }
  }

  return bestMatch;
}

/**
 * Checks if the detected schema matches the expected schema for the upload component
 */
export function isSchemaCompatible(
  detectedSchema: DataSchema,
  expectedSchema: DataSchema,
  confidence: number
): { compatible: boolean; warning?: string } {

  // If confidence is low, we're not sure - allow it
  if (confidence < 0.3) {
    return { compatible: true };
  }

  // If schemas match, all good
  if (detectedSchema === expectedSchema) {
    return { compatible: true };
  }

  // If schemas don't match and confidence is high, show warning
  const schemaNames = {
    submitted_apps: 'Submitted Applications',
    settled_apps: 'Settled Applications',
    fy_commission: 'FY Commission',
    rn_commission: 'RN Commission',
    unknown: 'Unknown'
  };

  const detectedName = schemaNames[detectedSchema] || detectedSchema;
  const expectedName = schemaNames[expectedSchema] || expectedSchema;

  return {
    compatible: false,
    warning: `⚠️ This looks like ${detectedName} data, but you're uploading to ${expectedName}. Please verify you're using the correct upload page.`
  };
}

/**
 * Gets user-friendly suggestions for the correct upload page
 */
export function getCorrectUploadSuggestion(detectedSchema: DataSchema): string {
  const suggestions = {
    submitted_apps: 'Please use the "Submitted Applications Import" page for this data.',
    settled_apps: 'Please use the "Settled Applications Import" page for this data.',
    fy_commission: 'Please use the "FY Commission Import" page for this data.',
    rn_commission: 'Please use the "RN Commission Import" page for this data.',
    unknown: 'Please verify your data format and column headers.'
  };

  return suggestions[detectedSchema] || suggestions.unknown;
}