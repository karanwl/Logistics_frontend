"use client";

import { useCallback, useState } from "react";
import { readCorrelationId, readErrorMessage } from "@/lib/errors/client";

export type FormErrorState = {
  message: string;
  correlationId?: string;
} | null;

export function useFormError(defaultMessage = "Could not complete this action.") {
  const [formError, setFormErrorState] = useState<FormErrorState>(null);

  const clearFormError = useCallback(() => {
    setFormErrorState(null);
  }, []);

  const setFormError = useCallback(
    (error: unknown, fallback?: string) => {
      const message = readErrorMessage(error, fallback || defaultMessage);
      const correlationId = readCorrelationId(error);
      setFormErrorState({ message, correlationId });
    },
    [defaultMessage]
  );

  return {
    formError,
    clearFormError,
    setFormError,
  };
}
