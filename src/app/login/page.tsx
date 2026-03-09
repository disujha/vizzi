"use client";

import { useState, useEffect, Suspense } from "react";
import { generateClient } from "aws-amplify/api";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { LogIn, Loader2, Building2, KeyRound, Smartphone, ChevronDown } from "lucide-react";
import { configureAmplify } from "@/lib/amplify";
import { setLocalSession, clearLocalSession } from "@/lib/authSession";

configureAmplify();

const client = generateClient();

const CREATE_CLINIC_MUTATION = /* GraphQL */ `
  mutation CreateClinic($input: CreateClinicInput!) {
    createClinic(input: $input) {
      id
      name
      clinicName
      phone
    }
  }
`;

const GET_CLINIC_QUERY = /* GraphQL */ `
  query GetClinic($id: ID!) {
    getClinic(id: $id) {
      id
      name
      clinicName
    }
  }
`;

const parseError = (err: unknown, fallback = "Authentication failed") => {
    if (err && typeof err === "object") {
        const e = err as { name?: string; message?: string };
        return {
            name: e.name || "",
            message: e.message || fallback,
        };
    }
    return { name: "", message: fallback };
};

function LoginContent() {
    const OTP_LENGTH = 4;
    const searchParams = useSearchParams();
    const [mobile, setMobile] = useState("");
    const [clinicName, setClinicName] = useState("");
    const [smsSuffix, setSmsSuffix] = useState("");
    const [otpDigits, setOtpDigits] = useState<string[]>(Array(OTP_LENGTH).fill(""));
    const [isLoading, setIsLoading] = useState(false);
    const [isSignUp, setIsSignUp] = useState(false);
    const [needsConfirmation, setNeedsConfirmation] = useState(false);
    const [error, setError] = useState("");
    const [info, setInfo] = useState("");
    const [showDoctorOnboardingPrompt, setShowDoctorOnboardingPrompt] = useState(false);
    const router = useRouter();

    const navigateAfterSignup = (addDoctorNow: boolean) => {
        if (addDoctorNow) {
            router.push("/dashboard/settings?tab=doctors&openAddDoctor=1");
            return;
        }
        router.push("/dashboard");
    };

    const normalizeMobile = (value: string) => value.replace(/\D/g, "").slice(-10);
    const mobileAsE164 = (value: string) => `+91${normalizeMobile(value)}`;
    const generateClinicIdFromMobile = (value: string) => `clinic-${normalizeMobile(value)}`;

    // Auto-generate SMS suffix when clinic name changes
    const generateSmsSuffix = (name: string) => {
        if (!name) return "";
        // Remove spaces and special chars, take first 8 chars, add 1
        const clean = name.toUpperCase().replace(/[^A-Z0-9]/g, "");
        return clean.slice(0, 8) + "1";
    };

    const generateSmsOptions = (clinicName: string) => {
        const baseName = clinicName.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 8);
        if (baseName.length < 3) return [];

        const options = [];
        for (let i = 1; i <= 9; i++) {
            options.push(`${baseName}${i}`);
        }
        return options;
    };

    useEffect(() => {
        if (searchParams.get("mode") === "signup") {
            setIsSignUp(true);
        }
    }, [searchParams]);

    useEffect(() => {
        if (isSignUp && clinicName) {
            const generated = generateSmsSuffix(clinicName);
            setSmsSuffix(generated);
        }
    }, [clinicName, isSignUp]);

    const handleAuth = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsLoading(true);
        setError("");
        setInfo("");

        const normalizedMobile = normalizeMobile(mobile);
        if (normalizedMobile.length !== 10) {
            setIsLoading(false);
            setError("Please enter a valid 10-digit mobile number.");
            return;
        }

        try {
            if (isSignUp) {
                if (!clinicName.trim()) {
                    setError("Clinic name is required.");
                    setIsLoading(false);
                    return;
                }
                if (!smsSuffix.trim()) {
                    setError("Please select an SMS sender ID.");
                    setIsLoading(false);
                    return;
                }
                
                // Step 1: Create user in Cognito first
                const signupResponse = await fetch("/api/auth/signup", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        mobile: normalizedMobile
                    })
                });

                const signupResult = await signupResponse.json();
                
                if (!signupResponse.ok || signupResult.type === "error") {
                    setError(signupResult.error || "Failed to create user. Please try again.");
                    setIsLoading(false);
                    return;
                }

                // Step 2: Create clinic record
                await ensureClinicRecord(normalizedMobile, clinicName, smsSuffix);
                
                // Step 3: Now initiate auth to send OTP
                const response = await fetch("/api/auth", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        action: "initiateAuth",
                        mobile: normalizedMobile
                    })
                });

                const result = await response.json();
                
                if (!response.ok || result.type === "error") {
                    setError(result.error || "Failed to send OTP. Please try again.");
                    setIsLoading(false);
                    return;
                }

                setNeedsConfirmation(true);
                setInfo("OTP sent to your mobile number.");
                // Store session for OTP verification
                if (result.session) {
                    sessionStorage.setItem('authSession', result.session);
                }
                setIsLoading(false);
                return;
            }

            // For login, use existing flow
            const response = await fetch("/api/auth", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "initiateAuth",
                    mobile: normalizedMobile
                })
            });

            const result = await response.json();
            
            if (!response.ok || result.type === "error") {
                setError(result.error || "Failed to send OTP. Please try again.");
                return;
            }

            if (result.type === "success") {
                // Check if user exists and handle accordingly
                if (result.userExists === false) {
                    // User doesn't exist - switch to signup mode
                    setIsSignUp(true);
                    setNeedsConfirmation(false);
                    setOtpDigits(Array(OTP_LENGTH).fill(""));
                    setError("User not found. Please sign up first.");
                    setInfo("Switched to signup mode. Please complete your clinic details.");
                    setIsLoading(false);
                    return;
                }

                setNeedsConfirmation(true);
                setInfo("OTP sent to your mobile number.");
                // Store session for OTP verification
                if (result.session) {
                    sessionStorage.setItem('authSession', result.session);
                }
            } else {
                setError("Unexpected authentication flow. Please try again.");
            }
        } catch (err: unknown) {
            const { message } = parseError(err);
            console.error("Auth error:", err);
            setError(message);
        } finally {
            setIsLoading(false);
        }
    };

    const ensureClinicRecord = async (phone: string, preferredClinicName?: string, selectedSmsSuffix?: string) => {
        const normalized = normalizeMobile(phone);
        const clinicId = generateClinicIdFromMobile(normalized);
        try {
            const defaultName = preferredClinicName?.trim() || `Clinic ${normalized.slice(-4)}`;
            await client.graphql({
                query: CREATE_CLINIC_MUTATION,
                variables: {
                    input: {
                        id: clinicId,
                        name: defaultName,
                        clinicName: defaultName,
                        doctorName: "",
                        email: `${normalized}@mobile.vizzi.local`,
                        phone: mobileAsE164(normalized),
                        smsClinicName: selectedSmsSuffix || "",
                    },
                },
            });
            return clinicId;
        } catch (err) {
            // Do not block OTP auth when backend query/mutation auth policies differ.
            console.warn("Clinic create skipped or failed:", err);
            return clinicId;
        }
    };

    const handleConfirm = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsLoading(true);
        setError("");
        setInfo("");
        const normalizedMobile = normalizeMobile(mobile);
        const confirmCode = otpDigits.join("");
        const authSession = sessionStorage.getItem('authSession');
        
        if (confirmCode.length !== OTP_LENGTH) {
            setError(`Please enter the ${OTP_LENGTH}-digit OTP.`);
            setIsLoading(false);
            return;
        }
        
        if (!authSession) {
            setError("Authentication session expired. Please try again.");
            setIsLoading(false);
            return;
        }
        
        try {
            // Verify OTP via API
            const response = await fetch("/api/auth", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "verifyOtp",
                    mobile: normalizedMobile,
                    otp: confirmCode.trim(),
                    session: authSession
                })
            });

            const result = await response.json();
            
            if (!response.ok || result.type === "error") {
                setError(result.error || "OTP verification failed. Please try again.");
                return;
            }

            if (result.type === "success" && result.tokens) {
                // Clear session storage
                sessionStorage.removeItem('authSession');
                
                const clinicId = generateClinicIdFromMobile(normalizedMobile);
                let clinicDisplayName = `Clinic ${normalizedMobile.slice(-4)}`;

                if (isSignUp) {
                    await ensureClinicRecord(normalizedMobile, clinicName, smsSuffix);
                    clinicDisplayName = clinicName.trim();
                } else {
                    // On login, fetch the real clinic name from the database
                    try {
                        const res = await client.graphql({ query: GET_CLINIC_QUERY, variables: { id: clinicId } }) as any;
                        const fetchedName = res?.data?.getClinic?.clinicName || res?.data?.getClinic?.name;
                        if (fetchedName) clinicDisplayName = fetchedName;
                    } catch (fetchErr) {
                        console.warn("Could not fetch clinic name, using fallback:", fetchErr);
                    }
                }

                setLocalSession({
                    userId: clinicId,
                    username: clinicDisplayName || `Clinic ${normalizedMobile.slice(-4)}`,
                    mobile: mobileAsE164(normalizedMobile),
                });

                if (isSignUp) {
                    setShowDoctorOnboardingPrompt(true);
                } else {
                    router.push("/dashboard");
                }
            } else {
                setError("OTP verification failed. Please try again.");
            }
        } catch (err: unknown) {
            const { message } = parseError(err, "Verification failed");
            setError(message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleOtpChange = (index: number, value: string) => {
        const digit = value.replace(/\D/g, "").slice(-1);
        setOtpDigits((prev) => {
            const next = [...prev];
            next[index] = digit;
            return next;
        });
        if (digit && typeof window !== "undefined") {
            const nextInput = document.getElementById(`otp-${index + 1}`) as HTMLInputElement | null;
            nextInput?.focus();
        }
    };

    const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Backspace" && !otpDigits[index] && index > 0) {
            const prevInput = document.getElementById(`otp-${index - 1}`) as HTMLInputElement | null;
            prevInput?.focus();
        }
    };

    const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
        e.preventDefault();
        const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, OTP_LENGTH);
        if (!pasted) return;
        const next = Array(OTP_LENGTH).fill("");
        for (let i = 0; i < pasted.length; i += 1) next[i] = pasted[i];
        setOtpDigits(next);
        if (typeof window !== "undefined") {
            const focusIndex = Math.min(pasted.length, OTP_LENGTH - 1);
            const input = document.getElementById(`otp-${focusIndex}`) as HTMLInputElement | null;
            input?.focus();
        }
    };

    const handleResend = async () => {
        try {
            const normalizedMobile = normalizeMobile(mobile);
            if (normalizedMobile.length !== 10) {
                setError("Please enter a valid 10-digit mobile number.");
                return;
            }
            
            // Clear any existing session
            sessionStorage.removeItem('authSession');
            
            // Re-initiate auth flow to resend OTP
            const response = await fetch("/api/auth", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "initiateAuth",
                    mobile: normalizedMobile
                })
            });

            const result = await response.json();
            
            if (!response.ok || result.type === "error") {
                setError(result.error || "Failed to resend OTP.");
                return;
            }

            if (result.type === "success") {
                setInfo("OTP resent.");
                // Store new session
                if (result.session) {
                    sessionStorage.setItem('authSession', result.session);
                }
            } else {
                setError("Failed to resend OTP. Please try again.");
            }
        } catch (err: unknown) {
            const { message } = parseError(err, "Failed to resend OTP.");
            setError(message);
        }
    };

    if (showDoctorOnboardingPrompt) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
                <div className="w-full max-w-md bg-white rounded-3xl shadow-xl shadow-slate-200/50 p-8 border border-slate-100">
                    <h2 className="text-2xl font-bold text-slate-900 text-center">Add first doctor now?</h2>
                    <p className="text-slate-500 mt-3 text-center">
                        Your clinic is ready. You can add a doctor now, or continue to dashboard and do it later.
                    </p>
                    <div className="mt-8 space-y-3">
                        <button
                            type="button"
                            onClick={() => navigateAfterSignup(true)}
                            className="w-full btn-primary py-3"
                        >
                            Yes, add doctor now
                        </button>
                        <button
                            type="button"
                            onClick={() => navigateAfterSignup(false)}
                            className="w-full btn-secondary py-3"
                        >
                            Not now, go to dashboard
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (needsConfirmation) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-slate-50">
                <Link href="/" className="flex items-center mb-8">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl border border-slate-200 bg-white flex items-center justify-center shadow-sm">
                            <Image src="/logo.png" alt="Vizzi logo" width={24} height={24} />
                        </div>
                        <span className="text-4xl font-black tracking-tighter text-slate-900">
                            Vizzi<span className="text-primary italic">.</span>
                        </span>
                    </div>
                </Link>
                <div className="w-full max-w-md bg-white rounded-3xl shadow-xl shadow-slate-200/50 p-8 border border-slate-100">
                    <div className="text-center mb-8">
                        <h2 className="text-2xl font-bold text-slate-900">Verify Your Mobile</h2>
                        <p className="text-slate-500 mt-2">
                            Enter the 4-digit code sent to <strong>{mobile}</strong>
                        </p>
                    </div>

                    <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                        <div className="flex items-start gap-2">
                            <Smartphone className="text-blue-600 mt-0.5" size={16} />
                            <div className="text-sm text-blue-800">
                                <p className="font-semibold mb-1">Mobile Verification Required</p>
                                <p className="text-xs">
                                    Enter OTP to continue securely.
                                </p>
                            </div>
                        </div>
                    </div>

                    {error && <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 rounded-xl text-sm">{error}</div>}
                    {info && <div className="mb-6 p-4 bg-blue-50 border border-blue-100 text-blue-600 rounded-xl text-sm">{info}</div>}
                    <form onSubmit={handleConfirm} className="space-y-4">
                        <div className="relative">
                            <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <div className="grid grid-cols-4 gap-2">
                                {otpDigits.map((digit, idx) => (
                                    <input
                                        key={idx}
                                        id={`otp-${idx}`}
                                        type="text"
                                        inputMode="numeric"
                                        autoComplete={idx === 0 ? "one-time-code" : "off"}
                                        maxLength={1}
                                        className="w-full text-center text-lg font-semibold py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                        value={digit}
                                        onChange={(e) => handleOtpChange(idx, e.target.value)}
                                        onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                                        onPaste={handleOtpPaste}
                                        required
                                    />
                                ))}
                            </div>
                        </div>
                        <button type="submit" disabled={isLoading} className="w-full btn-primary py-3 flex items-center justify-center space-x-2">
                            {isLoading ? <Loader2 className="animate-spin" size={20} /> : <LogIn size={20} />}
                            <span>Verify & Continue</span>
                        </button>
                    </form>

                    <div className="mt-6 space-y-3">
                        <button onClick={handleResend} className="w-full text-sm text-primary hover:underline font-medium">
                            Resend OTP
                        </button>
                        <button
                            onClick={() => {
                                setNeedsConfirmation(false);
                                setOtpDigits(Array(OTP_LENGTH).fill(""));
                                setError("");
                                setInfo("");
                            }}
                            className="w-full text-sm text-slate-500 hover:text-slate-700 font-medium"
                        >
                            Back to signup form
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-slate-50">
            <div className="flex items-center mb-8">
                <div className="w-10 h-10 rounded-2xl border border-slate-200 bg-white flex items-center justify-center shadow-sm">
                    <Image src="/logo.png" alt="Vizzi logo" width={24} height={24} />
                </div>
                <span className="text-4xl font-black tracking-tighter text-slate-900">
                    Vizzi<span className="text-primary italic">.</span>
                </span>
            </div>

            <div className="w-full max-w-md bg-white rounded-3xl shadow-xl shadow-slate-200/50 p-8 border border-slate-100">
                <div className="text-center mb-8">
                    <h2 className="text-2xl font-bold text-slate-900">
                        {isSignUp ? "Create Clinic Account" : "Login"}
                    </h2>
                    <p className="text-slate-500 mt-2">
                        {isSignUp ? "Clinic name + mobile OTP. That's it." : "Enter mobile number to receive OTP"}
                    </p>
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 rounded-xl text-sm">
                        {error}
                    </div>
                )}

                <form onSubmit={handleAuth} className="space-y-4">
                    {isSignUp && (
                        <>
                            <div className="relative">
                                <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input
                                    type="text"
                                    placeholder="Clinic Name (e.g. Apna Clinic)"
                                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                    value={clinicName}
                                    onChange={(e) => setClinicName(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="relative">
                                <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <select
                                    value={smsSuffix}
                                    onChange={(e) => setSmsSuffix(e.target.value)}
                                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all appearance-none cursor-pointer"
                                    required
                                >
                                    <option value="">Select SMS Sender ID</option>
                                    {clinicName && generateSmsOptions(clinicName).map((option, index) => {
                                        return (
                                            <option
                                                key={index}
                                                value={option}
                                            >
                                                {option}
                                            </option>
                                        );
                                    })}
                                </select>
                                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
                                <p className="text-[10px] text-slate-400 ml-4 mt-1">
                                    Choose your sender ID
                                </p>
                            </div>
                        </>
                    )}
                    <div className="relative">
                        <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="tel"
                            inputMode="numeric"
                            placeholder="Mobile Number"
                            maxLength={10}
                            pattern="[0-9]{10}"
                            className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                            value={mobile}
                            onChange={(e) => {
                                // Only allow numbers, max 10 digits
                                const value = e.target.value.replace(/\D/g, "").slice(0, 10);
                                setMobile(value);
                            }}
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full btn-primary py-3 flex items-center justify-center space-x-2"
                    >
                        {isLoading ? <Loader2 className="animate-spin" size={20} /> : <LogIn size={20} />}
                        <span>Get OTP</span>
                    </button>
                </form>

                <p className="mt-8 text-center text-sm text-slate-500">
                    {isSignUp ? "Already have a clinic account?" : "Don't have an account?"}{" "}
                    <button
                        onClick={() => { setIsSignUp(!isSignUp); setError(""); setInfo(""); }}
                        className="text-primary font-semibold hover:underline"
                    >
                        {isSignUp ? "Login instead" : "Create clinic account"}
                    </button>
                </p>
            </div>

            <footer className="mt-10 flex flex-col items-center gap-3 text-xs text-slate-400">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl border border-slate-200 bg-white flex items-center justify-center shadow-sm">
                        <Image src="/logo.png" alt="Vizzi logo" width={24} height={24} />
                    </div>
                    <div className="w-10 h-10 rounded-2xl border border-slate-200 bg-white flex items-center justify-center shadow-sm">
                        <Image src="/android-chrome-192x192.png" alt="Vizzi icon" width={26} height={26} />
                    </div>
                </div>
                <span>Vizzi AI Doctor Portal</span>
            </footer>
        </div>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <Loader2 className="animate-spin text-primary" size={48} />
            </div>
        }>
            <LoginContent />
        </Suspense>
    );
}
