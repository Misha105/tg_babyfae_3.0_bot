/**
 * Validation utilities for input data
 */

const MAX_JSON_SIZE = 100 * 1024; // 100KB
const MAX_STRING_LENGTH = 1000;
const MAX_NOTES_LENGTH = 300;
const MAX_MEDICATION_NAME_LENGTH = 50;
const MAX_CUSTOM_ACTIVITY_NAME_LENGTH = 50;

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validates Telegram user ID
 */
export function validateUserId(id: unknown): ValidationResult {
  const userId = parseInt(String(id));
  
  if (isNaN(userId)) {
    return { valid: false, error: 'User ID must be a number' };
  }
  
  if (userId <= 0 || userId > 2147483647) {
    return { valid: false, error: 'Invalid user ID range' };
  }
  
  return { valid: true };
}

/**
 * Validates JSON payload size
 */
export function validateJsonSize(data: unknown): ValidationResult {
  try {
    const jsonString = JSON.stringify(data);
    const size = Buffer.byteLength(jsonString, 'utf8');
    
    if (size > MAX_JSON_SIZE) {
      return { 
        valid: false, 
        error: `Payload too large: ${size} bytes (max: ${MAX_JSON_SIZE} bytes)` 
      };
    }
    
    return { valid: true };
  } catch (error) {
    return { valid: false, error: 'Invalid JSON data' };
  }
}

/**
 * Validates string length
 */
export function validateStringLength(
  value: string, 
  maxLength: number = MAX_STRING_LENGTH,
  fieldName: string = 'Field'
): ValidationResult {
  if (typeof value !== 'string') {
    return { valid: false, error: `${fieldName} must be a string` };
  }
  
  if (value.length > maxLength) {
    return { 
      valid: false, 
      error: `${fieldName} is too long (max: ${maxLength} characters)` 
    };
  }
  
  return { valid: true };
}

/**
 * Validates activity data
 */
export function validateActivity(activity: unknown): ValidationResult {
  if (!activity || typeof activity !== 'object') {
    return { valid: false, error: 'Activity must be an object' };
  }
  
  // Type guard to ensure activity is an object
  const act = activity as Record<string, unknown>;
  
  // Validate required fields
  if (!act.id || typeof act.id !== 'string') {
    return { valid: false, error: 'Activity ID is required and must be a string' };
  }
  
  if (!act.type || typeof act.type !== 'string') {
    return { valid: false, error: 'Activity type is required and must be a string' };
  }
  
  const validTypes = ['feeding', 'water', 'medication', 'sleep', 'custom', 'diaper', 'pump', 'bath', 'walk', 'play', 'doctor', 'other'];
  if (!validTypes.includes(act.type)) {
    return { valid: false, error: 'Invalid activity type' };
  }
  
  if (!act.timestamp || typeof act.timestamp !== 'string') {
    return { valid: false, error: 'Activity timestamp is required and must be a string' };
  }
  
  // Validate timestamp format (ISO 8601)
  const timestamp = new Date(act.timestamp);
  if (isNaN(timestamp.getTime())) {
    return { valid: false, error: 'Invalid timestamp format' };
  }
  
  // Validate optional fields
  if (act.notes && typeof act.notes === 'string') {
    const notesValidation = validateStringLength(act.notes, MAX_NOTES_LENGTH, 'Notes');
    if (!notesValidation.valid) return notesValidation;
  }
  
  if (act.medicationName && typeof act.medicationName === 'string') {
    const medValidation = validateStringLength(act.medicationName, MAX_MEDICATION_NAME_LENGTH, 'Medication name');
    if (!medValidation.valid) return medValidation;
  }
  
  if (act.amount !== undefined && act.amount !== null) {
    const amount = parseFloat(String(act.amount));
    if (isNaN(amount) || amount < 0 || amount > 10000) {
      return { valid: false, error: 'Invalid amount value' };
    }
  }
  
  // Validate JSON size
  return validateJsonSize(activity);
}

/**
 * Validates custom activity definition
 */
export function validateCustomActivity(customActivity: unknown): ValidationResult {
  if (!customActivity || typeof customActivity !== 'object') {
    return { valid: false, error: 'Custom activity must be an object' };
  }
  
  const ca = customActivity as Record<string, unknown>;
  
  if (!ca.id || typeof ca.id !== 'string') {
    return { valid: false, error: 'Custom activity ID is required and must be a string' };
  }
  
  if (!ca.name || typeof ca.name !== 'string') {
    return { valid: false, error: 'Custom activity name is required and must be a string' };
  }
  
  const nameValidation = validateStringLength(ca.name, MAX_CUSTOM_ACTIVITY_NAME_LENGTH, 'Custom activity name');
  if (!nameValidation.valid) return nameValidation;
  
  return validateJsonSize(customActivity);
}

/**
 * Validates growth record
 */
export function validateGrowthRecord(record: unknown): ValidationResult {
  if (!record || typeof record !== 'object') {
    return { valid: false, error: 'Growth record must be an object' };
  }
  
  const rec = record as Record<string, unknown>;
  
  if (!rec.id || typeof rec.id !== 'string') {
    return { valid: false, error: 'Growth record ID is required and must be a string' };
  }
  
  if (!rec.date || typeof rec.date !== 'string') {
    return { valid: false, error: 'Growth record date is required and must be a string' };
  }
  
  // Validate date format
  const date = new Date(rec.date);
  if (isNaN(date.getTime())) {
    return { valid: false, error: 'Invalid date format' };
  }
  
  // Validate weight
  if (rec.weight !== undefined && rec.weight !== null) {
    const weight = parseFloat(String(rec.weight));
    if (isNaN(weight) || weight < 0 || weight > 50000) { // Max 50kg in grams
      return { valid: false, error: 'Invalid weight value' };
    }
  }
  
  // Validate height
  if (rec.height !== undefined && rec.height !== null) {
    const height = parseFloat(String(rec.height));
    if (isNaN(height) || height < 0 || height > 200) { // Max 200cm
      return { valid: false, error: 'Invalid height value' };
    }
  }
  
  return validateJsonSize(record);
}

/**
 * Validates profile data
 */
export function validateProfile(profile: unknown): ValidationResult {
  if (!profile || typeof profile !== 'object') {
    return { valid: false, error: 'Profile must be an object' };
  }
  
  const prof = profile as Record<string, unknown>;
  
  if (prof.name && typeof prof.name === 'string') {
    const nameValidation = validateStringLength(prof.name, 50, 'Name');
    if (!nameValidation.valid) return nameValidation;
  }
  
  if (prof.birthDate && typeof prof.birthDate === 'string') {
    const date = new Date(prof.birthDate);
    if (isNaN(date.getTime())) {
      return { valid: false, error: 'Invalid birth date format' };
    }
  }
  
  return validateJsonSize(profile);
}

/**
 * Validates settings data
 */
export function validateSettings(settings: unknown): ValidationResult {
  if (!settings || typeof settings !== 'object') {
    return { valid: false, error: 'Settings must be an object' };
  }
  
  const sett = settings as Record<string, unknown>;
  
  if (sett.feedingIntervalMinutes !== undefined) {
    const interval = parseInt(String(sett.feedingIntervalMinutes));
    if (isNaN(interval) || interval < 30 || interval > 1440) { // 30 min to 24 hours
      return { valid: false, error: 'Invalid feeding interval (must be between 30 and 1440 minutes)' };
    }
  }
  
  return validateJsonSize(settings);
}

/**
 * Sanitizes string input by removing potentially dangerous characters
 */
export function sanitizeString(input: string): string {
  if (typeof input !== 'string') return '';
  
  // Remove null bytes and control characters
  return input.replace(/[\x00-\x1F\x7F]/g, '').trim();
}
