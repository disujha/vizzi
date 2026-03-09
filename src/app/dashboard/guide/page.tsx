"use client";

import { CheckCircle2, Users, Building2, Layout, Volume2, ArrowRight, ExternalLink, Sparkles } from "lucide-react";
import Link from "next/link";

export default function QuickSetupGuide() {
    return (
        <div className="max-w-4xl mx-auto space-y-10 pb-20">
            {/* Header */}
            <div className="space-y-2">
                <h1 className="text-3xl font-black text-slate-900">Quick Setup Guide</h1>
                <p className="text-slate-500 text-lg font-medium">Get your clinic AI-ready in minutes by following these 4 essential steps.</p>
            </div>

            {/* Quick Stats / Status Banner */}
            <div className="bg-primary/5 border border-primary/10 rounded-2xl p-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                        <Sparkles size={24} />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-slate-900">Initial Setup Progress</p>
                        <p className="text-xs text-slate-500">Configure your core settings to unlock AI capabilities.</p>
                    </div>
                </div>
                <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-white rounded-xl shadow-sm border border-slate-100 font-bold text-xs text-primary uppercase tracking-widest">
                    Operational Ready
                </div>
            </div>

            {/* Setup Steps */}
            <div className="grid grid-cols-1 gap-6">
                {/* Step 1: Clinic Profile */}
                <div className="medical-card p-6 flex flex-col md:flex-row gap-6 hover:shadow-lg transition-all border-l-4 border-l-slate-200 group">
                    <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 font-black text-xl group-hover:bg-primary group-hover:text-white transition-colors">01</div>
                    <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2 text-slate-900 font-bold text-lg">
                            <Building2 size={20} className="text-slate-400" />
                            Complete Clinic Profile
                        </div>
                        <p className="text-sm text-slate-500 leading-relaxed">
                            Set your clinic name, address, and operating hours. This information is displayed on patient tokens and the kiosk.
                        </p>
                        <Link href="/dashboard/settings?tab=clinic" className="inline-flex items-center gap-2 text-xs font-bold text-primary uppercase tracking-widest pt-2 hover:gap-3 transition-all">
                            Configure Profile <ArrowRight size={14} />
                        </Link>
                    </div>
                    <div className="hidden lg:block w-32 h-32 bg-slate-50 rounded-2xl border border-slate-100 opacity-50 overflow-hidden relative">
                        <div className="absolute inset-0 flex items-center justify-center"><Building2 size={40} className="text-slate-200" /></div>
                    </div>
                </div>

                {/* Step 2: Add Doctors */}
                <div className="medical-card p-6 flex flex-col md:flex-row gap-6 hover:shadow-lg transition-all border-l-4 border-l-slate-200 group">
                    <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 font-black text-xl group-hover:bg-primary group-hover:text-white transition-colors">02</div>
                    <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2 text-slate-900 font-bold text-lg">
                            <Users size={20} className="text-slate-400" />
                            Add Your Doctors
                        </div>
                        <p className="text-sm text-slate-500 leading-relaxed">
                            Create profiles for each doctor. Each doctor gets their own unique queue prefix (e.g., A, B, C) for organized patient tracking.
                        </p>
                        <Link href="/dashboard/settings?tab=doctors" className="inline-flex items-center gap-2 text-xs font-bold text-primary uppercase tracking-widest pt-2 hover:gap-3 transition-all">
                            Manage Doctors <ArrowRight size={14} />
                        </Link>
                    </div>
                    <div className="hidden lg:block w-32 h-32 bg-slate-50 rounded-2xl border border-slate-100 opacity-50 overflow-hidden relative">
                        <div className="absolute inset-0 flex items-center justify-center"><Users size={40} className="text-slate-200" /></div>
                    </div>
                </div>

                {/* Step 3: Connect Display & Kiosk */}
                <div className="medical-card p-6 flex flex-col md:flex-row gap-6 hover:shadow-lg transition-all border-l-4 border-l-slate-200 group">
                    <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 font-black text-xl group-hover:bg-primary group-hover:text-white transition-colors">03</div>
                    <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2 text-slate-900 font-bold text-lg">
                            <Layout size={20} className="text-slate-400" />
                            Launch the Patient Kiosk
                        </div>
                        <p className="text-sm text-slate-500 leading-relaxed">
                            Open the Kiosk URL on your tablet or dedicated device at the reception. This allows patients to self-check-in.
                        </p>
                        <div className="flex items-center gap-4 pt-2">
                            <Link href="/kiosk" target="_blank" className="inline-flex items-center gap-2 text-xs font-bold text-primary uppercase tracking-widest hover:gap-3 transition-all">
                                Open Kiosk <ExternalLink size={14} />
                            </Link>
                            <span className="h-4 w-px bg-slate-200" />
                            <Link href="/dashboard/devices" className="text-xs font-bold text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-colors">
                                View Display Screens
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Step 4: Enable Voice Announcements */}
                <div className="medical-card p-6 flex flex-col md:flex-row gap-6 hover:shadow-lg transition-all border-l-4 border-l-slate-200 group">
                    <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 font-black text-xl group-hover:bg-primary group-hover:text-white transition-colors">04</div>
                    <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2 text-slate-900 font-bold text-lg">
                            <Volume2 size={20} className="text-slate-400" />
                            Enable Audio Alerts
                        </div>
                        <p className="text-sm text-slate-500 leading-relaxed">
                            Connect your reception speakers to the device running the kiosk. Patients will be called automatically in multiple languages.
                        </p>
                        <Link href="/dashboard/settings?tab=voice" className="inline-flex items-center gap-2 text-xs font-bold text-primary uppercase tracking-widest pt-2 hover:gap-3 transition-all">
                            Test Voice Engine <ArrowRight size={14} />
                        </Link>
                    </div>
                </div>
            </div>

            {/* Need More Help? */}
            <div className="p-8 rounded-[2rem] bg-slate-900 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-[80px]" />
                <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div>
                        <h3 className="text-xl font-bold">Confused about deployment?</h3>
                        <p className="text-slate-400 text-sm mt-1 font-medium">Read our detailed product guide to learn about Hardware vs Mobile modes.</p>
                    </div>
                    <Link href="/how-it-works" className="px-6 py-3 bg-white text-slate-900 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-slate-100 transition-colors whitespace-nowrap">
                        View Full Guide
                    </Link>
                </div>
            </div>

            <div className="flex items-center justify-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-widest pb-10">
                <CheckCircle2 size={14} className="text-emerald-500" />
                Vizzi AI Operational Status: Ready
            </div>
        </div>
    );
}
