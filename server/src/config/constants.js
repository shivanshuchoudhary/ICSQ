/**
 * Application-wide constants
 * Centralized configuration for business rules and static values
 */

// Business Metrics
export const BUSINESS_TARGET = 85; // Static business target percentage for ICSQ scores

// Score Thresholds
export const SCORE_THRESHOLDS = {
  PROMOTER: 80,  // Score >= 80 is Promoter
  PASSIVE: 60,   // Score >= 60 and < 80 is Passive
  DETRACTOR: 0   // Score < 60 is Detractor
};

// Score Categories for color coding
export const SCORE_CATEGORIES = {
  LOW: 60,       // Score < 60 is considered low (Detractor)
  MEDIUM: 80,    // Score >= 60 and < 80 is medium (Passive)
  HIGH: 80       // Score >= 80 is high (Promoter)
};

// Department Code Mappings (Full names as per organizational structure)
export const DEPARTMENT_CODE_MAP = {
  // Service Functions
  'finance & accounts': 'F&A',
  'procurement': 'Procurement',
  'human resource & admin': 'HRA',
  'audit & assurance': 'A&A',
  'group information technology': 'GIT',
  'legal': 'Legal',
  'process improvement & business excellence': 'PI & BE',
  'people development': 'PD',
  'public relations': 'PR',
  'pnc architects': 'PNCA',
  'sobhapmc llc': 'SOBHA PMC',
  'marketing': 'Marketing',
  'collections': 'Collections',
  'latinem facilities management': 'LFM',
  
  // Delivery Functions
  'development': 'Development',
  'development strategy': 'Dev. Strategy',
  'md office': 'MDO',
  'sales operations': 'Sales Opr.',
  'customer relationship management': 'CRM',
  'sobha community management llc': 'SCM',
  'sales': 'Sales',
  'dubai land registration department': 'DLRD',
  'channel relations': 'Channel Rel.',
  'sobha energy solution': 'SES'
};

export default {
  BUSINESS_TARGET,
  SCORE_THRESHOLDS,
  SCORE_CATEGORIES,
  DEPARTMENT_CODE_MAP
};


