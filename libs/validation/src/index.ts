// Validation schemas and utilities
export const ValidationPatterns = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  UUID: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  PHONE: /^[+]?[0-9\s\-()]{7,}$/,
  SKU: /^[A-Z0-9\-]{3,20}$/,
};

export const validateEmail = (email: string): boolean => {
  return ValidationPatterns.EMAIL.test(email);
};

export const validateUUID = (uuid: string): boolean => {
  return ValidationPatterns.UUID.test(uuid);
};

export const validateSKU = (sku: string): boolean => {
  return ValidationPatterns.SKU.test(sku);
};
