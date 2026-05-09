"use client";

import { forwardRef, useId } from "react";
import type { InputHTMLAttributes, TextareaHTMLAttributes, ReactNode } from "react";

interface BaseProps {
  label?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  className?: string;
}

type InputProps = BaseProps &
  InputHTMLAttributes<HTMLInputElement> & {
    as?: "input";
    leftIcon?: ReactNode;
  };

type TextareaProps = BaseProps &
  TextareaHTMLAttributes<HTMLTextAreaElement> & {
    as: "textarea";
  };

export type FormFieldProps = InputProps | TextareaProps;

const fieldClass =
  "w-full bg-black/50 border rounded-xl px-4 py-3 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed";

const stateClass = (hasError: boolean) =>
  hasError
    ? "border-red-500/40 focus:ring-red-500/50 focus:border-red-500/60"
    : "border-white/10 focus:ring-amber-500/50 focus:border-amber-500/50";

/**
 * Padronized form field with label, hint, and error message.
 * Aligns with the TheoSphere glassmorphic input style used in AuthModal.
 */
export const FormField = forwardRef<HTMLInputElement | HTMLTextAreaElement, FormFieldProps>(
  function FormField(props, ref) {
    const reactId = useId();
    const id = props.id ?? reactId;
    const errorId = `${id}-error`;
    const hintId = `${id}-hint`;
    const { label, hint, error, required, className, ...rest } = props;
    const hasError = Boolean(error);

    const describedBy =
      [hasError ? errorId : null, hint ? hintId : null].filter(Boolean).join(" ") || undefined;

    const fieldNode =
      props.as === "textarea" ? (
        <textarea
          {...(rest as TextareaHTMLAttributes<HTMLTextAreaElement>)}
          ref={ref as React.Ref<HTMLTextAreaElement>}
          id={id}
          aria-invalid={hasError}
          aria-describedby={describedBy}
          required={required}
          className={`${fieldClass} ${stateClass(hasError)} min-h-[96px] resize-y`}
        />
      ) : (
        (() => {
          const { leftIcon, ...inputRest } = rest as InputProps;
          const input = (
            <input
              {...(inputRest as InputHTMLAttributes<HTMLInputElement>)}
              ref={ref as React.Ref<HTMLInputElement>}
              id={id}
              aria-invalid={hasError}
              aria-describedby={describedBy}
              required={required}
              className={`${fieldClass} ${stateClass(hasError)} ${leftIcon ? "pl-10" : ""}`}
            />
          );
          if (!leftIcon) return input;
          return (
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none">
                {leftIcon}
              </span>
              {input}
            </div>
          );
        })()
      );

    return (
      <div className={`space-y-1.5 ${className ?? ""}`}>
        {label && (
          <label
            htmlFor={id}
            className="block text-xs font-medium text-zinc-500 uppercase tracking-wider ml-1"
          >
            {label}
            {required && <span className="text-red-400 ml-1" aria-hidden="true">*</span>}
          </label>
        )}
        {fieldNode}
        {hint && !hasError && (
          <p id={hintId} className="text-[11px] text-white/30 ml-1">
            {hint}
          </p>
        )}
        {hasError && (
          <p id={errorId} role="alert" className="text-[11px] text-red-400 ml-1">
            {error}
          </p>
        )}
      </div>
    );
  }
);
