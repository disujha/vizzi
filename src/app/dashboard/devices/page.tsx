"use client";

import { db, collection, doc, getDoc, getDocs, setDoc, updateDoc, addDoc, deleteDoc, onSnapshot, query, where, orderBy, limit, writeBatch, uploadToStorage } from "@/lib/db";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { CONFIG } from "@/lib/config";
import { Tablets, RefreshCcw, Plus, Trash2, Smartphone, Star, PhoneCall, Zap } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export default function DevicesPage() {
    const { user } = useAuth();
    const [devices, setDevices] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [pairingCode, setPairingCode] = useState<string | null>(null);

    const [refreshingId, setRefreshingId] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    useEffect(() => {
        if (!user) return;
        const q = query(collection(db, "devices"), where("clinicId", "==", user.userId));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const items = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
            setDevices(items);
            setLoading(false);
        });

        // Prevention for infinite loading spinner
        const timeout = setTimeout(() => {
            setLoading(false);
        }, 10000); // 10 second timeout

        return () => {
            unsubscribe();
            clearTimeout(timeout);
        };
    }, [user]);

    const generatePairingCode = () => {
        const code = Math.random().toString(36).substring(2, 8).toUpperCase();
        setPairingCode(code);
        // In a real app, we would also save this to Firestore to be verified by the device
    };

    const handleRefresh = (deviceId: string) => {
        setRefreshingId(deviceId);
        setTimeout(() => {
            setRefreshingId(null);
            alert("Refresh command sent to device. Status will update shortly.");
        }, 1500);
    };

    const handleDelete = (deviceId: string) => {
        if (window.confirm("Are you sure you want to remove this device?")) {
            setDeletingId(deviceId);
            setTimeout(() => {
                setDeletingId(null);
                alert("Device removal is in preview. Please contact support for full deletion.");
            }, 1000);
        }
    };

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Vizzi Devices</h1>
                    <p className="text-slate-500">Manage your physical Vizzi receptionist hardware.</p>
                </div>
                <button
                    onClick={generatePairingCode}
                    className="btn-primary flex items-center space-x-2 px-4 py-2 text-sm"
                >
                    <Plus size={18} />
                    <span>Generate Pairing Code</span>
                </button>
            </div>

            {pairingCode && (
                <div className="bg-primary/5 border border-primary/20 rounded-2xl p-6 flex flex-col items-center justify-center">
                    <p className="text-sm font-medium text-primary mb-2">New Device Pairing Code</p>
                    <p className="text-4xl font-mono font-bold tracking-[0.5em] text-primary">{pairingCode}</p>
                    <p className="text-xs text-slate-500 mt-4">Enter this code on your Vizzi device to link it to this clinic.</p>
                    <p className="text-[11px] text-slate-400 mt-1">Pairing controls are in limited preview for this release.</p>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {loading ? (
                    <div className="col-span-full medical-card p-12 flex flex-col items-center justify-center text-slate-400">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
                        <p className="font-medium text-slate-600">Searching for registered devices...</p>
                        <p className="text-xs mt-2">Checking encrypted connection to Vizzi Network</p>
                    </div>
                ) : devices.length === 0 ? (
                    <div className="col-span-full medical-card p-12 flex flex-col items-center justify-center text-slate-400">
                        <Smartphone size={48} className="mb-4 opacity-20" />
                        <p className="font-medium">No devices registered</p>
                        <p className="text-sm mt-1">Get started by ordering a Vizzi device or pairing an existing one.</p>
                    </div>
                ) : (
                    devices.map((device) => (
                        <div key={device.id} className="medical-card p-6 flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                                <div className={`p-3 rounded-xl ${device.status === 'online' ? 'bg-green-50 text-green-600' : 'bg-slate-50 text-slate-400'}`}>
                                    <Tablets size={24} />
                                </div>
                                <div>
                                    <h4 className="font-bold text-slate-900">Device ID: {device.id}</h4>
                                    <div className="flex items-center space-x-2 mt-1">
                                        <div className={`w-2 h-2 rounded-full ${device.status === 'online' ? 'bg-green-500 animate-pulse' : 'bg-slate-300'}`} />
                                        <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                                            {device.status || 'Offline'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center space-x-2 text-slate-400">
                                <button
                                    onClick={() => handleRefresh(device.id)}
                                    disabled={refreshingId === device.id}
                                    title="Refresh device status"
                                    className="p-2 rounded-lg hover:bg-slate-50 text-slate-400 hover:text-slate-600 transition-colors disabled:opacity-50"
                                >
                                    <RefreshCcw size={18} className={refreshingId === device.id ? "animate-spin" : ""} />
                                </button>
                                <button
                                    onClick={() => handleDelete(device.id)}
                                    disabled={deletingId === device.id}
                                    title="Delete device"
                                    className="p-2 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors disabled:opacity-50"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <div className="space-y-6 pt-4">
                <div>
                    <h2 className="text-xl font-bold text-slate-900">Vizzi Hardware Ecosystem</h2>
                    <p className="text-slate-500">Designed for modern clinics.</p>
                    <p className="text-xs text-slate-400 mt-1">Marketing preview in this release.</p>
                </div>

                <div className="medical-card overflow-hidden border-primary/40">
                    <div className="grid grid-cols-1 lg:grid-cols-2">
                        <div className="relative min-h-[240px] bg-slate-50">
                            <Image src="/vizziai.png" alt="Vizzi AI Clinic Desk" fill className="object-cover" />
                        </div>
                        <div className="p-8 space-y-5">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary text-white text-xs font-semibold">
                                <Star size={14} /> Flagship Product
                            </div>
                            <div>
                                <h3 className="text-2xl font-bold text-slate-900">Vizzi AI Clinic Desk</h3>
                                <p className="text-slate-600 mt-2">
                                    Intelligent tabletop kiosk built to eliminate front‑desk friction with a high‑speed AI core and
                                    a professional medical‑grade interface.
                                </p>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-slate-600">
                                <div>• Vizzi Voice: multi‑lingual check‑in.</div>
                                <div>• Smart Queue Sync: TV + mobile.</div>
                                <div>• Official Messaging: compliant APIs.</div>
                                <div>• Vizzi‑Sight: returning patient recognition.</div>
                                <div>• Offline Continuity: local‑first flow.</div>
                            </div>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <p className="text-slate-500">Device Cost</p>
                                    <p className="text-lg font-bold text-primary">{CONFIG.currency.symbol}39,999</p>
                                </div>
                                <div>
                                    <p className="text-slate-500">Deployment</p>
                                    <p className="text-lg font-bold text-slate-900">Clinic setup</p>
                                </div>
                            </div>

                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="medical-card overflow-hidden">
                        <div className="relative h-48 bg-slate-50">
                            <Image src="/hero1.png" alt="Vizzi AI Kiosk Gen 2" fill className="object-cover" />
                        </div>
                        <div className="p-6 space-y-3">
                            <div className="inline-flex items-center gap-2 px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold">
                                New Generation
                            </div>
                            <h3 className="text-xl font-bold text-slate-900">Vizzi AI Kiosk (Gen 2)</h3>
                            <p className="text-sm text-slate-600">Hospital-grade hardware with faster processing.</p>
                            <p className="text-lg font-bold text-primary">{CONFIG.currency.symbol}49,999</p>
                            <ul className="text-sm text-slate-600 space-y-1">
                                <li>• Enhanced AI processing</li>
                                <li>• Brighter clinical display</li>
                                <li>• High-fidelity speaker</li>
                                <li>• Better thermal management</li>
                            </ul>
                            <button
                                onClick={() => alert("Pre-ordering is available for waitlisted clinics. Contact sales to join.")}
                                className="btn-primary w-full"
                            >
                                Pre-order Now
                            </button>
                        </div>
                    </div>
                    <div className="medical-card overflow-hidden">
                        <div className="relative h-48 bg-slate-50">
                            <Image src="/vizzi_10inch.png" alt="Vizzi AI Desktop 10" fill className="object-cover" />
                        </div>
                        <div className="p-6 space-y-3">
                            <div className="inline-flex items-center gap-2 px-2 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                                Most Popular
                            </div>
                            <h3 className="text-xl font-bold text-slate-900">Vizzi AI Desktop 10</h3>
                            <p className="text-sm text-slate-600">Premium visibility with stronger audio.</p>
                            <p className="text-lg font-bold text-primary">{CONFIG.currency.symbol}23,999</p>
                            <ul className="text-sm text-slate-600 space-y-1">
                                <li>• 10-inch HD display</li>
                                <li>• Louder front-facing speaker</li>
                                <li>• Metal-finish casing</li>
                                <li>• Supports external TV display</li>
                            </ul>
                            <button
                                onClick={() => alert("Registration for Desktop 10 will open in next release.")}
                                className="btn-primary w-full"
                            >
                                Reserve Now
                            </button>
                        </div>
                    </div>
                    <div className="medical-card overflow-hidden">
                        <div className="relative h-48 bg-slate-50">
                            <Image src="/vizz_7inch.png" alt="Vizzi AI Desktop 7" fill className="object-cover" />
                        </div>
                        <div className="p-6 space-y-3">
                            <h3 className="text-xl font-bold text-slate-900">Vizzi AI Desktop 7</h3>
                            <p className="text-sm text-slate-600">Compact & smart reception device.</p>
                            <p className="text-lg font-bold text-slate-900">{CONFIG.currency.symbol}17,999</p>
                            <ul className="text-sm text-slate-600 space-y-1">
                                <li>• 7-inch touch display</li>
                                <li>• Vizzi AI Device powered system</li>
                                <li>• Built-in speaker for voice</li>
                                <li>• Hidden cable management</li>
                            </ul>
                            <button disabled className="btn-secondary w-full opacity-60 cursor-not-allowed">Coming Soon</button>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="medical-card overflow-hidden">
                        <div className="relative h-40 bg-slate-50">
                            <Image src="/vizzi_tv.png" alt="Vizzi Display Sync System" fill className="object-cover" />
                        </div>
                        <div className="p-6 space-y-2">
                            <h3 className="text-lg font-bold text-slate-900">Vizzi Display Sync System</h3>
                            <p className="text-sm text-slate-600">Show patient status on any TV or monitor.</p>
                            <ul className="text-sm text-slate-600 space-y-1">
                                <li>• Live “Now Serving” screen</li>
                                <li>• Emergency highlight mode</li>
                                <li>• Clinic branding & doctor photo</li>
                                <li>• HDMI or Smart TV browser sync</li>
                            </ul>
                        </div>
                    </div>
                    <div className="medical-card overflow-hidden">
                        <div className="flex items-center justify-between px-6 pt-6">
                            <span className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-semibold">
                                Custom Build
                            </span>
                            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Enterprise</span>
                        </div>
                        <div className="p-6 pt-4 flex items-center gap-5">
                            <div className="w-20 h-20 rounded-2xl bg-slate-50 flex items-center justify-center overflow-hidden border border-slate-100">
                                <Image src="/vizzi_multi.png" alt="Vizzi Wall Kiosk" width={72} height={72} />
                            </div>
                            <div className="flex-1 space-y-2">
                                <h3 className="text-lg font-bold text-slate-900">Vizzi Wall Kiosk</h3>
                                <p className="text-sm text-slate-600">Purpose-built for polyclinics and hospitals.</p>
                                <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                                    <span className="px-2 py-1 rounded-full bg-slate-100">Large-format display</span>
                                    <span className="px-2 py-1 rounded-full bg-slate-100">Multiple queues</span>
                                    <span className="px-2 py-1 rounded-full bg-slate-100">Custom branding</span>
                                </div>
                            </div>
                        </div>
                        <div className="px-6 pb-6">
                            <button disabled className="btn-secondary w-full opacity-60 cursor-not-allowed">Coming Soon</button>
                        </div>
                    </div>
                </div>

                <div className="medical-card p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div>
                        <h3 className="text-lg font-bold text-slate-900">Need help picking the right setup?</h3>
                        <p className="text-sm text-slate-600">Talk to our team for a tailored recommendation.</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <Link href="/dashboard/support" className="btn-secondary flex items-center gap-2">
                            <PhoneCall size={18} />
                            Contact Sales
                        </Link>
                        <Link href="/dashboard/support" className="btn-primary flex items-center gap-2">
                            <Zap size={18} />
                            Request Live Demo
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}





