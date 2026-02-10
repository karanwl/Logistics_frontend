"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { DayPicker } from "react-day-picker";
import { Input } from "@/components/ui/input";
import "react-day-picker/dist/style.css";

type DatePickerInputProps = {
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
  id?: string;
  disabled?: boolean;
};

function formatDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDate(value: string) {
  if (!value) return undefined;
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

export function DatePickerInput({
  value,
  defaultValue,
  onChange,
  placeholder = "YYYY-MM-DD",
  className,
  id,
  disabled
}: DatePickerInputProps) {
  const isControlled = value !== undefined;
  const [internal, setInternal] = useState(defaultValue || "");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});

  const displayValue = isControlled ? value || "" : internal;

  const setValue = (next: string) => {
    if (!isControlled) setInternal(next);
    onChange?.(next);
  };

  useEffect(() => {
    if (!open) return;
    const handleClick = (event: MouseEvent) => {
      const target = event.target as Node;
      const inInput = containerRef.current?.contains(target);
      const inDropdown = dropdownRef.current?.contains(target);
      if (!inInput && !inDropdown) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  useLayoutEffect(() => {
    if (!open || !inputRef.current) return;
    const update = () => {
      if (!inputRef.current) return;
      const rect = inputRef.current.getBoundingClientRect();
      setDropdownStyle({
        position: "fixed",
        top: rect.bottom + 8,
        left: rect.left,
        zIndex: 9999
      });
    };
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [open]);

  return (
    <div className="relative" ref={containerRef}>
      <Input
        id={id}
        className={className}
        type="text"
        placeholder={placeholder}
        value={displayValue}
        onChange={(e) => setValue(e.target.value)}
        onFocus={() => setOpen(true)}
        onClick={() => setOpen(true)}
        disabled={disabled}
        ref={inputRef as any}
      />
      {open
        ? createPortal(
            <div
              ref={dropdownRef}
              style={dropdownStyle}
              className="rounded-xl border border-steel-200 bg-white/95 p-2 shadow-soft backdrop-blur"
            >
              <DayPicker
                mode="single"
                selected={parseDate(displayValue)}
                onSelect={(date) => {
                  if (!date) return;
                  setValue(formatDate(date));
                  setOpen(false);
                }}
                weekStartsOn={0}
                fixedWeeks
              />
            </div>,
            document.body
          )
        : null}
    </div>
  );
}
