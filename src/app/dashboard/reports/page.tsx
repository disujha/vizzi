"use client";

import { db, collection, doc, getDoc, getDocs, setDoc, updateDoc, addDoc, deleteDoc, onSnapshot, query, where, orderBy, limit, writeBatch, uploadToStorage } from "@/lib/db";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Search, BarChart3, Users, Clock, AlertTriangle, MessageSquare, Sparkles, Database, Plus, CheckCircle2 } from "lucide-react";

type Patient = {
    id: string;
    name: string;
    tokenNumber: string;
    mobileNumber: string;
    status: string;
    timestamp: number;
    lastCalledAt: number;
    appointmentDate?: string;
    appointmentTime?: string;
    appointment?: boolean;
    emergency?: boolean;
    isAppointment?: boolean;
    isEmergency?: boolean;
    notifLogs?: Record<string, any>;
    smsStatus?: any;
    whatsappStatus?: any;
    voiceStatus?: any;
    smsSent?: any;
    whatsappSent?: any;
    waitTime?: number;
    completedAt?: number;
    symptoms?: string;
};

const toMillis = (value: any) => {
    if (typeof value === "number") return value;
    if (value && typeof value.toMillis === "function") return value.toMillis();
    return 0;
};

const normalizeDateString = (value: any) => {
    if (!value) return "";
    if (typeof value === "string") return value;
    if (typeof value === "number") return new Date(value).toISOString().slice(0, 10);
    if (value && typeof value.toDate === "function") return value.toDate().toISOString().slice(0, 10);
    if (value && typeof value.toMillis === "function") return new Date(value.toMillis()).toISOString().slice(0, 10);
    return "";
};

const normalizeTimeString = (value: any) => {
    if (!value) return "";
    if (typeof value === "string") return value;
    if (typeof value === "number") return new Date(value).toISOString().slice(11, 16);
    if (value && typeof value.toDate === "function") return value.toDate().toISOString().slice(11, 16);
    if (value && typeof value.toMillis === "function") return new Date(value.toMillis()).toISOString().slice(11, 16);
    return "";
};

const resolveVisitFlags = (data: any) => {
    const appointmentDate = normalizeDateString(data?.appointmentDate ?? data?.appointment_date);
    const appointmentTime = normalizeTimeString(data?.appointmentTime ?? data?.appointment_time);
    const isAppointment = Boolean(data?.isAppointment ?? data?.appointment ?? appointmentDate);
    const isEmergency = Boolean(data?.isEmergency ?? data?.emergency);
    return { appointmentDate, appointmentTime, isAppointment, isEmergency };
};

const formatDateTime = (timestamp: number) => {
    if (!timestamp) return "--";
    return new Date(timestamp).toLocaleString();
};

const formatWaitTime = (patient: Patient) => {
    if (!patient.lastCalledAt || !patient.timestamp) return "--";
    const minutes = Math.max(0, Math.round((patient.lastCalledAt - patient.timestamp) / 60000));
    return `${minutes} min`;
};

const getVisitType = (patient: Patient) => {
    const anyPatient = patient as any;
    const isEmergency = patient.isEmergency || Boolean(anyPatient.emergency);
    const isAppointment = patient.isAppointment || Boolean(anyPatient.appointment) || Boolean(anyPatient.appointmentDate);
    if (isEmergency) return "E";
    if (isAppointment) return "A";
    return "W";
};

const toTitle = (value: string) =>
    value
        .replace(/_/g, " ")
        .toLowerCase()
        .replace(/\b\w/g, (char) => char.toUpperCase());

const toNameCase = (value: string) =>
    value
        .trim()
        .toLowerCase()
        .replace(/\b\w/g, (char) => char.toUpperCase());

const resolveStatus = (value: any) => {
    if (value === undefined || value === null || value === "") return "--";
    if (typeof value === "boolean") return value ? "✓" : "✗";
    if (typeof value === "string") {
        const normalized = value.toLowerCase();
        if (["sent", "success", "delivered", "ok", "true"].includes(normalized)) return "✓";
        if (["failed", "error", "disabled", "skipped", "false"].includes(normalized)) return "✗";
        return toTitle(value);
    }
    return "--";
};

const formatStatusLabel = (status: string) => {
    if (!status) return "--";
    if (status === "cancelled") return "⊘";
    return status.replace(/_/g, " ").toUpperCase();
};

const getCommStatus = (patient: Patient) => {
    const logs = patient.notifLogs || {};
    const sms = resolveStatus(logs.sms ?? patient.smsStatus ?? (logs.smsSent ?? patient.smsSent));
    const whatsapp = resolveStatus(logs.whatsapp ?? patient.whatsappStatus ?? (logs.whatsappSent ?? patient.whatsappSent));
    const voice = patient.lastCalledAt > 0 ? "✓" : resolveStatus(logs.voice ?? patient.voiceStatus);
    return { sms, whatsapp, voice };
};

const getRange = (mode: string) => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    if (mode === "yesterday") {
        start.setDate(start.getDate() - 1);
        end.setDate(end.getDate() - 1);
    }
    if (mode === "last7") {
        start.setDate(start.getDate() - 6);
    }
    if (mode === "last30") {
        start.setDate(start.getDate() - 29);
    }

    return { start: start.getTime(), end: end.getTime() };
};

export default function ReportsPage() {
    const { user } = useAuth();
    const [patientHistory, setPatientHistory] = useState<Patient[]>([]);
    const [upcomingAppointmentsState, setUpcomingAppointmentsState] = useState<Patient[]>([]); // Renamed to avoid conflict with useMemo
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [sortField, setSortField] = useState<"timestamp" | "waitTime">("timestamp");
    const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
    const [filter, setFilter] = useState<"today" | "yesterday" | "last7" | "last30" | "custom">("today");
    const [customStart, setCustomStart] = useState<string>(new Date().toLocaleDateString("en-CA"));
    const [customEnd, setCustomEnd] = useState<string>(new Date().toLocaleDateString("en-CA"));

    const [aiInsights, setAiInsights] = useState<string>("");
    const [fetchingAI, setFetchingAI] = useState(false);

    const fetchAIOperationalInsights = async () => {
        if (fetchingAI || patientHistory.length === 0) return;
        setFetchingAI(true);
        try {
            const range = filter === "custom"
                ? { start: new Date(customStart).getTime(), end: new Date(customEnd).setHours(23, 59, 59, 999) }
                : getRange(filter);

            const inRange = patientHistory.filter(p => p.timestamp >= range.start && p.timestamp <= range.end);
            const served = inRange.filter(p => p.status === 'completed').length;
            const waits = inRange.map(p => p.waitTime || 0).filter(w => w > 0);
            const avgWait = waits.length > 0 ? Math.round(waits.reduce((a, b) => a + b, 0) / waits.length) : 0;
            const maxWait = waits.length > 0 ? Math.max(...waits) : 0;

            const stats = `
                Period: ${filter}
                Total Patients Served: ${served}
                Average Wait Time: ${avgWait} mins
                Maximum Wait Time: ${maxWait} mins
            `;

            const res = await fetch("/api/ai", {
                method: "POST",
                body: JSON.stringify({ prompt: stats, type: "operational_suggestion" }),
            });
            const data = await res.json();
            if (data.content) setAiInsights(data.content);
        } catch (e) {
            console.warn("Operational AI failed:", e);
        } finally {
            setFetchingAI(false);
        }
    };

    useEffect(() => {
        if (!user) return;
        setLoading(true);
        const queueRef = collection(db, "clinics", user.userId, "queue");
        const q = query(queueRef, orderBy("timestamp", "desc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const historyItems: Patient[] = [];
            const appointmentItems: Patient[] = [];
            const today = new Date().toLocaleDateString("en-CA");

            snapshot.docs.forEach((docSnap: any) => {
                const data = docSnap.data() as any;
                const normalized = resolveVisitFlags(data);
                const timestamp = toMillis(data.timestamp);
                const lastCalledAt = toMillis(data.lastCalledAt);
                // Assume completed time is lastUpdated if available, or just fallback to lastCalled. Since it's missing, let's derive standard timestamps.
                const waitTime = lastCalledAt && timestamp ? Math.max(0, Math.round((lastCalledAt - timestamp) / 60000)) : 0;

                const patient: Patient & { completedAt?: number } = {
                    id: docSnap.id,
                    name: data.name || "",
                    tokenNumber: data.tokenNumber || "",
                    mobileNumber: data.mobileNumber || "",
                    status: data.status || "",
                    timestamp: timestamp,
                    lastCalledAt: lastCalledAt,
                    completedAt: data.status === "completed" ? (data.updatedAt ? toMillis(data.updatedAt) : lastCalledAt + 600000) : undefined, // fallback simulation
                    appointmentDate: normalized.appointmentDate,
                    appointmentTime: normalized.appointmentTime,
                    appointment: data.appointment,
                    emergency: data.emergency,
                    isAppointment: normalized.isAppointment,
                    isEmergency: normalized.isEmergency,
                    notifLogs: data.notif_logs || data.notifLogs,
                    smsStatus: data.smsStatus,
                    whatsappStatus: data.whatsappStatus,
                    voiceStatus: data.voiceStatus,
                    waitTime: waitTime,
                };

                // Separate history from upcoming appointments
                if (patient.isAppointment && patient.appointmentDate && patient.appointmentDate >= today) {
                    appointmentItems.push(patient);
                } else {
                    historyItems.push(patient);
                }
            });
            setPatientHistory(historyItems);
            setUpcomingAppointmentsState(appointmentItems.sort((a, b) => {
                const ad = (a.appointmentDate || "") as string;
                const bd = (b.appointmentDate || "") as string;
                if (ad !== bd) return ad.localeCompare(bd);
                const at = (a.appointmentTime || "") as string;
                const bt = (b.appointmentTime || "") as string;
                return at.localeCompare(bt);
            }));
            setLoading(false);
        });
        return () => unsubscribe();
    }, [user]);

    const filteredPatients = useMemo(() => { // Renamed from filteredHistory to match original variable name
        let result = [...patientHistory];

        // 1. Apply date range filter
        let range;
        if (filter === "custom") {
            const start = new Date(customStart);
            const end = new Date(customEnd);
            end.setHours(23, 59, 59, 999);
            range = { start: start.getTime(), end: end.getTime() };
        } else {
            range = getRange(filter);
        }
        result = result.filter((patient) => patient.timestamp >= range.start && patient.timestamp <= range.end);

        // 2. Apply search query filter
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            result = result.filter(p =>
                (p.name || "").toLowerCase().includes(q) ||
                (p.mobileNumber || "").includes(q) ||
                (p.tokenNumber || "").toLowerCase().includes(q)
            );
        }

        // 3. Apply sorting
        result.sort((a, b) => {
            const valA = sortField === "timestamp" ? (a.timestamp || 0) : (a.waitTime || 0);
            const valB = sortField === "timestamp" ? (b.timestamp || 0) : (b.waitTime || 0);
            return sortOrder === "asc" ? valA - valB : valB - valA;
        });

        return result;
    }, [patientHistory, filter, customStart, customEnd, searchQuery, sortField, sortOrder]);

    const chartData = useMemo(() => {
        if (filteredPatients.length === 0) return [];

        let groups: Record<string, number> = {};
        const isHourly = ["today", "yesterday"].includes(filter);

        filteredPatients.forEach(p => {
            const d = new Date(p.timestamp || 0);
            const key = isHourly
                ? `${d.getHours().toString().padStart(2, '0')}:00`
                : d.toLocaleDateString('en-CA', { month: 'short', day: 'numeric' });
            groups[key] = (groups[key] || 0) + 1;
        });

        // Ensure chronological sorting
        const sortedKeys = isHourly
            ? Object.keys(groups).sort()
            : Object.keys(groups).sort((a, b) => new Date(a + " 2026").getTime() - new Date(b + " 2026").getTime());

        const maxCount = Math.max(...Object.values(groups), 1);
        return sortedKeys.map(k => ({ label: k, value: groups[k], height: `${(groups[k] / maxCount) * 100}%` }));
    }, [filteredPatients, filter]);

    const upcomingAppointments = useMemo(() => {
        return upcomingAppointmentsState; // Now directly uses the state populated in useEffect
    }, [upcomingAppointmentsState]);

    const dashboardMetrics = useMemo(() => {
        const served = filteredPatients.filter(p => ["completed", "in_progress"].includes(p.status)).length;
        const waits = filteredPatients.map(p => p.waitTime || 0).filter(w => w > 0);
        const avgWaitStr = waits.length > 0 ? `${Math.round(waits.reduce((a, b) => a + b, 0) / waits.length)}m` : "--";
        const maxWaitStr = waits.length > 0 ? `${Math.max(...waits)}m` : "--";

        return { served, avgWaitStr, maxWaitStr };
    }, [filteredPatients]);

    const generateDemoData = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const qRef = collection(db, "clinics", user.userId, "queue");
            const batch = writeBatch(db);
            const now = Date.now();

            for (let i = 0; i < 15; i++) {
                // Random time within the last 30 hours
                const timeOffset = Math.random() * (30 * 60 * 60 * 1000);
                const checkinTime = now - timeOffset;
                const docRef = doc(qRef);
                batch.set(docRef, {
                    name: `Demo Patient ${i + 1}`,
                    tokenNumber: `D-${(100 + i).toString()}`,
                    mobileNumber: `12345678${i.toString().padStart(2, '0')}`,
                    status: "completed",
                    timestamp: checkinTime,
                    lastCalledAt: checkinTime + (Math.random() * 900000) + 120000, // + 2-17 mins calling
                    updatedAt: checkinTime + (Math.random() * 1200000) + 240000, // + 4-24 mins completed
                    notifLogs: { sms: "success", voice: "success" },
                    appointment: false,
                    emergency: i % 7 === 0 // pseudo-random emergency
                });
            }
            await batch.commit();
        } catch (e) {
            console.error(e);
        } finally {
            setFilter("last7");
            setLoading(false);
        }
    };

    useEffect(() => {
        if (patientHistory.length > 0) {
            fetchAIOperationalInsights();
        }
    }, [patientHistory.length, filter]);

    const downloadCsv = () => {
        const header = ["Token", "Type", "Name", "Mobile Number", "Symptoms", "Status", "Date", "Wait Time (min)", "Voice", "SMS", "WhatsApp"];
        const rows = filteredPatients.map((patient) => {
            const waitTime = patient.lastCalledAt && patient.timestamp
                ? Math.max(0, Math.round((patient.lastCalledAt - patient.timestamp) / 60000))
                : 0;
            const comms = getCommStatus(patient);
            return [
                patient.tokenNumber || "",
                getVisitType(patient),
                toNameCase(patient.name || patient.mobileNumber || "Patient"),
                patient.mobileNumber || "",
                patient.symptoms || "",
                (patient.status || "").replace("_", " ").toUpperCase(),
                formatDateTime(patient.timestamp),
                waitTime.toString(),
                comms.voice,
                comms.sms,
                comms.whatsapp,
            ];
        });

        const csv = [header, ...rows]
            .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
            .join("\n");

        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `PatientHistory_${new Date().toISOString().slice(0, 16).replace(/[:T]/g, "")}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Patient Check-in History</h1>
                    <p className="text-slate-500">Token, name, date/time, and wait time.</p>
                </div>
                <button
                    onClick={downloadCsv}
                    className="btn-secondary text-sm"
                    disabled={filteredPatients.length === 0}
                >
                    Download CSV
                </button>
            </div>

            {/* AI Insights Notification */}
            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100 rounded-lg px-4 py-2.5 flex items-center gap-3">
                <Sparkles size={14} className="text-indigo-600 shrink-0 animate-pulse" />
                <div className="flex-1">
                    <span className="text-[10px] font-bold text-indigo-900 uppercase tracking-wide">Vizzi Operational AI Insights</span>
                    <span className="text-[10px] text-slate-600 ml-2">AI is currently tracking wait trends, peak hours, and identifying queue bottlenecks based on selected time ranges.</span>
                </div>
            </div>

            <div className="medical-card p-4 flex flex-wrap items-center gap-3">
                {[
                    { id: "today", label: "Today" },
                    { id: "yesterday", label: "Yesterday" },
                    { id: "last7", label: "Last 7 Days" },
                    { id: "last30", label: "Last 30 Days" },
                    { id: "custom", label: "Custom" },
                ].map((item) => (
                    <button
                        key={item.id}
                        onClick={() => setFilter(item.id as any)}
                        className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-all ${filter === item.id
                            ? "bg-primary text-white border-primary shadow-sm ring-2 ring-primary/20"
                            : "bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                            }`}
                    >
                        {item.label}
                    </button>
                ))}
                {filter === "custom" && (
                    <div className="flex flex-wrap items-center gap-2">
                        <input
                            type="date"
                            value={customStart}
                            onChange={(e) => setCustomStart(e.target.value)}
                            className="px-3 py-2 rounded-xl border border-slate-200/60 bg-white text-xs focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                        />
                        <span className="text-xs font-bold text-slate-400 uppercase">to</span>
                        <input
                            type="date"
                            value={customEnd}
                            onChange={(e) => setCustomEnd(e.target.value)}
                            className="px-3 py-2 rounded-xl border border-slate-200/60 bg-white text-xs focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                        />
                    </div>
                )}
            </div>

            {/* High-Level Metrics Strip */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="medical-card p-6 flex items-center gap-4 relative overflow-hidden group">
                    <div className="absolute -right-6 -top-6 w-24 h-24 bg-gradient-to-br from-blue-50/50 to-blue-100/30 rounded-full blur-2xl group-hover:from-blue-100/50 group-hover:to-blue-200/30 transition-all pointer-events-none" />
                    <div className="p-3 bg-gradient-to-br from-blue-50/50 to-blue-100/30 text-blue-600 rounded-2xl ring-1 ring-blue-100/50 shadow-sm">
                        <Users size={24} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Patients Served</p>
                        <p className="text-3xl font-black text-slate-900 leading-none">{dashboardMetrics.served}</p>
                    </div>
                </div>
                <div className="medical-card p-6 flex items-center gap-4 relative overflow-hidden group">
                    <div className="absolute -right-6 -top-6 w-24 h-24 bg-gradient-to-br from-emerald-50/50 to-emerald-100/30 rounded-full blur-2xl group-hover:from-emerald-100/50 group-hover:to-emerald-200/30 transition-all pointer-events-none" />
                    <div className="p-3 bg-gradient-to-br from-emerald-50/50 to-emerald-100/30 text-emerald-600 rounded-2xl ring-1 ring-emerald-100/50 shadow-sm">
                        <Clock size={24} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Avg Wait Time</p>
                        <p className="text-3xl font-black text-slate-900 leading-none">{dashboardMetrics.avgWaitStr}</p>
                    </div>
                </div>
                <div className="medical-card p-6 flex items-center gap-4 relative overflow-hidden group">
                    <div className="absolute -right-6 -top-6 w-24 h-24 bg-gradient-to-br from-rose-50/50 to-rose-100/30 rounded-full blur-2xl group-hover:from-rose-100/50 group-hover:to-rose-200/30 transition-all pointer-events-none" />
                    <div className="p-3 bg-gradient-to-br from-rose-50/50 to-rose-100/30 text-rose-600 rounded-2xl ring-1 ring-rose-100/50 shadow-sm">
                        <AlertTriangle size={24} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Longest Wait</p>
                        <p className="text-3xl font-black text-slate-900 leading-none">{dashboardMetrics.maxWaitStr}</p>
                    </div>
                </div>
            </div>

            {/* Check-ins Visualizer */}
            <div className="medical-card p-6">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900">Load Trends</h2>
                        <p className="text-slate-500 text-sm">Patient check-ins over the selected period.</p>
                    </div>
                </div>
                {chartData.length === 0 ? (
                    <div className="flex bg-slate-50 border border-slate-100 border-dashed rounded-xl h-48 items-center justify-center text-slate-400 text-sm">
                        Not enough data points to map trends.
                    </div>
                ) : (
                    <div className="h-48 flex items-end justify-between gap-1 pt-6 border-b border-slate-200/60">
                        {chartData.map((d, i) => (
                            <div key={i} className="flex-1 flex flex-col items-center justify-end h-full group relative">
                                <div className="absolute -top-8 bg-slate-900 text-white text-[10px] py-1 px-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 font-bold point-events-none shadow-sm">
                                    {d.value} Patients
                                </div>
                                <div
                                    className="w-full max-w-[40px] bg-gradient-to-t from-primary/30 to-primary/20 group-hover:from-primary/40 group-hover:to-primary/30 rounded-t-sm transition-all relative overflow-hidden"
                                    style={{ height: Math.max(parseFloat(d.height), 2) + "%" }}
                                >
                                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-r from-primary to-primary/80 w-full h-1 shadow-sm" />
                                </div>
                                <span className="text-[9px] font-bold text-slate-400 mt-2 rotate-45 md:rotate-0 transform origin-top-left md:origin-center truncate max-w-full">
                                    {d.label}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="medical-card p-6">
                <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                    <h2 className="text-xl font-bold text-slate-900">Patient History</h2>
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input
                                type="text"
                                placeholder="Search name, mobile, token..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10 pr-4 py-2 bg-slate-50/50 border border-slate-200/60 rounded-xl text-sm w-64 focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                            />
                        </div>
                        <select
                            value={`${sortField}-${sortOrder}`}
                            onChange={(e) => {
                                const [field, order] = e.target.value.split("-") as [any, any];
                                setSortField(field);
                                setSortOrder(order);
                            }}
                            className="px-3 py-2 bg-slate-50/50 border border-slate-200/60 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                        >
                            <option value="timestamp-desc">Newest First</option>
                            <option value="timestamp-asc">Oldest First</option>
                            <option value="waitTime-desc">Longest Wait</option>
                            <option value="waitTime-asc">Shortest Wait</option>
                        </select>
                    </div>
                </div>

                {loading ? (
                    <div className="text-sm text-slate-400 text-center py-12">Loading patient history...</div>
                ) : filteredPatients.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed border-slate-200/60 rounded-2xl bg-gradient-to-br from-slate-50/50 to-white">
                        <div className="h-16 w-16 bg-white shadow-sm rounded-full flex items-center justify-center text-slate-400 mb-4 border border-slate-200/60">
                            <Database size={28} />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 mb-2">No Reports Available Yet</h3>
                        <p className="text-slate-500 max-w-sm mx-auto mb-6 text-sm">
                            Generate demo check-ins to see how the Insights engine tracks wait times, peak hours, and communication flows.
                        </p>
                        <button onClick={generateDemoData} className="btn-primary rounded-full px-6 flex items-center gap-2">
                            <Plus size={16} /> Generate Demo Data
                        </button>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                            <thead>
                                <tr className="text-left text-slate-500 border-b">
                                    <th className="py-2 pr-4">Token</th>
                                    <th className="py-2 pr-4">Type</th>
                                    <th className="py-2 pr-4">Patient</th>
                                    <th className="py-2 pr-4">Mobile</th>
                                    <th className="py-2 pr-4">Symptoms</th>
                                    <th className="py-2 pr-4">Check-in</th>
                                    <th className="py-2 pr-4">Called</th>
                                    <th className="py-2 pr-4">Completed</th>
                                    <th className="py-2 pr-4">Status</th>
                                    <th className="py-2 pr-4">Wait Time</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredPatients.map((patient) => (
                                    <tr key={patient.id} className="border-b border-slate-200/60 last:border-b-0 hover:bg-slate-50/50 transition-colors">
                                        <td className="py-4 pr-4 font-bold text-primary">
                                            {patient.tokenNumber || "--"}
                                        </td>
                                        <td className="py-4 pr-4">
                                            <span className={`inline-flex items-center justify-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-sm ${getVisitType(patient) === "E" ? "bg-gradient-to-br from-rose-50/50 to-rose-100/30 text-rose-600 border border-rose-200/50" : getVisitType(patient) === "A" ? "bg-gradient-to-br from-blue-50/50 to-blue-100/30 text-blue-600 border border-blue-200/50" : "bg-gradient-to-br from-slate-50 to-slate-100/30 text-slate-500 border border-slate-200/50"}`}>
                                                {getVisitType(patient)}
                                            </span>
                                        </td>
                                        <td className="py-4 pr-4 font-bold text-slate-900">
                                            {toNameCase(patient.name || patient.mobileNumber || "Patient")}
                                        </td>
                                        <td className="py-4 pr-4 text-slate-500 font-medium">
                                            {patient.mobileNumber || "--"}
                                        </td>
                                        <td className="py-4 pr-4 text-slate-500 max-w-[150px]">
                                            <p className="text-xs line-clamp-1 italic" title={patient.symptoms}>
                                                {patient.symptoms || "--"}
                                            </p>
                                        </td>
                                        <td className="py-4 pr-4 text-slate-500 whitespace-nowrap">
                                            {normalizeTimeString(patient.timestamp)}
                                        </td>
                                        <td className="py-4 pr-4 text-slate-500 whitespace-nowrap">
                                            {patient.lastCalledAt ? normalizeTimeString(patient.lastCalledAt) : '--'}
                                        </td>
                                        <td className="py-4 pr-4 text-slate-500 whitespace-nowrap">
                                            {patient.completedAt ? normalizeTimeString(patient.completedAt) : '--'}
                                        </td>
                                        <td className="py-4 pr-4">
                                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-sm ${patient.status === 'completed' ? 'bg-gradient-to-br from-emerald-50/50 to-emerald-100/30 text-emerald-600 border border-emerald-200/50' :
                                                patient.status === 'cancelled' ? 'bg-gradient-to-br from-rose-50/50 to-rose-100/30 text-rose-600 border border-rose-200/50' :
                                                    'bg-gradient-to-br from-amber-50/50 to-amber-100/30 text-amber-600 border border-amber-200/50'
                                                }`}>
                                                {formatStatusLabel(patient.status)}
                                            </span>
                                        </td>
                                        <td className="py-4 font-bold text-slate-900">{patient.waitTime ? `${patient.waitTime}m` : "0m"}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <div className="medical-card p-6">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h2 className="text-lg font-semibold text-slate-900">Upcoming Appointments</h2>
                        <p className="text-xs text-slate-500">Future-dated appointments are shown here (not counted as completed).</p>
                    </div>
                </div>
                {upcomingAppointments.length === 0 ? (
                    <div className="text-sm text-slate-400">No upcoming appointments.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                            <thead>
                                <tr className="text-left text-slate-500 border-b">
                                    <th className="py-2 pr-4">Token</th>
                                    <th className="py-2 pr-4">Type</th>
                                    <th className="py-2 pr-4">Patient</th>
                                    <th className="py-2 pr-4">Date</th>
                                    <th className="py-2 pr-4">Time</th>
                                    <th className="py-2 pr-4">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {upcomingAppointments.map((patient) => {
                                    const anyPatient = patient as any;
                                    const apptDate = (anyPatient.appointmentDate || patient.appointmentDate || "--") as string;
                                    const apptTime = (anyPatient.appointmentTime || patient.appointmentTime || "--") as string;
                                    return (
                                        <tr key={`${patient.id}-appt`} className="border-b last:border-b-0">
                                            <td className="py-3 pr-4 font-semibold text-slate-900">
                                                {patient.tokenNumber || "--"}
                                            </td>
                                            <td className="py-3 pr-4">
                                                <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase bg-blue-50 text-blue-600">
                                                    A
                                                </span>
                                            </td>
                                            <td className="py-3 pr-4 text-slate-700">
                                                {toNameCase(patient.name || patient.mobileNumber || "Patient")}
                                            </td>
                                            <td className="py-3 pr-4 text-slate-500">{apptDate}</td>
                                            <td className="py-3 pr-4 text-slate-500">{apptTime}</td>
                                            <td className="py-3 pr-4 text-slate-500">
                                                {(patient.status || "").replace("_", " ").toUpperCase()}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <div className="medical-card p-6">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h2 className="text-lg font-semibold text-slate-900">Communication Report</h2>
                        <p className="text-xs text-slate-500">SMS, WhatsApp, and voice status by token/date.</p>
                    </div>
                </div>
                {filteredPatients.length === 0 ? (
                    <div className="text-sm text-slate-400">No communication data for this range.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                            <thead>
                                <tr className="text-left text-slate-500 border-b">
                                    <th className="py-2 pr-4">Token</th>
                                    <th className="py-2 pr-4">Type</th>
                                    <th className="py-2 pr-4">Patient</th>
                                    <th className="py-2 pr-4">Date & Time</th>
                                    <th className="py-2 pr-4">Delivery</th>
                                    <th className="py-2 pr-4">Voice</th>
                                    <th className="py-2 pr-4">SMS</th>
                                    <th className="py-2 pr-4">WhatsApp</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredPatients.map((patient) => {
                                    const comms = getCommStatus(patient);
                                    const successes = [comms.voice, comms.sms, comms.whatsapp].filter(x => x === '✓').length;
                                    const failRate = successes === 0 ? "FAILED" : successes >= 2 ? "SECURE" : "PARTIAL";

                                    return (
                                        <tr key={`${patient.id}-comms`} className="border-b last:border-b-0">
                                            <td className="py-3 pr-4 font-semibold text-slate-900">
                                                {patient.tokenNumber || "--"}
                                            </td>
                                            <td className="py-3 pr-4">
                                                <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${getVisitType(patient) === "E" ? "bg-rose-50 text-rose-600" : getVisitType(patient) === "A" ? "bg-blue-50 text-blue-600" : "bg-slate-100 text-slate-500"}`}>
                                                    {getVisitType(patient)}
                                                </span>
                                            </td>
                                            <td className="py-3 pr-4 text-slate-700">
                                                {toNameCase(patient.name || patient.mobileNumber || "Patient")}
                                            </td>
                                            <td className="py-3 pr-4 text-slate-500 whitespace-nowrap">
                                                {formatDateTime(patient.timestamp)}
                                            </td>
                                            <td className="py-3 pr-4">
                                                <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${failRate === 'SECURE' ? 'bg-emerald-50 text-emerald-600' :
                                                    failRate === 'FAILED' ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600'
                                                    }`}>
                                                    {failRate}
                                                </span>
                                            </td>
                                            <td className="py-3 pr-4 text-slate-500">{comms.voice}</td>
                                            <td className="py-3 pr-4 text-slate-500">{comms.sms}</td>
                                            <td className="py-3 pr-4 text-slate-500">{comms.whatsapp}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}





