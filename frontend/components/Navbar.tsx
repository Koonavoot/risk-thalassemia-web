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
  // Initialise from localStorage directly so the correct auth state is
  // available on the very first render \u2014 avoids the flash of "Login" button
  // that appears briefly after a successful login redirect.
  const [loggedIn, setLoggedIn] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return isLoggedIn();
  });
  const [mobileOpen, setMobileOpen] = useState(false);

  // Sync login state and close menu on route change
  useEffect(() => {
    setLoggedIn(isLoggedIn());
    setMobileOpen(false);
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
          {/* Logo */}
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

          {/* Desktop nav */}
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

          {/* Mobile hamburger button */}
          <div className="md:hidden">
            <button
              type="button"
              onClick={() => setMobileOpen((prev) => !prev)}
              aria-label="Toggle menu"
              className="inline-flex items-center justify-center rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-navy-700 transition-colors"
            >
              {mobileOpen ? (
                // X icon when open
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                // Hamburger icon when closed
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile dropdown menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-slate-100 bg-white shadow-lg">
          <div className="container mx-auto px-6 py-4 space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`block px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${pathname === item.href
                    ? "bg-navy-600 text-white"
                    : "text-slate-600 hover:bg-slate-100 hover:text-navy-700"
                  }`}
              >
                {item.label}
              </Link>
            ))}

            <div className="pt-2 border-t border-slate-100">
              {loggedIn ? (
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center space-x-2 px-4 py-3 rounded-lg text-sm font-medium bg-red-50 text-red-600 hover:bg-red-100 transition-all duration-200"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  <span>Logout</span>
                </button>
              ) : (
                <Link
                  href="/login"
                  className="flex items-center space-x-2 px-4 py-3 rounded-lg text-sm font-medium bg-navy-600 text-white hover:bg-navy-700 transition-all duration-200"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                  </svg>
                  <span>Login</span>
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
