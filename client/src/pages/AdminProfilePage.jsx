import { useEffect, useState } from "react";
import {
  useChangePasswordMutation,
  useGetProfileQuery,
  useUpdateProfileMutation,
} from "../services/api/authApi";

function AdminProfilePage() {
  const { data, isLoading, isError, error } = useGetProfileQuery();

  const [updateProfile, { isLoading: isUpdating }] =
    useUpdateProfileMutation();

  const [changePassword, { isLoading: isChangingPassword }] =
    useChangePasswordMutation();

  const [profileForm, setProfileForm] = useState({
    name: "",
    email: "",
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [profileMessage, setProfileMessage] = useState("");
  const [profileError, setProfileError] = useState("");

  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordError, setPasswordError] = useState("");

  useEffect(() => {
    if (data?.admin) {
      setProfileForm({
        name: data.admin.name || "",
        email: data.admin.email || "",
      });
    }
  }, [data]);

  const handleProfileChange = (event) => {
    setProfileForm((prev) => ({
      ...prev,
      [event.target.name]: event.target.value,
    }));
  };

  const handlePasswordChange = (event) => {
    setPasswordForm((prev) => ({
      ...prev,
      [event.target.name]: event.target.value,
    }));
  };

  const handleProfileSubmit = async (event) => {
    event.preventDefault();

    setProfileMessage("");
    setProfileError("");

    try {
      const response = await updateProfile(profileForm).unwrap();

      setProfileMessage(
        response?.message || "Profile updated successfully."
      );
    } catch (err) {
      setProfileError(
        err?.data?.message || "Unable to update profile."
      );
    }
  };

  const handlePasswordSubmit = async (event) => {
    event.preventDefault();

    setPasswordMessage("");
    setPasswordError("");

    if (passwordForm.newPassword.length < 8) {
      setPasswordError(
        "New password must be at least 8 characters."
      );
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError("New passwords do not match.");
      return;
    }

    try {
      const response = await changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      }).unwrap();

      setPasswordMessage(
        response?.message || "Password changed successfully."
      );

      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (err) {
      setPasswordError(
        err?.data?.message || "Unable to change password."
      );
    }
  };

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-500">
            Loading profile...
          </p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-4 sm:p-6">
        <div className="rounded-xl border border-red-200 bg-red-50 p-6">
          <p className="text-sm font-medium text-red-700">
            Unable to load admin profile.
          </p>
          <p className="mt-1 text-sm text-red-600">
            {error?.data?.message || "Something went wrong."}
          </p>
        </div>
      </div>
    );
  }

  const admin = data?.admin;

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl">
          Profile Settings
        </h1>

        <p className="mt-1 text-sm text-slate-500">
          Manage your administrator account and security settings.
        </p>
      </div>

      {/* Profile Information */}
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <h2 className="text-base font-semibold text-slate-900">
          Profile Information
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Update your name and email address.
        </p>

        <form
          onSubmit={handleProfileSubmit}
          className="mt-5 space-y-4"
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
              label="Name"
              name="name"
              value={profileForm.name}
              onChange={handleProfileChange}
              required
            />

            <FormField
              label="Email"
              name="email"
              type="email"
              value={profileForm.email}
              onChange={handleProfileChange}
              required
            />
          </div>

          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Role
            </p>

            <p className="mt-1 text-sm font-medium capitalize text-slate-800">
              {admin?.role || "—"}
            </p>
          </div>

          {profileMessage && (
            <MessageBox type="success">
              {profileMessage}
            </MessageBox>
          )}

          {profileError && (
            <MessageBox type="error">
              {profileError}
            </MessageBox>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isUpdating}
              className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isUpdating ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </section>

      {/* Change Password */}
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <h2 className="text-base font-semibold text-slate-900">
          Change Password
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Update your administrator account password.
        </p>

        <form
          onSubmit={handlePasswordSubmit}
          className="mt-5 max-w-xl space-y-4"
        >
          <FormField
            label="Current Password"
            name="currentPassword"
            type="password"
            value={passwordForm.currentPassword}
            onChange={handlePasswordChange}
            required
          />

          <FormField
            label="New Password"
            name="newPassword"
            type="password"
            value={passwordForm.newPassword}
            onChange={handlePasswordChange}
            required
          />

          <FormField
            label="Confirm New Password"
            name="confirmPassword"
            type="password"
            value={passwordForm.confirmPassword}
            onChange={handlePasswordChange}
            required
          />

          <p className="text-xs text-slate-400">
            Password must contain at least 8 characters.
          </p>

          {passwordMessage && (
            <MessageBox type="success">
              {passwordMessage}
            </MessageBox>
          )}

          {passwordError && (
            <MessageBox type="error">
              {passwordError}
            </MessageBox>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isChangingPassword}
              className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isChangingPassword
                ? "Changing..."
                : "Change Password"}
            </button>
          </div>
        </form>
      </section>

      {/* Account Information */}
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <h2 className="text-base font-semibold text-slate-900">
          Account Information
        </h2>

        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <InfoField
            label="Account Created"
            value={
              admin?.createdAt
                ? new Date(admin.createdAt).toLocaleDateString()
                : "—"
            }
          />

          <InfoField
            label="Last Updated"
            value={
              admin?.updatedAt
                ? new Date(admin.updatedAt).toLocaleDateString()
                : "—"
            }
          />
        </div>
      </section>
    </div>
  );
}

function FormField({
  label,
  name,
  type = "text",
  value,
  onChange,
  required = false,
}) {
  return (
    <div>
      <label
        htmlFor={name}
        className="block text-sm font-medium text-slate-700"
      >
        {label}
      </label>

      <input
        id={name}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        required={required}
        className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
      />
    </div>
  );
}

function InfoField({ label, value }) {
  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50 p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p className="mt-1 text-sm font-medium text-slate-800">
        {value}
      </p>
    </div>
  );
}

function MessageBox({ type, children }) {
  const isSuccess = type === "success";

  return (
    <div
      className={`rounded-lg border px-3 py-2.5 text-sm ${
        isSuccess
          ? "border-green-200 bg-green-50 text-green-700"
          : "border-red-200 bg-red-50 text-red-700"
      }`}
    >
      {children}
    </div>
  );
}

export default AdminProfilePage;