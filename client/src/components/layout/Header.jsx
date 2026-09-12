import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
    Bell,
    ChevronDown,
    LogOut,
    Menu,
    Moon,
    Sun,
} from "lucide-react";



import { useLogoutMutation } from "../../services/api/authApi";
import { useGetLeavesQuery } from "../../services/api/leaveApi";
import { logout } from "../../store/authSlice";
import { applyTheme, getStoredTheme } from "../../../utils/theme";

function Header({ sidebarOpen, setSidebarOpen }) {
    const admin = useSelector((state) => state.auth.admin);

    const dispatch = useDispatch();
    const navigate = useNavigate();

    const [logoutApi, { isLoading }] = useLogoutMutation();
    const { data: leavesData } = useGetLeavesQuery({
        status: "Pending",
        page: 1,
        limit: 5,
    });

    const pendingLeaves = leavesData?.data || [];
    const notificationCount = pendingLeaves.length;

    const [showMenu, setShowMenu] = useState(false);
    const [showNotifications, setShowNotifications] = useState(false);

    const [darkMode, setDarkMode] = useState(
        () => getStoredTheme() === "dark"
    );
    useEffect(() => {
    const handleThemeChange = (event) => {
        setDarkMode(event.detail === "dark");
    };

    window.addEventListener("roster-theme-change", handleThemeChange);

    return () => {
        window.removeEventListener(
            "roster-theme-change",
            handleThemeChange
        );
    };
}, []);

    const toggleDarkMode = () => {
        const nextTheme = darkMode ? "light" : "dark";

        setDarkMode(!darkMode);
        applyTheme(nextTheme);
    };

    const handleLogout = async () => {
        try {
            await logoutApi().unwrap();
        } catch (error) {
            console.error("Logout error:", error);
        } finally {
            dispatch(logout());
            navigate("/login", { replace: true });
        }
    };

    return (
        <header className="h-16 bg-slate-200/90 border-b border-slate-200 px-6 flex items-center justify-between">
            {/* Left */}
            <div className="flex">
                <button
                    onClick={() => setSidebarOpen(!sidebarOpen)}
                    className="lg:hidden p-2 mr-2 rounded-lg hover:bg-slate-100 text-slate-600"
                    aria-label="Open menu"
                >
                    <Menu size={22} />
                </button>
                <h2 className="text-lg font-semibold text-slate-900">
                    CCC - Roster Management
                </h2>
            </div>

            {/* Right */}
            <div className="flex items-center gap-5">
                {/* Theme Toggle */}
                <button
                    type="button"
                    onClick={toggleDarkMode}
                    className="rounded-lg p-2 text-slate-500 hover:bg-slate-50 hover:text-slate-700"
                    aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
                    title={darkMode ? "Light mode" : "Dark mode"}
                >
                    {darkMode ? <Sun size={20} /> : <Moon size={20} />}
                </button>
                {/* Notifications */}
                <div className="relative">
                    <button
                        type="button"
                        onClick={() => setShowNotifications((prev) => !prev)}
                        className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-50 hover:text-slate-700"
                        aria-label="Notifications"
                    >
                        <Bell size={20} />

                        {notificationCount > 0 && (
                            <span className="absolute right-1.5 top-1.5 flex h-2 w-2 rounded-full bg-red-500" />
                        )}
                    </button>

                    {showNotifications && (
                        <div className="absolute right-0 top-full z-50 mt-2 w-[calc(100vw-2rem)] max-w-sm rounded-xl border border-slate-200 bg-white shadow-lg">
                            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                                <div>
                                    <p className="text-sm font-semibold text-slate-900">
                                        Notifications
                                    </p>
                                    <p className="text-xs text-slate-500">
                                        {notificationCount} pending leave request
                                        {notificationCount !== 1 ? "s" : ""}
                                    </p>
                                </div>
                            </div>

                            <div className="max-h-80 overflow-y-auto">
                                {pendingLeaves.length === 0 ? (
                                    <div className="px-4 py-8 text-center">
                                        <p className="text-sm text-slate-500">
                                            No new notifications
                                        </p>
                                    </div>
                                ) : (
                                    pendingLeaves.map((leave) => (
                                        <div
                                            key={leave._id}
                                            onClick={() => {
                                                setShowNotifications(false);
                                                navigate(`/leaves/${leave._id}`);
                                            }}
                                            className="cursor-pointer border-b border-slate-100 px-4 py-3 transition hover:bg-slate-50 last:border-b-0"
                                        >
                                            <p className="text-sm font-medium text-slate-800">
                                                Leave request pending
                                            </p>

                                            <p className="mt-1 text-xs text-slate-500">
                                                {leave.employee?.name ||
                                                    "Employee"}{" "}
                                                has a leave request awaiting approval.
                                            </p>

                                            <p className="mt-1 text-xs text-slate-400">
                                                {leave.startDate
                                                    ? new Date(
                                                        leave.startDate
                                                    ).toLocaleDateString()
                                                    : ""}
                                            </p>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Admin Menu */}
                <div className="relative" >

                    <button
                        type="button"
                        onClick={() => setShowMenu((prev) => !prev)}
                        className="flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-slate-50"
                    >
                        <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center">
                            <span className="text-sm font-semibold text-blue-600">
                                {admin?.name?.charAt(0)?.toUpperCase() || "A"}
                            </span>
                        </div>

                        <div className="hidden sm:block text-left">
                            <p className="text-sm font-medium text-slate-900">
                                {admin?.name || "Admin"}
                            </p>

                            <p className="text-xs text-slate-500">
                                {admin?.role || "Administrator"}
                            </p>
                        </div>

                        <ChevronDown
                            size={16}
                            className={`text-slate-400 transition-transform ${showMenu ? "rotate-180" : ""
                                }`}
                        />
                    </button>

                    {/* Dropdown */}
                    {showMenu && (
                        <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-lg py-2 z-50">
                            <div className="px-4 py-2 border-b border-slate-100">
                                <p className="text-sm font-medium text-slate-900">
                                    {admin?.name || "Admin"}
                                </p>

                                <p className="text-xs text-slate-500 mt-0.5">
                                    {admin?.email || ""}
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={() => {
                                    setShowMenu(false);
                                    navigate("/profile");
                                }}
                                className="w-full px-4 py-2.5 flex items-center gap-3 text-sm text-slate-700 hover:bg-slate-50"
                            >
                                Profile Settings
                            </button>

                            <button
                                type="button"
                                onClick={handleLogout}
                                disabled={isLoading}
                                className="w-full px-4 py-2.5 flex items-center gap-3 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
                            >
                                <LogOut size={17} />

                                {isLoading ? "Logging out..." : "Logout"}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}

export default Header;