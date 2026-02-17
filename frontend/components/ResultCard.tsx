interface ResultCardProps {
  result: "Risk" | "No Risk";
  probability: number;
  probabilityPercent: number;
  onSave?: () => void;
  onReset?: () => void;
  isSaving?: boolean;
  isSaved?: boolean;
}

export default function ResultCard({
  result,
  probability,
  probabilityPercent,
  onSave,
  onReset,
  isSaving = false,
  isSaved = false,
}: ResultCardProps) {
  const isRisk = result === "Risk";

  return (
    <div className="card mt-8 border-2 border-slate-200">
      <h3 className="text-xl font-semibold text-navy-800 mb-6 text-center">
        Prediction Result
      </h3>

      <div className="text-center mb-6">
        {/* Result Badge */}
        <div
          className={`inline-flex items-center justify-center px-8 py-4 rounded-2xl text-2xl font-bold shadow-lg ${
            isRisk
              ? "bg-gradient-to-r from-red-500 to-red-600 text-white"
              : "bg-gradient-to-r from-emerald-500 to-emerald-600 text-white"
          }`}
        >
          {isRisk ? (
            <svg
              className="w-8 h-8 mr-3"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          ) : (
            <svg
              className="w-8 h-8 mr-3"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          )}
          {result}
        </div>
      </div>

      {/* Probability */}
      <div className="mb-8">
        <p className="text-center text-slate-600 mb-3 font-medium">Risk Probability</p>
        <div className="relative w-full h-8 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
          <div
            className={`h-full transition-all duration-700 ease-out ${
              isRisk 
                ? "bg-gradient-to-r from-red-400 to-red-500" 
                : "bg-gradient-to-r from-emerald-400 to-emerald-500"
            }`}
            style={{ width: `${probabilityPercent}%` }}
          />
          <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-navy-800">
            {probabilityPercent.toFixed(2)}%
          </span>
        </div>
        <p className="text-center text-sm text-slate-500 mt-3">
          Raw probability: {probability.toFixed(4)}
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-center gap-4">
        {onSave && !isSaved && (
          <button
            onClick={onSave}
            disabled={isSaving}
            className="btn-primary flex items-center"
          >
            {isSaving ? (
              <>
                <svg
                  className="animate-spin -ml-1 mr-2 h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                Saving...
              </>
            ) : (
              <>
                <svg
                  className="w-4 h-4 mr-2"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"
                  />
                </svg>
                Save to History
              </>
            )}
          </button>
        )}

        {isSaved && (
          <span className="inline-flex items-center px-4 py-2 rounded-lg bg-emerald-50 text-emerald-600 font-semibold border border-emerald-200">
            <svg
              className="w-5 h-5 mr-2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
            Saved Successfully
          </span>
        )}

        {onReset && (
          <button onClick={onReset} className="btn-secondary">
            New Prediction
          </button>
        )}
      </div>

      {/* Medical Disclaimer */}
      <div className="mt-8 p-5 bg-amber-50 border border-amber-100 rounded-xl">
        <p className="text-sm text-amber-800">
          <strong>Medical Disclaimer:</strong> This tool is intended for screening 
          support only and should not replace professional medical diagnosis or 
          laboratory confirmation.
        </p>
      </div>
    </div>
  );
}
