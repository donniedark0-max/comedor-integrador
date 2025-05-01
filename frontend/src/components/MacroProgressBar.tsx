interface MacroProgressBarProps {
  value: number
  max: number
  label: string
  color: string
}

export function MacroProgressBar({ value, max, label, color }: MacroProgressBarProps) {
  const percentage = Math.min(Math.round((value / max) * 100), 100)

  return (
    <div className="mb-3">
      <div className="flex justify-between mb-1">
        <span className="text-sm font-medium">{label}</span>
        <span className="text-sm text-[var(--color-neutral-dark)]/70">
          {value.toFixed(1)}g / {max}g
        </span>
      </div>
      <div className="w-full bg-[var(--color-neutral-light)] rounded-full h-2.5">
        <div
          className={`h-2.5 rounded-full ${color}`}
          style={{ width: `${percentage}%` }}
          aria-valuenow={value}
          aria-valuemin={0}
          aria-valuemax={max}
          role="progressbar"
        ></div>
      </div>
    </div>
  )
}
