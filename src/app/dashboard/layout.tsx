"use client";

import { useState, useEffect } from "react";
import { useAuth, signOut } from "@/context/AuthContext";
import { useRouter, usePathname } from "next/navigation";
import { generateClient } from "aws-amplify/api";
import Link from "next/link";
import Image from "next/image";
import {
    LayoutDashboard, Settings, Users, Tablets, CreditCard,
    BarChart3, LineChart, LogOut, ChevronRight, User, LifeBuoy, Menu, X, MonitorUp, BookOpenCheck
} from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { configureAmplify } from "@/lib/amplify";

configureAmplify();
const client = generateClient();

const GET_CLINIC = /* GraphQL */ `
  query GetClinic($id: ID!) {
    getClinic(id: $id) {
      id
      name
      clinicName
      doctorName
      email
      clinicLogoUri
      doctorPhotoUri
    }
  }
`;

const CREATE_CLINIC_MUTATION = /* GraphQL */ `
  mutation CreateClinic($input: CreateClinicInput!) {
    createClinic(input: $input) {
      id name clinicName doctorName email clinicLogoUri doctorPhotoUri
    }
  }
`;

const LIST_CLINICS = /* GraphQL */ `
  query ListClinics($filter: ModelClinicFilterInput) {
    listClinics(filter: $filter) {
      items {
        id name clinicName doctorName email clinicLogoUri doctorPhotoUri
      }
    }
  }
`;

import { db, getDoc, onSnapshot, doc, collection, query, orderBy } from "@/lib/db";

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

const toTitleCase = (value: string) =>
    value.trim().toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const { user, loading } = useAuth();
    const [clinicData, setClinicData] = useState<any>(null);
    const [firstDoctorName, setFirstDoctorName] = useState("");
    const [mobileNavOpen, setMobileNavOpen] = useState(false);
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        if (!loading && !user) router.push("/login");
    }, [user, loading, router]);

    useEffect(() => {
        if (!pathname) return;
        const titleMap: Record<string, string> = {
            "/dashboard": "Overview",
            "/dashboard/patients": "Patients",
            "/dashboard/subscription": "Subscription",
            "/dashboard/reports": "Reports",
            "/dashboard/analytics": "Analytics",
            "/dashboard/settings": "Clinic Settings",
            "/dashboard/devices": "Vizzi Devices",
            "/dashboard/support": "Support",
        };
        document.title = `${titleMap[pathname] || "Dashboard"} | Vizzi AI Clinic Receptionist`;
    }, [pathname]);
    useEffect(() => {
        if (!user) return;
        const userId = user.userId;
        const email = user.email?.toLowerCase();

        const resolveClinic = async () => {
            // Strip clinic- prefix to get raw mobile number (AppSync records use mobile as ID)
            const mobileId = userId?.startsWith("clinic-") ? userId.replace(/^clinic-/, "") : null;

            const tryGet = async (id: string) => {
                try {
                    const r = await (client.graphql({ query: GET_CLINIC, variables: { id } }) as any);
                    return r?.data?.getClinic || null;
                } catch (err) {
                    console.error(`[Layout] tryGet error for ${id}:`, err);
                    return null;
                }
            };

            // 1. Try raw userId
            const c1 = await tryGet(userId);
            if (c1) return c1;

            // 2. Try mobile number (strip clinic- prefix)
            if (mobileId) {
                const c2 = await tryGet(mobileId);
                if (c2) return c2;
            }

            if (email) {
                // 3. Try email as ID
                const c3 = await tryGet(email);
                if (c3) return c3;

                // 4. List filter by email
                try {
                    const res4 = await (client.graphql({ query: LIST_CLINICS, variables: { filter: { email: { eq: email } } } }) as any);
                    const items = res4?.data?.listClinics?.items || [];
                    if (items.length > 0) return items[0];
                } catch { /* ignore */ }
            }

            // 5. List filter by mobile
            if (mobileId) {
                try {
                    const res5 = await (client.graphql({ query: LIST_CLINICS, variables: { filter: { phone: { eq: mobileId } } } }) as any);
                    const items = res5?.data?.listClinics?.items || [];
                    if (items.length > 0) return items[0];
                } catch { /* ignore */ }
            }

            // 6. Fallback DB wrapper fetch
            try {
                for (const tId of [mobileId, user.userId].filter(Boolean)) {
                    if (!tId) continue;
                    const dbSnap = await getDoc(doc(db, "clinics", tId));
                    if (dbSnap.exists()) {
                        console.log("[Layout] Overrode clinic with Db wrapper:", tId);
                        return { id: tId, ...dbSnap.data() };
                    }
                }
            } catch { /* ignore */ }

            return null;
        };


        resolveClinic().then((data) => {
            console.log("[Layout] resolveClinic finished. Data:", data);
            if (data) {
                setClinicData(data);
                // Listen for real-time updates on the found clinic ID
                const unsub = onSnapshot(doc(null, "clinics", data.id), (snap: any) => {
                    if (snap.exists()) setClinicData(snap.data());
                });
                return unsub;
            }
        });
    }, [user]);

    useEffect(() => {
        if (!user) return;
        const doctorsRef = collection(db, "clinics", user.userId, "doctors");
        const doctorsQ = query(doctorsRef, orderBy("name", "asc"));
        const unsub = onSnapshot(doctorsQ, (snapshot: any) => {
            const first = (snapshot.docs || []).map((d: any) => d?.data?.()?.name || "").find((n: string) => !!n);
            setFirstDoctorName(first || "");
        });
        return () => unsub();
    }, [user]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
            </div>
        );
    }

    if (!user) return null;

    const menuGroups = [
        {
            group: "Operations",
            items: [
                { icon: LayoutDashboard, label: "Overview", href: "/dashboard" },
                { icon: Users, label: "Patients", href: "/dashboard/patients" },
                { icon: BarChart3, label: "Reports", href: "/dashboard/reports" },
                { icon: LineChart, label: "Analytics", href: "/dashboard/analytics" },
            ]
        },
        {
            group: "Clinic Management",
            items: [
                { icon: Settings, label: "Clinic Settings", href: "/dashboard/settings" },
                { icon: Tablets, label: "Vizzi Devices", href: "/dashboard/devices" },
            ]
        },
        {
            group: "Account",
            items: [
                { icon: CreditCard, label: "Subscription", href: "/dashboard/subscription" },
                { icon: LifeBuoy, label: "Support", href: "/dashboard/support" },
                { icon: BookOpenCheck, label: "Guide", href: "/dashboard/guide" },
            ]
        }
    ];

    const clinicDisplayName = clinicData?.clinicName || clinicData?.name || user.email || user.username || "Clinic";
    const doctorDisplayName = firstDoctorName
        ? toTitleCase(firstDoctorName)
        : "Doctor not added yet";

    return (
        <div className="min-h-screen bg-[#F8FAFC] flex">
            <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200 px-4 py-3 flex items-center justify-between">
                <Link href="/" className="flex items-center gap-2">
                    <Image src="/android-chrome-192x192.png" alt="Vizzi logo" width={28} height={28} />
                    <span className="text-lg font-black tracking-tight text-slate-900">
                        Vizzi<span className="text-primary italic">.</span>
                    </span>
                </Link>
                <button
                    onClick={() => setMobileNavOpen((prev) => !prev)}
                    className="p-2 rounded-lg border border-slate-200 text-slate-600"
                    aria-label={mobileNavOpen ? "Close navigation" : "Open navigation"}
                >
                    {mobileNavOpen ? <X size={18} /> : <Menu size={18} />}
                </button>
            </div>

            <div
                className={cn(
                    "fixed inset-0 z-30 bg-slate-900/40 md:hidden transition-opacity",
                    mobileNavOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
                )}
                onClick={() => setMobileNavOpen(false)}
            />

            <aside className={cn(
                "w-64 bg-white border-r border-slate-200 flex flex-col fixed inset-y-0 z-40 transition-transform duration-300 ease-in-out",
                mobileNavOpen ? "translate-x-0" : "-translate-x-full",
                "md:translate-x-0"
            )}>
                <div className="p-6">
                    <Link href="/" className="flex items-center group">
                        <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center overflow-hidden">
                                <Image src="/android-chrome-192x192.png" alt="Vizzi logo" width={32} height={32} />
                            </div>
                            <span className="text-2xl font-black tracking-tighter text-slate-900">
                                Vizzi<span className="text-primary italic">.</span>
                            </span>
                        </div>
                    </Link>
                </div>

                <div className="px-4 mb-6">
                    <Link
                        href="/kiosk"
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => setMobileNavOpen(false)}
                        className="flex items-center justify-center space-x-2 px-3 py-2.5 rounded-xl text-sm font-black bg-indigo-50 text-indigo-600 border border-indigo-100 hover:bg-indigo-100 transition-colors w-full uppercase tracking-wider"
                    >
                        <MonitorUp size={16} />
                        <span>Launch Kiosk</span>
                    </Link>
                </div>

                <nav className="flex-1 px-4 space-y-6 overflow-y-auto pb-6 scrollbar-hide">
                    {menuGroups.map((group, idx) => (
                        <div key={idx}>
                            <h3 className="px-3 text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                                {group.group}
                            </h3>
                            <div className="space-y-1">
                                {group.items.map((item) => {
                                    const isActive = pathname === item.href;
                                    return (
                                        <Link
                                            key={item.href}
                                            href={item.href}
                                            onClick={() => setMobileNavOpen(false)}
                                            className={cn(
                                                "flex items-center space-x-3 px-3 py-2 rounded-xl text-sm font-semibold transition-all group",
                                                isActive ? "bg-primary/5 text-primary" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                                            )}
                                        >
                                            <item.icon size={18} className={cn("transition-colors", isActive ? "text-primary" : "text-slate-400 group-hover:text-slate-600")} />
                                            <span>{item.label}</span>
                                            {isActive && <ChevronRight size={14} className="ml-auto opacity-50" />}
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </nav>

                <div className="p-4 border-t border-slate-100 bg-slate-50/50">
                    <div className="flex items-center p-2 space-x-3 mb-4 rounded-xl border border-slate-100 bg-white shadow-sm">
                        <div className={cn("w-10 h-10 rounded-full flex items-center justify-center overflow-hidden border border-slate-200",
                            pathname === "/dashboard/settings" ? "bg-primary/10 text-primary border-primary/20" : "bg-slate-100 text-slate-500")}>
                            {(clinicData?.doctorPhotoUri && clinicData.doctorPhotoUri.trim() !== "") ? (
                                <Image src={clinicData.doctorPhotoUri} alt="Doctor photo" width={40} height={40} className="object-cover" />
                            ) : (
                                <User size={20} />
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-slate-900 truncate uppercase tracking-tight">{clinicDisplayName}</p>
                            <p className="text-xs text-slate-500 truncate">{doctorDisplayName}</p>
                        </div>
                    </div>
                    <button
                        onClick={() => { setMobileNavOpen(false); signOut(); }}
                        className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
                    >
                        <LogOut size={20} />
                        <span>Sign Out</span>
                    </button>
                </div>
            </aside>

            <main className="flex-1 md:ml-64 w-full">
                <div className="p-4 pt-20 md:p-8 min-h-screen">
                    <div className="max-w-5xl mx-auto">{children}</div>
                </div>
            </main>
        </div>
    );
}
