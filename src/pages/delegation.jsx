"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import {
  CheckCircle2,
  Upload,
  X,
  Search,
  ArrowLeft,
  Edit,
  Image
} from "lucide-react";
import AdminLayout from "../components/layout/AdminLayout";

const CONFIG = {
  APPS_SCRIPT_URL:
    "https://script.google.com/macros/s/AKfycbwxe45-zdY7HMvMOmYg3n05GTyn7uhscbojSJB5nQDy2nPKA5Rn9pw_EOUbGG6BSYagFA/exec",

  DRIVE_FOLDER_ID: "1I8srmLeAjhroTG6FonmaubYXW3Yc0lD-",


  SOURCE_SHEET_NAME: "DELEGATION",
  TARGET_SHEET_NAME: "DELEGATION DONE",

  PAGE_CONFIG: {
    title: "DELEGATION Tasks",
    description: "Showing all pending tasks",
  },
};

function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

function DelegationDataPage() {
  const [accountData, setAccountData] = useState([]);
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [additionalData, setAdditionalData] = useState({});
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [remarksData, setRemarksData] = useState({});
  const [statusData, setStatusData] = useState({});
  const [nextTargetDate, setNextTargetDate] = useState({});
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [userRole, setUserRole] = useState(() => (typeof window !== 'undefined' ? sessionStorage.getItem("role") || "" : ""));
  const [username, setUsername] = useState(() => (typeof window !== 'undefined' ? sessionStorage.getItem("username") || "" : ""));
  const [historyData, setHistoryData] = useState([]);
  const [nameFilter, setNameFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dateRange, setDateRange] = useState({
    start: "",
    end: "",
  });

  const [delegationData, setDelegationData] = useState([]);

  const [statusCounts, setStatusCounts] = useState({
    Done: 0,
    Pending: 0,
    Planned: 0,
    "Verify Pending": 0,
  });

  const [editingRemarks, setEditingRemarks] = useState({});
  const [tempRemarks, setTempRemarks] = useState({});

  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const formatDateToDDMMYYYY = useCallback((date) => {
    const day = date.getDate().toString().padStart(2, "0");
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }, []);

  const isTaskDisabled = useCallback((status, userRole) => {
    if (userRole === "admin") {
      return status === "Done";
    } else {
      return status === "Done";
    }
  }, []);

  const createGoogleSheetsDate = useCallback((date) => {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }, []);

  const formatDateForGoogleSheets = useCallback((date) => {
    const day = date.getDate().toString().padStart(2, "0");
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const year = date.getFullYear();

    return {
      formatted: `${day}/${month}/${year}`,
      dateObject: new Date(year, date.getMonth(), date.getDate()),
      iso: date.toISOString().split("T")[0],
      googleSheetsValue: `=DATE(${year},${month},${day})`,
    };
  }, []);

  const convertToGoogleSheetsDate = useCallback(
    (dateString) => {
      if (!dateString || typeof dateString !== "string") return "";

      if (dateString.includes("/")) {
        const [day, month, year] = dateString.split("/");
        const date = new Date(year, month - 1, day);
        if (!isNaN(date.getTime())) {
          return formatDateForGoogleSheets(date);
        }
      }

      if (dateString.includes("-")) {
        const [year, month, day] = dateString.split("-");
        const date = new Date(year, month - 1, day);
        if (!isNaN(date.getTime())) {
          return formatDateForGoogleSheets(date);
        }
      }

      return {
        formatted: dateString,
        dateObject: null,
        iso: "",
        googleSheetsValue: dateString,
      };
    },
    [formatDateForGoogleSheets]
  );

  const isEmpty = useCallback((value) => {
    return (
      value === null ||
      value === undefined ||
      (typeof value === "string" && value.trim() === "")
    );
  }, []);

  useEffect(() => {
    if (accountData.length > 0) {
      const counts = {
        Done: 0,
        Pending: 0,
        Planned: 0,
        "Verify Pending": 0,
      };

      let filteredData = accountData;
      if (nameFilter) {
        filteredData = accountData.filter(
          (item) => item["col4"] === nameFilter
        );
      }

      filteredData.forEach((item) => {
        if (userRole !== "admin" && item["col4"] !== username) return;

        const status = item["col20"];
        if (status && counts.hasOwnProperty(status)) {
          counts[status]++;
        }
      });

      setStatusCounts(counts);
    }
  }, [accountData, userRole, username, nameFilter]);

  // Removed redundant role loading useEffect as states are now initialized directly


  const parseGoogleSheetsDate = useCallback(
    (dateStr) => {
      if (!dateStr) return "";

      if (
        typeof dateStr === "string" &&
        dateStr.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)
      ) {
        const parts = dateStr.split("/");
        if (parts.length === 3) {
          const day = parts[0].padStart(2, "0");
          const month = parts[1].padStart(2, "0");
          const year = parts[2];
          return `${day}/${month}/${year}`;
        }
        return dateStr;
      }

      if (typeof dateStr === "string" && dateStr.startsWith("Date(")) {
        const match = /Date\((\d+),(\d+),(\d+)\)/.exec(dateStr);
        if (match) {
          const year = Number.parseInt(match[1], 10);
          const month = Number.parseInt(match[2], 10);
          const day = Number.parseInt(match[3], 10);
          return `${day.toString().padStart(2, "0")}/${(month + 1)
            .toString()
            .padStart(2, "0")}/${year}`;
        }
      }

      try {
        const date = new Date(dateStr);
        if (!isNaN(date.getTime())) {
          return formatDateToDDMMYYYY(date);
        }
      } catch (error) {
        console.error("Error parsing date:", error);
      }

      return dateStr;
    },
    [formatDateToDDMMYYYY]
  );

  const formatDateForDisplay = useCallback(
    (dateStr) => {
      if (!dateStr) return "—";

      if (
        typeof dateStr === "string" &&
        dateStr.match(/^\d{2}\/\d{2}\/\d{4}$/)
      ) {
        return dateStr;
      }

      return parseGoogleSheetsDate(dateStr) || "—";
    },
    [parseGoogleSheetsDate]
  );

  const parseDateFromDDMMYYYY = useCallback((dateStr) => {
    if (!dateStr || typeof dateStr !== "string") return null;
    const parts = dateStr.split("/");
    if (parts.length !== 3) return null;
    return new Date(parts[2], parts[1] - 1, parts[0]);
  }, []);

  const sortDateWise = useCallback(
    (a, b) => {
      const dateStrA = a["col6"] || "";
      const dateStrB = b["col6"] || "";
      const dateA = parseDateFromDDMMYYYY(dateStrA);
      const dateB = parseDateFromDDMMYYYY(dateStrB);

      const statusA = a["col20"] || "";
      const statusB = b["col20"] || "";

      const isPendingA = statusA === "Pending";
      const isPendingB = statusB === "Pending";

      if (isPendingA && !isPendingB) return -1; // A (pending) comes first
      if (!isPendingA && isPendingB) return 1;  // B (pending) comes first
      if (!dateA) return 1;
      if (!dateB) return -1;

      return dateB.getTime() - dateA.getTime();
    },
    [parseDateFromDDMMYYYY]
  );

  const resetFilters = useCallback(() => {
    setSearchTerm("");
    setStartDate("");
    setEndDate("");
  }, []);

  const getRowColor = useCallback((colorCode) => {
    if (!colorCode) return "bg-white";

    const code = colorCode.toString().toLowerCase();
    switch (code) {
      case "red":
        return "bg-red-50 border-l-4 border-red-400";
      case "yellow":
        return "bg-yellow-50 border-l-4 border-yellow-400";
      case "green":
        return "bg-green-50 border-l-4 border-green-400";
      case "blue":
        return "bg-blue-50 border-l-4 border-blue-400";
      default:
        return "bg-white";
    }
  }, []);



  const getSubmissionStatus = useCallback(
    (taskId) => {
      if (!taskId)
        return {
          status: "—",
          color: "bg-gray-100",
          textColor: "text-gray-800",
        };

      const delegationItem = delegationData.find(
        (item) => item["col1"] === taskId
      );
      if (!delegationItem)
        return {
          status: "—",
          color: "bg-gray-100",
          textColor: "text-gray-800",
        };

      const actualValue = delegationItem["col11"]; // Column L (Actual)
      const delayValue = delegationItem["col12"]; // Column M (Delay)

      const isActualNotNull = !isEmpty(actualValue);
      const isDelayNotNull = !isEmpty(delayValue);

      if (isActualNotNull && isDelayNotNull) {
        return {
          status: "Late Submitted",
          color: "bg-red-100",
          textColor: "text-red-800",
        };
      } else if (isActualNotNull && isEmpty(delayValue)) {
        return {
          status: "On time",
          color: "bg-green-100",
          textColor: "text-green-800",
        };
      }

      return { status: "—", color: "bg-gray-100", textColor: "text-gray-800" };
    },
    [delegationData, isEmpty]
  );

  const TableSkeleton = () => (
    <div className="animate-pulse">
      {[...Array(5)].map((_, i) => (
        <tr key={i} className="border-b border-gray-100">
          <td className="px-6 py-4"><div className="h-4 w-4 bg-gray-200 rounded"></div></td>
          <td className="px-6 py-4"><div className="h-4 w-24 bg-gray-200 rounded"></div></td>
          <td className="px-6 py-4"><div className="h-4 w-16 bg-gray-200 rounded"></div></td>
          <td className="px-6 py-4"><div className="h-4 w-32 bg-gray-200 rounded"></div></td>
          <td className="px-6 py-4"><div className="h-4 w-40 bg-gray-200 rounded"></div></td>
          <td className="px-6 py-4"><div className="h-4 w-28 bg-gray-200 rounded"></div></td>
          <td className="px-6 py-4"><div className="h-4 w-28 bg-gray-200 rounded"></div></td>
          <td className="px-6 py-4"><div className="h-4 w-64 bg-gray-200 rounded"></div></td>
          <td className="px-6 py-4"><div className="h-4 w-24 bg-gray-200 rounded"></div></td>
          <td className="px-6 py-4 text-center"><div className="h-6 w-6 bg-gray-200 rounded-full mx-auto"></div></td>
        </tr>
      ))}
    </div>
  );

  const CardSkeleton = () => (
    <div className="space-y-4 px-4 py-4 animate-pulse">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="bg-white rounded-lg p-4 border border-gray-100 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <div className="h-4 w-1/4 bg-gray-200 rounded"></div>
            <div className="h-6 w-20 bg-gray-200 rounded-full"></div>
          </div>
          <div className="space-y-2">
            <div className="h-4 w-3/4 bg-gray-200 rounded"></div>
            <div className="h-4 w-1/2 bg-gray-200 rounded"></div>
          </div>
          <div className="flex justify-between">
            <div className="h-8 w-24 bg-gray-200 rounded"></div>
            <div className="h-8 w-24 bg-gray-200 rounded"></div>
          </div>
        </div>
      ))}
    </div>
  );


  const filteredAccountData = useMemo(() => {
    const filtered = debouncedSearchTerm
      ? accountData.filter(
        (account) =>
          Object.values(account).some(
            (value) =>
              value &&
              value
                .toString()
                .toLowerCase()
                .includes(debouncedSearchTerm.toLowerCase())
          ) ||
          (account["col20"] &&
            account["col20"]
              .toString()
              .toLowerCase()
              .includes(debouncedSearchTerm.toLowerCase()))
      )
      : accountData;

    return filtered
      .filter((account) => {
        if (nameFilter && account["col4"].toLowerCase() !== nameFilter.toLowerCase()) {
          return false;
        }
        if (dateRange.start || dateRange.end) {
          const taskDate = parseDateFromDDMMYYYY(
            formatDateForDisplay(account["col6"])
          );
          if (!taskDate) return false;

          if (dateRange.start) {
            const startDate = new Date(dateRange.start);
            startDate.setHours(0, 0, 0, 0);
            if (taskDate < startDate) return false;
          }

          if (dateRange.end) {
            const endDate = new Date(dateRange.end);
            endDate.setHours(23, 59, 59, 999);
            if (taskDate > endDate) return false;
          }
        }

        if (
          statusFilter &&
          statusFilter !== "All Status" &&
          account["col20"] !== statusFilter
        ) {
          return false;
        }

        return true;
      })
      .sort(sortDateWise);
  }, [
    accountData,
    debouncedSearchTerm,
    nameFilter,
    dateRange,
    statusFilter,
    formatDateForDisplay,
    parseDateFromDDMMYYYY,
    sortDateWise,
  ]);

  const uniqueNames = useMemo(() => {
    const names = new Set();
    const normalizedNames = new Map(); // To track normalized versions

    // Helper function to normalize names
    const normalizeName = (name) => {
      if (!name) return '';
      return name.toString().toLowerCase().trim();
    };

    // Add names from accountData (main table - col4)
    accountData.forEach((item) => {
      if (item["col4"]) {
        const originalName = item["col4"];
        const normalized = normalizeName(originalName);

        // If user is not admin, only add their own name
        if (userRole !== "admin" && originalName !== username) return;

        // Only add if we haven't seen this normalized name before
        if (!normalizedNames.has(normalized)) {
          normalizedNames.set(normalized, originalName);
          names.add(originalName); // Keep the original casing from first occurrence
        }
      }
    });

    return Array.from(names).sort();
  }, [accountData, userRole, username]);



  const uniqueDates = useMemo(() => {
    const dates = new Set();
    accountData.forEach((item) => {
      if (item["col6"]) dates.add(formatDateForDisplay(item["col6"]));
    });
    return Array.from(dates).sort((a, b) => {
      const dateA = parseDateFromDDMMYYYY(a);
      const dateB = parseDateFromDDMMYYYY(b);
      if (!dateA) return 1;
      if (!dateB) return -1;
      return dateA.getTime() - dateB.getTime();
    });
  }, [accountData, formatDateForDisplay, parseDateFromDDMMYYYY]);


  // Optimized data fetching with parallel requests
  // Optimized data fetching with parallel requests
  const fetchSheetData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch both SOURCE and TARGET sheets in parallel
      const [sourceResponse, targetResponse] = await Promise.all([
        fetch(`${CONFIG.APPS_SCRIPT_URL}?sheet=${CONFIG.SOURCE_SHEET_NAME}&action=fetch`),
        fetch(`${CONFIG.APPS_SCRIPT_URL}?sheet=${CONFIG.TARGET_SHEET_NAME}&action=fetch`)
      ]);

      if (!sourceResponse.ok || !targetResponse.ok) {
        throw new Error(`Failed to fetch data: ${sourceResponse.status} / ${targetResponse.status}`);
      }

      const [sourceText, targetText] = await Promise.all([
        sourceResponse.text(),
        targetResponse.text()
      ]);

      const parseJson = (text) => {
        try {
          return JSON.parse(text);
        } catch (parseError) {
          const jsonStart = text.indexOf("{");
          const jsonEnd = text.lastIndexOf("}");
          if (jsonStart !== -1 && jsonEnd !== -1) {
            return JSON.parse(text.substring(jsonStart, jsonEnd + 1));
          }
          throw new Error("Invalid JSON response from server");
        }
      };

      const sourceData = parseJson(sourceText);
      const targetData = parseJson(targetText);

      // Helper to process rows into our internal format
      const processRows = (data, isHistory = false) => {
        let rows = [];
        if (data.table && data.table.rows) {
          rows = data.table.rows;
        } else if (Array.isArray(data)) {
          rows = data;
        } else if (data.values) {
          rows = data.values.map((row) => ({
            c: row.map((val) => ({ v: val })),
          }));
        }

        const processedData = [];
        rows.forEach((row, rowIndex) => {
          if (rowIndex === 0) return;

          let rowValues = [];
          if (row.c) {
            rowValues = row.c.map((cell) =>
              cell && cell.v !== undefined ? cell.v : ""
            );
          } else if (Array.isArray(row)) {
            rowValues = row;
          } else {
            return;
          }

          const googleSheetsRowIndex = rowIndex + 1;
          const taskId = rowValues[1] || "";
          const stableId = taskId
            ? `${isHistory ? 'history' : 'task'}_${taskId}_${googleSheetsRowIndex}`
            : `${isHistory ? 'hist' : 'row'}_${googleSheetsRowIndex}_${Math.random().toString(36).substring(2, 11)}`;

          const rowData = {
            _id: stableId,
            _rowIndex: googleSheetsRowIndex,
            _taskId: taskId,
          };

          // Map columns (21 columns for source, check target columns if different but usually similar)
          const colLimit = isHistory ? rowValues.length : 21;
          for (let i = 0; i < colLimit; i++) {
            if (i === 0 || i === 6 || i === 10) {
              rowData[`col${i}`] = rowValues[i]
                ? parseGoogleSheetsDate(String(rowValues[i]))
                : "";
            } else {
              rowData[`col${i}`] = rowValues[i] || "";
            }
          }
          processedData.push(rowData);
        });
        return processedData;
      };

      const allSourceData = processRows(sourceData);
      const allTargetData = processRows(targetData, true);

      setHistoryData(allTargetData);

      const allDelegationData = allSourceData.filter(rowData => {
        // ✅ User filtering logic - wait for role/username to be ready
        if (userRole && userRole !== "admin") {
          const taskAssignedTo = rowData["col4"]; // Column E (Name)
          if (
            !taskAssignedTo ||
            taskAssignedTo.toLowerCase().trim() !== username.toLowerCase().trim()
          ) {
            return false;
          }
        } else if (!userRole) {
          // If role isn't loaded yet, don't filter (or wait)
          return false;
        }

        // ✅ NEW: Filter out "Done" tasks from regular view
        const taskStatus = rowData["col20"]; // Column U (Status)
        if (taskStatus && taskStatus.toString().trim().toLowerCase() === "done") {
          return false;
        }
        return true;
      });

      setAccountData(allDelegationData);
      setDelegationData(allDelegationData);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching sheet data:", error);
      setError("Failed to load account data: " + error.message);
      setLoading(false);
    }
  }, [
    formatDateToDDMMYYYY,
    parseGoogleSheetsDate,
    parseDateFromDDMMYYYY,
    isEmpty,
    userRole,
    username,
  ]);

  useEffect(() => {
    fetchSheetData();
  }, [fetchSheetData]);

  const handleSelectItem = useCallback((id, isChecked) => {
    setSelectedItems((prev) => {
      const newSelected = new Set(prev);

      if (isChecked) {
        newSelected.add(id);
        setStatusData((prevStatus) => ({ ...prevStatus, [id]: "Done" }));
      } else {
        newSelected.delete(id);
        setAdditionalData((prevData) => {
          const newAdditionalData = { ...prevData };
          delete newAdditionalData[id];
          return newAdditionalData;
        });
        setRemarksData((prevRemarks) => {
          const newRemarksData = { ...prevRemarks };
          delete newRemarksData[id];
          return newRemarksData;
        });
        setStatusData((prevStatus) => {
          const newStatusData = { ...prevStatus };
          delete newStatusData[id];
          return newStatusData;
        });
        setNextTargetDate((prevDate) => {
          const newDateData = { ...prevDate };
          delete newDateData[id];
          return newDateData;
        });
      }

      return newSelected;
    });
  }, []);

  const handleCheckboxClick = useCallback(
    (e, id) => {
      e.stopPropagation();
      const isChecked = e.target.checked;
      handleSelectItem(id, isChecked);
    },
    [handleSelectItem]
  );

  const handleSelectAllItems = useCallback(
    (e) => {
      e.stopPropagation();
      const checked = e.target.checked;

      if (checked) {
        // Create a new Set with currently selected items
        const newSelected = new Set(selectedItems);

        // Add only enabled items to the selection (based on user role)
        filteredAccountData.forEach((item) => {
          if (!isTaskDisabled(item["col20"], userRole)) {
            newSelected.add(item._id);
          }
        });

        setSelectedItems(newSelected);

        // Update status for enabled items only
        const newStatusData = {};
        newSelected.forEach((id) => {
          newStatusData[id] = "Done";
        });
        setStatusData((prev) => ({ ...prev, ...newStatusData }));
      } else {
        // Remove all items from selection
        setSelectedItems(new Set());
        setAdditionalData({});
        setRemarksData({});
        setStatusData({});
        setNextTargetDate({});
      }
    },
    [filteredAccountData, isTaskDisabled, selectedItems, userRole]
  );

  const handleImageUpload = useCallback(async (id, e) => {
    const file = e.target.files[0];
    if (!file) return;

    setAccountData((prev) =>
      prev.map((item) => (item._id === id ? { ...item, image: file } : item))
    );
  }, []);

  const handleStatusChange = useCallback((id, value) => {
    setStatusData((prev) => ({ ...prev, [id]: value }));
    if (value === "Done") {
      setNextTargetDate((prev) => {
        const newDates = { ...prev };
        delete newDates[id];
        return newDates;
      });
    }
  }, []);

  const handleNextTargetDateChange = useCallback((id, value) => {
    setNextTargetDate((prev) => ({ ...prev, [id]: value }));
  }, []);

  const fileToBase64 = useCallback((file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        // Strip the "data:image/...;base64," prefix
        const base64String = reader.result.split(",")[1];
        resolve(base64String);
      };
      reader.onerror = (error) => reject(error);
    });
  }, []);

  const getStatusColor = useCallback((status) => {
    switch (status) {
      case "Pending":
        return "bg-red-100 text-red-800";
      case "Verify Pending":
        return "bg-blue-100 text-blue-800";
      case "Planned":
        return "bg-yellow-100 text-yellow-800";
      case "Done":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  }, []);



  const handleSubmit = async () => {
    const selectedItemsArray = Array.from(selectedItems);

    if (selectedItemsArray.length === 0) {
      alert("Please select at least one item to submit");
      return;
    }

    const missingStatus = selectedItemsArray.filter((id) => !statusData[id]);
    if (missingStatus.length > 0) {
      alert(
        `Please select a status for all selected items. ${missingStatus.length} item(s) are missing status.`
      );
      return;
    }

    const missingNextDate = selectedItemsArray.filter(
      (id) => statusData[id] === "Extend date" && !nextTargetDate[id]
    );
    if (missingNextDate.length > 0) {
      alert(
        `Please select a next target date for all items with "Extend date" status. ${missingNextDate.length} item(s) are missing target date.`
      );
      return;
    }

    const missingRequiredImages = selectedItemsArray.filter((id) => {
      const item = accountData.find((account) => account._id === id);
      const requiresAttachment =
        item["col9"] && item["col9"].toUpperCase() === "YES";
      return requiresAttachment && !item.image;
    });

    if (missingRequiredImages.length > 0) {
      alert(
        `Please upload images for all required attachments. ${missingRequiredImages.length} item(s) are missing required images.`
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const today = new Date();
      const dateForSubmission = formatDateForGoogleSheets(today);

      // Separate tasks by type: Verify Pending vs Regular tasks
      const verifyPendingTasks = [];
      const regularTasks = [];

      selectedItemsArray.forEach((id) => {
        const item = accountData.find((account) => account._id === id);
        const isVerifyPending = item["col20"] === "Verify Pending";

        if (isVerifyPending) {
          verifyPendingTasks.push({ id, item });
        } else {
          regularTasks.push({ id, item });
        }
      });

      // Process Verify Pending tasks (update existing records in DELEGATION DONE)
      if (verifyPendingTasks.length > 0) {
        await processVerifyPendingTasks(verifyPendingTasks, statusData);
      }

      // Process Regular tasks (create new records in DELEGATION DONE)
      if (regularTasks.length > 0) {
        await processRegularTasks(regularTasks, dateForSubmission, remarksData, nextTargetDate, statusData);
      }

      // Update local state - remove submitted items
      setAccountData((prev) =>
        prev.filter((item) => !selectedItems.has(item._id))
      );

      const successMessage = [];
      if (verifyPendingTasks.length > 0) {
        successMessage.push(`marked ${verifyPendingTasks.length} Verify Pending tasks as Done`);
      }
      if (regularTasks.length > 0) {
        successMessage.push(`submitted ${regularTasks.length} regular tasks`);
      }

      setSuccessMessage(
        `Successfully ${successMessage.join(' and ')}!`
      );
      setSelectedItems(new Set());
      setAdditionalData({});
      setRemarksData({});
      setStatusData({});
      setNextTargetDate({});

      setTimeout(() => {
        fetchSheetData();
      }, 2000);
    } catch (error) {
      console.error("Submission error:", error);
      alert("Failed to submit task records: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // NEW: Process Verify Pending tasks (update existing records)
  const processVerifyPendingTasks = async (tasks, statusData) => {
    const batchSize = 5;

    for (let i = 0; i < tasks.length; i += batchSize) {
      const batch = tasks.slice(i, i + batchSize);

      await Promise.all(
        batch.map(async ({ id, item }) => {
          // For Verify Pending tasks, we need to find the existing record in history
          // and update its Admin Done column (Column P) to "Done"
          const existingHistoryItem = historyData.find(
            history => history["col1"] === item["col1"] // Match by Task ID
          );

          if (!existingHistoryItem) {
            throw new Error(`No existing record found for Verify Pending task: ${item["col1"]}`);
          }

          const updateData = {
            taskId: item["col1"],
            rowIndex: existingHistoryItem._rowIndex,
            adminDoneStatus: "Admin Done"
          };

          const formData = new FormData();
          formData.append("sheetName", CONFIG.TARGET_SHEET_NAME);
          formData.append("action", "updateAdminDone");
          formData.append("rowData", JSON.stringify([updateData]));

          const response = await fetch(CONFIG.APPS_SCRIPT_URL, {
            method: "POST",
            body: formData,
          });

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          const result = await response.json();
          if (!result.success) {
            throw new Error(result.error || "Failed to update Verify Pending task");
          }

          return result;
        })
      );
    }
  };

  // NEW: Process Regular tasks (create new records)
  const processRegularTasks = async (tasks, dateForSubmission, remarksData, nextTargetDate, statusData) => {
    const batchSize = 5;

    for (let i = 0; i < tasks.length; i += batchSize) {
      const batch = tasks.slice(i, i + batchSize);

      await Promise.all(
        batch.map(async ({ id, item }) => {
          let imageUrl = "";

          if (item.image instanceof File) {
            try {
              const base64Data = await fileToBase64(item.image);

              const uploadFormData = new FormData();
              uploadFormData.append("action", "uploadFile");
              uploadFormData.append("base64Data", base64Data);
              uploadFormData.append(
                "fileName",
                `task_${item["col1"]}_${Date.now()}.${item.image.name
                  .split(".")
                  .pop()}`
              );
              uploadFormData.append("mimeType", item.image.type);
              uploadFormData.append("folderId", CONFIG.DRIVE_FOLDER_ID);

              const uploadResponse = await fetch(CONFIG.APPS_SCRIPT_URL, {
                method: "POST",
                body: uploadFormData,
              });

              const uploadResult = await uploadResponse.json();
              if (uploadResult.success) {
                imageUrl = uploadResult.fileUrl;
              }
            } catch (uploadError) {
              console.error("Error uploading image:", uploadError);
            }
          }

          // Format the next target date properly if it exists
          let formattedNextTargetDate = "";
          let nextTargetDateForGoogleSheets = null;

          if (nextTargetDate[id]) {
            const convertedDate = convertToGoogleSheetsDate(
              nextTargetDate[id]
            );
            formattedNextTargetDate = convertedDate.formatted;
            nextTargetDateForGoogleSheets = convertedDate.dateObject;
          }

          // Create new row for regular tasks
          const newRowData = [
            dateForSubmission.formatted,
            item["col1"] || "",
            statusData[id] || "",
            formattedNextTargetDate,
            remarksData[id] || "",
            imageUrl,
            "", // Column G
            username, // Column H - Store the logged-in username
            item["col5"] || "", // Column I - Task description from col5
            item["col3"] || "", // Column J - Given By from original task
          ];

          const insertFormData = new FormData();
          insertFormData.append("sheetName", CONFIG.TARGET_SHEET_NAME);
          insertFormData.append("action", "insert");
          insertFormData.append("rowData", JSON.stringify(newRowData));

          // Add date formatting hints
          insertFormData.append("dateFormat", "DD/MM/YYYY");
          insertFormData.append("timestampColumn", "0");
          insertFormData.append("nextTargetDateColumn", "3");

          const dateMetadata = {
            columns: {
              0: { type: "date", format: "DD/MM/YYYY" },
              3: { type: "date", format: "DD/MM/YYYY" },
            },
          };
          insertFormData.append("dateMetadata", JSON.stringify(dateMetadata));

          if (nextTargetDateForGoogleSheets) {
            insertFormData.append(
              "nextTargetDateObject",
              nextTargetDateForGoogleSheets.toISOString()
            );
          }

          return fetch(CONFIG.APPS_SCRIPT_URL, {
            method: "POST",
            body: insertFormData,
          });
        })
      );
    }
  };

  const selectedItemsCount = selectedItems.size;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <h1 className="text-2xl font-bold tracking-tight text-purple-700">
            {CONFIG.PAGE_CONFIG.title}
          </h1>

          <div className="flex space-x-4">
            <div className="relative">
              <Search
                className="absolute left-3 top-7 transform -translate-y-1/2 text-gray-400"
                size={18}
              />
              <input
                type="text"
                placeholder="Search tasks..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-purple-200 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <button
              onClick={handleSubmit}
              disabled={selectedItemsCount === 0 || isSubmitting}
              className="w-52 gradient-bg py-3 px-4 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              {isSubmitting
                ? "Processing..."
                : `Submit Selected (${selectedItemsCount})`}
            </button>
          </div>
        </div>

        {successMessage && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md flex items-center justify-between">
            <div className="flex items-center">
              <CheckCircle2 className="h-5 w-5 mr-2 text-green-500" />
              {successMessage}
            </div>
            <button
              onClick={() => setSuccessMessage("")}
              className="text-green-500 hover:text-green-700"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        )}

        <div className="w-full flex flex-wrap items-center gap-4 mt-4 mb-4">
          {/* Name Filter */}
          <div className="flex items-center">
            <select
              id="name-filter"
              value={nameFilter}
              onChange={(e) => setNameFilter(e.target.value)}
              className="border border-purple-300 rounded-lg px-3 py-2 text-sm min-w-[160px] max-w-[200px] focus:outline-none focus:ring-2 focus:ring-purple-400 shadow-sm"
              disabled={userRole !== "admin" && uniqueNames.length <= 1}
            >
              <option value="">All Names</option>
              {uniqueNames.map((name) => (
                <option key={name} value={name} className="uppercase">
                  {name}
                </option>
              ))}
            </select>
          </div>

          {/* Date Filter */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <label
                htmlFor="start-date"
                className="text-sm font-semibold text-purple-700"
              >
                From:
              </label>
              <input
                type="date"
                id="start-date"
                value={dateRange.start}
                onChange={(e) =>
                  setDateRange((prev) => ({ ...prev, start: e.target.value }))
                }
                className="border border-purple-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 shadow-sm"
              />
            </div>
            <div className="flex items-center space-x-2">
              <label
                htmlFor="end-date"
                className="text-sm font-semibold text-purple-700"
              >
                To:
              </label>
              <input
                type="date"
                id="end-date"
                value={dateRange.end}
                onChange={(e) =>
                  setDateRange((prev) => ({ ...prev, end: e.target.value }))
                }
                className="border border-purple-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 shadow-sm"
              />
            </div>
          </div>

          {/* Status Filter */}
          <div className="flex items-center">
            <select
              id="status-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-purple-300 rounded-lg px-3 py-2 text-sm min-w-[160px] max-w-[200px] focus:outline-none focus:ring-2 focus:ring-purple-400 shadow-sm"
            >
              <option value="">
                All Status ({filteredAccountData.length})
              </option>
              {/* <option value="Done">✅ Done ({statusCounts.Done})</option> */}
              <option value="Pending">
                🕒 Pending ({statusCounts.Pending})
              </option>
              <option value="Verify Pending">
                🔍 Verify Pending ({statusCounts["Verify Pending"]})
              </option>
              <option value="Planned">
                📜 Planned ({statusCounts.Planned})
              </option>
            </select>
          </div>

          {/* Clear Filters Button */}
          {(nameFilter || statusFilter || dateRange.start || dateRange.end) && (
            <button
              onClick={() => {
                setNameFilter("");
                setDateRange({ start: "", end: "" });
                setStatusFilter("");
              }}
              className="ml-auto flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 transition-all duration-200"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
              Clear Filters
            </button>
          )}
        </div>

        {
          successMessage && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md flex items-center justify-between">
              <div className="flex items-center">
                <CheckCircle2 className="h-5 w-5 mr-2 text-green-500" />
                {successMessage}
              </div>
              <button
                onClick={() => setSuccessMessage("")}
                className="text-green-500 hover:text-green-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          )
        }

        <div className="rounded-lg border border-purple-200 shadow-md bg-white overflow-hidden">
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 border-b border-purple-100 p-4">
            <h2 className="text-purple-700 font-medium">
              {`Pending ${CONFIG.SOURCE_SHEET_NAME} Tasks`}
            </h2>
            <p className="text-purple-600 text-sm">
              {CONFIG.PAGE_CONFIG.description}
            </p>
          </div>

          {loading ? (
            <>
              <div className="block md:hidden">
                <CardSkeleton />
              </div>
              <div className="hidden md:block overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Loading...</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Remarks</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Given By</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Task</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Deadline</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white">
                    <TableSkeleton />
                  </tbody>
                </table>
              </div>
            </>
          ) : error ? (
            <div className="bg-red-50 p-4 rounded-md text-red-800 text-center">
              {error}{" "}
              <button
                className="underline ml-2"
                onClick={() => window.location.reload()}
              >
                Try again
              </button>
            </div>
          ) : (
            <>
              {/* Mobile Card View */}
              <div className="block md:hidden space-y-4 px-4 py-4">
                {filteredAccountData.length > 0 ? (
                  filteredAccountData.map((account) => {
                    const isSelected = selectedItems.has(account._id);
                    return (
                      <div
                        key={account._id}
                        className={`bg-white rounded-lg shadow-sm border ${isSelected ? "border-purple-500" : "border-gray-200"
                          } ${isTaskDisabled(account["col20"], userRole)
                            ? "opacity-50 bg-gray-50"
                            : ""
                          }`}
                      >
                        <div className="p-4 space-y-3">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center space-x-3">
                              <input
                                type="checkbox"
                                className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                                checked={isSelected}
                                onChange={(e) => handleCheckboxClick(e, account._id)}
                                disabled={isTaskDisabled(account["col20"], userRole)}
                              />
                              <div className="flex flex-col">
                                <span className="text-xs text-gray-500 mt-1">ID: {account["col1"] || "—"}</span>
                              </div>
                            </div>
                            <div className="text-sm text-gray-600">{formatDateForDisplay(account["col0"]) || "—"}</div>
                          </div>

                          <div>
                            <div className="text-sm text-gray-900 font-medium">{account["col5"] || "—"}</div>
                            <div className="text-xs text-gray-500 mt-1">Given By: {account["col3"] || "—"} • Name: {account["col4"] || "—"}</div>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <div className="text-xs text-gray-500">Old Deadline</div>
                              <div className="text-sm text-gray-900">{formatDateForDisplay(account["col6"])}</div>
                            </div>
                            <div>
                              <div className="text-xs text-gray-500">New Deadline</div>
                              <div className="text-sm text-gray-900">{formatDateForDisplay(account["col10"])}</div>
                            </div>
                          </div>

                          {isSelected && (
                            <div className="pt-2 border-t border-gray-100 space-y-3">
                              <div>
                                <label className="text-xs text-gray-500">Remarks</label>
                                <input
                                  type="text"
                                  placeholder="Enter remarks"
                                  disabled={isTaskDisabled(account["col20"], userRole)}
                                  value={remarksData[account._id] || ""}
                                  onChange={(e) =>
                                    setRemarksData((prev) => ({ ...prev, [account._id]: e.target.value }))
                                  }
                                  className="mt-1 block w-full border rounded-md px-2 py-1 text-sm border-gray-300 disabled:bg-gray-100"
                                />
                              </div>

                              <div>
                                <label className="text-xs text-gray-500">Status</label>
                                <select
                                  disabled={isTaskDisabled(account["col20"], userRole)}
                                  value={statusData[account._id] || ""}
                                  onChange={(e) => handleStatusChange(account._id, e.target.value)}
                                  className="mt-1 block w-full border rounded-md px-2 py-1 text-sm border-gray-300 disabled:bg-gray-100"
                                >
                                  <option value="">Select</option>
                                  <option value="Done">Done</option>
                                  <option value="Extend date">Extend date</option>
                                </select>
                              </div>

                              {statusData[account._id] === "Extend date" && (
                                <div>
                                  <label className="text-xs text-gray-500">Next Target Date</label>
                                  <input
                                    type="date"
                                    disabled={isTaskDisabled(account["col20"], userRole)}
                                    value={nextTargetDate[account._id] || ""}
                                    onChange={(e) => handleNextTargetDateChange(account._id, e.target.value)}
                                    className="mt-1 block w-full border rounded-md px-2 py-1 text-sm border-gray-300 disabled:bg-gray-100"
                                  />
                                </div>
                              )}
                            </div>
                          )}

                          <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
                            <div>
                              {account.image ? (
                                <div className="flex items-center gap-2">
                                  <img src={typeof account.image === "string" ? account.image : URL.createObjectURL(account.image)} alt="Receipt" className="h-10 w-10 object-cover rounded-md" />
                                  <div className="text-xs text-gray-600">{account.image instanceof File ? "Ready to upload" : <button className="text-purple-600" onClick={() => window.open(account.image, "_blank")}>View</button>}</div>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2">
                                  {account["col15"] && (
                                    <a
                                      href={account["col15"]}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-purple-600"
                                      title="View existing proof"
                                    >
                                      <Image size={24} />
                                    </a>
                                  )}
                                  <label className={`flex items-center cursor-pointer text-xs text-purple-600 hover:text-purple-800`}>
                                    <Upload className="h-4 w-4 mr-1" />
                                    <span>{account["col9"]?.toUpperCase() === "YES" ? "Required Upload" : "Upload Image"}</span>
                                    <input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(account._id, e)} disabled={!isSelected} />
                                  </label>
                                </div>
                              )}
                            </div>
                            <div className="text-xs text-gray-500">{account["col2"] || "—"}</div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="p-4 text-center text-gray-500">{searchTerm ? "No tasks matching your search" : "No pending tasks found"}</div>
                )}
              </div>

              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto sticky top-0 max-h-[calc(100vh-300px)] overflow-y-auto">
                <div className="min-w-full">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                            checked={
                              // Check if all enabled items are selected
                              filteredAccountData.filter(
                                (item) => !isTaskDisabled(item["col20"], userRole)
                              ).length > 0 &&
                              filteredAccountData.filter(
                                (item) =>
                                  !isTaskDisabled(item["col20"], userRole) &&
                                  selectedItems.has(item._id)
                              ).length ===
                              filteredAccountData.filter(
                                (item) => !isTaskDisabled(item["col20"], userRole)
                              ).length
                            }
                            onChange={handleSelectAllItems}
                          />
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Task Start Date
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Task ID
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Department
                        </th>
                        <th
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          Remarks
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Given By
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Name
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Task Description
                        </th>
                        <th
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          Old Deadline Date
                        </th>
                        <th
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          New Deadline Date
                        </th>
                        <th
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          Status
                        </th>
                        <th
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          Next Target Date
                        </th>
                        <th
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          Upload Image
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredAccountData.length > 0 ? (
                        filteredAccountData.map((account) => {
                          const isSelected = selectedItems.has(account._id);
                          const rowColorClass = getRowColor(account["col17"]);
                          return (
                            <tr
                              key={account._id}
                              className={`${isSelected ? "bg-purple-50" : ""
                                } hover:bg-gray-50 ${rowColorClass} ${isTaskDisabled(account["col20"], userRole)
                                  ? "opacity-50 bg-gray-100 cursor-not-allowed"
                                  : ""
                                }`}
                            >
                              <td className="px-6 py-4 whitespace-nowrap">
                                <input
                                  type="checkbox"
                                  className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                                  checked={isSelected}
                                  onChange={(e) =>
                                    handleCheckboxClick(e, account._id)
                                  }
                                  disabled={isTaskDisabled(
                                    account["col20"],
                                    userRole
                                  )}
                                />
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">
                                  {formatDateForDisplay(account["col0"]) || "—"}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">
                                  {account["col1"] || "—"}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">
                                  {account["col2"] || "—"}
                                </div>
                              </td>
                              <td
                                className={`px-6 py-4 whitespace-nowrap ${!account["col17"] ? "bg-purple-50" : ""
                                  }`}
                              >
                                <input
                                  type="text"
                                  placeholder="Enter remarks"
                                  disabled={
                                    !isSelected ||
                                    isTaskDisabled(account["col20"], userRole)
                                  }
                                  value={remarksData[account._id] || ""}
                                  onChange={(e) =>
                                    setRemarksData((prev) => ({
                                      ...prev,
                                      [account._id]: e.target.value,
                                    }))
                                  }
                                  className="border rounded-md px-2 py-1 w-full border-gray-300 disabled:bg-gray-100 disabled:cursor-not-allowed"
                                />
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">
                                  {account["col3"] || "—"}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">
                                  {account["col4"] || "—"}
                                </div>
                              </td>
                              <td className="px-6 py-4 min-w-[250px]">
                                <div
                                  className="text-sm text-gray-900 max-w-md whitespace-normal wrap-break-word"
                                  title={account["col5"]}
                                >
                                  {account["col5"] || "—"}
                                </div>
                              </td>
                              <td
                                className={`px-6 py-4 whitespace-nowrap ${!account["col17"] ? "bg-yellow-50" : ""
                                  }`}
                              >
                                <div className="text-sm text-gray-900">
                                  {formatDateForDisplay(account["col6"])}
                                </div>
                              </td>
                              <td
                                className={`px-6 py-4 whitespace-nowrap ${!account["col17"] ? "bg-green-50" : ""
                                  }`}
                              >
                                <div className="text-sm text-gray-900">
                                  {formatDateForDisplay(account["col10"])}
                                </div>
                              </td>
                              <td
                                className={`px-6 py-4 whitespace-nowrap ${!account["col17"] ? "bg-blue-50" : ""
                                  }`}
                              >
                                <select
                                  disabled={
                                    !isSelected ||
                                    isTaskDisabled(account["col20"], userRole)
                                  }
                                  value={statusData[account._id] || ""}
                                  onChange={(e) =>
                                    handleStatusChange(account._id, e.target.value)
                                  }
                                  className="border border-gray-300 rounded-md px-2 py-1 w-full disabled:bg-gray-100 disabled:cursor-not-allowed"
                                >
                                  <option value="">Select</option>
                                  <option value="Done">Done</option>
                                  <option value="Extend date">Extend date</option>
                                </select>
                              </td>
                              <td
                                className={`px-6 py-4 whitespace-nowrap ${!account["col17"] ? "bg-indigo-50" : ""
                                  }`}
                              >
                                <input
                                  type="date"
                                  disabled={
                                    !isSelected ||
                                    statusData[account._id] !== "Extend date" ||
                                    isTaskDisabled(account["col20"], userRole)
                                  }
                                  value={
                                    nextTargetDate[account._id]
                                      ? (() => {
                                        const dateStr =
                                          nextTargetDate[account._id];
                                        if (dateStr && dateStr.includes("/")) {
                                          const [day, month, year] =
                                            dateStr.split("/");
                                          return `${year}-${month.padStart(
                                            2,
                                            "0"
                                          )}-${day.padStart(2, "0")}`;
                                        }
                                        return dateStr;
                                      })()
                                      : ""
                                  }
                                  onChange={(e) => {
                                    const inputDate = e.target.value;
                                    if (inputDate) {
                                      const [year, month, day] =
                                        inputDate.split("-");
                                      const formattedDate = `${day}/${month}/${year}`;
                                      handleNextTargetDateChange(
                                        account._id,
                                        formattedDate
                                      );
                                    } else {
                                      handleNextTargetDateChange(account._id, "");
                                    }
                                  }}
                                  className="border border-gray-300 rounded-md px-2 py-1 w-full disabled:bg-gray-100 disabled:cursor-not-allowed"
                                />
                              </td>

                              <td
                                className={`px-6 py-4 whitespace-nowrap ${!account["col17"] ? "bg-orange-50" : ""
                                  }`}
                              >
                                {account.image ? (
                                  <div className="flex items-center">
                                    <img
                                      src={
                                        typeof account.image === "string"
                                          ? account.image
                                          : URL.createObjectURL(account.image)
                                      }
                                      alt="Receipt"
                                      className="h-10 w-10 object-cover rounded-md mr-2"
                                    />
                                    <div className="flex flex-col">
                                      {account.image instanceof File ? (
                                        <span className="text-xs text-green-600">
                                          Ready to upload
                                        </span>
                                      ) : (
                                        <button
                                          className="text-xs text-purple-600 hover:text-purple-800"
                                          onClick={() =>
                                            window.open(account.image, "_blank")
                                          }
                                        >
                                          View Full Image
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex items-center space-x-2">
                                    {account["col15"] && (
                                      <a
                                        href={account["col15"]}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-purple-600 hover:text-purple-800"
                                        title="View existing proof"
                                      >
                                        <Image size={20} />
                                      </a>
                                    )}
                                    <label
                                      className={`flex items-center cursor-pointer ${account["col9"]?.toUpperCase() === "YES"
                                        ? "text-red-600 font-medium"
                                        : "text-purple-600"
                                        } hover:text-purple-800`}
                                    >
                                      <Upload className="h-4 w-4 mr-1" />
                                      <span className="text-xs">
                                        {account["col9"]?.toUpperCase() === "YES"
                                          ? "Required Upload"
                                          : "Upload Image"}
                                      </span>
                                      <input
                                        type="file"
                                        className="hidden"
                                        accept="image/*"
                                        onChange={(e) =>
                                          handleImageUpload(account._id, e)
                                        }
                                        disabled={!isSelected}
                                      />
                                    </label>
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td
                            colSpan={14}
                            className="px-6 py-4 text-center text-gray-500"
                          >
                            {searchTerm
                              ? "No tasks matching your search"
                              : "No pending tasks found"}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </AdminLayout >
  );
}

export default DelegationDataPage;
