"use client";
import axiosClient from "../api/axiosClient";
import { useState, useEffect, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useUser } from "../../contexts/UserContext";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();
  const { refreshUser } = useUser();

  useEffect(() => {
    const accessToken = localStorage.getItem("access_token");
    if (accessToken) {

      router.replace("/dashboard");
    }
  }, [router]);

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const response = await axiosClient.post("/login", { email, password });


      localStorage.setItem("access_token", response.data.access_token);
      localStorage.setItem("refresh_token", response.data.refresh_token);

      // Refresh user context to fetch profile data (including avatar) before redirect
      await refreshUser();

      router.replace("/dashboard");

    } catch (err: any) {
      // Handle different error scenarios
      let message = "Login failed";

      if (err?.response) {
        // Server responded with an error status
        const responseData = err.response.data;
        if (typeof responseData === 'string') {
          message = responseData;
        } else if (responseData?.detail) {
          message = responseData.detail;
        } else if (responseData?.message) {
          message = responseData.message;
        }
        console.error("Login failed - Server error:", err.response.status, responseData);
      } else if (err?.request) {
        // Request was made but no response received (network error)
        message = "Unable to connect to server. Please check your connection.";
        console.error("Login failed - Network error:", err.request);
      } else if (err?.message) {
        // Something else went wrong
        message = err.message;
        console.error("Login failed - Error:", err.message);
      } else {
        console.error("Login failed - Unknown error:", err);
      }

      setError(message);
    }
  };

  return (
    <div className="min-h-screen flex bg-linear-to-br" style={{ backgroundImage: "url('/background.svg')" }}>
      <div className="hidden lg:flex lg:w-1/3 items-center justify-center ">
        <img src="/notification.svg" alt="Ilustrasi notifikasi" />
      </div>
      <div className="relative  flex flex-col justify-center items-center w-full lg:w-2/3 bg-[#F3F8F3] lg:rounded-l-[3rem] shadow-xl px-10 py-12">
         <div className="absolute top-6 left-6 flex items-center gap-3 justify-center ">
            <img src="/logo_red.svg" alt="Logo" className="w-[35px] h-[35px]" />
            <div className={`font-bold text-2xl select-none transition-opacity bg-linear-to-r from-[#B6252A] to-[#501012] bg-clip-text text-transparent text-center`}>Remindly</div>
          </div>
        <div className="max-w-md w-full">
          
          <h1 className="text-4xl font-bold text-center text-[#B6252A] mb-3">
            Hello!
          </h1>

          <p className="text-center text-[#B6252A] text-sm mb-10">
            Start your experience with Remindly by signing in or signing up.
          </p>

          {error && (
            <p className="text-center text-red-500 mb-4 text-sm">{error}</p>
          )}

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#B6252A] focus:outline-none bg-white text-gray-900"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600 mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#B6252A] focus:outline-none bg-white text-gray-900"
              />
            </div>

            <div className="pt-4">
              <button
                type="submit"
                className="w-3/5 bg-[#B6252A] text-white hover:text-black font-semibold py-3 rounded-full shadow-md hover:bg-gray-50 transition border border-gray-200 mx-auto block"
              >
                Login
              </button>
            </div>
          </form>

          <p className="text-center text-sm text-gray-600 mt-8">
            Don't have an account?{" "}
            <Link href="/register" className="text-[#511914] font-medium hover:underline">
              Register
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
