import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface Customer {
  id: string;
  name: string;
  phone: string | null;
}

interface CustomerAutocompleteProps {
  customers: Customer[];
  value: string;
  onValueChange: (value: string) => void;
  onCustomerSelect: (customer: Customer | null) => void;
  placeholder?: string;
  className?: string;
}

export default function CustomerAutocomplete({
  customers,
  value,
  onValueChange,
  onCustomerSelect,
  placeholder = "Type customer name...",
  className,
}: CustomerAutocompleteProps) {
  const [open, setOpen] = useState(false);
  const [filtered, setFiltered] = useState<Customer[]>([]);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value.trim().length === 0) {
      setFiltered([]);
      setOpen(false);
      return;
    }
    const query = value.toLowerCase();
    const matches = customers.filter(
      (c) =>
        c.name.toLowerCase().includes(query) ||
        (c.phone && c.phone.includes(query))
    ).slice(0, 8);
    setFiltered(matches);
    setOpen(matches.length > 0);
  }, [value, customers]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={wrapperRef} className="relative">
      <Input
        value={value}
        onChange={(e) => {
          onValueChange(e.target.value);
          onCustomerSelect(null);
        }}
        onFocus={() => {
          if (filtered.length > 0) setOpen(true);
        }}
        placeholder={placeholder}
        className={cn("h-8 text-xs", className)}
      />
      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 max-h-48 overflow-y-auto rounded-md border bg-popover shadow-lg">
          {filtered.map((c) => (
            <button
              key={c.id}
              type="button"
              className="w-full flex items-center justify-between px-3 py-2 text-xs hover:bg-accent transition-colors text-left"
              onClick={() => {
                onValueChange(c.name);
                onCustomerSelect(c);
                setOpen(false);
              }}
            >
              <span className="font-medium truncate">{c.name}</span>
              {c.phone && <span className="text-muted-foreground ml-2 shrink-0">{c.phone}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
