"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { isLoggedIn, removeToken } from "@/lib/auth";

const navItems = [
  { href: "/", label: "Home" },
  { href: "/predict", label: "Assess" },
  { href: "/history", label: "History" },
  { href: "/contact", label: "Contact" },
];

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [loggedIn, setLoggedIn] = useState(false);

  // Sync login state on mount and when pathname changes
  useEffect(() => {
    setLoggedIn(isLoggedIn());
  }, [pathname]);

  const handleLogout = () => {
    removeToken();
    setLoggedIn(false);
    router.push("/login");
  };

  return (
    <nav className="bg-white/80 backdrop-blur-md border-b border-slate-100 sticky top-0 z-50">
      <div className="container mx-auto px-6">
        <div className="flex h-20 items-center justify-between">
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-3">
              <Image
                src="/logo.png"
                alt="Thalassemia Predict Logo"
                width={48}
                height={48}
                className="rounded-xl"
                unoptimized
              />
              <div className="hidden sm:block">
                <span className="text-xl font-bold text-navy-800">
                  ThalassemiaAI.com
                </span>
                <p className="text-xs text-slate-500">Severe Thalassemia Screening for Thai</p>
              </div>
            </Link>
          </div>

          <div className="hidden md:flex md:items-center md:space-x-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${pathname === item.href
                  ? "bg-navy-600 text-white shadow-md"
                  : "text-slate-600 hover:bg-slate-100 hover:text-navy-700"
                  }`}
              >
                {item.label}
              </Link>
            ))}

            {/* Auth button */}
            {loggedIn ? (
              <button
                id="logout-btn"
                onClick={handleLogout}
                className="ml-2 flex items-center space-x-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-red-50 text-red-600 hover:bg-red-100 transition-all duration-200"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span>Logout</span>
              </button>
            ) : (
              <Link
                id="login-nav-btn"
                href="/login"
                className="ml-2 flex items-center space-x-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-navy-600 text-white hover:bg-navy-700 transition-all duration-200 shadow-sm"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                </svg>
                <span>Login</span>
              </Link>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-navy-700 transition-colors"
            >
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
