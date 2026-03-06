import { useEffect, useState } from "react";
import { useAuth } from "../hooks/useAuth.js";

const Profile = () => {
  const { user, updateUserProfile } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [avatarPreview, setAvatarPreview] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    setName(user?.name || "");
    setEmail(user?.email || "");
    setAvatarPreview(user?.avatar || "");
  }, [user?.name, user?.email, user?.avatar]);

  const handleAvatarChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setAvatarPreview(String(reader.result || ""));
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = (event) => {
    event.preventDefault();
    setSuccessMessage("");
    setErrorMessage("");

    if (!name.trim() || !email.trim()) {
      setErrorMessage("Name and email are required.");
      return;
    }

    if (newPassword || confirmPassword) {
      if (newPassword.length < 8) {
        setErrorMessage("New password must be at least 8 characters.");
        return;
      }

      if (newPassword !== confirmPassword) {
        setErrorMessage("Password confirmation does not match.");
        return;
      }
    }

    updateUserProfile({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      avatar: avatarPreview,
    });

    setNewPassword("");
    setConfirmPassword("");
    setSuccessMessage(
      newPassword
        ? "Profile saved. Password change is ready and will apply when backend profile update endpoint is enabled."
        : "Profile updated successfully."
    );
  };

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200/80 bg-white/95 p-5 shadow-panel dark:border-slate-800 dark:bg-slate-900/85">
        <h1 className="font-heading text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          Profile
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          Manage your profile details and account preferences.
        </p>
      </section>

      <section className="rounded-3xl border border-slate-200/80 bg-white/95 p-5 shadow-panel dark:border-slate-800 dark:bg-slate-900/85">
        <form onSubmit={handleSaveProfile} className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
            <span className="inline-flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl border border-slate-300 bg-slate-100 text-xl font-bold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100">
              {avatarPreview ? (
                <img src={avatarPreview} alt={name || "Profile"} className="h-full w-full object-cover" />
              ) : (
                (name || "U").trim().charAt(0).toUpperCase()
              )}
            </span>

            <label className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800">
              Upload Profile Picture
              <input
                type="file"
                accept=".jpg,.jpeg,.png,image/jpeg,image/png"
                onChange={handleAvatarChange}
                className="hidden"
              />
            </label>
          </div>

          <label className="text-sm text-slate-700 dark:text-slate-200">
            Name
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-800 focus:border-sky-400 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              required
            />
          </label>

          <label className="text-sm text-slate-700 dark:text-slate-200">
            Email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-800 focus:border-sky-400 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              required
            />
          </label>

          <label className="text-sm text-slate-700 dark:text-slate-200">
            New Password
            <input
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              placeholder="Minimum 8 characters"
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-800 focus:border-sky-400 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
          </label>

          <label className="text-sm text-slate-700 dark:text-slate-200">
            Confirm Password
            <input
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-800 focus:border-sky-400 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
          </label>

          <div className="md:col-span-2 flex items-center justify-end">
            <button
              type="submit"
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-sky-600 dark:hover:bg-sky-500"
            >
              Save Profile
            </button>
          </div>
        </form>

        {successMessage ? (
          <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-300">
            {successMessage}
          </p>
        ) : null}
        {errorMessage ? (
          <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-200">
            {errorMessage}
          </p>
        ) : null}
      </section>
    </div>
  );
};

export default Profile;
