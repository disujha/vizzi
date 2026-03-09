"use client";

import Navbar from "@/components/Navbar";
import { Monitor, Smartphone, Cpu, Sparkles, CheckCircle2, ShieldCheck, BarChart3, Zap, Mic } from "lucide-react";
import { motion } from "framer-motion";

export default function HowItWorksPage() {
    return (
        <main className="min-h-screen pt-20 bg-[#F6F7FB]">
            <Navbar />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-20">
                {/* Hero Section */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="relative overflow-hidden rounded-3xl bg-slate-900 px-8 py-20 text-center shadow-2xl"
                >
                    <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-indigo-500/20 via-transparent to-transparent pointer-events-none" />
                    <div className="relative z-10 max-w-3xl mx-auto">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary-light text-xs font-bold uppercase tracking-widest mb-6">
                            <Sparkles size={14} />
                            Product Education
                        </div>
                        <h1 className="text-4xl md:text-6xl font-black text-white leading-tight">
                            How <span className="text-primary-light">Vizzi</span> Automates Your Clinic
                        </h1>
                        <p className="mt-8 text-xl text-slate-300 leading-relaxed font-medium">
                            From the moment a patient walks in to the final consultation, Vizzi handles the flow using AI,
                            multilingual voice announcements, and smart queue management.
                        </p>
                    </div>
                </motion.div>

                {/* Deployment Modes */}
                <div className="space-y-10">
                    <div className="text-center max-w-2xl mx-auto">
                        <h2 className="text-3xl font-bold text-slate-900">Flexible Deployment Options</h2>
                        <p className="text-slate-600 mt-4 text-lg">Vizzi adapts to your clinic's existing infrastructure or provides dedicated hardware for ultimate performance.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {/* Browser Mode */}
                        <div className="medical-card p-8 border-t-4 border-t-slate-400 flex flex-col items-center text-center group hover:shadow-xl transition-all duration-300">
                            <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-600 mb-6 group-hover:bg-slate-900 group-hover:text-white transition-colors shadow-sm">
                                <Monitor size={32} />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900">Browser / Tablet Mode</h3>
                            <p className="mt-3 text-sm text-slate-500 leading-relaxed">
                                Use any modern browser on your existing tablets or laptops. A cost-effective way to get started immediately.
                            </p>
                            <div className="mt-6 w-full pt-6 border-t border-slate-100 space-y-3 text-left">
                                <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                                    <CheckCircle2 size={14} className="text-emerald-500" /> Instant Setup
                                </div>
                                <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                                    <CheckCircle2 size={14} className="text-emerald-500" /> Bring Your Own Device
                                </div>
                            </div>
                        </div>

                        {/* Mobile App Mode */}
                        <div className="medical-card p-8 border-t-4 border-t-primary flex flex-col items-center text-center group hover:shadow-xl transition-all duration-300 relative overflow-hidden">
                            <div className="absolute top-4 right-4 bg-primary/10 text-primary text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">Most Flexible</div>
                            <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center text-primary mb-6 group-hover:bg-primary group-hover:text-white transition-colors shadow-sm">
                                <Smartphone size={32} />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900">Vizzi AI Mobile App</h3>
                            <p className="mt-3 text-sm text-slate-500 leading-relaxed">
                                Run your entire clinic from your pocket. Manage queues and trigger announcements directly from our Android app.
                            </p>
                            <div className="mt-6 w-full pt-6 border-t border-slate-100 space-y-3 text-left">
                                <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                                    <CheckCircle2 size={14} className="text-emerald-500" /> Full Queue Control
                                </div>
                                <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                                    <CheckCircle2 size={14} className="text-emerald-500" /> Offline Resilience
                                </div>
                            </div>
                        </div>

                        {/* Hardware Mode */}
                        <div className="medical-card p-8 border-t-4 border-t-slate-900 flex flex-col items-center text-center group hover:shadow-xl transition-all duration-300">
                            <div className="w-16 h-16 rounded-2xl bg-slate-900 flex items-center justify-center text-white mb-6 shadow-lg group-hover:scale-110 transition-transform">
                                <Cpu size={32} />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900">Vizzi AI Desk Hardware</h3>
                            <p className="mt-3 text-sm text-slate-500 leading-relaxed">
                                Dedicated premium hardware with integrated printing and high-fidelity audio for a professional clinic experience.
                            </p>
                            <div className="mt-6 w-full pt-6 border-t border-slate-100 space-y-3 text-left">
                                <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                                    <CheckCircle2 size={14} className="text-emerald-500" /> Built-in Token Printer
                                </div>
                                <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                                    <CheckCircle2 size={14} className="text-emerald-500" /> Professional AI Voice
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Feature Comparison Table */}
                <div className="medical-card overflow-hidden shadow-lg border-none bg-white">
                    <div className="bg-slate-50 p-8 border-b border-slate-100">
                        <h2 className="text-2xl font-bold text-slate-900">Detailed Feature Comparison</h2>
                        <p className="text-slate-500 mt-2">Compare the capabilities of each Vizzi deployment mode.</p>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-slate-100 bg-slate-50/50">
                                    <th className="px-8 py-5 text-xs font-black uppercase tracking-widest text-slate-400">Capability</th>
                                    <th className="px-8 py-5 text-xs font-black uppercase tracking-widest text-slate-400 text-center">Browser</th>
                                    <th className="px-8 py-5 text-xs font-black uppercase tracking-widest text-slate-400 text-center">Mobile App</th>
                                    <th className="px-8 py-5 text-xs font-black uppercase tracking-widest text-slate-400 text-center">AI Desk</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {[
                                    { name: "Patient Self Check-in", b: true, m: true, h: true },
                                    { name: "Live Queue Dashboard", b: true, m: true, h: true },
                                    { name: "Voice Announcements", b: "Basic", m: true, h: "Premium" },
                                    { name: "Queue Management", b: true, m: true, h: true },
                                    { name: "Automated Token Printing", b: false, m: false, h: true },
                                    { name: "AI Predictive Analytics", b: true, m: true, h: true },
                                    { name: "Offline Mode Support", b: false, m: true, h: true },
                                ].map((row, idx) => (
                                    <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-8 py-5 text-sm font-bold text-slate-700">{row.name}</td>
                                        <td className="px-8 py-5 text-center">
                                            {typeof row.b === 'string' ? <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-slate-100 text-slate-600 uppercase tracking-wider">{row.b}</span> : row.b ? <CheckCircle2 size={20} className="text-emerald-500 mx-auto" /> : <div className="h-0.5 w-4 bg-slate-200 mx-auto rounded-full" />}
                                        </td>
                                        <td className="px-8 py-5 text-center">
                                            {typeof row.m === 'string' ? <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-primary/10 text-primary uppercase tracking-wider">{row.m}</span> : row.m ? <CheckCircle2 size={20} className="text-primary mx-auto" /> : <div className="h-0.5 w-4 bg-slate-200 mx-auto rounded-full" />}
                                        </td>
                                        <td className="px-8 py-5 text-center text-sm font-bold">
                                            {typeof row.h === 'string' ? <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-slate-900 text-white uppercase tracking-wider">{row.h}</span> : row.h ? <CheckCircle2 size={20} className="text-slate-900 mx-auto" /> : <div className="h-0.5 w-4 bg-slate-200 mx-auto rounded-full" />}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* AI Capabilities Section */}
                <div className="medical-card bg-slate-900 p-10 md:p-16 relative overflow-hidden group border-none shadow-2xl">
                    <div className="absolute right-0 bottom-0 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] pointer-events-none group-hover:bg-primary/20 transition-colors" />
                    <div className="relative z-10">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                            <div className="space-y-8">
                                <div className="flex items-center gap-2 text-primary-light text-xs font-black uppercase tracking-[0.3em] mb-4">
                                    <ShieldCheck size={20} />
                                    Vizzi Core Intelligence
                                </div>
                                <h2 className="text-4xl md:text-5xl font-black text-white leading-tight">
                                    Smarter Clinics with <span className="text-primary-light">Predictive AI</span>
                                </h2>
                                <p className="text-xl text-slate-400 leading-relaxed font-medium">
                                    Vizzi analyzes check-in patterns to forecast peak surges, optimize scheduling,
                                    and reduce patient wait times by mapping bottlenecks in real-time.
                                </p>
                                <div className="grid grid-cols-2 gap-6 pt-4">
                                    <div className="flex items-center gap-3 text-slate-300">
                                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary-light"><BarChart3 size={20} /></div>
                                        <span className="font-bold">Peak Detection</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-slate-300">
                                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary-light"><Zap size={20} /></div>
                                        <span className="font-bold">Queue Forecasting</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-slate-300">
                                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary-light"><Mic size={20} /></div>
                                        <span className="font-bold">Smart Alerts</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-slate-300">
                                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary-light"><ShieldCheck size={20} /></div>
                                        <span className="font-bold">Flow Optimization</span>
                                    </div>
                                </div>
                            </div>
                            <div className="p-10 rounded-[2.5rem] bg-slate-800/50 border border-slate-700/50 backdrop-blur-2xl flex flex-col items-center text-center shadow-inner">
                                <div className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center text-primary-light mb-8 shadow-xl">
                                    <Sparkles size={48} />
                                </div>
                                <p className="text-sm font-black uppercase tracking-[0.3em] text-slate-400 mb-3">Powered By</p>
                                <p className="text-4xl font-black text-white tracking-widest">AWS <span className="text-primary-light">BEDROCK</span></p>
                                <p className="mt-6 text-sm text-slate-500 uppercase tracking-widest leading-relaxed max-w-xs">Enterprise-grade LLM vectors securing clinic data integrity.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer space */}
            <div className="py-20 text-center">
                <h3 className="text-2xl font-bold text-slate-900 mb-6 font-display">Ready to modernize your clinic?</h3>
                <div className="flex justify-center gap-4">
                    <a href="/login" className="btn-primary px-10 py-4 text-lg">Start Free Trial</a>
                    <a href="/contact" className="btn-secondary px-10 py-4 text-lg">Contact Sales</a>
                </div>
            </div>
        </main>
    );
}
