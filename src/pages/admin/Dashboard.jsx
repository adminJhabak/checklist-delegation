"use client"

import { useState, useEffect, useRef } from "react"
import { BarChart3, CheckCircle2, Clock, ListTodo, Users, AlertTriangle, Filter, User, Edit3, Upload, X, ChevronDown, Check } from 'lucide-react'
import AdminLayout from "../../components/layout/AdminLayout.jsx"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from "recharts"


// Custom Styled Dropdown Component
const CustomDropdown = ({ options, value, onChange, placeholder, icon: Icon, className }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOption = options.find(opt => opt.value === value);

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between bg-white text-gray-700 font-semibold py-3 px-5 rounded-2xl shadow-sm hover:shadow-md border border-gray-200 transition-all focus:outline-none focus:ring-2 focus:ring-pink-500/20"
      >
        <span className="flex items-center gap-2">
          {Icon && <Icon className="h-4 w-4 text-pink-500" />}
          <span>{selectedOption ? selectedOption.label : placeholder}</span>
        </span>
        <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-2 w-full bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden animate-in fade-in zoom-in-95 duration-100 origin-top">
          <div className="max-h-60 overflow-y-auto py-1 custom-scrollbar">
            {options.map((option) => (
              <div
                key={option.value}
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={`px-4 py-3 text-sm cursor-pointer transition-colors flex items-center justify-between
                  ${value === option.value ? 'bg-pink-50 text-pink-700 font-medium' : 'text-gray-700 hover:bg-gray-50'}`}
              >
                <span>{option.label}</span>
                {value === option.value && <Check className="h-4 w-4 text-pink-500" />}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default function AdminDashboard() {
  const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwxe45-zdY7HMvMOmYg3n05GTyn7uhscbojSJB5nQDy2nPKA5Rn9pw_EOUbGG6BSYagFA/exec";
  const [dashboardType, setDashboardType] = useState("checklist")
  const [taskView, setTaskView] = useState("recent")
  const [filterStatus, setFilterStatus] = useState("all")
  const [filterStaff, setFilterStaff] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState("overview")
  const [userProfileImage, setUserProfileImage] = useState(null)
  const [userEmail, setUserEmail] = useState("")
  const [showImageUploadModal, setShowImageUploadModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [showLinkInputModal, setShowLinkInputModal] = useState(false);

  // State for department data
  const [departmentData, setDepartmentData] = useState({
    allTasks: [],
    staffMembers: [],
    totalTasks: 0,
    completedTasks: 0,
    pendingTasks: 0,
    overdueTasks: 0,
    completionRate: 0,
    barChartData: [],
    pieChartData: [],
    // Add new counters for delegation mode
    completedRatingOne: 0,
    completedRatingTwo: 0,
    completedRatingThreePlus: 0
  })

  // States for dashboard task management
  const [selectedDashboardTasks, setSelectedDashboardTasks] = useState(new Set());
  const [dashboardTaskDetails, setDashboardTaskDetails] = useState({});
  const [isSubmittingTasks, setIsSubmittingTasks] = useState(false);
  const [taskNotification, setTaskNotification] = useState({ show: false, message: "", type: "" });
  const [showTotalTasksModal, setShowTotalTasksModal] = useState(false);
  const [totalTasksSearch, setTotalTasksSearch] = useState("");
  const [showCardModal, setShowCardModal] = useState({ type: null, search: "" });

  // Store the current date for overdue calculation
  const [currentDate, setCurrentDate] = useState(new Date())

  // New state for date range filtering
  const [dateRange, setDateRange] = useState({
    startDate: "",
    endDate: "",
    filtered: false
  });

  // State to store filtered statistics
  const [filteredDateStats, setFilteredDateStats] = useState({
    totalTasks: 0,
    completedTasks: 0,
    pendingTasks: 0,
    overdueTasks: 0,
    completionRate: 0
  });

  const showTaskNotification = (message, type = "success") => {
    setTaskNotification({ show: true, message, type });
    setTimeout(() => setTaskNotification({ show: false, message: "", type: "" }), 3000);
  };

  const handleTaskSelection = (taskId) => {
    setSelectedDashboardTasks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
      }
      return newSet;
    });
  };

  const handleSelectAllTasks = (allTaskIds) => {
    if (selectedDashboardTasks.size === allTaskIds.length && allTaskIds.length > 0) {
      setSelectedDashboardTasks(new Set());
    } else {
      setSelectedDashboardTasks(new Set(allTaskIds));
    }
  };

  const handleTaskDetailChange = (taskId, field, value) => {
    setDashboardTaskDetails(prev => ({
      ...prev,
      [taskId]: {
        ...prev[taskId],
        [field]: value
      }
    }));
  };

  const handleTaskImageUpload = async (taskId, event) => {
    const file = event.target.files[0];
    if (file) {
      try {
        const task = departmentData.allTasks.find(t => t.id === taskId);
        const taskIDForName = task ? task.id : 'unknown';

        handleTaskDetailChange(taskId, 'uploadingImage', true);

        const base64DataWithPrefix = await convertToBase64(file);

        const formData = new FormData();
        formData.append("action", "uploadFile");
        formData.append("base64Data", base64DataWithPrefix);
        formData.append("fileName", `task_${taskIDForName}_${Date.now()}.${file.name.split(".").pop()}`);
        formData.append("mimeType", file.type);
        formData.append("folderId", "1txwq9Rhrz5G7348qPtpNX0IGPdGlw6J7");

        const response = await fetch(APPS_SCRIPT_URL, {
          method: "POST",
          body: formData,
        });

        const result = await response.json();
        if (result.success) {
          handleTaskDetailChange(taskId, 'image', result.fileUrl);
          handleTaskDetailChange(taskId, 'fileName', file.name);
          showTaskNotification("Image uploaded successfully");
        } else {
          throw new Error(result.error || "Upload failed");
        }
      } catch (error) {
        console.error("Error uploading image:", error);
        showTaskNotification("Failed to upload image", "error");
      } finally {
        handleTaskDetailChange(taskId, 'uploadingImage', false);
      }
    }
  };

  const handleSubmitProcessedTasks = async () => {
    const selectedIds = Array.from(selectedDashboardTasks);
    if (selectedIds.length === 0) {
      showTaskNotification("Please select tasks to submit", "error");
      return;
    }

    for (const id of selectedIds) {
      const detail = dashboardTaskDetails[id] || {};
      const task = departmentData.allTasks.find(t => t.id === id);

      if (!detail.status) {
        showTaskNotification(`Please select status for task: ${task.title}`, "error");
        return;
      }

      if (dashboardType === "checklist") {
        if (detail.status === "No" && (!detail.remarks || detail.remarks.trim() === "")) {
          showTaskNotification(`Please provide remarks for task: ${task.title}`, "error");
          return;
        }
      }
    }

    setIsSubmittingTasks(true);
    try {
      const today = new Date();
      const formattedDateForChecklist = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()} ${String(today.getHours()).padStart(2, '0')}:${String(today.getMinutes()).padStart(2, '0')}:${String(today.getSeconds()).padStart(2, '0')}`;
      const formattedDateForDelegation = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;

      if (dashboardType === "checklist") {
        const submissionData = selectedIds.map(id => {
          const detail = dashboardTaskDetails[id] || {};
          const task = departmentData.allTasks.find(t => t.id === id);
          return {
            taskId: task.id,
            rowIndex: task._rowIndex,
            actualDate: formattedDateForChecklist,
            status: detail.status,
            remarks: detail.remarks || "",
            imageUrl: detail.image || ""
          };
        });

        const formData = new FormData();
        formData.append("sheetName", "Checklist");
        formData.append("action", "updateTaskData");
        formData.append("rowData", JSON.stringify(submissionData));

        const response = await fetch(APPS_SCRIPT_URL, {
          method: "POST",
          body: formData,
        });

        const result = await response.json();
        if (result.success) {
          showTaskNotification(`Successfully submitted ${selectedIds.length} tasks`);
          fetchDepartmentData();
          setSelectedDashboardTasks(new Set());
          setDashboardTaskDetails({});
        } else {
          throw new Error(result.error);
        }
      } else {
        const usernameForSubmission = sessionStorage.getItem('username') || "";

        for (const id of selectedIds) {
          const detail = dashboardTaskDetails[id] || {};
          const task = departmentData.allTasks.find(t => t.id === id);

          const newRowData = [
            formattedDateForDelegation,
            task.id || "",
            detail.status || "Done",
            "",
            detail.remarks || "",
            detail.image || "",
            "",
            usernameForSubmission,
            task.title || "",
            "",
          ];

          const insertFormData = new FormData();
          insertFormData.append("sheetName", "DELEGATION DONE");
          insertFormData.append("action", "insert");
          insertFormData.append("rowData", JSON.stringify(newRowData));

          insertFormData.append("dateFormat", "DD/MM/YYYY");
          insertFormData.append("timestampColumn", "0");

          await fetch(APPS_SCRIPT_URL, {
            method: "POST",
            body: insertFormData,
          });
        }

        showTaskNotification(`Successfully submitted ${selectedIds.length} delegation tasks`);
        fetchDepartmentData();
        setSelectedDashboardTasks(new Set());
        setDashboardTaskDetails({});
      }
    } catch (error) {
      console.error("Submission error:", error);
      showTaskNotification("Failed to submit tasks", "error");
    } finally {
      setIsSubmittingTasks(false);
    }
  };

  const getUserRole = () => {
    return sessionStorage.getItem('role') || 'user'; // Default to 'user' if not set
  };

  const isAdminUser = () => {
    return getUserRole() === 'admin';
  };

  const isRegularUser = () => {
    return getUserRole() === 'user';
  };

  const fetchUserProfileFromSheets = async (username) => {
    try {
      // Fetch from master sheet for email
      // Fetch from master sheet for email
      const masterResponse = await fetch(`${APPS_SCRIPT_URL}?action=fetch&sheet=master`);

      if (!masterResponse.ok) {
        throw new Error(`Failed to fetch master sheet data: ${masterResponse.status}`);
      }

      const masterData = await masterResponse.json();

      // Find user in master sheet (Column C = Username, Column F = Email)
      const userRow = masterData.table.rows.find((row, index) => {
        if (index === 0) return false; // Skip header row
        const rowUsername = getCellValue(row, 2); // Column C (index 2) - Username
        return rowUsername && rowUsername.toLowerCase() === username.toLowerCase();
      });

      if (userRow) {
        const email = getCellValue(userRow, 5); // Column F (index 5) - Email
        if (email) {
          setUserEmail(email);
        }

        // Try to get profile image from master sheet Column H (index 7) first
        const masterImageUrl = getCellValue(userRow, 7); // Column H (index 7) - Image URL in master sheet

        if (masterImageUrl) {
          const displayableUrl = getDisplayableImageUrl(masterImageUrl);
          setUserProfileImage(displayableUrl);
          return; // Exit early since we found image in master sheet
        }
      }

      // If no image found in master sheet, try WhatsApp sheet
      const whatsappResponse = await fetch(`${APPS_SCRIPT_URL}?action=fetch&sheet=Whatsapp`);

      if (!whatsappResponse.ok) {
        throw new Error(`Failed to fetch Whatsapp sheet data: ${whatsappResponse.status}`);
      }

      const whatsappData = await whatsappResponse.json();

      // Find the row with matching username in Column C (index 2)
      const whatsappUserRow = whatsappData.table.rows.find((row, index) => {
        if (index === 0) return false; // Skip header row
        const rowUsername = getCellValue(row, 2); // Column C (index 2) - Username
        return rowUsername && rowUsername.toLowerCase() === username.toLowerCase();
      });

      if (whatsappUserRow) {
        const imageUrl = getCellValue(whatsappUserRow, 7); // Column H (index 7) - Image URL
        console.log("Profile Image URL from WhatsApp Sheet Column H:", imageUrl);

        if (imageUrl) {
          const displayableUrl = getDisplayableImageUrl(imageUrl);
          console.log("Converted Thumbnail URL from WhatsApp Sheet:", displayableUrl);
          setUserProfileImage(displayableUrl);
        }
      }
    } catch (error) {
      console.error("Error fetching from sheets:", error);
    }
  };

  const getDisplayableImageUrl = (url) => {
    if (!url) return null;

    try {
      const ucExportMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
      if (ucExportMatch && ucExportMatch[1]) {
        return `https://drive.google.com/thumbnail?id=${ucExportMatch[1]}&sz=w150`;
      }

      const directMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
      if (directMatch && directMatch[1]) {
        return `https://drive.google.com/thumbnail?id=${directMatch[1]}&sz=w150`;
      }

      const openMatch = url.match(/open\?id=([a-zA-Z0-9_-]+)/);
      if (openMatch && openMatch[1]) {
        return `https://drive.google.com/thumbnail?id=${openMatch[1]}&sz=w150`;
      }

      if (url.includes("thumbnail?id=")) {
        return url;
      }

      const anyIdMatch = url.match(/([a-zA-Z0-9_-]{25,})/);
      if (anyIdMatch && anyIdMatch[1]) {
        return `https://drive.google.com/thumbnail?id=${anyIdMatch[1]}&sz=w150`;
      }

      const cacheBuster = Date.now();
      return url.includes("?") ? `${url}&cb=${cacheBuster}` : `${url}?cb=${cacheBuster}`;
    } catch (e) {
      console.error("Error processing image URL:", url, e);
      return url; // Return original URL as fallback
    }
  };

  useEffect(() => {
    const username = sessionStorage.getItem('username');
    if (username) {
      fetchUserProfileFromSheets(username);
    }
  }, []);

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        alert('File size must be less than 10MB');
        return;
      }
      setSelectedFile(file);
    }
  };

  const convertToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64String = reader.result.split(",")[1];
        resolve(base64String);
      }
      reader.onerror = error => reject(error);
    });
  };

  const uploadImageAndUpdateWhatsApp = async () => {
    if (!selectedFile) {
      alert('Please select an image first');
      return;
    }

    try {
      setUploadingImage(true);
      const username = sessionStorage.getItem('username');

      if (!username) {
        throw new Error('Username not found');
      }

      // Convert file to base64
      const base64Data = await convertToBase64(selectedFile);

      // Upload to Google Drive and update sheet in one call
      const uploadResponse = await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          action: 'uploadProfilePhoto',
          base64Data: base64Data,
          fileName: `profile_${username}_${Date.now()}.${selectedFile.name.split('.').pop()}`,
          mimeType: selectedFile.type,
          folderId: '1txwq9Rhrz5G7348qPtpNX0IGPdGlw6J7', // Your specified folder ID
          username: username
        })
      });

      const uploadResult = await uploadResponse.json();

      if (!uploadResult.success) {
        throw new Error(uploadResult.error || 'Upload failed');
      }

      // Update local state with the new image
      const displayableUrl = getDisplayableImageUrl(uploadResult.fileUrl);
      setUserProfileImage(displayableUrl);

      // Close modal and reset
      setShowImageUploadModal(false);
      setSelectedFile(null);

      alert('Profile image uploaded and updated successfully!');

    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Failed to upload image. Please try again.');
    } finally {
      setUploadingImage(false);
    }
  };

  const formatLocalDate = (isoDate) => {
    if (!isoDate) return "";
    const date = new Date(isoDate);
    return formatDateToDDMMYYYY(date);
  };

  const filterTasksByDateRange = () => {
    if (!dateRange.startDate || !dateRange.endDate) {
      alert("Please select both start and end dates");
      return;
    }

    const startDate = new Date(dateRange.startDate);
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date(dateRange.endDate);
    endDate.setHours(23, 59, 59, 999);

    if (startDate > endDate) {
      alert("Start date must be before end date");
      return;
    }

    // Filter tasks within the date range
    const filteredTasks = departmentData.allTasks.filter(task => {
      const taskStartDate = parseDateFromDDMMYYYY(task.taskStartDate);
      if (!taskStartDate) return false;

      return taskStartDate >= startDate && taskStartDate <= endDate;
    });

    // Count statistics
    let totalTasks = filteredTasks.length;
    let completedTasks = 0;
    let pendingTasks = 0;
    let overdueTasks = 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    filteredTasks.forEach(task => {
      if (task.status === 'completed') {
        completedTasks++;
      } else {
        // Task is not completed
        pendingTasks++; // All incomplete tasks count as pending

        if (task.status === 'overdue') {
          overdueTasks++; // Only past dates (excluding today) count as overdue
        }
      }
    });

    // Calculate completion rate
    const completionRate = totalTasks > 0 ? ((completedTasks / totalTasks) * 100).toFixed(1) : 0;

    // Update filtered stats
    setFilteredDateStats({
      totalTasks,
      completedTasks,
      pendingTasks,
      overdueTasks,
      completionRate
    });

    // Set filtered flag to true
    setDateRange(prev => ({ ...prev, filtered: true }));
  };

  // Format date as DD/MM/YYYY
  const formatDateToDDMMYYYY = (date) => {
    const day = date.getDate().toString().padStart(2, '0')
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const year = date.getFullYear()
    return `${day}/${month}/${year}`
  }

  // Parse DD/MM/YYYY to Date object
  const parseDateFromDDMMYYYY = (dateStr) => {
    if (!dateStr || typeof dateStr !== 'string') return null
    const parts = dateStr.split('/')
    if (parts.length !== 3) return null
    return new Date(parts[2], parts[1] - 1, parts[0])
  }

  // Function to check if a date is in the past
  const isDateInPast = (dateStr) => {
    const date = parseDateFromDDMMYYYY(dateStr)
    if (!date) return false
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return date < today
  }

  // Function to check if a date is today
  const isDateToday = (dateStr) => {
    const date = parseDateFromDDMMYYYY(dateStr)
    if (!date) return false
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return date.getTime() === today.getTime()
  }

  // Function to check if a date is tomorrow
  const isDateTomorrow = (dateStr) => {
    const date = parseDateFromDDMMYYYY(dateStr)
    if (!date) return false
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(0, 0, 0, 0)
    return date.getTime() === tomorrow.getTime()
  }

  // Function to check if a date is in the future (from tomorrow onwards)
  const isDateFuture = (dateStr) => {
    const date = parseDateFromDDMMYYYY(dateStr)
    if (!date) return false
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return date > today
  }

  // Safe access to cell value
  const getCellValue = (row, index) => {
    if (!row || !row.c || index >= row.c.length) return null;
    const cell = row.c[index];
    return cell && 'v' in cell ? cell.v : null;
  };

  // Parse Google Sheets Date format into a proper date string
  const parseGoogleSheetsDate = (dateStr) => {
    if (!dateStr) return ''

    // Debug log for date parsing
    //console.log(`Parsing date: "${dateStr}" (type: ${typeof dateStr})`);

    if (typeof dateStr === 'string' && dateStr.startsWith('Date(')) {
      // Handle Google Sheets Date(year,month,day) format
      const match = /Date\((\d+),(\d+),(\d+)\)/.exec(dateStr)
      if (match) {
        const year = parseInt(match[1], 10)
        const month = parseInt(match[2], 10) // 0-indexed in Google's format
        const day = parseInt(match[3], 10)

        // Format as DD/MM/YYYY
        const formatted = `${day.toString().padStart(2, '0')}/${(month + 1).toString().padStart(2, '0')}/${year}`;
        //console.log(`Converted Google Sheets date to: ${formatted}`);
        return formatted;
      }
    }

    // If it's already in DD/MM/YYYY format, return as is
    if (typeof dateStr === 'string' && dateStr.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) {
      // Normalize to DD/MM/YYYY format
      const parts = dateStr.split('/');
      const day = parts[0].padStart(2, '0');
      const month = parts[1].padStart(2, '0');
      const year = parts[2];
      const normalized = `${day}/${month}/${year}`;
      //console.log(`Normalized date to: ${normalized}`);
      return normalized;
    }

    // Handle Date objects
    if (dateStr instanceof Date && !isNaN(dateStr.getTime())) {
      const formatted = formatDateToDDMMYYYY(dateStr);
      //console.log(`Converted Date object to: ${formatted}`);
      return formatted;
    }

    // If we get here, try to parse as a date and format
    try {
      const date = new Date(dateStr)
      if (!isNaN(date.getTime())) {
        const formatted = formatDateToDDMMYYYY(date);
        //console.log(`Parsed generic date to: ${formatted}`);
        return formatted;
      }
    } catch (e) {
      console.error("Error parsing date:", e)
    }

    // Return original if parsing fails
    //console.log(`Failed to parse date, returning original: ${dateStr}`);
    return dateStr
  }

  // Modified fetch function to support both checklist and delegation
  const fetchDepartmentData = async () => {
    const sheetName = dashboardType === "delegation" ? "DELEGATION" : "Checklist";
    const userRole = getUserRole();
    const username = sessionStorage.getItem('username');

    try {

      const response = await fetch(`${APPS_SCRIPT_URL}?action=fetch&sheet=${sheetName}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch ${sheetName} sheet data: ${response.status}`);
      }

      const data = await response.json();

      // Initialize counters
      let totalTasks = 0;
      let completedTasks = 0;
      let pendingTasks = 0;
      let overdueTasks = 0;
      let completedRatingOne = 0;
      let completedRatingTwo = 0;
      let completedRatingThreePlus = 0;

      // Monthly data for bar chart
      const monthlyData = {
        Jan: { completed: 0, pending: 0 },
        Feb: { completed: 0, pending: 0 },
        Mar: { completed: 0, pending: 0 },
        Apr: { completed: 0, pending: 0 },
        May: { completed: 0, pending: 0 },
        Jun: { completed: 0, pending: 0 },
        Jul: { completed: 0, pending: 0 },
        Aug: { completed: 0, pending: 0 },
        Sep: { completed: 0, pending: 0 },
        Oct: { completed: 0, pending: 0 },
        Nov: { completed: 0, pending: 0 },
        Dec: { completed: 0, pending: 0 }
      };

      const statusData = { Completed: 0, Pending: 0, Overdue: 0 };
      const staffTrackingMap = new Map();

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);

      const processedRows = data.table.rows
        .map((row, rowIndex) => {
          if (rowIndex === 0) return null;

          const assignedTo = getCellValue(row, 4) || "Unassigned";
          const taskId = getCellValue(row, 1);
          const leaveVal = getCellValue(row, 16);
          const isLeave = leaveVal && String(leaveVal).trim().toLowerCase() === "leave";

          if (isLeave) {
            return null; // Skip leave tasks entirely from dashboard metrics
          }

          if (
            isRegularUser() &&
            assignedTo.toLowerCase() !== username.toLowerCase()
          ) {
            return null; // Skip this task entirely for regular users
          }

          // Debug: Log row processing for first few rows
          if (rowIndex <= 5) {
            //console.log(`Processing row ${rowIndex + 1} (sheet row ${rowIndex + 1}):`, row);
          }
          const isUserMatch =
            userRole === "admin" ||
            assignedTo.toLowerCase() === username.toLowerCase();

          // Debug: Log user matching for first few rows
          if (rowIndex <= 5) {
            //console.log(`Row ${rowIndex + 1}: assignedTo="${assignedTo}", username="${username}", userRole="${userRole}", isMatch=${isUserMatch}`);
          }

          // If not a match and not admin, skip this row
          if (!isUserMatch) {
            if (rowIndex <= 5)
              //console.log(`Row ${rowIndex + 1}: Skipped due to user mismatch`);
              return null;
          }

          // Debug: Log task ID for first few rows
          if (rowIndex <= 5) {
            //console.log(`Row ${rowIndex + 1}: taskId="${taskId}" (type: ${typeof taskId})`);
          }

          // More lenient validation - allow any non-empty value as task ID
          if (
            taskId === null ||
            taskId === undefined ||
            taskId === "" ||
            (typeof taskId === "string" && taskId.trim() === "")
          ) {
            if (rowIndex <= 5)
              //console.log(`Row ${rowIndex + 1}: Skipped due to empty/null task ID`);
              return null;
          }

          // Convert task ID to string for consistency
          const taskIdStr = String(taskId).trim();

          // Get task start date from Column G (index 6) - "Task Start Date"
          let taskStartDateValue = getCellValue(row, 6);
          const taskStartDate = taskStartDateValue
            ? parseGoogleSheetsDate(String(taskStartDateValue))
            : "";

          // Debug: Log task start date for first few rows
          if (rowIndex <= 5) {
            //console.log(`Row ${rowIndex + 1}: taskStartDateValue="${taskStartDateValue}", parsed="${taskStartDate}"`);
          }

          // UPDATED: Different date filtering logic for delegation vs checklist
          if (dashboardType === "delegation") {
            // For DELEGATION mode: Process ALL tasks with valid task IDs, no date filtering
            if (
              !taskId ||
              taskId === null ||
              taskId === undefined ||
              taskId === "" ||
              (typeof taskId === "string" && taskId.trim() === "")
            ) {
              if (rowIndex <= 5)
                //console.log(`Row ${rowIndex + 1}: Skipped due to invalid task ID in delegation mode`);
                return null;
            }
          } else {
            // For CHECKLIST mode: Keep existing date filtering logic
            const taskStartDateObj = parseDateFromDDMMYYYY(taskStartDate);

            if (rowIndex <= 5) {
              //console.log(`Row ${rowIndex + 1}: taskStartDateObj=${taskStartDateObj}, today=${today}, tomorrow=${tomorrow}, isValid=${!!taskStartDateObj}`);
            }

            // Process tasks that have a valid start date and are due up to tomorrow (include tomorrow's tasks)
            if (!taskStartDateObj || taskStartDateObj > tomorrow) {
              if (rowIndex <= 5)
                //console.log(`Row ${rowIndex + 1}: Skipped due to invalid/far future date (beyond tomorrow)`);
                return null; // Skip tasks beyond tomorrow
            }
          }

          // Get completion data based on dashboard type
          let completionDateValue, completionDate;
          if (dashboardType === "delegation") {
            // For delegation: Column L (index 11) - "Actual"
            completionDateValue = getCellValue(row, 11);
          } else {
            // For checklist: Column K (index 10) - "Actual"
            completionDateValue = getCellValue(row, 10);
          }

          completionDate = completionDateValue
            ? parseGoogleSheetsDate(String(completionDateValue))
            : "";

          // Debug: Log completion date for first few rows
          if (rowIndex <= 5) {
            //console.log(`Row ${rowIndex + 1}: completionDateValue="${completionDateValue}", parsed="${completionDate}"`);
          }

          // NEW: Get status from Column U (index 20) and rating from Column R (index 17) for delegation mode
          const statusColumnU = dashboardType === "delegation" ? getCellValue(row, 20) : null;
          const ratingColumnR = dashboardType === "delegation" ? getCellValue(row, 17) : null;

          // Track staff details
          if (!staffTrackingMap.has(assignedTo)) {
            staffTrackingMap.set(assignedTo, {
              name: assignedTo,
              totalTasks: 0,
              completedTasks: 0,
              pendingTasks: 0,
              progress: 0,
            });
          }

          // Get additional task details
          const taskDescription = getCellValue(row, 5) || "Untitled Task"; // Column F - "Task Description"
          const frequency = getCellValue(row, 7) || "one-time"; // Column H - "Freq"

          // UPDATED: Determine task status for display purposes - restored overdue logic for delegation
          let status = "pending";

          if (completionDate && completionDate !== "") {
            status = "completed";
          } else if (isDateInPast(taskStartDate) && !isDateToday(taskStartDate)) {
            // For both modes: past dates (excluding today) = overdue
            status = "overdue";
          } else {
            // For both modes: today or future dates = pending
            status = "pending";
          }

          // Debug: Log status determination for first few rows
          if (rowIndex <= 5) {
            //console.log(`Row ${rowIndex + 1}: status="${status}", completionDate="${completionDate}", dashboardType="${dashboardType}"`);
          }

          // Create the task object
          const taskObj = {
            id: taskIdStr,
            title: taskDescription,
            assignedTo,
            taskStartDate,
            dueDate: taskStartDate, // Keep for compatibility
            status,
            frequency,
            _rowIndex: rowIndex + 1, // Store the sheet row index
            _statusColumnU: statusColumnU || null, // Store delegation status from Column U
            _ratingColumnR: ratingColumnR ? Number(ratingColumnR) : null, // Store delegation rating from Column R
          };

          // Debug: Log task object for first few rows
          if (rowIndex <= 5) {
            //console.log(`Row ${rowIndex + 1}: Created task object:`, taskObj);
          }

          // Update staff member totals
          const staffData = staffTrackingMap.get(assignedTo);
          staffData.totalTasks++;

          // UPDATED: Count for dashboard cards - different logic for delegation vs checklist
          if (dashboardType === "delegation") {
            // For DELEGATION mode: Count ALL valid tasks, no date restrictions
            totalTasks++;

            // NEW LOGIC: Count based on Column U status and Column R rating
            if (statusColumnU === "Done") {
              completedTasks++;
              staffData.completedTasks++;
              statusData.Completed++;

              // Count by rating from Column R
              if (ratingColumnR === 1) {
                completedRatingOne++;
              } else if (ratingColumnR === 2) {
                completedRatingTwo++;
              } else if (ratingColumnR >= 3) {
                completedRatingThreePlus++;
              }

              // Update monthly data for completed tasks
              const completedMonth = parseDateFromDDMMYYYY(completionDate);
              if (completedMonth) {
                const monthName = completedMonth.toLocaleString("default", {
                  month: "short",
                });
                if (monthlyData[monthName]) {
                  monthlyData[monthName].completed++;
                }
              }
            } else {
              // Task is not completed - apply counting logic for both modes
              staffData.pendingTasks++;

              if (isDateInPast(taskStartDate) && !isDateToday(taskStartDate)) {
                // Past dates (excluding today) = overdue
                overdueTasks++;
                statusData.Overdue++;
              }

              // All incomplete tasks (including overdue + today) = pending
              pendingTasks++;
              statusData.Pending++;

              // Update monthly data for pending tasks
              const monthName = (
                dashboardType === "delegation" ? new Date() : today
              ).toLocaleString("default", { month: "short" });
              if (monthlyData[monthName]) {
                monthlyData[monthName].pending++;
              }
            }
          } else {
            // For CHECKLIST mode: Keep existing logic with date restrictions
            const taskStartDateObj = parseDateFromDDMMYYYY(taskStartDate);
            const shouldCountInStats = taskStartDateObj <= today;

            if (shouldCountInStats) {
              totalTasks++;

              if (status === "completed") {
                completedTasks++;
                staffData.completedTasks++;
                statusData.Completed++;

                // Update monthly data for completed tasks
                const completedMonth = parseDateFromDDMMYYYY(completionDate);
                if (completedMonth) {
                  const monthName = completedMonth.toLocaleString("default", {
                    month: "short",
                  });
                  if (monthlyData[monthName]) {
                    monthlyData[monthName].completed++;
                  }
                }
              } else {
                staffData.pendingTasks++;

                if (isDateInPast(taskStartDate) && !isDateToday(taskStartDate)) {
                  // Past dates (excluding today) = overdue
                  overdueTasks++;
                  statusData.Overdue++;
                }

                // All incomplete tasks (including overdue + today) = pending
                pendingTasks++;
                statusData.Pending++;

                // Update monthly data for pending tasks
                const monthName = today.toLocaleString("default", {
                  month: "short",
                });
                if (monthlyData[monthName]) {
                  monthlyData[monthName].pending++;
                }
              }
            }
          }
          const hasAccess = isAdminUser() || assignedTo.toLowerCase() === username.toLowerCase();

          return taskObj;
        })
        .filter((task) => task !== null);

      // Debug: Log processing summary
      //console.log(`Processing summary for ${sheetName}:`);
      //console.log(`  Dashboard type: ${dashboardType}`);
      //console.log(`  Total rows in sheet: ${data.table.rows.length}`);
      //console.log(`  Rows after filtering: ${processedRows.length}`);
      //console.log(`  Total tasks counted: ${totalTasks}`);
      //console.log(`  Completed tasks: ${completedTasks}`);
      //console.log(`  Pending tasks: ${pendingTasks}`);
      //console.log(`  Overdue tasks: ${overdueTasks}`);
      //console.log(`  Completed Rating 1: ${completedRatingOne}`);
      //console.log(`  Completed Rating 2: ${completedRatingTwo}`);
      //console.log(`  Completed Rating 3+: ${completedRatingThreePlus}`);


      // Calculate completion rate
      const completionRate = totalTasks > 0 ? ((completedTasks / totalTasks) * 100).toFixed(1) : 0;

      // Convert monthly data to chart format
      const barChartData = Object.entries(monthlyData).map(([name, data]) => ({
        name,
        completed: data.completed,
        pending: data.pending
      }));

      // Convert status data to pie chart format
      const pieChartData = [
        { name: "Completed", value: statusData.Completed, color: "#22c55e" },
        { name: "Pending", value: statusData.Pending, color: "#facc15" },
        { name: "Overdue", value: statusData.Overdue, color: "#ef4444" }
      ];

      const filteredStaffMembers = isAdminUser()
        ? Array.from(staffTrackingMap.values()) // Admin sees all staff
        : Array.from(staffTrackingMap.values()).filter(staff =>
          staff.name.toLowerCase() === username.toLowerCase()
        ); // Regular users see only themselves

      // Update the staff members processing:
      const staffMembers = filteredStaffMembers.map((staff) => {
        const progress =
          staff.totalTasks > 0
            ? Math.round((staff.completedTasks / staff.totalTasks) * 100)
            : 0;

        return {
          id: staff.name.replace(/\s+/g, "-").toLowerCase(),
          name: staff.name,
          email: `${staff.name.toLowerCase().replace(/\s+/g, ".")}@example.com`,
          totalTasks: staff.totalTasks,
          completedTasks: staff.completedTasks,
          pendingTasks: staff.pendingTasks,
          progress,
        };
      });

      // Update department data state
      setDepartmentData({
        allTasks: processedRows,
        staffMembers,
        totalTasks,
        completedTasks,
        pendingTasks,
        overdueTasks,
        completionRate,
        barChartData,
        pieChartData,
        completedRatingOne,
        completedRatingTwo,
        completedRatingThreePlus
      });

    } catch (error) {
      console.error(`Error fetching ${sheetName} sheet data:`, error);
    }
  };

  useEffect(() => {
    fetchDepartmentData();
  }, [dashboardType]);

  // When dashboard loads, set current date
  useEffect(() => {
    setCurrentDate(new Date());
  }, []);

  // Filter tasks based on the filter criteria
  const filteredTasks = departmentData.allTasks.filter((task) => {
    // Filter by status
    if (filterStatus !== "all" && task.status !== filterStatus) return false;

    // Filter by staff
    if (filterStaff !== "all" && task.assignedTo !== filterStaff) return false;

    // Filter by search query
    if (searchQuery && searchQuery.trim() !== "") {
      const query = searchQuery.toLowerCase().trim();

      if (typeof task.title === 'string' && task.title.toLowerCase().includes(query)) {
        return true;
      }

      if ((typeof task.id === 'string' && task.id.toLowerCase().includes(query)) ||
        (typeof task.id === 'number' && task.id.toString().includes(query))) {
        return true;
      }

      if (typeof task.assignedTo === 'string' && task.assignedTo.toLowerCase().includes(query)) {
        return true;
      }

      return false;
    }

    return true;
  });

  // UPDATED: Get tasks by view with updated delegation logic
  const getTasksByView = (view) => {
    const viewFilteredTasks = filteredTasks.filter((task) => {
      // Skip completed tasks in all views
      if (task.status === "completed") return false;

      // Apply date-based filtering
      const taskStartDate = parseDateFromDDMMYYYY(task.taskStartDate);
      if (!taskStartDate) return false;

      switch (view) {
        case "recent":
          if (dashboardType === "delegation") {
            // For DELEGATION: Show only today's tasks (pending only)
            return isDateToday(task.taskStartDate);
          } else {
            // For CHECKLIST: Show tasks due today (pending only)
            return isDateToday(task.taskStartDate);
          }

        case "overdue":
          if (dashboardType === "delegation") {
            // For DELEGATION: Show all past date pending tasks (excluding today)
            return isDateInPast(task.taskStartDate) && !isDateToday(task.taskStartDate);
          } else {
            // For CHECKLIST: Show tasks with start dates in the past (excluding today)
            return isDateInPast(task.taskStartDate) && !isDateToday(task.taskStartDate);
          }
        default:
          return true;
      }
    });

    return viewFilteredTasks;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "completed":
        return "bg-green-500 hover:bg-green-600 text-white"
      case "pending":
        return "bg-amber-500 hover:bg-amber-600 text-white"
      case "overdue":
        return "bg-red-500 hover:bg-red-600 text-white"
      default:
        return "bg-gray-500 hover:bg-gray-600 text-white"
    }
  }

  const getFrequencyColor = (frequency) => {
    switch (frequency) {
      case "one-time":
        return "bg-gray-500 hover:bg-gray-600 text-white"
      case "daily":
        return "bg-blue-500 hover:bg-blue-600 text-white"
      case "weekly":
        return "bg-purple-500 hover:bg-purple-600 text-white"
      case "fortnightly":
        return "bg-indigo-500 hover:bg-indigo-600 text-white"
      case "monthly":
        return "bg-orange-500 hover:bg-orange-600 text-white"
      case "quarterly":
        return "bg-amber-500 hover:bg-amber-600 text-white"
      case "yearly":
        return "bg-emerald-500 hover:bg-emerald-600 text-white"
      default:
        return "bg-gray-500 hover:bg-gray-600 text-white"
    }
  }

  // Tasks Overview Chart Component
  const TasksOverviewChart = () => {
    return (
      <ResponsiveContainer width="100%" height={350}>
        <BarChart data={departmentData.barChartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="name" fontSize={12} stroke="#888888" tickLine={false} axisLine={false} />
          <YAxis fontSize={12} stroke="#888888" tickLine={false} axisLine={false} tickFormatter={(value) => `${value}`} />
          <Tooltip />
          <Legend />
          <Bar dataKey="completed" stackId="a" fill="#22c55e" radius={[4, 4, 0, 0]} />
          <Bar dataKey="pending" stackId="a" fill="#f87171" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    )
  }

  // Tasks Completion Chart Component
  const TasksCompletionChart = () => {
    return (
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie data={departmentData.pieChartData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={2} dataKey="value">
            {departmentData.pieChartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    )
  }

  // Staff Tasks Table Component
  const StaffTasksTable = () => {
    return (
      <div className="rounded-md border border-gray-200 overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Name
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Total Tasks
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Completed
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Pending
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Progress
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {departmentData.staffMembers.map((staff) => (
              <tr key={staff.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div>
                    <div className="text-sm font-medium text-gray-900">{staff.name}</div>
                    <div className="text-xs text-gray-500">{staff.email}</div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{staff.totalTasks}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{staff.completedTasks}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{staff.pendingTasks}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <div className="w-[100px] bg-gray-200 rounded-full h-2">
                      <div className="bg-purple-500 h-2 rounded-full" style={{ width: `${staff.progress}%` }}></div>
                    </div>
                    <span className="text-xs text-gray-500">{staff.progress}%</span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {staff.progress >= 80 ? (
                    <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                      Excellent
                    </span>
                  ) : staff.progress >= 60 ? (
                    <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                      Good
                    </span>
                  ) : (
                    <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                      Needs Improvement
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* MODIFIED: Updated header section to include profile image */}
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <h2 className="text-2xl font-bold tracking-tight" style={{
            background: 'linear-gradient(to right, #9333EA, #DB2777)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            color: 'transparent'
          }}>
            CHECKLIST & DELEGATION
          </h2>
          <div className="flex items-center gap-4">
            <div className="relative group">
              {userProfileImage ? (
                <div className="relative">
                  <img
                    src={userProfileImage}
                    alt="Profile"
                    className="w-15 h-15 rounded-full object-cover border-2 border-gray-50 cursor-pointer transition-all duration-200 group-hover:brightness-75 shadow-md"
                    style={{
                      width: "60px",
                      height: "60px",
                      backgroundColor: "#f3f4f6",
                      objectPosition: "center",
                    }}
                    onClick={() => setShowImageUploadModal(true)}
                    onError={(e) => {
                      const originalUrl = userProfileImage
                        .replace("thumbnail?", "uc?export=view&")
                        .replace("&sz=w150", "");
                      e.target.src = originalUrl;
                    }}
                  />
                  <div
                    className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-black bg-opacity-30 rounded-full cursor-pointer"
                    onClick={() => setShowImageUploadModal(true)}
                  >
                    <Edit3 className="h-5 w-5 text-white" />
                  </div>
                </div>
              ) : (
                <div className="relative group">
                  <div
                    className="w-15 h-15 rounded-full bg-purple-500 flex items-center justify-center border-2 border-purple-600 cursor-pointer transition-all duration-200 group-hover:brightness-75"
                    style={{ width: "60px", height: "60px" }}
                    onClick={() => setShowLinkInputModal(true)}
                  >
                    <User className="h-6 w-6 text-white" />
                  </div>
                  <div
                    className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-black bg-opacity-30 rounded-full cursor-pointer"
                    onClick={() => setShowLinkInputModal(true)}
                  >
                    <Edit3 className="h-5 w-5 text-white" />
                  </div>
                </div>
              )}
            </div>

            <div className="w-[180px]">
              <CustomDropdown
                value={dashboardType}
                onChange={setDashboardType}
                options={[
                  { value: "checklist", label: "Checklist" },
                  { value: "delegation", label: "Delegation" }
                ]}
                icon={ListTodo}
                className="w-full"
              />
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div
            className="rounded-lg border border-l-4 border-l-blue-500 shadow-md hover:shadow-lg transition-all bg-white cursor-pointer group"
            onClick={() => { setShowTotalTasksModal(true); setTotalTasksSearch(""); }}
          >
            <div className="flex flex-row items-center justify-between space-y-0 pb-2 bg-linear-to-r from-blue-50 to-blue-100 rounded-tr-lg p-4">
              <h3 className="text-sm font-medium text-blue-700">
                Total Tasks
              </h3>
              <ListTodo className="h-4 w-4 text-blue-500 group-hover:scale-125 transition-transform" />
            </div>
            <div className="p-4">
              <div className="text-3xl font-bold text-blue-700">
                {departmentData.totalTasks}
              </div>
              <p className="text-purple-600 text-sm">
                {dashboardType === "delegation"
                  ? `${isAdminUser()
                    ? "All tasks in delegation sheet"
                    : "Your tasks in delegation sheet"
                  }`
                  : `${isAdminUser()
                    ? "Total tasks in checklist (up to today)"
                    : "Your tasks in checklist (up to today)"
                  }`}
              </p>
              <p className="text-xs text-blue-400 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">Click to view all tasks →</p>
            </div>
          </div>

          <div
            className="rounded-lg border border-l-4 border-l-green-500 shadow-md hover:shadow-lg transition-all bg-white cursor-pointer group"
            onClick={() => setShowCardModal({ type: 'completed', search: '' })}
          >
            <div className="flex flex-row items-center justify-between space-y-0 pb-2 bg-linear-to-r from-green-50 to-green-100 rounded-tr-lg p-4">
              <h3 className="text-sm font-medium text-green-700">
                {dashboardType === "delegation"
                  ? "Completed Once"
                  : "Completed Tasks"}
              </h3>
              <CheckCircle2 className="h-4 w-4 text-green-500 group-hover:scale-125 transition-transform" />
            </div>
            <div className="p-4">
              <div className="text-3xl font-bold text-green-700">
                {dashboardType === "delegation"
                  ? departmentData.completedRatingOne
                  : departmentData.completedTasks}
              </div>
              <p className="text-xs text-green-600">
                {dashboardType === "delegation"
                  ? "Tasks completed once"
                  : "Total completed till date"}
              </p>
              <p className="text-xs text-green-400 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">Click to view details →</p>
            </div>
          </div>

          <div
            className="rounded-lg border border-l-4 border-l-amber-500 shadow-md hover:shadow-lg transition-all bg-white cursor-pointer group"
            onClick={() => setShowCardModal({ type: 'pending', search: '' })}
          >
            <div className="flex flex-row items-center justify-between space-y-0 pb-2 bg-linear-to-r from-yellow-50 to-yellow-100 rounded-tr-lg p-4">
              <h3 className="text-sm font-medium text-amber-700">
                {dashboardType === "delegation"
                  ? "Completed Twice"
                  : "Pending Tasks"}
              </h3>
              {dashboardType === "delegation" ? (
                <CheckCircle2 className="h-4 w-4 text-amber-500 group-hover:scale-125 transition-transform" />
              ) : (
                <Clock className="h-4 w-4 text-amber-500 group-hover:scale-125 transition-transform" />
              )}
            </div>
            <div className="p-4">
              <div className="text-3xl font-bold text-amber-700">
                {dashboardType === "delegation"
                  ? departmentData.completedRatingTwo
                  : departmentData.pendingTasks}
              </div>
              <p className="text-xs text-amber-600">
                {dashboardType === "delegation"
                  ? "Tasks completed twice"
                  : "Including today + overdue"}
              </p>
              <p className="text-xs text-amber-400 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">Click to view details →</p>
            </div>
          </div>

          <div
            className="rounded-lg border border-l-4 border-l-red-500 shadow-md hover:shadow-lg transition-all bg-white cursor-pointer group"
            onClick={() => setShowCardModal({ type: 'overdue', search: '' })}
          >
            <div className="flex flex-row items-center justify-between space-y-0 pb-2 bg-linear-to-r from-red-50 to-red-100 rounded-tr-lg p-4">
              <h3 className="text-sm font-medium text-red-700">
                {dashboardType === "delegation"
                  ? "Completed 3+ Times"
                  : "Overdue Tasks"}
              </h3>
              {dashboardType === "delegation" ? (
                <CheckCircle2 className="h-4 w-4 text-red-500 group-hover:scale-125 transition-transform" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-red-500 group-hover:scale-125 transition-transform" />
              )}
            </div>
            <div className="p-4">
              <div className="text-3xl font-bold text-red-700">
                {dashboardType === "delegation"
                  ? departmentData.completedRatingThreePlus
                  : departmentData.overdueTasks}
              </div>
              <p className="text-xs text-red-600">
                {dashboardType === "delegation"
                  ? "Tasks completed 3+ times"
                  : "Past due (excluding today)"}
              </p>
              <p className="text-xs text-red-400 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">Click to view details →</p>
            </div>
          </div>
        </div>

        {/* Task Navigation Tabs - Restored to 3 tabs for both modes */}
        <div className="w-full overflow-hidden rounded-lg border border-gray-200 bg-white">
          <div className="grid grid-cols-2">
            <button
              className={`py-3 text-center font-medium transition-colors ${taskView === "recent"
                ? "bg-purple-600 text-white"
                : "bg-purple-100 text-gray-600 hover:bg-purple-200"
                }`}
              onClick={() => setTaskView("recent")}
            >
              {dashboardType === "delegation" ? "Today Tasks" : "Recent Tasks"}
            </button>

            <button
              className={`py-3 text-center font-medium transition-colors ${taskView === "overdue"
                ? "bg-purple-600 text-white"
                : "bg-purple-100 text-gray-600 hover:bg-purple-200"
                }`}
              onClick={() => setTaskView("overdue")}
            >
              Overdue Tasks
            </button>
          </div>

          <div className="p-4">
            <div className="flex flex-col gap-4 md:flex-row mb-4">
              <div className="flex-1 space-y-2">
                <label
                  htmlFor="search"
                  className="flex items-center text-purple-700"
                >
                  <Filter className="h-4 w-4 mr-2" />
                  Search Tasks
                </label>
                <div className="relative">
                  <input
                    id="search"
                    placeholder="Search by task title or ID"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-full border border-gray-200 shadow-sm focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-500/20 transition-all duration-200"
                  />
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Filter className="h-5 w-5 text-gray-400" />
                  </div>
                </div>
              </div>
              <div className="space-y-2 md:w-[180px]">
                <label
                  htmlFor="staff-filter"
                  className="flex items-center text-purple-700"
                >
                  <Filter className="h-4 w-4 mr-2" />
                  Filter by Staff
                </label>
                <CustomDropdown
                  value={filterStaff}
                  onChange={setFilterStaff}
                  options={[
                    { value: "all", label: "All Staff" },
                    ...departmentData.staffMembers
                      .filter(
                        (staff) =>
                          isAdminUser() ||
                          staff.name.toLowerCase() ===
                          sessionStorage.getItem("username")?.toLowerCase()
                      )
                      .map((staff) => ({ value: staff.name, label: staff.name }))
                  ]}
                  placeholder="Filter by Staff"
                  className="w-full"
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={handleSubmitProcessedTasks}
                  disabled={selectedDashboardTasks.size === 0 || isSubmittingTasks}
                  className={`flex items-center justify-center px-6 py-3 rounded-full font-semibold shadow-lg transition-all transform active:scale-95 ${selectedDashboardTasks.size === 0 || isSubmittingTasks
                    ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                    : "bg-gradient-to-r from-pink-500 to-purple-600 text-white hover:from-pink-600 hover:to-purple-700 hover:shadow-pink-200"
                    }`}
                >
                  {isSubmittingTasks ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Check className="h-5 w-5 mr-2" />
                      Submit ({selectedDashboardTasks.size})
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {getTasksByView(taskView).length === 0 ? (
            <div className="text-center p-8 text-gray-500">
              <p>No tasks found matching your filters.</p>
            </div>
          ) : (
            <div
              className="overflow-x-auto"
              style={{ maxHeight: "400px", overflowY: "auto" }}
            >
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0 z-10">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-gray-300 text-pink-600 focus:ring-pink-500 cursor-pointer"
                        checked={selectedDashboardTasks.size === getTasksByView(taskView).length && getTasksByView(taskView).length > 0}
                        onChange={() => handleSelectAllTasks(getTasksByView(taskView).map(t => t.id))}
                      />
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Task ID
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Additional Info / Remarks
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Task Description
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Assigned To
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Task Start Date
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Upload
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Freq
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {getTasksByView(taskView).map((task) => (
                    <tr key={task.id} className={`hover:bg-gray-50 transition-colors ${selectedDashboardTasks.has(task.id) ? 'bg-pink-50/50' : ''}`}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-gray-300 text-pink-600 focus:ring-pink-500 cursor-pointer"
                          checked={selectedDashboardTasks.has(task.id)}
                          onChange={() => handleTaskSelection(task.id)}
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {task.id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <select
                          disabled={!selectedDashboardTasks.has(task.id)}
                          value={dashboardTaskDetails[task.id]?.status || ""}
                          onChange={(e) => handleTaskDetailChange(task.id, 'status', e.target.value)}
                          className="text-xs border border-gray-200 rounded-lg p-1.5 focus:border-pink-500 focus:ring-1 focus:ring-pink-500 outline-none disabled:bg-gray-50 disabled:text-gray-400"
                        >
                          <option value="">Select...</option>
                          {dashboardType === "checklist" ? (
                            <>
                              <option value="Yes">Yes</option>
                              <option value="No">No</option>
                            </>
                          ) : (
                            <>
                              <option value="Done">Done</option>
                              <option value="Pending">Pending</option>
                              <option value="Verify Pending">Verify Pending</option>
                            </>
                          )}
                        </select>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="text"
                          placeholder="Optional remarks"
                          disabled={!selectedDashboardTasks.has(task.id)}
                          value={dashboardTaskDetails[task.id]?.remarks || ""}
                          onChange={(e) => handleTaskDetailChange(task.id, 'remarks', e.target.value)}
                          className="text-xs border border-gray-200 rounded-lg p-1.5 w-full max-w-[150px] focus:border-pink-500 focus:ring-1 focus:ring-pink-500 outline-none disabled:bg-gray-50 disabled:text-gray-400"
                        />
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 max-w-[200px] truncate" title={task.title}>
                        {task.title}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {task.assignedTo}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {task.taskStartDate}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {dashboardTaskDetails[task.id]?.image ? (
                          <div className="flex items-center space-x-2">
                            <img src={dashboardTaskDetails[task.id].image} alt="Uploaded" className="h-8 w-8 rounded-md object-cover border border-purple-100" />
                            <button
                              onClick={() => handleTaskDetailChange(task.id, 'image', null)}
                              className="text-gray-400 hover:text-red-500"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ) : (
                          <label className={`cursor-pointer group flex items-center space-x-1 ${!selectedDashboardTasks.has(task.id) ? 'opacity-30 pointer-events-none' : ''}`}>
                            <div className={`p-1.5 rounded-lg bg-pink-50 text-pink-500 group-hover:bg-pink-100 transition-colors ${dashboardTaskDetails[task.id]?.uploadingImage ? 'animate-pulse' : ''}`}>
                              <Upload className="h-4 w-4" />
                            </div>
                            <input
                              type="file"
                              className="hidden"
                              accept="image/*"
                              onChange={(e) => handleTaskImageUpload(task.id, e)}
                              disabled={!selectedDashboardTasks.has(task.id)}
                            />
                          </label>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${getFrequencyColor(
                            task.frequency
                          )}`}
                        >
                          {task.frequency}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-1">
        <div className="rounded-lg border border-l-4 border-l-indigo-500 shadow-md hover:shadow-lg transition-all bg-white">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2 bg-gradient-to-r from-indigo-50 to-indigo-100 rounded-tr-lg p-4">
            <h3 className="text-sm font-medium text-indigo-700">
              Task Completion Rate
            </h3>
            <BarChart3 className="h-4 w-4 text-indigo-500" />
          </div>
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div className="text-3xl font-bold text-indigo-700">
                {departmentData.completionRate}%
              </div>
              <div className="flex items-center space-x-2">
                <span className="inline-block w-3 h-3 bg-green-500 rounded-full"></span>
                <span className="text-xs text-gray-600">
                  Completed: {departmentData.completedTasks}
                </span>
                <span className="inline-block w-3 h-3 bg-amber-500 rounded-full"></span>
                <span className="text-xs text-gray-600">
                  Total: {departmentData.totalTasks}
                </span>
              </div>
            </div>
            <div className="w-full h-2 bg-gray-200 rounded-full mt-2">
              <div
                className="h-full bg-gradient-to-r from-green-500 to-amber-500 rounded-full"
                style={{ width: `${departmentData.completionRate}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="space-y-4">
        <div className="bg-purple-100 rounded-md p-1 flex space-x-1">
          <button
            onClick={() => setActiveTab("overview")}
            className={`flex-1 py-2 text-center rounded-full transition-colors ${activeTab === "overview"
              ? "bg-purple-600 text-white"
              : "text-purple-700 hover:bg-purple-200"
              }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab("mis")}
            className={`flex-1 py-2 text-center rounded-full transition-colors ${activeTab === "mis"
              ? "bg-purple-600 text-white"
              : "text-purple-700 hover:bg-purple-200"
              }`}
          >
            MIS Report
          </button>
          <button
            onClick={() => setActiveTab("staff")}
            className={`flex-1 py-2 text-center rounded-full transition-colors ${activeTab === "staff"
              ? "bg-purple-600 text-white"
              : "text-purple-700 hover:bg-purple-200"
              }`}
          >
            Staff Performance
          </button>
        </div>

        {activeTab === "overview" && (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
              <div className="lg:col-span-4 rounded-lg border border-purple-200 shadow-md bg-white">
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 border-b border-purple-100 p-4">
                  <h3 className="text-purple-700 font-medium">
                    Tasks Overview
                  </h3>
                  <p className="text-purple-600 text-sm">
                    Task completion rate over time
                  </p>
                </div>
                <div className="p-4 pl-2">
                  <TasksOverviewChart />
                </div>
              </div>
              <div className="lg:col-span-3 rounded-lg border border-purple-200 shadow-md bg-white">
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 border-b border-purple-100 p-4">
                  <h3 className="text-purple-700 font-medium">
                    Task Status
                  </h3>
                  <p className="text-purple-600 text-sm">
                    Distribution of tasks by status
                  </p>
                </div>
                <div className="p-4">
                  <TasksCompletionChart />
                </div>
              </div>
            </div>
            <div className="rounded-lg border border-purple-200 shadow-md bg-white">
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 border-b border-purple-100 p-4">
                <h3 className="text-purple-700 font-medium">
                  Staff Task Summary
                </h3>
                <p className="text-purple-600 text-sm">
                  Overview of tasks assigned to each staff member
                </p>
              </div>
              <div className="p-4">
                <StaffTasksTable />
              </div>
            </div>
          </div>
        )}

        {/* UPDATED: Modified MIS Report section for delegation mode */}
        {activeTab === "mis" && (
          <div className="rounded-lg border border-purple-200 shadow-md bg-white">
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 border-b border-purple-100 p-4">
              <h3 className="text-purple-700 font-medium">MIS Report</h3>
              <p className="text-purple-600 text-sm">
                {dashboardType === "delegation"
                  ? `${isAdminUser()
                    ? "Detailed delegation analytics - all tasks from sheet data"
                    : "Detailed delegation analytics - your tasks only"}`
                  : `${isAdminUser()
                    ? "Detailed task analytics and performance metrics"
                    : "Your task analytics and performance metrics"}`
                }
              </p>
            </div>
            <div className="p-4">
              <div className="space-y-8">
                {/* UPDATED: Only show date range selection for checklist mode */}
                {dashboardType !== "delegation" && (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 bg-gray-50 p-4 rounded-lg border border-gray-100">
                    <div className="space-y-2 lg:col-span-1">
                      <label
                        htmlFor="start-date"
                        className="flex items-center text-purple-700 text-sm font-medium"
                      >
                        Start Date
                      </label>
                      <input
                        id="start-date"
                        type="date"
                        value={dateRange.startDate}
                        onChange={(e) =>
                          setDateRange((prev) => ({
                            ...prev,
                            startDate: e.target.value,
                          }))
                        }
                        className="w-full rounded-md border border-purple-200 p-2 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                      />
                    </div>
                    <div className="space-y-2 lg:col-span-1">
                      <label
                        htmlFor="end-date"
                        className="flex items-center text-purple-700 text-sm font-medium"
                      >
                        End Date
                      </label>
                      <input
                        id="end-date"
                        type="date"
                        value={dateRange.endDate}
                        onChange={(e) =>
                          setDateRange((prev) => ({
                            ...prev,
                            endDate: e.target.value,
                          }))
                        }
                        className="w-full rounded-md border border-purple-200 p-2 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                      />
                    </div>
                    <div className="space-y-2 lg:col-span-2 flex items-end">
                      <button
                        onClick={filterTasksByDateRange}
                        className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded transition-colors"
                      >
                        Apply Filter
                      </button>
                    </div>
                  </div>
                )}

                {/* UPDATED: Overall stats with different displays for delegation vs checklist */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-purple-600">
                      Total Tasks Assigned
                    </div>
                    <div className="text-3xl font-bold text-purple-700">
                      {dashboardType === "delegation"
                        ? departmentData.totalTasks
                        : dateRange.filtered
                          ? filteredDateStats.totalTasks
                          : departmentData.totalTasks}
                    </div>
                    {dashboardType === "delegation" ? (
                      <p className="text-xs text-purple-600">
                        All tasks from delegation sheet
                      </p>
                    ) : (
                      dateRange.filtered && (
                        <p className="text-xs text-purple-600">
                          For period: {formatLocalDate(dateRange.startDate)}{" "}
                          - {formatLocalDate(dateRange.endDate)}
                        </p>
                      )
                    )}
                  </div>
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-purple-600">
                      Tasks Completed
                    </div>
                    <div className="text-3xl font-bold text-purple-700">
                      {dashboardType === "delegation"
                        ? departmentData.completedTasks
                        : dateRange.filtered
                          ? filteredDateStats.completedTasks
                          : departmentData.completedTasks}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-purple-600">
                      {dashboardType === "delegation"
                        ? "Tasks Pending"
                        : "Tasks Pending/Overdue"}
                    </div>
                    <div className="text-3xl font-bold text-purple-700">
                      {dashboardType === "delegation"
                        ? departmentData.pendingTasks
                        : dateRange.filtered
                          ? `${filteredDateStats.pendingTasks} / ${filteredDateStats.overdueTasks}`
                          : `${departmentData.pendingTasks} / ${departmentData.overdueTasks}`}
                    </div>
                    <div className="text-xs text-purple-600">
                      {dashboardType === "delegation"
                        ? "All incomplete tasks"
                        : "Pending (all incomplete) / Overdue (past dates only)"}
                    </div>
                  </div>
                </div>

                {/* UPDATED: Additional breakdown - only for checklist with date filtering */}
                {dashboardType !== "delegation" && dateRange.filtered && (
                  <div className="rounded-lg border border-purple-100 p-4 bg-gray-50">
                    <h4 className="text-lg font-medium text-purple-700 mb-4">
                      Detailed Date Range Breakdown
                    </h4>
                    <div className="grid gap-4 md:grid-cols-3">
                      <div className="bg-white p-3 rounded-lg border border-amber-200">
                        <div className="text-sm font-medium text-amber-700">
                          Pending Tasks
                        </div>
                        <div className="text-2xl font-bold text-amber-600">
                          {filteredDateStats.pendingTasks}
                        </div>
                        <div className="text-xs text-amber-600 mt-1">
                          All incomplete tasks (including overdue + today)
                        </div>
                      </div>
                      <div className="bg-white p-3 rounded-lg border border-red-200">
                        <div className="text-sm font-medium text-red-700">
                          Overdue Tasks
                        </div>
                        <div className="text-2xl font-bold text-red-600">
                          {filteredDateStats.overdueTasks}
                        </div>
                        <div className="text-xs text-red-600 mt-1">
                          Past due dates only (excluding today)
                        </div>
                      </div>
                      <div className="bg-white p-3 rounded-lg border border-green-200">
                        <div className="text-sm font-medium text-green-700">
                          Completed Once
                        </div>
                        <div className="text-2xl font-bold text-green-600">
                          {departmentData.completedRatingOne}
                        </div>
                        <div className="text-xs text-green-600 mt-1">
                          Tasks with rating 1
                        </div>
                      </div>
                      <div className="bg-white p-3 rounded-lg border border-amber-200">
                        <div className="text-sm font-medium text-amber-700">
                          Completed Twice
                        </div>
                        <div className="text-2xl font-bold text-amber-600">
                          {departmentData.completedRatingTwo}
                        </div>
                        <div className="text-xs text-amber-600 mt-1">
                          Tasks with rating 2
                        </div>
                      </div>
                      <div className="bg-white p-3 rounded-lg border border-red-200">
                        <div className="text-sm font-medium text-red-700">
                          Completed 3+ Times
                        </div>
                        <div className="text-2xl font-bold text-red-600">
                          {departmentData.completedRatingThreePlus}
                        </div>
                        <div className="text-xs text-red-600 mt-1">
                          Tasks with rating 3 or higher
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-purple-700">
                    Department Performance
                  </h3>
                  <div className="grid gap-4 md:grid-cols-1">
                    <div className="rounded-lg border border-purple-200 bg-white p-4">
                      <h4 className="text-sm font-medium text-purple-700 mb-2">
                        Completion Rate
                      </h4>
                      <div className="flex items-center gap-4">
                        <div className="text-2xl font-bold text-purple-700">
                          {dashboardType === "delegation"
                            ? departmentData.completionRate
                            : dateRange.filtered
                              ? filteredDateStats.completionRate
                              : departmentData.completionRate}
                          %
                        </div>
                        <div className="flex-1">
                          <div className="w-full h-6 bg-gray-200 rounded-full">
                            <div
                              className="h-full rounded-full flex items-center justify-end px-3 text-xs font-medium text-white"
                              style={{
                                width: `${dashboardType === "delegation"
                                  ? departmentData.completionRate
                                  : dateRange.filtered
                                    ? filteredDateStats.completionRate
                                    : departmentData.completionRate
                                  }%`,
                                background: `linear-gradient(to right, #10b981 ${(dashboardType === "delegation"
                                  ? departmentData.completionRate
                                  : dateRange.filtered
                                    ? filteredDateStats.completionRate
                                    : departmentData.completionRate) * 0.8
                                  }%, #f59e0b ${(dashboardType === "delegation"
                                    ? departmentData.completionRate
                                    : dateRange.filtered
                                      ? filteredDateStats.completionRate
                                      : departmentData.completionRate) * 0.8
                                  }%)`,
                              }}
                            >
                              {dashboardType === "delegation"
                                ? departmentData.completionRate
                                : dateRange.filtered
                                  ? filteredDateStats.completionRate
                                  : departmentData.completionRate}
                              %
                            </div>
                          </div>
                        </div>
                      </div>
                      <p className="text-xs text-purple-600 mt-2">
                        {dashboardType === "delegation"
                          ? `${departmentData.completedTasks} of ${departmentData.totalTasks} tasks completed in delegation mode (all sheet data)`
                          : `${dateRange.filtered
                            ? filteredDateStats.completedTasks
                            : departmentData.completedTasks
                          } of ${dateRange.filtered
                            ? filteredDateStats.totalTasks
                            : departmentData.totalTasks
                          } tasks completed in checklist mode`}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "staff" && (
          <div className="rounded-lg border border-purple-200 shadow-md bg-white">
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 border-b border-purple-100 p-4">
              <h3 className="text-purple-700 font-medium">
                Staff Performance
              </h3>
              <p className="text-purple-600 text-sm">
                {dashboardType === "delegation"
                  ? `${isAdminUser()
                    ? "Task completion rates by staff member (all delegation sheet data)"
                    : "Your task completion rate (delegation sheet data)"}`
                  : `${isAdminUser()
                    ? "Task completion rates by staff member (tasks up to today only)"
                    : "Your task completion rate (tasks up to today only)"}`
                }
              </p>
            </div>
            <div className="p-4">
              <div className="space-y-8">
                {departmentData.staffMembers.length > 0 ? (
                  <>
                    {(() => {
                      // Sort staff members by performance (high to low)
                      const sortedStaffMembers = [
                        ...departmentData.staffMembers,
                      ]
                        .filter((staff) => staff.totalTasks > 0)
                        .sort((a, b) => b.progress - a.progress);

                      return (
                        <>
                          {/* High performers section (70% or above) */}
                          <div className="rounded-md border border-green-200">
                            <div className="p-4 bg-gradient-to-r from-green-50 to-green-100 border-b border-green-200">
                              <h3 className="text-lg font-medium text-green-700">
                                Top Performers
                              </h3>
                              <p className="text-sm text-green-600">
                                {dashboardType === "delegation"
                                  ? "Staff with high task completion rates (all delegation data)"
                                  : "Staff with high task completion rates (tasks up to today only)"}
                              </p>
                            </div>
                            <div className="p-4">
                              <div className="space-y-4">
                                {sortedStaffMembers
                                  .filter((staff) => staff.progress >= 70)
                                  .map((staff) => (
                                    <div
                                      key={staff.id}
                                      className="flex items-center justify-between p-3 border border-green-100 rounded-md bg-green-50"
                                    >
                                      <div className="flex items-center gap-2">
                                        <div className="h-10 w-10 rounded-full bg-gradient-to-r from-green-500 to-teal-500 flex items-center justify-center">
                                          <span className="text-sm font-medium text-white">
                                            {staff.name.charAt(0)}
                                          </span>
                                        </div>
                                        <div>
                                          <p className="font-medium text-green-700">
                                            {staff.name}
                                          </p>
                                          <p className="text-xs text-green-600">
                                            {staff.completedTasks} of{" "}
                                            {staff.totalTasks} tasks
                                            completed
                                          </p>
                                        </div>
                                      </div>
                                      <div className="text-lg font-bold text-green-600">
                                        {staff.progress}%
                                      </div>
                                    </div>
                                  ))}
                                {sortedStaffMembers.filter(
                                  (staff) => staff.progress >= 70
                                ).length === 0 && (
                                    <div className="text-center p-4 text-gray-500">
                                      <p>
                                        No staff members with high completion
                                        rates found.
                                      </p>
                                    </div>
                                  )}
                              </div>
                            </div>
                          </div>

                          {/* Mid performers section (40-69%) */}
                          <div className="rounded-md border border-yellow-200">
                            <div className="p-4 bg-gradient-to-r from-yellow-50 to-yellow-100 border-b border-yellow-200">
                              <h3 className="text-lg font-medium text-yellow-700">
                                Average Performers
                              </h3>
                              <p className="text-sm text-yellow-600">
                                {dashboardType === "delegation"
                                  ? "Staff with moderate task completion rates (all delegation data)"
                                  : "Staff with moderate task completion rates (tasks up to today only)"}
                              </p>
                            </div>
                            <div className="p-4">
                              <div className="space-y-4">
                                {sortedStaffMembers
                                  .filter(
                                    (staff) =>
                                      staff.progress >= 40 &&
                                      staff.progress < 70
                                  )
                                  .map((staff) => (
                                    <div
                                      key={staff.id}
                                      className="flex items-center justify-between p-3 border border-yellow-100 rounded-md bg-yellow-50"
                                    >
                                      <div className="flex items-center gap-2">
                                        <div className="h-10 w-10 rounded-full bg-gradient-to-r from-yellow-500 to-amber-500 flex items-center justify-center">
                                          <span className="text-sm font-medium text-white">
                                            {staff.name.charAt(0)}
                                          </span>
                                        </div>
                                        <div>
                                          <p className="font-medium text-yellow-700">
                                            {staff.name}
                                          </p>
                                          <p className="text-xs text-yellow-600">
                                            {staff.completedTasks} of{" "}
                                            {staff.totalTasks} tasks
                                            completed
                                          </p>
                                        </div>
                                      </div>
                                      <div className="text-lg font-bold text-yellow-600">
                                        {staff.progress}%
                                      </div>
                                    </div>
                                  ))}
                                {sortedStaffMembers.filter(
                                  (staff) =>
                                    staff.progress >= 40 &&
                                    staff.progress < 70
                                ).length === 0 && (
                                    <div className="text-center p-4 text-gray-500">
                                      <p>
                                        No staff members with moderate
                                        completion rates found.
                                      </p>
                                    </div>
                                  )}
                              </div>
                            </div>
                          </div>

                          {/* Low performers section (below 40%) */}
                          <div className="rounded-md border border-red-200">
                            <div className="p-4 bg-gradient-to-r from-red-50 to-red-100 border-b border-red-200">
                              <h3 className="text-lg font-medium text-red-700">
                                Needs Improvement
                              </h3>
                              <p className="text-sm text-red-600">
                                {dashboardType === "delegation"
                                  ? "Staff with lower task completion rates (all delegation data)"
                                  : "Staff with lower task completion rates (tasks up to today only)"}
                              </p>
                            </div>
                            <div className="p-4">
                              <div className="space-y-4">
                                {sortedStaffMembers
                                  .filter((staff) => staff.progress < 40)
                                  .map((staff) => (
                                    <div
                                      key={staff.id}
                                      className="flex items-center justify-between p-3 border border-red-100 rounded-md bg-red-50"
                                    >
                                      <div className="flex items-center gap-2">
                                        <div className="h-10 w-10 rounded-full bg-gradient-to-r from-red-500 to-pink-500 flex items-center justify-center">
                                          <span className="text-sm font-medium text-white">
                                            {staff.name.charAt(0)}
                                          </span>
                                        </div>
                                        <div>
                                          <p className="font-medium text-red-700">
                                            {staff.name}
                                          </p>
                                          <p className="text-xs text-red-600">
                                            {staff.completedTasks} of{" "}
                                            {staff.totalTasks} tasks
                                            completed
                                          </p>
                                        </div>
                                      </div>
                                      <div className="text-lg font-bold text-red-600">
                                        {staff.progress}%
                                      </div>
                                    </div>
                                  ))}
                                {sortedStaffMembers.filter(
                                  (staff) => staff.progress < 40
                                ).length === 0 && (
                                    <div className="text-center p-4 text-gray-500">
                                      <p>
                                        No staff members with low completion
                                        rates found.
                                      </p>
                                    </div>
                                  )}
                              </div>
                            </div>
                          </div>

                          {/* No assigned tasks section */}
                          {departmentData.staffMembers.filter(
                            (staff) => staff.totalTasks === 0
                          ).length > 0 && (
                              <div className="rounded-md border border-gray-200">
                                <div className="p-4 bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                                  <h3 className="text-lg font-medium text-gray-700">
                                    No Tasks Assigned
                                  </h3>
                                  <p className="text-sm text-gray-600">
                                    {dashboardType === "delegation"
                                      ? "Staff with no tasks in delegation sheet"
                                      : "Staff with no tasks assigned for current period"}
                                  </p>
                                </div>
                                <div className="p-4">
                                  <div className="space-y-4">
                                    {departmentData.staffMembers
                                      .filter(
                                        (staff) => staff.totalTasks === 0
                                      )
                                      .map((staff) => (
                                        <div
                                          key={staff.id}
                                          className="flex items-center justify-between p-3 border border-gray-100 rounded-md bg-gray-50"
                                        >
                                          <div className="flex items-center gap-2">
                                            <div className="h-10 w-10 rounded-full bg-gradient-to-r from-gray-500 to-gray-600 flex items-center justify-center">
                                              <span className="text-sm font-medium text-white">
                                                {staff.name.charAt(0)}
                                              </span>
                                            </div>
                                            <div>
                                              <p className="font-medium text-gray-700">
                                                {staff.name}
                                              </p>
                                              <p className="text-xs text-gray-600">
                                                {dashboardType === "delegation"
                                                  ? "No tasks in delegation sheet"
                                                  : "No tasks assigned up to today"}
                                              </p>
                                            </div>
                                          </div>
                                          <div className="text-lg font-bold text-gray-600">
                                            N/A
                                          </div>
                                        </div>
                                      ))}
                                  </div>
                                </div>
                              </div>
                            )}
                        </>
                      );
                    })()}
                  </>
                ) : (
                  <div className="text-center p-8 text-gray-500">
                    <p>
                      {dashboardType === "delegation"
                        ? "No delegation data available."
                        : "Loading staff data..."}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {taskNotification.show && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-xl text-white transform transition-all duration-300 translate-y-0 ${taskNotification.type === 'error' ? 'bg-red-500' : 'bg-green-500'}`}>
          <div className="flex items-center space-x-2">
            {taskNotification.type === 'error' ? <AlertTriangle className="h-5 w-5" /> : <CheckCircle2 className="h-5 w-5" />}
            <span className="font-medium">{taskNotification.message}</span>
          </div>
        </div>
      )}

      {showImageUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Upload Profile Image
              </h3>
              <button
                onClick={() => {
                  setShowImageUploadModal(false);
                  setSelectedFile(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Image File
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Supported formats: JPG, PNG, GIF (Max 10MB)
                </p>
              </div>

              {selectedFile && (
                <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                  <Upload className="h-5 w-5 text-purple-600" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      {selectedFile.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
              )}

              <div className="flex space-x-3 pt-4">
                <button
                  onClick={() => {
                    setShowImageUploadModal(false);
                    setSelectedFile(null);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
                >
                  Cancel
                </button>
                <button
                  onClick={uploadImageAndUpdateWhatsApp}
                  disabled={!selectedFile || uploadingImage}
                  className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-md text-sm font-medium hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {uploadingImage ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Uploading...
                    </>
                  ) : (
                    "Upload Image"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {showTotalTasksModal && (() => {
        // Apply the same filtering as totalTasks count
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const totalTasksList = (departmentData.allTasks || []).filter(task => {
          if (dashboardType === "checklist") {
            // For checklist: only tasks where taskStartDate <= today
            const taskStartDateObj = parseDateFromDDMMYYYY(task.taskStartDate);
            return taskStartDateObj && taskStartDateObj <= today;
          }
          // For delegation: all tasks
          return true;
        });
        // Apply search filter on top
        const searchedTasks = totalTasksList.filter(task => {
          if (!totalTasksSearch.trim()) return true;
          const search = totalTasksSearch.toLowerCase();
          return (
            (task.id && task.id.toString().toLowerCase().includes(search)) ||
            (task.title && task.title.toLowerCase().includes(search)) ||
            (task.assignedTo && task.assignedTo.toLowerCase().includes(search)) ||
            (task.taskStartDate && task.taskStartDate.toLowerCase().includes(search)) ||
            (task.status && task.status.toLowerCase().includes(search)) ||
            (task.frequency && task.frequency.toLowerCase().includes(search))
          );
        });
        return (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowTotalTasksModal(false)}>
            <div
              className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[85vh] flex flex-col overflow-hidden animate-in"
              onClick={(e) => e.stopPropagation()}
              style={{ animation: 'fadeInScale 0.2s ease-out' }}
            >
              {/* Modal Header */}
              <div className="bg-gradient-to-r from-blue-500 to-indigo-600 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="bg-white/20 p-2 rounded-lg">
                    <ListTodo className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Total Tasks</h3>
                    <p className="text-blue-100 text-xs">
                      {dashboardType === "delegation" ? "Delegation" : "Checklist"} • {totalTasksList.length} tasks
                      {dashboardType === "checklist" && " (up to today)"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowTotalTasksModal(false)}
                  className="bg-white/20 hover:bg-white/30 text-white rounded-lg p-1.5 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Search Bar */}
              <div className="px-6 py-3 border-b border-gray-100 bg-gray-50/50">
                <div className="relative">
                  <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by ID, description, assigned to..."
                    value={totalTasksSearch}
                    onChange={(e) => setTotalTasksSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all bg-white"
                  />
                </div>
              </div>

              {/* Table */}
              <div className="flex-1 overflow-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50 sticky top-0 z-10">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">#</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Task ID</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Description</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Assigned To</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Start Date</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Frequency</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {searchedTasks.length > 0 ? searchedTasks.map((task, index) => (
                      <tr key={`${task.id}-${index}`} className="hover:bg-blue-50/50 transition-colors">
                        <td className="px-4 py-3 text-xs text-gray-400 font-mono">{index + 1}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-gray-800">{task.id}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 max-w-[280px]">
                          <span className="line-clamp-2" title={task.title}>{task.title}</span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          <div className="flex items-center space-x-2">
                            <div className="h-6 w-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">
                              {task.assignedTo ? task.assignedTo.charAt(0).toUpperCase() : '?'}
                            </div>
                            <span>{task.assignedTo}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{task.taskStartDate}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${task.status === 'completed'
                            ? 'bg-green-100 text-green-700'
                            : task.status === 'overdue'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-amber-100 text-amber-700'
                            }`}>
                            <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${task.status === 'completed' ? 'bg-green-500' : task.status === 'overdue' ? 'bg-red-500' : 'bg-amber-500'
                              }`}></span>
                            {task.status ? task.status.charAt(0).toUpperCase() + task.status.slice(1) : 'N/A'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getFrequencyColor(task.frequency)}`}>
                            {task.frequency ? task.frequency.charAt(0).toUpperCase() + task.frequency.slice(1) : 'N/A'}
                          </span>
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan="7" className="px-4 py-12 text-center">
                          <div className="flex flex-col items-center space-y-2">
                            <Filter className="h-8 w-8 text-gray-300" />
                            <p className="text-gray-400 font-medium">No tasks found</p>
                            <p className="text-gray-300 text-xs">Try adjusting your search</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-3 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between">
                <p className="text-xs text-gray-400">
                  Showing {searchedTasks.length} of {totalTasksList.length} tasks
                </p>
                <button
                  onClick={() => setShowTotalTasksModal(false)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        );
      })()}
      {showCardModal.type && (() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Config for each card type
        const cardConfig = {
          completed: {
            checklist: {
              title: "Completed Tasks",
              subtitle: "Total completed till date",
              gradient: "from-green-500 to-emerald-600",
              iconBg: "bg-white/20",
              filter: (task) => {
                const taskStartDateObj = parseDateFromDDMMYYYY(task.taskStartDate);
                return taskStartDateObj && taskStartDateObj <= today && task.status === 'completed';
              }
            },
            delegation: {
              title: "Completed Once",
              subtitle: "Tasks completed once (Rating 1)",
              gradient: "from-green-500 to-emerald-600",
              iconBg: "bg-white/20",
              filter: (task) => task._statusColumnU === "Done" && task._ratingColumnR === 1
            }
          },
          pending: {
            checklist: {
              title: "Pending Tasks",
              subtitle: "Including today + overdue",
              gradient: "from-amber-500 to-orange-600",
              iconBg: "bg-white/20",
              filter: (task) => {
                const taskStartDateObj = parseDateFromDDMMYYYY(task.taskStartDate);
                return taskStartDateObj && taskStartDateObj <= today && task.status !== 'completed';
              }
            },
            delegation: {
              title: "Completed Twice",
              subtitle: "Tasks completed twice (Rating 2)",
              gradient: "from-amber-500 to-orange-600",
              iconBg: "bg-white/20",
              filter: (task) => task._statusColumnU === "Done" && task._ratingColumnR === 2
            }
          },
          overdue: {
            checklist: {
              title: "Overdue Tasks",
              subtitle: "Past due (excluding today)",
              gradient: "from-red-500 to-rose-600",
              iconBg: "bg-white/20",
              filter: (task) => {
                const taskStartDateObj = parseDateFromDDMMYYYY(task.taskStartDate);
                return taskStartDateObj && taskStartDateObj <= today && task.status === 'overdue';
              }
            },
            delegation: {
              title: "Completed 3+ Times",
              subtitle: "Tasks completed 3 or more times (Rating 3+)",
              gradient: "from-red-500 to-rose-600",
              iconBg: "bg-white/20",
              filter: (task) => task._statusColumnU === "Done" && task._ratingColumnR >= 3
            }
          }
        };

        const config = cardConfig[showCardModal.type]?.[dashboardType];
        if (!config) return null;

        const cardTasks = (departmentData.allTasks || []).filter(config.filter);
        const searchedCardTasks = cardTasks.filter(task => {
          if (!showCardModal.search?.trim()) return true;
          const search = showCardModal.search.toLowerCase();
          return (
            (task.id && task.id.toString().toLowerCase().includes(search)) ||
            (task.title && task.title.toLowerCase().includes(search)) ||
            (task.assignedTo && task.assignedTo.toLowerCase().includes(search)) ||
            (task.taskStartDate && task.taskStartDate.toLowerCase().includes(search)) ||
            (task.status && task.status.toLowerCase().includes(search)) ||
            (task.frequency && task.frequency.toLowerCase().includes(search))
          );
        });

        const CardIcon = showCardModal.type === 'completed'
          ? CheckCircle2
          : showCardModal.type === 'pending'
            ? (dashboardType === 'delegation' ? CheckCircle2 : Clock)
            : (dashboardType === 'delegation' ? CheckCircle2 : AlertTriangle);

        return (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowCardModal({ type: null, search: '' })}>
            <div
              className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[85vh] flex flex-col overflow-hidden"
              onClick={(e) => e.stopPropagation()}
              style={{ animation: 'fadeInScale 0.2s ease-out' }}
            >
              {/* Modal Header */}
              <div className={`bg-gradient-to-r ${config.gradient} px-6 py-4 flex items-center justify-between`}>
                <div className="flex items-center space-x-3">
                  <div className="bg-white/20 p-2 rounded-lg">
                    <CardIcon className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">{config.title}</h3>
                    <p className="text-white/80 text-xs">
                      {config.subtitle} • {cardTasks.length} tasks
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowCardModal({ type: null, search: '' })}
                  className="bg-white/20 hover:bg-white/30 text-white rounded-lg p-1.5 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Search Bar */}
              <div className="px-6 py-3 border-b border-gray-100 bg-gray-50/50">
                <div className="relative">
                  <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by ID, description, assigned to..."
                    value={showCardModal.search || ''}
                    onChange={(e) => setShowCardModal(prev => ({ ...prev, search: e.target.value }))}
                    className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all bg-white"
                  />
                </div>
              </div>

              {/* Table */}
              <div className="flex-1 overflow-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50 sticky top-0 z-10">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">#</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Task ID</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Description</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Assigned To</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Start Date</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Frequency</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {searchedCardTasks.length > 0 ? searchedCardTasks.map((task, index) => (
                      <tr key={`${task.id}-${index}`} className="hover:bg-blue-50/50 transition-colors">
                        <td className="px-4 py-3 text-xs text-gray-400 font-mono">{index + 1}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-gray-800">{task.id}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 max-w-[280px]">
                          <span className="line-clamp-2" title={task.title}>{task.title}</span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          <div className="flex items-center space-x-2">
                            <div className="h-6 w-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">
                              {task.assignedTo ? task.assignedTo.charAt(0).toUpperCase() : '?'}
                            </div>
                            <span>{task.assignedTo}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{task.taskStartDate}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${task.status === 'completed'
                            ? 'bg-green-100 text-green-700'
                            : task.status === 'overdue'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-amber-100 text-amber-700'
                            }`}>
                            <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${task.status === 'completed' ? 'bg-green-500' : task.status === 'overdue' ? 'bg-red-500' : 'bg-amber-500'
                              }`}></span>
                            {task.status ? task.status.charAt(0).toUpperCase() + task.status.slice(1) : 'N/A'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getFrequencyColor(task.frequency)}`}>
                            {task.frequency ? task.frequency.charAt(0).toUpperCase() + task.frequency.slice(1) : 'N/A'}
                          </span>
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan="7" className="px-4 py-12 text-center">
                          <div className="flex flex-col items-center space-y-2">
                            <Filter className="h-8 w-8 text-gray-300" />
                            <p className="text-gray-400 font-medium">No tasks found</p>
                            <p className="text-gray-300 text-xs">{showCardModal.search ? 'Try adjusting your search' : 'No tasks in this category'}</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-3 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between">
                <p className="text-xs text-gray-400">
                  Showing {searchedCardTasks.length} of {cardTasks.length} tasks
                </p>
                <button
                  onClick={() => setShowCardModal({ type: null, search: '' })}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </AdminLayout>
  );
}

