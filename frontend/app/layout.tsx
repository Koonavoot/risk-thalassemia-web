import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Thalassemia Risk Prediction",
  description: "A medical tool for predicting thalassemia risk in offspring based on parental blood values",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className={inter.className}>
        <div className="min-h-screen flex flex-col bg-slate-50">
          <Navbar />
          <main className="flex-1">
            {children}
          </main>
          <footer className="bg-navy-900 text-white py-12 border-t border-navy-800">
            <div className="container mx-auto px-6">
              <div className="grid md:grid-cols-3 gap-8 mb-8">
                <div>
                  <h3 className="font-semibold text-lg mb-4">ThalassemiaAI.com</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">
                    AI-powered disease screening tools for healthcare professionals to assess the risk of thalassemia.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold mb-4">Quick Links</h3>
                  <ul className="space-y-2 text-slate-400 text-sm">
                    <li><a href="/predict" className="hover:text-white transition-colors">Assessment</a></li>
                    <li><a href="/history" className="hover:text-white transition-colors">History</a></li>
                    <li><a href="/contact" className="hover:text-white transition-colors">Contact</a></li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold mb-4">Disclaimer</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">
                    For screening support only. Not a replacement for professional medical diagnosis.
                  </p>
                </div>
              </div>
              <div className="border-t border-navy-800 pt-8 text-center">
                <p className="text-sm text-slate-500">
                  © 2026 Severe Thalassemia Screening System. For medical professional use only.
                </p>
              </div>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
