function ShiftBlock({
  shift,
  isLeave = false,
  isWeeklyOff = false,
  isHoliday = false,
  manuallyEdited = false,
  onClick,
}) {
  const shiftName =
    typeof shift === "object"
      ? shift?.name
      : shift;

  let label = shiftName || "Unassigned";

  if (isLeave) label = "Leave";
  else if (isHoliday) label = "Holiday";
  else if (isWeeklyOff) label = "Off";

  const getClassName = () => {
    const normalized = String(label).toLowerCase();

    if (normalized === "morning") {
      return "border-blue-100 bg-blue-50 text-blue-800 hover:bg-blue-100";
    }

    if (normalized === "general") {
      return "border-emerald-100 bg-emerald-50 text-emerald-800 hover:bg-emerald-100";
    }

    if (normalized === "evening") {
      return "border-orange-100 bg-orange-50 text-orange-800 hover:bg-orange-100";
    }

    if (normalized === "night") {
      return "border-indigo-100 bg-indigo-50 text-indigo-800 hover:bg-indigo-100";
    }

    if (normalized === "off") {
      return "border-slate-200 bg-slate-100 text-slate-600 hover:bg-slate-200";
    }

    if (normalized === "leave") {
      return "border-amber-100 bg-amber-50 text-amber-800 hover:bg-amber-100";
    }

    if (normalized === "holiday") {
      return "border-purple-100 bg-purple-50 text-purple-800 hover:bg-purple-100";
    }

    return "border-slate-200 bg-white text-slate-700 hover:bg-slate-50";
  };

  const showTime =
    !isLeave &&
    !isWeeklyOff &&
    !isHoliday &&
    shift &&
    typeof shift === "object";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-[64px] w-full flex-col justify-between rounded-lg border p-2 text-left transition ${getClassName()}`}
    >
      <div className="min-w-0">
        <p className="truncate text-xs font-semibold">
          {label}
        </p>

        {showTime && (
          <p className="mt-1 truncate text-[11px] opacity-70">
            {shift.startTime || "--"}
            {shift.endTime
              ? ` - ${shift.endTime}`
              : ""}
          </p>
        )}
      </div>

      {manuallyEdited && (
        <span className="mt-1 text-[10px] font-medium opacity-60">
          Manual
        </span>
      )}
    </button>
  );
}

export default ShiftBlock;