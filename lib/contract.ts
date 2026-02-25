/**
 * Core type definitions for the contract generation system
 */

// ============================================================================
// CLAUSE SYSTEM TYPES
// ============================================================================

/**
 * Severity levels for red flag warnings
 */
export type RedFlagSeverity = 'danger' | 'warning';

/**
 * Red flag warning that appears when certain conditions aren't met
 */
export interface RedFlag {
  id: string;
  severity: RedFlagSeverity;
  message: string;
  recommendation: string;
}

/**
 * A variable that can be customized within a clause
 */
export interface ClauseVariable {
  id: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'select' | 'boolean' | 'textarea';
  defaultValue: string | number | boolean;
  options?: Array<{ value: string; label: string }>; // For select type
  placeholder?: string;
  helpText?: string;
  calculated?: boolean; // Add this line - marks auto-calculated fields
  validation?: {
    required?: boolean;
    min?: number;
    max?: number;
    pattern?: string;
  };
}

/**
 * A single contract clause variation
 */
export interface ClauseVariation {
  id: string;
  name: string;
  description: string; // Why choose this variation
  legalText: string; // The actual contract text (can include {{variables}})
  variables: ClauseVariable[];
  isCreatorFriendly: boolean; // Highlight creator-friendly options
  tags: string[]; // e.g., ['standard', 'aggressive', 'flexible']
  redFlags?: RedFlag[]; // Add this line - optional array of red flags
}

/**
 * A contract section (e.g., "Payment Terms")
 */
export interface ContractSection {
  id: string;
  title: string;
  description: string;
  explanation: string; // "Why this matters for creators"
  required: boolean; // Can this section be omitted?
  order: number; // Display order in contract
  variations: ClauseVariation[];
  defaultVariationId: string; // Which variation to show by default
  redFlags: RedFlag[]; // Warnings if this section is missing/misconfigured
}

// ============================================================================
// DEAL TYPE SYSTEM
// ============================================================================

/**
 * Types of influencer deals
 */
export type DealType = 
  | 'single-post'
  | 'multi-post-campaign'
  | 'long-term-partnership'
  | 'brand-ambassador'
  | 'product-review'
  | 'event-coverage'
  | 'content-licensing';

/**
 * Configuration for a deal type preset
 */
export interface DealTypePreset {
  id: DealType;
  name: string;
  description: string;
  icon: string; // Emoji or icon identifier
  recommendedSections: string[]; // Section IDs to include by default
  optionalSections: string[]; // Section IDs available but not selected
  defaultValues: Record<string, any>; // Default variable values for this deal type
  tips: string[]; // Quick tips for this deal type
}

// ============================================================================
// CONTRACT BUILDER STATE
// ============================================================================

/**
 * Selected variation and its customized values
 */
export interface SelectedClause {
  sectionId: string;
  variationId: string;
  variableValues: Record<string, any>; // Variable ID -> custom value
}

/**
 * The contract being built
 */
export interface ContractState {
  // Basic info
  dealType: DealType | null;
  
  // Parties
  creatorName: string;
  creatorBusinessName?: string;
  brandName: string;
  brandContactName: string;
  
  // Selected sections and their clauses
  selectedSections: string[]; // Section IDs included in contract
  clauses: SelectedClause[]; // Customized clauses
  
  // Metadata
  createdAt: Date;
  lastModified: Date;
  contractTitle?: string; // Optional custom name for the contract
}

/**
 * Compiled contract ready for PDF generation
 */
export interface CompiledContract {
  title: string;
  parties: {
    creator: string;
    brand: string;
  };
  effectiveDate: Date;
  sections: Array<{
    title: string;
    content: string; // Fully compiled with variables replaced
    order: number;
  }>;
  signatures: {
    creator: { name: string; date?: Date };
    brand: { name: string; date?: Date };
  };
}

// ============================================================================
// RED FLAG DETECTION
// ============================================================================

/**
 * Rule for detecting problematic contract configurations
 */
export interface RedFlagRule {
  id: string;
  check: (contract: ContractState, sections: ContractSection[]) => boolean;
  flag: RedFlag;
  appliesToDealTypes?: DealType[]; // If specified, only applies to these deal types
}

// ============================================================================
// DRAFT SAVING
// ============================================================================

/**
 * Saved contract draft
 */
export interface SavedDraft {
  id: string;
  name: string;
  contract: ContractState;
  savedAt: Date;
}