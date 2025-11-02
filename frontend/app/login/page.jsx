"use client";
import axiosClient from "../api/axiosClient";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await axiosClient.post("/login", { email, password });

      localStorage.setItem("access_token", response.data.access_token);
      localStorage.setItem("refresh_token", response.data.refresh_token);


      router.push("/dashboard");

      console.log("Login success:", response.data);
    } catch (error) {
      setError(error?.response?.data?.detail || "Login failed");
      console.error("Login failed:", error?.response?.data || error?.message);
    }
  };

  return (
    <div className="min-h-screen flex bg-linear-to-br from-green-900 via-green-800 to-green-700">
      <div className="hidden lg:block lg:w-1/3"></div>
      <div className="flex flex-col justify-center items-center w-full lg:w-2/3 bg-[#F3F8F3] lg:rounded-l-[3rem] shadow-xl px-10 py-12">
        <div className="max-w-md w-full">
          <h1 className="text-4xl font-bold text-center text-gray-900 mb-3">
            Hello!
          </h1>
          
          <p className="text-center text-gray-600 text-sm mb-10">
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
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:outline-none bg-white text-gray-900"
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
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:outline-none bg-white text-gray-900"
              />
            </div>

            <div className="pt-4">
              <button
                type="submit"
                 className="w-3/5 bg-white text-gray-900 font-semibold py-3 rounded-full shadow-md hover:bg-gray-50 transition border border-gray-200 mx-auto block"
              >
                Login
              </button>
            </div>
          </form>
 
          <p className="text-center text-sm text-gray-600 mt-8">
             <a href="/register" className="text-green-700 font-medium hover:underline">
             Create an account
            </a>
           
          </p>
        </div>
      </div>
    </div>
  );
}