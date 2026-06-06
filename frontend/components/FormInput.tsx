import { forwardRef, InputHTMLAttributes, SelectHTMLAttributes } from "react";

interface FormInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

interface FormSelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  error?: string;
  options: { value: string; label: string }[];
}

export const FormInput = forwardRef<HTMLInputElement, FormInputProps>(
  function FormInput({ label, error, className = "", type, step, ...props }, ref) {
    // For number inputs, always default to step="any" to allow decimal values
    // This prevents browser validation errors like "nearest valid values are 10 and 11"
    const resolvedStep = type === "number" ? (step ?? "any") : step;

    return (
      <div className="mb-4">
        <label className="form-label">
          {label}
          {props.required && <span className="text-red-500 ml-1">*</span>}
        </label>
        <input
          ref={ref}
          className={`form-input ${error ? "border-red-500" : ""} ${className}`}
          type={type}
          {...props}
          step={resolvedStep}
        />
        {error && <p className="form-error">{error}</p>}
      </div>
    );
  }
);

export const FormSelect = forwardRef<HTMLSelectElement, FormSelectProps>(
  function FormSelect({ label, error, options, className = "", ...props }, ref) {
    return (
      <div className="mb-4">
        <label className="form-label">
          {label}
          {props.required && <span className="text-red-500 ml-1">*</span>}
        </label>
        <select
          ref={ref}
          className={`form-input ${error ? "border-red-500" : ""} ${className}`}
          {...props}
        >
          <option value="">Select...</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {error && <p className="form-error">{error}</p>}
      </div>
    );
  }
);
