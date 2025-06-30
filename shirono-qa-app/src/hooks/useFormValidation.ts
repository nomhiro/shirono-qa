import { useState, useCallback, useMemo } from 'react'

interface ValidationRule {
  validate: (value: string) => string | null
  debounceMs?: number
}

interface UseFormValidationProps {
  initialValue?: string
  rules?: ValidationRule[]
  maxLength?: number
  onChange?: (value: string) => void
}

export function useFormValidation({
  initialValue = '',
  rules = [],
  maxLength,
  onChange
}: UseFormValidationProps) {
  const [value, setValue] = useState(initialValue)
  const [errors, setErrors] = useState<string[]>([])
  const [touched, setTouched] = useState(false)

  const validate = useCallback((inputValue: string) => {
    const validationErrors: string[] = []

    for (const rule of rules) {
      const error = rule.validate(inputValue)
      if (error) {
        validationErrors.push(error)
      }
    }

    setErrors(validationErrors)
    return validationErrors.length === 0
  }, [rules])

  const handleChange = useCallback((newValue: string) => {
    setValue(newValue)
    onChange?.(newValue)
    
    if (touched) {
      validate(newValue)
    }
  }, [touched, validate, onChange])

  const handleBlur = useCallback(() => {
    setTouched(true)
    validate(value)
  }, [value, validate])

  const isValid = useMemo(() => errors.length === 0, [errors])
  const isOverLimit = useMemo(() => 
    maxLength ? value.length > maxLength : false, 
    [value.length, maxLength]
  )

  const characterCount = useMemo(() => ({
    current: value.length,
    max: maxLength,
    remaining: maxLength ? maxLength - value.length : Infinity
  }), [value.length, maxLength])

  return {
    value,
    errors,
    touched,
    isValid,
    isOverLimit,
    characterCount,
    handleChange,
    handleBlur,
    validate: () => validate(value),
    reset: () => {
      setValue(initialValue)
      setErrors([])
      setTouched(false)
    }
  }
}