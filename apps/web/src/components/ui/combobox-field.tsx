"use client";

import { useCombobox } from "downshift";
import { ChevronDown } from "lucide-react";
import { useId, useMemo, useState } from "react";

import type { SelectOption } from "@/components/ui/select-field";
import { cn } from "@/utils/cn";

export type ComboboxFieldProps = {
  label: string;
  options: SelectOption[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  /** Shown in the list when the typed name matches nothing. */
  emptyText: string;
  /** Accessible name of the button that opens the full list. */
  openLabel: string;
};

/** Compare names ignoring case and accents, so "cebollin" finds "Cebollín". */
function foldName(value: string): string {
  return value.normalize("NFD").replace(/\p{M}/gu, "").toLocaleLowerCase("es");
}

function visibleOptions(
  options: SelectOption[],
  query: string,
  selected: SelectOption | null,
): SelectOption[] {
  const folded = foldName(query.trim());
  if (folded === "" || (selected !== null && foldName(selected.label) === folded)) return options;
  return options.filter((option) => foldName(option.label).includes(folded));
}

/**
 * Labelled text field that filters a list by name. For long catalogs (products).
 * Short fixed lists stay on the native `SelectField`.
 */
export function ComboboxField({
  label,
  options,
  value,
  onValueChange,
  placeholder,
  hint,
  error,
  required,
  disabled,
  emptyText,
  openLabel,
}: ComboboxFieldProps): React.JSX.Element {
  const id = useId();
  const messageId = `${id}-message`;
  const message = error ?? hint;
  const [query, setQuery] = useState("");
  const selected = options.find((option) => option.value === value) ?? null;
  const items = useMemo(() => visibleOptions(options, query, selected), [options, query, selected]);

  const box = useCombobox({
    id,
    items,
    selectedItem: selected,
    itemToString: (item) => item?.label ?? "",
    itemToKey: (item) => item?.value ?? "",
    // Clearing the id while the user is still typing would reset the text,
    // because the selected item is controlled. Keep what they wrote.
    stateReducer: (state, { type, changes }) => {
      if (
        type === useCombobox.stateChangeTypes.ControlledPropUpdatedSelectedItem &&
        changes.selectedItem == null &&
        state.inputValue !== ""
      ) {
        return { ...changes, inputValue: state.inputValue };
      }
      return changes;
    },
    onInputValueChange: ({ inputValue = "", type }) => {
      setQuery(inputValue);
      if (
        type === useCombobox.stateChangeTypes.InputChange &&
        selected !== null &&
        inputValue !== selected.label
      ) {
        onValueChange("");
      }
    },
    onSelectedItemChange: ({ selectedItem }) => {
      const next = selectedItem?.value ?? "";
      if (next !== value) onValueChange(next);
    },
  });

  return (
    <div className="space-y-1">
      <label {...box.getLabelProps()} className="block text-sm font-medium text-foreground">
        {label}
        {required && (
          <span aria-hidden className="ml-0.5 text-danger-text">
            *
          </span>
        )}
      </label>
      <div className="relative">
        <input
          {...box.getInputProps({
            placeholder,
            disabled,
            autoComplete: "off",
            "aria-invalid": error ? true : undefined,
            "aria-describedby": message ? messageId : undefined,
          })}
          className={cn(
            "block min-h-11 w-full rounded-lg border bg-surface px-3 py-2 pr-11 text-base text-foreground",
            "placeholder:text-muted focus:ring-2 focus:outline-none",
            "disabled:cursor-not-allowed disabled:bg-surface-muted disabled:opacity-70",
            error
              ? "border-danger-border focus:ring-danger-border"
              : "border-border-strong focus:ring-focus",
          )}
        />
        <button
          type="button"
          {...box.getToggleButtonProps({ disabled, "aria-label": openLabel })}
          className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-muted disabled:opacity-70"
        >
          <ChevronDown aria-hidden className="size-5" />
        </button>
        <ul
          {...box.getMenuProps()}
          hidden={!box.isOpen}
          className="absolute z-20 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-border-strong bg-surface py-1 shadow-sm"
        >
          {box.isOpen &&
            items.map((item, index) => (
              <li
                key={item.value}
                {...box.getItemProps({ item, index })}
                className={cn(
                  "cursor-pointer px-3 py-2 text-base",
                  box.highlightedIndex === index && "bg-primary-soft",
                )}
              >
                {item.label}
              </li>
            ))}
          {box.isOpen && items.length === 0 && (
            <li className="px-3 py-2 text-sm text-muted">{emptyText}</li>
          )}
        </ul>
      </div>
      {message && (
        <p id={messageId} className={cn("text-sm", error ? "text-danger-text" : "text-muted")}>
          {message}
        </p>
      )}
    </div>
  );
}
