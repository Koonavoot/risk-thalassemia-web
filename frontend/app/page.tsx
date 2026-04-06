import Link from "next/link";
import Image from "next/image";

export default function Home() {
  return (
    <div className="min-h-screen">
      {/* Hero Section with Doctor Image */}
      <section className="relative bg-gradient-to-br from-navy-800 via-navy-700 to-navy-900 overflow-hidden">
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10"></div>
        <div className="container mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-center min-h-[600px] py-16">
            {/* Left Content */}
            <div className="relative z-10">
              <div className="inline-flex items-center px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-white/90 text-sm mb-6">
                <span className="w-2 h-2 bg-emerald-400 rounded-full mr-2 animate-pulse"></span>
                AI-Powered Medical Tool
              </div>
              <h1 className="text-4xl lg:text-5xl font-bold text-white mb-6 leading-tight">
                Thalassemia Risk
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-cyan-300 pb-2">
                  Screening System
                </span>
              </h1>
              <p className="text-lg text-slate-300 mb-8 leading-relaxed max-w-xl">
                AI-powered disease screening tools designed for healthcare <br className="hidden sm:block" />
                professionals to assess the risk of thalassemia in children <br className="hidden sm:block" />
                based on the parents&apos; blood test results.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link href="/predict" className="btn-primary text-base px-8 py-4 shadow-xl shadow-navy-900/50">
                  Start Screening
                  <svg className="w-5 h-5 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Link>
                <Link href="#how-it-works" className="btn-secondary bg-white/10 text-white ring-white/20 hover:bg-white/20">
                  Learn More
                </Link>
              </div>
            </div>

            {/* Right - Doctor Image */}
            <div className="relative hidden lg:flex justify-end items-end">
              <div className="absolute inset-0 bg-gradient-to-tr from-blue-400/10 via-transparent to-cyan-400/10 rounded-full blur-3xl"></div>
              <div className="relative z-10 w-[480px] h-[560px]">
                <Image
                  src="/doctor.png"
                  alt="Healthcare Professional"
                  fill
                  className="object-contain object-center drop-shadow-[0_20px_50px_rgba(0,0,0,0.15)]"
                  priority
                />
              </div>
            </div>
          </div>
        </div>

        {/* Decorative Elements */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-slate-50 to-transparent"></div>
      </section>

      {/* Stats Section */}
      <section className="py-12 bg-slate-50 border-b border-slate-100">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="text-3xl font-bold text-navy-700">99%</div>
              <div className="text-sm text-slate-500 mt-1">Accuracy Rate</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-navy-700">10+</div>
              <div className="text-sm text-slate-500 mt-1">Input Features</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-navy-700">&lt;1s</div>
              <div className="text-sm text-slate-500 mt-1">Prediction Time</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-navy-700">24/7</div>
              <div className="text-sm text-slate-500 mt-1">Availability</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-slate-50">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-navy-800 mb-4">
              Key Features
            </h2>
            <p className="text-slate-600 max-w-2xl mx-auto">
              Our platform provides comprehensive tools for thalassemia risk assessment
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="card group hover:border-navy-200">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-navy-600 to-navy-700 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <svg className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-navy-800 mb-3">
                Easy Data Entry
              </h3>
              <p className="text-slate-600 leading-relaxed">
                Intuitive form interface for blood test values including
                Hb, Hct, MCV, MCH, and DCIP results.
              </p>
            </div>

            <div className="card group hover:border-navy-200">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-navy-600 to-navy-700 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <svg className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-navy-800 mb-3">
                AI-Powered Analysis
              </h3>
              <p className="text-slate-600 leading-relaxed">
                Advanced Meta-Tabular Transformer model trained on clinical data for
                accurate risk probability assessment.
              </p>
            </div>

            <div className="card group hover:border-navy-200">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-navy-600 to-navy-700 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <svg className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-navy-800 mb-3">
                History Tracking
              </h3>
              <p className="text-slate-600 leading-relaxed">
                Save and review predictions with search and filter
                for comprehensive record management.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20 bg-white">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-navy-800 mb-4">
              How It Works
            </h2>
            <p className="text-slate-600">Simple 4-step process for risk assessment</p>
          </div>

          <div className="grid md:grid-cols-4 gap-8">
            {[
              { step: 1, title: "Enter Data", desc: "Input blood test values for both parents" },
              { step: 2, title: "Run Analysis", desc: "AI model processes the data instantly" },
              { step: 3, title: "View Results", desc: "Get risk level with probability score" },
              { step: 4, title: "Save Record", desc: "Store prediction for future reference" },
            ].map((item) => (
              <div key={item.step} className="relative text-center group">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-navy-600 to-navy-700 text-white flex items-center justify-center mx-auto mb-5 text-xl font-bold shadow-lg shadow-navy-600/30 group-hover:scale-110 transition-transform">
                  {item.step}
                </div>
                <h4 className="font-semibold text-navy-800 mb-2">{item.title}</h4>
                <p className="text-sm text-slate-600">{item.desc}</p>
                {item.step < 4 && (
                  <div className="hidden md:block absolute top-8 left-[60%] w-[80%] h-[2px] bg-gradient-to-r from-navy-200 to-transparent"></div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Input Parameters Section */}
      <section className="py-20 bg-slate-50">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto">
            <div className="card">
              <h2 className="text-2xl font-bold text-navy-800 mb-8 text-center">
                Required Parameters
              </h2>
              <div className="grid md:grid-cols-2 gap-10">
                <div>
                  <h3 className="font-semibold text-navy-700 mb-4 flex items-center">
                    <span className="w-8 h-8 rounded-lg bg-navy-100 text-navy-600 flex items-center justify-center mr-3 text-sm">
                      #
                    </span>
                    Numerical Values
                  </h3>
                  <ul className="space-y-3">
                    {[
                      { abbr: "Hb", full: "Hemoglobin (g/dL)" },
                      { abbr: "Hct", full: "Hematocrit (%)" },
                      { abbr: "MCV", full: "Mean Corpuscular Volume (fL)" },
                      { abbr: "MCH", full: "Mean Corpuscular Hemoglobin (pg)" },
                    ].map((item) => (
                      <li key={item.abbr} className="flex items-center text-slate-600 p-3 rounded-lg bg-slate-50">
                        <span className="w-12 font-semibold text-navy-700">{item.abbr}</span>
                        <span>{item.full}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold text-navy-700 mb-4 flex items-center">
                    <span className="w-8 h-8 rounded-lg bg-navy-100 text-navy-600 flex items-center justify-center mr-3 text-sm">
                      ±
                    </span>
                    Categorical Values
                  </h3>
                  <div className="p-4 rounded-lg bg-slate-50">
                    <div className="flex items-start">
                      <span className="w-12 font-semibold text-navy-700">DCIP</span>
                      <span className="text-slate-600">Dichlorophenol Indolephenol Test (Positive / Negative)</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Disclaimer Section */}
      <section className="py-12 bg-white border-t border-slate-100">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-start p-6 rounded-2xl bg-amber-50 border border-amber-100">
              <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center mr-4">
                <svg className="h-6 w-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-amber-800 mb-2">
                  Medical Disclaimer
                </h3>
                <p className="text-amber-700 leading-relaxed">
                  This tool is intended for screening support only and should not replace
                  professional medical diagnosis or laboratory confirmation. Always consult
                  with qualified healthcare professionals for definitive diagnosis.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-br from-navy-800 via-navy-700 to-navy-900">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to Get Started?
          </h2>
          <p className="text-slate-300 mb-8 max-w-xl mx-auto">
            Begin your thalassemia risk assessment with our AI-powered prediction tool
          </p>
          <Link href="/predict" className="btn-primary bg-white text-navy-700 hover:bg-slate-100 text-base px-8 py-4">
            Start Prediction Now
            <svg className="w-5 h-5 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
        </div>
      </section>
    </div>
  );
}
