interface SingleModelResult {
  model_name: string;
  result: "Risk" | "No Risk";
  probability: number;
  probability_percent: number;
  threshold_used: number;
}

interface MultiResultCardProps {
  models: SingleModelResult[];
  onSave?: () => void;
  onReset?: () => void;
  isSaving?: boolean;
  isSaved?: boolean;
}

const MODEL_CATEGORIES: Record<string, string[]> = {
  "Tree-Based Models": ["Random Forest", "XGBoost", "NGBoost"],
  "Transformer Models": ["FT-Transformer", "Meta Tabular FT-Transformer"],
};

const MODEL_ICONS: Record<string, string> = {
  "Random Forest": "🌲",
  "XGBoost": "⚡",
  "NGBoost": "📊",
  "FT-Transformer": "🔮",
  "Meta Tabular FT-Transformer": "🧠",
};

export default function MultiResultCard({
  models,
  onSave,
  onReset,
  isSaving = false,
  isSaved = false,
}: MultiResultCardProps) {
  const riskCount = models.filter((m) => m.result === "Risk").length;
  const totalCount = models.length;
  const majorityRisk = riskCount > totalCount / 2;

  return (
    <div className="mt-8 space-y-6">
      {/* Summary Card */}
      <div className="card border-2 border-slate-200 overflow-hidden">
        <div
          className={`-mx-6 -mt-6 px-6 py-5 mb-6 ${
            majorityRisk
              ? "bg-gradient-to-r from-red-500/10 to-red-600/5 border-b border-red-100"
              : "bg-gradient-to-r from-emerald-500/10 to-emerald-600/5 border-b border-emerald-100"
          }`}
        >
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h3 className="text-xl font-bold text-navy-800">
                Screening Results
              </h3>
              <p className="text-sm text-slate-500 mt-1">
                Consensus from {totalCount} prediction models
              </p>
            </div>
            <div
              className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-lg font-bold shadow-sm ${
                majorityRisk
                  ? "bg-gradient-to-r from-red-500 to-red-600 text-white"
                  : "bg-gradient-to-r from-emerald-500 to-emerald-600 text-white"
              }`}
            >
              {majorityRisk ? (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
              {riskCount}/{totalCount} Models Predict Risk
            </div>
          </div>
        </div>

        {/* Model Results by Category */}
        <div className="space-y-6">
          {Object.entries(MODEL_CATEGORIES).map(([category, modelNames]) => {
            const categoryModels = modelNames
              .map((name) => models.find((m) => m.model_name === name))
              .filter(Boolean) as SingleModelResult[];

            if (categoryModels.length === 0) return null;

            return (
              <div key={category}>
                <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  {category === "Tree-Based Models" ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  )}
                  {category}
                </h4>
                <div className="grid md:grid-cols-3 gap-3">
                  {categoryModels.map((model) => {
                    const isRisk = model.result === "Risk";
                    return (
                      <div
                        key={model.model_name}
                        className={`relative rounded-xl border p-4 transition-all hover:shadow-md ${
                          isRisk
                            ? "border-red-200 bg-red-50/50"
                            : "border-emerald-200 bg-emerald-50/50"
                        }`}
                      >
                        {/* Model Name */}
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-lg">
                            {MODEL_ICONS[model.model_name] || "🤖"}
                          </span>
                          <span className="text-sm font-semibold text-navy-800 truncate">
                            {model.model_name}
                          </span>
                        </div>

                        {/* Result Badge */}
                        <div className="mb-3">
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold ${
                              isRisk
                                ? "bg-red-100 text-red-700"
                                : "bg-emerald-100 text-emerald-700"
                            }`}
                          >
                            {isRisk ? (
                              <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01" />
                              </svg>
                            ) : (
                              <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                            {model.result}
                          </span>
                        </div>

                        {/* Probability Bar */}
                        <div>
                          <div className="flex justify-between text-xs text-slate-500 mb-1">
                            <span>Probability</span>
                            <span className="font-semibold text-navy-700">
                              {model.probability_percent.toFixed(2)}%
                            </span>
                          </div>
                          <div className="relative w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-700 ease-out ${
                                isRisk
                                  ? "bg-gradient-to-r from-red-400 to-red-500"
                                  : "bg-gradient-to-r from-emerald-400 to-emerald-500"
                              }`}
                              style={{ width: `${model.probability_percent}%` }}
                            />
                          </div>
                          <div className="mt-1 text-[10px] text-slate-400">
                            Threshold: {(model.threshold_used * 100).toFixed(0)}%
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-center gap-4 mt-8 pt-6 border-t border-slate-100">
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
              New Screening
            </button>
          )}
        </div>

        {/* Medical Disclaimer */}
        <div className="mt-6 p-5 bg-amber-50 border border-amber-100 rounded-xl">
          <p className="text-sm text-amber-800">
            <strong>Medical Disclaimer:</strong> This tool is intended for screening
            support only and should not replace professional medical diagnosis or
            laboratory confirmation.
          </p>
        </div>
      </div>
    </div>
  );
}
