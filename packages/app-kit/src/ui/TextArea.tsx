"use client";

import { useCallback, useEffect, useRef, type TextareaHTMLAttributes } from "react";
import { FieldError, FieldLabel, inputClass, useField } from "./field";

export interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string | undefined;
  /**
   * Classes for placing the field, such as a margin. They go on the outer element, which holds the
   * label, the text area and the error. Restyle the field through the theme variables.
   */
  className?: string | undefined;
  /** Grows with its text, from `rows` lines up to `maxRows` lines. On by default. */
  autoGrow?: boolean | undefined;
  /** The most lines an auto-growing box shows before it scrolls. Defaults to 12. */
  maxRows?: number | undefined;
}

export function TextArea({ label, error, className, autoGrow = true, maxRows = 12, rows = 3, onInput, ...props }: TextAreaProps) {
  const field = useField(props, error);
  const ref = useRef<HTMLTextAreaElement>(null);

  const resize = useCallback(() => {
    const el = ref.current;
    if (!el || !autoGrow) return;
    const style = getComputedStyle(el);
    const lineHeight = parseFloat(style.lineHeight) || 20;
    const padding = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom);
    // scrollHeight covers the content and padding. A border-box height also needs the border.
    const border = parseFloat(style.borderTopWidth) + parseFloat(style.borderBottomWidth);
    const boxFor = (lines: number) => lineHeight * lines + padding + border;
    el.style.height = "auto";
    el.style.height = `${Math.min(Math.max(el.scrollHeight + border, boxFor(Number(rows))), boxFor(maxRows))}px`;
  }, [autoGrow, rows, maxRows]);

  // A controlled box grows when its value changes. An uncontrolled one grows as it is typed in.
  useEffect(resize, [resize, props.value]);

  const handleInput = (event: Parameters<NonNullable<TextAreaProps["onInput"]>>[0]) => {
    onInput?.(event);
    resize();
  };

  return (
    <div className={className}>
      <FieldLabel htmlFor={field.inputId} required={props.required}>
        {label}
      </FieldLabel>
      <textarea
        {...props}
        {...field.inputProps}
        ref={ref}
        rows={rows}
        onInput={handleInput}
        // An auto-growing box has no resize handle. The next keystroke would undo the drag.
        className={inputClass(error, autoGrow ? "leading-relaxed resize-none" : "leading-relaxed resize-y")}
      />
      <FieldError id={field.errorId} error={error} />
    </div>
  );
}
