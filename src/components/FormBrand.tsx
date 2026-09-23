export function FormBrand({ compact = false }: { compact?: boolean }) {
  return (
    <span className={`form-brand${compact ? " form-brand-compact" : ""}`}>
      <span className="form-symbol" aria-hidden="true" />
      {!compact && <span className="form-brand-word">Form Rehab</span>}
    </span>
  );
}
