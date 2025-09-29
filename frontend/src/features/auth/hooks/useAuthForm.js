import { useState, useCallback } from 'react';
import { useAuthValidation } from './useAuthValidation';

/**
 * Auth Form Hook - Discord Style
 * Manages form state and validation for authentication forms
 */
export const useAuthForm = (initialData = {}, validationFields = []) => {
  const [formData, setFormData] = useState(initialData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { errors, validateForm, validateField, clearFieldError, setFieldError } = useAuthValidation();

  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Clear field error on change
    if (errors[name]) {
      clearFieldError(name);
    }
  }, [errors, clearFieldError]);

  const handleBlur = useCallback((e) => {
    const { name, value } = e.target;
    
    if (validationFields.includes(name)) {
      const error = validateField(name, value);
      if (error) {
        setFieldError(name, error);
      }
    }
  }, [validateField, validationFields, setFieldError]);

  const handleSubmit = useCallback(async (onSubmit) => {
    const { isValid, errors: validationErrors } = validateForm(formData, validationFields);
    
    if (!isValid) {
      return { success: false, errors: validationErrors };
    }

    setIsSubmitting(true);
    
    try {
      const result = await onSubmit(formData);
      return result;
    } catch (error) {
      return { 
        success: false, 
        error: error.message || 'Beklenmeyen bir hata oluştu' 
      };
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, validateForm, validationFields]);

  const resetForm = useCallback(() => {
    setFormData(initialData);
    setIsSubmitting(false);
  }, [initialData]);

  const setFieldValue = useCallback((field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  }, []);

  const isValid = validationFields.length === 0 || 
    validationFields.every(field => !errors[field] && formData[field]);

  return {
    formData,
    errors,
    isSubmitting,
    isValid,
    handleChange,
    handleBlur,
    handleSubmit,
    resetForm,
    setFieldValue
  };
};
