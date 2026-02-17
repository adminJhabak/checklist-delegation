"use client"
import { useState, useEffect, useCallback, useMemo, memo } from "react"
import { CheckCircle2, Upload, X, Search, History, ArrowLeft, Filter, RefreshCw, Edit, Check, Save } from "lucide-react"
import AdminLayout from "../../components/layout/AdminLayout"

// Configuration
const CONFIG = {
    APPS_SCRIPT_URL:
        "https://script.google.com/macros/s/AKfycbwpmsTlO61wAQ_1u4u0bPBFadfCqK_icPMjFNhPfv1xzAUGPFUfv4z1cXreLtfieLSn6g/exec",
    SHEET_NAME: "Checklist",          // main sheet
    DELEGATION_SHEET_NAME: "DELEGATION", // delegation sheet
    DELEGATION_DONE_SHEET_NAME: "DELEGATION DONE", // target for delegation status
    PAGE_CONFIG: {
        title: "Task Approval",
        description: "All submitted tasks (pending & approved)",
    },
}

// Helper functions
function parseDateFromDDMMYYYY(dateStr) {
    if (!dateStr || typeof dateStr !== "string") return null
    const datePart = dateStr.includes(" ") ? dateStr.split(" ")[0] : dateStr
    const parts = datePart.split("/")
    if (parts.length !== 3) return null
    return new Date(parts[2], parts[1] - 1, parts[0])
}

function isEmpty(value) {
    return value === null || value === undefined || String(value).trim() === ""
}

function getAdminStatus(adminDoneValue) {
    if (isEmpty(adminDoneValue)) {
        return "Pending";
    }
    const val = String(adminDoneValue).trim();
    if (val === "Admin Done") {
        return "Approved";
    }
    if (val === "Not Done") {
        return "Rejected";
    }
    return val;
}

function checkIsOverdue(actualDate, taskStartDate) {
    if (!isEmpty(actualDate)) return false;
    if (!isEmpty(taskStartDate)) {
        const taskDate = parseDateFromDDMMYYYY(taskStartDate);
        if (taskDate) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const taskDateOnly = new Date(taskDate);
            taskDateOnly.setHours(0, 0, 0, 0);
            return taskDateOnly < today;
        }
    }
    return false;
}

function isLeaveStatus(leaveValue) {
    return !isEmpty(leaveValue) && String(leaveValue).trim().toLowerCase() === "leave"
}

function getStatusColor(status) {
    switch (status) {
        case "Approved":
            return "bg-green-100 text-green-700 border border-green-200"
        case "Pending":
            return "bg-yellow-100 text-yellow-700 border border-yellow-200"
        case "Rejected":
            return "bg-red-100 text-red-700 border border-red-200"
        case "Overdue":
            return "bg-amber-100 text-amber-700 border border-amber-200"
        case "Leave":
            return "bg-purple-100 text-purple-700 border border-purple-200"
        default:
            return "bg-gray-100 text-gray-700 border border-gray-200"
    }
}

// Memoized Checklist Task Row
const MemoizedTaskRow = memo(({
    account,
    rowIndex,
    isSelected,
    onCheckboxClick,
    isEditing,
    tempRemarksValue,
    tempStatusValue,
    onEditClick,
    onCancelEdit,
    onSaveRemarks,
    onTempRemarksChange,
    onTempStatusChange,
    isSubmitting,
}) => {
    const isLeave = isLeaveStatus(account["col16"]);
    const taskStatus = isLeave ? "Leave" : getAdminStatus(account["col15"]);
    const isDisabled = taskStatus === "Approved" || taskStatus === "Leave";
    const isNotToday = checkIsOverdue(account["col10"], account["col6"]);

    return (
        <tr
            className={`group ${isSelected ? "bg-purple-50" : ""} ${isNotToday ? "bg-white border-l-4 border-red-600" : "hover:bg-gray-50"} ${isDisabled ? "opacity-90" : ""}`}
        >
            <td className={`px-3 py-4 w-12 sticky left-0 z-30 ${isNotToday ? "bg-white" : "bg-white group-hover:bg-gray-50"}`}>
                <div className="text-xs text-gray-400 font-mono">{rowIndex + 1}</div>
            </td>
            <td className={`px-3 py-4 w-12 sticky left-12 z-30 ${isNotToday ? "bg-white" : "bg-white group-hover:bg-gray-50"}`}>
                {isEditing ? (
                    <div className="flex flex-col gap-1.5 min-w-[100px] items-center">
                        <select
                            autoFocus
                            className="text-[11px] font-medium border border-purple-200 rounded p-1 bg-white focus:ring-2 focus:ring-purple-500 outline-none cursor-pointer w-full"
                            onChange={(e) => onTempStatusChange(account._id, e.target.value)}
                            value={tempStatusValue || ""}
                        >
                            <option value="">Status...</option>
                            <option value="Admin Done">Done</option>
                            <option value="Not Done">Not Done</option>
                        </select>
                        <div className="flex gap-1 w-full">
                            <button
                                onClick={() => onSaveRemarks(account._id, account["col13"], account, tempStatusValue)}
                                disabled={isSubmitting}
                                className="flex-1 bg-green-600 text-white p-1 rounded hover:bg-green-700 flex items-center justify-center shadow-sm disabled:opacity-50"
                                title="Save changes"
                            >
                                {isSubmitting ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} />}
                            </button>
                            <button
                                onClick={() => onCancelEdit(account._id)}
                                className="flex-1 bg-red-600 text-white p-1 rounded hover:bg-red-700 flex items-center justify-center shadow-sm"
                                title="Cancel"
                            >
                                <X size={14} />
                            </button>
                        </div>
                    </div>
                ) : (
                    <button
                        onClick={() => onEditClick(account._id)}
                        className="text-blue-600 hover:text-blue-800 flex items-center justify-center p-1"
                        title="Edit Remarks & Status"
                    >
                        <Edit size={18} />
                    </button>
                )}
            </td>
            <td className={`px-3 py-4 w-12 sticky left-24 z-30 ${isNotToday ? "bg-white" : "bg-white group-hover:bg-gray-50"}`}>
                <div className="flex items-center justify-center">
                    {taskStatus === "Approved" ? (
                        <div className="text-green-600">
                            <Check size={18} className="font-bold" />
                        </div>
                    ) : (
                        <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => onCheckboxClick(account)}
                            className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
                        />
                    )}
                </div>
            </td>
            <td className={`px-3 py-4 w-20 sticky left-36 z-30 ${isNotToday ? "bg-white" : "bg-white group-hover:bg-gray-50"}`}>
                <div className={`text-sm wrap-break-word font-medium ${isNotToday ? "text-red-600" : "text-gray-900"}`}>
                    {account["col1"] || "—"}
                </div>
            </td>
            <td className="px-3 py-4 min-w-[140px]">
                <span className={`inline-flex items-center px-3 py-1 text-[11px] font-bold rounded-full whitespace-nowrap shadow-xs uppercase tracking-wider ${getStatusColor(taskStatus)}`}>
                    <span className={`w-1.5 h-1.5 rounded-full mr-2 ${taskStatus === 'Approved' ? 'bg-green-500' :
                        taskStatus === 'Rejected' ? 'bg-red-500' :
                            taskStatus === 'Leave' ? 'bg-purple-500' : 'bg-yellow-500'
                        }`}></span>
                    {taskStatus}
                </span>
            </td>
            <td className="px-3 py-4 min-w-[100px]">
                <div className={`text-sm wrap-break-word font-medium ${isNotToday ? "text-red-600" : "text-gray-900"}`}>
                    {account["col2"] || "—"}
                </div>
            </td>
            <td className="px-3 py-4 min-w-[100px]">
                <div className={`text-sm wrap-break-word font-medium ${isNotToday ? "text-red-600" : "text-gray-900"}`}>
                    {account["col3"] || "—"}
                </div>
            </td>
            <td className="px-3 py-4 min-w-[100px]">
                <div className={`text-sm wrap-break-word font-medium ${isNotToday ? "text-red-600" : "text-gray-900"}`}>
                    {account["col4"] || "—"}
                </div>
            </td>
            <td className="px-3 py-4 min-w-[200px]">
                <div className={`text-sm wrap-break-word font-medium ${isNotToday ? "text-red-600" : "text-gray-900"} ${isDisabled ? "opacity-50" : ""}`} title={account["col5"]}>
                    {account["col5"] || "—"}
                </div>
            </td>
            <td className={`px-3 py-4 ${isNotToday ? "bg-white border-l-4 border-white" : "bg-yellow-50/30 hover:bg-yellow-100/30"} min-w-[140px]`}>
                <div className={`text-sm wrap-break-word ${isNotToday ? "text-red-600" : "text-gray-900"} ${isDisabled ? "opacity-50" : ""}`}>
                    {account["col6"] ? (
                        <div>
                            <div className="font-medium wrap-break-word">
                                {account["col6"].includes(" ") ? account["col6"].split(" ")[0] : account["col6"]}
                            </div>
                            {account["col6"].includes(" ") && (
                                <div className={`text-xs wrap-break-word ${isNotToday ? "text-red-500" : "text-gray-500"}`}>
                                    {account["col6"].split(" ")[1]}
                                </div>
                            )}
                        </div>
                    ) : "—"}
                </div>
            </td>
            <td className="px-3 py-4 min-w-[80px]">
                <div className={`text-sm wrap-break-word font-medium ${isNotToday ? "text-red-600" : "text-gray-900"} ${isDisabled ? "opacity-50" : ""}`}>
                    {account["col7"] || "—"}
                </div>
            </td>
            <td className="px-3 py-4 bg-blue-50 min-w-[120px]">
                <div className={`text-sm wrap-break-word font-medium whitespace-nowrap ${isDisabled ? "opacity-50" : ""}`}>
                    {account["col12"] || "—"}
                </div>
            </td>
            <td className="px-3 py-4 bg-purple-50 min-w-[150px]">
                {isEditing ? (
                    <input
                        type="text"
                        defaultValue={account["col13"] || ""}
                        onChange={(e) => onTempRemarksChange(account._id, e.target.value)}
                        className="border rounded-md px-2 py-1 w-full text-sm font-medium"
                        autoFocus
                    />
                ) : (
                    <div className={`text-sm wrap-break-word font-medium ${isDisabled ? "opacity-50" : ""}`}>
                        {account["col13"] || "—"}
                    </div>
                )}
            </td>
            <td className="px-3 py-4 min-w-[100px]">
                {account["col14"] ? (
                    <a
                        href={account["col14"]}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 underline flex items-center wrap-break-word"
                    >
                        <img
                            src={account["col14"]}
                            alt="Attachment"
                            className="h-8 w-8 object-cover rounded-md mr-2 flex-shrink-0"
                        />
                        <span className="wrap-break-word text-sm">View</span>
                    </a>
                ) : (
                    <span className="text-gray-400 text-sm">No file</span>
                )}
            </td>
            <td className={`px-3 py-4 min-w-[100px] ${isSelected ? "bg-purple-50" : "bg-gray-50"}`}>
                <div className="flex items-center justify-center">
                    {taskStatus === "Approved" ? (
                        <div className="text-green-600 flex items-center gap-1.5">
                            <CheckCircle2 size={18} />
                            <span className="font-medium text-[11px] uppercase tracking-wider">Done</span>
                        </div>
                    ) : (
                        <div className="w-10 h-5"></div>
                    )}
                </div>
            </td>
        </tr>
    );
});

// Memoized Delegation Row (with edit & status)
const MemoizedDelegationRow = memo(({
    account,
    rowIndex,
    isEditing,
    onEditClick,
    tempStatusValue,
    onStatusChange,
    onTempStatusChange,
    onCancelEdit,
    isSubmitting,
}) => {
    const currentStatus = account["col19"] || "—";

    return (
        <tr className="hover:bg-gray-50">
            <td className="px-3 py-4 w-12 sticky left-0 bg-white">
                <div className="text-xs text-gray-400 font-mono">{rowIndex + 1}</div>
            </td>
            <td className="px-3 py-4 w-12 sticky left-12 bg-white">
                {isEditing ? (
                    <div className="flex flex-col gap-1.5 min-w-[100px] items-center">
                        <select
                            autoFocus
                            className="text-[11px] font-medium border border-purple-200 rounded p-1 bg-white focus:ring-2 focus:ring-purple-500 outline-none cursor-pointer w-full"
                            onChange={(e) => onTempStatusChange(account._id, e.target.value)}
                            value={tempStatusValue || ""}
                        >
                            <option value="">Status...</option>
                            <option value="Admin Done">Done</option>
                            <option value="Not Done">Not Done</option>
                        </select>
                        <div className="flex gap-1 w-full">
                            <button
                                onClick={() => onStatusChange(account._id, account, tempStatusValue)}
                                disabled={isSubmitting}
                                className="flex-1 bg-green-600 text-white p-1 rounded hover:bg-green-700 flex items-center justify-center shadow-sm disabled:opacity-50"
                                title="Save changes"
                            >
                                {isSubmitting ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} />}
                            </button>
                            <button
                                onClick={() => onCancelEdit(account._id)}
                                className="flex-1 bg-red-600 text-white p-1 rounded hover:bg-red-700 flex items-center justify-center shadow-sm"
                                title="Cancel"
                            >
                                <X size={14} />
                            </button>
                        </div>
                    </div>
                ) : (
                    <button
                        onClick={() => onEditClick(account._id)}
                        className="text-blue-600 hover:text-blue-800 flex items-center justify-center p-1"
                        title="Update Status"
                    >
                        <Edit size={18} />
                    </button>
                )}
            </td>
            <td className="px-3 py-4 w-12 sticky left-24 bg-white">
                <div className="flex items-center justify-center">
                    {currentStatus === "Admin Done" ? (
                        <div className="text-green-600">
                            <Check size={18} className="font-bold" />
                        </div>
                    ) : (
                        <div className="w-4 h-4 border border-gray-200 rounded"></div>
                    )}
                </div>
            </td>
            <td className="px-3 py-4 min-w-[100px]">
                <span className={`inline-flex items-center px-3 py-1 text-[11px] font-bold rounded-full whitespace-nowrap shadow-xs uppercase tracking-wider ${currentStatus === "Admin Done" ? "bg-green-100 text-green-700 border border-green-200" :
                    currentStatus === "Not Done" ? "bg-red-100 text-red-700 border border-red-200" :
                        "bg-gray-100 text-gray-500 border border-gray-200"
                    }`}>
                    <span className={`w-1.5 h-1.5 rounded-full mr-2 ${currentStatus === "Admin Done" ? "bg-green-500" :
                        currentStatus === "Not Done" ? "bg-red-500" : "bg-gray-400"
                        }`}></span>
                    {currentStatus}
                </span>
            </td>
            <td className="px-3 py-4 min-w-[100px]"><div className="text-sm">{account["col1"] || "—"}</div></td>
            <td className="px-3 py-4 min-w-[100px]"><div className="text-sm">{account["col2"] || "—"}</div></td>
            <td className="px-3 py-4 min-w-[100px]"><div className="text-sm">{account["col3"] || "—"}</div></td>
            <td className="px-3 py-4 min-w-[100px]"><div className="text-sm">{account["col4"] || "—"}</div></td>
            <td className="px-3 py-4 min-w-[200px]"><div className="text-sm">{account["col5"] || "—"}</div></td>
            <td className="px-3 py-4 bg-yellow-50/30 min-w-[140px]">
                <div className="text-sm text-gray-900">
                    {account["col6"] ? (
                        <div>
                            <div className="font-medium">{account["col6"].includes(" ") ? account["col6"].split(" ")[0] : account["col6"]}</div>
                            {account["col6"].includes(" ") && (
                                <div className="text-xs text-gray-500">{account["col6"].split(" ")[1]}</div>
                            )}
                        </div>
                    ) : "—"}
                </div>
            </td>
            <td className="px-3 py-4 min-w-[80px]"><div className="text-sm">{account["col7"] || "—"}</div></td>
            <td className="px-3 py-4 min-w-[120px]"><div className="text-sm">{account["col8"] || "—"}</div></td>
            <td className="px-3 py-4 min-w-[100px]"><div className="text-sm">{account["col9"] || "—"}</div></td>
            <td className="px-3 py-4 bg-red-50/30 min-w-[140px]">
                <div className="text-sm text-gray-900">
                    {account["col10"] ? (
                        <div>
                            <div className="font-medium">{account["col10"].includes(" ") ? account["col10"].split(" ")[0] : account["col10"]}</div>
                            {account["col10"].includes(" ") && (
                                <div className="text-xs text-gray-500">{account["col10"].split(" ")[1]}</div>
                            )}
                        </div>
                    ) : "—"}
                </div>
            </td>
        </tr>
    );
});

function ChecklistDataPage() {
    // Tab state
    const [activeTab, setActiveTab] = useState("checklist")

    // Checklist data
    const [allData, setAllData] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    // Delegation data
    const [delegationData, setDelegationData] = useState([])
    const [delegationLoading, setDelegationLoading] = useState(false)
    const [delegationError, setDelegationError] = useState(null)

    // Shared filter states
    const [searchTerm, setSearchTerm] = useState("")
    const [membersList, setMembersList] = useState([])
    const [selectedMembers, setSelectedMembers] = useState([])
    const [startDate, setStartDate] = useState("")
    const [endDate, setEndDate] = useState("")
    const [userRole, setUserRole] = useState("")
    const [username, setUsername] = useState("")
    const [selectedStatus, setSelectedStatus] = useState("")
    const [showFilters, setShowFilters] = useState(false)
    const [nameSearchTerm, setNameSearchTerm] = useState("")
    const [displayLimit, setDisplayLimit] = useState(500)
    const [isLoadingMore, setIsLoadingMore] = useState(false)
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("")
    const [successMessage, setSuccessMessage] = useState("")



    // Checklist editing
    const [editingRemarks, setEditingRemarks] = useState({})
    const [tempRemarks, setTempRemarks] = useState({})
    const [tempStatus, setTempStatus] = useState({})
    const [tempDelegationStatus, setTempDelegationStatus] = useState({})
    const [submittingRows, setSubmittingRows] = useState(new Set())




    // Delegation editing
    const [editingDelegation, setEditingDelegation] = useState({})

    // Checklist selection
    const [selectedItems, setSelectedItems] = useState([])
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [confirmationModal, setConfirmationModal] = useState({ isOpen: false, itemCount: 0 })

    useEffect(() => {
        const role = sessionStorage.getItem("role")
        const user = sessionStorage.getItem("username")
        setUserRole(role || "")
        setUsername(user || "")
    }, [])

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearchTerm(searchTerm), 300)
        return () => clearTimeout(timer)
    }, [searchTerm])

    const formatDateToDDMMYYYY = useCallback((date) => {
        const day = date.getDate().toString().padStart(2, "0")
        const month = (date.getMonth() + 1).toString().padStart(2, "0")
        const year = date.getFullYear()
        return `${day}/${month}/${year}`
    }, [])

    const parseGoogleSheetsDateTime = (dateTimeStr) => {
        if (!dateTimeStr) return ""
        if (typeof dateTimeStr === "string" && dateTimeStr.match(/^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}:\d{2}$/)) return dateTimeStr
        if (typeof dateTimeStr === "string" && dateTimeStr.match(/^\d{2}\/\d{2}\/\d{4}$/)) return dateTimeStr
        if (typeof dateTimeStr === "string" && dateTimeStr.startsWith("Date(")) {
            const match = /Date\((\d+),(\d+),(\d+)(?:,(\d+),(\d+),(\d+))?\)/.exec(dateTimeStr)
            if (match) {
                const year = parseInt(match[1], 10)
                const month = parseInt(match[2], 10)
                const day = parseInt(match[3], 10)
                const hours = match[4] ? parseInt(match[4], 10) : null
                const minutes = match[5] ? parseInt(match[5], 10) : null
                const seconds = match[6] ? parseInt(match[6], 10) : null
                let result = `${day.toString().padStart(2, "0")}/${(month + 1).toString().padStart(2, "0")}/${year}`
                if (hours !== null) result += ` ${hours.toString().padStart(2, "0")}:${(minutes || 0).toString().padStart(2, "0")}:${(seconds || 0).toString().padStart(2, "0")}`
                return result
            }
        }
        try {
            const date = new Date(dateTimeStr)
            if (!isNaN(date.getTime())) return formatDateToDDMMYYYY(date)
        } catch (e) { console.error("Error parsing date-time:", e) }
        return dateTimeStr
    }

    const parseDateFromDDMMYYYYCb = useCallback((dateStr) => {
        if (!dateStr || typeof dateStr !== "string") return null
        const datePart = dateStr.includes(" ") ? dateStr.split(" ")[0] : dateStr
        const parts = datePart.split("/")
        if (parts.length !== 3) return null
        return new Date(parts[2], parts[1] - 1, parts[0])
    }, [])

    const resetFilters = useCallback(() => {
        setSearchTerm("")
        setSelectedMembers([])
        setStartDate("")
        setEndDate("")
        setSelectedStatus("")
        setNameSearchTerm("")
        setEditingRemarks({})
        setTempRemarks({})
        setTempStatus({})
        setEditingDelegation({})
        setTempDelegationStatus({})
        setSubmittingRows(new Set())
    }, [])

    const getFilteredMembersList = useCallback(() => membersList.filter(m => m && m.trim() !== ""), [membersList])

    // Fetch Checklist data
    const fetchSheetData = useCallback(async () => {
        try {
            setLoading(true)
            const rowsToStore = []
            const response = await fetch(`${CONFIG.APPS_SCRIPT_URL}?sheet=${CONFIG.SHEET_NAME}&action=fetch`)
            if (!response.ok) throw new Error(`Failed to fetch data: ${response.status}`)
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
                } else throw new Error("Invalid JSON response from server")
            }

            const currentUsername = sessionStorage.getItem("username")
            const currentUserRole = sessionStorage.getItem("role")

            const membersSet = new Set()
            let rawRows = []
            if (data.table && data.table.rows) rawRows = data.table.rows
            else if (Array.isArray(data)) rawRows = data
            else if (data.values) rawRows = data.values.map((row) => ({ c: row.map((val) => ({ v: val })) }))

            rawRows.forEach((row, rowIndex) => {
                if (rowIndex === 0) return
                let rowValues = []
                if (row.c) rowValues = row.c.map((cell) => (cell && cell.v !== undefined ? cell.v : ""))
                else if (Array.isArray(row)) rowValues = row
                else return

                const assignedTo = rowValues[4] || "Unassigned"
                membersSet.add(assignedTo)

                const isUserMatch = currentUserRole === "admin" || assignedTo.toLowerCase() === currentUsername?.toLowerCase()
                if (!isUserMatch && currentUserRole !== "admin") return

                const columnKValue = rowValues[10]
                const columnPValue = rowValues[15]

                const googleSheetsRowIndex = rowIndex + 1
                const taskId = rowValues[1] || ""
                if (!taskId && !rowValues[4] && !rowValues[5]) return

                const stableId = taskId ? `task_${taskId}_${googleSheetsRowIndex}` : `row_${googleSheetsRowIndex}_${Math.random().toString(36).substring(2, 15)}`

                const rowData = { _id: stableId, _rowIndex: googleSheetsRowIndex, _taskId: taskId }
                const columnHeaders = [
                    "col0", "col1", "col2", "col3", "col4", "col5", "col6", "col7", "col8", "col9", "col10", "col11", "col12", "col13", "col14", "col15", "col16"
                ]
                columnHeaders.forEach((header, index) => {
                    const cellValue = rowValues[index]
                    if (index === 6 || index === 10 || (cellValue && String(cellValue).startsWith("Date("))) {
                        rowData[header] = cellValue ? parseGoogleSheetsDateTime(String(cellValue)) : ""
                    } else rowData[header] = cellValue !== null ? cellValue : ""
                })

                const hasColumnK = !isEmpty(columnKValue)
                const isAdminDone = !isEmpty(columnPValue) && columnPValue.toString().trim() === "Admin Done"
                if (hasColumnK || isAdminDone) rowsToStore.push(rowData)
            })

            setMembersList(Array.from(membersSet).sort())
            setAllData(rowsToStore)
            setLoading(false)
        } catch (error) {
            console.error("Error fetching sheet data:", error)
            setError("Failed to load checklist data: " + error.message)
            setLoading(false)
        }
    }, [formatDateToDDMMYYYY, parseDateFromDDMMYYYYCb])

    // Fetch Delegation data (up to column T)
    const fetchDelegationData = useCallback(async () => {
        try {
            setDelegationLoading(true)
            const rowsToStore = []
            const response = await fetch(`${CONFIG.APPS_SCRIPT_URL}?sheet=${CONFIG.DELEGATION_SHEET_NAME}&action=fetch`)
            if (!response.ok) throw new Error(`Failed to fetch delegation data: ${response.status}`)
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
                } else throw new Error("Invalid JSON response from server")
            }

            let rawRows = []
            if (data.table && data.table.rows) rawRows = data.table.rows
            else if (Array.isArray(data)) rawRows = data
            else if (data.values) rawRows = data.values.map((row) => ({ c: row.map((val) => ({ v: val })) }))

            rawRows.forEach((row, rowIndex) => {
                if (rowIndex === 0) return
                let rowValues = []
                if (row.c) rowValues = row.c.map((cell) => (cell && cell.v !== undefined ? cell.v : ""))
                else if (Array.isArray(row)) rowValues = row
                else return

                const columnLValue = rowValues[11]
                if (isEmpty(columnLValue)) return // Strict requirement: Only show if Column L is filled

                const googleSheetsRowIndex = rowIndex + 1
                const taskId = rowValues[1] || ""
                const stableId = taskId ? `del_${taskId}_${googleSheetsRowIndex}` : `del_row_${googleSheetsRowIndex}_${Math.random().toString(36).substring(2, 15)}`

                const rowData = { _id: stableId, _rowIndex: googleSheetsRowIndex, _taskId: taskId }
                // Map columns 0 to 19 (A to T)
                for (let i = 0; i <= 19; i++) {
                    const cellValue = rowValues[i]
                    if (i === 6 || i === 10 || (cellValue && String(cellValue).startsWith("Date("))) {
                        rowData[`col${i}`] = cellValue ? parseGoogleSheetsDateTime(String(cellValue)) : ""
                    } else {
                        rowData[`col${i}`] = cellValue !== undefined ? cellValue : ""
                    }
                }
                rowsToStore.push(rowData)
            })

            setDelegationData(rowsToStore)
            setDelegationLoading(false)
        } catch (error) {
            console.error("Error fetching delegation data:", error)
            setDelegationError("Failed to load delegation data: " + error.message)
            setDelegationLoading(false)
        }
    }, [])

    // Initial load
    useEffect(() => {
        fetchSheetData()
        fetchDelegationData()
    }, [fetchSheetData, fetchDelegationData])

    // Refresh when tab changes if empty
    useEffect(() => {
        if (activeTab === "checklist" && allData.length === 0) {
            fetchSheetData()
        } else if (activeTab === "delegation" && delegationData.length === 0) {
            fetchDelegationData()
        }
    }, [activeTab, fetchSheetData, fetchDelegationData, allData.length, delegationData.length])

    // Filtering for Checklist
    const filteredChecklistData = useMemo(() => {
        if (!allData.length) return []
        let filtered = allData

        if (debouncedSearchTerm) {
            const lower = debouncedSearchTerm.toLowerCase()
            filtered = filtered.filter(acc => Object.values(acc).some(v => v && v.toString().toLowerCase().includes(lower)))
        }

        if (selectedStatus) {
            filtered = filtered.filter(acc => {
                const isLeave = isLeaveStatus(acc["col16"])
                if (selectedStatus === "Leave") return isLeave
                const taskStatus = getAdminStatus(acc["col15"])
                return taskStatus === selectedStatus
            })
        }

        if (selectedMembers.length > 0) {
            filtered = filtered.filter(acc => selectedMembers.includes(acc["col4"]))
        }

        if (startDate || endDate) {
            filtered = filtered.filter(acc => {
                const itemDate = parseDateFromDDMMYYYYCb(acc["col6"])
                if (!itemDate) return false
                if (startDate) {
                    const start = new Date(startDate); start.setHours(0, 0, 0, 0)
                    if (itemDate < start) return false
                }
                if (endDate) {
                    const end = new Date(endDate); end.setHours(23, 59, 59, 999)
                    if (itemDate > end) return false
                }
                return true
            })
        }

        return filtered.sort((a, b) => {
            const da = parseDateFromDDMMYYYYCb(a["col6"])
            const db = parseDateFromDDMMYYYYCb(b["col6"])
            if (!da) return 1; if (!db) return -1
            return db.getTime() - da.getTime()
        })
    }, [allData, debouncedSearchTerm, selectedStatus, selectedMembers, startDate, endDate, parseDateFromDDMMYYYYCb])

    // Filtering for Delegation
    const filteredDelegationData = useMemo(() => {
        if (!delegationData.length) return []
        let filtered = delegationData

        if (debouncedSearchTerm) {
            const lower = debouncedSearchTerm.toLowerCase()
            filtered = filtered.filter(acc => Object.values(acc).some(v => v && v.toString().toLowerCase().includes(lower)))
        }

        if (selectedStatus) {
            filtered = filtered.filter(acc => {
                const currentStatus = acc["col19"] || "—"
                if (selectedStatus === "Approved") return currentStatus === "Admin Done"
                if (selectedStatus === "Rejected") return currentStatus === "Not Done"
                if (selectedStatus === "Pending") return isEmpty(currentStatus) || currentStatus === "—"
                return true
            })
        }

        if (selectedMembers.length > 0) {
            filtered = filtered.filter(acc => selectedMembers.includes(acc["col4"]))
        }

        if (startDate || endDate) {
            filtered = filtered.filter(acc => {
                const itemDate = parseDateFromDDMMYYYYCb(acc["col6"])
                if (!itemDate) return false
                if (startDate) {
                    const start = new Date(startDate); start.setHours(0, 0, 0, 0)
                    if (itemDate < start) return false
                }
                if (endDate) {
                    const end = new Date(endDate); end.setHours(23, 59, 59, 999)
                    if (itemDate > end) return false
                }
                return true
            })
        }

        return filtered.sort((a, b) => {
            const da = parseDateFromDDMMYYYYCb(a["col6"])
            const db = parseDateFromDDMMYYYYCb(b["col6"])
            if (!da) return 1; if (!db) return -1
            return db.getTime() - da.getTime()
        })
    }, [delegationData, debouncedSearchTerm, selectedStatus, selectedMembers, startDate, endDate, parseDateFromDDMMYYYYCb])

    const displayedChecklistData = useMemo(() => filteredChecklistData.slice(0, displayLimit), [filteredChecklistData, displayLimit])
    const displayedDelegationData = useMemo(() => filteredDelegationData.slice(0, displayLimit), [filteredDelegationData, displayLimit])

    // Checklist actions
    const handleCheckboxClick = useCallback((account) => {
        setSelectedItems(prev => prev.some(i => i._id === account._id) ? prev.filter(i => i._id !== account._id) : [...prev, account])
    }, [])

    const handleSelectAll = useCallback(() => {
        if (selectedItems.length === filteredChecklistData.length) setSelectedItems([])
        else setSelectedItems(filteredChecklistData)
    }, [selectedItems, filteredChecklistData])

    const handleSubmitAdminDone = useCallback(() => {
        if (selectedItems.length === 0 || isSubmitting) return
        setConfirmationModal({ isOpen: true, itemCount: selectedItems.length })
    }, [selectedItems, isSubmitting])

    const handleEditRemarks = async (id, currentRemarks, item, adminDoneStatus) => {
        setSubmittingRows(prev => new Set(prev).add(id))
        try {
            const formData = new FormData()
            formData.append("sheetName", CONFIG.SHEET_NAME)
            formData.append("action", "update")
            formData.append("rowIndex", item._rowIndex)

            const rowData = Array(17).fill("")
            const finalRemarks = tempRemarks[id] !== undefined ? tempRemarks[id] : (currentRemarks || "")
            rowData[13] = finalRemarks
            rowData[15] = adminDoneStatus !== undefined ? adminDoneStatus : (item["col15"] || "")
            formData.append("rowData", JSON.stringify(rowData))

            const response = await fetch(CONFIG.APPS_SCRIPT_URL, { method: "POST", body: formData })
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
            const result = await response.json()
            if (result.success) {
                setAllData(prev => prev.map(row => row._id === id ? { ...row, col13: finalRemarks, col15: adminDoneStatus !== undefined ? adminDoneStatus : row.col15 } : row))
                setEditingRemarks(prev => ({ ...prev, [id]: false }))
                setSuccessMessage("Task updated successfully!")
                setTempRemarks(prev => { const newTemp = { ...prev }; delete newTemp[id]; return newTemp })
                setTempStatus(prev => { const newTemp = { ...prev }; delete newTemp[id]; return newTemp })
                setTimeout(() => setSuccessMessage(""), 3000)
            } else throw new Error(result.error || "Failed to update task")
        } catch (error) {
            console.error("Error updating task:", error)
            setSuccessMessage(`Failed to update task: ${error.message}`)
            setTimeout(() => setSuccessMessage(""), 5000)
        } finally {
            setSubmittingRows(prev => {
                const newSet = new Set(prev)
                newSet.delete(id)
                return newSet
            })
        }
    }

    // Delegation status update
    const handleDelegationStatusChange = async (id, item, status) => {
        setSubmittingRows(prev => new Set(prev).add(id))
        try {
            const formData = new FormData();
            formData.append("sheetName", CONFIG.DELEGATION_DONE_SHEET_NAME);
            formData.append("action", "update");
            formData.append("rowIndex", item._rowIndex);

            // Prepare row data array (Column P is index 15)
            const rowData = new Array(16).fill("");
            rowData[15] = status;

            formData.append("rowData", JSON.stringify(rowData));

            const response = await fetch(CONFIG.APPS_SCRIPT_URL, { method: "POST", body: formData });
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const result = await response.json();
            if (result.success) {
                // Update local status display (note: fetching still from DELEGATION sheet)
                setDelegationData(prev =>
                    prev.map(row => row._id === id ? { ...row, col19: status } : row)
                );
                setEditingDelegation(prev => ({ ...prev, [id]: false }));
                setTempDelegationStatus(prev => { const n = { ...prev }; delete n[id]; return n; });
                setSuccessMessage("Delegation status updated successfully!");
                setTimeout(() => setSuccessMessage(""), 3000);
            } else {
                throw new Error(result.error || "Failed to update delegation status");
            }
        } catch (error) {
            console.error("Error updating delegation status:", error);
            setSuccessMessage(`Failed to update: ${error.message}`);
            setTimeout(() => setSuccessMessage(""), 5000);
        } finally {
            setSubmittingRows(prev => {
                const newSet = new Set(prev)
                newSet.delete(id)
                return newSet
            })
        }
    };

    const confirmMarkDone = useCallback(async () => {
        setConfirmationModal({ isOpen: false, itemCount: 0 })
        setIsSubmitting(true)
        try {
            const submissionData = selectedItems.map(item => ({
                taskId: item._taskId || item["col1"],
                rowIndex: item._rowIndex,
                adminDoneStatus: "Admin Done",
            }))
            const formData = new FormData()
            formData.append("sheetName", CONFIG.SHEET_NAME)
            formData.append("action", "updateAdminDone")
            formData.append("rowData", JSON.stringify(submissionData))
            const response = await fetch(CONFIG.APPS_SCRIPT_URL, { method: "POST", body: formData })
            const result = await response.json()
            if (result.success) {
                setAllData(prev => prev.map(item => selectedItems.some(s => s._id === item._id) ? { ...item, col15: "Admin Done" } : item))
                setSelectedItems([])
                setSuccessMessage(`Successfully marked ${selectedItems.length} item${selectedItems.length > 1 ? 's' : ''} as Admin Done!`)
                setTimeout(() => setSuccessMessage(""), 5000)
                setTimeout(() => fetchSheetData(), 2000)
            } else throw new Error(result.error || "Failed to mark items as Admin Done")
        } catch (error) {
            console.error("Error marking tasks as Admin Done:", error)
            setSuccessMessage(`Failed: ${error.message}`)
            setTimeout(() => setSuccessMessage(""), 5000)
        } finally { setIsSubmitting(false) }
    }, [selectedItems, fetchSheetData])

    const handleLoadMore = useCallback(() => {
        if (displayLimit < filteredChecklistData.length && !isLoadingMore) {
            setIsLoadingMore(true)
            setTimeout(() => {
                setDisplayLimit(prev => Math.min(prev + 500, filteredChecklistData.length))
                setIsLoadingMore(false)
            }, 300)
        }
    }, [displayLimit, filteredChecklistData.length, isLoadingMore])

    useEffect(() => { setDisplayLimit(500) }, [debouncedSearchTerm, selectedStatus, selectedMembers, startDate, endDate])

    // Filter Section Component
    const FilterSection = () => {
        const [isDropdownOpen, setIsDropdownOpen] = useState(false)
        const filteredMembersList = getFilteredMembersList().filter(m => m.toLowerCase().includes(nameSearchTerm.toLowerCase()))
        return (
            <div className="p-4 border-b border-purple-100 bg-gray-50">
                <div className="flex flex-wrap items-end justify-center gap-6">
                    {/* Status Filter */}
                    <div className="flex flex-col">
                        <label className="text-sm font-medium text-purple-700 mb-1.5">Status:</label>
                        <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)}
                            className="text-sm border border-purple-200 rounded-md p-2 min-w-[140px] focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white">
                            <option value="">All Status</option>
                            <option value="Pending">Pending</option>
                            <option value="Approved">Approved</option>
                            <option value="Rejected">Rejected</option>
                            <option value="Leave">Leave</option>
                        </select>
                    </div>

                    {/* Member Filter */}
                    {getFilteredMembersList().length > 0 && (
                        <div className="flex flex-col">
                            <label className="text-sm font-medium text-purple-700 mb-1.5">Member:</label>
                            <div className="relative w-[200px]">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Search className="h-4 w-4 text-purple-400" />
                                </div>
                                <input type="text" placeholder="Search members..." value={nameSearchTerm}
                                    onChange={(e) => setNameSearchTerm(e.target.value)}
                                    onClick={() => setIsDropdownOpen(true)}
                                    className="pl-10 pr-4 py-2 border border-purple-200 rounded-md text-sm w-full focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                                />
                                {isDropdownOpen && filteredMembersList.length > 0 && (
                                    <div className="absolute top-full left-0 right-0 z-50 mt-1 max-h-48 overflow-y-auto p-2 border border-purple-200 rounded-md bg-white shadow-xl">
                                        <div className="space-y-1.5">
                                            {filteredMembersList.map((member, idx) => (
                                                <div key={idx} className="flex items-center p-1 hover:bg-purple-50">
                                                    <input id={`member-${idx}`} type="checkbox"
                                                        className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
                                                        checked={selectedMembers.includes(member)}
                                                        onChange={() => handleMemberSelection(member)}
                                                    />
                                                    <label htmlFor={`member-${idx}`} className="ml-2.5 text-sm text-gray-700 whitespace-nowrap cursor-pointer">
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
                        <label className="text-sm font-medium text-purple-700 mb-1.5">Date Range:</label>
                        <div className="flex items-center gap-2 bg-white border border-purple-200 rounded-md p-1">
                            <div className="flex items-center px-1">
                                <span className="text-[10px] uppercase font-bold text-gray-400 mr-2">From</span>
                                <input id="start-date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
                                    className="text-sm border-none focus:ring-0 p-1 text-gray-700 cursor-pointer" />
                            </div>
                            <div className="w-px h-6 bg-purple-100"></div>
                            <div className="flex items-center px-1">
                                <span className="text-[10px] uppercase font-bold text-gray-400 mr-2">To</span>
                                <input id="end-date" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
                                    className="text-sm border-none focus:ring-0 p-1 text-gray-700 cursor-pointer" />
                            </div>
                        </div>
                    </div>

                    {/* Selected members chips */}
                    {selectedMembers.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 max-w-[300px]">
                            {selectedMembers.map(member => (
                                <span key={member} className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 border border-purple-200">
                                    {member}
                                    <button onClick={() => handleMemberSelection(member)} className="ml-1.5 text-purple-600 hover:text-purple-800">
                                        <X size={14} />
                                    </button>
                                </span>
                            ))}
                        </div>
                    )}

                    {/* Clear Filters */}
                    {(selectedMembers.length > 0 || startDate || endDate || searchTerm || selectedStatus || nameSearchTerm) && (
                        <button onClick={() => { resetFilters(); setIsDropdownOpen(false); }}
                            className="px-4 py-2 bg-red-50 text-red-600 border border-red-100 rounded-md hover:bg-red-100 text-sm font-medium h-[38px]">
                            Clear All
                        </button>
                    )}
                </div>
            </div>
        )
    }

    // Confirmation Modal
    const ConfirmationModal = ({ isOpen, itemCount, onConfirm, onCancel }) => {
        if (!isOpen) return null
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
                <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
                    <div className="flex items-center justify-center mb-4">
                        <div className="bg-yellow-100 text-yellow-600 rounded-full p-3 mr-4">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>
                        <h2 className="text-xl font-bold text-gray-800">Mark Items as Admin Done</h2>
                    </div>
                    <p className="text-gray-600 text-center mb-6">Are you sure you want to mark {itemCount} {itemCount === 1 ? "item" : "items"} as Admin Done?</p>
                    <div className="flex justify-center space-x-4">
                        <button onClick={onCancel} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300">Cancel</button>
                        <button onClick={onConfirm} className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">Confirm</button>
                    </div>
                </div>
            </div>
        )
    }

    const handleMemberSelection = useCallback((member) => {
        setSelectedMembers(prev => prev.includes(member) ? prev.filter(m => m !== member) : [...prev, member])
    }, [])

    return (
        <AdminLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                    <h1 className="text-2xl font-bold tracking-tight text-purple-700">{CONFIG.PAGE_CONFIG.title}</h1>
                    <div className="relative w-full sm:w-auto grow max-w-md mx-auto sm:mx-0">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search className="h-5 w-5 text-purple-400" />
                        </div>
                        <input type="text" placeholder="Search tasks..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-11 pr-4 py-2.5 border border-purple-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 w-full text-base bg-purple-50/30 hover:bg-white shadow-sm" />
                    </div>
                    <div className="flex flex-col sm:flex-row sm:flex-wrap items-center justify-center gap-3 w-full sm:w-auto">
                        <button onClick={() => setShowFilters(!showFilters)}
                            className="flex items-center justify-center py-2 px-4 bg-white text-purple-700 border border-purple-200 rounded-lg hover:bg-purple-50 hover:border-purple-300 shadow-sm text-sm font-medium w-full sm:min-w-[100px]">
                            <Filter className="h-4 w-4 mr-2" /> Filters
                        </button>
                        <button onClick={activeTab === "checklist" ? fetchSheetData : fetchDelegationData}
                            className="flex items-center justify-center py-2 px-4 bg-white text-purple-700 border border-purple-200 rounded-lg hover:bg-purple-50 hover:border-purple-300 shadow-sm text-sm font-medium w-full sm:min-w-[100px]">
                            <RefreshCw className={`h-4 w-4 mr-2 ${(activeTab === "checklist" ? loading : delegationLoading) ? 'animate-spin' : ''}`} />
                            Refresh
                        </button>
                        {activeTab === "checklist" && selectedItems.length > 0 && (
                            <button onClick={handleSubmitAdminDone} disabled={isSubmitting}
                                className="flex items-center justify-center py-2 px-4 bg-green-600 text-white border border-green-600 rounded-lg hover:bg-green-700 shadow-sm text-sm font-medium w-full sm:min-w-[140px] disabled:opacity-50">
                                {isSubmitting ? (
                                    <><div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>Submitting...</>
                                ) : (
                                    <><CheckCircle2 className="h-4 w-4 mr-2" /> Submit ({selectedItems.length})</>
                                )}
                            </button>
                        )}
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex items-center gap-1 border-b border-purple-200 bg-white/50 backdrop-blur-sm px-2">
                    <button
                        onClick={() => { setActiveTab("checklist"); setSelectedItems([]); }}
                        className={`group relative flex items-center px-6 py-3 text-sm font-semibold transition-all duration-200 border-b-2 ${activeTab === "checklist"
                            ? "border-purple-600 text-purple-700 bg-purple-50/50"
                            : "border-transparent text-gray-500 hover:text-purple-600 hover:bg-gray-50/50"
                            }`}
                    >
                        <History size={16} className={`mr-2 ${activeTab === "checklist" ? "text-purple-600" : "text-gray-400 group-hover:text-purple-400"}`} />
                        Checklist
                        <span className={`ml-2.5 px-2 py-0.5 text-[10px] font-bold rounded-full transition-colors duration-200 ${activeTab === "checklist"
                            ? "bg-purple-600 text-white"
                            : "bg-gray-100 text-gray-500 group-hover:bg-purple-100 group-hover:text-purple-600"
                            }`}>
                            {allData.length}
                        </span>
                    </button>
                    <button
                        onClick={() => { setActiveTab("delegation"); setSelectedItems([]); }}
                        className={`group relative flex items-center px-6 py-3 text-sm font-semibold transition-all duration-200 border-b-2 ${activeTab === "delegation"
                            ? "border-purple-600 text-purple-700 bg-purple-50/50"
                            : "border-transparent text-gray-500 hover:text-purple-600 hover:bg-gray-50/50"
                            }`}
                    >
                        <ArrowLeft size={16} className={`mr-2 scale-x-[-1] ${activeTab === "delegation" ? "text-purple-600" : "text-gray-400 group-hover:text-purple-400"}`} />
                        Delegation
                        <span className={`ml-2.5 px-2 py-0.5 text-[10px] font-bold rounded-full transition-colors duration-200 ${activeTab === "delegation"
                            ? "bg-purple-600 text-white"
                            : "bg-gray-100 text-gray-500 group-hover:bg-purple-100 group-hover:text-purple-600"
                            }`}>
                            {delegationData.length}
                        </span>
                    </button>
                </div>

                {successMessage && (
                    <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md flex items-center justify-between">
                        <div className="flex items-center"><CheckCircle2 className="h-5 w-5 mr-2 text-green-500" />{successMessage}</div>
                        <button onClick={() => setSuccessMessage("")} className="text-green-500 hover:text-green-700"><X className="h-5 w-5" /></button>
                    </div>
                )}

                <div className="rounded-lg border border-purple-200 shadow-md bg-white overflow-hidden">
                    <div className="bg-linear-to-r from-purple-50 to-pink-50 border-b border-purple-100 p-4">
                        <h2 className="text-purple-700 font-medium">
                            {activeTab === "checklist" ? `All ${CONFIG.SHEET_NAME} Tasks` : `${CONFIG.DELEGATION_SHEET_NAME} Tasks`}
                        </h2>
                        <p className="text-purple-600 text-sm">{CONFIG.PAGE_CONFIG.description}</p>
                    </div>

                    {showFilters && <FilterSection />}

                    {/* Checklist Tab Content */}
                    {activeTab === "checklist" && (
                        loading ? (
                            <div className="text-center py-10"><div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500 mb-4"></div><p className="text-purple-600">Loading checklist data...</p></div>
                        ) : error ? (
                            <div className="bg-red-50 p-4 rounded-md text-red-800 text-center">{error} <button className="underline ml-2" onClick={() => window.location.reload()}>Try again</button></div>
                        ) : (
                            <div className="h-[calc(100vh-250px)] overflow-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50 sticky top-0 z-40">
                                        <tr>
                                            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12 sticky left-0 z-50 bg-gray-50">#</th>
                                            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12 sticky left-12 z-50 bg-gray-50">Edit</th>
                                            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12 sticky left-24 z-50 bg-gray-50">
                                                <input type="checkbox" checked={filteredChecklistData.length > 0 && selectedItems.length === filteredChecklistData.length} onChange={handleSelectAll}
                                                    className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500 cursor-pointer" title="Select All" />
                                            </th>
                                            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20 sticky left-36 z-50 bg-gray-50">Task ID</th>
                                            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[140px]">Status</th>
                                            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[100px]">Firm</th>
                                            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[100px]">Given By</th>
                                            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[100px]">Name</th>
                                            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[200px]">Task Description</th>
                                            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-yellow-50 min-w-[140px]">Task Start Date</th>
                                            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[80px]">Freq</th>
                                            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-blue-50 min-w-[120px]">Status</th>
                                            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-purple-50 min-w-[150px]">Remarks</th>
                                            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[100px]">Attachment</th>
                                            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50 min-w-[100px]">Admin Done</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {displayedChecklistData.map((account, idx) => (
                                            <MemoizedTaskRow
                                                key={account._id}
                                                account={account}
                                                rowIndex={idx}
                                                isSelected={selectedItems.some(i => i._id === account._id)}
                                                onCheckboxClick={handleCheckboxClick}
                                                isEditing={editingRemarks[account._id]}
                                                tempRemarksValue={tempRemarks[account._id]}
                                                tempStatusValue={tempStatus[account._id] || (account["col15"] === "Admin Done" ? "Admin Done" : account["col15"] === "Not Done" ? "Not Done" : "")}
                                                onEditClick={(id) => {
                                                    setEditingRemarks(prev => ({ ...prev, [id]: true }))
                                                    setTempStatus(prev => ({ ...prev, [id]: account["col15"] || "" }))
                                                }}
                                                onCancelEdit={(id) => {
                                                    setEditingRemarks(prev => ({ ...prev, [id]: false }))
                                                    setTempStatus(prev => { const nt = { ...prev }; delete nt[id]; return nt })
                                                }}
                                                onSaveRemarks={handleEditRemarks}
                                                onTempRemarksChange={(id, val) => setTempRemarks(prev => ({ ...prev, [id]: val }))}
                                                onTempStatusChange={(id, val) => setTempStatus(prev => ({ ...prev, [id]: val }))}
                                                isSubmitting={submittingRows.has(account._id)}
                                            />
                                        ))}
                                        {displayLimit < filteredChecklistData.length && (
                                            <tr><td colSpan={15} className="px-6 py-4 text-center">
                                                <button onClick={handleLoadMore} disabled={isLoadingMore} className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50">
                                                    {isLoadingMore ? <><div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2 inline"></div>Loading...</> : `Load More (${filteredChecklistData.length - displayLimit} remaining)`}
                                                </button>
                                            </td></tr>
                                        )}
                                        {filteredChecklistData.length === 0 && (
                                            <tr><td colSpan={15} className="px-6 py-4 text-center text-gray-500">No tasks found</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )
                    )}

                    {/* Delegation Tab Content */}
                    {activeTab === "delegation" && (
                        delegationLoading ? (
                            <div className="text-center py-10"><div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500 mb-4"></div><p className="text-purple-600">Loading delegation data...</p></div>
                        ) : delegationError ? (
                            <div className="bg-red-50 p-4 rounded-md text-red-800 text-center">{delegationError} <button className="underline ml-2" onClick={fetchDelegationData}>Try again</button></div>
                        ) : (
                            <div className="h-[calc(100vh-250px)] overflow-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50 sticky top-0 z-40">
                                        <tr>
                                            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12 sticky left-0 bg-gray-50">#</th>
                                            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12 sticky left-12 bg-gray-50">Edit</th>
                                            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12 sticky left-24 bg-gray-50">Select</th>
                                            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[100px]">Status</th>
                                            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[100px]">Task ID</th>
                                            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[100px]">Firm</th>
                                            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[100px]">Given By</th>
                                            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[100px]">Name</th>
                                            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[200px]">Task Description</th>
                                            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[140px]">Task Start Date</th>
                                            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[80px]">Freq</th>
                                            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px]">Enable Reminders</th>
                                            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[100px]">Require Attachment</th>
                                            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[100px]">Task End Date</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {displayedDelegationData.map((account, idx) => (
                                            <MemoizedDelegationRow
                                                key={account._id}
                                                account={account}
                                                rowIndex={idx}
                                                isEditing={editingDelegation[account._id]}
                                                tempStatusValue={tempDelegationStatus[account._id] !== undefined ? tempDelegationStatus[account._id] : (account["col19"] || "")}
                                                onEditClick={(id) => {
                                                    setEditingDelegation(prev => ({ ...prev, [id]: true }));
                                                    setTempDelegationStatus(prev => ({ ...prev, [id]: account["col19"] || "" }));
                                                }}
                                                onStatusChange={handleDelegationStatusChange}
                                                onTempStatusChange={(id, val) => setTempDelegationStatus(prev => ({ ...prev, [id]: val }))}
                                                onCancelEdit={(id) => {
                                                    setEditingDelegation(prev => ({ ...prev, [id]: false }));
                                                    setTempDelegationStatus(prev => { const n = { ...prev }; delete n[id]; return n; });
                                                }}
                                                isSubmitting={submittingRows.has(account._id)}
                                            />
                                        ))}
                                        {displayLimit < filteredDelegationData.length && (
                                            <tr><td colSpan={14} className="px-6 py-4 text-center">
                                                <button onClick={() => setDisplayLimit(prev => prev + 500)} className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700">
                                                    Load More ({filteredDelegationData.length - displayLimit} remaining)
                                                </button>
                                            </td></tr>
                                        )}
                                        {filteredDelegationData.length === 0 && (
                                            <tr><td colSpan={14} className="px-6 py-4 text-center text-gray-500">No delegation tasks found</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )
                    )}
                </div>
            </div>

            <ConfirmationModal
                isOpen={confirmationModal.isOpen}
                itemCount={confirmationModal.itemCount}
                onConfirm={confirmMarkDone}
                onCancel={() => setConfirmationModal({ isOpen: false, itemCount: 0 })}
            />
        </AdminLayout>
    )
}

export default ChecklistDataPage