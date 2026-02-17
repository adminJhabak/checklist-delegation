"use client"
import { useState, useEffect, useCallback, useMemo, memo } from "react"
import { CheckCircle2, Upload, X, Search, ArrowLeft, Filter, Edit } from "lucide-react"
import AdminLayout from "../../components/layout/AdminLayout"

// Configuration object - Move all configurations here
const CONFIG = {
  // Google Apps Script URL
  APPS_SCRIPT_URL:
    "https://script.google.com/macros/s/AKfycbwxe45-zdY7HMvMOmYg3n05GTyn7uhscbojSJB5nQDy2nPKA5Rn9pw_EOUbGG6BSYagFA/exec",
  // Google Drive folder ID for file uploads
  DRIVE_FOLDER_ID: "1UFMuMSHb_r9bEPWpwliX6Y563XmneecC",
  // Sheet name to work with
  SHEET_NAME: "Checklist",
  // Page configuration
  PAGE_CONFIG: {
    title: "Checklist Tasks",
    description: "Showing both completed and pending tasks for today, tomorrow, and past due dates",
  },
}

// Move this function before any component logic, right after CONFIG
const parseDateFromDDMMYYYY = (dateStr) => {
  if (!dateStr || typeof dateStr !== "string") return null
  const datePart = dateStr.includes(" ") ? dateStr.split(" ")[0] : dateStr
  const parts = datePart.split("/")
  if (parts.length !== 3) return null
  return new Date(parts[2], parts[1] - 1, parts[0])
}

const isEmpty = (value) => {
  return value === null || value === undefined || (typeof value === "string" && value.trim() === "")
}

const getTaskStatus = (
  actualValue,
  adminDoneValue,
  taskStartDate,
  assignedTo
) => {
  // Column K (col10) = Actual value
  if (
    !isEmpty(adminDoneValue) &&
    adminDoneValue.toString().trim() === "Admin Done"
  ) {
    return "Admin Done";
  }

  // Check for "Leave" status from Column Q (passed as argument or need to refactor function signature)
  // Since I can't easily change all call sites of getTaskStatus right now, I will handle "Leave" display directly in the render logic or wrapper.
  // BUT, `filteredHistoryData` uses `getSubmissionStatus` and checks statuses.
  // It might be better to just let "Leave" be a distinct status if I can pass it.

  if (actualValue && actualValue.toString().trim() !== "") {
    return "Done";
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const taskDate = parseDateFromDDMMYYYY(taskStartDate);

  if (taskDate) {
    taskDate.setHours(0, 0, 0, 0);

    // Check if task is strictly in the past
    if (taskDate.getTime() < today.getTime()) {
      return "Overdue";
    }
  }

  return "Pending";
};

// Helper to check if status is "Leave"
const isLeaveStatus = (leaveValue) => {
  return !isEmpty(leaveValue) && leaveValue.toString().trim().toLowerCase() === "leave";
};

const getStatusColor = (status) => {
  if (status === "Leave") return "bg-red-100 text-red-800"; // Red styling for Leave
  switch (status) {
    case "Done":
      return "bg-green-100 text-green-800";
    case "Admin Done":
      return "bg-blue-100 text-blue-800";
    case "Overdue":
      return "bg-red-600 text-white"; // Changed to blood red background with white text
    case "Pending":
      return "bg-orange-100 text-black";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

// Helper function to determine date category
const getDateCategory = (taskStartDate) => {
  if (!taskStartDate) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const taskDate = parseDateFromDDMMYYYY(taskStartDate);
  if (!taskDate) return null;

  taskDate.setHours(0, 0, 0, 0);

  if (taskDate.getTime() < today.getTime()) {
    return 'Overdue';
  } else if (taskDate.getTime() === today.getTime()) {
    return 'Today';
  } else {
    return 'Upcoming';
  }
};


const getSubmissionStatus = (actualDate, delayColumn, leaveColumn) => {
  if (isLeaveStatus(leaveColumn)) {
    return { status: 'Leave', color: 'red' }
  }

  const actualNotNull = !isEmpty(actualDate)
  const delayNotNull = !isEmpty(delayColumn)

  if (actualNotNull && delayNotNull) {
    return { status: 'Submitted', color: 'green' }
  } else if (actualNotNull && !delayNotNull) {
    return { status: 'On time', color: 'green' }
  } else {
    return { status: '—', color: 'gray' }
  }
}

const MemoizedTaskRow = memo(({
  account,
  isSelected,
  additionalData,
  remarksData,
  onCheckboxClick,
  onAdditionalDataChange,
  onRemarksChange,
  onImageUpload,
  dateCategory
}) => {
  const isLeave = isLeaveStatus(account["col16"]);
  const taskStatus = isLeave ? "Leave" : getTaskStatus(account["col10"], account["col15"], account["col6"], account["col4"]);
  const isDisabled = taskStatus === "Admin Done" || taskStatus === "Done" || taskStatus === "Leave";
  const isNotToday = taskStatus === "Overdue";

  return (
    <tr
      className={`group ${isSelected ? "bg-purple-50" : ""} ${isNotToday ? "bg-white border-l-4 border-red-600" : "hover:bg-gray-50"} ${isDisabled ? "opacity-90 cursor-not-allowed" : ""}`}
    >
      <td className={`px-3 py-4 w-12 sticky left-0 z-30 ${isSelected ? "bg-purple-50" : isNotToday ? "bg-white" : "bg-white group-hover:bg-gray-50"}`}>
        <div className="flex flex-col items-center gap-1.5">
          {dateCategory && (
            <span className={`inline-flex px-1 py-0.5 text-[9px] font-bold rounded uppercase whitespace-nowrap ${dateCategory === 'Overdue' ? 'bg-red-100 text-red-700' :
              dateCategory === 'Today' ? 'bg-blue-100 text-blue-700' :
                'bg-green-100 text-green-700'
              }`}>
              {dateCategory}
            </span>
          )}
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
            checked={isSelected}
            onChange={(e) => onCheckboxClick(e, account._id)}
            disabled={isDisabled}
          />
        </div>
      </td>
      <td className={`px-3 py-4 w-20 sticky left-12 z-30 ${isSelected ? "bg-purple-50" : isNotToday ? "bg-white" : "bg-white group-hover:bg-gray-50"}`}>
        <div className={`text-sm break-words font-medium ${isNotToday ? "text-red-600" : "text-gray-900"}`}>
          {account["col1"] || "—"}
        </div>
      </td>
      {/* Keep all other existing td elements with the same text color logic */}

      <td className="px-3 py-4 min-w-[100px]">
        <div className={`text-sm break-words font-medium ${isNotToday ? "text-red-600" : "text-gray-900"}`}>
          {account["col4"] || "—"}
        </div>
      </td>
      <td className={`px-3 py-4 ${isNotToday ? "bg-white border-l-4 border-white" : "hover:bg-gray-50"} min-w-[100px]`}>
        <select
          disabled={!isSelected}
          value={additionalData || ""}
          onChange={(e) => onAdditionalDataChange(account._id, e.target.value)}
          className={`border border-gray-300 rounded-md px-2 py-1 w-full ${isNotToday ? "text-red-600" : "text-black"} disabled:bg-gray-100 disabled:cursor-not-allowed text-sm font-medium ${isDisabled ? "opacity-50" : ""}`}
        >
          <option value="">Select...</option>
          <option value="Yes">Yes</option>
          <option value="No">No</option>
        </select>
      </td>
      <td className={`px-3 py-4 ${isNotToday ? "bg-white border-l-4 border-white" : "hover:bg-gray-50"} min-w-[150px]`}>
        <input
          type="text"
          placeholder="Enter remarks"
          disabled={!isSelected || !additionalData}
          value={remarksData || ""}
          onChange={(e) => onRemarksChange(account._id, e.target.value)}
          className={`border rounded-md px-2 py-1 w-full border-gray-300 ${isNotToday ? "placeholder" : ""} disabled:bg-gray-100 disabled:cursor-not-allowed text-sm break-words font-medium ${isDisabled ? "opacity-50" : ""}`}
        />
      </td>
      <td className="px-3 py-4 min-w-[200px]">
        <div className={`text-sm break-words font-medium ${isNotToday ? "text-red-600" : "text-gray-900"} ${isDisabled ? "opacity-50" : ""}`} title={account["col5"]}>
          {account["col5"] || "—"}
        </div>
      </td>
      <td className={`px-3 py-4 ${isNotToday ? "bg-white border-l-4 border-white" : "hover:bg-gray-50"} min-w-[140px]`}>
        <div className={`text-sm break-words ${isNotToday ? "text-red-600" : "text-gray-900"} ${isDisabled ? "opacity-50" : ""}`}>
          {account["col6"] ? (
            <div>
              <div className="font-medium break-words">
                {account["col6"].includes(" ") ? account["col6"].split(" ")[0] : account["col6"]}
              </div>
              {account["col6"].includes(" ") && (
                <div className={`text-xs break-words ${isNotToday ? "text-red-500" : "text-gray-500"}`}>
                  {account["col6"].split(" ")[1]}
                </div>
              )}
            </div>
          ) : (
            "—"
          )}
        </div>
      </td>
      <td className="px-3 py-4 min-w-[80px]">
        <div className={`text-sm break-words font-medium ${isNotToday ? "text-red-600" : "text-gray-900"} ${isDisabled ? "opacity-50" : ""}`}>
          {account["col7"] || "—"}
        </div>
      </td>


      <td className="px-3 py-4 bg-green-50 min-w-[120px]">
        {account.image ? (
          <div className={`flex items-center ${isDisabled ? "opacity-50" : ""}`}>
            <img
              src={
                typeof account.image === "string"
                  ? account.image
                  : URL.createObjectURL(account.image)
              }
              alt="Receipt"
              className="h-10 w-10 object-cover rounded-md mr-2 flex-shrink-0"
            />
            <div className="flex flex-col min-w-0">
              <span className="text-xs text-gray-500 break-words">
                {account.image instanceof File ? account.image.name : "Uploaded Receipt"}
              </span>
              {account.image instanceof File ? (
                <span className="text-xs text-green-600 font-medium">Ready to upload</span>
              ) : (
                <button
                  className="text-xs text-purple-600 hover:text-purple-800 break-words font-medium"
                  onClick={() => window.open(account.image, "_blank")}
                >
                  View Full Image
                </button>
              )}
            </div>
          </div>
        ) : (
          <label
            className={`flex items-center cursor-pointer ${account["col9"]?.toUpperCase() === "YES" ? "text-red-600 font-medium" : "text-purple-600"} hover:text-purple-800 ${isDisabled ? "opacity-50" : ""}`}
          >
            <Upload className="h-4 w-4 mr-1 flex-shrink-0" />
            <span className="text-xs break-words font-medium">
              {account["col9"]?.toUpperCase() === "YES"
                ? "Required Upload"
                : "Upload Receipt Image"}
              {account["col9"]?.toUpperCase() === "YES" && (
                <span className="text-red-500 ml-1">*</span>
              )}
            </span>
            <input
              type="file"
              className="hidden"
              accept="image/*"
              onChange={(e) => onImageUpload(account._id, e)}
              disabled={!isSelected}
            />
          </label>
        )}
      </td>
    </tr>
  );
});

function AccountDataPage() {
  const [accountData, setAccountData] = useState([])
  const [selectedItems, setSelectedItems] = useState(new Set())
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [successMessage, setSuccessMessage] = useState("")
  const [additionalData, setAdditionalData] = useState({})
  const [searchTerm, setSearchTerm] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [remarksData, setRemarksData] = useState({})
  const [membersList, setMembersList] = useState([])
  const [selectedMembers, setSelectedMembers] = useState([])
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [userRole, setUserRole] = useState("")
  const [username, setUsername] = useState("")
  const [selectedStatus, setSelectedStatus] = useState("") // New filter for status
  const [selectedCategory, setSelectedCategory] = useState("") // New filter for category (Upcoming, Today, Overdue)
  const [showFilters, setShowFilters] = useState(false) // Toggle for filter section
  const [nameSearchTerm, setNameSearchTerm] = useState("") // Search term for name dropdown
  const [displayLimit, setDisplayLimit] = useState(50)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("")
  // Function to determine submission status
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isDropdownOpen && !event.target.closest('.relative')) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isDropdownOpen]);




  const formatDateTimeToDDMMYYYY = useCallback((date) => {
    const day = date.getDate().toString().padStart(2, "0")
    const month = (date.getMonth() + 1).toString().padStart(2, "0")
    const year = date.getFullYear()
    const hours = date.getHours().toString().padStart(2, "0")
    const minutes = date.getMinutes().toString().padStart(2, "0")
    const seconds = date.getSeconds().toString().padStart(2, "0")
    return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`
  }, [])

  const formatDateToDDMMYYYY = useCallback((date) => {
    const day = date.getDate().toString().padStart(2, "0")
    const month = (date.getMonth() + 1).toString().padStart(2, "0")
    const year = date.getFullYear()
    return `${day}/${month}/${year}`
  }, [])



  useEffect(() => {
    const role = sessionStorage.getItem("role")
    const user = sessionStorage.getItem("username")
    setUserRole(role || "")
    setUsername(user || "")
  }, [])

  // Add this useEffect for cleanup
  useEffect(() => {
    return () => {
      // Cleanup object URLs on component unmount
      accountData.forEach(account => {
        if (account.image && typeof account.image !== 'string' && account.image instanceof File) {
          URL.revokeObjectURL(account.image)
        }
      })
    }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm)
    }, 300)

    return () => clearTimeout(timer)
  }, [searchTerm])

  // Parse Google Sheets date-time to handle DD/MM/YYYY HH:MM:SS format
  const parseGoogleSheetsDateTime = (dateTimeStr) => {
    if (!dateTimeStr) return ""
    // If already in DD/MM/YYYY HH:MM:SS format, return as is
    if (typeof dateTimeStr === "string" && dateTimeStr.match(/^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}:\d{2}$/)) {
      return dateTimeStr
    }
    // If in DD/MM/YYYY format (without time), return as is
    if (typeof dateTimeStr === "string" && dateTimeStr.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
      return dateTimeStr
    }
    // Handle Google Sheets Date(year,month,day) format
    if (typeof dateTimeStr === "string" && dateTimeStr.startsWith("Date(")) {
      const match = /Date\((\d+),(\d+),(\d+)\)/.exec(dateTimeStr)
      if (match) {
        const year = Number.parseInt(match[1], 10)
        const month = Number.parseInt(match[2], 10)
        const day = Number.parseInt(match[3], 10)
        return `${day.toString().padStart(2, "0")}/${(month + 1).toString().padStart(2, "0")}/${year}`
      }
    }
    // Try to parse as a regular date
    try {
      const date = new Date(dateTimeStr)
      if (!isNaN(date.getTime())) {
        // Check if the original string contained time information
        if (typeof dateTimeStr === "string" && (dateTimeStr.includes(":") || dateTimeStr.includes("T"))) {
          return formatDateTimeToDDMMYYYY(date)
        } else {
          return formatDateToDDMMYYYY(date)
        }
      }
    } catch (error) {
      console.error("Error parsing date-time:", error)
    }
    return dateTimeStr
  }

  // Parse date from DD/MM/YYYY or DD/MM/YYYY HH:MM:SS format for comparison
  const parseDateFromDDMMYYYY = useCallback((dateStr) => {
    if (!dateStr || typeof dateStr !== "string") return null
    const datePart = dateStr.includes(" ") ? dateStr.split(" ")[0] : dateStr
    const parts = datePart.split("/")
    if (parts.length !== 3) return null
    return new Date(parts[2], parts[1] - 1, parts[0])
  }, [])

  const sortDateWise = (a, b) => {
    const dateStrA = a["col6"] || ""
    const dateStrB = b["col6"] || ""
    const dateA = parseDateFromDDMMYYYY(dateStrA)
    const dateB = parseDateFromDDMMYYYY(dateStrB)
    if (!dateA) return 1
    if (!dateB) return -1
    return dateA.getTime() - dateB.getTime()
  }

  const resetFilters = useCallback(() => {
    setSearchTerm("")
    setSelectedMembers([])
    setStartDate("")
    setEndDate("")
    setSelectedStatus("")
    setSelectedCategory("")
    setNameSearchTerm("")
  }, [])

  // Admin functions for history management


  // Confirmation modal component




  const filteredAccountData = useMemo(() => {
    if (!accountData.length) return []

    let filtered = accountData.filter((account) => !isLeaveStatus(account["col16"]));

    if (debouncedSearchTerm) {
      const lowerSearchTerm = searchTerm.toLowerCase();
      filtered = filtered.filter((account) =>
        Object.values(account).some(
          (value) => value && value.toString().toLowerCase().includes(lowerSearchTerm),
        ),
      );
    }

    if (selectedStatus) {
      filtered = filtered.filter((account) => {
        if (selectedStatus === "Admin Done") {
          return !isEmpty(account["col15"]) && account["col15"].toString().trim() === "Admin Done";
        } else {
          const taskStatus = getTaskStatus(account["col10"], account["col15"], account["col6"], account["col4"]);
          return taskStatus === selectedStatus;
        }
      });
    }

    if (selectedCategory) {
      filtered = filtered.filter((account) => {
        const cat = getDateCategory(account["col6"]);
        return cat === selectedCategory;
      });
    }

    if (selectedMembers.length > 0) {
      filtered = filtered.filter((account) => selectedMembers.includes(account["col4"]));
    }

    if (startDate || endDate) {
      filtered = filtered.filter((account) => {
        const itemDate = parseDateFromDDMMYYYY(account["col6"]);
        if (!itemDate) return false;

        if (startDate) {
          const startDateObj = new Date(startDate);
          startDateObj.setHours(0, 0, 0, 0);
          if (itemDate < startDateObj) return false;
        }

        if (endDate) {
          const endDateObj = new Date(endDate);
          endDateObj.setHours(23, 59, 59, 999);
          if (itemDate > endDateObj) return false;
        }

        return true;
      });
    }

    // Sort with grace period consideration
    return filtered.sort((a, b) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 1);

      const dateA = parseDateFromDDMMYYYY(a["col6"]);
      const dateB = parseDateFromDDMMYYYY(b["col6"]);

      // List of users who get 1-day grace period
      const usersWithGracePeriod = [
        "ARCHANA DAY",
        "AMITA, POONIYA",
        "INDRAJEET"
      ].map(name => name.toUpperCase());

      const isAGracePeriodUser = a["col4"] && usersWithGracePeriod.includes(a["col4"].trim().toUpperCase());
      const isBGracePeriodUser = b["col4"] && usersWithGracePeriod.includes(b["col4"].trim().toUpperCase());

      const isATodayTask = dateA && dateA.setHours(0, 0, 0, 0) === today.getTime();
      const isAYesterdayTask = isAGracePeriodUser && dateA && dateA.setHours(0, 0, 0, 0) === yesterday.getTime();
      const isATodayOrYesterdayTask = isATodayTask || isAYesterdayTask;

      const isBTodayTask = dateB && dateB.setHours(0, 0, 0, 0) === today.getTime();
      const isBYesterdayTask = isBGracePeriodUser && dateB && dateB.setHours(0, 0, 0, 0) === yesterday.getTime();
      const isBTodayOrYesterdayTask = isBTodayTask || isBYesterdayTask;

      // Today's (and yesterday's for grace period users) tasks always come first
      if (isATodayOrYesterdayTask && !isBTodayOrYesterdayTask) return -1;
      if (!isATodayOrYesterdayTask && isBTodayOrYesterdayTask) return 1;

      // For today's/yesterday's tasks: Pending first, then sort by oldest
      if (isATodayOrYesterdayTask && isBTodayOrYesterdayTask) {
        const statusA = getTaskStatus(a["col10"], a["col15"], a["col6"], a["col4"]);
        const statusB = getTaskStatus(b["col10"], b["col15"], b["col6"], b["col4"]);

        if (statusA === "Pending" && statusB !== "Pending") return -1;
        if (statusA !== "Pending" && statusB === "Pending") return 1;

        // Both same status, sort by oldest first
        const dateStrA = a["col6"] || "";
        const dateStrB = b["col6"] || "";
        const parsedDateA = parseDateFromDDMMYYYY(dateStrA);
        const parsedDateB = parseDateFromDDMMYYYY(dateStrB);

        if (!parsedDateA && !parsedDateB) return 0;
        if (!parsedDateA) return 1;
        if (!parsedDateB) return -1;

        return parsedDateA.getTime() - parsedDateB.getTime();
      }

      // For non-today tasks: sort by status and date
      const statusA = getTaskStatus(a["col10"], a["col15"], a["col6"], a["col4"]);
      const statusB = getTaskStatus(b["col10"], b["col15"], b["col6"], b["col4"]);

      if (statusA === "Pending" && statusB !== "Pending") return -1;
      if (statusA !== "Pending" && statusB === "Pending") return 1;

      if (statusA === "Pending" && statusB === "Pending") {
        const dateStrA = a["col6"] || "";
        const dateStrB = b["col6"] || "";
        const parsedDateA = parseDateFromDDMMYYYY(dateStrA);
        const parsedDateB = parseDateFromDDMMYYYY(dateStrB);

        if (!parsedDateA && !parsedDateB) return 0;
        if (!parsedDateA) return 1;
        if (!parsedDateB) return -1;

        return parsedDateA.getTime() - parsedDateB.getTime();
      }

      const dateStrA = a["col6"] || "";
      const dateStrB = b["col6"] || "";
      const parsedDateA = parseDateFromDDMMYYYY(dateStrA);
      const parsedDateB = parseDateFromDDMMYYYY(dateStrB);

      if (!parsedDateA && !parsedDateB) return 0;
      if (!parsedDateA) return 1;
      if (!parsedDateB) return -1;

      return parsedDateB.getTime() - parsedDateA.getTime();
    });
  }, [accountData, debouncedSearchTerm, searchTerm, selectedStatus, selectedCategory, selectedMembers, startDate, endDate]);

  // Replace existing filteredHistoryData with this




  const handleMemberSelection = useCallback((member) => {
    setSelectedMembers((prev) => {
      if (prev.includes(member)) {
        return prev.filter((item) => item !== member)
      } else {
        return [...prev, member]
      }
    })
  }, [])

  const getFilteredMembersList = useCallback(() => {
    if (userRole === "admin") {
      return membersList
    } else {
      return membersList.filter((member) => member.toLowerCase() === username.toLowerCase())
    }
  }, [membersList, userRole, username])

  const fetchSheetData = useCallback(async () => {
    try {
      setLoading(true)
      const pendingAccounts = []
      const response = await fetch(`${CONFIG.APPS_SCRIPT_URL}?sheet=${CONFIG.SHEET_NAME}&action=fetch`)
      if (!response.ok) {
        throw new Error(`Failed to fetch data: ${response.status}`)
      }
      const text = await response.text()
      let data
      try {
        data = JSON.parse(text)
      } catch (parseError) {
        const jsonStart = text.indexOf("{")
        const jsonEnd = text.lastIndexOf("}")
        if (jsonStart !== -1 && jsonEnd !== -1) {
          const jsonString = text.substring(jsonStart, jsonEnd + 1)
          data = JSON.parse(jsonString)
        } else {
          throw new Error("Invalid JSON response from server")
        }
      }

      const currentUsername = sessionStorage.getItem("username")
      const currentUserRole = sessionStorage.getItem("role")
      const today = new Date()
      const tomorrow = new Date(today)
      tomorrow.setDate(today.getDate() + 1)
      const todayStr = formatDateToDDMMYYYY(today)
      const tomorrowStr = formatDateToDDMMYYYY(tomorrow)

      // For users with grace period: also include yesterday's tasks
      const yesterday = new Date(today)
      yesterday.setDate(today.getDate() - 1)
      const yesterdayStr = formatDateToDDMMYYYY(yesterday)

      const membersSet = new Set()
      let rows = []
      if (data.table && data.table.rows) {
        rows = data.table.rows
      } else if (Array.isArray(data)) {
        rows = data
      } else if (data.values) {
        rows = data.values.map((row) => ({ c: row.map((val) => ({ v: val })) }))
      }

      // List of users who get 1-day grace period
      const usersWithGracePeriod = [
        "ARCHANA DAY",
        "AMITA, POONIYA",
        "INDRAJEET"
      ].map(name => name.toUpperCase());

      rows.forEach((row, rowIndex) => {
        if (rowIndex === 0) return
        let rowValues = []
        if (row.c) {
          rowValues = row.c.map((cell) => (cell && cell.v !== undefined ? cell.v : ""))
        } else if (Array.isArray(row)) {
          rowValues = row
        } else {
          return
        }

        const assignedTo = rowValues[4] || "Unassigned"
        membersSet.add(assignedTo)
        const isUserMatch = currentUserRole === "admin" || assignedTo.toLowerCase() === currentUsername.toLowerCase()
        if (!isUserMatch && currentUserRole !== "admin") return

        const columnGValue = rowValues[6] // Task Start Date
        const columnKValue = rowValues[10] // Actual Date
        const columnMValue = rowValues[12] // Status (DONE)
        const columnPValue = rowValues[15] // Admin Processed Date (Column P)
        const columnQValue = rowValues[16] // Leave Status (Column Q)

        const rowDateStr = columnGValue ? String(columnGValue).trim() : ""
        const formattedRowDate = parseGoogleSheetsDateTime(rowDateStr)
        const googleSheetsRowIndex = rowIndex + 1

        const taskId = rowValues[1] || ""
        const stableId = taskId
          ? `task_${taskId}_${googleSheetsRowIndex}`
          : `row_${googleSheetsRowIndex}_${Math.random().toString(36).substring(2, 15)}`

        const rowData = {
          _id: stableId,
          _rowIndex: googleSheetsRowIndex,
          _taskId: taskId,
        }

        const columnHeaders = [
          { id: "col0", label: "Timestamp", type: "string" },
          { id: "col1", label: "Task ID", type: "string" },
          { id: "col2", label: "Firm", type: "string" },
          { id: "col3", label: "Given By", type: "string" },
          { id: "col4", label: "Name", type: "string" },
          { id: "col5", label: "Task Description", type: "string" },
          { id: "col6", label: "Task Start Date", type: "datetime" },
          { id: "col7", label: "Freq", type: "string" },
          { id: "col8", label: "Enable Reminders", type: "string" },
          { id: "col9", label: "Require Attachment", type: "string" },
          { id: "col10", label: "Actual", type: "datetime" },
          { id: "col11", label: "Delay", type: "string" },
          { id: "col12", label: "Status", type: "string" },
          { id: "col13", label: "Remarks", type: "string" },
          { id: "col14", label: "Uploaded Image", type: "string" },
          { id: "col15", label: "Admin Done", type: "string" },
          { id: "col16", label: "Leave", type: "string" },
        ]

        columnHeaders.forEach((header, index) => {
          const cellValue = rowValues[index]
          if (
            header.type === "datetime" ||
            header.type === "date" ||
            (cellValue && String(cellValue).startsWith("Date("))
          ) {
            rowData[header.id] = cellValue ? parseGoogleSheetsDateTime(String(cellValue)) : ""
          } else if (header.type === "number" && cellValue !== null && cellValue !== "") {
            rowData[header.id] = cellValue
          } else {
            rowData[header.id] = cellValue !== null ? cellValue : ""
          }
        })

        const hasColumnG = !isEmpty(columnGValue)
        const hasColumnK = !isEmpty(columnKValue)
        const isAdminDone = !isEmpty(columnPValue) && columnPValue.toString().trim() === "Admin Done"
        const isLeave = isLeaveStatus(columnQValue);

        // TASK PAGE LOGIC: Show Pending and Overdue tasks
        // Exclude: Done, Admin Done, Leave
        if (hasColumnG) {
          const rowDate = parseDateFromDDMMYYYY(formattedRowDate)
          const isToday = formattedRowDate.startsWith(todayStr)
          const isTomorrow = formattedRowDate.startsWith(tomorrowStr)
          const isYesterday = formattedRowDate.startsWith(yesterdayStr)
          const isPastDate = rowDate && rowDate <= today

          // Only add to tasks if it's NOT done, NOT admin done, AND NOT Leave
          const isNotDone = !hasColumnK && !isAdminDone && !isLeave

          const assignedToUpper = assignedTo.trim().toUpperCase();
          const isUserWithGracePeriod = usersWithGracePeriod.includes(assignedToUpper);

          // For users with grace period: include today, tomorrow, yesterday, and past dates
          if (isUserWithGracePeriod) {
            if ((isToday || isTomorrow || isYesterday || isPastDate) && isNotDone) {
              pendingAccounts.push(rowData)
            }
          } else {
            // For all other users: normal logic (today, tomorrow, past dates)
            if ((isToday || isTomorrow || isPastDate) && isNotDone) {
              pendingAccounts.push(rowData)
            }
          }
        }
      })

      setMembersList(Array.from(membersSet).sort())
      setAccountData(pendingAccounts)
      setLoading(false)
    } catch (error) {
      console.error("Error fetching sheet data:", error)
      setError("Failed to load account data: " + error.message)
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSheetData()
  }, [fetchSheetData])

  // Checkbox handlers with better state management
  const handleSelectItem = useCallback((id, isChecked) => {
    console.log(`Checkbox action: ${id} -> ${isChecked}`)
    setSelectedItems((prev) => {
      const newSelected = new Set(prev)
      if (isChecked) {
        newSelected.add(id)
      } else {
        newSelected.delete(id)
        // Clean up related data when unchecking
        setAdditionalData((prevData) => {
          const newAdditionalData = { ...prevData }
          delete newAdditionalData[id]
          return newAdditionalData
        })
        setRemarksData((prevRemarks) => {
          const newRemarksData = { ...prevRemarks }
          delete newRemarksData[id]
          return newRemarksData
        })
      }
      console.log(`Updated selection: ${Array.from(newSelected)}`)
      return newSelected
    })
  }, [])

  const handleCheckboxClick = useCallback(
    (e, id) => {
      e.stopPropagation()
      const isChecked = e.target.checked
      console.log(`Checkbox clicked: ${id}, checked: ${isChecked}`)
      handleSelectItem(id, isChecked)
    },
    [handleSelectItem],
  )

  const handleSelectAllItems = useCallback(
    (e) => {
      e.stopPropagation();
      const checked = e.target.checked;

      if (checked) {
        // Only select items that are not disabled (today's tasks only)
        const enabledIds = filteredAccountData
          .filter((item) => {
            const taskStatus = getTaskStatus(item["col10"], item["col15"], item["col6"]);
            return taskStatus !== "Admin Done" && taskStatus !== "Done" && taskStatus !== "Disabled";
          })
          .map((item) => item._id);

        setSelectedItems(new Set(enabledIds));
        console.log(`Selected all enabled items: ${enabledIds}`);
      } else {
        setSelectedItems(new Set());
        setAdditionalData({});
        setRemarksData({});
        console.log("Cleared all selections");
      }
    },
    [filteredAccountData],
  );

  // Add these optimized handlers inside the component
  const handleAdditionalDataChange = useCallback((id, value) => {
    setAdditionalData((prev) => ({ ...prev, [id]: value }))
    if (value !== "No") {
      setRemarksData((prev) => {
        const newData = { ...prev }
        delete newData[id]
        return newData
      })
    }
  }, [])

  const handleRemarksChange = useCallback((id, value) => {
    setRemarksData((prev) => ({ ...prev, [id]: value }))
  }, [])

  const handleLoadMore = useCallback(() => {
    if (displayLimit < filteredAccountData.length && !isLoadingMore) {
      setIsLoadingMore(true);
      setTimeout(() => {
        setDisplayLimit(prev => Math.min(prev + 500, filteredAccountData.length));
        setIsLoadingMore(false);
      }, 300);
    }
  }, [displayLimit, filteredAccountData.length, isLoadingMore]);

  useEffect(() => {
    setDisplayLimit(500);
  }, [debouncedSearchTerm, selectedStatus, selectedCategory, selectedMembers, startDate, endDate]);

  const displayedAccountData = useMemo(() => {
    return filteredAccountData.slice(0, displayLimit);
  }, [filteredAccountData, displayLimit]);

  const handleImageUpload = useCallback(async (id, e) => {
    const file = e.target.files[0]
    if (!file) return

    // Clean up previous object URL to prevent memory leaks
    setAccountData((prev) => {
      const updated = prev.map((item) => {
        if (item._id === id) {
          if (item.image && typeof item.image !== 'string' && item.image instanceof File) {
            URL.revokeObjectURL(item.image)
          }
          return { ...item, image: file }
        }
        return item
      })
      return updated
    })
  }, [])

  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => {
        const base64String = reader.result.split(",")[1]
        resolve(base64String)
      }
      reader.onerror = (error) => reject(error)
    })
  }



  // MAIN SUBMIT FUNCTION
  const handleSubmit = async () => {
    const selectedItemsArray = Array.from(selectedItems);
    if (selectedItemsArray.length === 0) {
      alert("Please select at least one item to submit");
      return;
    }

    // Existing validation checks remain the same
    const missingRemarks = selectedItemsArray.filter((id) => {
      const additionalStatus = additionalData[id];
      const remarks = remarksData[id];
      return additionalStatus === "No" && (!remarks || remarks.trim() === "");
    });

    if (missingRemarks.length > 0) {
      alert(`Please provide remarks for items marked as "No". ${missingRemarks.length} item(s) are missing remarks.`);
      return;
    }

    const missingRequiredImages = selectedItemsArray.filter((id) => {
      const item = accountData.find((account) => account._id === id);
      const requiresAttachment = item["col9"] && item["col9"].toUpperCase() === "YES";
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
      // Format as DD/MM/YYYY HH:MM:SS for column K
      const todayFormatted = formatDateToDDMMYYYY(today);
      console.log("submission date:", todayFormatted);

      // Prepare data for submission
      const submissionData = [];
      const imageUploadPromises = [];

      // First handle all image uploads
      for (const id of selectedItemsArray) {
        const item = accountData.find((account) => account._id === id);

        if (item.image instanceof File) {
          const uploadPromise = fileToBase64(item.image)
            .then(async (base64Data) => {
              const formData = new FormData();
              formData.append("action", "uploadFile");
              formData.append("base64Data", base64Data);
              formData.append("fileName", `task_${item["col1"]}_${Date.now()}.${item.image.name.split(".").pop()}`);
              formData.append("mimeType", item.image.type);
              formData.append("folderId", CONFIG.DRIVE_FOLDER_ID);

              const response = await fetch(CONFIG.APPS_SCRIPT_URL, {
                method: "POST",
                body: formData,
              });
              return response.json();
            })
            .then((result) => {
              if (result.success) {
                return { id, imageUrl: result.fileUrl };
              }
              return { id, imageUrl: "" };
            });

          imageUploadPromises.push(uploadPromise);
        }
      }

      // Wait for all image uploads to complete
      const uploadResults = await Promise.all(imageUploadPromises);
      const imageUrlMap = uploadResults.reduce((acc, result) => {
        acc[result.id] = result.imageUrl;
        return acc;
      }, {});

      // Prepare submission data
      for (const id of selectedItemsArray) {
        const item = accountData.find((account) => account._id === id);
        submissionData.push({
          taskId: item["col1"], // Column B
          rowIndex: item._rowIndex,
          actualDate: todayFormatted, // Column K (formatted as DD/MM/YYYY HH:MM:SS)
          status: additionalData[id] || "", // Column M
          remarks: remarksData[id] || "", // Column N
          imageUrl: imageUrlMap[id] || (item.image && typeof item.image === "string" ? item.image : ""), // Column O
        });
      }

      // Optimistic UI updates
      const submittedItemsForHistory = selectedItemsArray.map((id) => {
        const item = accountData.find((account) => account._id === id);
        return {
          ...item,
          col10: todayFormatted, // Column K
          col12: additionalData[id] || "", // Column M
          col13: remarksData[id] || "", // Column N
          col14: imageUrlMap[id] || (item.image && typeof item.image === "string" ? item.image : ""), // Column O
        };
      });

      // Update local state
      setAccountData((prev) => prev.filter((item) => !selectedItems.has(item._id)));
      setSelectedItems(new Set());
      setAdditionalData({});
      setRemarksData({});
      setSuccessMessage(`Successfully submitted ${selectedItemsArray.length} task(s)!`);

      // Submit to Google Sheets
      const formData = new FormData();
      formData.append("sheetName", CONFIG.SHEET_NAME);
      formData.append("action", "updateTaskData");
      formData.append("rowData", JSON.stringify(submissionData));

      const response = await fetch(CONFIG.APPS_SCRIPT_URL, {
        method: "POST",
        body: formData,
      });

      const result = await response.json();
      if (!result.success) {
        console.error("Background submission failed:", result.error);
        // Optionally show an error message
      }
    } catch (error) {
      console.error("Submission error:", error);
      alert("Error occurred during submission. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Convert Set to Array for display
  const selectedItemsCount = selectedItems.size

  // Filter Section Component// Filter Section Component
  const FilterSection = () => {
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const filteredMembersList = getFilteredMembersList().filter(member =>
      member.toLowerCase().includes(nameSearchTerm.toLowerCase())
    );

    return (
      <div className="p-6 border-b border-purple-100 bg-purple-50/30 relative animate-in fade-in slide-in-from-top-4 duration-300">
        <button
          onClick={() => setShowFilters(false)}
          className="absolute top-4 right-4 p-1.5 rounded-full text-purple-400 hover:text-purple-600 hover:bg-purple-100 transition-colors"
          title="Close filters"
        >
          <X size={18} />
        </button>

        <div className="flex flex-wrap items-end justify-center gap-6">
          {/* Status Filter */}
          <div className="flex flex-col">
            <label className="text-sm font-medium text-purple-700 mb-1.5">
              Status:
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="text-sm border border-purple-200 rounded-md p-2 min-w-[140px] focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white transition-all hover:border-purple-300"
            >
              <option value="">All Status</option>
              <option value="Pending">Pending (Today Only)</option>
              <option value="Disabled">Overdue</option>
            </select>
          </div>

          {/* Category Filter */}
          <div className="flex flex-col">
            <label className="text-sm font-medium text-purple-700 mb-1.5">
              Category:
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="text-sm border border-purple-200 rounded-md p-2 min-w-[140px] focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white transition-all hover:border-purple-300"
            >
              <option value="">All Categories</option>
              <option value="Today">Today</option>
              <option value="Upcoming">Upcoming</option>
              <option value="Overdue">Overdue</option>
            </select>
          </div>

          {/* Name/Member Filter with Search Dropdown */}
          {getFilteredMembersList().length > 0 && (
            <div className="flex flex-col">
              <label className="text-sm font-medium text-purple-700 mb-1.5">
                Member:
              </label>
              <div className="relative w-[200px]">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-purple-400" />
                </div>
                <input
                  type="text"
                  placeholder="Search members..."
                  value={nameSearchTerm}
                  onChange={(e) => setNameSearchTerm(e.target.value)}
                  onClick={() => setIsDropdownOpen(true)}
                  className="pl-10 pr-4 py-2 border border-purple-200 rounded-md text-sm w-full focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all hover:border-purple-300 bg-white"
                />

                {/* Dropdown - only shows when clicked and has items */}
                {isDropdownOpen && filteredMembersList.length > 0 && (
                  <div className="absolute top-full left-0 right-0 z-50 mt-1 max-h-48 overflow-y-auto p-2 border border-purple-200 rounded-md bg-white shadow-xl">
                    <div className="space-y-1.5">
                      {filteredMembersList.map((member, idx) => (
                        <div key={idx} className="flex items-center p-1 hover:bg-purple-50 rounded transition-colors">
                          <input
                            id={`member-${idx}`}
                            type="checkbox"
                            className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
                            checked={selectedMembers.includes(member)}
                            onChange={() => handleMemberSelection(member)}
                          />
                          <label
                            htmlFor={`member-${idx}`}
                            className="ml-2.5 text-sm text-gray-700 whitespace-nowrap cursor-pointer select-none"
                          >
                            {member}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Date Range Filter */}
          <div className="flex flex-col">
            <label className="text-sm font-medium text-purple-700 mb-1.5">
              Date Range:
            </label>
            <div className="flex items-center gap-2 bg-white border border-purple-200 rounded-md p-1">
              <div className="flex items-center px-1">
                <span className="text-[10px] uppercase font-bold text-gray-400 mr-2">From</span>
                <input
                  id="start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="text-sm border-none focus:ring-0 p-1 text-gray-700 cursor-pointer"
                />
              </div>
              <div className="w-px h-6 bg-purple-100"></div>
              <div className="flex items-center px-1">
                <span className="text-[10px] uppercase font-bold text-gray-400 mr-2">To</span>
                <input
                  id="end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="text-sm border-none focus:ring-0 p-1 text-gray-700 cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Selected members display (Under the filters) */}
          {selectedMembers.length > 0 && (
            <div className="flex flex-wrap gap-1.5 max-w-[300px]">
              {selectedMembers.map((member) => (
                <span
                  key={member}
                  className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 border border-purple-200"
                >
                  {member}
                  <button
                    onClick={() => handleMemberSelection(member)}
                    className="ml-1.5 text-purple-600 hover:text-purple-800 transition-colors"
                  >
                    <X size={14} />
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Clear Filters Button */}
          {(selectedMembers.length > 0 ||
            startDate ||
            endDate ||
            searchTerm ||
            selectedStatus ||
            selectedCategory ||
            nameSearchTerm) && (
              <button
                onClick={() => {
                  resetFilters();
                  setIsDropdownOpen(false);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 border border-red-100 rounded-md hover:bg-red-100 transition-all text-sm font-medium h-[38px]"
              >
                <X size={16} />
                Clear All
              </button>
            )}
        </div>
      </div >
    );
  };



  // Leave Handler
  const handleLeave = async () => {
    // Get today's date string
    const today = new Date();
    const todayStr = formatDateToDDMMYYYY(today);

    // Determine candidate tasks: If items are selected, use those. Otherwise use all filtered items (Bulk action).
    const candidates = selectedItems.size > 0
      ? filteredAccountData.filter(item => selectedItems.has(item._id))
      : filteredAccountData;

    // Filter tasks that match today's date
    const todaysTasks = candidates.filter(task => {
      const hasColumnG = !isEmpty(task["col6"]); // Task Start Date
      if (!hasColumnG) return false;

      const rowDateStr = String(task["col6"]).trim();
      let formattedRowDate = parseGoogleSheetsDateTime(rowDateStr); // returns DD/MM/YYYY or DD/MM/YYYY HH:MM:SS

      // Strip time if present to ensure date-only comparison
      if (formattedRowDate && formattedRowDate.includes(" ")) {
        formattedRowDate = formattedRowDate.split(" ")[0];
      }

      if (formattedRowDate !== todayStr) return false;

      // Check if Column K (Index 10) is empty
      const isActualEmpty = isEmpty(task["col10"]);
      if (!isActualEmpty) return false;

      // Ensure it's not already done or leave
      const isLeave = isLeaveStatus(task["col16"]);
      if (isLeave) return false;

      return true;
    });

    if (todaysTasks.length === 0) {
      alert("No pending tasks found for today in the current view to mark as Leave.");
      return;
    }

    const confirmLeave = window.confirm(`Are you sure you want to mark ${todaysTasks.length} visible pending task(s) for TODAY as Leave?`);
    if (!confirmLeave) return;

    setIsSubmitting(true);
    try {
      // Process updates SEQUENTIALLY to avoid Google Apps Script rate limits/lock contention
      // This solves the CORS/Network error issue when updating multiple rows
      for (const item of todaysTasks) {
        const formData = new FormData();
        formData.append("sheetName", CONFIG.SHEET_NAME);
        formData.append("action", "update");
        formData.append("rowIndex", item._rowIndex);

        const rowData = Array(17).fill("");
        // Update Column K (Index 10) with today's date and Column Q (Index 16) with "Leave"
        rowData[10] = todayStr; // Index 10 is Column K (Actual Date)
        rowData[16] = "Leave"; // Index 16 is Column Q (Leave Status)

        formData.append("rowData", JSON.stringify(rowData));

        await fetch(CONFIG.APPS_SCRIPT_URL, {
          method: "POST",
          body: formData,
        }).then(res => res.json()); // Wait for each request to complete
      }

      // Batch update local state
      setAccountData((prev) => prev.map(item => {
        if (todaysTasks.find(t => t._id === item._id)) {
          // Update Col 16 (Leave) AND Col 10 (Actual Date)
          return { ...item, col10: todayStr, col16: "Leave" }
        }
        return item;
      }));

      setSelectedItems(new Set());
      setSuccessMessage(`Successfully marked ${todaysTasks.length} task(s) as Leave!`);

    } catch (error) {
      console.error("Leave update error:", error);
      alert("Error occurred while marking as Leave. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <h1 className="text-2xl font-bold tracking-tight text-purple-700">
            {CONFIG.PAGE_CONFIG.title}
          </h1>

          {/* Search Input */}
          <div className="relative w-full sm:w-auto grow max-w-md mx-auto sm:mx-0">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-purple-400" />
            </div>
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-11 pr-4 py-2.5 border border-purple-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 w-full text-base bg-purple-50/30 transition-all hover:bg-white shadow-sm"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row sm:flex-wrap items-center justify-center gap-3 w-full sm:w-auto">
            {/* Filters Button */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center justify-center py-2 px-4 border rounded-lg transition-all duration-200 shadow-sm text-sm font-medium w-full sm:min-w-[100px] sm:w-auto ${showFilters
                  ? "bg-purple-100 border-purple-300 text-purple-700"
                  : "bg-white text-purple-700 border-purple-200 hover:bg-purple-50 hover:border-purple-300"
                }`}
            >
              <Filter className="h-4 w-4 mr-2" />
              Filters
            </button>



            {/* Task Actions (Tasks View) */}
            {/* Submit Button */}
            <button
              onClick={handleSubmit}
              disabled={selectedItemsCount === 0 || isSubmitting}
              className="flex items-center justify-center py-2 px-6 gradient-bg text-white rounded-lg hover:shadow-lg transition-all duration-200 shadow-md text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transform active:scale-95 w-full sm:min-w-[140px] sm:w-auto"
            >
              {isSubmitting ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  ...
                </span>
              ) : (
                `Submit (${selectedItemsCount})`
              )}
            </button>
          </div>

          {/* Admin Mark Done Button - Show in both mobile and desktop when conditions are met */}
          {/* {showHistory &&
            userRole === "admin" &&
            selectedHistoryItems.length > 0 && (
              <div className="sm:hidden w-full mt-2">
                <button
                  onClick={handleMarkMultipleDone}
                  disabled={markingAsDone}
                  className="w-full gradient-bg py-3 px-4 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                >
                  {markingAsDone
                    ? "Processing..."
                    : `Mark ${selectedHistoryItems.length} Items as Admin Done`}
                </button>
              </div>
            )} */}
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

        <div className="rounded-lg border border-purple-200 shadow-md bg-white overflow-hidden">
          <div className="bg-linear-to-r from-purple-50 to-pink-50 border-b border-purple-100 p-4">
            <h2 className="text-purple-700 font-medium">
              All {CONFIG.SHEET_NAME} Tasks
            </h2>
            <p className="text-purple-600 text-sm">
              {CONFIG.PAGE_CONFIG.description}
            </p>
          </div>

          {/* Filter Section */}
          {showFilters && <FilterSection />}

          {loading ? (
            <div className="text-center py-10">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500 mb-4"></div>
              <p className="text-purple-600">Loading task data...</p>
            </div>
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
              {/* Desktop Table View */}
              <div className=" h-[calc(100vh-250px)] overflow-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50 sticky top-0 z-40">
                    <tr>
                      <th className="px-8 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12 sticky left-0 z-50 bg-gray-50">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                          checked={
                            // Only consider enabled items for select all
                            filteredAccountData.filter((item) => {
                              const taskStatus = getTaskStatus(
                                item["col10"],
                                item["col15"],
                                item["col6"]
                              );
                              return (
                                taskStatus !== "Admin Done" &&
                                taskStatus !== "Done" &&
                                taskStatus !== "Disabled"
                              );
                            }).length > 0 &&
                            selectedItems.size ===
                            filteredAccountData.filter((item) => {
                              const taskStatus = getTaskStatus(
                                item["col10"],
                                item["col15"],
                                item["col6"]
                              );
                              return (
                                taskStatus !== "Admin Done" &&
                                taskStatus !== "Done" &&
                                taskStatus !== "Disabled"
                              );
                            }).length
                          }
                          onChange={handleSelectAllItems}
                        />
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20 sticky left-12 z-50 bg-gray-50">
                        Task ID
                      </th>



                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[100px]">
                        Name
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[100px]">
                        Status
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[150px]">
                        Remarks
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[200px]">
                        Task Description
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-yellow-50 min-w-[140px]">
                        Task Start Date & Time
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[80px]">
                        Freq
                      </th>


                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px]">
                        Upload Image
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {displayedAccountData.map((account) => (
                      <MemoizedTaskRow
                        key={account._id}
                        account={account}
                        isSelected={selectedItems.has(account._id)}
                        additionalData={additionalData[account._id]}
                        remarksData={remarksData[account._id]}
                        onCheckboxClick={handleCheckboxClick}
                        onAdditionalDataChange={handleAdditionalDataChange}
                        onRemarksChange={handleRemarksChange}
                        onImageUpload={handleImageUpload}
                        dateCategory={getDateCategory(account["col6"])}
                      />
                    ))}

                    {/* Load More Button */}
                    {displayLimit < filteredAccountData.length && (
                      <tr>
                        <td colSpan={14} className="px-6 py-4 text-center">
                          <button
                            onClick={handleLoadMore}
                            disabled={isLoadingMore}
                            className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {isLoadingMore ? (
                              <div className="flex items-center justify-center">
                                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                                Loading...
                              </div>
                            ) : (
                              `Load More (${filteredAccountData.length - displayLimit
                              } remaining)`
                            )}
                          </button>
                        </td>
                      </tr>
                    )}

                    {/* Empty state */}
                    {filteredAccountData.length === 0 && (
                      <tr>
                        <td
                          colSpan={14}
                          className="px-6 py-4 text-center text-gray-500"
                        >
                          {searchTerm ||
                            selectedMembers.length > 0 ||
                            startDate ||
                            endDate ||
                            selectedStatus
                            ? "No tasks matching your filters"
                            : "No tasks found for today, tomorrow, or past due dates"}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

            </>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}

export default AccountDataPage