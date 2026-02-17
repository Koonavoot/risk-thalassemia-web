"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormInput } from "@/components/FormInput";

const contactSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Please enter a valid email"),
  subject: z.string().min(1, "Subject is required"),
  message: z.string().min(10, "Message must be at least 10 characters"),
});

type ContactFormData = z.infer<typeof contactSchema>;

export default function ContactPage() {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
  });

  const onSubmit = (data: ContactFormData) => {
    // In a real application, this would send the data to a backend
    console.log("Contact form submitted:", data);
    setIsSubmitted(true);
    reset();

    // Reset the success message after 5 seconds
    setTimeout(() => setIsSubmitted(false), 5000);
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

            <button type="submit" className="btn-primary w-full">
              Send Message
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
                    Faculty of Engineering<br />
                    Bangkok, Thailand 10170
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
                  <h3 className="text-sm font-medium text-navy-800">Email</h3>
                  <p className="text-sm text-slate-600">
                    koonavoot.k@gmail.com
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
                      d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                    />
                  </svg>
                </div>
                <div className="ml-4">
                  <h3 className="text-sm font-medium text-navy-800">Phone</h3>
                  <p className="text-sm text-slate-600">+66 94-950-2778</p>
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
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <div className="ml-4">
                  <h3 className="text-sm font-medium text-navy-800">
                    Working Hours
                  </h3>
                  <p className="text-sm text-slate-600">
                    Monday - Friday: 8:00 AM - 5:00 PM<br />
                    Saturday: 8:00 AM - 12:00 PM<br />
                    Sunday: Closed
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
