"use client";
import { useState,useEffect } from "react";
import axiosClient from "../api/axiosClient";
import { useRouter } from "next/navigation";
import Link from "next/link";

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

   useEffect(() => {
      const accessToken = localStorage.getItem("access_token");
      if (accessToken) {
        
        router.replace("/dashboard");
      }
    }, [router]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    if (form.password !== form.confirm_password) {
      setError("Passwords do not match");
      return;
    }

    try {
      await axiosClient.post("/register", {
        first_name: form.first_name,
        last_name: form.last_name,
        email: form.email,
        password: form.password,
      });
      router.replace("/login");
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Registration failed");
    }
  };

  return (
    <div className="min-h-screen flex bg-linear-to-br "  style={{ backgroundImage: "url('/background.svg')" }}>
     <div className="hidden lg:flex lg:w-1/3 items-center justify-center ">
        <img src="/notification.svg" alt="Ilustrasi notifikasi" />
      </div>

      <div className="relative flex flex-col justify-center items-center w-full lg:w-2/3 bg-[#F3F8F3] lg:rounded-l-[3rem] shadow-xl px-10 py-12">
        <div className="absolute top-6 left-6 flex items-center gap-3 justify-center ">
            <img src="/logo_red.svg" alt="Logo" className="w-[35px] h-[35px]" />
            <div className={`font-bold text-2xl select-none transition-opacity bg-linear-to-r from-[#B6252A] to-[#501012] bg-clip-text text-transparent text-center`}>Remindly</div>
          </div>
        <div className="max-w-2xl w-full">
          <h1 className="text-3xl font-bold text-center  mb-10 text-[#511914]">
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
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#B6252A] focus:outline-none bg-white text-gray-900"
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
                   className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#B6252A] focus:outline-none bg-white text-gray-900"
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
                 className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#B6252A] focus:outline-none bg-white text-gray-900"
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
                 className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#B6252A] focus:outline-none bg-white text-gray-900"
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
                 className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#B6252A] focus:outline-none bg-white text-gray-900"
              />
            </div>

            <div className="pt-4">
              <button
                type="submit"
               className="w-3/5  bg-[#B6252A]  text-white hover:text-black font-semibold py-3 rounded-full shadow-md hover:bg-gray-50 transition border border-gray-200 mx-auto block"
              >
                Create account
              </button>
            </div>
          </form>

          <p className="text-center text-sm text-gray-600 mt-8">
            Already have an account?{" "}
            <Link href="/login" className="text-[#511914] font-medium hover:underline">
              Login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
