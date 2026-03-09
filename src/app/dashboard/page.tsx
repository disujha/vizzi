"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { generateClient } from "aws-amplify/api";
import { db, collection, query, onSnapshot, orderBy } from "@/lib/db";
import {
    Users, Activity, CircleDot, Clock, MessageSquare,
    PhoneCall, Brain, Sparkles, ArrowRight, User, AlertTriangle, UserX,
    MonitorUp, Settings
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { configureAmplify } from "@/lib/amplify";
import { setLocalSession, getLocalSession } from "@/lib/authSession";
import { normalizeClinicStatus, normalizeDoctorStatus, setClinicStatusOverride, getClinicStatusOverride } from "@/lib/clinicQueue";
import { createTestDoctor } from "@/lib/createTestDoctorClean";

configureAmplify();
const client = generateClient();

const LIST_CLINICS = /* GraphQL */ `
  query ListClinics($filter: ModelClinicFilterInput) {
    listClinics(filter: $filter) {
      items {
        id name clinicName doctorName currentPlan 
        signupDate status email phone clinicLogoUri doctorPhotoUri
        smsUsed smsLimit
      }
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

export default function ImprovedDashboardPage() {
    const { user } = useAuth();
    const [clinicData, setClinicData] = useState<any>(null);
    const [patients, setPatients] = useState<any[]>([]);
    const [doctors, setDoctors] = useState<any[]>([]);
    const [syncStatus, setSyncStatus] = useState<'syncing' | 'synced' | 'local' | 'error'>('syncing');
    const [trialInfo, setTrialInfo] = useState({ isFreeTrial: false, smsUsed: 0, smsLimit: 0 });

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

    const { start: todayStart, end: todayEnd } = getTodayBounds();
    const todayPatients = patients.filter((p) => {
        const ts = Number(p?.timestamp || 0);
        return ts >= todayStart && ts <= todayEnd;
    });
    
    const nextWaiters = patients.filter(p => (p.status || "").toLowerCase() === "waiting").slice(0, 3);
    
    // AI Insights calculations
    const avgConsultationTime = todayPatients.length > 0 ? 12 : 15;
    const estimatedWaitTime = patientStats.waiting * avgConsultationTime;
    const peakHour = "2:00 PM - 4:00 PM";

    useEffect(() => {
        if (!user) return;
        setSyncStatus('syncing');
        
        const resolveClinic = async () => {
            const email = (user.email || (user.username?.includes("@") ? user.username : "")).toLowerCase();
            const mobileId = user.userId?.startsWith("clinic-") ? user.userId.replace(/^clinic-/, "") : null;
            const phoneE164 = mobileId ? `+91${mobileId}` : null;
            
            console.log("[Dashboard] Resolving clinic for:", { userId: user.userId, mobileId, phoneE164 });

            const GET_CLINIC_Q = /* GraphQL */ `query GetClinic($id: ID!) { getClinic(id: $id) { id name clinicName doctorName currentPlan signupDate smsUsed smsLimit status email phone smsClinicName clinicLogoUri doctorPhotoUri } }`;

            const tryGetClinic = async (id: string, label: string) => {
                try {
                    console.log(`[Dashboard] Trying ${label}:`, id);
                    const res = await (client.graphql({ query: GET_CLINIC_Q, variables: { id } }) as any);
                    const clinic = res?.data?.getClinic || null;
                    if (clinic) console.log(`[Dashboard] ✓ Found by ${label}`);
                    return clinic;
                } catch (err) {
                    console.error(`[Dashboard] ✗ ${label} failed:`, err);
                    return null;
                }
            };

            const c1 = await tryGetClinic(user.userId, "userId");
            if (c1) { setSyncStatus('synced'); return c1; }

            if (phoneE164) {
                try {
                    const res = await (client.graphql({
                        query: LIST_CLINICS,
                        variables: { filter: { phone: { eq: phoneE164 } } }
                    }) as any);
                    const items = res?.data?.listClinics?.items || [];
                    if (items.length > 0) { setSyncStatus('synced'); return items[0]; }
                } catch { }
            }

            console.log("[Dashboard] ✗ No clinic found in backend");
            setSyncStatus('local');
            return null;
        };

        resolveClinic().then(c => {
            if (!c) {
                const fallbackClinicName = user?.username?.trim() || "Your Clinic";
                const localStatus = getClinicStatusOverride(user.userId) || "OPEN";
                setClinicData({
                    clinicName: fallbackClinicName,
                    name: fallbackClinicName,
                    doctorName: "",
                    status: localStatus,
                });
                setSyncStatus('local');
                return;
            }
            
            const localStatus = getClinicStatusOverride(c.id) || getClinicStatusOverride(user.userId);
            if (localStatus) c.status = localStatus;
            
            setClinicData(c);
            setSyncStatus('synced');
            
            const realName = c.clinicName || c.name;
            if (realName) {
                const session = getLocalSession();
                if (session && session.username !== realName) {
                    setLocalSession({ ...session, username: realName });
                }
            }
            
            setTrialInfo({
                isFreeTrial: c.currentPlan === "FREE",
                smsUsed: c.smsUsed || 0,
                smsLimit: c.smsLimit || 0
            });
        }).catch(() => setSyncStatus('error'));
    }, [user]);

    // Load patients from Firebase
    useEffect(() => {
        if (!user) return;
        const queueRef = collection(db, "clinics", user.userId, "queue");
        const queueQ = query(queueRef, orderBy("timestamp", "asc"));
        const patientsUnsub = onSnapshot(queueQ, (snapshot: any) => {
            const patientList = (snapshot.docs || []).map((docSnap: any) => ({
                id: docSnap.id,
                ...docSnap.data(),
            }));
            setPatients(patientList);
            setPatientStats(derivePatientsStats(patientList));
        });
        return () => patientsUnsub();
    }, [user]);

    // Load doctors from Firebase
    useEffect(() => {
        if (!user) return;
        const doctorsRef = collection(db, "clinics", user.userId, "doctors");
        const doctorsQ = query(doctorsRef, orderBy("name", "asc"));
        const doctorsUnsub = onSnapshot(doctorsQ, (snapshot: any) => {
            const docList = (snapshot.docs || []).map((docSnap: any) => ({
                id: docSnap.id,
                ...docSnap.data(),
                status: docSnap.data()?.status || "ONLINE",
            }));
            setDoctors(docList);
        });
        return () => doctorsUnsub();
    }, [user]);

    const clinicStatus = normalizeClinicStatus(clinicData?.status);
    const firstDoctorName = doctors.find((d: any) => !!d?.name)?.name || "";
    const doctorDisplayName = firstDoctorName ? toTitleCase(firstDoctorName) : "Doctor not added yet";

    const createTestDoctorForTesting = async () => {
        if (!user) return;
        try {
            await createTestDoctor(user.userId);
            console.log("Test doctor created successfully");
        } catch (error) {
            console.error("Failed to create test doctor:", error);
        }
    };

    return (
        <div className="space-y-3">
            {/* Setup Alert */}
            {doctors.length === 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                            <UserX size={20} />
                        </div>
                        <div>
                            <h3 className="text-sm font-black text-amber-900 uppercase">Setup Required: No Doctors Added</h3>
                            <p className="text-xs text-amber-700 mt-1">Each doctor can have their own token prefix and schedule.</p>
                            <button
                                onClick={createTestDoctorForTesting}
                                className="mt-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition text-sm font-medium"
                            >
                                Create Test Doctor
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="medical-card p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-slate-50 to-white border border-slate-200/60 rounded-xl shadow-sm flex items-center justify-center p-1">
                        <Image src="/android-chrome-192x192.png" alt="Vizzi" width={48} height={48} className="rounded-lg" />
                    </div>
                    <div>
                        <h1 className="text-xl font-black text-slate-900">{toTitleCase(clinicData?.clinicName || "Your Clinic")}</h1>
                        <p className="text-xs font-medium text-slate-500">{doctorDisplayName}</p>
                    </div>
                </div>
                
                <div className="flex items-center gap-3">
                    {/* Sync Status */}
                    {syncStatus === 'syncing' && <div className="flex items-center gap-2 text-xs text-slate-400"><div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div><span>Syncing...</span></div>}
                    {syncStatus === 'synced' && <div className="flex items-center gap-2 text-xs text-green-600"><div className="w-2 h-2 bg-green-500 rounded-full"></div><span>Synced</span></div>}
                    {syncStatus === 'local' && <div className="flex items-center gap-2 text-xs text-amber-600"><AlertTriangle size={12} /><span>Local Only</span></div>}
                    {syncStatus === 'error' && <div className="flex items-center gap-2 text-xs text-red-600"><AlertTriangle size={12} /><span>Sync Error</span></div>}
                    
                    {/* Clinic Status */}
                    <div className="flex gap-1">
                        {[
                            { label: "OPEN", value: "OPEN", color: "text-green-700", bg: "bg-green-50", border: "border-green-200" },
                            { label: "EMERGENCY", value: "EMERGENCY_ONLY", color: "text-rose-700", bg: "bg-rose-50", border: "border-rose-200" },
                            { label: "CLOSED", value: "CLOSED", color: "text-slate-700", bg: "bg-slate-100", border: "border-slate-300" }
                        ].map((item) => {
                            const isActive = clinicStatus === item.value;
                            return (
                                <button
                                    key={item.value}
                                    onClick={() => {
                                        const newStatus = item.value as "OPEN" | "EMERGENCY_ONLY" | "CLOSED";
                                        setClinicStatusOverride(clinicData?.id || user?.userId || "", newStatus);
                                        setClinicData((prev: any) => prev ? { ...prev, status: newStatus } : null);
                                    }}
                                    className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition ${
                                        isActive ? `${item.bg} ${item.color} ${item.border} border shadow-sm` : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
                                    }`}
                                >
                                    {item.label}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Main Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                {/* Left: Next Patient + Queue */}
                <div className="lg:col-span-2 space-y-3">
                    {/* Next Patient HERO */}
                    <div className="medical-card p-4 bg-gradient-to-br from-blue-50 to-white border-2 border-blue-200">
                        <div className="flex items-center justify-between mb-3">
                            <h2 className="text-sm font-black text-blue-900 uppercase flex items-center gap-2">
                                <PhoneCall size={16} />
                                Next Patient to Call
                            </h2>
                            <span className="text-xs text-blue-600 font-semibold">{patientStats.waiting} in queue</span>
                        </div>
                        
                        {nextWaiters.length > 0 ? (
                            <div className="bg-white rounded-xl p-4 border border-blue-100 shadow-sm">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-xl flex items-center justify-center shadow-lg">
                                            <span className="text-xl font-black">{nextWaiters[0].tokenNumber}</span>
                                        </div>
                                        <div>
                                            <p className="text-xl font-black text-slate-900">{nextWaiters[0].name}</p>
                                            <p className="text-sm text-slate-500">{nextWaiters[0].mobileNumber}</p>
                                        </div>
                                    </div>
                                    <button className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm transition shadow-md hover:shadow-lg">
                                        Call Now
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-white rounded-xl p-6 border border-blue-100 text-center">
                                <CircleDot className="mx-auto text-slate-300 mb-2" size={40} />
                                <p className="text-sm text-slate-500 font-medium">No patients waiting</p>
                            </div>
                        )}
                    </div>

                    {/* Live Queue */}
                    <div className="medical-card p-4">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-sm font-black text-slate-700 uppercase flex items-center gap-2">
                                <Users size={16} />
                                Live Patient Queue
                            </h3>
                            <span className="text-xs text-slate-500">{patientStats.totalToday} patients today</span>
                        </div>
                        
                        {todayPatients.length > 0 ? (
                            <div className="space-y-2 max-h-96 overflow-y-auto">
                                {todayPatients.slice(0, 10).map((patient: any) => {
                                    const statusColors: Record<string, string> = {
                                        waiting: "bg-amber-50 text-amber-700 border-amber-200",
                                        in_progress: "bg-blue-50 text-blue-700 border-blue-200",
                                        completed: "bg-green-50 text-green-700 border-green-200",
                                        missed: "bg-red-50 text-red-700 border-red-200"
                                    };
                                    const statusColor = statusColors[patient.status] || "bg-slate-50 text-slate-700 border-slate-200";
                                    
                                    return (
                                        <div key={patient.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-white border-2 border-slate-200 rounded-lg flex items-center justify-center">
                                                    <span className="text-sm font-bold text-slate-700">{patient.tokenNumber}</span>
                                                </div>
                                                <div>
                                                    <p className="text-sm font-semibold text-slate-900">{patient.name}</p>
                                                    <p className="text-xs text-slate-500">{patient.mobileNumber}</p>
                                                </div>
                                            </div>
                                            <span className={`px-3 py-1 rounded-lg text-xs font-bold uppercase border ${statusColor}`}>
                                                {patient.status?.replace('_', ' ')}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="text-center py-4">
                                <Users className="mx-auto text-slate-300 mb-2" size={32} />
                                <p className="text-sm text-slate-500 font-medium">No patients today</p>
                            </div>
                        )}
                    </div>

                    {/* Quick Actions + Stats */}
                    <div className="medical-card p-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Left: Quick Actions */}
                            <div>
                                <h3 className="text-xs font-black text-slate-500 uppercase mb-3">Quick Actions</h3>
                                <div className="space-y-2">
                                    <Link href="/kiosk" className="flex items-center justify-between p-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 rounded-lg transition group shadow-md hover:shadow-lg">
                                        <div className="flex items-center gap-2">
                                            <MonitorUp size={16} className="text-white" />
                                            <span className="text-sm font-bold text-white">Launch Kiosk</span>
                                        </div>
                                        <ArrowRight size={16} className="text-white/80 group-hover:text-white" />
                                    </Link>
                                    <Link href="/dashboard/patients" className="flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100 rounded-lg transition group">
                                        <div className="flex items-center gap-2">
                                            <Users size={16} className="text-slate-500 group-hover:text-slate-700" />
                                            <span className="text-sm font-semibold text-slate-700 group-hover:text-slate-900">Manage Queue</span>
                                        </div>
                                        <ArrowRight size={16} className="text-slate-400 group-hover:text-slate-600" />
                                    </Link>
                                    <Link href="/dashboard/settings" className="flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100 rounded-lg transition group">
                                        <div className="flex items-center gap-2">
                                            <Settings size={16} className="text-slate-500 group-hover:text-slate-700" />
                                            <span className="text-sm font-semibold text-slate-700 group-hover:text-slate-900">Settings</span>
                                        </div>
                                        <ArrowRight size={16} className="text-slate-400 group-hover:text-slate-600" />
                                    </Link>
                                </div>
                            </div>

                            {/* Right: Compact Stats */}
                            <div>
                                <h3 className="text-xs font-black text-slate-500 uppercase mb-3">Quick Stats</h3>
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
                                        <Users className="text-blue-600 mb-1" size={16} />
                                        <p className="text-[10px] font-bold text-slate-500 uppercase">Today</p>
                                        <p className="text-xl font-black text-slate-900">{patientStats.totalToday}</p>
                                    </div>
                                    <div className="bg-amber-50 rounded-lg p-3 border border-amber-100">
                                        <CircleDot className="text-amber-600 mb-1" size={16} />
                                        <p className="text-[10px] font-bold text-slate-500 uppercase">Queue</p>
                                        <p className="text-xl font-black text-slate-900">{patientStats.waiting}</p>
                                    </div>
                                    <div className="bg-rose-50 rounded-lg p-3 border border-rose-100">
                                        <MessageSquare className="text-rose-600 mb-1" size={16} />
                                        <p className="text-[10px] font-bold text-slate-500 uppercase">SMS</p>
                                        <p className="text-xl font-black text-slate-900">{trialInfo.smsUsed}/{trialInfo.smsLimit || "∞"}</p>
                                    </div>
                                    <div className={`rounded-lg p-3 border ${clinicStatus === "OPEN" ? "bg-green-50 border-green-100" : "bg-slate-50 border-slate-200"}`}>
                                        <Activity className={clinicStatus === "OPEN" ? "text-green-600" : "text-slate-600"} size={16} />
                                        <p className="text-[10px] font-bold text-slate-500 uppercase mt-1">Status</p>
                                        <p className="text-sm font-black text-slate-900">{clinicStatus}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right: Doctors + AI Insights */}
                <div className="space-y-3">
                    {/* Doctors */}
                    <div className="medical-card p-4">
                        <h3 className="text-sm font-black text-slate-700 uppercase mb-3 flex items-center gap-2">
                            <Activity size={16} />
                            Doctor Availability
                        </h3>
                        
                        {doctors.length === 0 ? (
                            <div className="text-center py-4">
                                <User className="mx-auto text-slate-300 mb-2" size={28} />
                                <p className="text-xs text-slate-500">No doctors added</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {doctors.map((doctor: any) => {
                                    const doctorStatus = normalizeDoctorStatus(doctor);
                                    const statusConfig: Record<string, any> = {
                                        AVAILABLE: { color: "text-green-700", bg: "bg-green-50", dot: "bg-green-500" },
                                        ON_BREAK: { color: "text-amber-700", bg: "bg-amber-50", dot: "bg-amber-500" },
                                        BUSY: { color: "text-blue-700", bg: "bg-blue-50", dot: "bg-blue-500" },
                                        OFFLINE: { color: "text-slate-600", bg: "bg-slate-100", dot: "bg-slate-400" }
                                    };
                                    const config = statusConfig[doctorStatus];
                                    
                                    return (
                                        <div key={doctor.id} className={`p-3 rounded-lg border border-slate-100 ${config.bg}`}>
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <div className={`w-2 h-2 rounded-full ${config.dot} animate-pulse`}></div>
                                                    <p className="text-sm font-bold text-slate-900">{doctor.name}</p>
                                                </div>
                                                <span className={`text-[10px] font-black uppercase ${config.color}`}>
                                                    {doctorStatus.replace('_', ' ')}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* AI Insights */}
                    <div className="medical-card p-4 bg-gradient-to-br from-purple-50 to-white">
                        <h3 className="text-sm font-black text-purple-900 uppercase mb-3 flex items-center gap-2">
                            <Brain size={16} />
                            AI Insights
                        </h3>
                        
                        <div className="grid grid-cols-2 gap-2">
                            <div className="bg-white rounded-lg p-3 border border-slate-100">
                                <div className="flex items-center justify-between mb-1">
                                    <Clock size={12} className="text-purple-600" />
                                    <span className="text-[10px] font-bold text-slate-500 uppercase">Wait</span>
                                </div>
                                <p className="text-2xl font-black text-slate-900">{estimatedWaitTime > 0 ? `${estimatedWaitTime}m` : '0m'}</p>
                            </div>

                            <div className="bg-white rounded-lg p-3 border border-slate-100">
                                <div className="flex items-center justify-between mb-1">
                                    <Activity size={12} className="text-purple-600" />
                                    <span className="text-[10px] font-bold text-slate-500 uppercase">Avg</span>
                                </div>
                                <p className="text-2xl font-black text-slate-900">{avgConsultationTime}m</p>
                            </div>

                            <div className="bg-white rounded-lg p-3 border border-slate-100">
                                <div className="flex items-center justify-between mb-1">
                                    <Users size={12} className="text-amber-600" />
                                    <span className="text-[10px] font-bold text-slate-500 uppercase">Queue</span>
                                </div>
                                <p className="text-2xl font-black text-amber-600">{patientStats.waiting}</p>
                            </div>

                            <div className="bg-white rounded-lg p-3 border border-slate-100">
                                <div className="flex items-center justify-between mb-1">
                                    <CircleDot size={12} className="text-blue-600" />
                                    <span className="text-[10px] font-bold text-slate-500 uppercase">Active</span>
                                </div>
                                <p className="text-2xl font-black text-blue-600">{patientStats.inProgress}</p>
                            </div>
                        </div>

                        <div className="mt-2 bg-white rounded-lg p-3 border border-slate-100">
                            <div className="flex items-center gap-2 mb-1">
                                <Sparkles size={12} className="text-purple-600" />
                                <span className="text-[10px] font-bold text-slate-500 uppercase">Peak Hours</span>
                            </div>
                            <p className="text-sm font-black text-slate-900">{peakHour}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
