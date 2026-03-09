"use client";

import { db, collection, doc, getDoc, getDocs, setDoc, updateDoc, addDoc, deleteDoc, onSnapshot, query, where, orderBy, limit, writeBatch, uploadToStorage } from "@/lib/db";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { TrendingUp, AlertTriangle, Clock, Activity, BarChart3, Fingerprint, Database, Plus, Sparkles, CheckCircle2 } from "lucide-react";

type Patient = {
    id: string;
    name: string;
    tokenNumber: string;
    mobileNumber: string;
    status: string;
    timestamp: number;
    lastCalledAt: number;
};

const toMillis = (value: any) => {
    if (typeof value === "number") return value;
    if (value && typeof value.toMillis === "function") return value.toMillis();
    return 0;
};

const formatMinutes = (minutes: number) => `${minutes.toFixed(1)} min`;

const getRange = (days: number) => {
    const now = new Date();
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).getTime();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    start.setDate(start.getDate() - (days - 1));
    return { start: start.getTime(), end };
};

export default function AnalyticsPage() {
    const { user } = useAuth();
    const [patients, setPatients] = useState<Patient[]>([]);
    const [rangeDays, setRangeDays] = useState<7 | 30>(7);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!user) return;
        const queueRef = collection(db, "clinics", user.userId, "queue");
        const q = query(queueRef, orderBy("timestamp", "desc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const items = snapshot.docs.map((docSnap: any) => {
                const data = docSnap.data() as any;
                return {
                    id: docSnap.id,
                    name: data.name || "",
                    tokenNumber: data.tokenNumber || "",
                    mobileNumber: data.mobileNumber || "",
                    status: data.status || "",
                    timestamp: toMillis(data.timestamp),
                    lastCalledAt: toMillis(data.lastCalledAt),
                } as Patient;
            });
            setPatients(items);
        });
        return () => unsubscribe();
    }, [user]);

    const analytics = useMemo(() => {
        const { start, end } = getRange(rangeDays);
        const inRange = patients.filter((p) => p.timestamp >= start && p.timestamp <= end);
        const called = inRange.filter((p) => p.lastCalledAt && p.lastCalledAt >= p.timestamp);
        const waitTimes = called.map((p) => (p.lastCalledAt - p.timestamp) / 60000);
        const avgWait = waitTimes.length ? waitTimes.reduce((a, b) => a + b, 0) / waitTimes.length : 0;
        const maxWait = waitTimes.length ? Math.max(...waitTimes) : 0;
        const highWait = waitTimes.filter((w) => w >= 15).length;
        const highWaitPct = waitTimes.length ? Math.round((highWait / waitTimes.length) * 100) : 0;

        const bins = [0, 5, 10, 15, 20, 30, 60];
        const histogram = bins.map((min, idx) => {
            const max = bins[idx + 1] ?? Infinity;
            const count = waitTimes.filter((w) => w >= min && w < max).length;
            return { min, max, count };
        });
        const maxCount = Math.max(1, ...histogram.map((b) => b.count));

        const outliers = called
            .map((p) => ({
                ...p,
                wait: (p.lastCalledAt - p.timestamp) / 60000,
            }))
            .sort((a, b) => b.wait - a.wait)
            .slice(0, 5);

        const statusCounts = inRange.reduce(
            (acc, p) => {
                acc[p.status] = (acc[p.status] || 0) + 1;
                return acc;
            },
            {} as Record<string, number>
        );

        const total = inRange.length;
        const missedPct = total ? Math.round(((statusCounts.missed || 0) / total) * 100) : 0;
        const notRespPct = total ? Math.round(((statusCounts.not_responding || 0) / total) * 100) : 0;
        const cancelledPct = total ? Math.round(((statusCounts.cancelled || 0) / total) * 100) : 0;

        const queueState =
            (highWaitPct > 30 || total > 40) ? "Overloaded" :
                (highWaitPct > 15 || total > 20) ? "Busy" : "Normal";

        return {
            total,
            avgWait,
            maxWait,
            highWaitPct,
            queueState,
            histogram,
            maxCount,
            outliers,
            missedPct,
            notRespPct,
            cancelledPct,
        };
    }, [patients, rangeDays]);

    const chartData = useMemo(() => {
        if (patients.length === 0) return [];

        let groups: Record<string, number> = {};
        const { start, end } = getRange(rangeDays);
        const inRange = patients.filter((p) => p.timestamp >= start && p.timestamp <= end);

        inRange.forEach(p => {
            const d = new Date(p.timestamp || 0);
            const key = `${d.getHours().toString().padStart(2, '0')}:00`;
            groups[key] = (groups[key] || 0) + 1;
        });

        // Ensure chronological sorting
        const sortedKeys = Object.keys(groups).sort();
        const maxCount = Math.max(...Object.values(groups), 1);

        return sortedKeys.map(k => ({ label: k, value: groups[k], height: `${(groups[k] / maxCount) * 100}%` }));
    }, [patients, rangeDays]);

    const generateDemoData = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const qRef = collection(db, "clinics", user.userId, "queue");
            const batch = writeBatch(db);
            const now = Date.now();

            for (let i = 0; i < 20; i++) {
                // Random time within the last 7 days
                const timeOffset = Math.random() * (7 * 24 * 60 * 60 * 1000);
                const checkinTime = now - timeOffset;
                const docRef = doc(qRef);
                batch.set(docRef, {
                    name: `Demo Patient ${i + 1}`,
                    tokenNumber: `A-${(100 + i).toString()}`,
                    mobileNumber: `12345678${i.toString().padStart(2, '0')}`,
                    status: "completed",
                    timestamp: checkinTime,
                    lastCalledAt: checkinTime + (Math.random() * 1500000) + 120000,
                });
            }
            await batch.commit();
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const [aiInsights, setAiInsights] = useState<string>("");
    const [fetchingAI, setFetchingAI] = useState(false);
    const [showAI, setShowAI] = useState(false);

    const hasEnoughData = patients.length >= 50;

    const fetchAIInsights = async () => {
        if (fetchingAI || !hasEnoughData || !showAI) return;
        setFetchingAI(true);
        try {
            const { start, end } = getRange(rangeDays);
            const inRange = patients.filter((p) => p.timestamp >= start && p.timestamp <= end);
            const stats = `
                Range: Last ${rangeDays} days
                Total Patients: ${inRange.length}
                Average Wait: ${formatMinutes(analytics.avgWait)}
                Max Wait: ${formatMinutes(analytics.maxWait)}
                High Wait (>15m) %: ${analytics.highWaitPct}%
                No-show %: ${analytics.missedPct}%
                Not Responding %: ${analytics.notRespPct}%
                Cancelled %: ${analytics.cancelledPct}%
                Peak Wait Times: ${analytics.outliers.map(p => formatMinutes(p.wait)).join(", ")}
            `;

            const res = await fetch("/api/ai", {
                method: "POST",
                body: JSON.stringify({ prompt: stats, type: "analytics_insight" }),
            });
            const data = await res.json();
            if (data.content) setAiInsights(data.content);
        } catch (e) {
            console.warn("Analytics AI failed:", e);
        } finally {
            setFetchingAI(false);
        }
    };

    useEffect(() => {
        if (showAI && hasEnoughData) {
            fetchAIInsights();
        }
    }, [showAI, rangeDays, hasEnoughData]);

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Analytics</h1>
                    <p className="text-slate-500">Wait time trends and queue efficiency insights.</p>
                </div>
                <div className="flex items-center gap-2">
                    {[7, 30].map((days) => (
                        <button
                            key={days}
                            onClick={() => setRangeDays(days as 7 | 30)}
                            className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${rangeDays === days
                                ? "bg-primary text-white border-primary"
                                : "bg-white text-slate-500 border-slate-200 hover:border-slate-300"
                                }`}
                        >
                            Last {days} days
                        </button>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div className="medical-card p-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Avg Wait Time</p>
                            <p className="text-2xl font-bold text-slate-900 mt-1">{formatMinutes(analytics.avgWait)}</p>
                        </div>
                        <div className="bg-blue-50 text-blue-600 p-2.5 rounded-xl">
                            <Clock size={22} />
                        </div>
                    </div>
                </div>
                <div className="medical-card p-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Max Wait</p>
                            <p className="text-2xl font-bold text-slate-900 mt-1">{formatMinutes(analytics.maxWait)}</p>
                        </div>
                        <div className="bg-rose-50 text-rose-600 p-2.5 rounded-xl">
                            <AlertTriangle size={22} />
                        </div>
                    </div>
                </div>
                <div className="medical-card p-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">High Wait %</p>
                            <p className="text-2xl font-bold text-slate-900 mt-1">{analytics.highWaitPct}%</p>
                        </div>
                        <div className="bg-amber-50 text-amber-600 p-2.5 rounded-xl">
                            <TrendingUp size={22} />
                        </div>
                    </div>
                </div>
                <div className="medical-card p-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Patients</p>
                            <p className="text-2xl font-bold text-slate-900 mt-1">{analytics.total}</p>
                        </div>
                        <div className="bg-emerald-50 text-emerald-600 p-2.5 rounded-xl">
                            <Activity size={22} />
                        </div>
                    </div>
                </div>
                <div className="medical-card p-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Queue Load</p>
                            <p className="text-xl font-black text-slate-900 mt-1.5 uppercase tracking-widest">{analytics.queueState}</p>
                        </div>
                        <div className={`p-2.5 rounded-xl ${analytics.queueState === 'Overloaded' ? 'bg-rose-50 text-rose-600' :
                            analytics.queueState === 'Busy' ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'
                            }`}>
                            <Activity size={22} />
                        </div>
                    </div>
                </div>
            </div>

            {/* AI Insights Prominent Top Panel */}
            <div className="medical-card p-6 bg-slate-900 border-none relative overflow-hidden group">
                <div className="absolute right-0 top-0 w-64 h-64 bg-primary/20 rounded-full blur-[60px] pointer-events-none group-hover:bg-primary/30 transition-colors" />

                <div className="flex flex-wrap items-center justify-between mb-4 relative z-10 gap-4">
                    <h2 className="text-sm font-black uppercase tracking-widest flex items-center gap-2 text-white">
                        <Sparkles size={18} className="text-primary-light" />
                        Vizzi Operational AI Insights
                    </h2>
                    <div className="flex items-center gap-3">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                            Powered by <span className="text-primary-light">AWS Bedrock</span>
                        </span>
                        <button
                            onClick={() => setShowAI(!showAI)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${showAI ? 'bg-primary' : 'bg-slate-700'}`}
                        >
                            <span className={`inline-block h-4 w-4 transform rounded-full transition-transform ${showAI ? 'translate-x-6 bg-white' : 'translate-x-1 bg-slate-400'}`} />
                        </button>
                    </div>
                </div>

                <div className="relative z-10 mt-2">
                    {!showAI ? (
                        <div className="text-sm text-slate-400">
                            Enable the AI Engine to generate predictive queue forecasting, detect peak hour surges, and map real-time structural optimizations based on the selected period data.
                        </div>
                    ) : !hasEnoughData ? (
                        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
                            <p className="text-sm text-amber-400 font-bold mb-1 flex items-center gap-2">
                                <Fingerprint size={16} /> Data Baseline Required
                            </p>
                            <p className="text-xs text-amber-500/80 leading-relaxed">
                                AI predictive models require at least 50 recorded patient check-ins to generate reliable architectural clinic insights. Currently tracking: <span className="text-white font-bold">{patients.length}/50</span>.
                            </p>
                        </div>
                    ) : fetchingAI ? (
                        <div className="space-y-3 animate-pulse py-2">
                            <div className="h-4 bg-slate-800 rounded w-full" />
                            <div className="h-4 bg-slate-800 rounded w-5/6" />
                            <div className="h-4 bg-slate-800 rounded w-2/3" />
                        </div>
                    ) : (
                        <div className="text-base text-slate-200 font-medium leading-relaxed whitespace-pre-line text-balance pr-10">
                            {aiInsights || "Crunching check-in vectors to isolate queue bottlenecks..."}
                        </div>
                    )}
                </div>
            </div>

            {/* Check-ins Peak Hour Bar Chart */}
            <div className="medical-card p-6">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-lg font-bold text-slate-900">Peak Hour Volumes</h2>
                        <p className="text-slate-500 text-xs">Patient check-ins mapped structurally by hour.</p>
                    </div>
                </div>
                {chartData.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50">
                        <div className="h-12 w-12 bg-white shadow-sm rounded-full flex items-center justify-center text-slate-400 mb-4 border border-slate-100">
                            <Database size={24} />
                        </div>
                        <h3 className="text-sm font-bold text-slate-900 mb-1">Not Enough Data</h3>
                        <p className="text-slate-500 max-w-sm mx-auto mb-4 text-xs">
                            Generate demo records to fire up the charts and predictive AI models.
                        </p>
                        <button onClick={generateDemoData} disabled={loading} className="btn-primary rounded-full px-5 py-2 text-xs flex items-center gap-2">
                            {loading ? "Generating..." : <><Plus size={14} /> Generate Demo Data</>}
                        </button>
                    </div>
                ) : (
                    <div className="h-48 flex items-end justify-between gap-1 md:gap-2 pt-6 border-b border-slate-200">
                        {chartData.map((d, i) => (
                            <div key={i} className="flex-1 flex flex-col items-center justify-end h-full group relative">
                                <div className="absolute -top-8 bg-slate-900 text-white text-[10px] py-1 px-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 font-bold point-events-none">
                                    {d.value} Patients
                                </div>
                                <div
                                    className="w-full max-w-[40px] bg-primary/20 group-hover:bg-primary/40 rounded-t-lg transition-all relative overflow-hidden"
                                    style={{ height: Math.max(parseFloat(d.height), 2) + "%" }}
                                >
                                    <div className="absolute bottom-0 left-0 right-0 bg-primary w-full h-1" />
                                </div>
                                <span className="text-[9px] font-bold text-slate-400 mt-2 rotate-45 md:rotate-0 transform origin-top-left md:origin-center truncate max-w-full">
                                    {d.label}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="medical-card p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h2 className="text-lg font-bold text-slate-900">Wait Time Distribution (Last 7 Days)</h2>
                            <p className="text-xs text-slate-500">Total Analyzed: <span className="font-bold text-slate-700">{analytics.total} Patients</span></p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4 mb-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        <div className="w-24">Wait Duration</div>
                        <div className="flex-1">Distribution</div>
                        <div className="w-10 text-right">Count</div>
                    </div>
                    <div className="space-y-4">
                        {analytics.histogram.map((bin) => (
                            <div key={`${bin.min}-${bin.max}`} className="flex items-center gap-4 group">
                                <div className="w-24 text-xs font-medium text-slate-600">
                                    {bin.max === Infinity ? `${bin.min}+ min` : `${bin.min}-${bin.max} min`}
                                </div>
                                <div className="flex-1 h-4 bg-slate-50 rounded-full overflow-hidden border border-slate-100">
                                    <div
                                        className="h-full bg-primary/80 group-hover:bg-primary transition-all"
                                        style={{ width: `${Math.round((bin.count / analytics.maxCount) * 100)}%` }}
                                    />
                                </div>
                                <div className="w-10 text-xs font-bold text-slate-900 text-right">{bin.count}</div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="medical-card p-6">
                    <h2 className="text-lg font-semibold text-slate-900">Longest Waits</h2>
                    <p className="text-xs text-slate-500">Patients with the highest wait time.</p>
                    <div className="mt-4 space-y-3">
                        {analytics.outliers.length === 0 ? (
                            <div className="text-sm text-slate-400">No waits recorded yet.</div>
                        ) : (
                            analytics.outliers.map((patient) => (
                                <div key={patient.id} className="flex items-center justify-between border border-slate-100 rounded-xl p-3 bg-slate-50/50">
                                    <div>
                                        <p className="font-semibold text-slate-900">
                                            {patient.name || patient.mobileNumber || "Patient"}
                                        </p>
                                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Token {patient.tokenNumber || "--"}</p>
                                    </div>
                                    <div className="text-sm font-bold text-rose-600 px-3 py-1 bg-rose-50 rounded-full">
                                        {formatMinutes(patient.wait)}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
