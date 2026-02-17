import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Pencil, Trash2, Download } from "lucide-react";
import AdminLayout from "../components/layout/AdminLayout";

// ----------------------------------------------------------------------
// Configuration
// ----------------------------------------------------------------------
const CONFIG = {
  APPS_SCRIPT_URL: "https://script.google.com/macros/s/AKfycbwxe45-zdY7HMvMOmYg3n05GTyn7uhscbojSJB5nQDy2nPKA5Rn9pw_EOUbGG6BSYagFA/exec",
  HOLIDAY_SHEET: "Holiday List",
  WORKING_DAY_SHEET: "Working Day Calendar",
};

// ----------------------------------------------------------------------
// HolidayTable subcomponent
// ----------------------------------------------------------------------
const HolidayTable = ({ holidays, fetchLoading, handleDelete, handleEdit }) => {
  if (fetchLoading) {
    return (
      <div className="text-center py-10">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500 mb-4"></div>
        <p className="text-purple-600 text-sm sm:text-base">Loading holidays...</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-purple-200 shadow-md bg-white overflow-hidden">
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 border-b border-purple-100 p-3 sm:p-4">
        <h2 className="text-purple-700 font-medium text-sm sm:text-base">
          Holiday Records
        </h2>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">#</th>
              <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Date</th>
              <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Day</th>
              <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[200px]">Holiday Reason</th>
              <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Action</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {holidays.length > 0 ? (
              holidays.map((h, i) => (
                <tr key={h.id || i} className="hover:bg-gray-50">
                  <td className="px-3 sm:px-6 py-2 sm:py-4">
                    <div className="text-xs sm:text-sm font-medium text-gray-900">{i + 1}</div>
                  </td>
                  <td className="px-3 sm:px-6 py-2 sm:py-4">
                    <div className="text-xs sm:text-sm text-gray-900">{h.date}</div>
                  </td>
                  <td className="px-3 sm:px-6 py-2 sm:py-4">
                    <div className="text-xs sm:text-sm text-gray-900">{h.day}</div>
                  </td>
                  <td className="px-3 sm:px-6 py-2 sm:py-4 min-w-[200px]">
                    <div className="text-xs sm:text-sm text-gray-900 break-words" title={h.reason}>{h.reason}</div>
                  </td>
                  <td className="px-3 sm:px-6 py-2 sm:py-4">
                    <div className="flex gap-2">
                      <Pencil
                        size={16}
                        className="text-blue-600 hover:text-blue-800 cursor-pointer"
                        onClick={() => handleEdit(i)}
                        title="Edit"
                      />
                      <Trash2
                        size={16}
                        className="text-red-600 hover:text-red-800 cursor-pointer"
                        onClick={() => handleDelete(i)}
                        title="Delete"
                      />
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="5" className="px-4 sm:px-6 py-4 text-center text-gray-500 text-xs sm:text-sm">
                  No holidays found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ----------------------------------------------------------------------
// Main HolidayList component
// ----------------------------------------------------------------------
const HolidayListStatic = () => {
  // State management
  const [holidays, setHolidays] = useState([]);
  const [formData, setFormData] = useState({ day: "", date: "", reason: "" });
  const [editIndex, setEditIndex] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(false);

  const [showWorkingDays, setShowWorkingDays] = useState(false);
  const [workingDays, setWorkingDays] = useState([]);
  const [workingDayFormData, setWorkingDayFormData] = useState({ working_date: "", day: "" });
  const [workingDayEditIndex, setWorkingDayEditIndex] = useState(null);
  const [workingDayModalOpen, setWorkingDayModalOpen] = useState(false);
  const [workingDayLoading, setWorkingDayLoading] = useState(false);

  // Filter states
  const [holidayMonthFilter, setHolidayMonthFilter] = useState("All");
  const [holidayYearFilter, setHolidayYearFilter] = useState("All");
  const [workingMonthFilter, setWorkingMonthFilter] = useState("All");
  const [workingYearFilter, setWorkingYearFilter] = useState("All");

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];

  // --------------------------------------------------------------------
  // Date Parsing Helpers
  // --------------------------------------------------------------------
  const formatDateToDDMMYYYY = useCallback((date) => {
    const day = date.getDate().toString().padStart(2, "0");
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  }, []);

  const parseGoogleSheetsDate = useCallback((dateStr) => {
    if (!dateStr) return "";

    // Pattern: DD/MM/YYYY
    if (typeof dateStr === "string" && dateStr.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) {
      const parts = dateStr.split("/");
      const day = parts[0].padStart(2, "0");
      const month = parts[1].padStart(2, "0");
      const year = parts[2];
      return `${day}-${month}-${year}`;
    }

    // Pattern: Date(Y,M,D)
    if (typeof dateStr === "string" && dateStr.startsWith("Date(")) {
      const match = /Date\((\d+),(\d+),(\d+)\)/.exec(dateStr);
      if (match) {
        const year = parseInt(match[1]);
        const month = parseInt(match[2]);
        const day = parseInt(match[3]);
        return formatDateToDDMMYYYY(new Date(year, month, day));
      }
    }

    try {
      const d = new Date(dateStr);
      if (!isNaN(d.getTime())) return formatDateToDDMMYYYY(d);
    } catch { }

    return dateStr;
  }, [formatDateToDDMMYYYY]);

  // --------------------------------------------------------------------
  // Data Fetching
  // --------------------------------------------------------------------
  const fetchAllData = useCallback(async () => {
    setFetchLoading(true);
    try {
      // Helper to fetch and parse data robustly
      const fetchData = async (sheetName) => {
        const response = await fetch(`${CONFIG.APPS_SCRIPT_URL}?sheet=${sheetName}&action=fetch`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

        const text = await response.text();
        let data;
        try {
          data = JSON.parse(text);
        } catch (e) {
          const jsonStart = text.indexOf("{");
          const jsonEnd = text.lastIndexOf("}");
          if (jsonStart !== -1 && jsonEnd !== -1) {
            data = JSON.parse(text.substring(jsonStart, jsonEnd + 1));
          } else {
            throw new Error("Invalid JSON response");
          }
        }

        let rows = [];
        if (data.table && data.table.rows) {
          rows = data.table.rows;
        } else if (data.values) {
          rows = data.values;
        } else if (Array.isArray(data)) {
          rows = data;
        }
        return rows;
      };

      // 1. Fetch Holidays from 'Holiday List' columns A, B, C (indices 0, 1, 2)
      const holidayRows = await fetchData(CONFIG.HOLIDAY_SHEET);
      const parsedHolidays = holidayRows.slice(1).map((row, idx) => {
        const rowArr = row.c ? row.c.map(cell => cell?.v ?? "") : row;
        const date = parseGoogleSheetsDate(rowArr[0]);
        if (!date) return null;
        return {
          id: `h_${idx}_${Date.now()}`,
          date: date,
          day: rowArr[1] || "",
          reason: rowArr[2] || "Holiday",
          created_at: new Date().toISOString()
        };
      }).filter(Boolean);
      setHolidays(parsedHolidays);

      // 2. Fetch Working Days
      const workingDayRows = await fetchData(CONFIG.WORKING_DAY_SHEET);
      const parsedWorkingDays = workingDayRows.slice(1).map((row, idx) => {
        const rowArr = row.c ? row.c.map(cell => cell?.v ?? "") : row;
        const date = parseGoogleSheetsDate(rowArr[0]);
        if (!date) return null;
        return {
          id: `w_${idx}_${Date.now()}`,
          working_date: date,
          day: rowArr[1] || "",
          weekNum: rowArr[2] || "",
          month: rowArr[3] || "",
          created_at: new Date().toISOString()
        };
      }).filter(Boolean);
      setWorkingDays(parsedWorkingDays);

    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setFetchLoading(false);
    }
  }, [parseGoogleSheetsDate]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // --------------------------------------------------------------------
  // Holiday handlers
  // --------------------------------------------------------------------
  const handleHolidayInputChange = (e) => {
    const { name, value } = e.target;
    if (name === "date") {
      const newDate = value;
      let dayName = "";
      if (newDate) {
        const date = new Date(newDate);
        const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        dayName = dayNames[date.getDay()];
      }
      setFormData((prev) => ({ ...prev, date: newDate, day: dayName }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleHolidaySubmit = async (e) => {
    e.preventDefault();
    if (!formData.day || !formData.date || !formData.reason) {
      alert("Please fill all fields!");
      return;
    }

    setLoading(true);
    try {
      // Format date for Google Sheets (DD/MM/YYYY)
      const parts = formData.date.split("-");
      const formattedDate = `${parts[2]}/${parts[1]}/${parts[0]}`;

      // Map data to columns A, B, C on 'Holiday List' sheet
      const newRowData = [
        formattedDate, // Column A: date
        formData.day,  // Column B: day
        formData.reason // Column C: holiday reason
      ];

      const insertFormData = new FormData();
      insertFormData.append("sheetName", CONFIG.HOLIDAY_SHEET);
      insertFormData.append("action", "insert");
      insertFormData.append("rowData", JSON.stringify(newRowData));

      const response = await fetch(CONFIG.APPS_SCRIPT_URL, {
        method: "POST",
        body: insertFormData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || "Failed to submit holiday record");
      }

      alert("Holiday submitted successfully!");
      setModalOpen(false);
      setFormData({ day: "", date: "", reason: "" });
      setEditIndex(null);
      fetchAllData();
    } catch (error) {
      console.error("Submission error:", error);
      alert("Failed to submit holiday: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleHolidayEdit = (index) => {
    const holiday = holidays[index];
    const parts = holiday.date.split("-");
    const formattedDateForInput = `${parts[2]}-${parts[1]}-${parts[0]}`;

    setEditIndex(index);
    setFormData({
      day: holiday.day,
      date: formattedDateForInput,
      reason: holiday.reason,
    });
    setModalOpen(true);
  };

  const handleHolidayDelete = (index) => {
    if (!window.confirm("Are you sure you want to delete this holiday?")) return;
    setHolidays((prev) => prev.filter((_, i) => i !== index));
  };

  // --------------------------------------------------------------------
  // Working Day handlers
  // --------------------------------------------------------------------
  const handleWorkingDayChange = (e) => {
    const { name, value } = e.target;
    if (name === "working_date") {
      const newDate = value;
      let dayNameHindi = "";
      if (newDate) {
        const date = new Date(newDate);
        const dayNamesHindi = ["रविवार", "सोमवार", "मंगलवार", "बुधवार", "गुरुवार", "शुक्रवार", "शनिवार"];
        dayNameHindi = dayNamesHindi[date.getDay()];
      }
      setWorkingDayFormData((prev) => ({ ...prev, working_date: newDate, day: dayNameHindi }));
    } else {
      setWorkingDayFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleWorkingDaySubmit = (e) => {
    e.preventDefault();
    if (!workingDayFormData.working_date || !workingDayFormData.day) {
      alert("Please fill all fields!");
      return;
    }

    setWorkingDayLoading(true);
    setTimeout(() => {
      const [y, m, d] = workingDayFormData.working_date.split("-");
      const displayDate = `${d}-${m}-${y}`;

      if (workingDayEditIndex !== null) {
        setWorkingDays((prev) => {
          const updated = [...prev];
          updated[workingDayEditIndex] = { ...updated[workingDayEditIndex], working_date: displayDate, day: workingDayFormData.day };
          return updated;
        });
      } else {
        const newWorkingDay = {
          id: Date.now().toString(),
          working_date: displayDate,
          day: workingDayFormData.day,
          created_at: new Date().toISOString(),
        };
        setWorkingDays((prev) => [...prev, newWorkingDay]);
      }
      setWorkingDayFormData({ working_date: "", day: "" });
      setWorkingDayEditIndex(null);
      setWorkingDayModalOpen(false);
      setWorkingDayLoading(false);
    }, 500);
  };

  const handleWorkingDayEdit = (index) => {
    const wd = workingDays[index];
    const [d, m, y] = wd.working_date.split("-");
    const formattedDateForInput = `${y}-${m}-${d}`;

    setWorkingDayEditIndex(index);
    setWorkingDayFormData({
      working_date: formattedDateForInput,
      day: wd.day,
    });
    setWorkingDayModalOpen(true);
  };

  const handleWorkingDayDelete = (index) => {
    if (!window.confirm("Are you sure you want to delete this working day?")) return;
    setWorkingDays((prev) => prev.filter((_, i) => i !== index));
  };

  // --------------------------------------------------------------------
  // Filter logic
  // --------------------------------------------------------------------
  const filteredHolidays = useMemo(() => {
    return holidays.filter((h) => {
      if (!h.date) return false;
      const parts = h.date.split("-");
      if (parts.length !== 3) return false;
      const [d, m, y] = parts;
      const monthMatch = holidayMonthFilter === "All" || months[parseInt(m) - 1] === holidayMonthFilter;
      const yearMatch = holidayYearFilter === "All" || y === holidayYearFilter;
      return monthMatch && yearMatch;
    });
  }, [holidays, holidayMonthFilter, holidayYearFilter, months]);

  const filteredWorkingDays = useMemo(() => {
    return workingDays.filter((wd) => {
      if (!wd.working_date) return false;
      const parts = wd.working_date.split("-");
      if (parts.length !== 3) return false;
      const [d, m, y] = parts;
      const monthMatch = workingMonthFilter === "All" || months[parseInt(m) - 1] === workingMonthFilter;
      const yearMatch = workingYearFilter === "All" || y === workingYearFilter;
      return monthMatch && yearMatch;
    });
  }, [workingDays, workingMonthFilter, workingYearFilter, months]);

  const getAvailableYears = (data, dateKey) => {
    const years = new Set();
    data.forEach((item) => {
      const date = item[dateKey];
      if (date) {
        const parts = date.split("-");
        if (parts.length === 3) years.add(parts[2]);
      }
    });
    return Array.from(years).sort((a, b) => b - a);
  };

  const holidayYears = getAvailableYears(holidays, "date");
  const workingYears = getAvailableYears(workingDays, "working_date");

  // --------------------------------------------------------------------
  // Export CSV
  // --------------------------------------------------------------------
  const exportToCSV = () => {
    const header = ["Date", "Day", "Holiday Name"];
    const rows = holidays.map((h) => [h.date, h.day, h.name]);
    const csvContent = [header, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "Holidays.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // --------------------------------------------------------------------
  // Render
  // --------------------------------------------------------------------
  return (
    <AdminLayout>
      <div className="space-y-4 sm:space-y-6 p-2 sm:p-0">
        {/* Header and action buttons */}
        <div className="flex flex-col gap-3 sm:gap-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-purple-700">
              🎉 Holiday List
            </h1>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  setFormData({ day: "", date: "", reason: "" });
                  setEditIndex(null);
                  setModalOpen(true);
                }}
                disabled={loading}
                className="rounded-md bg-white border border-blue-600 py-2 px-3 sm:px-4 text-blue-600 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 text-sm sm:text-base font-medium flex items-center gap-1"
              >
                + Add Holiday
              </button>
              <button
                onClick={() => setShowWorkingDays(!showWorkingDays)}
                disabled={workingDayLoading}
                className={`rounded-md py-2 px-3 sm:px-4 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 text-sm sm:text-base font-medium shadow-sm transition-all ${showWorkingDays
                  ? "bg-purple-700 hover:bg-purple-800 ring-2 ring-purple-300"
                  : "bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
                  }`}
              >
                {showWorkingDays ? "Go to Holiday List" : "+ Working Days"}
              </button>
            </div>
          </div>
        </div>

        {/* Holiday section */}
        {!showWorkingDays && (
          <>
            {/* Filter bar */}
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg p-3 sm:p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-purple-700 font-medium text-sm">Filters:</span>
                <select
                  value={holidayMonthFilter}
                  onChange={(e) => setHolidayMonthFilter(e.target.value)}
                  className="px-2 py-1 text-xs border border-purple-200 rounded-md focus:outline-none focus:ring-1 focus:ring-purple-400 bg-white"
                >
                  <option value="All">All Months</option>
                  {months.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
                <select
                  value={holidayYearFilter}
                  onChange={(e) => setHolidayYearFilter(e.target.value)}
                  className="px-2 py-1 text-xs border border-purple-200 rounded-md focus:outline-none focus:ring-1 focus:ring-purple-400 bg-white"
                >
                  <option value="All">All Years</option>
                  {holidayYears.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
              <button
                onClick={exportToCSV}
                className="flex items-center gap-1 text-xs bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-md transition-colors"
              >
                <Download size={14} /> Export CSV
              </button>
            </div>

            {/* Holiday table */}
            <HolidayTable
              holidays={filteredHolidays}
              fetchLoading={fetchLoading}
              handleDelete={handleHolidayDelete}
              handleEdit={handleHolidayEdit}
            />
          </>
        )}

        {/* Working days section */}
        {showWorkingDays && (
          <div className="space-y-4">
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg p-3 sm:p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <h2 className="text-purple-700 font-medium text-sm sm:text-base">
                📅 Working Days Records
              </h2>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={workingMonthFilter}
                  onChange={(e) => setWorkingMonthFilter(e.target.value)}
                  className="px-2 py-1 text-xs border border-purple-200 rounded-md focus:outline-none focus:ring-1 focus:ring-purple-400 bg-white"
                >
                  <option value="All">All Months</option>
                  {months.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
                <select
                  value={workingYearFilter}
                  onChange={(e) => setWorkingYearFilter(e.target.value)}
                  className="px-2 py-1 text-xs border border-purple-200 rounded-md focus:outline-none focus:ring-1 focus:ring-purple-400 bg-white"
                >
                  <option value="All">All Years</option>
                  {workingYears.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => {
                    setWorkingDayFormData({ working_date: "", day: "" });
                    setWorkingDayEditIndex(null);
                    setWorkingDayModalOpen(true);
                  }}
                  className="rounded-md bg-purple-600 py-1.5 px-3 text-white hover:bg-purple-700 text-xs sm:text-sm"
                >
                  + Add Working Day
                </button>
              </div>
            </div>

            {/* Working days table */}
            <div className="rounded-lg border border-purple-200 shadow-md bg-white overflow-hidden">
              {fetchLoading ? (
                <div className="text-center py-10">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500 mb-4"></div>
                  <p className="text-purple-600">Loading records...</p>
                </div>
              ) : (
                <div className="overflow-x-auto max-h-[400px] overflow-y-auto scrollbar-thin scrollbar-thumb-purple-200">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 sticky top-0 z-10 shadow-sm">
                      <tr>
                        <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap bg-gray-50">#</th>
                        <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap bg-gray-50">Working Date</th>
                        <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap bg-gray-50">Day</th>
                        <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap bg-gray-50">Week Num</th>
                        <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap bg-gray-50">Month</th>
                        <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap bg-gray-50">Action</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredWorkingDays.length > 0 ? (
                        filteredWorkingDays.map((wd, i) => (
                          <tr key={wd.id || i} className="hover:bg-gray-50">
                            <td className="px-3 sm:px-6 py-2 sm:py-4">
                              <div className="text-xs sm:text-sm font-medium text-gray-900">{i + 1}</div>
                            </td>
                            <td className="px-3 sm:px-6 py-2 sm:py-4">
                              <div className="text-xs sm:text-sm text-gray-900">{wd.working_date}</div>
                            </td>
                            <td className="px-3 sm:px-6 py-2 sm:py-4">
                              <div className="text-xs sm:text-sm text-gray-900">{wd.day}</div>
                            </td>
                            <td className="px-3 sm:px-6 py-2 sm:py-4">
                              <div className="text-xs sm:text-sm text-gray-900">{wd.weekNum}</div>
                            </td>
                            <td className="px-3 sm:px-6 py-2 sm:py-4">
                              <div className="text-xs sm:text-sm text-gray-900">{wd.month}</div>
                            </td>
                            <td className="px-3 sm:px-6 py-2 sm:py-4">
                              <div className="flex gap-2">
                                <Pencil
                                  size={16}
                                  className="text-blue-600 hover:text-blue-800 cursor-pointer"
                                  onClick={() => handleWorkingDayEdit(i)}
                                  title="Edit"
                                />
                                <Trash2
                                  size={16}
                                  className="text-red-600 hover:text-red-800 cursor-pointer"
                                  onClick={() => handleWorkingDayDelete(i)}
                                  title="Delete"
                                />
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="6" className="px-4 sm:px-6 py-4 text-center text-gray-500 text-xs sm:text-sm">
                            {fetchLoading ? "Fetching data..." : "No working days found"}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Holiday Modal */}
        {modalOpen && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
              <div className="fixed inset-0 transition-opacity" aria-hidden="true">
                <div className="absolute inset-0 bg-black/20"></div>
              </div>
              <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
              <div className="relative z-50 inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <div className="sm:flex sm:items-start">
                    <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                      <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                        {editIndex !== null ? "Edit Holiday" : "Add Holiday"}
                      </h3>
                      <form onSubmit={handleHolidaySubmit}>
                        <div className="grid grid-cols-1 gap-4">
                          <div>
                            <label htmlFor="day" className="block text-sm font-medium text-gray-700 mb-1">Day</label>
                            <select id="day" name="day" value={formData.day} onChange={handleHolidayInputChange} required className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm">
                              <option value="">Select Day</option>
                              <option value="Monday">Monday</option>
                              <option value="Tuesday">Tuesday</option>
                              <option value="Wednesday">Wednesday</option>
                              <option value="Thursday">Thursday</option>
                              <option value="Friday">Friday</option>
                              <option value="Saturday">Saturday</option>
                              <option value="Sunday">Sunday</option>
                            </select>
                          </div>
                          <div>
                            <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                            <input type="date" id="date" name="date" value={formData.date} onChange={handleHolidayInputChange} required className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm" />
                          </div>
                          <div>
                            <label htmlFor="reason" className="block text-sm font-medium text-gray-700 mb-1">Holiday Reason</label>
                            <input type="text" id="reason" name="reason" placeholder="e.g., Diwali, Christmas" value={formData.reason} onChange={handleHolidayInputChange} required className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm" />
                          </div>
                        </div>
                        <div className="mt-5 sm:mt-6 sm:flex sm:flex-row-reverse gap-2">
                          <button type="submit" disabled={loading} className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50">
                            {loading ? "Saving..." : editIndex !== null ? "Update" : "Save"}
                          </button>
                          <button type="button" onClick={() => { setFormData({ day: "", date: "", reason: "" }); setEditIndex(null); setModalOpen(false); }} className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:w-auto sm:text-sm">Cancel</button>
                        </div>
                      </form>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Working Day Modal */}
        {workingDayModalOpen && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
              <div className="fixed inset-0 transition-opacity" aria-hidden="true">
                <div className="absolute inset-0 bg-black/20"></div>
              </div>
              <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
              <div className="relative z-50 inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <div className="sm:flex sm:items-start">
                    <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                      <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                        {workingDayEditIndex !== null ? "Edit Working Day" : "Add Working Day"}
                      </h3>
                      <form onSubmit={handleWorkingDaySubmit}>
                        <div className="grid grid-cols-1 gap-4">
                          <div>
                            <label htmlFor="working_date" className="block text-sm font-medium text-gray-700 mb-1">Working Date</label>
                            <input type="date" id="working_date" name="working_date" value={workingDayFormData.working_date} onChange={handleWorkingDayChange} required className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500 text-sm" />
                          </div>
                          <div>
                            <label htmlFor="day" className="block text-sm font-medium text-gray-700 mb-1">Day (Hindi)</label>
                            <input type="text" id="day" name="day" placeholder="e.g., शुक्रवार, शनिवार" value={workingDayFormData.day} onChange={handleWorkingDayChange} required readOnly className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500 text-sm bg-gray-50" />
                          </div>
                        </div>
                        <div className="mt-5 sm:mt-6 sm:flex sm:flex-row-reverse gap-2">
                          <button type="submit" disabled={workingDayLoading} className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-purple-600 text-base font-medium text-white hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50">
                            {workingDayLoading ? "Saving..." : workingDayEditIndex !== null ? "Update" : "Save"}
                          </button>
                          <button type="button" onClick={() => { setWorkingDayFormData({ working_date: "", day: "" }); setWorkingDayEditIndex(null); setWorkingDayModalOpen(false); }} className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 sm:mt-0 sm:w-auto sm:text-sm">Cancel</button>
                        </div>
                      </form>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default HolidayListStatic;