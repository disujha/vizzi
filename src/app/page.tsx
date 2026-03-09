"use client";

import Navbar from "@/components/Navbar";
import { motion } from "framer-motion";
import { MessageSquare, Zap, Clock, ShieldCheck, Users, Smartphone, Activity, Brain, Monitor, ArrowRight } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { CONFIG } from "@/lib/config";

export default function Home() {
  return (
    <main className="min-h-screen pt-16 relative overflow-hidden bg-[#F6F7FB]">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 right-[-12%] h-[520px] w-[520px] rounded-full bg-[radial-gradient(circle_at_center,rgba(20,184,166,0.18),transparent_65%)] blur-2xl" />
        <div className="absolute top-[20%] left-[-10%] h-[420px] w-[420px] rounded-full bg-[radial-gradient(circle_at_center,rgba(2,132,199,0.18),transparent_70%)] blur-2xl" />
        <div className="absolute inset-0 ai-grid opacity-60" />
      </div>
      <Navbar />

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-20 pb-16 lg:pt-32 lg:pb-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="pointer-events-none absolute inset-x-0 top-0 hidden lg:block h-full">
            <div className="absolute inset-0 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full">
              <div className="absolute inset-0">
                <Image src="/hero2.jpg" alt="Vizzi AI Clinic Desk" fill className="object-cover object-right" priority />
              </div>
              <div className="absolute inset-0 bg-gradient-to-r from-white via-white/60 to-transparent lg:from-white lg:via-white/50 lg:to-transparent" />
            </div>
          </div>
          <div className="lg:grid lg:grid-cols-12 lg:gap-8 items-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="sm:text-center md:max-w-2xl md:mx-auto lg:col-span-6 lg:text-left relative z-10 lg:bg-white/80 lg:backdrop-blur-lg lg:rounded-3xl lg:p-8 lg:shadow-[0_20px_60px_-40px_rgba(15,23,42,0.6)]"
            >
              <div className="inline-flex items-center space-x-2 bg-white/90 backdrop-blur px-3 py-1 rounded-full text-primary text-sm font-semibold mb-6 border border-white/70 shadow-sm">
                <div className="w-7 h-7 rounded-full bg-white border border-slate-100 flex items-center justify-center overflow-hidden">
                  <Image src="/logo.png" alt="Vizzi logo" width={18} height={18} />
                </div>
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                <span>Start Your 30‑Day Free Trial</span>
              </div>
              <h1 className="text-4xl tracking-tight font-extrabold text-slate-950 sm:text-5xl md:text-6xl leading-[1.05] font-display">
                AI-Driven Patient Check-Ins &amp; Smart Clinic Automation
              </h1>
              <p className="mt-6 text-xl text-slate-600 leading-relaxed">
                Let patients check in themselves, manage queues automatically, and keep your reception stress-free — with or without our smart kiosk.
              </p>
              <p className="mt-4 text-base text-slate-600">
                Works offline, multilingual voice callouts, instant appointment &amp; walk‑in management.
              </p>
              <div className="mt-6 space-y-2 text-sm text-slate-600">
                <div className="flex items-start gap-2">
                  <span className="text-primary">✔</span>
                  <span>Reduce waiting room confusion by up to 70%</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-primary">✔</span>
                  <span>Save 1–2 hours of reception time daily</span>
                </div>
              </div>
              <div className="mt-10 flex flex-col sm:flex-row sm:justify-center lg:justify-start gap-4">
                <Link href="/login" className="btn-primary text-center text-lg">
                  Start Free 30‑Day Trial
                </Link>
                <Link href="/contact" className="btn-secondary text-center text-lg">
                  See Live Demo
                </Link>
              </div>
              <p className="mt-4 text-sm font-medium text-slate-600 flex items-center gap-2 lg:justify-start sm:justify-center">
                <span className="text-primary">✦</span> Powered by AWS Bedrock, Amazon Polly, and serverless infrastructure.
              </p>
              <p className="mt-2 text-sm font-medium text-slate-600 flex items-center gap-2 lg:justify-start sm:justify-center">
                <span className="text-primary">✦</span> No credit card required. Get started in 2 minutes.
              </p>
              <p className="mt-2 text-xs font-medium text-slate-500 flex items-center gap-2 lg:justify-start sm:justify-center opacity-80">
                <span className="text-primary/60">★</span> Trusted by clinics improving patient flow across India
              </p>
              <p className="mt-4 text-xs text-slate-500 max-w-xl">
                Start free — see calmer queues in days. 30‑day trial applies to subscription only (not hardware) and includes SMS check‑in alerts.
              </p>
              <div className="mt-10 flex flex-wrap gap-3 text-xs uppercase tracking-[0.2em] text-slate-400">
                <span className="glass-panel px-3 py-2 rounded-full">Free Trial</span>
                <span className="glass-panel px-3 py-2 rounded-full">AI Queue</span>
                <span className="glass-panel px-3 py-2 rounded-full">Offline Ready</span>
              </div>
            </motion.div>

            <div className="mt-12 lg:mt-0 lg:col-span-6" />
          </div>
        </div>
      </section>

      {/* Results Strip */}
      <section className="py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.5 }}
              transition={{ duration: 0.4 }}
              className="medical-card p-6"
            >
              <div className="text-2xl font-bold text-primary">50%</div>
              <p className="text-sm text-slate-600 mt-2">Faster check-ins powered by AI.</p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.5 }}
              transition={{ duration: 0.4, delay: 0.05 }}
              className="medical-card p-6"
            >
              <div className="text-2xl font-bold text-primary">Up to 70%</div>
              <p className="text-sm text-slate-600 mt-2">Reduced waiting times for patients.</p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.5 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="medical-card p-6"
            >
              <div className="text-2xl font-bold text-primary">1–2 hrs</div>
              <p className="text-sm text-slate-600 mt-2">Staff time saved daily.</p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.5 }}
              transition={{ duration: 0.4, delay: 0.15 }}
              className="medical-card p-6"
            >
              <div className="text-2xl font-bold text-primary">Smart Auto‑Updates</div>
              <p className="text-sm text-slate-600 mt-2">Automated SMS & voice announcements.</p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Problem Section */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="medical-card p-10 md:p-12">
            <div className="lg:grid lg:grid-cols-12 lg:gap-10 items-center">
              <div className="lg:col-span-7">
                <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl font-display">
                  Does this feel familiar?
                </h2>
                <div className="mt-6 space-y-3 text-slate-700">
                  <div className="flex items-start gap-3">
                    <span className="text-primary">✔</span>
                    <span>Crowded reception area?</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-primary">✔</span>
                    <span>Long patient waiting lines?</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-primary">✔</span>
                    <span>Manual walk‑in tracking?</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-primary">✔</span>
                    <span>Missed appointments &amp; confusion?</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-primary">✔</span>
                    <span>Staff constantly repeating announcements?</span>
                  </div>
                </div>
              </div>
              <div className="mt-8 lg:mt-0 lg:col-span-5">
                <div className="rounded-2xl bg-primary/5 border border-primary/10 p-6 md:p-8">
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">The Solution</p>
                  <p className="mt-3 text-2xl font-bold text-slate-900">Vizzi fixes all of these.</p>
                  <p className="mt-3 text-sm text-slate-600 leading-relaxed">
                    Replace paper chaos with guided check‑ins, smart queues, and automated updates.
                  </p>
                  <Link href="/login" className="btn-primary inline-flex mt-6">
                    Start Free 30‑Day Trial
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section id="benefits" className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="lg:grid lg:grid-cols-2 lg:gap-16 items-center mb-24">
            <div>
              <h2 className="text-3xl font-bold text-slate-900 sm:text-4xl mb-6 font-display">
                Outcomes Doctors Care About
              </h2>
              <p className="text-lg text-slate-600 mb-8">
                Less Chaos. More Patients Served. Less Staff Stress. Vizzi turns reception work into patient flow you can trust.
              </p>
              <div className="mb-8 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-slate-600">
                <div className="flex items-start gap-2">
                  <span className="text-primary">✔</span>
                  <span>Fewer interruptions at the front desk</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-primary">✔</span>
                  <span>Shorter waits and calmer waiting rooms</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-primary">✔</span>
                  <span>Patients called clearly in their language</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-primary">✔</span>
                  <span>Always on — even with weak internet</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-primary">✔</span>
                  <span>Walk‑ins and appointments stay in sync</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-primary">✔</span>
                  <span>Staff focus shifts back to patient care</span>
                </div>
              </div>
              <div className="space-y-8">
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-teal-50 text-teal-600 rounded-xl flex items-center justify-center">
                    <Zap size={24} />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-slate-900">AI-Assisted Patient Intake</h4>
                    <p className="text-slate-600 mt-1">Patients are guided through a self-check-in process powered by intelligent workflows.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                    <Clock size={24} />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-slate-900">Predictive Wait Time Estimation</h4>
                    <p className="text-slate-600 mt-1">Machine learning models predict accurate wait times to keep patient expectations balanced.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center">
                    <MessageSquare size={24} />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-slate-900">Automated Announcements</h4>
                    <p className="text-slate-600 mt-1">AI-driven voice callouts and real-time SMS updates keep the waiting area calm.</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-12 lg:mt-0 medical-card p-2 aspect-[4/5] overflow-hidden">
              <div className="relative w-full h-full bg-slate-50 rounded-xl overflow-hidden">
                <Image src="/outcome-clinic.png" alt="Calm clinic reception" fill className="object-cover" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="medical-card p-8">
              <div className="w-12 h-12 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center mb-6">
                <Clock size={24} />
              </div>
              <h4 className="text-xl font-bold text-slate-900 mb-3">More Time for Patients</h4>
              <p className="text-slate-600">Routine check‑ins and queue updates run themselves, so your team spends time on care, not admin.</p>
            </div>
            <div className="medical-card p-8">
              <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center mb-6">
                <MessageSquare size={24} />
              </div>
              <h4 className="text-xl font-bold text-slate-900 mb-3">Calmer Waiting Rooms</h4>
              <p className="text-slate-600">Patients receive clear, automatic updates so fewer people crowd the desk asking for status.</p>
            </div>
            <div className="medical-card p-8">
              <div className="w-12 h-12 bg-teal-50 text-teal-600 rounded-xl flex items-center justify-center mb-6">
                <Users size={24} />
              </div>
              <h4 className="text-xl font-bold text-slate-900 mb-3">Fair, Organized Flow</h4>
              <p className="text-slate-600">Walk‑ins, appointments, and emergencies are balanced automatically for a predictable clinic day.</p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-24 bg-white/60 backdrop-blur overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-slate-900 sm:text-4xl font-display">How Results Happen</h2>
            <p className="mt-4 text-lg text-slate-600">A simple, 4‑step system that turns entry into an intelligent, autonomous flow.</p>
          </div>

          <div className="mt-24 relative">
            {/* Desktop Connectors */}
            <div className="hidden lg:block absolute top-[2.75rem] left-[10%] right-[10%] h-px bg-slate-200" />

            <div className="grid grid-cols-1 gap-12 lg:grid-cols-4 relative">
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
                className="text-center group"
              >
                <div className="relative z-10 flex items-center justify-center h-20 w-20 rounded-3xl bg-white border border-slate-100 text-primary mx-auto mb-8 shadow-xl group-hover:border-primary/30 transition-colors">
                  <Smartphone size={32} />
                  <div className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center border-4 border-white">
                    1
                  </div>
                </div>
                <h3 className="text-xl font-bold text-slate-900">Patient Check‑In</h3>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed px-2">
                  Self-service via kiosk or mobile link. Seamless entry with no queue.
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.15 }}
                className="text-center group"
              >
                <div className="relative z-10 flex items-center justify-center h-20 w-20 rounded-3xl bg-white border border-slate-100 text-secondary mx-auto mb-8 shadow-xl group-hover:border-secondary/30 transition-colors">
                  <Activity size={32} />
                  <div className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-secondary text-white text-xs font-bold flex items-center justify-center border-4 border-white">
                    2
                  </div>
                </div>
                <h3 className="text-xl font-bold text-slate-900">Smart Queue Engine</h3>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed px-2">
                  Automated token assignments, voice callouts, and real-time alerts.
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="text-center group"
              >
                <div className="relative z-10 flex items-center justify-center h-20 w-20 rounded-3xl bg-white border border-slate-100 text-slate-700 mx-auto mb-8 shadow-xl group-hover:border-slate-300 transition-colors">
                  <Zap size={32} />
                  <div className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-slate-700 text-white text-xs font-bold flex items-center justify-center border-4 border-white">
                    3
                  </div>
                </div>
                <h3 className="text-xl font-bold text-slate-900">Doctor Dashboard</h3>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed px-2">
                  One-tap flow management. Keep track of priorities automatically.
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.45 }}
                className="text-center group"
              >
                <div className="relative z-10 flex items-center justify-center h-20 w-20 rounded-3xl bg-white border border-slate-100 text-indigo-600 mx-auto mb-8 shadow-xl group-hover:border-indigo-300 transition-colors">
                  <Brain size={32} />
                  <div className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center border-4 border-white">
                    4
                  </div>
                </div>
                <h3 className="text-xl font-bold text-slate-900">AI Insights</h3>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed px-2">
                  Actionable operations data extracted from daily check-ins.
                </p>
              </motion.div>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.6 }}
              className="mt-16 text-center"
            >
              <Link href="/how-it-works" className="inline-flex items-center gap-2 px-8 py-4 bg-white border border-slate-200 rounded-2xl font-black text-xs uppercase tracking-[0.2em] text-slate-600 hover:text-primary hover:border-primary/30 hover:shadow-lg transition-all group">
                Know More About How Vizzi Works <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      {/* The Vizzi AI Clinic Engine */}
      <section className="py-24 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="lg:grid lg:grid-cols-2 lg:gap-16 items-center">
            <div className="order-2 lg:order-1 mt-12 lg:mt-0">
              <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden shadow-2xl bg-white border border-slate-100 p-8 flex flex-col justify-center">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/50 to-teal-50/50" />
                <div className="relative z-10 space-y-6">
                  <div className="flex items-center gap-4 p-4 bg-white rounded-xl shadow-sm border border-slate-100">
                    <div className="w-10 h-10 rounded-full bg-teal-100 text-teal-600 flex items-center justify-center"><Activity size={20} /></div>
                    <div>
                      <p className="font-bold text-slate-900 text-sm">Predictive Wait Times</p>
                      <p className="text-xs text-slate-500">Learning from historical check-in durations...</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 p-4 bg-white rounded-xl shadow-sm border border-slate-100 ml-8">
                    <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center"><Brain size={20} /></div>
                    <div>
                      <p className="font-bold text-slate-900 text-sm">Smart Queue Optimization</p>
                      <p className="text-xs text-slate-500">Balancing walk-ins vs. appointments dynamically.</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 p-4 bg-white rounded-xl shadow-sm border border-slate-100">
                    <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center"><Activity size={20} /></div>
                    <div>
                      <p className="font-bold text-slate-900 text-sm">Peak Hour Insights</p>
                      <p className="text-xs text-slate-500">Staffing recommendations based on patient volume.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="order-1 lg:order-2">
              <h2 className="text-3xl font-bold text-slate-900 sm:text-4xl mb-6 font-display">
                The Vizzi AI Clinic Engine
              </h2>
              <p className="text-lg text-slate-600 mb-8">
                Our platform does more than just issue tokens. It learns from your clinic's unique rhythm—analyzing check-in speeds, queue durations, and patient flow data to generate actionable operational insights.
              </p>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="mt-1 flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs ring-4 ring-primary/5">✓</div>
                  <p className="text-slate-700"><strong className="text-slate-900">Continuous Learning:</strong> Adapts to average consultation times per doctor.</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="mt-1 flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs ring-4 ring-primary/5">✓</div>
                  <p className="text-slate-700"><strong className="text-slate-900">Predictive Load Balancing:</strong> Recommends optimal resource allocation during peak hours.</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="mt-1 flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs ring-4 ring-primary/5">✓</div>
                  <p className="text-slate-700"><strong className="text-slate-900">Automated Reporting:</strong> Generates end-of-day insights without manual data entry.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Before vs After */}
      <section className="py-24 bg-white/60 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold text-slate-900 sm:text-4xl font-display">From Chaos to Clarity</h2>
            <p className="mt-4 text-lg text-slate-600">What your reception looks like before and after Vizzi.</p>
          </div>
          <div className="mt-14 grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="medical-card p-6 border-2 border-rose-200 bg-rose-50/60 shadow-lg relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-rose-100/30 rounded-full -mr-16 -mt-16 blur-3xl pointer-events-none" />
              <div className="relative w-full aspect-[16/10] rounded-2xl overflow-hidden bg-slate-200 border border-rose-100">
                <Image src="/before-chaos.png" alt="Crowded clinic reception" fill className="object-cover grayscale-[0.3] brightness-90" />
                <div className="absolute top-4 left-4 text-[10px] font-bold uppercase tracking-[0.2em] bg-rose-600 text-white px-3 py-1.5 rounded-full shadow-lg">
                  The Chaos (Before)
                </div>
              </div>
              <div className="mt-8 space-y-4">
                <div className="flex items-start gap-3 group">
                  <div className="mt-1 flex-shrink-0 w-5 h-5 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center font-bold text-xs ring-4 ring-rose-50">✕</div>
                  <div>
                    <p className="text-sm font-bold text-slate-900 leading-tight">Patients asking repeatedly</p>
                    <p className="text-[11px] text-slate-600 mt-0.5">Constant desk interruptions & status checks.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="mt-1 flex-shrink-0 w-5 h-5 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center font-bold text-xs ring-4 ring-rose-50">✕</div>
                  <div>
                    <p className="text-sm font-bold text-slate-900 leading-tight">Staff shouting names</p>
                    <p className="text-[11px] text-slate-600 mt-0.5">Loud announcements causing noise fatigue.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="mt-1 flex-shrink-0 w-5 h-5 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center font-bold text-xs ring-4 ring-rose-50">✕</div>
                  <div>
                    <p className="text-sm font-bold text-slate-900 leading-tight">Missed queue order</p>
                    <p className="text-[11px] text-slate-600 mt-0.5">Manual paper logs leading to patient frustration.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="medical-card p-6 border-2 border-emerald-200 bg-emerald-50/60 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-100/30 rounded-full -mr-16 -mt-16 blur-3xl pointer-events-none" />
              <div className="relative w-full aspect-[16/10] rounded-2xl overflow-hidden bg-white border border-emerald-100">
                <Image src="/after-calm.png" alt="Organized clinic reception" fill className="object-cover" />
                <div className="absolute top-4 left-4 text-[10px] font-bold uppercase tracking-[0.2em] bg-emerald-600 text-white px-3 py-1.5 rounded-full shadow-lg">
                  The Clarity (After)
                </div>
              </div>
              <div className="mt-8 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="mt-1 flex-shrink-0 w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-[10px] ring-4 ring-emerald-50 italic">✓</div>
                  <div>
                    <p className="text-sm font-bold text-slate-900 leading-tight">Automated Voice & SMS Alerts</p>
                    <p className="text-[11px] text-slate-600 mt-0.5">Patients stay informed without asking.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="mt-1 flex-shrink-0 w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-[10px] ring-4 ring-emerald-50 italic">✓</div>
                  <div>
                    <p className="text-sm font-bold text-slate-900 leading-tight">Multilingual Callouts</p>
                    <p className="text-[11px] text-slate-600 mt-0.5">Loud, clear calls in their own language.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="mt-1 flex-shrink-0 w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-[10px] ring-4 ring-emerald-50 italic">✓</div>
                  <div>
                    <p className="text-sm font-bold text-slate-900 leading-tight">Perfect Queue Sync</p>
                    <p className="text-[11px] text-slate-600 mt-0.5">Fair order for appointments & walk‑ins.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Doctor Testimonials */}
      <section className="py-24 bg-white/60 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold text-slate-900 sm:text-4xl font-display">Doctor Testimonials</h2>
            <p className="mt-4 text-lg text-slate-600">Doctors choose Vizzi for calmer clinics and clearer queues.</p>
          </div>
          <div className="mt-14 grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="medical-card p-8 flex flex-col justify-between">
              <div>
                <p className="text-slate-700 text-lg leading-relaxed italic">
                  “Using Vizzi cut our check‑in time by half. The kiosk handles the intake flow, so my front desk stays focused and calm.”
                </p>
              </div>
              <div className="mt-8 flex items-center gap-4 border-t border-slate-50 pt-6">
                <div className="w-12 h-12 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center font-bold text-lg shadow-sm">
                  AM
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900 leading-tight">Dr. Arjun Mehta</p>
                  <p className="text-[11px] font-semibold text-primary uppercase tracking-wider mt-0.5">Internal Medicine</p>
                  <p className="text-xs text-slate-500 mt-1">Mehta Health Clinic · Mumbai</p>
                </div>
              </div>
            </div>

            <div className="medical-card p-8 flex flex-col justify-between">
              <div>
                <p className="text-slate-700 text-lg leading-relaxed italic">
                  “We used to call names three times. Now patients follow the queue display and voice prompts, and the waiting room stays orderly.”
                </p>
              </div>
              <div className="mt-8 flex items-center gap-4 border-t border-slate-50 pt-6">
                <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-lg shadow-sm">
                  KS
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900 leading-tight">Dr. Kavita Sharma</p>
                  <p className="text-[11px] font-semibold text-primary uppercase tracking-wider mt-0.5">Family Practice</p>
                  <p className="text-xs text-slate-500 mt-1">Sharma Diagnostics · Bangalore</p>
                </div>
              </div>
            </div>

            <div className="medical-card p-8 flex flex-col justify-between">
              <div>
                <p className="text-slate-700 text-lg leading-relaxed italic">
                  “The SMS updates reduced walk‑ups to the desk. That alone made our afternoons smoother and less stressful for staff.”
                </p>
              </div>
              <div className="mt-8 flex items-center gap-4 border-t border-slate-50 pt-6">
                <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-lg shadow-sm">
                  SR
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900 leading-tight">Dr. Suresh Rao</p>
                  <p className="text-[11px] font-semibold text-primary uppercase tracking-wider mt-0.5">Pediatrics</p>
                  <p className="text-xs text-slate-500 mt-1">Rao Pediatric Center · Hyderabad</p>
                </div>
              </div>
            </div>

            <div className="medical-card p-8 flex flex-col justify-between">
              <div>
                <p className="text-slate-700 text-lg leading-relaxed italic">
                  “Appointments and walk‑ins finally feel balanced. Vizzi keeps priorities clear while we maintain a fair flow.”
                </p>
              </div>
              <div className="mt-8 flex items-center gap-4 border-t border-slate-50 pt-6">
                <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center font-bold text-lg shadow-sm">
                  AI
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900 leading-tight">Dr. Anjali Iyer</p>
                  <p className="text-[11px] font-semibold text-primary uppercase tracking-wider mt-0.5">Orthopedics</p>
                  <p className="text-xs text-slate-500 mt-1">Iyer Bone &amp; Joint Center · Chennai</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Voice Experience */}
      <section className="py-24 bg-white/60 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="lg:grid lg:grid-cols-2 lg:gap-16 items-center">
            <div>
              <h2 className="text-3xl font-bold text-slate-900 sm:text-4xl mb-6 font-display">
                Clear Voice Announcements in Multiple Indian Languages
              </h2>
              <p className="text-lg text-slate-600">
                Clear, multilingual announcements keep patients moving without repeated desk calls.
                Supports Hindi, English, Marathi, and Bengali out of the box.
              </p>
              <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-slate-600">
                <div className="medical-card p-4">
                  <p className="font-semibold text-slate-900">Clear Patient Flow</p>
                  <p className="text-xs text-slate-500 mt-1">No missed calls or repeated announcements.</p>
                </div>
                <div className="medical-card p-4">
                  <p className="font-semibold text-slate-900">Multi‑Lingual</p>
                  <p className="text-xs text-slate-500 mt-1">Hindi · English · Marathi · Bengali</p>
                </div>
                <div className="medical-card p-4">
                  <p className="font-semibold text-slate-900">Less Desk Load</p>
                  <p className="text-xs text-slate-500 mt-1">Fewer walk‑ups asking for updates.</p>
                </div>
                <div className="medical-card p-4">
                  <p className="font-semibold text-slate-900">Consistent & Clear</p>
                  <p className="text-xs text-slate-500 mt-1">Professional voice at clinic volume.</p>
                </div>
              </div>
            </div>
            <div className="mt-10 lg:mt-0">
              <div className="medical-card p-6">
                <div className="text-xs uppercase tracking-wider text-slate-400 mb-2">Live Example</div>
                <div className="rounded-2xl bg-slate-900 text-white p-6 space-y-3">
                  <p className="text-lg font-semibold">Now Serving</p>
                  <p className="text-3xl font-bold text-primary">A‑12</p>
                  <p className="text-base">Priya Sharma, please proceed to the doctor.</p>
                  <div className="text-xs text-slate-400">Voice languages: Hindi · English · Marathi · Bengali</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Kiosk & Display Value */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="lg:grid lg:grid-cols-12 lg:gap-12 items-center">
            <div className="lg:col-span-6">
              <h2 className="text-3xl font-bold text-slate-900 sm:text-4xl font-display">
                Why Our Smart Kiosk &amp; Display Matters
              </h2>
              <p className="mt-4 text-lg text-slate-900 font-semibold italic">
                “Not just software — a complete clinic reception upgrade.”
              </p>
              <p className="mt-2 text-base text-slate-600">
                Hardware that makes your reception feel modern, professional, and easy to navigate.
              </p>
              <div className="mt-6 space-y-3 text-slate-700">
                <div className="flex items-start gap-3">
                  <span className="text-primary">✔</span>
                  <span>Patients can self‑check‑in — no staff required</span>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-primary">✔</span>
                  <span>Digital queue on screen — reduces crowding</span>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-primary">✔</span>
                  <span>Voice callouts — no manual announcements</span>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-primary">✔</span>
                  <span>Professional look increases clinic credibility</span>
                </div>
              </div>
            </div>
            <div className="mt-10 lg:mt-0 lg:col-span-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="medical-card p-4">
                  <div className="relative w-full aspect-[4/3] rounded-xl overflow-hidden">
                    <Image src="/vizziai.png" alt="Vizzi smart kiosk" fill className="object-cover" />
                  </div>
                  <p className="mt-4 text-sm font-semibold text-slate-900">Smart Kiosk Check‑In</p>
                  <p className="text-xs text-slate-500">Patients register themselves in seconds.</p>
                </div>
                <div className="medical-card p-4">
                  <div className="relative w-full aspect-[4/3] rounded-xl overflow-hidden">
                    <Image src="/vizzi_tv.png" alt="Queue display screen" fill className="object-cover" />
                  </div>
                  <p className="mt-4 text-sm font-semibold text-slate-900">Live Queue Display</p>
                  <p className="text-xs text-slate-500">Clear “Now Serving” reduces crowding.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Hardware Ecosystem */}
      <section id="order" className="py-24 bg-white/70 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-3xl font-bold text-slate-900 sm:text-4xl font-display">Vizzi Hardware Ecosystem</h2>
              <p className="mt-3 text-lg text-slate-600">Clear separation of hardware and subscription. Pick the right Vizzi AI Device for your clinic.</p>
            </div>
            <Link href="/dashboard/devices" className="btn-secondary text-sm">
              View All Devices
            </Link>
          </div>

          <div className="mt-12 grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="medical-card overflow-hidden border-primary/30">
              <div className="relative h-64 bg-slate-50">
                <Image src="/vizziai.png" alt="Vizzi AI Clinic Desk" fill className="object-cover" />
              </div>
              <div className="p-8 space-y-4">
                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary text-white text-xs font-semibold">Flagship</span>
                <h3 className="text-2xl font-bold text-slate-900">Vizzi AI Clinic Desk</h3>
                <p className="text-slate-600">Premium tabletop kiosk built for high‑volume clinics with intelligent check‑in and queue automation.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-slate-600">
                  <div>• Multi‑lingual voice check‑in</div>
                  <div>• Smart queue sync + TV display</div>
                  <div>• Official messaging APIs</div>
                  <div>• Offline continuity</div>
                </div>
                <Link href="/dashboard/devices" className="btn-primary w-full text-center">Explore Hardware</Link>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="medical-card overflow-hidden">
                <div className="relative h-40 bg-slate-50">
                  <Image src="/vizzi_10inch.png" alt="Vizzi AI Desktop 10" fill className="object-cover" />
                </div>
                <div className="p-6 space-y-2">
                  <h4 className="text-lg font-bold text-slate-900">Vizzi AI Desktop 10</h4>
                  <p className="text-sm text-slate-600">Premium visibility with strong audio.</p>
                  <ul className="text-sm text-slate-600 space-y-1">
                    <li>• 10‑inch HD display</li>
                    <li>• Front‑facing speaker</li>
                    <li>• External TV sync</li>
                  </ul>
                </div>
              </div>
              <div className="medical-card overflow-hidden">
                <div className="relative h-40 bg-slate-50">
                  <Image src="/vizz_7inch.png" alt="Vizzi AI Desktop 7" fill className="object-cover" />
                </div>
                <div className="p-6 space-y-2">
                  <h4 className="text-lg font-bold text-slate-900">Vizzi AI Desktop 7</h4>
                  <p className="text-sm text-slate-600">Compact and smart reception device.</p>
                  <ul className="text-sm text-slate-600 space-y-1">
                    <li>• 7‑inch touch display</li>
                    <li>• Built‑in speaker</li>
                    <li>• Clean cable routing</li>
                  </ul>
                </div>
              </div>
              <div className="medical-card overflow-hidden sm:col-span-2">
                <div className="relative h-36 bg-slate-50">
                  <Image src="/vizzi_tv.png" alt="Vizzi Display Sync System" fill className="object-cover" />
                </div>
                <div className="p-6 space-y-2">
                  <h4 className="text-lg font-bold text-slate-900">Vizzi Display Sync System</h4>
                  <p className="text-sm text-slate-600">Show queues and “Now Serving” on any TV or monitor.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Demo Section */}
      <section id="demo" className="py-24 bg-slate-900 text-white relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-[-20%] left-[-10%] h-[500px] w-[500px] rounded-full bg-[radial-gradient(circle_at_center,rgba(20,184,166,0.15),transparent_65%)] blur-2xl pointer-events-none" />
          <div className="absolute bottom-[-20%] right-[-10%] h-[500px] w-[500px] rounded-full bg-[radial-gradient(circle_at_center,rgba(2,132,199,0.15),transparent_65%)] blur-2xl pointer-events-none" />
          <div className="absolute inset-0 ai-grid opacity-30 pointer-events-none" />
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <h2 className="text-3xl font-bold sm:text-4xl font-display">
            Experience the AI Clinic Flow
          </h2>
          <p className="mt-4 text-lg text-slate-300 max-w-2xl mx-auto">
            Try the interactive demonstration to see how our smart kiosk handles patient check-ins and how the doctor dashboard provides real-time queue intelligence.
          </p>
          <div className="mt-12 flex flex-col sm:flex-row sm:justify-center gap-6">
            <Link href="/kiosk" className="group relative inline-flex items-center justify-center gap-3 bg-white text-slate-900 px-8 py-4 rounded-2xl text-lg font-bold hover:bg-slate-50 transition-colors shadow-xl">
              <Smartphone className="text-primary group-hover:scale-110 transition-transform" />
              Launch Patient Kiosk Demo
            </Link>
            <Link href="/dashboard" className="group relative inline-flex items-center justify-center gap-3 bg-slate-800 text-white border border-slate-700 px-8 py-4 rounded-2xl text-lg font-bold hover:bg-slate-700 transition-colors shadow-xl">
              <Monitor className="text-secondary group-hover:scale-110 transition-transform" />
              View Doctor Dashboard
            </Link>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-slate-900 sm:text-4xl font-display">Pricing Built for Clinics</h2>
            <p className="mt-4 text-lg text-slate-600">Pick a plan based on outcomes — less desk load, faster check‑ins, calmer waiting rooms.</p>
          </div>
          <div className="mt-12 grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="medical-card p-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-900">Subscription Plans</h3>
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Monthly</span>
              </div>
              <p className="text-sm text-slate-600 mt-2">Best value for most clinics: Growth.</p>
              <div className="mt-6 grid grid-cols-2 gap-4">
                {[
                  { name: "Starter", price: "₹999" },
                  { name: "Growth", price: "₹1499" },
                  { name: "Pro", price: "₹1999" },
                  { name: "Elite", price: "₹2499" },
                ].map((plan) => (
                  <div
                    key={plan.name}
                    className={`rounded-2xl border p-4 text-center ${plan.name === "Growth" ? "border-primary/50 bg-primary/5" : "border-slate-100"
                      }`}
                  >
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{plan.name}</p>
                    <p className="text-2xl font-bold text-slate-900 mt-2">{plan.price}</p>
                    <p className="text-xs text-slate-500">per month</p>
                  </div>
                ))}
              </div>
              <div className="mt-6">
                <Link href="/dashboard/subscription" className="btn-primary w-full text-center">
                  Start Free 30‑Day Trial
                </Link>
                <p className="mt-3 text-xs text-slate-500 text-center">
                  Best for results: Growth — reduce desk load and keep patients informed automatically.
                </p>
              </div>
            </div>
            <div className="medical-card p-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-900">Hardware Devices</h3>
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">One-time</span>
              </div>
              <p className="text-sm text-slate-600 mt-2">Choose the right Vizzi AI Device for your clinic.</p>
              <div className="mt-6 grid grid-cols-2 gap-4">
                {[
                  { name: "Vizzi AI Clinic Desk", price: "₹39,999", monthly: "₹3,999" },
                  { name: "Vizzi Desktop 10", price: "₹23,999", monthly: "₹2,399" },
                  { name: "Vizzi Desktop 7", price: "₹17,999", monthly: "₹1,799" },
                  { name: "Vizzi Wall Kiosk", price: "Custom" },
                ].map((item) => (
                  <div key={item.name} className="rounded-2xl border border-slate-100 p-4">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{item.name}</p>
                    <div className="mt-2">
                      <p className="text-xl font-bold text-slate-900">{item.price}</p>
                      {item.monthly && (
                        <div className="mt-1">
                          <p className="text-[10px] text-slate-400 font-medium uppercase">OR</p>
                          <p className="text-sm font-semibold text-primary">{item.monthly}<span className="text-[10px] text-slate-500 font-normal">/month</span></p>
                          <p className="text-[9px] text-slate-400">(12 months EMI)</p>
                        </div>
                      )}
                    </div>
                    {!item.monthly && <p className="text-xs text-slate-500 mt-1">device price</p>}
                  </div>
                ))}
              </div>
              <div className="mt-6">
                <Link href="/dashboard/devices" className="btn-secondary w-full text-center">
                  Shop Hardware
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-950 text-white py-16 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center mb-6 md:mb-0">
              <span className="text-2xl font-black tracking-tighter text-white">
                Vizzi<span className="text-primary italic">.</span>
              </span>
            </div>
            <div className="flex flex-wrap justify-center gap-6 text-sm text-slate-500">
              <Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
              <Link href="/terms" className="hover:text-white transition-colors">Terms and Conditions</Link>
              <Link href="/refund" className="hover:text-white transition-colors">Return/Refund Policy</Link>
              <Link href="/shipping" className="hover:text-white transition-colors">Shipping/Delivery Policy</Link>
              <Link href="/contact" className="hover:text-white transition-colors">Contact Us</Link>
              <Link href="/about" className="hover:text-white transition-colors">About Us</Link>
              <a
                href="https://play.google.com/store/apps/details?id=com.vizzi.rethela"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 hover:text-white transition-colors"
              >
                <Smartphone size={14} />
                Vizzi AI App
              </a>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t border-white/5 text-center text-sm text-slate-600">
            &copy; 2026 Vizzi AI Receptionist. Built for clinics at vizzi.rethela.com
          </div>
        </div>
      </footer>

      {/* Floating WhatsApp Button */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        className="fixed bottom-6 right-6 z-50 group"
      >
        <div className="absolute -inset-2 bg-emerald-500/20 rounded-full blur-xl group-hover:bg-emerald-500/30 transition-all animate-pulse" />
        <a
          href={CONFIG.support.whatsapp}
          target="_blank"
          rel="noreferrer"
          className="relative flex items-center justify-center w-14 h-14 bg-emerald-500 text-white rounded-full shadow-[0_12px_40px_-12px_rgba(16,185,129,0.5)] border-2 border-white/20 transition-all overflow-hidden"
        >
          <svg
            viewBox="0 0 24 24"
            className="w-7 h-7 fill-current"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.767 5.767 0 1.267.405 2.436 1.096 3.389l-1.144 4.17 4.292-1.122A5.713 5.713 0 0012.031 19c3.181 0 5.767-2.586 5.767-5.767 0-3.181-2.586-5.767-5.767-5.767zm3.344 8.205c-.131.368-.766.702-1.054.743-.27.039-.623.012-1.008-.112-.244-.08-.558-.2-.942-.366-1.637-.706-2.731-2.37-2.813-2.478-.082-.108-.669-.89-.669-1.699 0-.808.423-1.206.574-1.371.151-.165.331-.206.441-.206.11 0 .221.001.317.005.101.004.237-.039.37.28.133.321.458 1.114.498 1.196.041.082.068.178.014.288-.055.11-.124.18-.219.297-.101.124-.203.203-.294.31-.091.107-.184.22-.073.414.111.192.493.814 1.06 1.317.73.648 1.334.849 1.542.946.208.097.33.082.454-.055.124-.137.53-.617.671-.828.141-.212.281-.178.473-.11.192.068 1.218.575 1.428.685.21.11.35.165.402.253.052.088.052.51-.079.878z" />
          </svg>
        </a>
        <div className="absolute right-full mr-4 top-1/2 -translate-y-1/2 bg-slate-900 text-white text-[10px] font-bold uppercase tracking-[0.2em] px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0 pointer-events-none whitespace-nowrap shadow-xl">
          Chat with us
        </div>
      </motion.div>
    </main>
  );
}
