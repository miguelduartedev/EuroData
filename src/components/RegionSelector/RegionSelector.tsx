export interface RegionSelectorProps {
  label: string
}

export function RegionSelector({ label }: RegionSelectorProps) {
  return (
    <section
      className="w-full max-w-[290px] max-[600px]:max-w-none"
      aria-labelledby={`${label.toLowerCase().replaceAll(" ", "-")}-label`}
    >
      <p
        id={`${label.toLowerCase().replaceAll(" ", "-")}-label`}
        className="mb-1.5 text-xs font-bold uppercase tracking-[0.08em] text-[#455a75]"
      >
        {label}
      </p>
      <button className="w-full cursor-not-allowed rounded-md border border-slate-300 bg-slate-50 px-[13px] py-[11px] text-left text-slate-500" type="button" disabled>
        Select region2
      </button>
      {/* TODO: Design the controlled API and implement region search, filtering, and selection. */}
    </section>
  )
}
