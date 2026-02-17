import React, { useState, useEffect } from 'react';
import { Plus, User, Building, X, Save, Edit, Trash2, Search, ChevronDown } from 'lucide-react';
import AdminLayout from '../components/layout/AdminLayout';

const Settings = () => {
    const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwxe45-zdY7HMvMOmYg3n05GTyn7uhscbojSJB5nQDy2nPKA5Rn9pw_EOUbGG6BSYagFA/exec";
    const [activeTab, setActiveTab] = useState('users');
    const [showUserModal, setShowUserModal] = useState(false);
    const [showDeptModal, setShowDeptModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [currentUserId, setCurrentUserId] = useState(null);
    const [currentDeptId, setCurrentDeptId] = useState(null);
    const [usernameFilter, setUsernameFilter] = useState('');
    const [usernameDropdownOpen, setUsernameDropdownOpen] = useState(false);
    const [activeDeptSubTab, setActiveDeptSubTab] = useState('departments');
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);

    // Form states
    const [userForm, setUserForm] = useState({
        username: '',
        email: '',
        password: '',
        phone: '',
        department: '',
        role: 'user',
        givenBy: '',
    });

    const [deptForm, setDeptForm] = useState({
        name: '',
        givenBy: '',
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Fetch data from Whatsapp sheet
    const fetchData = async () => {
        try {
            setLoading(true);
            const response = await fetch(`${APPS_SCRIPT_URL}?action=fetch&sheet=Whatsapp`);
            const data = await response.json();

            if (data && data.table && data.table.rows) {
                // index 0 is header, so rows.slice(1) starts from row 2
                const processedUsers = data.table.rows.slice(1).map((row, index) => {
                    const getCellValue = (idx) => (row.c && row.c[idx] ? row.c[idx].v : "");
                    // Get all raw values to preserve extra columns
                    const originalData = row.c ? row.c.map(cell => (cell && cell.v !== undefined) ? cell.v : "") : [];

                    return {
                        id: index + 1, // Synthetic ID starts at 1
                        _rowIndex: index + 2, // Actual row index in Google Sheets
                        _originalData: originalData,
                        department: getCellValue(0), // Column A
                        givenBy: getCellValue(1),    // Column B
                        username: getCellValue(2),   // Column C
                        password: getCellValue(3),   // Column D
                        role: getCellValue(4),       // Column E
                        email: getCellValue(5),      // Column F
                        number: getCellValue(6),     // Column G
                    };
                });
                setUsers(processedUsers);
            }
        } catch (error) {
            console.error("Error fetching data:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // Derived departments from users
    const uniqueDepartments = Array.from(new Set(users.map(u => u.department))).filter(Boolean).map((dept, idx) => ({
        id: idx + 1,
        department: dept,
        givenBy: users.find(u => u.department === dept)?.givenBy || "N/A"
    }));

    // Handlers for UI (no backend calls)
    const handleTabChange = (tab) => {
        setActiveTab(tab);
    };

    const handleAddButtonClick = () => {
        if (activeTab === 'users') {
            resetUserForm();
            setShowUserModal(true);
            setIsEditing(false);
        } else if (activeTab === 'departments') {
            resetDeptForm();
            setShowDeptModal(true);
        }
    };

    const handleSaveUser = async () => {
        if (!userForm.username || !userForm.department || !userForm.role) {
            alert("Please fill in required fields (Username, Department, Role).");
            return;
        }

        try {
            setIsSubmitting(true);
            const formData = new FormData();
            formData.append("sheetName", "Whatsapp");

            if (isEditing && currentUserId) {
                const user = users.find(u => u.id === currentUserId);
                const targetRowIndex = user ? user._rowIndex : (currentUserId + 1);

                // Merge with original data to preserve columns H onwards
                let updatedRow = user && user._originalData ? [...user._originalData] : new Array(7).fill("");
                // Update first 7 columns (A-G)
                updatedRow[0] = userForm.department || "";
                updatedRow[1] = userForm.givenBy || "";
                updatedRow[2] = userForm.username || "";
                updatedRow[3] = userForm.password || "";
                updatedRow[4] = userForm.role || "user";
                updatedRow[5] = userForm.email || "";
                updatedRow[6] = userForm.phone || "";

                formData.append("action", "update");
                formData.append("rowIndex", targetRowIndex.toString());
                formData.append("rowData", JSON.stringify(updatedRow));
            } else {
                formData.append("action", "insert");
                // For insert, we only send the 7 columns we know
                const rowArray = [
                    userForm.department || "",
                    userForm.givenBy || "",
                    userForm.username || "",
                    userForm.password || "",
                    userForm.role || "user",
                    userForm.email || "",
                    userForm.phone || ""
                ];
                formData.append("rowData", JSON.stringify(rowArray));
            }

            const response = await fetch(APPS_SCRIPT_URL, {
                method: "POST",
                body: formData,
            });

            const result = await response.json();

            if (result.success || response.ok) {
                alert(isEditing ? "User updated successfully!" : "User created successfully!");
                setShowUserModal(false);
                resetUserForm();
                await fetchData();
            } else {
                throw new Error(result.error || "Failed to save user");
            }

        } catch (error) {
            console.error("Error saving user:", error);
            // Some scripts return 200 but might fail, or Cors issues might happen
            // If the fetch fails but the sheet updates (common with GAS), we'll know on reload
            alert("Sent request to server. Please check if changes are reflected.");
            setShowUserModal(false);
            resetUserForm();
            await fetchData();
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEditUser = (userId) => {
        const user = users.find(u => u.id === userId);
        if (!user) return;
        setUserForm({
            username: user.username,
            email: user.email,
            password: user.password,
            phone: user.number,
            department: user.department,
            role: user.role,
            givenBy: user.givenBy || "",
        });
        setCurrentUserId(userId);
        setIsEditing(true);
        setShowUserModal(true);
    };

    const handleEditDepartment = (deptId) => {
        const dept = uniqueDepartments.find(d => d.id === deptId);
        if (!dept) return;
        setDeptForm({
            name: dept.department,
            givenBy: dept.givenBy,
        });
        setCurrentDeptId(deptId);
        setShowDeptModal(true);
    };

    const resetUserForm = () => {
        setUserForm({
            username: '',
            email: '',
            password: '',
            phone: '',
            department: '',
            role: 'user',
            givenBy: '',
        });
        setIsEditing(false);
        setCurrentUserId(null);
    };

    const handleSaveDepartment = async () => {
        if (!deptForm.name) {
            alert("Department name is required.");
            return;
        }

        try {
            setIsSubmitting(true);
            const dept = uniqueDepartments.find(d => d.id === currentDeptId);
            const oldName = dept ? dept.department : null;

            if (oldName) {
                // Find all users in this department
                const affectedUsers = users.filter(u => u.department === oldName);

                if (affectedUsers.length > 0) {
                    // Update each user's department in the sheet
                    for (const user of affectedUsers) {
                        const formData = new FormData();
                        formData.append("sheetName", "Whatsapp");
                        formData.append("action", "update");
                        formData.append("rowIndex", user._rowIndex.toString());

                        let updatedRow = [...user._originalData];
                        updatedRow[0] = deptForm.name; // Update Column A
                        updatedRow[1] = deptForm.givenBy || updatedRow[1] || ""; // Update Given By if provided

                        formData.append("rowData", JSON.stringify(updatedRow));

                        await fetch(APPS_SCRIPT_URL, {
                            method: "POST",
                            body: formData,
                        });
                    }
                }
            }

            alert("Department updated successfully!");
            setShowDeptModal(false);
            resetDeptForm();
            await fetchData();

        } catch (error) {
            console.error("Error saving department:", error);
            alert("Failed to save department changes.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const resetDeptForm = () => {
        setDeptForm({
            name: '',
            givenBy: '',
        });
        setCurrentDeptId(null);
    };

    const handleUserInputChange = (e) => {
        const { name, value } = e.target;
        setUserForm(prev => ({ ...prev, [name]: value }));
    };

    const handleDeptInputChange = (e) => {
        const { name, value } = e.target;
        setDeptForm(prev => ({ ...prev, [name]: value }));
    };

    // Filter handlers (client-side)
    const clearUsernameFilter = () => {
        setUsernameFilter('');
        setUsernameDropdownOpen(false);
    };

    const handleUsernameFilterSelect = (username) => {
        setUsernameFilter(username);
        setUsernameDropdownOpen(false);
    };

    const toggleUsernameDropdown = () => {
        setUsernameDropdownOpen(!usernameDropdownOpen);
    };

    // Styling helpers
    const getRoleColor = (role) => {
        const r = role ? role.toLowerCase() : "";
        if (r.includes('admin')) return 'bg-blue-100 text-blue-800';
        if (r.includes('manager')) return 'bg-purple-100 text-purple-800';
        return 'bg-gray-100 text-gray-800';
    };

    return (
        <AdminLayout>
            <div className="space-y-8 animate-in fade-in duration-500">
                {/* Header and Tabs */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
                    <div>
                        <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-linear-to-r from-purple-600 to-pink-600">
                            User Management System
                        </h1>
                        <p className="text-gray-500 mt-1">Manage your organization's users and departments</p>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="flex border border-purple-200 rounded-md overflow-hidden self-start">
                            <button
                                className={`flex px-4 py-3 text-sm font-medium ${activeTab === 'users' ? 'bg-purple-600 text-white' : 'bg-white text-purple-600 hover:bg-purple-50'}`}
                                onClick={() => handleTabChange('users')}
                            >
                                <User size={18} className="mr-2" />
                                Users
                            </button>
                            <button
                                className={`flex px-4 py-3 text-sm font-medium ${activeTab === 'departments' ? 'bg-purple-600 text-white' : 'bg-white text-purple-600 hover:bg-purple-50'}`}
                                onClick={() => handleTabChange('departments')}
                            >
                                <Building size={18} className="mr-2" />
                                Departments
                            </button>
                        </div>

                        {activeTab !== 'leave' && (
                            <button
                                onClick={handleAddButtonClick}
                                className="rounded-md gradient-bg py-2 px-4 text-white hover:from-blue-600 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                            >
                                <div className="flex items-center">
                                    <Plus size={18} className="mr-2" />
                                    <span>{activeTab === 'users' ? 'Add User' : 'Add Department'}</span>
                                </div>
                            </button>
                        )}
                    </div>
                </div>

                {/* User Modal */}
                {showUserModal && (
                    <div className="fixed inset-0 z-50 overflow-y-auto">
                        <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                            <div className="fixed inset-0 transition-opacity bg-black/20" onClick={() => setShowUserModal(false)}></div>
                            <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>
                            <div className="relative z-50 inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full sm:p-6">
                                <div className="absolute top-0 right-0 pt-4 pr-4">
                                    <button
                                        type="button"
                                        className="bg-white rounded-md text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                        onClick={() => setShowUserModal(false)}
                                    >
                                        <span className="sr-only">Close</span>
                                        <X className="h-6 w-6" aria-hidden="true" />
                                    </button>
                                </div>
                                <div className="sm:flex sm:items-start">
                                    <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                                        <h3 className="text-lg leading-6 font-medium text-gray-900">
                                            {isEditing ? 'Edit User' : 'Create New User'}
                                        </h3>
                                        <div className="mt-6">
                                            <form onSubmit={(e) => e.preventDefault()}>
                                                <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                                                    <div className="sm:col-span-3">
                                                        <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                                                            Username
                                                        </label>
                                                        <input
                                                            type="text"
                                                            name="username"
                                                            id="username"
                                                            value={userForm.username}
                                                            onChange={handleUserInputChange}
                                                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                                            required
                                                        />
                                                    </div>

                                                    <div className="sm:col-span-3">
                                                        <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                                                            Email
                                                        </label>
                                                        <input
                                                            type="email"
                                                            name="email"
                                                            id="email"
                                                            value={userForm.email}
                                                            onChange={handleUserInputChange}
                                                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                                            required
                                                        />
                                                    </div>

                                                    <div className="sm:col-span-3">
                                                        <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                                                            Password
                                                        </label>
                                                        <input
                                                            type="password"
                                                            name="password"
                                                            id="password"
                                                            value={userForm.password}
                                                            onChange={handleUserInputChange}
                                                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                                            required={!isEditing}
                                                        />
                                                    </div>

                                                    <div className="sm:col-span-3">
                                                        <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                                                            Phone
                                                        </label>
                                                        <input
                                                            type="tel"
                                                            name="phone"
                                                            id="phone"
                                                            value={userForm.phone}
                                                            onChange={handleUserInputChange}
                                                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                                            required
                                                        />
                                                    </div>

                                                    <div className="sm:col-span-3">
                                                        <label htmlFor="role" className="block text-sm font-medium text-gray-700">
                                                            Role
                                                        </label>
                                                        <select
                                                            id="role"
                                                            name="role"
                                                            value={userForm.role}
                                                            onChange={handleUserInputChange}
                                                            className="mt-1 block w-full bg-white border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                                        >
                                                            <option value="user">User</option>
                                                            <option value="admin">Admin</option>
                                                        </select>
                                                    </div>

                                                    <div className="sm:col-span-3">
                                                        <label htmlFor="department" className="block text-sm font-medium text-gray-700">
                                                            Department
                                                        </label>
                                                        <select
                                                            id="department"
                                                            name="department"
                                                            value={userForm.department}
                                                            onChange={handleUserInputChange}
                                                            className="mt-1 block w-full bg-white border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                                        >
                                                            <option value="">Select Department</option>
                                                            {uniqueDepartments.map(dept => (
                                                                <option key={dept.id} value={dept.department}>
                                                                    {dept.department}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </div>

                                                    <div className="sm:col-span-3">
                                                        <label htmlFor="givenBy" className="block text-sm font-medium text-gray-700">
                                                            Given By
                                                        </label>
                                                        <input
                                                            type="text"
                                                            name="givenBy"
                                                            id="givenBy"
                                                            value={userForm.givenBy}
                                                            onChange={handleUserInputChange}
                                                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                                        />
                                                    </div>
                                                </div>

                                                <div className="mt-6 flex justify-end space-x-3">
                                                    <button
                                                        type="button"
                                                        disabled={isSubmitting}
                                                        onClick={() => setShowUserModal(false)}
                                                        className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                                                    >
                                                        Cancel
                                                    </button>
                                                    <button
                                                        type="button"
                                                        disabled={isSubmitting}
                                                        onClick={handleSaveUser}
                                                        className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                                                    >
                                                        {isSubmitting ? (
                                                            <div className="flex items-center">
                                                                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                                                                <span>Saving...</span>
                                                            </div>
                                                        ) : (
                                                            <div className="flex items-center">
                                                                <Save size={18} className="mr-2" />
                                                                <span>{isEditing ? 'Update User' : 'Save User'}</span>
                                                            </div>
                                                        )}
                                                    </button>
                                                </div>
                                            </form>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Department Modal */}
                {showDeptModal && (
                    <div className="fixed inset-0 z-50 overflow-y-auto">
                        <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                            <div className="fixed inset-0 transition-opacity bg-black/20" onClick={() => setShowDeptModal(false)}></div>
                            <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>
                            <div className="relative z-50 inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
                                <div className="absolute top-0 right-0 pt-4 pr-4">
                                    <button
                                        type="button"
                                        className="bg-white rounded-md text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                        onClick={() => setShowDeptModal(false)}
                                    >
                                        <span className="sr-only">Close</span>
                                        <X className="h-6 w-6" aria-hidden="true" />
                                    </button>
                                </div>
                                <div className="sm:flex sm:items-start">
                                    <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                                        <h3 className="text-lg leading-6 font-medium text-gray-900">
                                            {currentDeptId ? 'Edit Department' : 'Create New Department'}
                                        </h3>
                                        <div className="mt-6">
                                            <form onSubmit={(e) => e.preventDefault()}>
                                                <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                                                    <div className="sm:col-span-6">
                                                        <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                                                            Department Name
                                                        </label>
                                                        <input
                                                            type="text"
                                                            name="name"
                                                            id="name"
                                                            value={deptForm.name}
                                                            onChange={handleDeptInputChange}
                                                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                                            required
                                                        />
                                                    </div>

                                                    <div className="sm:col-span-6">
                                                        <label htmlFor="givenBy" className="block text-sm font-medium text-gray-700">
                                                            Given By
                                                        </label>
                                                        <input
                                                            type="text"
                                                            id="givenBy"
                                                            name="givenBy"
                                                            value={deptForm.givenBy}
                                                            onChange={handleDeptInputChange}
                                                            className="mt-1 block w-full bg-white border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                                            placeholder="Enter Given By"
                                                            required
                                                        />
                                                    </div>
                                                </div>

                                                <div className="mt-6 flex justify-end space-x-3">
                                                    <button
                                                        type="button"
                                                        disabled={isSubmitting}
                                                        onClick={() => setShowDeptModal(false)}
                                                        className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                                                    >
                                                        Cancel
                                                    </button>
                                                    <button
                                                        type="button"
                                                        disabled={isSubmitting}
                                                        onClick={handleSaveDepartment}
                                                        className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                                                    >
                                                        {isSubmitting ? (
                                                            <div className="flex items-center">
                                                                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                                                                <span>Saving...</span>
                                                            </div>
                                                        ) : (
                                                            <div className="flex items-center">
                                                                <Save size={18} className="mr-2" />
                                                                <span>{currentDeptId ? 'Update Department' : 'Save Department'}</span>
                                                            </div>
                                                        )}
                                                    </button>
                                                </div>
                                            </form>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Users Tab */}
                {activeTab === 'users' && (
                    <div className="bg-white shadow rounded-lg overflow-hidden border border-purple-200">
                        <div className="bg-linear-to-r from-purple-50 to-pink-50 border-b border-purple px-6 py-4 border-gray-200 flex justify-between items-center">
                            <h2 className="text-lg font-medium text-purple-700">User List</h2>

                            {/* Username Filter */}
                            <div className="relative">
                                <div className="flex items-center gap-2">
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                                        <input
                                            type="text"
                                            list="usernameOptions"
                                            placeholder="Filter by username..."
                                            value={usernameFilter}
                                            onChange={(e) => setUsernameFilter(e.target.value)}
                                            className="w-48 pl-10 pr-8 py-2 border border-purple-200 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                                        />
                                        <datalist id="usernameOptions">
                                            {users.map(user => (
                                                <option key={user.id} value={user.username} />
                                            ))}
                                        </datalist>

                                        {usernameFilter && (
                                            <button
                                                onClick={clearUsernameFilter}
                                                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                            >
                                                <X size={16} />
                                            </button>
                                        )}
                                    </div>

                                    <button
                                        onClick={toggleUsernameDropdown}
                                        className="flex items-center gap-1 px-3 py-2 border border-purple-200 rounded-md bg-white text-sm text-gray-700 hover:bg-gray-50"
                                    >
                                        <ChevronDown size={16} className={`transition-transform ${usernameDropdownOpen ? 'rotate-180' : ''}`} />
                                    </button>
                                </div>

                                {usernameDropdownOpen && (
                                    <div className="absolute z-50 mt-1 w-56 rounded-md bg-white shadow-lg border border-gray-200 max-h-60 overflow-auto top-full right-0">
                                        <div className="py-1">
                                            <button
                                                onClick={clearUsernameFilter}
                                                className={`block w-full text-left px-4 py-2 text-sm ${!usernameFilter ? 'bg-purple-100 text-purple-900' : 'text-gray-700 hover:bg-gray-100'}`}
                                            >
                                                All Usernames
                                            </button>
                                            {users.map(user => (
                                                <button
                                                    key={user.id}
                                                    onClick={() => handleUsernameFilterSelect(user.username)}
                                                    className={`block w-full text-left px-4 py-2 text-sm ${usernameFilter === user.username ? 'bg-purple-100 text-purple-900' : 'text-gray-700 hover:bg-gray-100'}`}
                                                >
                                                    {user.username}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="h-[calc(100vh-275px)] overflow-auto" style={{ maxHeight: 'calc(100vh - 220px)' }}>
                            {loading ? (
                                <div className="flex justify-center items-center h-full">
                                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
                                </div>
                            ) : (
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Department
                                            </th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Given By
                                            </th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Username
                                            </th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Password
                                            </th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Role
                                            </th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Email
                                            </th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Number
                                            </th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Actions
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {users
                                            .filter(user =>
                                                user.username &&
                                                user.username !== 'admin' &&
                                                user.username !== 'DSMC' &&
                                                (!usernameFilter || user.username.toLowerCase().includes(usernameFilter.toLowerCase()))
                                            )
                                            .map((user) => (
                                                <tr key={user.id} className="hover:bg-gray-50">
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="text-sm font-medium text-gray-900">{user.department || 'N/A'}</div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="text-sm text-gray-900">{user.givenBy || 'N/A'}</div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="text-sm font-medium text-gray-900">{user.username}</div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="text-sm text-gray-900">{user.password}</div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getRoleColor(user.role)}`}>
                                                            {user.role}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="text-sm text-gray-900">{user.email}</div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="text-sm text-gray-900">{user.number}</div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                        <div className="flex space-x-2">
                                                            <button
                                                                onClick={() => handleEditUser(user.id)}
                                                                className="text-blue-600 hover:text-blue-900"
                                                            >
                                                                <Edit size={18} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                )}

                {/* Departments Tab */}
                {activeTab === 'departments' && (
                    <div className="bg-white shadow rounded-lg overflow-hidden border border-purple-200">
                        <div className="bg-linear-to-r from-purple-50 to-pink-50 border-b border-purple px-6 py-4 border-gray-200">
                            <div className="flex justify-between items-center">
                                <h2 className="text-lg font-medium text-purple-700">Department Management</h2>

                                <div className="flex border border-purple-200 rounded-md overflow-hidden">
                                    <button
                                        className={`px-4 py-2 text-sm font-medium ${activeDeptSubTab === 'departments' ? 'bg-purple-600 text-white' : 'bg-white text-purple-600 hover:bg-purple-50'}`}
                                        onClick={() => setActiveDeptSubTab('departments')}
                                    >
                                        Departments
                                    </button>
                                    <button
                                        className={`px-4 py-2 text-sm font-medium ${activeDeptSubTab === 'givenBy' ? 'bg-purple-600 text-white' : 'bg-white text-purple-600 hover:bg-purple-50'}`}
                                        onClick={() => setActiveDeptSubTab('givenBy')}
                                    >
                                        Given By
                                    </button>
                                </div>
                            </div>
                        </div>

                        {activeDeptSubTab === 'departments' && (
                            <div className="h-[calc(100vh-275px)] overflow-auto" style={{ maxHeight: 'calc(100vh - 220px)' }}>
                                {loading ? (
                                    <div className="flex justify-center items-center h-full">
                                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
                                    </div>
                                ) : (
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    ID
                                                </th>
                                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Department Name
                                                </th>
                                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Actions
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {uniqueDepartments.map((dept, index) => (
                                                <tr key={dept.id} className="hover:bg-gray-50">
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{index + 1}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{dept.department}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                        <div className="flex space-x-2">
                                                            <button
                                                                onClick={() => handleEditDepartment(dept.id)}
                                                                className="text-blue-600 hover:text-blue-900"
                                                            >
                                                                <Edit size={18} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        )}

                        {activeDeptSubTab === 'givenBy' && (
                            <div className="h-[calc(100vh-275px)] overflow-auto" style={{ maxHeight: 'calc(100vh - 220px)' }}>
                                {loading ? (
                                    <div className="flex justify-center items-center h-full">
                                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
                                    </div>
                                ) : (
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    ID
                                                </th>
                                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Given By
                                                </th>
                                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Actions
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {uniqueDepartments.map((dept, index) => (
                                                <tr key={dept.id} className="hover:bg-gray-50">
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{index + 1}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{dept.givenBy}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                        <div className="flex space-x-2">
                                                            <button
                                                                onClick={() => handleEditDepartment(dept.id)}
                                                                className="text-blue-600 hover:text-blue-900"
                                                            >
                                                                <Edit size={18} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </AdminLayout>
    );
};

export default Settings;