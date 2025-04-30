"use client";

import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  getAllTimezones,
  getCountry,
  type Timezone,
} from "countries-and-timezones";

interface TimezoneOption {
  value: string; // IANA name
  label: string; // Display label (e.g., "America/Toronto (Toronto, Canada) UTC-04:00")
  keywords: string; // Lowercase keywords for searching (iana name + country name + primary city approximation)
}

// Prepare timezone options once
const timezoneOptions = (() => {
  const allZonesObject = getAllTimezones();
  const options = Object.values(allZonesObject)
    .filter((tz): tz is Timezone => !tz.aliasOf)
    .map((tz: Timezone): TimezoneOption => {
      let label = tz.name.replace(/_/g, " ");
      let keywords = label.toLowerCase();
      const primaryCountryCode = tz.countries[0]; // Often the most relevant country

      if (primaryCountryCode) {
        const country = getCountry(primaryCountryCode);
        if (country) {
          // Try to approximate a primary city name from the IANA name
          const cityPart = tz.name.split("/").pop()?.replace(/_/g, " ");
          if (cityPart) {
            label += ` (${cityPart}, ${country.name})`;
          } else {
            label += ` (${country.name})`;
          }
          keywords += ` ${country.name.toLowerCase()}`;
          if (cityPart) keywords += ` ${cityPart.toLowerCase()}`;
        }
      }
      label += ` (UTC${tz.utcOffsetStr})`; // Add UTC offset

      return {
        value: tz.name,
        label: label,
        keywords: keywords,
      };
    })
    .sort((a, b) => a.label.localeCompare(b.label));
  return options;
})();

// Alias map for common names that aren't primary IANA identifiers
const ALIAS_MAP: Record<string, string> = {
  UTC: "Etc/UTC",
  GMT: "Etc/GMT",
};

interface TimezoneComboboxProps {
  value?: string | null;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  noResultsMessage?: string;
}

export function TimezoneCombobox({
  value,
  onChange,
  placeholder = "Select timezone...",
  searchPlaceholder = "Search timezone by name or region...",
  noResultsMessage = "No timezone found.",
}: TimezoneComboboxProps) {
  const [open, setOpen] = React.useState(false);

  const normalizedValue = ALIAS_MAP[value ?? ""] ?? value;

  const selectedLabel = React.useMemo(() => {
    const foundOption = timezoneOptions.find(
      (tz) => tz.value === normalizedValue
    );
    const label = foundOption?.label ?? value;
    return label;
  }, [value, normalizedValue]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between",
            !value && "text-muted-foreground"
          )}
        >
          {value ? selectedLabel : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command
          filter={(itemValue, search) => {
            const option = timezoneOptions.find(
              (opt) => opt.value.toLowerCase() === itemValue.toLowerCase()
            );
            if (option?.keywords.includes(search.toLowerCase())) return 1;
            return 0;
          }}
        >
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{noResultsMessage}</CommandEmpty>
            <CommandGroup>
              {timezoneOptions.map((tz) => (
                <CommandItem
                  key={tz.value}
                  value={tz.value}
                  onSelect={(currentValue) => {
                    // Resolve alias so form always stores primary IANA or alias if needed
                    const outputValue = ALIAS_MAP[currentValue]
                      ? currentValue
                      : tz.value;
                    if (outputValue !== value) {
                      onChange(outputValue);
                    }
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === tz.value ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {tz.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
