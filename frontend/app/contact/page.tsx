"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormInput } from "@/components/FormInput";
import axios from "axios";

const contactSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Please enter a valid email"),
  subject: z.string().min(1, "Subject is required"),
  message: z.string().min(10, "Message must be at least 10 characters"),
});

type ContactFormData = z.infer<typeof contactSchema>;

export default function ContactPage() {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
  });

  const onSubmit = async (data: ContactFormData) => {
    setIsSubmitting(true);
    setErrorMessage("");
    try {
      await axios.post("/api/contact", data);
      setIsSubmitted(true);
      reset();

      // Reset the success message after 5 seconds
      setTimeout(() => setIsSubmitted(false), 5000);
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 429) {
        setErrorMessage("You have sent too many messages. Please wait 10 minutes before trying again.");
      } else {
        setErrorMessage("Failed to send message. Please try again later.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-navy-800 mb-2">Contact Us</h1>
      <p className="text-slate-600 mb-8">
        Have questions or feedback? We would love to hear from you.
      </p>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Contact Form */}
        <div className="card">
          <h2 className="text-xl font-semibold text-navy-800 mb-6">
            Send us a Message
          </h2>

          {isSubmitted && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center">
                <svg
                  className="h-5 w-5 text-green-500 mr-2"
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
                <p className="text-green-700">
                  Thank you for your message! We will get back to you soon.
                </p>
              </div>
            </div>
          )}

          {errorMessage && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700 text-sm">{errorMessage}</p>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)}>
            <FormInput
              label="Name"
              {...register("name")}
              error={errors.name?.message}
              required
            />

            <FormInput
              label="Email"
              type="email"
              {...register("email")}
              error={errors.email?.message}
              required
            />

            <FormInput
              label="Subject"
              {...register("subject")}
              error={errors.subject?.message}
              required
            />

            <div className="mb-4">
              <label className="form-label">
                Message<span className="text-red-500 ml-1">*</span>
              </label>
              <textarea
                {...register("message")}
                rows={5}
                className={`form-input ${errors.message ? "border-red-500" : ""}`}
              />
              {errors.message && (
                <p className="form-error">{errors.message.message}</p>
              )}
            </div>

            <button 
              type="submit" 
              className="btn-primary w-full flex justify-center items-center"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Sending...
                </>
              ) : (
                "Send Message"
              )}
            </button>
          </form>
        </div>

        {/* Contact Information */}
        <div className="space-y-6">
          <div className="card">
            <h2 className="text-xl font-semibold text-navy-800 mb-6">
              Contact Information
            </h2>

            <div className="space-y-4">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg
                    className="h-6 w-6 text-navy-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                    />
                  </svg>
                </div>
                <div className="ml-4">
                  <h3 className="text-sm font-medium text-navy-800">Research Project</h3>
                  <p className="text-sm text-slate-600">
                    AI System for Screening the Risk of Having Children<br />
                    with Severe Thalassemia in Thai Couples
                  </p>
                </div>
              </div>

              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg
                    className="h-6 w-6 text-navy-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                </div>
                <div className="ml-4">
                  <h3 className="text-sm font-medium text-navy-800">Researcher Team</h3>
                  <p className="text-sm text-slate-600">
                    Somphop Rodamporn,<br />
                    Maethaphan Kitporntheranunt, MD*,<br />
                    Watcharachai Wiriyasuttiwong,<br />
                    Koonavoot Kaewnopparat
                  </p>
                </div>
              </div>

              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg
                    className="h-6 w-6 text-navy-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                </div>
                <div className="ml-4">
                  <h3 className="text-sm font-medium text-navy-800">Address</h3>
                  <p className="text-sm text-slate-600">
                    Faculty of Engineering and Faculty of Medicine,<br />
                    Srinakharinwirot University,<br />
                    Nakhon Nayok, 26120, Thailand.
                  </p>
                </div>
              </div>

              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg
                    className="h-6 w-6 text-navy-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <div className="ml-4">
                  <h3 className="text-sm font-medium text-navy-800">*Email</h3>
                  <p className="text-sm text-slate-600">
                    mtp_swu@hotmail.com
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* FAQ Section */}
          <div className="card">
            <h2 className="text-xl font-semibold text-navy-800 mb-4">
              Frequently Asked Questions
            </h2>

            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-navy-800">
                  What is Thalassemia?
                </h3>
                <p className="text-sm text-slate-600 mt-1">
                  Thalassemia is a group of inherited blood disorders characterized
                  by reduced or absent amounts of hemoglobin.
                </p>
              </div>

              <div>
                <h3 className="text-sm font-medium text-navy-800">
                  How accurate is the prediction?
                </h3>
                <p className="text-sm text-slate-600 mt-1">
                  Our model provides screening support based on statistical analysis.
                  Always confirm results with laboratory testing and medical professionals.
                </p>
              </div>

              <div>
                <h3 className="text-sm font-medium text-navy-800">
                  Is my data secure?
                </h3>
                <p className="text-sm text-slate-600 mt-1">
                  Yes, all data is processed securely and stored in compliance
                  with medical data protection standards.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
