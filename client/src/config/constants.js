/**
 * Frontend Constants
 * Centralized configuration for business rules and static values
 * Must match backend constants
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

export default {
  BUSINESS_TARGET,
  SCORE_THRESHOLDS,
  SCORE_CATEGORIES
};


