import { Check } from "lucide-react";

const STEPS = [
  {
    id: 1,
    title: "Employee",
    description: "Select employee",
  },
  {
    id: 2,
    title: "Date",
    description: "Choose date",
  },
  {
    id: 3,
    title: "Shift",
    description: "Assign shift",
  },
  {
    id: 4,
    title: "Review",
    description: "Confirm assignment",
  },
];

function RosterStepper({
  currentStep = 1,
  onStepClick,
}) {
  return (
    <div className="w-full rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        {STEPS.map((step, index) => {
          const isCompleted = currentStep > step.id;
          const isCurrent = currentStep === step.id;
          const isClickable =
            step.id <= currentStep && onStepClick;

          return (
            <div
              key={step.id}
              className="flex min-w-0 flex-1 items-start"
            >
              <button
                type="button"
                disabled={!isClickable}
                onClick={() =>
                  isClickable &&
                  onStepClick(step.id)
                }
                className={`flex min-w-0 items-center gap-3 text-left ${
                  isClickable
                    ? "cursor-pointer"
                    : "cursor-default"
                }`}
              >
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-sm font-semibold transition ${
                    isCompleted
                      ? "border-slate-900 bg-slate-900 text-white"
                      : isCurrent
                      ? "border-slate-900 bg-white text-slate-900"
                      : "border-slate-200 bg-slate-50 text-slate-400"
                  }`}
                >
                  {isCompleted ? (
                    <Check size={16} />
                  ) : (
                    step.id
                  )}
                </span>

                <span className="min-w-0">
                  <span
                    className={`block truncate text-sm font-semibold ${
                      isCurrent || isCompleted
                        ? "text-slate-900"
                        : "text-slate-400"
                    }`}
                  >
                    {step.title}
                  </span>

                  <span className="mt-0.5 block truncate text-xs text-slate-500">
                    {step.description}
                  </span>
                </span>
              </button>

              {index < STEPS.length - 1 && (
                <div
                  className={`mx-3 mt-4 hidden h-px flex-1 md:block ${
                    currentStep > step.id
                      ? "bg-slate-900"
                      : "bg-slate-200"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default RosterStepper;
