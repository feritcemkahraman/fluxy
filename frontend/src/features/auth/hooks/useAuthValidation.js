import { useState, useCallback } from 'react';
import { AUTH_VALIDATION_RULES } from '../constants';

/**
 * Auth Validation Hook - Discord Style
 * Handles form validation for authentication forms
 */
export const useAuthValidation = () => {
  const [errors, setErrors] = useState({});

  const validateField = useCallback((field, value) => {
    const rules = AUTH_VALIDATION_RULES[field.toUpperCase()];
    if (!rules) return null;

    // Required validation
    if (rules.required && (!value || value.trim() === '')) {
      return `${field} gereklidir`;
    }

    // Length validation
    if (value && rules.minLength && value.length < rules.minLength) {
      return rules.message || `${field} en az ${rules.minLength} karakter olmalıdır`;
    }

    if (value && rules.maxLength && value.length > rules.maxLength) {
      return rules.message || `${field} en fazla ${rules.maxLength} karakter olabilir`;
    }

    // Pattern validation
    if (value && rules.pattern && !rules.pattern.test(value)) {
      return rules.message || `${field} formatı geçersiz`;
    }

    return null;
  }, []);

  const validateForm = useCallback((formData, fields) => {
    const newErrors = {};
    let isValid = true;

    fields.forEach(field => {
      const error = validateField(field, formData[field]);
      if (error) {
        newErrors[field] = error;
        isValid = false;
      }
    });

    // Custom validations
    if (formData.password && formData.confirmPassword && 
        formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Şifreler eşleşmiyor';
      isValid = false;
    }

    setErrors(newErrors);
    return { isValid, errors: newErrors };
  }, [validateField]);

  const clearErrors = useCallback(() => {
    setErrors({});
  }, []);

  const clearFieldError = useCallback((field) => {
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[field];
      return newErrors;
    });
  }, []);

  const setFieldError = useCallback((field, error) => {
    setErrors(prev => ({
      ...prev,
      [field]: error
    }));
  }, []);

  return {
    errors,
    validateField,
    validateForm,
    clearErrors,
    clearFieldError,
    setFieldError
  };
};
