import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";

import { useLoginMutation } from "../services/api/authApi";
import { setCredentials } from "../store/authSlice";

function LoginPage() {
    const navigate = useNavigate();
    const dispatch = useDispatch();

    const [login, { isLoading }] = useLoginMutation();

    const [formData, setFormData] = useState({
        email: "",
        password: "",
    });

    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const handleChange = (e) => {
        setFormData((prev) => ({
            ...prev,
            [e.target.name]: e.target.value,
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setSuccess("");

        try {
            const response = await login(formData).unwrap();

            dispatch(
                setCredentials({
                    admin: response.admin,
                })
            );
            setSuccess(`Welcome back, ${response.admin.name}!`);

            setTimeout(() => {
                navigate("/dashboard");
            }, 1500);
        } catch (err) {
            setError(
                err?.data?.message ||
                err?.message ||
                "Invalid email or password"
            );
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
            <div className="w-full max-w-md">
                <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8">
                    <div className="text-center mb-8">
                        <div className="mx-auto mb-4 w-14 h-14 rounded-xl bg-blue-600 flex items-center justify-center">
                            <span className="text-white text-2xl font-bold">R</span>
                        </div>

                        <h1 className="text-2xl font-bold text-slate-900">
                            Roster Management System
                        </h1>

                        <p className="mt-2 text-sm text-slate-500">
                            Sign in to your admin account
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label
                                htmlFor="email"
                                className="block text-sm font-medium text-slate-700 mb-2"
                            >
                                Email
                            </label>

                            <input
                                id="email"
                                name="email"
                                type="email"
                                value={formData.email}
                                onChange={handleChange}
                                placeholder="admin@rms.com"
                                required
                                className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                            />
                        </div>

                        <div>
                            <label
                                htmlFor="password"
                                className="block text-sm font-medium text-slate-700 mb-2"
                            >
                                Password
                            </label>

                            <input
                                id="password"
                                name="password"
                                type="password"
                                value={formData.password}
                                onChange={handleChange}
                                placeholder="Enter your password"
                                required
                                className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                            />
                        </div>

                        {success && (
                            <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-600">
                                {success}
                            </div>
                        )}

                        {error && (
                            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full rounded-lg bg-blue-600 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {isLoading ? "Signing in..." : "Sign In"}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}

export default LoginPage;