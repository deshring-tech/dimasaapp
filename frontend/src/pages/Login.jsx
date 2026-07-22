import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { sendOTP, verifyOTP } from "../api";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState("phone"); // "phone" | "otp"
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSendOTP = async () => {
    if (phone.length < 10) return setError("Enter a valid 10-digit phone number");
    setError("");
    setLoading(true);
    try {
      await sendOTP(phone);
      setStep("otp");
    } catch (e) {
      setError(e.response?.data?.error || "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (otp.length !== 6) return setError("Enter the 6-digit OTP");
    setError("");
    setLoading(true);
    try {
      const res = await verifyOTP(phone, otp);
      login(res.data.token, res.data.user);
      navigate(res.data.user.isSetup ? "/home" : "/setup");
    } catch (e) {
      setError(e.response?.data?.error || "Invalid OTP");
    } finally {
      setLoading(false);
    }
  };

  // ─── Dev-only quick login (skips OTP screen) ────────────────────────────
  const handleDevLogin = async (devPhone) => {
    setError("");
    setLoading(true);
    try {
      const res = await verifyOTP(devPhone, "000000");
      login(res.data.token, res.data.user);
      navigate(res.data.user.isSetup ? "/home" : "/setup");
    } catch (e) {
      setError(e.response?.data?.error || "Dev login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Hero */}
      <div className="bg-gradient-to-br from-primary to-rose-700 px-6 pt-16 pb-12 text-white text-center">
        <div className="text-5xl mb-3">🏔️</div>
        <h1 className="text-3xl font-bold tracking-tight">Dimasa</h1>
        <p className="mt-2 text-rose-100 text-sm leading-relaxed">
          Meet Dimasa people.<br />Date, connect, discover your community.
        </p>
      </div>

      {/* Form */}
      <div className="flex-1 px-6 py-10">
        {step === "phone" ? (
          <div className="space-y-5">
            <div>
              <h2 className="text-xl font-semibold text-gray-800">Enter your phone number</h2>
              <p className="text-sm text-gray-400 mt-1">We'll send you a verification code</p>
            </div>

            <div className="flex gap-2">
              <span className="input-field w-16 text-center text-gray-500 flex-shrink-0">+91</span>
              <input
                type="tel"
                className="input-field flex-1"
                placeholder="98765 43210"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                onKeyDown={(e) => e.key === "Enter" && handleSendOTP()}
                maxLength={10}
              />
            </div>

            {error && <p className="text-red-500 text-sm">{error}</p>}

            <button className="btn-primary" onClick={handleSendOTP} disabled={loading}>
              {loading ? "Sending..." : "Send OTP →"}
            </button>

            <p className="text-xs text-gray-400 text-center">
              By continuing, you agree to our{" "}
              <button onClick={() => navigate("/terms")} className="underline text-gray-500">Terms</button>
              {" & "}
              <button onClick={() => navigate("/privacy")} className="underline text-gray-500">Privacy Policy</button>
            </p>

            {/* ─── Dev-only: quick login shortcuts ────────────────────────── */}
            {import.meta.env.DEV && (
              <div className="border-t border-gray-100 pt-4 mt-2">
                <p className="text-[10px] uppercase tracking-wider text-gray-400 text-center font-semibold mb-2">
                  🔧 Dev Quick Login
                </p>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => handleDevLogin("9999999999")}
                    disabled={loading}
                    className="text-xs py-2 px-2 rounded-lg border border-violet-200 bg-violet-50 text-violet-700 font-medium hover:bg-violet-100 disabled:opacity-50"
                  >
                    💎 Admin
                  </button>
                  <button
                    onClick={() => handleDevLogin("8888888888")}
                    disabled={loading}
                    className="text-xs py-2 px-2 rounded-lg border border-amber-200 bg-amber-50 text-amber-700 font-medium hover:bg-amber-100 disabled:opacity-50"
                  >
                    🥇 Dater
                  </button>
                  <button
                    onClick={() => handleDevLogin("7777777777")}
                    disabled={loading}
                    className="text-xs py-2 px-2 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 font-medium hover:bg-emerald-100 disabled:opacity-50"
                  >
                    🤝 Friend
                  </button>
                </div>
                <p className="text-[10px] text-gray-400 text-center mt-2">
                  Or use any phone + OTP <code className="font-mono bg-gray-100 px-1 rounded">000000</code>
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-5">
            <div>
              <h2 className="text-xl font-semibold text-gray-800">Enter OTP</h2>
              <p className="text-sm text-gray-400 mt-1">
                Sent to +91 {phone}{" "}
                <button
                  className="text-primary underline"
                  onClick={() => { setStep("phone"); setOtp(""); setError(""); }}
                >
                  Change
                </button>
              </p>
            </div>

            <input
              type="number"
              className="input-field text-center text-2xl tracking-widest"
              placeholder="• • • • • •"
              value={otp}
              onChange={(e) => setOtp(e.target.value.slice(0, 6))}
              onKeyDown={(e) => e.key === "Enter" && handleVerifyOTP()}
              maxLength={6}
            />

            {error && <p className="text-red-500 text-sm">{error}</p>}

            <button className="btn-primary" onClick={handleVerifyOTP} disabled={loading}>
              {loading ? "Verifying..." : "Verify & Continue →"}
            </button>

            <button
              className="text-sm text-gray-400 w-full text-center"
              onClick={handleSendOTP}
              disabled={loading}
            >
              Resend OTP
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
