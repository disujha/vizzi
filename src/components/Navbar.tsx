"use client";

import Link from "next/link";
import Image from "next/image";
import { useAuth, signOut } from "@/context/AuthContext";
import { LogIn, User, LogOut } from "lucide-react";

export default function Navbar() {
    const { user } = useAuth();

    return (
        <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">
                    <div className="flex items-center">
                        <Link href="/" className="flex items-center group">
                            <div className="flex items-center space-x-3">
                                <div className="w-9 h-9 rounded-xl bg-white shadow-sm border border-slate-100 flex items-center justify-center overflow-hidden">
                                    <Image src="/logo.png" alt="Vizzi logo" width={28} height={28} />
                                </div>
                                <span className="text-2xl font-black tracking-tighter text-slate-900 group-hover:text-primary transition-colors">
                                    Vizzi<span className="text-primary italic">.</span>
                                </span>
                            </div>
                        </Link>
                    </div>
                    <div className="hidden md:flex items-center space-x-8 text-sm font-medium text-slate-600">
                        <Link href="/#how-it-works" className="hover:text-primary transition-colors">How it works</Link>
                        <Link href="/#benefits" className="hover:text-primary transition-colors">Benefits</Link>
                        <Link href="/#pricing" className="hover:text-primary transition-colors">Pricing</Link>
                        <Link href="/#order" className="hover:text-primary transition-colors">Order Device</Link>
                    </div>
                    <div className="flex items-center space-x-4">
                        {user ? (
                            <>
                                <Link href="/dashboard" className="btn-secondary flex items-center space-x-2 py-1.5 px-4 text-sm">
                                    <User size={16} />
                                    <span>Dashboard</span>
                                </Link>
                                <button onClick={() => signOut()} className="text-slate-500 hover:text-red-600 transition-colors">
                                    <LogOut size={18} />
                                </button>
                            </>
                        ) : (
                            <Link href="/login?mode=signup" className="btn-primary flex items-center space-x-2 py-1.5 px-4 text-sm">
                                <LogIn size={16} />
                                <span>Start Free Trial</span>
                            </Link>
                        )}
                    </div>
                </div>
            </div>
        </nav>
    );
}
