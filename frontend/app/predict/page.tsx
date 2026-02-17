"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import axios from "axios";
import { FormInput, FormSelect } from "@/components/FormInput";
import ResultCard from "@/components/ResultCard";

// Validation schema
const parentSchema = z.object({
  patient_id: z.string().min(1, "Patient ID is required"),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  dob: z.string().min(1, "Date of birth is required").refine((val) => {
    const date = new Date(val);
    return date < new Date();
  }, "Date of birth must be in the past"),
  hb: z.coerce.number().positive("Hb must be greater than 0"),
  hct: z.coerce.number().min(0, "Hct must be >= 0").max(100, "Hct must be <= 100"),
  mcv: z.coerce.number().min(0, "MCV must be >= 0"),
  mch: z.coerce.number().min(0, "MCH must be >= 0"),
  dcip: z.enum(["Positive", "Negative"], { 
    required_error: "DCIP result is required" 
  }),
});

const formSchema = z.object({
  father: parentSchema,
  mother: parentSchema,
});

type FormData = z.infer<typeof formSchema>;

interface PredictionResult {
  result: "Risk" | "No Risk";
  probability: number;
  probability_percent: number;
  threshold_used: number;
  model_version: string;
}

const dcipOptions = [
  { value: "Positive", label: "Positive" },
  { value: "Negative", label: "Negative" },
];

export default function PredictPage() {
  const [predictionResult, setPredictionResult] = useState<PredictionResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    getValues,
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
  });

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    setError(null);
    setPredictionResult(null);
    setIsSaved(false);

    try {
      const response = await axios.post<PredictionResult>("/api/predict", data);
      setPredictionResult(response.data);
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.detail || err.response?.data?.error || "Prediction failed");
      } else {
        setError("An unexpected error occurred");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!predictionResult) return;

    setIsSaving(true);
    setError(null);

    try {
      const data = getValues();
      await axios.post("/api/predict/save", {
        ...data,
        result: predictionResult.result,
        probability: predictionResult.probability,
      });
      setIsSaved(true);
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.detail || err.response?.data?.error || "Failed to save");
      } else {
        setError("An unexpected error occurred while saving");
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    reset();
    setPredictionResult(null);
    setError(null);
    setIsSaved(false);
  };

  const ParentForm = ({
    type,
    errors: parentErrors,
  }: {
    type: "father" | "mother";
    errors: any;
  }) => (
    <div className="card border border-slate-200">
      <h3 className="text-lg font-semibold text-navy-800 mb-6 flex items-center">
        <span
          className={`w-10 h-10 rounded-xl flex items-center justify-center mr-3 text-lg ${
            type === "father"
              ? "bg-gradient-to-br from-blue-500 to-blue-600 text-white"
              : "bg-gradient-to-br from-pink-500 to-pink-600 text-white"
          }`}
        >
          {type === "father" ? "♂" : "♀"}
        </span>
        {type === "father" ? "Father Information" : "Mother Information"}
      </h3>

      <div className="grid md:grid-cols-2 gap-4">
        <FormInput
          label="Patient ID"
          {...register(`${type}.patient_id`)}
          error={parentErrors?.patient_id?.message}
          required
        />
        <FormInput
          label="First Name"
          {...register(`${type}.first_name`)}
          error={parentErrors?.first_name?.message}
        />
        <FormInput
          label="Last Name"
          {...register(`${type}.last_name`)}
          error={parentErrors?.last_name?.message}
        />
        <FormInput
          label="Date of Birth"
          type="date"
          {...register(`${type}.dob`)}
          error={parentErrors?.dob?.message}
          required
        />
      </div>

      <div className="border-t border-slate-100 my-6"></div>

      <h4 className="text-md font-medium text-navy-700 mb-4 flex items-center">
        <svg className="w-5 h-5 mr-2 text-navy-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
        </svg>
        Blood Test Values
      </h4>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        <FormInput
          label="Hb (g/dL)"
          type="number"
          step="0.1"
          {...register(`${type}.hb`)}
          error={parentErrors?.hb?.message}
          required
        />
        <FormInput
          label="Hct (%)"
          type="number"
          step="0.1"
          {...register(`${type}.hct`)}
          error={parentErrors?.hct?.message}
          required
        />
        <FormInput
          label="MCV (fL)"
          type="number"
          step="0.1"
          {...register(`${type}.mcv`)}
          error={parentErrors?.mcv?.message}
          required
        />
        <FormInput
          label="MCH (pg)"
          type="number"
          step="0.1"
          {...register(`${type}.mch`)}
          error={parentErrors?.mch?.message}
          required
        />
      </div>

      <div className="mt-4">
        <FormSelect
          label="Dichlorophenol Indolephenol (DCIP)"
          {...register(`${type}.dcip`)}
          options={dcipOptions}
          error={parentErrors?.dcip?.message}
          required
        />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="container mx-auto px-6 py-12">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-navy-800 mb-3">
            Thalassemia Risk Prediction
          </h1>
          <p className="text-slate-600 max-w-2xl mx-auto">
            Enter blood test values for both parents to predict thalassemia risk in their offspring.
          </p>
        </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="grid lg:grid-cols-2 gap-6 mb-6">
          <ParentForm type="father" errors={errors.father} />
          <ParentForm type="mother" errors={errors.mother} />
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        <div className="flex justify-center">
          <button
            type="submit"
            disabled={isLoading}
            className="btn-primary text-lg px-8 py-3"
          >
            {isLoading ? (
              <span className="flex items-center">
                <svg
                  className="animate-spin -ml-1 mr-3 h-5 w-5"
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
                Processing...
              </span>
            ) : (
              "Predict Risk"
            )}
          </button>
        </div>
      </form>

      {predictionResult && (
        <ResultCard
          result={predictionResult.result}
          probability={predictionResult.probability}
          probabilityPercent={predictionResult.probability_percent}
          onSave={handleSave}
          onReset={handleReset}
          isSaving={isSaving}
          isSaved={isSaved}
        />
      )}
      </div>
    </div>
  );
}
