interface Props {
  value: string;
  onChange: (next: string) => void;
}

/**
 * Free-text vendor filter. Any string passed here is substring-matched
 * against the JSON-serialised payload + source of every event in the
 * timeline + cards. Cleared by the Clear button or pressing Escape.
 */
export function VendorFilter({ value, onChange }: Props) {
  return (
    <div className="vendor-filter">
      <label htmlFor="vendor-filter-input" className="vendor-filter-label">
        Filter to one vendor
      </label>
      <div className="vendor-filter-row">
        <input
          id="vendor-filter-input"
          type="search"
          placeholder="e.g. acmetutor.example.com"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") onChange("");
          }}
          spellCheck={false}
          autoComplete="off"
        />
        {value && (
          <button type="button" className="vendor-filter-clear" onClick={() => onChange("")}>
            clear
          </button>
        )}
      </div>
      <p className="vendor-filter-hint">
        Substring match against event payload + source. Useful for "show me everything that
        touched this vendor."
      </p>
    </div>
  );
}
