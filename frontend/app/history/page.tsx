"use client";

import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { format } from "date-fns";
import { getToken } from "@/lib/auth";

interface HistoryItem {
  id: string;
  father_patient_id: string;
  father_first_name: string | null;
  father_last_name: string | null;
  father_age: number;
  mother_patient_id: string;
  mother_first_name: string | null;
  mother_last_name: string | null;
  mother_age: number;
  result: string;
  probability: number;
  visit_datetime: string;
}

interface PaginatedHistory {
  items: HistoryItem[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export default function HistoryPage() {
  const [data, setData] = useState<PaginatedHistory | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(1);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  // hidden IDs: non-admin users "hide" rows locally
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());
  // current username from /auth/me
  const [currentUsername, setCurrentUsername] = useState<string | null>(null);
  const pageSize = 10;

  // Fetch current user on mount
  useEffect(() => {
    const token = getToken();
    if (!token) return;
    axios
      .get<{ username: string }>("/api/auth/me", {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => setCurrentUsername(res.data.username))
      .catch(() => setCurrentUsername(null));
  }, []);

  const isAdmin = currentUsername === "admin";

  const authHeader = () => {
    const token = getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const fetchHistory = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        page: page.toString(),
        page_size: pageSize.toString(),
        sort_order: sortOrder,
      });

      if (search) {
        params.append("search", search);
      }

      const response = await axios.get<PaginatedHistory>(
        `/api/history?${params.toString()}`,
        { headers: authHeader() }
      );
      setData(response.data);
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError(
          err.response?.data?.detail ||
          err.response?.data?.error ||
          "Failed to fetch history"
        );
      } else {
        setError("An unexpected error occurred");
      }
    } finally {
      setIsLoading(false);
    }
  }, [page, search, sortOrder]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  const handleClearSearch = () => {
    setSearchInput("");
    setSearch("");
    setPage(1);
  };

  const toggleSortOrder = () => {
    setSortOrder((prev) => (prev === "desc" ? "asc" : "desc"));
    setPage(1);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this record?")) return;

    if (isAdmin) {
      // Admin: real DELETE via API
      try {
        await axios.delete(`/api/history/${id}`, {
          headers: authHeader(),
        });
        fetchHistory(); // refresh list
      } catch {
        alert("Failed to delete record.");
      }
    } else {
      // Other users: hide locally only
      setHiddenIds((prev) => new Set([...prev, id]));
    }
  };

  const formatName = (firstName: string | null, lastName: string | null) => {
    if (firstName && lastName) return `${firstName} ${lastName}`;
    if (firstName) return firstName;
    if (lastName) return lastName;
    return "-";
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="container mx-auto px-6 py-12">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-navy-800 mb-3">Prediction History</h1>
          <p className="text-slate-600">
            View and search past thalassemia risk predictions.
          </p>
        </div>

        {/* Search and Sort Controls */}
        <div className="card mb-6 border border-slate-200">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <form onSubmit={handleSearch} className="flex-1 flex gap-3">
              <div className="relative flex-1 max-w-md">
                <svg
                  className="absolute left-3.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Search by Patient ID..."
                  className="form-input w-full"
                  style={{ paddingLeft: "2.5rem" }}
                />
              </div>
              <button type="submit" className="btn-primary">
                Search
              </button>
              {search && (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="btn-secondary"
                >
                  Clear
                </button>
              )}
            </form>

            <button
              onClick={toggleSortOrder}
              className="btn-secondary flex items-center"
            >
              <svg
                className={`h-4 w-4 mr-2 transition-transform ${sortOrder === "asc" ? "rotate-180" : ""
                  }`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12"
                />
              </svg>
              Sort by Date ({sortOrder === "desc" ? "Newest" : "Oldest"})
            </button>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="flex justify-center items-center py-12">
            <svg
              className="animate-spin h-8 w-8 text-navy-600"
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
          </div>
        )}

        {/* Data Table */}
        {!isLoading && data && (
          <>
            {data.items.filter((item) => !hiddenIds.has(item.id)).length === 0 ? (
              <div className="card text-center py-16 border border-slate-200">
                <svg
                  className="mx-auto h-12 w-12 text-slate-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                <h3 className="mt-4 text-sm font-semibold text-navy-800">
                  No predictions found
                </h3>
                <p className="mt-2 text-sm text-slate-500">
                  {search
                    ? "No results match your search criteria."
                    : "Start making predictions to see them here."}
                </p>
              </div>
            ) : (
              <>
                <div className="card overflow-hidden p-0 border border-slate-200">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200">
                      <thead className="bg-navy-800">
                        <tr>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">
                            Father
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">
                            Mother
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">
                            Visit Date
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">
                            Result
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">
                            Probability
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">
                            Action
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-slate-100">
                        {data.items
                          .filter((item) => !hiddenIds.has(item.id))
                          .map((item) => (
                            <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-semibold text-navy-800">
                                  {item.father_patient_id}
                                </div>
                                <div className="text-sm text-slate-600">
                                  {formatName(item.father_first_name, item.father_last_name)}
                                </div>
                                <div className="text-xs text-slate-400">
                                  Age: {item.father_age}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-semibold text-navy-800">
                                  {item.mother_patient_id}
                                </div>
                                <div className="text-sm text-slate-600">
                                  {formatName(item.mother_first_name, item.mother_last_name)}
                                </div>
                                <div className="text-xs text-slate-400">
                                  Age: {item.mother_age}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                                {format(new Date(item.visit_datetime), "MMM d, yyyy HH:mm")}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span
                                  className={`inline-flex px-3 py-1.5 text-xs font-semibold rounded-lg ${item.result === "Risk"
                                      ? "bg-red-100 text-red-700"
                                      : "bg-emerald-100 text-emerald-700"
                                    }`}
                                >
                                  {item.result}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-navy-700">
                                {(item.probability * 100).toFixed(2)}%
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <button
                                  onClick={() => handleDelete(item.id)}
                                  title={isAdmin ? "Delete permanently" : "Hide from view"}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                                >
                                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                  {isAdmin ? "Delete" : "Hide"}
                                </button>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Pagination */}
                <div className="mt-8 flex items-center justify-between">
                  <div className="text-sm text-slate-600">
                    Showing{" "}
                    <span className="font-semibold text-navy-700">
                      {(data.page - 1) * data.page_size + 1}
                    </span>{" "}
                    to{" "}
                    <span className="font-semibold text-navy-700">
                      {Math.min(data.page * data.page_size, data.total)}
                    </span>{" "}
                    of <span className="font-semibold text-navy-700">{data.total}</span> results
                  </div>

                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="btn-secondary"
                    >
                      Previous
                    </button>
                    <span className="px-4 py-2 text-sm text-slate-600 bg-slate-100 rounded-lg">
                      Page {data.page} of {data.total_pages}
                    </span>
                    <button
                      onClick={() => setPage((p) => Math.min(data.total_pages, p + 1))}
                      disabled={page === data.total_pages}
                      className="btn-secondary"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
