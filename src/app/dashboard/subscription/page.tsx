"use client";

import { db, collection, doc, getDoc, getDocs, setDoc, updateDoc, addDoc, deleteDoc, onSnapshot, query, where, orderBy, limit, writeBatch, uploadToStorage } from "@/lib/db";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";

import {
    CheckCircle2,
    Building2,
    Activity,
    Sparkles,
    Shield,
    CreditCard,
    ArrowRight,
    History,
    Package,
    Plus,
    Clock,
    Zap,
    Crown,
    Check
} from "lucide-react";
import Script from "next/script";
import { useSearchParams } from "next/navigation";
import { CONFIG } from "@/lib/config";

declare global {
    interface Window {
        Razorpay?: any;
    }
}

const PLANS = [
    {
        id: "starter",
        name: "Starter",
        price: 999,
        description: "Best for small clinics getting started",
        features: [
            "1500 Patients / Month",
            "500 SMS Alerts",
            "3 Doctor Logins",
            "Unlimited AI Voice",
            "Vizzi Web Console",
            "Standard Support",
        ],
        icon: Building2,
        color: "slate"
    },
    {
        id: "growth",
        name: "Growth",
        price: 1499,
        description: "Most popular for busy practices",
        features: [
            "2500 Patients / Month",
            "500 SMS + 300 WhatsApp",
            "5 Doctor Logins",
            "AI Queue Optimization",
            "Custom Clinic Branding",
            "Advanced Analytics",
            "Priority Email Support",
        ],
        popular: true,
        icon: Activity,
        color: "primary"
    },
    {
        id: "pro",
        name: "Pro",
        price: 1999,
        description: "Full automation for high-volume",
        features: [
            "5000 Patients / Month",
            "1000 SMS + 500 WhatsApp",
            "10 Doctor Logins",
            "Unlimited Voice & AI",
            "WhatsApp Automation",
            "White-label Branding",
            "Advanced AI Insights",
        ],
        icon: Sparkles,
        color: "amber"
    },
    {
        id: "elite",
        name: "Elite",
        price: 2499,
        description: "Premium centers with 24/7 care",
        features: [
            "Unlimited Patients",
            "2000 SMS + 1000 WhatsApp",
            "Unlimited Doctor Logins",
            "Custom API Integrations",
            "24/7 Priority Concierge",
            "Hardware Priority Setup",
            "Dedicated Account Manager",
        ],
        icon: Shield,
        color: "indigo"
    },
];

const HARDWARE = [
    { id: "hw10", name: "10” Vizzi AI Desktop", price: 23999 },
    { id: "hw7", name: "7” Vizzi AI Desktop", price: 17999 },
    { id: "own", name: "Own Device", price: 0 },
];

export default function SubscriptionPage() {
    const { user } = useAuth();
    const searchParams = useSearchParams();
    const [clinic, setClinic] = useState<any>(null);
    const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
    const [selectedHardwareId, setSelectedHardwareId] = useState<string>("own");
    const [paying, setPaying] = useState(false);
    const [paymentError, setPaymentError] = useState("");
    const [success, setSuccess] = useState(false);
    const [payments, setPayments] = useState<any[]>([]);

    useEffect(() => {
        if (!user) return;
        const clinicRef = doc(db, "clinics", user.userId);
        const unsubscribe = onSnapshot(clinicRef, (snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.data() as any;
                if (!data?.signupDate) {
                    const now = new Date().toISOString();
                    void setDoc(clinicRef, { signupDate: now }, { merge: true });
                    data.signupDate = now;
                }
                setClinic(data);
            }
        });
        return () => unsubscribe();
    }, [user]);

    useEffect(() => {
        const planParam = searchParams.get("plan");
        if (planParam && PLANS.some((plan) => plan.id === planParam)) {
            setSelectedPlanId(planParam);
        }
    }, [searchParams]);

    useEffect(() => {
        if (!user) return;
        const paymentsQuery = query(
            collection(db, "payment_orders"),
            where("userId", "==", user.userId),
            orderBy("createdAt", "desc"),
            limit(5)
        );
        const unsubscribe = onSnapshot(
            paymentsQuery,
            (snapshot) => {
                const items = snapshot.docs.map((docSnap: any) => ({ id: docSnap.id, ...docSnap.data() }));
                setPayments(items);
            }
        );
        return () => unsubscribe();
    }, [user]);

    const selectedPlan = PLANS.find((plan) => plan.id === selectedPlanId) || null;
    const selectedHardware = HARDWARE.find((item) => item.id === selectedHardwareId) || HARDWARE[2];
    const subtotal = (selectedPlan?.price || 0) + (selectedHardware?.price || 0);
    const tax = Math.round(subtotal * 0.18);
    const total = subtotal + tax;
    const rawSignupDate = clinic?.signupDate;
    const signupTimestamp = typeof rawSignupDate === "string" ? Date.parse(rawSignupDate) : Number(rawSignupDate || 0);
    const isFreeTrial = clinic?.currentPlan === "FREE" && signupTimestamp > 0;
    const trialStart = isFreeTrial ? new Date(signupTimestamp) : null;
    const trialEnd = isFreeTrial && trialStart ? new Date(trialStart.getTime() + 30 * 24 * 60 * 60 * 1000) : null;
    const daysRemaining =
        isFreeTrial && trialEnd
            ? Math.max(0, Math.ceil((trialEnd.getTime() - Date.now()) / (24 * 60 * 60 * 1000)))
            : null;

    const startPayment = async () => {
        if (!user || !selectedPlan) return;
        setPaying(true);
        setPaymentError("");
        try {
            const response = await fetch("/api/razorpay/createOrder", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    amount: total * 100,
                    currency: "INR",
                    receipt: `order_${Date.now()}`,
                    notes: {
                        planName: selectedPlan.name,
                        hardwareName: selectedHardware.name,
                        gst: tax.toString(),
                    },
                }),
            });
            const data = await response.json();
            const orderId = data?.orderId;
            if (!orderId || !window.Razorpay) {
                throw new Error("Payment gateway unavailable");
            }

            const options = {
                key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "rzp_live_R7xgUq3sBfYq4T",
                name: "Vizzi - AI Clinic Receptionist",
                description: `${selectedPlan.name} + ${selectedHardware.name}`,
                order_id: orderId,
                currency: "INR",
                amount: total * 100,
                handler: async (result: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
                    try {
                        await fetch("/api/razorpay/verifyPayment", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                orderId: result.razorpay_order_id,
                                paymentId: result.razorpay_payment_id,
                                signature: result.razorpay_signature,
                            }),
                        });
                        await setDoc(
                            doc(db, "clinics", user.userId),
                            {
                                currentPlan: selectedPlan.name.toUpperCase(),
                                lastPaymentAt: Date.now(),
                            },
                            { merge: true }
                        );
                        setSuccess(true);
                        setTimeout(() => setSuccess(false), 2500);
                    } catch (err: any) {
                        setPaymentError(err?.message || "Payment verification failed");
                    }
                },
                prefill: {
                    email: clinic?.email || user.username || "",
                    contact: clinic?.phone || "",
                },
                theme: { color: "#14B8A6" },
            };

            const razorpay = new window.Razorpay(options);
            razorpay.open();
        } catch (err: any) {
            setPaymentError(err?.message || "Failed to initiate payment");
        } finally {
            setPaying(false);
        }
    };

    return (
        <div className="max-w-6xl mx-auto space-y-10 pb-20">
            <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="afterInteractive" />

            {/* Header section */}
            <div className="flex flex-wrap items-end justify-between gap-6 bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
                <div className="space-y-1">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider mb-2">
                        <Crown size={12} />
                        Subscription Management
                    </div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">Upgrade Your Clinic</h1>
                    <p className="text-slate-500 font-medium">Select the perfect plan to scale your healthcare practice with Vizzi AI.</p>
                </div>
                <div className="px-6 py-3 bg-slate-50 border border-slate-200 rounded-2xl flex items-center gap-3">
                    <div className="p-2 bg-white rounded-xl shadow-sm"><Zap size={18} className="text-amber-500" /></div>
                    <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Current Plan</p>
                        <p className="font-bold text-slate-900">{clinic?.currentPlan || "FREE TRIAL"}</p>
                    </div>
                </div>
            </div>

            {success && (
                <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-2xl flex items-center gap-3 text-emerald-700 animate-in fade-in slide-in-from-top-2">
                    <CheckCircle2 size={20} />
                    <span className="font-bold uppercase text-xs tracking-wider">Payment successful! Your plan is active.</span>
                </div>
            )}

            {paymentError && (
                <div className="bg-rose-50 border border-rose-100 p-4 rounded-2xl flex items-center gap-3 text-rose-600 font-bold text-xs uppercase tracking-wider animate-in shake duration-500">
                    <Shield size={20} />
                    {paymentError}
                </div>
            )}

            {/* Trial Info Banner */}
            {isFreeTrial && (
                <div className="relative overflow-hidden bg-slate-900 rounded-[2rem] p-8 text-white">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 rounded-full blur-3xl -mr-32 -mt-32" />
                    <div className="relative flex flex-wrap items-center justify-between gap-6">
                        <div className="space-y-2">
                            <h3 className="text-xl font-bold">Vizzi AI Free Trial Active</h3>
                            <p className="text-slate-400 text-sm max-w-lg">Enjoy access up to 100 patients and 3 doctor logins during your 30-day trial period.</p>
                        </div>
                        <div className="flex items-center gap-4 bg-white/5 backdrop-blur-md p-4 rounded-2xl border border-white/10">
                            <div className="text-center px-4 border-r border-white/10">
                                <p className="text-2xl font-black text-primary">{daysRemaining}</p>
                                <p className="text-[10px] font-bold text-slate-400 uppercase">Days Left</p>
                            </div>
                            <div className="text-center px-4">
                                <p className="text-sm font-bold capitalize text-primary">Free</p>
                                <p className="text-[10px] font-bold text-slate-400 uppercase">Current</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* 1. Plans Grid */}
            <div className="space-y-6">
                <div className="flex items-center gap-3 ml-2">
                    <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl"><Package size={20} /></div>
                    <h2 className="text-xl font-bold text-slate-900">Step 1: Choose Your Software Plan</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {PLANS.map((plan) => {
                        const Icon = plan.icon;
                        const isSelected = selectedPlanId === plan.id;
                        return (
                            <button
                                key={plan.id}
                                onClick={() => setSelectedPlanId(plan.id)}
                                className={`group relative flex flex-col h-full rounded-[2.5rem] border-2 p-8 transition-all duration-300 text-left ${isSelected
                                        ? "border-primary bg-primary/[0.02] shadow-xl shadow-primary/10 ring-4 ring-primary/5"
                                        : "border-slate-100 bg-white hover:border-slate-200 hover:shadow-lg"
                                    }`}
                            >
                                {plan.popular && (
                                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-primary text-white text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full shadow-lg">
                                        Most Popular
                                    </div>
                                )}

                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 transition-colors ${isSelected ? "bg-primary text-white" : "bg-slate-50 text-slate-400 group-hover:bg-slate-100"
                                    }`}>
                                    <Icon size={28} />
                                </div>

                                <div className="space-y-1 mb-6">
                                    <h3 className="text-xl font-black text-slate-900 tracking-tight">{plan.name}</h3>
                                    <p className="text-xs text-slate-500 font-medium leading-relaxed">{plan.description}</p>
                                </div>

                                <div className="flex items-baseline gap-1 mb-8">
                                    <span className="text-3xl font-black text-slate-900 tracking-tighter">₹{plan.price}</span>
                                    <span className="text-slate-400 text-xs font-bold uppercase tracking-widest">/ Month</span>
                                </div>

                                <ul className="space-y-4 mb-10 flex-grow">
                                    {plan.features.map((feature) => (
                                        <li key={feature} className="flex items-start gap-3">
                                            <div className="mt-1 flex-shrink-0 w-4 h-4 rounded-full bg-emerald-500/10 flex items-center justify-center">
                                                <Check size={10} className="text-emerald-600" />
                                            </div>
                                            <span className="text-xs font-medium text-slate-600 leading-tight">{feature}</span>
                                        </li>
                                    ))}
                                </ul>

                                <div className={`w-full py-4 rounded-2xl text-center text-xs font-black uppercase tracking-widest transition-all ${isSelected
                                        ? "bg-primary text-white shadow-lg"
                                        : "bg-slate-100 text-slate-400 group-hover:bg-slate-200"
                                    }`}>
                                    {isSelected ? "Selected" : "Select Plan"}
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* 2. Hardware Options */}
            <div className="space-y-6">
                <div className="flex items-center justify-between px-2">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-50 text-amber-600 rounded-xl"><Plus size={20} /></div>
                        <h2 className="text-xl font-bold text-slate-900">Step 2: Add Hardware (Optional)</h2>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {HARDWARE.map((item) => {
                        const isSelected = selectedHardwareId === item.id;
                        return (
                            <button
                                key={item.id}
                                onClick={() => setSelectedHardwareId(item.id)}
                                className={`p-6 rounded-[2rem] border-2 transition-all duration-300 text-left flex items-center justify-between ${isSelected
                                        ? "border-primary bg-primary/[0.02] shadow-md ring-2 ring-primary/5"
                                        : "border-slate-100 bg-white hover:border-slate-200"
                                    }`}
                            >
                                <div className="space-y-1">
                                    <p className="font-bold text-slate-900">{item.name}</p>
                                    <p className="text-xs text-slate-500 font-medium">One-time payment</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-lg font-black text-slate-900 tracking-tight">₹{item.price}</p>
                                    {isSelected && <div className="text-[10px] text-primary font-bold uppercase tracking-widest mt-1">Included</div>}
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Summary & Checkout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 medical-card p-10 space-y-8">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-slate-100 rounded-xl"><History size={20} /></div>
                        <h3 className="text-xl font-bold text-slate-900">Order Summary</h3>
                    </div>

                    <div className="space-y-6">
                        <div className="flex items-center justify-between p-6 bg-slate-50 rounded-2xl border border-slate-100">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-primary border border-slate-200">
                                    <Package size={20} />
                                </div>
                                <div>
                                    <p className="font-bold text-slate-900">{selectedPlan?.name || "No Plan Selected"}</p>
                                    <p className="text-xs text-slate-500">Subscription (Monthly)</p>
                                </div>
                            </div>
                            <p className="font-black text-slate-900">₹{selectedPlan?.price || 0}</p>
                        </div>

                        {selectedHardwareId !== "own" && (
                            <div className="flex items-center justify-between p-6 bg-slate-50 rounded-2xl border border-slate-100">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-amber-500 border border-slate-200">
                                        <Building2 size={20} />
                                    </div>
                                    <div>
                                        <p className="font-bold text-slate-900">{selectedHardware?.name}</p>
                                        <p className="text-xs text-slate-500">One-time Hardware</p>
                                    </div>
                                </div>
                                <p className="font-black text-slate-900">₹{selectedHardware?.price || 0}</p>
                            </div>
                        )}

                        <div className="pt-6 border-t border-slate-100 space-y-4">
                            <div className="flex justify-between text-sm text-slate-500 font-medium">
                                <span>Subtotal</span>
                                <span className="text-slate-900">₹{subtotal}</span>
                            </div>
                            <div className="flex justify-between text-sm text-slate-500 font-medium">
                                <span>GST (18% included)</span>
                                <span className="text-slate-900">₹{tax}</span>
                            </div>
                            <div className="flex justify-between items-center pt-4 border-t border-slate-200">
                                <span className="text-lg font-black text-slate-900">Total Payable</span>
                                <span className="text-3xl font-black text-primary tracking-tighter">₹{total}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col gap-6">
                    <div className="medical-card p-10 bg-slate-900 text-white space-y-8 flex flex-col items-center text-center">
                        <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center border-2 border-primary/20">
                            <CreditCard size={32} className="text-primary" />
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-xl font-black">Secure Checkout</h3>
                            <p className="text-sm text-slate-400">Secure payments processed via Razorpay. All major cards & UPI accepted.</p>
                        </div>
                        <button
                            onClick={startPayment}
                            disabled={!selectedPlan || paying}
                            className={`w-full py-5 rounded-3xl font-black uppercase tracking-[0.2em] text-xs transition-all flex items-center justify-center gap-3 ${!selectedPlan || paying
                                    ? "bg-white/10 text-white/30 cursor-not-allowed"
                                    : "bg-primary text-white shadow-2xl shadow-primary/40 hover:scale-[1.02] active:scale-[0.98]"
                                }`}
                        >
                            {paying ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>Proceed to Pay <ArrowRight size={16} /></>
                            )}
                        </button>
                    </div>

                    <div className="medical-card p-8 border-2 border-dashed border-slate-200 bg-slate-50/50">
                        <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Plan History</h4>
                        {payments.length === 0 ? (
                            <p className="text-[10px] text-slate-500 leading-relaxed font-medium">No previous transactions found on your account.</p>
                        ) : (
                            <div className="space-y-3">
                                {payments.map((item) => (
                                    <div key={item.id} className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-100 shadow-sm">
                                        <div className="flex items-center gap-3">
                                            <div className="p-1.5 bg-slate-50 rounded-lg"><Clock size={12} className="text-slate-400" /></div>
                                            <span className="text-[10px] font-bold text-slate-700 truncate max-w-[80px]">{item.orderId}</span>
                                        </div>
                                        <span className={`text-[9px] font-black uppercase tracking-tighter px-2 py-1 rounded-md ${item.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                                            }`}>{item.status || "created"}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
