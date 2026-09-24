import { ChevronDown } from "lucide-react";

function ShiftSelector({
  shifts = [],
  value = "",
  onChange,
  disabled = false,
  placeholder = "Select shift",
}) {
  return (
    <div className="relative w-full">
      <select
        value={value}
        onChange={(event) => onChange?.(event.target.value)}
        disabled={disabled}
        className="h-10 w-full appearance-none rounded-lg border border-slate-200 bg-white px-3 pr-9 text-sm text-slate-700 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
      >
        <option value="">{placeholder}</option>

        {shifts.map((shift) => (
          <option
            key={shift._id || shift.id}
            value={shift._id || shift.id}
          >
            {shift.name}
            {shift.startTime && shift.endTime
              ? ` (${shift.startTime} - ${shift.endTime})`
              : ""}
          </option>
        ))}
      </select>

      <ChevronDown
        size={16}
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
      />
    </div>
  );
}

export default ShiftSelector;