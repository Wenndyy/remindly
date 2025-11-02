"use client";
import { useState } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    password: "",
    confirm_password: "",
  });
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirm_password) {
      setError("Passwords do not match");
      return;
    }

    try {
      await axios.post("http://127.0.0.1:8000/register", {
        first_name: form.first_name,
        last_name: form.last_name,
        email: form.email,
        password: form.password,
      });
      router.push("/login");
    } catch (err) {
      setError(err.response?.data?.detail || "Registration failed");
    }
  };

  return (
    <div className="min-h-screen flex bg-linear-to-br from-green-900 via-green-800 to-green-700">
      <div className="hidden lg:block lg:w-1/3"></div>
      <div className="flex flex-col justify-center items-center w-full lg:w-2/3 bg-[#F3F8F3] lg:rounded-l-[3rem] shadow-xl px-10 py-12">
        <div className="max-w-2xl w-full">
          <h1 className="text-3xl font-bold text-center text-gray-900 mb-10">
            Sign Up
          </h1>

          {error && (
            <p className="text-center text-red-500 mb-4 text-sm">{error}</p>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">
                  First Name
                </label>
                <input
                  type="text"
                  value={form.first_name}
                  onChange={(e) =>
                    setForm({ ...form, first_name: e.target.value })
                  }
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:outline-none bg-white text-gray-900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">
                   Last Name
                </label>
                <input
                  type="text"
                  value={form.last_name}
                  onChange={(e) =>
                    setForm({ ...form, last_name: e.target.value })
                  }
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:outline-none bg-white text-gray-900"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600 mb-2">
                Email
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:outline-none bg-white text-gray-900"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600 mb-2">
                New Password
              </label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:outline-none bg-white text-gray-900"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600 mb-2">
                Confirm Password
              </label>
              <input
                type="password"
                value={form.confirm_password}
                onChange={(e) =>
                  setForm({ ...form, confirm_password: e.target.value })
                }
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:outline-none bg-white text-gray-900"
              />
            </div>

            <div className="pt-4">
              <button
                type="submit"
               className="w-3/5 bg-white text-gray-900 font-semibold py-3 rounded-full shadow-md hover:bg-gray-50 transition border border-gray-200 mx-auto block"
              >
                Create account
              </button>
            </div>
          </form>

          <p className="text-center text-sm text-gray-600 mt-8">
            Already have an account?{" "}
            <a href="/login" className="text-green-700 font-medium hover:underline">
              Login
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}