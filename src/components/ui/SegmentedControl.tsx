interface Props {
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
}

export default function SegmentedControl({ options, value, onChange }: Props) {
  return (
    <div className="inline-flex bg-surface-raised rounded-lg p-1 gap-1" role="tablist">
      {options.map((opt) => (
        <button
          key={opt.value}
          role="tab"
          aria-selected={value === opt.value}
          onClick={() => onChange(opt.value)}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
            value === opt.value
              ? 'bg-accent text-white shadow-sm'
              : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
