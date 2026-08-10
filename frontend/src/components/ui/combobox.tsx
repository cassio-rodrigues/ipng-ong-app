"use client"

import * as React from "react"
import * as PopoverPrimitive from "@radix-ui/react-popover"
import { Check } from "lucide-react"

import { cn } from "@/lib/utils"

export interface ComboboxOption {
  value: string
  label: string
}

interface ComboboxProps {
  options: ComboboxOption[]
  value: string
  onValueChange: (value: string) => void
  placeholder?: string
  emptyText?: string
  disabled?: boolean
  className?: string
}

export function Combobox({
  options,
  value,
  onValueChange,
  placeholder = "Buscar…",
  emptyText = "Nenhum resultado",
  disabled,
  className,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState("")

  const selected = options.find(o => o.value === value)
  const displayValue = open ? query : (selected?.label ?? "")
  const filtered = options.filter(o => o.label.toLowerCase().includes(query.trim().toLowerCase()))

  function selectOption(o: ComboboxOption) {
    onValueChange(o.value)
    setOpen(false)
  }

  return (
    <PopoverPrimitive.Root
      open={open}
      onOpenChange={o => {
        setOpen(o)
        setQuery("")
      }}
    >
      <PopoverPrimitive.Anchor asChild>
        <input
          type="text"
          value={displayValue}
          onChange={e => {
            setQuery(e.target.value)
            if (!open) setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={e => {
            if (e.key === "Escape") setOpen(false)
          }}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete="off"
          className={cn(
            "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
            className
          )}
        />
      </PopoverPrimitive.Anchor>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          align="start"
          sideOffset={4}
          onOpenAutoFocus={e => e.preventDefault()}
          className="z-50 w-[--radix-popover-trigger-width] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
        >
          <div className="max-h-64 overflow-y-auto">
            {filtered.length === 0 && (
              <p className="py-4 text-center text-sm text-muted-foreground">{emptyText}</p>
            )}
            {filtered.map(o => (
              <button
                key={o.value}
                type="button"
                onMouseDown={e => e.preventDefault()}
                onClick={() => selectOption(o)}
                className="relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-left text-sm outline-none hover:bg-accent hover:text-accent-foreground"
              >
                <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
                  {o.value === value && <Check className="h-4 w-4" />}
                </span>
                {o.label}
              </button>
            ))}
          </div>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  )
}
