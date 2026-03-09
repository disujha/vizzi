"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { generateClient } from "aws-amplify/api";
import { db, doc, getDoc, writeBatch, setDoc, collection, query, where, getDocs, onSnapshot, orderBy } from "@/lib/db";
import {
    Tablets, Users, Activity, CircleDot, ClipboardList, CreditCard,
    MonitorUp, Smartphone, MessageSquare, Gift, Settings, BookOpenCheck, UserX,
    PhoneCall, Bot, Brain, Sparkles, Plus, AlertTriangle, ArrowRight, User, Clock, ExternalLink
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { configureAmplify } from "@/lib/amplify";
import amplifyConfig from "@/amplifyconfiguration.json";
import { setLocalSession, getLocalSession } from "@/lib/authSession";
import { normalizeClinicStatus, normalizeDoctorStatus, setRoundRobinPointer, getDoctorStatusOverride, setDoctorStatusOverride, getClinicStatusOverride, setClinicStatusOverride } from "@/lib/clinicQueue";
import { createTestDoctor } from "@/lib/createTestDoctorClean";

configureAmplify();
const client = generateClient();
const canUseSubscriptions =
    (amplifyConfig.aws_appsync_authenticationType || "").toUpperCase() !== "API_KEY";

const LIST_CLINICS = /* GraphQL */ `
  query ListClinics($filter: ModelClinicFilterInput) {
    listClinics(filter: $filter) {
      items {
        id name clinicName doctorName currentPlan 
        signupDate status email clinicLogoUri doctorPhotoUri
      }
    }
  }
`;

const LIST_PATIENTS = /* GraphQL */ `
  query ListQueuePatients($filter: ModelQueuePatientFilterInput) {
    listQueuePatients(filter: $filter) {
      items {
        id status timestamp tokenNumber mobileNumber name
      }
    }
  }
`;

const LIST_DOCTORS = /* GraphQL */ `
  query ListDoctors($clinicId: String!) {
    listDoctors(filter: { clinicId: { eq: $clinicId } }) {
      items { id name prefix active }
    }
  }
`;

const ON_UPDATE_CLINIC = /* GraphQL */ `
  subscription OnUpdateClinic {
    onUpdateClinic {
      id currentPlan smsUsed smsLimit status signupDate clinicName doctorName clinicLogoUri doctorPhotoUri
    }
  }
`;

const ON_CREATE_PATIENT = /* GraphQL */ `
  subscription OnCreateQueuePatient {
    onCreateQueuePatient {
      id status timestamp tokenNumber mobileNumber name
    }
  }
`;

const ON_UPDATE_PATIENT = /* GraphQL */ `
  subscription OnUpdateQueuePatient {
    onUpdateQueuePatient {
      id status timestamp tokenNumber mobileNumber name
    }
  }
`;

const toTitleCase = (value: string) =>
    value.trim().toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

const getTodayBounds = () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0).getTime();
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).getTime();
    return { start, end };
};

const inferNextToken = (patients: any[], fallbackPrefix = "A") => {
    const tokenPattern = /^([A-Za-z]+)?(\d+)$/;
    let maxNum = 0;
    let bestPrefix = (fallbackPrefix || "A").toUpperCase();
    let maxDigits = 2;

    patients.forEach((p) => {
        const token = String(p?.tokenNumber || "").trim();
        const match = token.match(tokenPattern);
        if (!match) return;
        const prefix = (match[1] || fallbackPrefix || "A").toUpperCase();
        const numStr = match[2] || "0";
        const num = Number(numStr);
        if (!Number.isFinite(num)) return;
        if (num >= maxNum) {
            maxNum = num;
            bestPrefix = prefix;
            maxDigits = Math.max(maxDigits, numStr.length);
        }
    });

    const next = String(maxNum + 1).padStart(maxDigits, "0");
    return `${bestPrefix}${next}`;
};

export default function DashboardPage() {
    const { user } = useAuth();
    const [clinicData, setClinicData] = useState<any>(null);
    const [patients, setPatients] = useState<any[]>([]);
    const [doctors, setDoctors] = useState<any[]>([]);
    const [deviceStats, setDeviceStats] = useState({ total: 0, online: 0 });
    const [trialInfo, setTrialInfo] = useState({ isFreeTrial: false, trialStart: "", trialEnd: "", smsUsed: 0, smsLimit: 0 });
    const patientsRef = useRef<any[]>([]);

    const derivePatientsStats = (list: any[]) => {
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0).getTime();
        const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).getTime();
        let totalToday = 0, waiting = 0, inProgress = 0, attention = 0;
        list.forEach((p) => {
            const ts = typeof p.timestamp === "number" ? p.timestamp : 0;
            if (ts >= start && ts <= end) totalToday++;
            if (p.status === "waiting") waiting++;
            if (p.status === "in_progress") inProgress++;
            if (p.status === "missed" || p.status === "not_responding") attention++;
        });
        return { totalToday, waiting, inProgress, attention };
    };

    const [patientStats, setPatientStats] = useState({ totalToday: 0, waiting: 0, inProgress: 0, attention: 0 });
    const [lastUpdated, setLastUpdated] = useState<string>("Just now");
    const [syncStatus, setSyncStatus] = useState<'syncing' | 'synced' | 'local' | 'error'>('syncing');

    // Derived values for the new components
    const nextWaiters = patients.filter(p => (p.status || "").toLowerCase() === "waiting").slice(0, 2);
    const { start: todayStart, end: todayEnd } = getTodayBounds();
    const todayPatients = patients.filter((p) => {
        const ts = Number(p?.timestamp || 0);
        return ts >= todayStart && ts <= todayEnd;
    });
    const fallbackPrefix = String(doctors?.find((d: any) => d?.prefix)?.prefix || "A").toUpperCase();
    const nextTokenPredicted = inferNextToken(todayPatients, fallbackPrefix);
    const nextToken = nextWaiters.length > 0 ? nextWaiters[0].tokenNumber : nextTokenPredicted;
    const isQueueIdle = patientStats.waiting === 0 && patientStats.inProgress === 0 && patientStats.attention === 0;
    const checkinProgress = Math.min(100, Math.round((patientStats.totalToday / 50) * 100));
    const aiLiveProgress = Math.max(18, checkinProgress);

    useEffect(() => {
        if (!user) return;
        setSyncStatus('syncing');
        
        const resolveClinic = async () => {
            const email = (user.email || (user.username?.includes("@") ? user.username : "")).toLowerCase();
            // If userId is clinic-MOBILE, extract the raw mobile number
            const mobileId = user.userId?.startsWith("clinic-") ? user.userId.replace(/^clinic-/, "") : null;
            const phoneE164 = mobileId ? `+91${mobileId}` : null;
            
            console.log("[Dashboard] Resolving clinic for:", { 
                userId: user.userId, 
                email, 
                mobileId,
                phoneE164 
            });

            const GET_CLINIC_Q = /* GraphQL */ `query GetClinic($id: ID!) { getClinic(id: $id) { id name clinicName doctorName currentPlan signupDate smsUsed smsLimit status email phone smsClinicName clinicLogoUri doctorPhotoUri } }`;

            const tryGetClinic = async (id: string, label: string) => {
                try {
                    console.log(`[Dashboard] Trying ${label}:`, id);
                    const res = await (client.graphql({ query: GET_CLINIC_Q, variables: { id } }) as any);
                    const clinic = res?.data?.getClinic || null;
                    if (clinic) {
                        console.log(`[Dashboard] ✓ Found by ${label}:`, clinic);
                    } else {
                        console.log(`[Dashboard] ✗ ${label} returned null (clinic not found)`);
                    }
                    return clinic;
                } catch (err: any) {
                    console.error(`[Dashboard] ✗ ${label} failed:`, {
                        message: err?.message || 'Unknown error',
                        errors: err?.errors || [],
                        name: err?.name || 'Error'
                    });
                    return null;
                }
            };

            // 1. Try raw userId (should be clinic-XXXXXXXXXX)
            const c1 = await tryGetClinic(user.userId, "userId");
            if (c1) { setSyncStatus('synced'); return c1; }

            // 2. Try with phone number in E.164 format
            if (phoneE164) {
                const res2 = await (async () => {
                    try {
                        console.log("[Dashboard] Trying list by phone:", phoneE164);
                        const res = await (client.graphql({
                            query: LIST_CLINICS,
                            variables: { filter: { phone: { eq: phoneE164 } } }
                        }) as any);
                        const items = res?.data?.listClinics?.items || [];
                        if (items.length > 0) {
                            console.log("[Dashboard] ✓ Found via phone filter:", items[0]);
                            return items[0];
                        }
                        return null;
                    } catch (err) {
                        console.error("[Dashboard] ✗ Phone filter failed:", err);
                        return null;
                    }
                })();
                if (res2) { setSyncStatus('synced'); return res2; }
            }

            // 3. Try email filter
            if (email) {
                const res3 = await (async () => {
                    try {
                        console.log("[Dashboard] Trying list by email:", email);
                        const res = await (client.graphql({
                            query: LIST_CLINICS,
                            variables: { filter: { email: { eq: email } } }
                        }) as any);
                        const items = res?.data?.listClinics?.items || [];
                        if (items.length > 0) {
                            console.log("[Dashboard] ✓ Found via email filter:", items[0]);
                            return items[0];
                        }
                        return null;
                    } catch (err) {
                        console.error("[Dashboard] ✗ Email filter failed:", err);
                        return null;
                    }
                })();
                if (res3) { setSyncStatus('synced'); return res3; }
            }

            console.log("[Dashboard] ✗ No clinic found in backend");
            setSyncStatus('local');
            return null;
        };

        resolveClinic().then(c => {
            if (!c) {
                console.warn("[Dashboard] Using localStorage fallback");
                const fallbackClinicName = user?.username?.trim() || "Your Clinic";
                const localStatus = getClinicStatusOverride(user.userId) || "OPEN";
                setClinicData({
                    clinicName: fallbackClinicName,
                    name: fallbackClinicName,
                    doctorName: "",
                    status: localStatus,
                    clinicStatus: localStatus,
                });
                setSyncStatus('local');
                return;
            }
            
            // Apply local status override if exists
            const localStatus = getClinicStatusOverride(c.id) || getClinicStatusOverride(user.userId);
            if (localStatus) {
                c.status = localStatus;
                (c as any).clinicStatus = localStatus;
            }
            
            setClinicData(c);
            setSyncStatus('synced');
            
            // Update localStorage session with real clinic name
            const realName = c.clinicName || c.name;
            if (realName) {
                const session = getLocalSession();
                if (session && session.username !== realName) {
                    console.log("[Dashboard] Updating session with real clinic name:", realName);
                    setLocalSession({ ...session, username: realName });
                }
            }
            
            // Set trial info
            const rawSignupDate = c.signupDate;
            const signupTimestamp = typeof rawSignupDate === "string" ? Date.parse(rawSignupDate) : Number(rawSignupDate || 0);
            const isFreeTrial = c.currentPlan === "FREE" && signupTimestamp > 0;
            const trialStart = isFreeTrial ? new Date(signupTimestamp) : null;
            const trialEnd = trialStart ? new Date(trialStart.getTime() + 30 * 24 * 60 * 60 * 1000) : null;
            setTrialInfo({
                isFreeTrial,
                trialStart: trialStart ? trialStart.toLocaleDateString() : "",
                trialEnd: trialEnd ? trialEnd.toLocaleDateString() : "",
                smsUsed: c.smsUsed || 0,
                smsLimit: c.smsLimit || 0
            });
        }).catch(err => {
            console.error("[Dashboard] Clinic resolution error:", err);
            setSyncStatus('error');
        });
    }, [user]);

    const createTestDoctorForTesting = async () => {
        if (!user) return;
        try {
            await createTestDoctor(user.userId);
            console.log("Test doctor created successfully");
        } catch (error) {
            console.error("Failed to create test doctor:", error);
        }
    };

    useEffect(() => {
        if (!user) return;
        const clinicId = clinicData?.id || user.userId;

        const doctorsRef = collection(db, "clinics", user.userId, "doctors");
        console.log("[Dashboard] Querying doctors for userId:", user.userId);
        const doctorsQ = query(doctorsRef, orderBy("name", "asc"));
        const doctorsUnsub = onSnapshot(doctorsQ, (snapshot: any) => {
            const docList = (snapshot.docs || []).map((docSnap: any) => {
                const raw = docSnap.data() || {};
                return {
                    id: docSnap.id,
                    ...raw,
                    status: raw.status || "ONLINE",
                };
            });
            console.log("[Dashboard] Doctors Synced:", docList.length);
            setDoctors(docList);
            const online = docList.filter((d: any) => (d.status || "").toLowerCase() === "online").length;
            setDeviceStats({ total: docList.length, online });
        });

        return () => {
            doctorsUnsub();
        };
    }, [user, clinicData]);

    const clinicStatus = normalizeClinicStatus(clinicData?.status || clinicData?.clinicStatus);
    const clinicOverrideActive = clinicStatus !== "OPEN";

    const stats = [
        { label: "Active Devices", value: `${deviceStats.online}/${deviceStats.total}`, icon: Tablets, color: "text-blue-600", bg: "bg-blue-50" },
        { label: "Patients Today", value: patientStats.totalToday.toString(), icon: Users, color: "text-teal-600", bg: "bg-teal-50" },
        { label: "Queue Status", value: `${patientStats.waiting} waiting`, icon: CircleDot, color: "text-amber-600", bg: "bg-amber-50" },
        { label: trialInfo.isFreeTrial ? "SMS Used (Free Trial)" : "SMS Used", value: `${trialInfo.smsUsed}/${trialInfo.smsLimit || "∞"}`, icon: MessageSquare, color: "text-rose-600", bg: "bg-rose-50" },
        { label: "Clinic Status", value: clinicStatus, icon: Activity, color: clinicStatus === "EMERGENCY_ONLY" ? "text-red-600" : clinicStatus === "CLOSED" ? "text-gray-600" : "text-green-600", bg: clinicStatus === "EMERGENCY_ONLY" ? "bg-red-50" : clinicStatus === "CLOSED" ? "bg-gray-50" : "bg-green-50" },
    ];
    const firstDoctorName = doctors.find((d: any) => !!d?.name)?.name || "";
    const doctorDisplayName = firstDoctorName
        ? toTitleCase(firstDoctorName)
        : "Doctor not added yet";

    return (
        <div>
            {/* Compact Setup Alert for missing doctors */}
            {doctors.length === 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm animate-in fade-in slide-in-from-top-4 duration-500">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                            <UserX size={20} />
                        </div>
                        <div>
                            <h3 className="text-sm font-black text-amber-900 uppercase tracking-tight">Setup Required: No Doctors Added</h3>
                            <p className="text-[11px] text-amber-700/80 font-medium max-w-lg">
                                Each doctor can have their own token prefix and schedule.
                            </p>
                            <button
                                onClick={createTestDoctorForTesting}
                                className="mt-3 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors text-sm font-medium"
                            >
                                Create Test Doctor
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="h-4"></div>

            {/* Control Center Header */}
            <div className="medical-card p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
                {/* Sync Status Indicator */}
                <div className="absolute top-3 right-3">
                    {syncStatus === 'syncing' && (
                        <div className="flex items-center gap-2 text-xs text-slate-400">
                            <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                            <span>Syncing...</span>
                        </div>
                    )}
                    {syncStatus === 'synced' && (
                        <div className="flex items-center gap-2 text-xs text-green-600">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            <span>Synced</span>
                        </div>
                    )}
                    {syncStatus === 'local' && (
                        <div className="flex items-center gap-2 text-xs text-amber-600">
                            <AlertTriangle size={12} />
                            <span>Local Only</span>
                        </div>
                    )}
                    {syncStatus === 'error' && (
                        <div className="flex items-center gap-2 text-xs text-red-600">
                            <AlertTriangle size={12} />
                            <span>Sync Error</span>
                        </div>
                    )}
                </div>
                
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-gradient-to-br from-slate-50 to-white border border-slate-200/60 rounded-2xl shadow-sm overflow-hidden flex items-center justify-center p-1.5">
                        <Image src="/android-chrome-192x192.png" alt="Vizzi logo" width={56} height={56} className="rounded-xl" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tighter leading-none">
                            {clinicData?.clinicName || clinicData?.name || "Your Clinic"}
                        </h1>
                        <p className="text-sm font-semibold text-slate-500 uppercase tracking-widest mt-1">
                            {doctorDisplayName}
                        </p>
                    </div>
                </div>

                <div className="flex flex-col items-start md:items-end gap-2">
                    <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        Clinic Live Status
                        <span className="bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-sm lowercase font-medium tracking-normal border border-slate-200">
                            Synced with Kiosk
                        </span>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                        <div className="flex gap-1">
                            {[
                                { label: "🟢 Clinic OPEN", value: "OPEN", ringColor: "ring-green-200", textColor: "text-green-700", dot: "bg-green-500" },
                                { label: "🔴 EMERGENCY Only", value: "EMERGENCY_ONLY", ringColor: "ring-rose-200", textColor: "text-rose-700", dot: "bg-rose-500" },
                                { label: "⚫ Clinic CLOSED", value: "CLOSED", ringColor: "ring-slate-200", textColor: "text-slate-700", dot: "bg-slate-500" }
                            ].map((item) => {
                                const isActive = clinicStatus === item.value;
                                return (
                                    <button
                                        key={item.value}
                                        onClick={() => {
                                            const newStatus = item.value as "OPEN" | "EMERGENCY_ONLY" | "CLOSED";
                                            setClinicStatusOverride(clinicData?.id || user?.userId || "", newStatus);
                                            setClinicData((prev: any) => prev ? { ...prev, status: newStatus, clinicStatus: newStatus } : null);
                                        }}
                                        className={`relative z-10 px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider transition-all ${isActive
                                            ? `bg-white ${item.textColor} shadow-sm ring-1 ${item.ringColor}`
                                            : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
                                            }`}
                                    >
                                        {isActive && <span className={`w-1.5 h-1.5 rounded-full ${item.dot} animate-pulse shrink-0`} />}
                                        {item.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>

            <div className="h-6"></div>

            {/* Current Queue Status */}
            <div className="medical-card p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Current Queue Status</h3>
                    <span className="text-[10px] font-semibold text-slate-500">
                        {lastUpdated}
                    </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center">
                        <div className="text-3xl font-black text-slate-900">{patientStats.waiting}</div>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-1">Waiting</p>
                    </div>
                    <div className="text-center">
                        <div className="text-3xl font-black text-blue-600">{patientStats.inProgress}</div>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-1">In Progress</p>
                    </div>
                    <div className="text-center">
                        <div className="text-3xl font-black text-amber-600">{patientStats.attention}</div>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-1">Need Attention</p>
                    </div>
                </div>
                {nextWaiters.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-slate-200">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Next in Queue</p>
                        <div className="space-y-2">
                            {nextWaiters.map((patient, index) => (
                                <div key={patient.id} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-sm font-bold">
                                            {patient.tokenNumber}
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-slate-900">{patient.name}</p>
                                            <p className="text-xs text-slate-500">{patient.mobileNumber}</p>
                                        </div>
                                    </div>
                                    <div className="text-xs font-medium text-blue-600">
                                        Waiting
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <div className="h-6"></div>

            {/* Doctor Availability (multi-doctor) */}
            <div className="medical-card p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Doctor Availability</h3>
                    <span className="text-[10px] font-semibold text-slate-500">
                        {clinicOverrideActive ? "Temporarily overridden by Clinic Live Status" : "Real-time queue assignment source"}
                    </span>
                </div>
                {doctors.length === 0 ? (
                    <p className="text-sm text-slate-500">No doctors configured yet.</p>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                        {doctors.map((doctor: any) => {
                            const doctorStatus = normalizeDoctorStatus(doctor);
                            return (
                                <div key={doctor.id} className="rounded-xl border border-slate-200 p-4 bg-white">
                                    <p className="text-sm font-bold text-slate-900">{doctor.name || "Doctor"}</p>
                                    <div className="mt-3">
                                        <div className="grid grid-cols-2 gap-2">
                                            {[
                                                { label: "Available", value: "AVAILABLE", active: "bg-emerald-50 text-emerald-700 border-emerald-200" },
                                                { label: "On Break", value: "ON_BREAK", active: "bg-amber-50 text-amber-700 border-amber-200" },
                                                { label: "Busy", value: "BUSY", active: "bg-blue-50 text-blue-700 border-blue-200" },
                                                { label: "Offline", value: "OFFLINE", active: "bg-slate-100 text-slate-700 border-slate-300" },
                                            ].map((item) => {
                                                const isActive = doctorStatus === item.value;
                                                return (
                                                    <button
                                                        key={item.value}
                                                        type="button"
                                                        className={`px-3 py-2 rounded-lg border text-[10px] font-black uppercase tracking-wider transition ${isActive
                                                            ? item.active
                                                            : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"} disabled:opacity-60 disabled:cursor-not-allowed`}
                                                    >
                                                        {item.label}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            <div className="h-6"></div>

            {/* Stats Overview */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {stats.map((stat, index) => (
                    <div key={index} className="medical-card p-4 text-center">
                        <div className={`w-12 h-12 rounded-2xl ${stat.bg} flex items-center justify-center mx-auto mb-3`}>
                            <stat.icon className={`${stat.color}`} size={20} />
                        </div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{stat.label}</p>
                        <p className="text-xl font-black text-slate-900">{stat.value}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}
