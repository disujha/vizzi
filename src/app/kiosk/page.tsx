"use client";

import { db, collection, doc, getDoc, getDocs, setDoc, updateDoc, addDoc, deleteDoc, onSnapshot, query, where, orderBy, limit, writeBatch, uploadToStorage } from "@/lib/db";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { ArrowRight, Maximize2, Minimize2 } from "lucide-react";
import Image from "next/image";
import {
    getDefaultCallNextTemplateForLang,
    getDefaultCheckInTemplateForLang,
    normalizeVoiceTemplates,
    buildVoiceAnnouncement,
} from "@/lib/voiceTemplates";
import { submitAiCheckIn } from "@/lib/aws_api";
import { sendTokenSms, sendCallSms } from "@/lib/sms";
import { Camera, CameraOff, Mic, Volume2, VolumeX, Search, Brain, Zap, UserCheck, Shield, Sparkles, LayoutDashboard, CheckCircle2, Play, AlertTriangle, Users, X, RefreshCcw } from "lucide-react";
import { getClinicStatusOverride, getDoctorStatusOverride, normalizeClinicStatus, normalizeDoctorStatus, pickRoundRobinDoctor, setRoundRobinPointer } from "@/lib/clinicQueue";

const DEFAULT_SETTINGS = {
    clinicName: "",
    name: "",
    doctorName: "",
    clinicLogoUri: "",
    welcomeText: "Welcome",
    clinicStatus: "OPEN",
    checkInEnabled: true,
    tokenPrefix: "A",
    tokenDigits: 2,
    voiceEnabled: true,
    voiceVolume: 100,
    voiceLanguage: "en-IN",
    voiceRate: 0.8,
    voicePitch: 1,
    voiceGender: "female",
    voiceName: "",
    voiceEngine: "browser", // "browser" or "polly"
    announcementTemplate: getDefaultCallNextTemplateForLang("en-IN"),
    checkInAnnouncementTemplate: getDefaultCheckInTemplateForLang("en-IN"),
    smsEnabled: false,
    smsClinicName: "",
    tokenResetTime: "Daily", // Default to Daily
};

type Patient = {
    id: string;
    name: string;
    tokenNumber: string;
    mobileNumber: string;
    status: string;
    timestamp: number;
    isAppointment: boolean;
    isEmergency: boolean;
    appointmentDate: string;
    appointmentTime: string;
    lastCalledAt: number;
    doctorId?: string;
    doctorName?: string;
    doctorPrefix?: string;
    symptoms?: string;
};

import { twMerge } from "tailwind-merge";
import { clsx, type ClassValue } from "clsx";

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

type Doctor = {
    id: string;
    name: string;
    prefix: string;
    active: boolean;
    status?: string;
    photoUrl?: string;
};

const DOCTOR_STATUS_META: Record<string, { label: string; className: string }> = {
    AVAILABLE: { label: "Available", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    BUSY: { label: "Busy", className: "bg-blue-50 text-blue-700 border-blue-200" },
    ON_BREAK: { label: "On Break", className: "bg-amber-50 text-amber-700 border-amber-200" },
    OFFLINE: { label: "Offline", className: "bg-slate-100 text-slate-600 border-slate-200" },
};

const getDoctorUnavailableMessage = (status: string, lang: "en" | "hi") => {
    if (lang === "hi") {
        if (status === "ON_BREAK") return "चुना गया डॉक्टर अभी ब्रेक पर है। कृपया दूसरा डॉक्टर चुनें।";
        if (status === "BUSY") return "चुना गया डॉक्टर अभी व्यस्त है। कृपया दूसरा डॉक्टर चुनें।";
        return "चुना गया डॉक्टर अभी ऑफलाइन है। कृपया दूसरा डॉक्टर चुनें।";
    }
    if (status === "ON_BREAK") return "Selected doctor is on break. Please choose another doctor.";
    if (status === "BUSY") return "Selected doctor is currently busy. Please choose another doctor.";
    return "Selected doctor is offline right now. Please choose another doctor.";
};

const DEFAULT_PATIENT: Patient = {
    id: "",
    name: "",
    tokenNumber: "",
    mobileNumber: "",
    status: "waiting",
    timestamp: 0,
    isAppointment: false,
    isEmergency: false,
    appointmentDate: "",
    appointmentTime: "",
    lastCalledAt: 0,
    doctorId: "",
    doctorName: "",
    doctorPrefix: "",
    symptoms: "",
};

const toMillis = (value: any) => {
    if (typeof value === "number") return value;
    if (value && typeof value.toMillis === "function") return value.toMillis();
    return 0;
};

const toTitleCase = (value: string) =>
    value
        .trim()
        .toLowerCase()
        .replace(/\b\w/g, (char) => char.toUpperCase());

const cleanName = (text: string): string => {
    let name = text.trim();

    // English cleaning
    const enPrefixes = [/my name is\s+/i, /i am\s+/i, /this is\s+/i, /i'm\s+/i];
    enPrefixes.forEach(re => { name = name.replace(re, ""); });

    // Hindi cleaning
    const hiPrefixes = [
        /(नमस्ते\s+)?मेरा\s+नाम\s+/u,
        /मेरा\s+नाम\s+है\s+/u,
        /मैं\s+हूँ\s+/u,
        /मैं\s+/u
    ];
    hiPrefixes.forEach(re => { name = name.replace(re, ""); });

    // Hindi suffixes
    const hiSuffixes = [/\s+हूँ$/u, /\s+है$/u];
    hiSuffixes.forEach(re => { name = name.replace(re, ""); });

    // Final trim and capitalization for English names
    name = name.trim();
    if (/^[a-zA-Z\s]+$/.test(name)) {
        name = name.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
    }

    return name || text;
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

const resolveBranding = (data: Record<string, any>) => {
    const branding = (data?.branding || {}) as Record<string, any>;
    const clinicLogoUri =
        data?.clinicLogoUri ||
        data?.clinicLogoUrl ||
        data?.clinicLogo ||
        data?.logoUrl ||
        data?.logo ||
        branding.logoUrl ||
        branding.clinicLogoUrl ||
        branding.clinicLogo ||
        "";
    return { clinicLogoUri };
};

// Local buildAnnouncement removed in favor of buildVoiceAnnouncement from lib

const expandToken = (token: string) => token.split("").join(" ");

const normalizeLang = (value: string) => (value || "en-IN").replace("_", "-");

const pickVoice = (preferredLang: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return null;
    const voices = window.speechSynthesis.getVoices();
    if (!voices.length) return null;
    const [langInput, genderInput] = preferredLang.split("|");
    const preferredGender = (genderInput || "female").toLowerCase();
    const normalizedLang = normalizeLang(langInput);
    const matchKey = normalizedLang.toLowerCase().replace(/[-_]/g, "");
    const matching = voices.filter((voice) =>
        voice.lang?.toLowerCase().replace(/[-_]/g, "").startsWith(matchKey)
    );
    const candidates = matching.length ? matching : voices.filter((voice) => voice.lang?.toLowerCase().startsWith("en"));
    if (!candidates.length) return voices[0] ?? null;
    const indianPreferred = candidates.find((voice) =>
        /india|indian|kajal|aditi|raveena|prabhat|heera|kavya/i.test(voice.name) ||
        /en[-_]?in/i.test(voice.lang || "")
    );
    if (indianPreferred) return indianPreferred;
    const genderMatch = preferredGender === "male"
        ? candidates.find((voice) => /male|man|david|mark|rahul|ravi/i.test(voice.name))
        : candidates.find((voice) => /female|woman|zira|susan|samantha|zoe|hindi|india|neerja|heera|kavya/i.test(voice.name));
    return genderMatch || candidates[0];
};

const sortQueue = (patients: Patient[]) => {
    const statusRank = (status: string) => {
        if (status === "in_progress") return 0;
        if (status === "waiting") return 1;
        if (status === "not_responding") return 2;
        return 3;
    };

    return [...patients].sort((a, b) => {
        const statusDiff = statusRank(a.status) - statusRank(b.status);
        if (statusDiff !== 0) return statusDiff;
        if (a.isEmergency !== b.isEmergency) return a.isEmergency ? -1 : 1;
        if (a.isAppointment !== b.isAppointment) return a.isAppointment ? -1 : 1;
        return a.timestamp - b.timestamp;
    });
};

const getVisitType = (patient: Patient) => {
    const anyPatient = patient as any;
    const isEmergency = patient.isEmergency || Boolean(anyPatient.emergency);
    const isAppointment = patient.isAppointment || Boolean(anyPatient.appointment) || Boolean(patient.appointmentDate);
    if (isEmergency) return "E";
    if (isAppointment) return "A";
    return "W";
};
export default function KioskPage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const [settings, setSettings] = useState(DEFAULT_SETTINGS);
    const [patients, setPatients] = useState<Patient[]>([]);
    const [cachedPatients, setCachedPatients] = useState<Patient[]>([]);
    const [doctors, setDoctors] = useState<Doctor[]>([]);
    const [selectedDoctorId, setSelectedDoctorId] = useState<string>("");
    const [kioskBoundDoctorId, setKioskBoundDoctorId] = useState<string | null>(null);
    const [queueDoctorId, setQueueDoctorId] = useState<string>("all");
    const [kioskMode, setKioskMode] = useState(false);
    const [form, setForm] = useState({ name: "", mobile: "", symptoms: "" });
    const [submitting, setSubmitting] = useState(false);
    const [smsStatus, setSmsStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
    const [smsRetryCount, setSmsRetryCount] = useState(0);
    const [lastSmsMobile, setLastSmsMobile] = useState("");
    const containerRef = useRef<HTMLDivElement | null>(null);
    const voicesReadyRef = useRef(false);
    const [doctorsLoaded, setDoctorsLoaded] = useState(false);
    const [clinicDocIds, setClinicDocIds] = useState<string[]>([]);
    const [clinicStatusOverride, setClinicStatusOverrideState] = useState<string | null>(null);
    const announcedRef = useRef<Set<string>>(new Set());
    const [audioBlocked, setAudioBlocked] = useState(false);
    const [isOnline, setIsOnline] = useState(true);

    useEffect(() => {
        console.log(`[Kiosk] State Change: doctorsLoaded=${doctorsLoaded}, doctors=${doctors.length}, bound=${kioskBoundDoctorId}`);
    }, [doctorsLoaded, doctors.length, kioskBoundDoctorId]);

    // AI Kiosk Mode States
    const [interactionMode, setInteractionMode] = useState<"standard" | "ai">("ai");
    const [isCameraEnabled, setIsCameraEnabled] = useState(false);
    const [cameraPermissionBlocked, setCameraPermissionBlocked] = useState(false);
    const [presenceDetected, setPresenceDetected] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [speechResult, setSpeechResult] = useState("");
    const [interimSpeech, setInterimSpeech] = useState("");
    const [aiStep, setAiStep] = useState<"idle" | "greeting" | "name" | "mobile" | "data_confirm" | "complaint" | "confirm" | "sms_verify" | "sms_retry_mobile" | "success">("idle");
    const [messages, setMessages] = useState<{ role: 'ai' | 'user', content: string }[]>([]);
    const [inputMode, setInputMode] = useState<"voice" | "text">("voice");
    const [language, setLanguage] = useState<"en" | "hi">("en");
    const [aiStatus, setAiStatus] = useState<"idle" | "arming" | "listening" | "processing" | "responding">("idle");
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const recognitionRef = useRef<any>(null);
    const motionDetectedRef = useRef(false);
    const facePresentRef = useRef(false);
    const faceLastSeenAtRef = useRef(0);
    const faceDetectionBusyRef = useRef(false);
    const presenceScoreRef = useRef(0);
    const lastAutoTriggerAtRef = useRef(0);
    const scrollRef = useRef<HTMLDivElement>(null);
    const bottomAnchorRef = useRef<HTMLDivElement>(null);
    const listenTimerRef = useRef<number | null>(null);

    useEffect(() => {
        bottomAnchorRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }, [messages, aiStatus]);

    const clinicName = settings.clinicName || settings.name || user?.username || "Clinic";
    const dictionary = {
        en: {
            welcome: `Welcome to ${clinicName}! How can I help you today?`,
            askName: "Could I have your name, please?",
            askMobile: "Great! And what is your 10-digit mobile number?",
            invalidMobile: "That doesn't look like a 10-digit number. Could you please say it again?",
            confirmData: "Please confirm: Name: {name}, Mobile: {mobile}. Is this correct?",
            retryData: "No problem! Let's try again. What is your name?",
            askComplaint: "Understood. What brings you to the clinic today?",
            processing: "Thank you. I'm checking you in now...",
            success: "You're all set! Your token is ",
            wait: "Please take a seat. Estimated wait is ",
            smsSent: "Token SMS sent. Did you receive it?",
            smsNotReceived: "No problem! Is this your correct mobile number?",
            smsRetryLimit: "Sorry! Please approach the reception for assistance.",
            smsConfirmed: "Thank you! We are resending the SMS.",
            speak: "Speak",
            type: "Type Instead",
            listening: "Listening...",
            startingMic: "Starting microphone...",
            responding: "Responding...",
            voiceActive: "AI Voice Active",
            visionActive: "AI Vision Active",
            step: "Step",
            of: "of"
        },
        hi: {
            welcome: `नमस्ते! ${clinicName} में आपका स्वागत है। मैं आपकी क्या मदद कर सकती हूँ?`,
            askName: "क्या मैं आपका नाम जान सकती हूँ?",
            askMobile: "धन्यवाद! कृपया अपना 10-अंकों का मोबाइल नंबर बताएं।",
            invalidMobile: "यह 10-अंकों का नंबर नहीं लग रहा है। कृपया इसे फिर से बताएं।",
            confirmData: "कृपया पुष्टि करें: नाम: {name}, मोबाइल: {mobile}। क्या यह सही है?",
            retryData: "कोई बात नहीं! चलिए फिर से कोशिश करते हैं। आपका नाम क्या है?",
            askComplaint: "कृपया बताएं कि आपको क्या समस्या है?",
            processing: "धन्यवाद। आपकी जानकारी दर्ज की जा रही है...",
            success: "आपका चेक-इन सफल रहा! आपका टोकन नंबर है ",
            wait: "कृपया प्रतीक्षा करें। अनुमानित समय है ",
            smsSent: "टोकन मैसेज भेज दिया गया है। क्या आपको मैसेज मिला?",
            smsNotReceived: "कोई बात नहीं! क्या आपका मोबाइल नंबर यही है?",
            smsRetryLimit: "क्षमा करें, कृपया रिसेप्शन पर संपर्क करें।",
            smsConfirmed: "धन्यवाद! हम फिर से कोशिश कर रहे हैं।",
            speak: "बोलें",
            type: "टाइप करें",
            listening: "सुन रहा हूँ...",
            startingMic: "माइक्रोफोन चालू हो रहा है...",
            responding: "जवाब दे रहा हूँ...",
            voiceActive: "एआई आवाज़ सक्रिय",
            visionActive: "एआई विजन सक्रिय",
            step: "कदम",
            of: "का"
        }
    };

    const clinicOperationalStatus = normalizeClinicStatus(clinicStatusOverride || settings.clinicStatus || (settings as any).status);
    const isClinicClosed = clinicOperationalStatus === "CLOSED";
    const isEmergencyOnly = clinicOperationalStatus === "EMERGENCY_ONLY";
    const doctorForUi =
        (kioskBoundDoctorId ? doctors.find((d) => d.id === kioskBoundDoctorId) : doctors.find((d) => d.id === selectedDoctorId))
        || null;
    const doctorUiStatus = doctorForUi ? normalizeDoctorStatus(doctorForUi) : null;
    const isBoundDoctorUnavailable = Boolean(kioskBoundDoctorId && doctorUiStatus && doctorUiStatus !== "AVAILABLE");
    const isCheckInDisabled = settings.checkInEnabled === false || String(settings.checkInEnabled) === "false";
    const isOverlayActive = isClinicClosed || isCheckInDisabled || isEmergencyOnly || isBoundDoctorUnavailable;

    useEffect(() => {
        if (!loading && !user) {
            router.push("/login");
        }
    }, [user, loading, router]);

    useEffect(() => {
        if (!user) return;
        const email = (user.email || (user.username?.includes("@") ? user.username : "") || "").toLowerCase();
        const localOverride =
            getClinicStatusOverride(user.userId) ||
            (email ? getClinicStatusOverride(email) : null) ||
            null;
        setClinicStatusOverrideState(localOverride);
    }, [user]);

    useEffect(() => {
        if (!user || typeof window === "undefined") return;
        const email = (user.email || (user.username?.includes("@") ? user.username : "") || "").toLowerCase();
        const syncOverride = () => {
            const localOverride =
                getClinicStatusOverride(user.userId) ||
                (email ? getClinicStatusOverride(email) : null) ||
                null;
            setClinicStatusOverrideState(localOverride);
        };
        const onStorage = (event: StorageEvent) => {
            if (!event.key || !event.key.startsWith("vizzi_clinic_status_")) return;
            syncOverride();
        };
        window.addEventListener("storage", onStorage);
        return () => window.removeEventListener("storage", onStorage);
    }, [user]);

    useEffect(() => {
        if (!user) return;
        const email = (user.email || (user.username?.includes("@") ? user.username : "") || "").toLowerCase();
        const ids = Array.from(new Set([user.userId, email].filter(Boolean))) as string[];
        setClinicDocIds(ids);
        console.log("[Kiosk] Clinic doc IDs for live status:", ids);
    }, [user]);

    useEffect(() => {
        if (!user || !clinicDocIds.length) return;
        const unsubscribers = clinicDocIds.map((id) => {
            const clinicRef = doc(db, "clinics", id);
            return onSnapshot(clinicRef, (snapshot) => {
                const data = snapshot.data() as any;
                if (!data) return;
                setSettings((prev) => {
                    const nextAnnouncement = data.announcementTemplate || prev.announcementTemplate;
                    const nextCheckIn = data.checkInAnnouncementTemplate || prev.checkInAnnouncementTemplate;
                    const normalizedTemplates = normalizeVoiceTemplates(
                        data.voiceLanguage || prev.voiceLanguage,
                        nextAnnouncement,
                        nextCheckIn
                    );
                    const resolvedName = data.clinicName || data.name || prev.clinicName || prev.name || "";
                    const resolvedLogo = data.clinicLogoUri || data.clinicLogoUrl || data.logoUrl || data.logoUri || data.branding?.clinicLogoUrl || prev.clinicLogoUri || "";
                    const normalizedStatus = (data.clinicStatus || data.status || prev.clinicStatus || "OPEN").toUpperCase();

                    return {
                        ...prev,
                        ...data,
                        clinicName: resolvedName,
                        name: resolvedName,
                        clinicLogoUri: resolvedLogo,
                        welcomeText: data.welcomeText || data.greeting || prev.welcomeText,
                        clinicStatus: normalizedStatus,
                        status: normalizedStatus,
                        checkInEnabled: data.checkInEnabled ?? prev.checkInEnabled,
                        tokenPrefix: data.tokenPrefix || prev.tokenPrefix,
                        tokenDigits: Number(data.tokenDigits ?? prev.tokenDigits),
                        voiceEnabled: data.voiceEnabled ?? prev.voiceEnabled,
                        voiceVolume: Number(data.voiceVolume ?? prev.voiceVolume),
                        voiceLanguage: (data.voiceLanguage || prev.voiceLanguage || "en-IN").replace("_", "-"),
                        voiceRate: Number(data.voiceRate ?? prev.voiceRate),
                        voicePitch: Number(data.voicePitch ?? prev.voicePitch),
                        voiceGender: data.voiceGender || prev.voiceGender,
                        voiceName: data.voiceName || prev.voiceName,
                        announcementTemplate: normalizedTemplates.announcementTemplate,
                        checkInAnnouncementTemplate: normalizedTemplates.checkInAnnouncementTemplate,
                        smsEnabled: Boolean(data.smsEnabled ?? prev.smsEnabled),
                        smsClinicName: data.smsClinicName || "",
                        tokenResetTime: data.tokenResetTime || "Daily",
                    };
                });
            });
        });
        return () => unsubscribers.forEach((unsub) => unsub && unsub());
    }, [user, clinicDocIds]);

    // Restore/Auto-bind Doctor Choice
    useEffect(() => {
        if (!doctorsLoaded) return;

        try {
            const saved = sessionStorage.getItem("vizzi_kiosk_doctor_id");
            if (saved && doctors.some(d => d.id === saved)) {
                console.log(`[Kiosk] Restoring valid bound doctor: ${saved}`);
                setKioskBoundDoctorId(saved);
            } else if (saved) {
                console.warn("[Kiosk] Saved doctor ID is stale, clearing.");
                sessionStorage.removeItem("vizzi_kiosk_doctor_id");
            } else if (doctors.length === 1) {
                // AUTO-BIND for single doctor clinics
                console.log(`[Kiosk] Single doctor clinic detected. Auto-binding to: ${doctors[0].id}`);
                setKioskBoundDoctorId(doctors[0].id);
            }
        } catch (e) { console.error("Session storage access failed:", e); };
    }, [doctorsLoaded, doctors]);

    // Persist Bound Doctor Choice
    useEffect(() => {
        if (typeof window !== "undefined") {
            try {
                if (kioskBoundDoctorId) {
                    sessionStorage.setItem("vizzi_kiosk_doctor_id", kioskBoundDoctorId);
                } else {
                    sessionStorage.removeItem("vizzi_kiosk_doctor_id");
                }
            } catch (e) { console.error("Session storage write failed:", e); }
        }
    }, [kioskBoundDoctorId]);

    // Add global function to clear doctor binding
    if (typeof window !== "undefined") {
        (window as any).clearKioskDoctor = () => {
            sessionStorage.removeItem("vizzi_kiosk_doctor_id");
            setKioskBoundDoctorId(null);
            console.log("[Kiosk] Doctor binding cleared!");
        };
    }
    useEffect(() => {
        const lang = (settings.voiceLanguage || "en-IN").toLowerCase();
        setLanguage(lang.startsWith("hi") ? "hi" : "en");
    }, [settings.voiceLanguage]);

    // Doctors Sync
    useEffect(() => {
        if (!user) return;
        const doctorsRef = collection(db, "clinics", user.userId, "doctors");
        const q = query(doctorsRef, orderBy("name", "asc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const items = (snapshot?.docs || []).map((docSnap: any) => {
                const data = docSnap.data() as any;
                const override = getDoctorStatusOverride(user.userId, docSnap.id);
                return {
                    ...data,
                    id: docSnap.id,
                    status: override || data.status || ((data.active ?? true) ? "AVAILABLE" : "OFFLINE"),
                    active: data.active ?? true,
                    prefix: (data.prefix || data.tokenPrefix || "A").toString().toUpperCase().trim(),
                } as Doctor;
            });
            setDoctors(items);
            setDoctorsLoaded(true);

            // Cache doctors to localStorage for AI API access
            try {
                localStorage.setItem(`vizzi_doctors_cache_${user.userId}`, JSON.stringify(items));
                console.log("[Kiosk] Doctors cached to localStorage:", items.length);
            } catch (e) {
                console.warn("Failed to cache doctors to localStorage:", e);
            }

            console.log("[Kiosk] Doctors Synced:", items);
        });
        return () => unsubscribe();
    }, [user]);

    useEffect(() => {
        if (!doctors.length) {
            setSelectedDoctorId("");
            setQueueDoctorId("all");
            return;
        }

        // If locked to a specific doctor, enforce it
        if (kioskBoundDoctorId) {
            setSelectedDoctorId(kioskBoundDoctorId);
            // Also filter queue if in display mode? 
            // For now, let's keep queueDoctorId as "all" unless user manually filters, 
            // or maybe default it to the bound doctor for clarity.
            if (queueDoctorId === "all" || !queueDoctorId) {
                setQueueDoctorId(kioskBoundDoctorId);
            }
        } else if (!selectedDoctorId) {
            const firstAvailable = doctors.find((d) => normalizeDoctorStatus(d) === "AVAILABLE");
            const firstActive = firstAvailable || doctors.find((d) => d.active) || doctors[0];
            console.log("[Kiosk] Auto-selecting doctor:", {
                allDoctors: doctors.map(d => ({ id: d.id, name: d.name, active: d.active, status: normalizeDoctorStatus(d) })),
                firstAvailable,
                firstActive,
                selectedDoctorId: firstActive?.id
            });
            setSelectedDoctorId(firstActive.id);
        }

        if (queueDoctorId === "") {
            setQueueDoctorId("all");
        }
    }, [doctors, queueDoctorId, selectedDoctorId, kioskBoundDoctorId]);

    useEffect(() => {
        if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
        const warmup = () => {
            const voices = window.speechSynthesis.getVoices();
            if (voices.length) voicesReadyRef.current = true;
        };
        warmup();
        window.speechSynthesis.onvoiceschanged = () => warmup();
        return () => {
            window.speechSynthesis.onvoiceschanged = null;
        };
    }, []);

    const speakText = async (text: string, lang: string): Promise<void> => {
        if (!settings.voiceEnabled) return;
        const normalizedLang = normalizeLang(lang).toLowerCase();
        const shouldForceIndianEnglish = normalizedLang.startsWith("en-in");

        return new Promise(async (resolve) => {
            // Try AWS Polly if enabled OR if we need guaranteed Indian English output.
            if (settings.voiceEngine === "polly" || shouldForceIndianEnglish) {
                try {
                    const response = await fetch("/api/polly", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            text,
                            voiceId: settings.voiceGender === "male" ? "Kajal" : "Aditi",
                            languageCode: shouldForceIndianEnglish ? "en-IN" : normalizeLang(lang),
                        }),
                    });

                    if (response.ok) {
                        const blob = await response.blob();
                        const url = URL.createObjectURL(blob);
                        const audio = new Audio(url);
                        audio.onended = () => resolve();
                        audio.onerror = () => resolve();
                        try {
                            await audio.play();
                            setAudioBlocked(false);
                        } catch (playErr: any) {
                            if (playErr.name === "NotAllowedError") {
                                console.warn("[Kiosk] Audio playback blocked by browser policy. Interaction required.");
                                setAudioBlocked(true);
                            }
                            resolve();
                        }
                        return; // Success with Polly
                    }
                } catch (error) {
                    console.error("Polly speech error, falling back to browser:", error);
                }

                if (shouldForceIndianEnglish) {
                    // For English, avoid falling back to US browser voices.
                    resolve();
                    return;
                }
            }

            // Fallback to Browser Speech Synthesis
            if (typeof window === "undefined" || !("speechSynthesis" in window)) {
                resolve();
                return;
            }

            const utterance = new SpeechSynthesisUtterance(text);
            utterance.rate = settings.voiceRate || 0.8;
            utterance.pitch = settings.voicePitch || 1;
            utterance.lang = lang;
            utterance.volume = Math.max(0, Math.min(1, (settings.voiceVolume || 100) / 100));

            utterance.onend = () => resolve();
            utterance.onerror = () => resolve();

            if (!voicesReadyRef.current) {
                window.speechSynthesis.getVoices();
            }

            let selectedVoice = null;
            const isIndianVoiceName = (voiceName: string) =>
                /india|indian|aditi|kajal|raveena|prabhat|heera|kavya/i.test(voiceName);
            if (settings.voiceName && (!shouldForceIndianEnglish || isIndianVoiceName(settings.voiceName))) {
                selectedVoice = window.speechSynthesis.getVoices().find((voice) => voice.name === settings.voiceName) || null;
            }

            if (!selectedVoice) {
                selectedVoice = pickVoice(settings.voiceGender ? `${lang}|${settings.voiceGender}` : lang);
            }

            if (selectedVoice) utterance.voice = selectedVoice;

            window.speechSynthesis.cancel();
            window.speechSynthesis.speak(utterance);
        });
    };

    useEffect(() => {
        if (!settings.voiceEnabled) return;
        const rawLang = settings.voiceLanguage || "en-IN";
        const lang = normalizeLang(rawLang);
        const template = settings.announcementTemplate || "";
        const announced = announcedRef.current;

        patients.forEach((patient) => {
            if (patient.status !== "in_progress") return;
            const callTime = patient.lastCalledAt || patient.timestamp;
            if (!callTime) return;
            const key = `${patient.id}_${callTime}`;
            if (announced.has(key)) return;
            const name = patient.name || "Patient";
            const expandedToken = expandToken(patient.tokenNumber || "");
            const text = buildVoiceAnnouncement(template, {
                name,
                token: expandedToken,
                clinic: clinicName,
                doctor: patient.doctorName
            });
            speakText(text, lang);
            announced.add(key);
        });
    }, [patients, settings.voiceEnabled, settings.voiceLanguage, settings.announcementTemplate, settings.voiceVolume, clinicName]);

    useEffect(() => {
        if (!user) return;
        console.log("[Kiosk] Setting up patient listener for user:", user.userId);
        const queueRef = collection(db, "clinics", user.userId, "queue");
        const q = query(queueRef, orderBy("timestamp", "asc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setIsOnline(true);
            const items = (snapshot?.docs || []).map((docSnap: any) => {
                const data = docSnap.data() as Partial<Patient>;
                const normalized = resolveVisitFlags(data);
                return {
                    ...DEFAULT_PATIENT,
                    ...data,
                    id: docSnap.id,
                    timestamp: typeof data.timestamp === "number" ? data.timestamp : 0,
                    lastCalledAt: toMillis(
                        (data as any).lastCalledAt ??
                        (data as any).calledAt ??
                        (data as any).callTime ??
                        (data as any).callTimestamp
                    ),
                    ...normalized,
                } as Patient;
            });

            if (snapshot && !snapshot.empty) {
                console.log("[Kiosk] Patients updated from DB:", snapshot.docs.length);
                setCachedPatients(items);
                setPatients(items);
                try {
                    localStorage.setItem(`vizzi_patients_cache_${user.userId}`, JSON.stringify(items));
                } catch (e) {
                    console.warn("Failed to cache patients to localStorage:", e);
                }
            } else if (snapshot) {
                console.log("[Kiosk] Queue is empty (confirmed by server)");
                setPatients([]);
                setCachedPatients([]);
                localStorage.setItem(`vizzi_patients_cache_${user.userId}`, JSON.stringify([]));
            }
        });
        return () => {
            console.log("[Kiosk] Cleaning up patient listener");
            unsubscribe();
        };
    }, [user]);

    useEffect(() => {
        const handleKeydown = (event: KeyboardEvent) => {
            if (!kioskMode) return;
            const blockedKeys = ["F5", "F11", "Escape"];
            if (blockedKeys.includes(event.key)) {
                event.preventDefault();
            }
            if ((event.ctrlKey || event.metaKey) && ["r", "l", "w", "n", "t"].includes(event.key.toLowerCase())) {
                event.preventDefault();
            }
        };
        const handleContextMenu = (event: MouseEvent) => {
            if (kioskMode) event.preventDefault();
        };
        const handleBeforeUnload = (event: BeforeUnloadEvent) => {
            if (!kioskMode) return;
            event.preventDefault();
            event.returnValue = "";
        };
        document.addEventListener("keydown", handleKeydown);
        document.addEventListener("contextmenu", handleContextMenu);
        window.addEventListener("beforeunload", handleBeforeUnload);
        return () => {
            document.removeEventListener("keydown", handleKeydown);
            document.removeEventListener("contextmenu", handleContextMenu);
            window.removeEventListener("beforeunload", handleBeforeUnload);
        };
    }, [kioskMode]);

    useEffect(() => {
        const handleFullscreenChange = () => {
            const isFull = document.fullscreenElement != null;
            if (!isFull) setKioskMode(false);
        };
        document.addEventListener("fullscreenchange", handleFullscreenChange);
        return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
    }, []);

    // Presence Detection (Camera)
    useEffect(() => {
        if (interactionMode !== "ai" || !isCameraEnabled) {
            setPresenceDetected(false);
            motionDetectedRef.current = false;
            facePresentRef.current = false;
            faceLastSeenAtRef.current = 0;
            presenceScoreRef.current = 0;
            return;
        }

        let stream: MediaStream | null = null;
        let animationId: number;
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || !canvas) return;

        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        const FaceDetectorCtor = typeof window !== "undefined" ? (window as any).FaceDetector : null;
        const faceDetector = FaceDetectorCtor ? new FaceDetectorCtor({ fastMode: true, maxDetectedFaces: 1 }) : null;
        let prevFrame: ImageData | null = null;
        let frameCount = 0;
        const COOLDOWN_MS = 12000;
        const FACE_STALE_MS = 1600;

        const startCamera = async () => {
            try {
                stream = await navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 240 } });
                if (video) {
                    video.srcObject = stream;
                    video.play();
                    detect();
                }
            } catch (err) {
                console.warn("Camera access denied for AI mode:", err);
                setIsCameraEnabled(false);
                setCameraPermissionBlocked(true);
            }
        };

        const detect = () => {
            if (!ctx || !video || video.paused || video.ended) return;
            try {
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                const currentFrame = ctx.getImageData(0, 0, canvas.width, canvas.height);
                frameCount += 1;

                if (prevFrame) {
                    let diff = 0;
                    for (let i = 0; i < currentFrame.data.length; i += 4) {
                        const r = Math.abs(currentFrame.data[i] - prevFrame.data[i]);
                        const g = Math.abs(currentFrame.data[i + 1] - prevFrame.data[i + 1]);
                        const b = Math.abs(currentFrame.data[i + 2] - prevFrame.data[i + 2]);
                        if (r + g + b > 100) diff++;
                    }

                    const pixelCount = canvas.width * canvas.height;
                    const motionRatio = diff / pixelCount;
                    const motionPresence = motionRatio > 0.08; // stricter than old 5% threshold

                    if (faceDetector && frameCount % 8 === 0 && !faceDetectionBusyRef.current) {
                        faceDetectionBusyRef.current = true;
                        faceDetector.detect(canvas)
                            .then((faces: any[]) => {
                                if (faces?.length) {
                                    facePresentRef.current = true;
                                    faceLastSeenAtRef.current = Date.now();
                                } else if (Date.now() - faceLastSeenAtRef.current > FACE_STALE_MS) {
                                    facePresentRef.current = false;
                                }
                            })
                            .catch(() => {
                                // Ignore transient face detector errors.
                            })
                            .finally(() => {
                                faceDetectionBusyRef.current = false;
                            });
                    }

                    const facePresence = faceDetector
                        ? facePresentRef.current || (Date.now() - faceLastSeenAtRef.current <= FACE_STALE_MS)
                        : false;
                    const personDetected = faceDetector ? facePresence : motionPresence;

                    if (personDetected) {
                        presenceScoreRef.current = Math.min(presenceScoreRef.current + 1, 12);
                    } else {
                        presenceScoreRef.current = Math.max(presenceScoreRef.current - 1, 0);
                    }

                    const stablePresence = presenceScoreRef.current >= 4;
                    setPresenceDetected(stablePresence);

                    if (stablePresence && !motionDetectedRef.current && (Date.now() - lastAutoTriggerAtRef.current > COOLDOWN_MS)) {
                        motionDetectedRef.current = true;
                        lastAutoTriggerAtRef.current = Date.now();
                        handleAiArrival();
                    } else if (!stablePresence && aiStep === "idle") {
                        motionDetectedRef.current = false;
                    }
                }
                prevFrame = currentFrame;
                animationId = requestAnimationFrame(detect);
            } catch (e) {
                // Handle potential errors like video not ready
                animationId = requestAnimationFrame(detect);
            }
        };

        startCamera();

        return () => {
            if (stream) {
                stream.getTracks().forEach(t => {
                    t.stop();
                    stream?.removeTrack(t);
                });
            }
            if (video) video.srcObject = null;
            cancelAnimationFrame(animationId);
            motionDetectedRef.current = false;
            facePresentRef.current = false;
            faceLastSeenAtRef.current = 0;
            presenceScoreRef.current = 0;
        };
    }, [interactionMode, isCameraEnabled, aiStep]);

    const submitToAws = async (complaintText: string) => {
        if (!user) return;
        const langCode = language === "hi" ? "hi-IN" : "en-IN";
        setSubmitting(true);
        try {
            if (isEmergencyOnly) {
                const msg = language === "hi"
                    ? "क्लिनिक अभी केवल इमरजेंसी मरीज ले रहा है। कृपया रिसेप्शन से संपर्क करें।"
                    : "Clinic is currently accepting emergency patients only. Please contact reception.";
                setMessages(prev => [...prev, { role: "ai", content: msg }]);
                setAiStatus("responding");
                await speakText(msg, langCode);
                setAiStatus("idle");
                return;
            }
            const assignedDoctor = getDoctorForCheckIn();
            if (!kioskBoundDoctorId && selectedDoctorUnavailable && selectedDoctorStatus) {
                const unavailableMsg = getDoctorUnavailableMessage(selectedDoctorStatus, language);
                setMessages(prev => [...prev, { role: "ai", content: unavailableMsg }]);
                setAiStatus("responding");
                await speakText(unavailableMsg, langCode);
                setAiStatus("idle");
                return;
            }
            if (doctors.length > 0 && !assignedDoctor) {
                const busyMsg = language === "hi" ? "सभी डॉक्टर अभी व्यस्त हैं। कृपया प्रतीक्षा करें।" : "All doctors currently busy";
                setMessages(prev => [...prev, { role: "ai", content: busyMsg }]);
                setAiStatus("responding");
                await speakText(busyMsg, langCode);
                setAiStatus("idle");
                return;
            }
            let res;
            try {
                res = await submitAiCheckIn({
                    clinicId: user.userId,
                    name: form.name,
                    mobile: form.mobile,
                    complaint: complaintText,
                    doctorId: assignedDoctor?.id || "",
                    doctorPrefix: assignedDoctor?.prefix || settings.tokenPrefix
                });
                console.log("[Kiosk] AI API response:", {
                    response: res,
                    selectedDoctorId: assignedDoctor?.id || "",
                    selectedDoctor: assignedDoctor || null
                });
            } catch (apiErr) {
                console.warn("[AI Kiosk] AI submit failed, falling back to local token:", apiErr);
                res = {
                    id: `loc-${Date.now()}`,
                    tokenNumber: generateNextToken(
                        assignedDoctor ? assignedDoctor.id : null,
                        assignedDoctor?.prefix
                    ),
                    message: dictionary[language].wait
                };
            }

            if (res.tokenNumber) {
                const payload: Patient = {
                    ...DEFAULT_PATIENT,
                    id: res.id,
                    name: form.name,
                    mobileNumber: form.mobile,
                    tokenNumber: res.tokenNumber,
                    status: "waiting",
                    timestamp: Date.now(),
                    doctorId: assignedDoctor?.id || "",
                    doctorName: assignedDoctor?.name || "",
                    doctorPrefix: assignedDoctor?.prefix || settings.tokenPrefix,
                    symptoms: complaintText || "",
                };

                // Persist to Database (Amplify Mutation via shim)
                try {
                    const queueRef = collection(db, "clinics", user.userId, "queue");
                    const docRef = doc(queueRef, res.id);
                    console.log("[Kiosk] Writing to DB:", {
                        docPath: `clinics/${user.userId}/queue/${res.id}`,
                        payload
                    });
                    await setDoc(docRef, payload);
                    console.log("[Kiosk] AI Check-in persisted to DB:", res.id);

                    // Trigger SMS via MSG91
                    if (settings.smsEnabled && payload.mobileNumber) {
                        await sendTokenSms({
                            mobile: payload.mobileNumber,
                            token: payload.tokenNumber,
                            name: payload.name,
                            clinicName: settings.smsClinicName || settings.clinicName,
                            enabled: settings.smsEnabled
                        });
                    }
                } catch (dbErr) {
                    console.error("[Kiosk] Failed to persist AI check-in:", dbErr);
                }

                setLastCheckedIn(payload);
                setLastSmsMobile(form.mobile);
                setSmsStatus("sending");

                const successMsg = `${dictionary[language].success} ${res.tokenNumber.split("").join(" ")}. ${dictionary[language].wait} ~${todayQueue.length * 8} min.`;
                const verifyMsg = dictionary[language].smsSent;

                setMessages(prev => [
                    ...prev,
                    { role: 'ai', content: successMsg },
                    { role: 'ai', content: verifyMsg }
                ]);

                setAiStatus("responding");
                await speakText(successMsg, langCode);
                await speakText(verifyMsg, langCode);
                setAiStatus("idle");

                setAiStep("sms_verify");
                if (inputMode === "voice") startListening(800);
            }
        } catch (err) {
            console.error("AWS Sync failed:", err);
            setAiStep("idle");
        } finally {
            setSubmitting(false);
        }
    };

    const handleSpeechResult = async (text: string) => {
        setAiStatus("processing"); // Immediate feedback — prevents UI looking frozen
        setMessages(prev => [...prev, { role: 'user', content: text }]);
        const langCode = language === "hi" ? "hi-IN" : "en-IN";

        if (aiStep === "name") {
            const cleanedName = cleanName(text);
            setForm(prev => ({ ...prev, name: cleanedName }));
            const msg = dictionary[language].askMobile;
            setMessages(prev => [...prev, { role: 'ai', content: msg }]);
            setAiStep("mobile");
            setAiStatus("responding");
            await speakText(msg, langCode);
            setAiStatus("idle");
            if (inputMode === "voice") startListening();
        } else if (aiStep === "mobile") {
            const digits = text.replace(/\D/g, "");
            if (digits.length !== 10) {
                const msg = dictionary[language].invalidMobile;
                setMessages(prev => [...prev, { role: 'ai', content: msg }]);
                setAiStatus("responding");
                await speakText(msg, langCode);
                setAiStatus("idle");
                if (inputMode === "voice") startListening();
                return;
            }
            setForm(prev => ({ ...prev, mobile: digits }));
            const msg = dictionary[language].confirmData
                .replace("{name}", form.name)
                .replace("{mobile}", digits);
            const voiceMsg = dictionary[language].confirmData
                .replace("{name}", form.name)
                .replace("{mobile}", expandToken(digits));
            setMessages(prev => [...prev, { role: 'ai', content: msg }]);
            setAiStep("data_confirm");
            setAiStatus("responding");
            await speakText(voiceMsg, langCode);
            setAiStatus("idle");
            if (inputMode === "voice") startListening();
        } else if (aiStep === "data_confirm") {
            const lower = text.toLowerCase().trim();
            const isYes = /\b(yes|yeah|yep|ya|yaah|yup|sure|ok|okay|correct|right|confirmed|go ahead|proceed|done|confirm|haan|ha|haa|ji|haji|han|acha|theek|thik|theek hai|thik hai)\b/i.test(lower) ||
                lower.includes("\u0939\u093e\u0902") || lower.includes("\u0939\u093e\u0901") || lower.includes("\u091c\u0940") || lower.includes("\u0938\u0939\u0940");

            const isNo = /\b(no|nope|nah|wrong|false|incorrect|galat|nahi|nahin|nai|na|cancel|retry|reset)\b/i.test(lower) ||
                lower.startsWith("na ") || lower === "na";

            if (isYes && !isNo) {
                const msg = dictionary[language].askComplaint;
                setMessages(prev => [...prev, { role: 'ai', content: msg }]);
                setAiStep("complaint");
                setAiStatus("responding");
                await speakText(msg, langCode);
                setAiStatus("idle");
                if (inputMode === "voice") startListening();
            } else if (isNo) {
                setForm({ name: "", mobile: "", symptoms: "" });
                const msg = dictionary[language].retryData;
                setMessages(prev => [...prev, { role: 'ai', content: msg }]);
                setAiStep("name");
                setAiStatus("responding");
                await speakText(msg, langCode);
                setAiStatus("idle");
                if (inputMode === "voice") startListening();
            } else {
                // Unrecognised — re-prompt without resetting flow
                const reprompt = language === "hi"
                    ? "कृपया 'हाँ' या 'नहीं' बोलें।"
                    : "Please say yes or no.";
                setMessages(prev => [...prev, { role: 'ai', content: reprompt }]);
                setAiStatus("responding");
                await speakText(reprompt, langCode);
                setAiStatus("idle");
                if (inputMode === "voice") startListening();
            }
        } else if (aiStep === "complaint") {
            setAiStep("confirm");
            const msg = dictionary[language].processing;
            // Note: user message already added at top of handleSpeechResult — do NOT add again
            setMessages(prev => [...prev, { role: 'ai', content: msg }]);
            setAiStatus("responding");
            await speakText(msg, langCode);
            setAiStatus("processing");
            submitToAws(text);
        } else if (aiStep === "sms_verify") {
            const lower = text.toLowerCase().trim();
            const isYes = /\b(yes|yeah|yep|ya|yaah|yup|sure|ok|okay|correct|right|confirmed|go ahead|proceed|done|confirm|haan|ha|haa|ji|haji|han|acha|theek|thik|theek hai|thik hai)\b/i.test(lower) ||
                lower.includes("\u0939\u093e\u0902") || lower.includes("\u0939\u093e\u0901") || lower.includes("\u091c\u0940") || lower.includes("\u0938\u0939\u0940");

            const isNo = /\b(no|nope|nah|wrong|false|incorrect|galat|nahi|nahin|nai|na|cancel|retry|reset)\b/i.test(lower) ||
                lower.startsWith("na ") || lower === "na";

            if (isYes && !isNo) {
                setAiStep("idle");
                setSmsStatus("success");
                setTimeout(() => {
                    setAiStep("idle");
                    setMessages([]);
                    motionDetectedRef.current = false;
                    setPresenceDetected(false);
                    setLastCheckedIn(null);
                }, 5000);
            } else if (isNo) {
                setAiStep("sms_retry_mobile");
                const msg = `${dictionary[language].smsNotReceived} (${form.mobile})`;
                const voiceMsg = `${dictionary[language].smsNotReceived} ${expandToken(form.mobile)}`;
                setMessages(prev => [...prev, { role: 'ai', content: msg }]);
                setAiStatus("responding");
                await speakText(voiceMsg, langCode);
                setAiStatus("idle");
                if (inputMode === "voice") startListening();
            } else {
                // Unrecognised — re-prompt for SMS verification
                const reprompt = language === "hi"
                    ? "क्या आपको SMS मिला? कृपया 'हाँ' या 'नहीं' बोलें।"
                    : "Did you receive the SMS? Please say yes or no.";
                setMessages(prev => [...prev, { role: 'ai', content: reprompt }]);
                setAiStatus("responding");
                await speakText(reprompt, langCode);
                setAiStatus("idle");
                if (inputMode === "voice") startListening();
            }
        } else if (aiStep === "sms_retry_mobile") {
            const newMobile = text.replace(/\D/g, "");
            const finalMobile = newMobile.length === 10 ? newMobile : form.mobile;

            if (newMobile.length === 10) {
                setForm(prev => ({ ...prev, mobile: newMobile }));
            }

            if (smsRetryCount >= 2 && finalMobile === lastSmsMobile) {
                const limitMsg = dictionary[language].smsRetryLimit;
                setMessages(prev => [...prev, { role: 'ai', content: limitMsg }]);
                setAiStatus("responding");
                await speakText(limitMsg, langCode);
                setAiStatus("idle");
                setTimeout(() => {
                    setAiStep("idle");
                    setMessages([]);
                    motionDetectedRef.current = false;
                    setPresenceDetected(false);
                    setLastCheckedIn(null);
                }, 8000);
            } else {
                setSmsRetryCount(prev => prev + 1);
                setLastSmsMobile(finalMobile);
                setSmsStatus("sending");

                if (settings.smsEnabled && lastCheckedIn) {
                    await sendTokenSms({
                        mobile: finalMobile,
                        token: lastCheckedIn.tokenNumber,
                        name: lastCheckedIn.name,
                        clinicName: settings.smsClinicName || settings.clinicName,
                        enabled: settings.smsEnabled
                    });
                }

                const resendingMsg = dictionary[language].smsConfirmed;
                const verifyMsg = dictionary[language].smsSent;
                setMessages(prev => [
                    ...prev,
                    { role: 'ai', content: resendingMsg },
                    { role: 'ai', content: verifyMsg }
                ]);

                setAiStatus("responding");
                await speakText(resendingMsg, langCode);
                await speakText(verifyMsg, langCode);
                setAiStatus("idle");
                setAiStep("sms_verify");
                if (inputMode === "voice") startListening();
            }
        }
    };

    const handleSpeechResultRef = useRef(handleSpeechResult);
    useEffect(() => {
        handleSpeechResultRef.current = handleSpeechResult;
    }, [handleSpeechResult]);

    // Speech Recognition Setup — creates a fresh instance on every startListening call
    // (Chrome/WebkitSpeechRecognition cannot reliably restart after continuous:false ends)
    const createRecognition = () => {
        if (typeof window === "undefined") return null;
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) return null;

        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = language === "hi" ? "hi-IN" : "en-IN";

        recognition.onstart = () => {
            if (listenTimerRef.current) {
                window.clearTimeout(listenTimerRef.current);
                listenTimerRef.current = null;
            }
            setIsListening(true);
            setAiStatus("listening");
        };
        recognition.onend = () => {
            setIsListening(false);
            setInterimSpeech("");
            // If mic closed without a result (timeout), reset status so UI doesn't stay stuck on 'listening'
            setAiStatus(prev => (prev === "listening" || prev === "arming") ? "idle" : prev);
        };
        recognition.onresult = (event: any) => {
            let interim = "";
            let final = "";
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    final += event.results[i][0].transcript;
                } else {
                    interim += event.results[i][0].transcript;
                }
            }

            if (final) {
                setIsListening(false);
                setInterimSpeech("");
                setSpeechResult(final);
                handleSpeechResultRef.current(final);
            } else {
                setInterimSpeech(interim);
            }
        };
        recognition.onerror = (event: any) => {
            if (event.error === "no-speech") {
                // Timed out without hearing anything — auto restart so user doesn't get stuck
                console.log("[Speech] No speech detected, restarting listener...");
                setTimeout(() => {
                    try {
                        if (aiStep !== "idle" && inputMode === "voice") startListening(250);
                    } catch (e) { console.warn("[Speech] Auto-restart failed:", e); }
                }, 300);
            } else {
                console.warn("[Speech] Recognition error:", event.error);
                setIsListening(false);
                setAiStatus(prev => (prev === "listening" || prev === "arming") ? "idle" : prev);
            }
        };
        return recognition;
    };

    const handleAiArrival = async () => {
        if (aiStep !== "idle") return;

        // Check Clinic Status
        if (isClinicClosed || isCheckInDisabled || isEmergencyOnly) {
            setAiStep("greeting");
            const msg = language === "hi"
                ? "नमस्ते! क्षमा करें, क्लिनिक इस समय बंद है। कृपया बाद में आएं।"
                : "Namaste! Sorry, the clinic is currently closed. Please visit later.";
            setMessages([{ role: 'ai', content: msg }]);
            setAiStatus("responding");
            await speakText(msg, language === "hi" ? "hi-IN" : "en-IN");
            setAiStatus("idle");
            setTimeout(() => {
                setAiStep("idle");
                setMessages([]);
                motionDetectedRef.current = false;
                setPresenceDetected(false);
            }, 5000);
            return;
        }

        setAiStep("greeting");
        const welcomeMsg = dictionary[language].welcome;
        setMessages([{ role: 'ai', content: welcomeMsg }]);
        setAiStatus("responding");
        await speakText(welcomeMsg, language === "hi" ? "hi-IN" : "en-IN");

        const askNameMsg = dictionary[language].askName;
        setMessages(prev => [...prev, { role: 'ai', content: askNameMsg }]);
        setAiStep("name");
        setAiStatus("responding");
        await speakText(askNameMsg, language === "hi" ? "hi-IN" : "en-IN");
        setAiStatus("idle");
        if (inputMode === "voice") startListening();
    };

    const startListening = (delayMs = 400) => {
        if (isClinicClosed || isCheckInDisabled || isEmergencyOnly) return;
        if (inputMode !== "voice") return;

        // Ensure any ongoing speech is cancelled before starting listener 
        // to avoid mic interference/feedback
        if (typeof window !== "undefined" && "speechSynthesis" in window) {
            window.speechSynthesis.cancel();
        }

        if (recognitionRef.current) {
            try { recognitionRef.current.abort?.(); } catch { }
            recognitionRef.current = null;
        }

        if (listenTimerRef.current) {
            window.clearTimeout(listenTimerRef.current);
            listenTimerRef.current = null;
        }
        setIsListening(false);
        setAiStatus("arming");

        listenTimerRef.current = window.setTimeout(() => {
            try {
                // Create a fresh recognition instance each time for reliability
                const recognition = createRecognition();
                if (!recognition) {
                    setAiStatus("idle");
                    return;
                }
                recognitionRef.current = recognition;
                recognition.start();
            } catch (e) {
                console.warn("Recognition start error:", e);
                setAiStatus("idle");
            }
            listenTimerRef.current = null;
        }, delayMs);
    };

    useEffect(() => {
        return () => {
            if (listenTimerRef.current) {
                window.clearTimeout(listenTimerRef.current);
            }
            if (recognitionRef.current) {
                try { recognitionRef.current.abort?.(); } catch { }
            }
        };
    }, []);

    const getResetDateRange = (resetType: string = "Daily") => {
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
        const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

        if (resetType === "Weekly") {
            const day = now.getDay(); // 0 is Sunday
            start.setDate(now.getDate() - day);
            end.setDate(now.getDate() + (6 - day));
        } else if (resetType === "Monthly") {
            start.setDate(1);
            end.setMonth(now.getMonth() + 1);
            end.setDate(0);
        }

        return { start: start.getTime(), end: end.getTime() };
    };

    const todayQueue = useMemo(() => {
        const resetRange = getResetDateRange(settings.tokenResetTime);
        const filtered = patients.filter((patient) => {
            if (patient.status === "completed" || patient.status === "cancelled") return false;

            // FILTER BY DATE RANGE (Daily/Weekly/Monthly)
            // Even if not an appointment, we only want "current interval" patients on the kiosk
            if (patient.timestamp < resetRange.start || patient.timestamp > resetRange.end) {
                return false;
            }

            if (queueDoctorId !== "all" && (patient as any).doctorId && (patient as any).doctorId !== queueDoctorId) {
                return false;
            }

            return true;
        });
        console.log("[Kiosk] Queue filtering:", {
            totalPatients: patients.length,
            queueDoctorId,
            resetRange,
            filteredCount: filtered.length,
            allPatientsWithDoctors: patients.map(p => ({
                id: p.id,
                name: p.name,
                tokenNumber: p.tokenNumber,
                doctorId: (p as any).doctorId,
                doctorName: (p as any).doctorName,
                doctorPrefix: (p as any).doctorPrefix,
                status: p.status,
                timestamp: p.timestamp,
                inDateRange: p.timestamp >= resetRange.start && p.timestamp <= resetRange.end,
                matchesDoctor: queueDoctorId === 'all' || (p as any).doctorId === queueDoctorId
            })),
            filteredPatients: filtered.map(p => ({
                id: p.id,
                name: p.name,
                tokenNumber: p.tokenNumber,
                doctorId: (p as any).doctorId,
                doctorName: (p as any).doctorName,
                status: p.status
            }))
        });
        return sortQueue(filtered);
    }, [patients, queueDoctorId, settings.tokenResetTime]);

    const selectedDoctorForCheckIn = useMemo(() => {
        const selectedDoctor = doctors.find((d) => d.id === selectedDoctorId) || null;
        console.log("[Kiosk] Selected doctor for check-in:", {
            selectedDoctorId,
            selectedDoctor: selectedDoctor ? {
                id: selectedDoctor.id,
                name: selectedDoctor.name,
                prefix: selectedDoctor.prefix,
                active: selectedDoctor.active
            } : null,
            allDoctors: doctors.map(d => ({ id: d.id, name: d.name, active: d.active, prefix: d.prefix })),
            kioskBoundDoctorId
        });
        return selectedDoctor;
    }, [selectedDoctorId, doctors, kioskBoundDoctorId]);
    const selectedDoctorStatus = selectedDoctorForCheckIn ? normalizeDoctorStatus(selectedDoctorForCheckIn) : null;
    const selectedDoctorUnavailable = Boolean(selectedDoctorStatus && selectedDoctorStatus !== "AVAILABLE");

    const getDoctorForCheckIn = () => {
        const scopeDoctors = kioskBoundDoctorId
            ? doctors.filter((d) => d.id === kioskBoundDoctorId)
            : doctors;
        const preferredId = selectedDoctorForCheckIn?.id || undefined;
        const picked = pickRoundRobinDoctor(user?.userId || "", scopeDoctors, preferredId);
        if (picked && user?.userId) {
            setRoundRobinPointer(user.userId, picked.id);
        }
        return picked;
    };

    const generateNextToken = (doctorId: string | null, prefixOverride?: string) => {
        const resetRange = getResetDateRange(settings.tokenResetTime);
        const count = patients.filter((p) => {
            if (p.timestamp < resetRange.start || p.timestamp > resetRange.end) return false;
            if (doctorId && (p as any).doctorId) {
                return (p as any).doctorId === doctorId;
            }
            return !doctorId;
        }).length;
        const nextNumber = count + 1;
        const formattedNumber = String(nextNumber).padStart(settings.tokenDigits, "0");
        const prefix = (prefixOverride || settings.tokenPrefix || "A").toString().toUpperCase();
        console.log("[Kiosk] Token generation:", {
            doctorId,
            prefixOverride,
            settingsTokenPrefix: settings.tokenPrefix,
            finalPrefix: prefix,
            nextNumber,
            formattedNumber,
            token: `${prefix}${formattedNumber}`,
            patientsCount: patients.length,
            filteredCount: count
        });
        return `${prefix}${formattedNumber}`;
    };

    const [lastCheckedIn, setLastCheckedIn] = useState<Patient | null>(null);
    const [aiMessage, setAiMessage] = useState<string>("");

    const handleCheckIn = async () => {
        if (!user) return;
        if (isOverlayActive) return;
        if (isEmergencyOnly) {
            setAiMessage("Emergency check-ins only. Please approach reception.");
            return;
        }
        const trimmedName = form.name.trim();
        const trimmedMobile = form.mobile.trim();
        const mobileDigits = trimmedMobile.replace(/\D/g, "");
        if (!trimmedName) return;
        if (mobileDigits.length > 0 && mobileDigits.length !== 10) return;
        if (!kioskBoundDoctorId && selectedDoctorUnavailable && selectedDoctorStatus) {
            setAiMessage(getDoctorUnavailableMessage(selectedDoctorStatus, "en"));
            return;
        }
        const selectedDoctor = getDoctorForCheckIn();
        if (doctors.length > 0 && !selectedDoctor) {
            setAiMessage("All doctors currently busy");
            return;
        }
        setSubmitting(true);
        try {
            const queueRef = collection(db, "clinics", user.userId, "queue");
            const newRef = doc(queueRef);
            const tokenNumber = generateNextToken(
                selectedDoctor ? selectedDoctor.id : null,
                selectedDoctor?.prefix
            );
            const payload: Patient = {
                id: newRef.id,
                name: trimmedName,
                mobileNumber: mobileDigits,
                tokenNumber,
                doctorId: selectedDoctor?.id || "",
                doctorName: selectedDoctor?.name || "",
                doctorPrefix: selectedDoctor?.prefix || settings.tokenPrefix,
                status: "waiting",
                timestamp: Date.now(),
                isAppointment: false,
                isEmergency: false,
                appointmentDate: "",
                appointmentTime: "",
                lastCalledAt: 0,
                symptoms: form.symptoms.trim(),
            };
            await setDoc(newRef, payload);
            setForm({ name: "", mobile: "", symptoms: "" });
            setLastCheckedIn(payload);

            // Trigger SMS via MSG91 for manual check-in
            if (settings.smsEnabled && payload.mobileNumber) {
                try {
                    await sendTokenSms({
                        mobile: payload.mobileNumber,
                        token: payload.tokenNumber,
                        name: payload.name,
                        clinicName: settings.smsClinicName || settings.clinicName
                    });
                } catch (smsErr) {
                    console.error("[Kiosk] Manual check-in SMS failed:", smsErr);
                }
            }

            // Fetch AI Message
            try {
                const prompt = `Patient ${payload.name} has token ${payload.tokenNumber}. Wait time is about ${todayQueue.length * 10} mins.`;
                const res = await fetch("/api/ai", {
                    method: "POST",
                    body: JSON.stringify({ prompt, type: "kiosk_message" }),
                });
                const data = await res.json();
                if (data.content) setAiMessage(data.content);
            } catch (e) { console.warn("AI kiosk message failed:", e); }

            if (settings.voiceEnabled && typeof window !== "undefined" && "speechSynthesis" in window) {
                const rawLang = settings.voiceLanguage || "en-IN";
                const lang = normalizeLang(rawLang);
                const spokenToken = tokenNumber ? tokenNumber.split("").join(" ") : tokenNumber;
                const checkInTemplate = settings.checkInAnnouncementTemplate
                    || getDefaultCheckInTemplateForLang(rawLang);
                const baseText = buildVoiceAnnouncement(checkInTemplate, {
                    name: payload.name,
                    token: spokenToken || "",
                    clinic: clinicName
                });
                speakText(baseText, lang);
            }

            // Auto-clear confirmation after 15 seconds
            setTimeout(() => setLastCheckedIn(null), 15000);
        } finally {
            setSubmitting(false);
        }
    };

    const enterKioskMode = async () => {
        if (containerRef.current?.requestFullscreen) {
            await containerRef.current.requestFullscreen();
        } else if (document.documentElement.requestFullscreen) {
            await document.documentElement.requestFullscreen();
        }
        setKioskMode(true);
    };

    const exitKioskMode = async () => {
        if (document.fullscreenElement) {
            await document.exitFullscreen();
        }
        setKioskMode(false);
    };

    const headerDoctorLabel = doctors.length > 0
        ? doctorForUi?.name || "Select Doctor"
        : settings.doctorName || "Doctor Dashboard";
    const headerDoctorStatus = doctorForUi ? normalizeDoctorStatus(doctorForUi) : null;
    const headerDoctorStatusMeta = headerDoctorStatus ? DOCTOR_STATUS_META[headerDoctorStatus] : null;

    return (
        <div ref={containerRef} className={`min-h-screen bg-[#F6F7FB] ${kioskMode ? "cursor-none" : ""}`}>
            {/* Unmute Overlay */}
            {/* Connectivity Status Indicator */}
            {!isOnline && (
                <div className="fixed top-2 right-2 z-[9999] flex items-center gap-2 bg-rose-500 text-white px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg animate-pulse">
                    <RefreshCcw size={10} className="animate-spin" />
                    Offline (Syncing...)
                </div>
            )}

            {isOnline && patients.length > 0 && (
                <div className="fixed top-2 right-2 z-[9999] flex items-center gap-2 bg-emerald-500 text-white px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg">
                    <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                    Live Sync
                </div>
            )}

            {audioBlocked && (
                <div
                    className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-300"
                    onClick={() => {
                        setAudioBlocked(false);
                        // Trigger a small silent sound or speech to "unlock" the audio context
                        if (typeof window !== "undefined" && "speechSynthesis" in window) {
                            window.speechSynthesis.speak(new SpeechSynthesisUtterance(""));
                        }
                    }}
                >
                    <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl space-y-6">
                        <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mx-auto">
                            <VolumeX size={40} className="text-amber-500" />
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-xl font-black text-slate-900 uppercase">Audio Blocked</h3>
                            <p className="text-slate-500 font-medium text-sm">Your browser has blocked automatic announcements. Tap anywhere to enable voice.</p>
                        </div>
                        <button className="btn-primary w-full py-4 text-lg font-black uppercase tracking-widest">
                            Enable Voice
                        </button>
                    </div>
                </div>
            )}
            {clinicOperationalStatus !== "OPEN" && (
                <div className={`w-full text-center text-sm font-semibold py-2 ${clinicOperationalStatus === "EMERGENCY_ONLY"
                    ? "bg-rose-600 text-white"
                    : "bg-slate-700 text-white"
                    }`}>
                    {clinicOperationalStatus === "EMERGENCY_ONLY"
                        ? "Emergency Only Mode Active"
                        : "Clinic Closed"}
                </div>
            )}

            {isClinicClosed && (
                <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-slate-950/90 text-white text-center px-6">
                    <div className="text-sm uppercase tracking-[0.3em] text-slate-300">
                        {toTitleCase(clinicName)}
                    </div>
                    <h2 className="mt-4 text-3xl font-bold">Clinic Closed</h2>
                    <p className="mt-2 text-sm text-slate-200 max-w-sm">
                        Patient check-in is unavailable right now. Please wait for the clinic to reopen.
                    </p>
                </div>
            )}
            {isCheckInDisabled && !isClinicClosed && (
                <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-slate-950/70 text-white text-center px-6">
                    <div className="text-sm uppercase tracking-[0.3em] text-slate-300">
                        {toTitleCase(clinicName)}
                    </div>
                    <h2 className="mt-4 text-3xl font-bold">Check-in Paused</h2>
                    <p className="mt-2 text-sm text-slate-200 max-w-sm">
                        The clinic is temporarily not accepting new check-ins.
                    </p>
                </div>
            )}
            {isEmergencyOnly && !isClinicClosed && !isCheckInDisabled && (
                <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-rose-950/70 text-white text-center px-6">
                    <div className="text-sm uppercase tracking-[0.3em] text-rose-200">
                        {toTitleCase(clinicName)}
                    </div>
                    <h2 className="mt-4 text-3xl font-bold">Emergency Only</h2>
                    <p className="mt-2 text-sm text-rose-100 max-w-sm">
                        Only emergency patient check-ins are allowed right now. Please contact reception.
                    </p>
                </div>
            )}
            {isBoundDoctorUnavailable && (
                <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-slate-950/70 text-white text-center px-6">
                    <div className="text-sm uppercase tracking-[0.3em] text-slate-300">
                        {toTitleCase(clinicName)}
                    </div>
                    <h2 className="mt-4 text-3xl font-bold">{doctorForUi?.name || "Doctor"} Unavailable</h2>
                    <p className="mt-2 text-sm text-slate-200 max-w-sm">
                        {doctorUiStatus === "ON_BREAK"
                            ? "Doctor is currently on break."
                            : doctorUiStatus === "BUSY"
                                ? "Doctor is currently busy with another patient."
                                : "Doctor is offline right now."}
                    </p>
                </div>
            )}

            {/* No Doctors Overlay - Setup Guide */}
            {user && doctorsLoaded && doctors.length === 0 && (
                <div className="absolute inset-0 z-[60] flex flex-col items-center justify-center bg-slate-900 text-white text-center px-8">
                    <div className="max-w-2xl w-full space-y-8 animate-in fade-in zoom-in duration-700">
                        <div className="w-24 h-24 bg-indigo-500/20 rounded-3xl flex items-center justify-center mx-auto text-indigo-400 border border-indigo-500/30">
                            <Brain size={48} className="animate-pulse" />
                        </div>
                        <div className="space-y-4">
                            <h2 className="text-4xl font-black uppercase tracking-tighter leading-tight">
                                Clinic Setup Required
                            </h2>
                            <p className="text-xl text-slate-400 font-medium max-w-lg mx-auto leading-relaxed">
                                To activate the Kiosk, please add at least one doctor in your <span className="text-white font-bold">Settings</span>.
                            </p>
                        </div>
                        <div className="bg-white/5 border border-white/10 rounded-3xl p-8 text-left space-y-6">
                            <div className="flex items-start gap-4">
                                <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold text-sm shrink-0">1</div>
                                <div>
                                    <p className="text-white font-bold">Open Clinic Settings</p>
                                    <p className="text-slate-400 text-sm">Go to the main dashboard and click on Clinic Settings.</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-4">
                                <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold text-sm shrink-0">2</div>
                                <div>
                                    <p className="text-white font-bold">Add Your First Doctor</p>
                                    <p className="text-slate-400 text-sm">Create a doctor profile and assign a token prefix (e.g., "A").</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-4">
                                <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold text-sm shrink-0">3</div>
                                <div>
                                    <p className="text-white font-bold">Restart Kiosk</p>
                                    <p className="text-slate-400 text-sm">Refresh this page to start taking appointments.</p>
                                </div>
                            </div>
                        </div>
                        <Link href="/dashboard" className="inline-flex items-center gap-2 text-indigo-400 hover:text-indigo-300 font-bold transition">
                            <LayoutDashboard size={18} /> Back to Dashboard
                        </Link>
                    </div>
                </div>
            )}
            <div className="max-w-6xl mx-auto px-6 py-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-2xl bg-white border border-slate-200 flex items-center justify-center overflow-hidden p-1.5 shadow-sm">
                            {settings.clinicLogoUri ? (
                                <Image src={settings.clinicLogoUri} alt="Clinic logo" width={60} height={60} className="object-contain" />
                            ) : (
                                <Image src="/logo.png" alt="Vizzi" width={44} height={44} />
                            )}
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-2xl font-bold text-slate-900">{toTitleCase(clinicName)}</h1>
                                {doctors.length > 1 && kioskBoundDoctorId && (
                                    <button
                                        onClick={() => setKioskBoundDoctorId(null)}
                                        className="text-[10px] font-black uppercase text-indigo-500 hover:text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md transition-colors"
                                    >
                                        Switch Doctor
                                    </button>
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                <p className="text-sm text-slate-700 font-medium">{headerDoctorLabel ? toTitleCase(headerDoctorLabel) : "Doctor not added yet"}</p>
                                {headerDoctorStatusMeta && (
                                    <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-black uppercase tracking-wider", headerDoctorStatusMeta.className)}>
                                        {headerDoctorStatusMeta.label}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="flex bg-white/50 backdrop-blur-sm p-1 rounded-xl border border-slate-200 shadow-sm mr-2">
                            <button
                                onClick={() => setInteractionMode("standard")}
                                disabled={isOverlayActive}
                                className={cn("flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition disabled:opacity-50 disabled:cursor-not-allowed",
                                    interactionMode === "standard" ? "bg-primary text-white shadow-md" : "text-slate-500 hover:bg-slate-100")}
                            >
                                <LayoutDashboard size={14} />
                                Standard
                            </button>
                            <button
                                onClick={() => setInteractionMode("ai")}
                                disabled={isOverlayActive}
                                className={cn("flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition disabled:opacity-50 disabled:cursor-not-allowed",
                                    interactionMode === "ai" ? "bg-indigo-600 text-white shadow-md font-black" : "text-slate-500 hover:bg-slate-100")}
                            >
                                <Brain size={14} />
                                AI Assistant
                            </button>
                        </div>
                        {!kioskMode ? (
                            <button onClick={enterKioskMode} className="btn-primary flex items-center gap-2">
                                <Maximize2 size={18} />
                                Enter Kiosk
                            </button>
                        ) : (
                            <button onClick={exitKioskMode} className="btn-secondary flex items-center gap-2">
                                <Minimize2 size={18} />
                                Exit Kiosk
                            </button>
                        )}
                    </div>
                </div>

                {isOverlayActive ? (
                    <div className="mt-8 medical-card p-12 min-h-[600px] flex flex-col items-center justify-center text-center relative overflow-hidden">
                        <div className="absolute inset-0 bg-slate-50/50 backdrop-blur-sm z-0" />
                        <div className="absolute top-0 right-0 -mr-32 -mt-32 w-96 h-96 bg-rose-500/5 rounded-full blur-3xl" />
                        <div className="absolute bottom-0 left-0 -ml-32 -mb-32 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl" />

                        <div className="relative z-10 flex flex-col items-center max-w-lg">
                            <div className="w-32 h-32 bg-white rounded-full flex items-center justify-center mb-8 shadow-xl shadow-rose-100 ring-8 ring-rose-50">
                                <Shield className="w-16 h-16 text-rose-500" />
                            </div>
                            <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-4 tracking-tight">
                                {isClinicClosed
                                    ? "Clinic is Closed"
                                    : isEmergencyOnly
                                        ? "Emergency Only"
                                        : isBoundDoctorUnavailable
                                            ? `${doctorForUi?.name || "Doctor"} Unavailable`
                                            : "Check-in Paused"}
                            </h2>
                            <p className="text-lg text-slate-500 mb-8 leading-relaxed">
                                {isClinicClosed
                                    ? "Patient check-ins are currently disabled. Please wait for the clinic to open or contact the front desk."
                                    : isEmergencyOnly
                                        ? "Only emergency patient check-ins are allowed right now. Please contact reception."
                                        : isBoundDoctorUnavailable
                                            ? doctorUiStatus === "ON_BREAK"
                                                ? "Selected doctor is on break at the moment."
                                                : doctorUiStatus === "BUSY"
                                                    ? "Selected doctor is currently with another patient."
                                                    : "Selected doctor is offline right now."
                                            : "The front desk has temporarily paused new check-ins. We will resume shortly."}
                            </p>
                            <div className="w-16 h-1 bg-slate-200 rounded-full" />
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8 relative">

                        {interactionMode === "ai" ? (
                            <div className="medical-card p-0 h-[70vh] min-h-[620px] flex flex-col relative overflow-hidden bg-slate-50/30">
                                {/* Header / Progress */}
                                <div className="p-6 bg-white border-b border-slate-100 flex items-center justify-between relative z-10">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-100">
                                            <Brain size={20} />
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-bold text-slate-900 leading-tight">AI Reception Assistant</h3>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <div className="flex gap-0.5">
                                                    {[1, 2, 3].map((s) => (
                                                        <div
                                                            key={s}
                                                            className={cn("h-1 rounded-full transition-all duration-500",
                                                                (aiStep === "name" && s === 1) || (aiStep === "mobile" && s === 2) || (aiStep === "complaint" && s === 3) || aiStep === "confirm"
                                                                    ? "w-4 bg-indigo-600" : "w-2 bg-slate-200")}
                                                        />
                                                    ))}
                                                </div>
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                                    {dictionary[language].step} {aiStep === "name" ? "1" : aiStep === "mobile" ? "2" : "3"} {dictionary[language].of} 3
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => {
                                                if (isCameraEnabled) {
                                                    setIsCameraEnabled(false);
                                                    return;
                                                }
                                                setCameraPermissionBlocked(false);
                                                setIsCameraEnabled(true);
                                            }}
                                            className={cn("p-1.5 rounded-lg transition-all duration-300",
                                                isCameraEnabled ? "bg-indigo-50 text-indigo-600" : "bg-slate-100 text-slate-400")}
                                            title={isCameraEnabled ? "Disable Camera" : "Enable Camera"}
                                        >
                                            {isCameraEnabled ? <Camera size={18} /> : <CameraOff size={18} />}
                                        </button>
                                        <button
                                            onClick={() => setLanguage(language === "en" ? "hi" : "en")}
                                            className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-[10px] font-bold text-slate-600 transition uppercase tracking-widest"
                                        >
                                            {language === "en" ? "Hindi / हिंदी" : "English"}
                                        </button>
                                    </div>
                                </div>

                                {/* Dialogue Area */}
                                <div ref={scrollRef} className="flex-1 min-h-0 p-6 overflow-y-auto space-y-4 no-scrollbar">
                                    {messages.length === 0 && (
                                        <div className="h-full flex flex-col items-center justify-center text-center space-y-6">
                                            <div className="w-24 h-24 bg-indigo-50 rounded-full flex items-center justify-center relative">
                                                <Sparkles className="text-indigo-600 animate-pulse" size={36} />
                                                {!isCameraEnabled && (
                                                    <div className="absolute -inset-2 border-2 border-indigo-200 border-dashed rounded-full animate-[spin_10s_linear_infinite]" />
                                                )}
                                            </div>
                                            <div className="space-y-2">
                                                <p className="text-slate-600 text-lg font-bold">
                                                    {isCameraEnabled ? "Stand in front to begin" : `Welcome to ${toTitleCase(clinicName)}`}
                                                </p>
                                                {!isCameraEnabled && (
                                                    <button
                                                        onClick={() => handleAiArrival()}
                                                        className="mt-4 px-10 py-5 bg-indigo-600 text-white rounded-2xl text-lg font-black uppercase tracking-[0.14em] shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition active:scale-95 flex items-center gap-3 group"
                                                    >
                                                        <Play size={20} className="fill-white" />
                                                        START CHECK-IN
                                                    </button>
                                                )}
                                            </div>
                                            {isCameraEnabled && (
                                                <p className="text-slate-400 text-sm font-medium max-w-[200px]">
                                                    Vision auto-detection is active
                                                </p>
                                            )}
                                        </div>
                                    )}
                                    {messages.map((msg, i) => (
                                        <div
                                            key={i}
                                            className={cn("flex w-full animate-in fade-in slide-in-from-bottom-2 duration-500",
                                                msg.role === 'ai' ? "justify-start" : "justify-end")}
                                        >
                                            <div className={cn("max-w-[85%] p-4 rounded-2xl text-lg font-medium shadow-sm relative",
                                                msg.role === 'ai'
                                                    ? "bg-white text-slate-800 rounded-tl-none border border-slate-100"
                                                    : "bg-indigo-600 text-white rounded-tr-none shadow-indigo-100")}
                                            >
                                                {msg.content}
                                                {msg.role === 'ai' && smsStatus === 'success' && i === messages.length - 1 && (
                                                    <div className="absolute -top-2 -right-2 bg-white rounded-full shadow-md animate-in zoom-in duration-500">
                                                        <CheckCircle2 size={20} className="text-emerald-500 fill-emerald-50" />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                    {/* Mic / AI Status Bar */}
                                    {aiStep !== "idle" && (
                                        <div className={`flex justify-start`}>
                                            <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl rounded-tl-none text-sm font-bold transition-all duration-300 ${aiStatus === "listening"
                                                ? "bg-red-50 text-red-600 border border-red-100"
                                                : aiStatus === "arming"
                                                    ? "bg-blue-50 text-blue-600 border border-blue-100"
                                                    : aiStatus === "processing"
                                                        ? "bg-amber-50 text-amber-600 border border-amber-100"
                                                        : "bg-indigo-50 text-indigo-600 border border-indigo-100"
                                                }`}>
                                                {aiStatus === "listening" ? (
                                                    <>
                                                        <div className="relative flex items-center justify-center w-5 h-5">
                                                            <Mic size={16} className="text-red-500 z-10" />
                                                            <span className="absolute inset-0 rounded-full bg-red-400 opacity-30 animate-ping" />
                                                        </div>
                                                        <span className="uppercase tracking-widest text-[10px]">{dictionary[language].listening}</span>
                                                    </>
                                                ) : aiStatus === "arming" ? (
                                                    <>
                                                        <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                                                        <span className="uppercase tracking-widest text-[10px]">{dictionary[language].startingMic}</span>
                                                    </>
                                                ) : aiStatus === "processing" ? (
                                                    <>
                                                        <div className="w-4 h-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                                                        <span className="uppercase tracking-widest text-[10px]">{dictionary[language].processing}</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <div className="flex gap-0.5 items-end h-4">
                                                            {[1, 2, 3, 4].map(b => (
                                                                <span key={b} className={`w-0.5 bg-indigo-500 rounded-full animate-bounce`}
                                                                    style={{ height: `${6 + b * 2}px`, animationDelay: `${b * 0.1}s` }} />
                                                            ))}
                                                        </div>
                                                        <span className="uppercase tracking-widest text-[10px]">{dictionary[language].responding}</span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {interimSpeech && (
                                        <div className="flex justify-end animate-pulse">
                                            <div className="max-w-[85%] p-3 rounded-2xl rounded-tr-none bg-indigo-50 text-indigo-400 text-sm font-medium border border-indigo-100 italic">
                                                "{interimSpeech}..."
                                            </div>
                                        </div>
                                    )}
                                    <div ref={bottomAnchorRef} id="anchor" className="h-2" />
                                </div>

                                {/* Input / Controls */}
                                <div className="p-6 bg-white border-t border-slate-100 space-y-4">
                                    {inputMode === "text" ? (
                                        <div className="relative group">
                                            <input
                                                autoFocus
                                                value={speechResult}
                                                onChange={(e) => setSpeechResult(e.target.value)}
                                                onKeyDown={(e) => e.key === 'Enter' && speechResult.trim() && handleSpeechResult(speechResult)}
                                                placeholder="Type your response..."
                                                className="w-full pl-6 pr-16 py-5 bg-slate-50 border-2 border-slate-100 rounded-2xl text-xl font-bold focus:border-indigo-600 focus:bg-white transition-all outline-none"
                                            />
                                            <button
                                                onClick={() => speechResult.trim() && handleSpeechResult(speechResult)}
                                                className="absolute right-3 top-2.5 h-12 w-12 bg-indigo-600 rounded-xl flex items-center justify-center text-white hover:bg-indigo-700 transition shadow-lg shadow-indigo-100"
                                            >
                                                <ArrowRight size={20} />
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center gap-4">
                                            {(aiStep === "data_confirm" || aiStep === "sms_verify") && (
                                                <div className="flex gap-4 mb-2 animate-in fade-in slide-in-from-bottom-2 duration-500">
                                                    <button
                                                        onClick={() => handleSpeechResult("yes")}
                                                        className="px-10 py-5 bg-emerald-600 text-white rounded-2xl text-xl font-black uppercase tracking-[0.1em] shadow-xl shadow-emerald-100 flex items-center gap-3 hover:bg-emerald-700 transition active:scale-95"
                                                    >
                                                        <CheckCircle2 size={24} /> YES
                                                    </button>
                                                    <button
                                                        onClick={() => handleSpeechResult("no")}
                                                        className="px-10 py-5 bg-rose-600 text-white rounded-2xl text-xl font-black uppercase tracking-[0.1em] shadow-xl shadow-rose-100 flex items-center gap-3 hover:bg-rose-700 transition active:scale-95"
                                                    >
                                                        <X size={24} /> NO
                                                    </button>
                                                </div>
                                            )}

                                            <button
                                                onClick={() => aiStep === "idle" ? handleAiArrival() : startListening()}
                                                className={cn("w-24 h-24 rounded-full flex items-center justify-center transition-all duration-500 shadow-2xl relative group",
                                                    aiStatus === "listening"
                                                        ? "bg-rose-500 shadow-rose-100 scale-110"
                                                        : aiStatus === "arming"
                                                            ? "bg-blue-600 shadow-blue-100"
                                                            : "bg-indigo-600 shadow-indigo-100")}
                                            >
                                                {aiStatus === "listening" ? (
                                                    <div className="absolute inset-0 rounded-full bg-rose-500 animate-ping opacity-25" />
                                                ) : aiStatus === "arming" ? (
                                                    <div className="absolute inset-0 rounded-full bg-blue-500 animate-pulse opacity-25" />
                                                ) : (
                                                    <div className="absolute inset-0 rounded-full bg-indigo-600 scale-90 blur-xl opacity-0 group-hover:opacity-40 transition-opacity" />
                                                )}
                                                {aiStatus === "listening" ? <Mic size={40} className="text-white relative z-10" /> : <Mic size={40} className="text-white relative z-10" />}
                                                <div className="absolute -bottom-8 whitespace-nowrap text-xs font-black uppercase tracking-widest text-slate-400 group-hover:text-indigo-600 transition">
                                                    {aiStatus === "listening" ? dictionary[language].listening : aiStatus === "arming" ? dictionary[language].startingMic : dictionary[language].speak}
                                                </div>
                                            </button>
                                            <div className="h-12" />
                                            <p className="text-xs font-semibold text-slate-500 text-center">
                                                {aiStatus === "listening"
                                                    ? "Listening now. Please speak clearly."
                                                    : aiStatus === "arming"
                                                        ? "Microphone is starting. Please wait for Listening..."
                                                        : aiStatus === "processing"
                                                            ? "Got it. Processing your response..."
                                                            : aiStep === "idle"
                                                                ? "Tap mic to start check-in."
                                                                : "Tap mic, wait for Listening..., then speak."}
                                            </p>
                                            <button
                                                type="button"
                                                onClick={() => startListening(100)}
                                                className="text-[10px] font-black uppercase tracking-widest text-indigo-600 hover:text-indigo-700"
                                            >
                                                Retry Listening
                                            </button>
                                        </div>
                                    )}

                                    <div className="flex items-center justify-between pt-2">
                                        <button
                                            onClick={() => setInputMode(inputMode === "voice" ? "text" : "voice")}
                                            className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-indigo-600 transition flex items-center gap-2"
                                        >
                                            {inputMode === "voice" ? <Search size={14} /> : <Mic size={14} />}
                                            {inputMode === "voice" ? dictionary[language].type : "Voice Mode"}
                                        </button>

                                        <div className="flex items-center gap-4">
                                            <div className={cn("flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest transition-colors duration-300",
                                                isCameraEnabled ? "text-indigo-600" : "text-slate-300")}>
                                                {isCameraEnabled ? <Camera size={12} /> : <CameraOff size={12} />}
                                                {isCameraEnabled ? dictionary[language].visionActive : "Vision Off"}
                                            </div>
                                            {cameraPermissionBlocked && (
                                                <div className="text-[10px] font-bold uppercase tracking-widest text-rose-500">
                                                    Camera blocked
                                                </div>
                                            )}
                                            <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-300 uppercase tracking-widest">
                                                <Volume2 size={12} /> {dictionary[language].voiceActive}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Hidden Sensors */}
                                <video ref={videoRef} className="hidden" muted playsInline />
                                <canvas ref={canvasRef} width={320} height={240} className="hidden" />
                            </div>
                        ) : (
                            <div className="medical-card p-6 space-y-4">
                                <h2 className="text-lg font-semibold text-slate-900">Patient Check-in</h2>
                                <div className="space-y-3 relative">
                                    {lastCheckedIn && (
                                        <div className="absolute inset-0 z-20 bg-emerald-500 rounded-2xl flex flex-col items-center justify-center text-white text-center p-6 animate-in fade-in zoom-in duration-300">
                                            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mb-4">
                                                <Image src="/logo.png" alt="Success" width={32} height={32} className="brightness-200" />
                                            </div>
                                            <h3 className="text-2xl font-black uppercase tracking-tighter">Check-in Successful!</h3>
                                            <div className="mt-4 space-y-1 relative">
                                                <p className="text-xs font-bold uppercase tracking-widest text-emerald-100">Your Token</p>
                                                <p className="text-6xl font-black leading-none">{lastCheckedIn.tokenNumber}</p>
                                                {smsStatus === 'success' && (
                                                    <div className="absolute -top-4 -right-8 flex items-center gap-1.5 px-3 py-1 bg-white/20 backdrop-blur-md rounded-full border border-white/30 animate-in fade-in slide-in-from-right-2">
                                                        <CheckCircle2 size={12} className="text-emerald-100" />
                                                        <span className="text-[10px] font-bold uppercase tracking-widest text-white">SMS Sent</span>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="mt-6 grid grid-cols-2 gap-4 w-full">
                                                <div className="bg-white/10 rounded-xl p-3 border border-white/5 backdrop-blur-sm">
                                                    <p className="text-[10px] font-bold uppercase text-emerald-100 tracking-widest">Queue Position</p>
                                                    <p className="text-2xl font-black">#{todayQueue.findIndex(p => p.id === lastCheckedIn.id) + 1}</p>
                                                </div>
                                                <div className="bg-white/10 rounded-xl p-3 border border-white/5 backdrop-blur-sm">
                                                    <p className="text-[10px] font-bold uppercase text-emerald-100 tracking-widest">AI Estimated Wait</p>
                                                    <p className="text-2xl font-black">~{Math.max(5, todayQueue.findIndex(p => p.id === lastCheckedIn.id) * 10)}<span className="text-xs font-normal ml-1">min</span></p>
                                                </div>
                                            </div>
                                            <p className="mt-6 text-sm font-medium text-emerald-50 italic">
                                                {aiMessage || "Please take a seat. We will call you shortly."}
                                            </p>
                                            <button
                                                onClick={() => setLastCheckedIn(null)}
                                                className="mt-6 text-xs font-bold uppercase tracking-widest bg-white/20 hover:bg-white/30 px-4 py-2 rounded-full transition"
                                            >
                                                Back to Form
                                            </button>
                                        </div>
                                    )}
                                    {doctors.length > 0 ? (
                                        <div className={cn("grid gap-3", kioskBoundDoctorId ? "grid-cols-1" : "grid-cols-2")}>
                                            {doctors.filter((d) => d.active).filter(d => !kioskBoundDoctorId || d.id === kioskBoundDoctorId).map((doctor) => {
                                                const isSelected = selectedDoctorId === doctor.id;
                                                const status = normalizeDoctorStatus(doctor);
                                                const statusMeta = DOCTOR_STATUS_META[status];
                                                return (
                                                    <button
                                                        key={doctor.id}
                                                        type="button"
                                                        onClick={() => !kioskBoundDoctorId && setSelectedDoctorId(doctor.id)}
                                                        disabled={isOverlayActive}
                                                        className={cn(
                                                            "flex items-center gap-4 rounded-2xl border p-4 text-left transition relative overflow-hidden",
                                                            isSelected
                                                                ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                                                                : "border-slate-200 bg-white hover:border-slate-300",
                                                            status !== "AVAILABLE" && "opacity-90",
                                                            kioskBoundDoctorId && "cursor-default"
                                                        )}
                                                    >
                                                        <div className="w-14 h-14 rounded-2xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center shadow-sm">
                                                            {doctor.photoUrl ? (
                                                                <Image src={doctor.photoUrl} alt={doctor.name || "Doctor"} width={56} height={56} className="object-cover" />
                                                            ) : (
                                                                <div className="w-full h-full flex items-center justify-center text-slate-400 bg-slate-50 font-black text-xl">
                                                                    {doctor.name.charAt(0)}
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="flex-1">
                                                            <div className="flex items-center justify-between">
                                                                <p className="text-sm font-bold text-slate-900 line-clamp-1">{doctor.name || "Doctor"}</p>
                                                                {isSelected && <CheckCircle2 size={16} className="text-primary" />}
                                                            </div>
                                                            <div className="mt-1">
                                                                <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-wider", statusMeta.className)}>
                                                                    {statusMeta.label}
                                                                </span>
                                                            </div>
                                                            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mt-0.5">Queue Prefix: {doctor.prefix || "A"}</p>
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <div className="text-xs text-slate-500">
                                            Add doctors in Doctor Settings to enable doctor-specific check-ins.
                                        </div>
                                    )}
                                    <input
                                        value={form.name}
                                        onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                                        placeholder="Patient name"
                                        disabled={isOverlayActive}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl disabled:opacity-60 disabled:cursor-not-allowed"
                                    />
                                    <input
                                        value={form.mobile}
                                        onChange={(e) => setForm((prev) => ({ ...prev, mobile: e.target.value }))}
                                        placeholder="Mobile number"
                                        inputMode="numeric"
                                        pattern="[0-9]*"
                                        maxLength={10}
                                        disabled={isOverlayActive}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl disabled:opacity-60 disabled:cursor-not-allowed"
                                    />
                                    <textarea
                                        value={form.symptoms}
                                        onChange={(e) => setForm((prev) => ({ ...prev, symptoms: e.target.value }))}
                                        placeholder="Symptoms / Complaints (Optional)"
                                        disabled={isOverlayActive}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl disabled:opacity-60 disabled:cursor-not-allowed resize-none h-20"
                                    />
                                    <button
                                        onClick={handleCheckIn}
                                        disabled={
                                            submitting ||
                                            isOverlayActive ||
                                            (doctors.length > 0 && !selectedDoctorId)
                                        }
                                        className="btn-primary w-full flex items-center justify-center gap-2"
                                    >
                                        {submitting ? "Checking in..." : "Check In"}
                                        <ArrowRight size={18} />
                                    </button>
                                </div>
                                <div className="text-xs text-slate-500">
                                    Full Screen Lock Mode hides browser UI and reduces accidental navigation.
                                </div>
                            </div>
                        )}

                        <div className="medical-card p-6 flex flex-col">
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">Clinic Queue</h2>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Live Updates · AWS Bedrock</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-2xl font-black text-primary leading-none">~{Math.max(5, todayQueue.length * 8)}<span className="text-[10px] ml-0.5">MIN</span></p>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Est. Wait Time</p>
                                </div>
                            </div>

                            {todayQueue.length === 0 ? (
                                <div className="flex-1 flex flex-col items-center justify-center text-center p-12 bg-slate-50/50 rounded-2xl border-2 border-dashed border-slate-100">
                                    <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm mb-3">
                                        <UserCheck className="text-slate-300" size={20} />
                                    </div>
                                    <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">No patients waiting</p>
                                </div>
                            ) : (
                                <div className="space-y-3 flex-1 overflow-y-auto pr-2 no-scrollbar">
                                    {todayQueue.map((patient, idx) => (
                                        <div
                                            key={patient.id}
                                            className={cn("flex items-center justify-between rounded-2xl border p-4 transition-all duration-300",
                                                patient.status === "in_progress"
                                                    ? "border-primary bg-primary/5 shadow-lg shadow-primary/5 ring-1 ring-primary/20"
                                                    : "border-slate-100 bg-white hover:border-slate-200")}
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className={cn("w-14 h-14 rounded-2xl flex flex-col items-center justify-center font-black",
                                                    patient.status === "in_progress" ? "bg-primary text-white" : "bg-slate-100 text-slate-700")}>
                                                    <span className="text-[10px] opacity-60 leading-none mb-1">TOKEN</span>
                                                    <span className="text-xl leading-none">{patient.tokenNumber || "--"}</span>
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-900 text-lg leading-tight">
                                                        {patient.name || "Walk-in"}
                                                    </p>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <span className={cn("text-[10px] font-black uppercase tracking-widest",
                                                            patient.status === "in_progress" ? "text-primary" : "text-slate-400")}>
                                                            {patient.status === "in_progress" ? "Now Consulting" : `Position #${idx + 1}`}
                                                        </span>
                                                        {patient.status !== "in_progress" && (
                                                            <>
                                                                <span className="w-1 h-1 bg-slate-200 rounded-full" />
                                                                <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest">
                                                                    ~{idx * 8} min
                                                                </span>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex flex-col items-end gap-2">
                                                <span className={cn("text-[9px] font-black uppercase px-2 py-0.5 rounded-md tracking-tighter",
                                                    getVisitType(patient) === "E" ? "bg-rose-100 text-rose-700" :
                                                        getVisitType(patient) === "A" ? "bg-indigo-100 text-indigo-700" :
                                                            "bg-slate-100 text-slate-500")}>
                                                    {getVisitType(patient) === "E" ? "Emergency" : getVisitType(patient) === "A" ? "Appointment" : "Walk-in"}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="mt-6 pt-6 border-t border-slate-100">
                                <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                    <span>Powered by Vizzi AI</span>
                                    <span>Secure Connection</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Doctor Selection Launcher (for Multi-Doctor Clinics) */}
                {!kioskBoundDoctorId && doctors.length > 1 && doctorsLoaded && (
                    <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-xl z-[150] flex flex-col items-center justify-center p-6 sm:p-12 overflow-y-auto">
                        <div className="max-w-4xl w-full space-y-12 py-12">
                            <div className="text-center space-y-4">
                                <div className="inline-flex p-4 bg-indigo-500/10 rounded-2xl border border-indigo-500/20 text-indigo-400 mb-2">
                                    <Users size={40} />
                                </div>
                                <h2 className="text-5xl font-black text-white tracking-tight uppercase">Select Kiosk Doctor</h2>
                                <p className="text-indigo-200/60 font-medium text-lg">Choose which doctor's queue this kiosk will manage.</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {doctors.filter(d => d.active).length > 0 ? (
                                    doctors.filter(d => d.active).map(doctor => {
                                        const status = normalizeDoctorStatus(doctor);
                                        const statusMeta = DOCTOR_STATUS_META[status];
                                        const selectable = status === "AVAILABLE";
                                        return (
                                            <button
                                                key={doctor.id}
                                                onClick={() => selectable && setKioskBoundDoctorId(doctor.id)}
                                                disabled={!selectable}
                                                className={cn(
                                                    "group relative border rounded-[3rem] p-10 transition-all duration-500 text-left",
                                                    selectable
                                                        ? "bg-white/5 hover:bg-white/10 border-white/10 hover:border-indigo-500/50 hover:scale-[1.02] hover:shadow-2xl hover:shadow-indigo-500/10"
                                                        : "bg-white/[0.03] border-white/10 opacity-80 cursor-not-allowed"
                                                )}
                                            >
                                                <div className="flex flex-col items-center gap-6">
                                                    <div className="w-28 h-28 rounded-[2.5rem] bg-slate-800 border-2 border-white/10 overflow-hidden group-hover:border-indigo-500/50 transition-colors shadow-xl">
                                                        {doctor.photoUrl ? (
                                                            <Image src={doctor.photoUrl} alt={doctor.name || "Doctor"} width={112} height={112} className="object-cover" />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center text-slate-500 bg-slate-800 uppercase font-black text-4xl">
                                                                {doctor.name ? doctor.name.charAt(0) : "D"}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="text-center space-y-1">
                                                        <h3 className="text-2xl font-black text-white group-hover:text-indigo-300 transition-colors line-clamp-1">{doctor.name}</h3>
                                                        <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-wider", statusMeta.className)}>
                                                            {statusMeta.label}
                                                        </span>
                                                        <p className="text-indigo-200/40 text-[10px] font-black uppercase tracking-[0.2em]">TOKEN PREFIX: {doctor.prefix}</p>
                                                    </div>
                                                    <div className="w-full pt-6 border-t border-white/5 flex items-center justify-center">
                                                        <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400 group-hover:text-indigo-300 transition-colors flex items-center gap-2">
                                                            {selectable ? "Launch Kiosk" : "Unavailable"} <ArrowRight size={14} />
                                                        </span>
                                                    </div>
                                                </div>
                                            </button>
                                        )
                                    })
                                ) : (
                                    <div className="col-span-full py-12 text-center bg-white/5 rounded-[3rem] border-2 border-dashed border-white/10">
                                        <div className="w-16 h-16 bg-amber-500/20 rounded-2xl flex items-center justify-center mx-auto text-amber-500 mb-4">
                                            <AlertTriangle size={32} />
                                        </div>
                                        <p className="text-white font-bold text-xl uppercase tracking-tight">No Active Doctors</p>
                                        <p className="text-slate-400 mt-2">Please activate doctors in Clinic Settings to proceed.</p>
                                    </div>
                                )}
                            </div>

                            <div className="text-center pt-8">
                                <Link href="/dashboard" className="text-white/40 hover:text-white/60 text-[10px] font-black uppercase tracking-[0.3em] transition-colors">
                                    Back to Dashboard
                                </Link>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}





