"use client";

import { db, collection, doc, getDoc, getDocs, setDoc, updateDoc, addDoc, deleteDoc, onSnapshot, query, where, orderBy, limit, writeBatch, uploadToStorage } from "@/lib/db";
import { getLocalSession, setLocalSession } from "@/lib/authSession";
import { generateClient } from "aws-amplify/api";
import { configureAmplify } from "@/lib/amplify";

configureAmplify();
const gqlClient = generateClient();

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useSearchParams } from "next/navigation";
import { twMerge } from "tailwind-merge";
import { clsx, type ClassValue } from "clsx";

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}
import {
    Save,
    Upload,
    Image as ImageIcon,
    CheckCircle2,
    Volume2,
    VolumeX,
    MessageSquare,
    LifeBuoy,
    Clock,
    Shield,
    Gauge,
    Bluetooth,
    Cable,
    Trash2,
    Plus,
    Users,
    Settings,
    Activity,
    Building2,
    LayoutDashboard,
    Sparkles,
    Send,
    Cpu,
    Database,
    X,
    Mail,
    Smartphone,
    User,
    KeyRound,
    AlertTriangle
} from "lucide-react";
import Image from "next/image";
import {
    getDefaultCallNextTemplateForLang,
    getDefaultCheckInTemplateForLang,
    normalizeVoiceTemplates,
    buildVoiceAnnouncement,
} from "@/lib/voiceTemplates";

const DEFAULT_SETTINGS = {
    clinicName: "",
    name: "",
    doctorName: "",
    address: "",
    city: "",
    timezone: "Asia/Kolkata",
    phone: "",
    email: "",
    clinicType: "General Practice",
    startTime: "09:00",
    endTime: "17:00",
    breakStartTime: "13:00",
    breakEndTime: "14:00",
    tokenPrefix: "A",
    tokenDigits: 2,
    tokenResetTime: "Daily",
    queueType: "Doctor-wise Queue",
    aiEnabled: true,
    voiceEnabled: true,
    voiceVolume: 100,
    voiceLanguage: "en-IN",
    voiceRate: 0.8,
    voicePitch: 1,
    voiceGender: "female",
    voiceName: "",
    announcementTemplate: getDefaultCallNextTemplateForLang("en-IN"),
    clinicLogoUri: "",
    doctorPhotoUri: "",
    smsClinicName: "",
    smsEnabled: true,
    currentPlan: "FREE",
    patientsUsed: 0,
    patientsLimit: 300,
    smsUsed: 0,
    smsLimit: 50,
    whatsappUsed: 0,
    whatsappLimit: 0,
    planExpiryDate: 0,
    signupDate: 0,
    demoStartedAt: 0,
    status: "OPEN",
    voiceEngine: "browser", // "browser" or "polly"
    checkInAnnouncementTemplate: getDefaultCheckInTemplateForLang("en-IN"),
};

const resolveBranding = (data: Record<string, any>) => {
    return {
        clinicLogoUri: data?.clinicLogoUri || data?.clinicLogoUrl || data?.logoUrl || data?.logoUri || data?.branding?.clinicLogoUrl || "",
        doctorPhotoUri: data?.doctorPhotoUri || data?.doctorPhotoUrl || data?.photoUrl || data?.photoUri || data?.branding?.doctorPhotoUri || ""
    };
};

export default function SettingsPage() {
    const { user } = useAuth();
    const searchParams = useSearchParams();
    const [settings, setSettings] = useState(DEFAULT_SETTINGS);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState(false);
    const [syncWarning, setSyncWarning] = useState("");
    const [smsClinicNameError, setSmsClinicNameError] = useState<string>("");
    const [voiceSupport, setVoiceSupport] = useState<"unknown" | "available" | "missing">("unknown");
    const [availableVoices, setAvailableVoices] = useState<{ name: string; lang: string }[]>([]);
    const defaultVoiceSettings = { rate: 0.8, pitch: 1, volume: 100 };
    const isDefaultVoice =
        Number(settings.voiceRate) === defaultVoiceSettings.rate &&
        Number(settings.voicePitch) === defaultVoiceSettings.pitch &&
        Number(settings.voiceVolume) === defaultVoiceSettings.volume;
    const [lastSavedSettings, setLastSavedSettings] = useState("");
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [doctors, setDoctors] = useState<Array<{
        id: string;
        name: string;
        specialization: string;
        prefix: string;
        status?: string;
        active: boolean;
        photoUrl?: string
    }>>([]);
    const [doctorsLoaded, setDoctorsLoaded] = useState(false);
    const [newDoctor, setNewDoctor] = useState({
        name: "",
        specialization: "General",
        slotDuration: 10,
        startTime: "09:00",
        endTime: "17:00",
        breakStart: "13:00",
        breakEnd: "14:00",
        prefix: "A",
        active: true,
        photoUrl: ""
    });
    const [doctorSaving, setDoctorSaving] = useState(false);
    const [showAddDoctorModal, setShowAddDoctorModal] = useState(false);
    const [isConfirmingDisable, setIsConfirmingDisable] = useState(false);
    const [prefixError, setPrefixError] = useState("");
    const [isDemoLoading, setIsDemoLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<"clinic" | "doctors" | "tokens" | "voice" | "branding" | "ai" | "account">("clinic");

    // Account management states
    const [accountSettings, setAccountSettings] = useState({
        newEmail: "",
        newMobile: "",
        currentPassword: "",
        emailOtp: "",
        mobileOtp: ""
    });
    const [accountLoading, setAccountLoading] = useState(false);
    const [accountSuccess, setAccountSuccess] = useState("");
    const [accountError, setAccountError] = useState("");
    const [showEmailVerification, setShowEmailVerification] = useState(false);
    const [showMobileVerification, setShowMobileVerification] = useState(false);

    const tabs = [
        { id: "clinic", label: "Clinic", icon: Building2 },
        { id: "doctors", label: "Doctors", icon: Users },
        { id: "tokens", label: "Messaging", icon: MessageSquare },
        { id: "voice", label: "Voice", icon: Volume2 },
        { id: "branding", label: "Branding", icon: ImageIcon },
        { id: "ai", label: "AI Engine", icon: Sparkles },
        { id: "account", label: "Account", icon: User },
    ];

    useEffect(() => {
        const requestedTab = searchParams.get("tab");
        const openAddDoctor = searchParams.get("openAddDoctor");
        const validTabs = new Set(["clinic", "doctors", "tokens", "voice", "branding", "ai", "account"]);

        if (requestedTab && validTabs.has(requestedTab)) {
            setActiveTab(requestedTab as "clinic" | "doctors" | "tokens" | "voice" | "branding" | "ai" | "account");
        }
        if (requestedTab === "doctors" && openAddDoctor === "1") {
            setShowAddDoctorModal(true);
        }
    }, [searchParams]);

    const handleLanguageChange = (lang: string) => {
        setSettings(prev => ({
            ...prev,
            voiceLanguage: lang,
            announcementTemplate: getDefaultCallNextTemplateForLang(lang),
            checkInAnnouncementTemplate: getDefaultCheckInTemplateForLang(lang),
        }));
    };

    const maxDoctors = useMemo(() => {
        const plan = settings.currentPlan?.toUpperCase() || "FREE";
        if (plan === "ELITE") return 999;
        if (plan === "PRO") return 10;
        if (plan === "GROWTH") return 5;
        if (plan === "STARTER") return 3;
        return 3; // Free/Trial
    }, [settings.currentPlan]);

    const isPaidPlan = settings.currentPlan !== "FREE";

    useEffect(() => {
        if (!settings.voiceLanguage) return;
        const nextAnnouncement = getDefaultCallNextTemplateForLang(settings.voiceLanguage);
        const nextCheckIn = getDefaultCheckInTemplateForLang(settings.voiceLanguage);
        setSettings((prev) => ({
            ...prev,
            announcementTemplate: nextAnnouncement,
            checkInAnnouncementTemplate: nextCheckIn,
        }));
    }, [settings.voiceLanguage]);

    useEffect(() => {
        if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
        const checkVoices = () => {
            const voices = window.speechSynthesis.getVoices();
            setAvailableVoices(voices.map((voice) => ({ name: voice.name, lang: voice.lang })));
            if (!voices.length) {
                setVoiceSupport("unknown");
                return;
            }
            const lang = (settings.voiceLanguage || "en-IN").replace("_", "-").toLowerCase();
            const match = voices.some((voice) =>
                voice.lang?.toLowerCase().replace(/[-_]/g, "").startsWith(lang.replace(/[-_]/g, ""))
            );
            setVoiceSupport(match ? "available" : "missing");
        };
        checkVoices();
        window.speechSynthesis.onvoiceschanged = () => checkVoices();
        return () => {
            window.speechSynthesis.onvoiceschanged = null;
        };
    }, [settings.voiceLanguage]);

    const handleTestVoice = async (customText?: string) => {
        if (!settings.voiceEnabled) return;

        const rawLang = settings.voiceLanguage || "en-IN";
        const lang = (rawLang).replace("_", "-");
        const template = settings.announcementTemplate || "Welcome {name}. your token number is {token}";

        const sampleText = customText || buildVoiceAnnouncement(template, {
            name: "Rahul",
            token: "A", clinic: settings.clinicName || settings.name || "Vizzi AI",
            doctor: "Dr. Sharma"
        });

        // Polly Engine Support
        if (settings.voiceEngine === "polly") {
            try {
                const response = await fetch("/api/polly", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        text: sampleText,
                        voiceId: settings.voiceGender === "male" ? "Kajal" : "Aditi"
                    }),
                });

                if (response.ok) {
                    const blob = await response.blob();
                    const url = URL.createObjectURL(blob);
                    const audio = new Audio(url);
                    await audio.play();
                    return;
                }
            } catch (error) {
                console.error("Polly test error, falling back:", error);
            }
        }

        // Browser Fallback (Sync with Kiosk logic)
        if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

        const utterance = new SpeechSynthesisUtterance(sampleText);
        utterance.rate = Number(settings.voiceRate) || 0.8;
        utterance.pitch = Number(settings.voicePitch) || 1;
        utterance.lang = lang;
        utterance.volume = Math.max(0, Math.min(1, (settings.voiceVolume || 100) / 100));

        if (settings.voiceName) {
            const voice = window.speechSynthesis.getVoices().find((v) => v.name === settings.voiceName);
            if (voice) utterance.voice = voice;
        } else {
            // Use same pickVoice logic (Kiosk uses it)
            const voices = window.speechSynthesis.getVoices();
            if (voices.length > 0) {
                const matchKey = lang.toLowerCase().replace(/[-_]/g, "");
                const matching = voices.filter((v) => v.lang.toLowerCase().replace(/[-_]/g, "").startsWith(matchKey));
                const candidates = matching.length ? matching : voices.filter(v => v.lang.toLowerCase().startsWith("en"));
                const preferredGender = settings.voiceGender || "female";
                const genderMatch = preferredGender === "male"
                    ? candidates.find(v => /male|man|david|mark|rahul|ravi/i.test(v.name))
                    : candidates.find(v => /female|woman|zira|susan|samantha|zoe|hindi|india|neerja|heera|kavya/i.test(v.name));
                utterance.voice = genderMatch || candidates[0];
            }
        }

        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utterance);
    };

    useEffect(() => {
        if (!user) return;
        const clinicRef = doc(db, "clinics", user.userId);
        const unsubscribe = onSnapshot(clinicRef, (snapshot) => {
            const data = snapshot.data() as any;
            if (data) {
                const rawSignupDate = Number(data?.signupDate || 0);
                if (!rawSignupDate) {
                    const now = Date.now();
                    void setDoc(clinicRef, { signupDate: now }, { merge: true });
                    data.signupDate = now;
                }
                const parseDate = (d: any) => {
                    if (!d) return 0;
                    const parsed = typeof d === "string" ? Date.parse(d) : Number(d);
                    return isNaN(parsed) ? 0 : parsed;
                };
                setSettings((prev) => {
                    const branding = resolveBranding(data || {});
                    const nextAnnouncement = data.announcementTemplate || prev.announcementTemplate;
                    const nextCheckIn = data.checkInAnnouncementTemplate || prev.checkInAnnouncementTemplate;
                    const normalizedTemplates = normalizeVoiceTemplates(
                        data.voiceLanguage || prev.voiceLanguage || "en-IN",
                        nextAnnouncement,
                        nextCheckIn
                    );

                    const nextSettings = {
                        ...prev,
                        ...data,
                        clinicName: data.clinicName || data.name || prev.clinicName || "",
                        name: data.clinicName || data.name || prev.clinicName || "", // Sync both
                        address: data.address || prev.address || "",
                        city: data.city || prev.city || "",
                        timezone: data.timezone || prev.timezone || "Asia/Kolkata",
                        phone: data.phone || prev.phone || "",
                        email: data.email || prev.email || "",
                        clinicLogoUri: branding.clinicLogoUri || prev.clinicLogoUri || "",
                        doctorPhotoUri: branding.doctorPhotoUri || prev.doctorPhotoUri || "",
                        tokenDigits: Number(data.tokenDigits ?? prev.tokenDigits ?? 2),
                        voiceVolume: Number(data.voiceVolume ?? prev.voiceVolume ?? 100),
                        voiceLanguage: (data.voiceLanguage || prev.voiceLanguage || "en-IN").replace("_", "-"),
                        voiceName: data.voiceName || prev.voiceName || "",
                        voiceRate: Number(data.voiceRate ?? prev.voiceRate ?? 0.8),
                        voicePitch: Number(data.voicePitch ?? prev.voicePitch ?? 1),
                        voiceGender: data.voiceGender || prev.voiceGender || "female",
                        announcementTemplate: normalizedTemplates.announcementTemplate || "",
                        checkInAnnouncementTemplate: normalizedTemplates.checkInAnnouncementTemplate || "",
                        patientsUsed: Number(data.patientsUsed ?? prev.patientsUsed ?? 0),
                        patientsLimit: Number(data.patientsLimit ?? prev.patientsLimit ?? 300),
                        smsUsed: Number(data.smsUsed ?? prev.smsUsed ?? 0),
                        smsLimit: Number(data.smsLimit ?? prev.smsLimit ?? 50),
                        whatsappUsed: Number(data.whatsappUsed ?? prev.whatsappUsed ?? 0),
                        whatsappLimit: Number(data.whatsappLimit ?? prev.whatsappLimit ?? 0),
                        planExpiryDate: parseDate(data.planExpiryDate),
                        signupDate: parseDate(data.signupDate),
                        demoStartedAt: parseDate(data.demoStartedAt),
                        status: data.status || prev.status || "OPEN",
                        tokenResetTime: data.tokenResetTime || prev.tokenResetTime || "Daily",
                        queueType: data.queueType || prev.queueType || "Doctor-wise Queue",
                        aiEnabled: data.aiEnabled ?? prev.aiEnabled ?? true,
                        smsClinicName: data.smsClinicName || prev.smsClinicName || "",
                        startTime: data.startTime || prev.startTime || "09:00",
                        endTime: data.endTime || prev.endTime || "17:00",
                        breakStartTime: data.breakStartTime || prev.breakStartTime || "13:00",
                        breakEndTime: data.breakEndTime || prev.breakEndTime || "14:00",
                    };
                    setLastSavedSettings(JSON.stringify(nextSettings));
                    setHasUnsavedChanges(false);
                    return nextSettings;
                });
            } else {
                // Clinic record doesn't exist in Firebase/AppSync - initialize it
                const now = Date.now();
                const initialClinic = {
                    id: user.userId,
                    name: user.username || "My Clinic",
                    clinicName: user.username || "My Clinic",
                    signupDate: now,
                    currentPlan: "FREE",
                    patientsLimit: 300,
                    smsLimit: 50,
                    status: "OPEN",
                };
                void setDoc(clinicRef, initialClinic, { merge: false });
            }
            setLoading(false);
        });
        return () => unsubscribe();
    }, [user]);

    useEffect(() => {
        if (!user) return;
        const doctorsRef = collection(db, "clinics", user.userId, "doctors");
        const q = query(doctorsRef, orderBy("name", "asc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const items = snapshot.docs.map((docSnap: any) => {
                const data = docSnap.data() as any;
                return {
                    id: docSnap.id,
                    name: data.name || "",
                    specialization: data.specialization || "General",
                    slotDuration: Number(data.slotDuration || 10),
                    startTime: data.startTime || "09:00",
                    endTime: data.endTime || "17:00",
                    breakStart: data.breakStart || "13:00",
                    breakEnd: data.breakEnd || "14:00",
                    prefix: (data.prefix || data.tokenPrefix || "A").toString().toUpperCase(),
                    active: data.active ?? true,
                    photoUrl: data.photoUrl || data.photoURI || data.photo || "",
                };
            });
            console.log(`[Settings] Doctors Synced: ${items.length}`, items);
            setDoctors(items);
            setDoctorsLoaded(true);
        });
        return () => unsubscribe();
    }, [user]);

    const handleAddDoctor = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!user) return;
        if (doctors.length >= maxDoctors) return;

        const prefix = (newDoctor.prefix || "").toString().toUpperCase().trim();
        if (!newDoctor.name.trim()) return;
        if (!prefix) {
            setPrefixError("Prefix is required");
            return;
        }

        // Check for duplicate prefix
        const isDuplicate = doctors.some(d => d.prefix.toUpperCase() === prefix);
        if (isDuplicate) {
            setPrefixError(`Prefix "${prefix}" is already in use by another doctor.`);
            return;
        }

        setDoctorSaving(true);
        setPrefixError("");
        try {
            const doctorsRef = collection(db, "clinics", user.userId, "doctors");
            const newDocRef = doc(doctorsRef);
            const doctorNameToSet = newDoctor.name.trim();
            const payload = {
                id: newDocRef.id,
                name: doctorNameToSet,
                specialization: newDoctor.specialization,
                slotDuration: Number(newDoctor.slotDuration),
                startTime: newDoctor.startTime,
                endTime: newDoctor.endTime,
                breakStart: newDoctor.breakStart,
                breakEnd: newDoctor.breakEnd,
                prefix: (newDoctor.prefix || "A").toString().toUpperCase().replace(/\s+/g, ""),
                active: newDoctor.active,
                photoUrl: newDoctor.photoUrl || "",
            };
            await setDoc(newDocRef, payload);
            if (!settings.doctorName?.trim()) {
                await setDoc(doc(db, "clinics", user.userId), { doctorName: doctorNameToSet }, { merge: true });
                setSettings((prev) => ({ ...prev, doctorName: doctorNameToSet }));
            }
            setNewDoctor({
                name: "",
                specialization: "General",
                slotDuration: 10,
                startTime: "09:00",
                endTime: "17:00",
                breakStart: "13:00",
                breakEnd: "14:00",
                prefix: "A",
                active: true,
                photoUrl: ""
            });
            setShowAddDoctorModal(false);
            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
        } finally {
            setDoctorSaving(false);
        }
    };

    const handleUpdateDoctor = async (doctorId: string, updates: Partial<{ name: string; prefix: string; active: boolean; photoUrl: string; status?: string }>) => {
        if (!user) return;
        const doctorRef = doc(db, "clinics", user.userId, "doctors", doctorId);
        await updateDoc(doctorRef, updates);
    };

    const handleDoctorPhotoUpload = async (file: File | null | undefined, target: "new" | string) => {
        if (!file || !user) return;
        setDoctorSaving(true);
        try {
            const url = await uploadToStorage(`clinics/${user.userId}/doctors/${Date.now()}_${file.name}`, file);
            if (target === "new") {
                setNewDoctor((prev) => ({ ...prev, photoUrl: url }));
            } else {
                await handleUpdateDoctor(target, { photoUrl: url });
            }
        } finally {
            setDoctorSaving(false);
        }
    };

    const handleDeleteDoctor = async (doctorId: string) => {
        if (!user) return;
        const deletingDoctor = doctors.find((d) => d.id === doctorId);
        const remaining = doctors.filter((d) => d.id !== doctorId);
        const doctorRef = doc(db, "clinics", user.userId, "doctors", doctorId);
        await deleteDoc(doctorRef);

        if (deletingDoctor && settings.doctorName?.trim() === deletingDoctor.name?.trim()) {
            const nextDoctorName = remaining[0]?.name || "";
            await setDoc(doc(db, "clinics", user.userId), { doctorName: nextDoctorName }, { merge: true });
            setSettings((prev) => ({ ...prev, doctorName: nextDoctorName }));
        }
    };


    const handleSave = async () => {
        if (!user) return;
        if (smsClinicNameError) return;
        console.log("[Settings] Starting save - user.userId:", user.userId);
        console.log("[Settings] Clinic name to save:", settings.clinicName);
        setSyncWarning("");
        setSaving(true);
        try {
            const payload = {
                id: user.userId,
                name: settings.clinicName,
                clinicName: settings.clinicName,
                doctorName: settings.doctorName || "",
                address: settings.address,
                city: settings.city,
                timezone: settings.timezone,
                phone: settings.phone,
                email: settings.email,
                clinicType: settings.clinicType,
                startTime: settings.startTime,
                endTime: settings.endTime,
                breakStartTime: settings.breakStartTime,
                breakEndTime: settings.breakEndTime,
                tokenPrefix: settings.tokenPrefix,
                tokenDigits: settings.tokenDigits,
                voiceEnabled: settings.voiceEnabled,
                voiceVolume: settings.voiceVolume,
                voiceLanguage: settings.voiceLanguage.replace("-", "_"),
                announcementTemplate: settings.announcementTemplate,
                checkInAnnouncementTemplate: settings.checkInAnnouncementTemplate,
                clinicLogoUri: settings.clinicLogoUri,
                doctorPhotoUri: settings.doctorPhotoUri,
                currentPlan: settings.currentPlan,
                smsEnabled: settings.smsEnabled,
                smsClinicName: settings.smsClinicName || settings.clinicName,
                status: settings.status,
                voiceRate: settings.voiceRate,
                voicePitch: settings.voicePitch,
                voiceGender: settings.voiceGender,
                voiceName: settings.voiceName,
                tokenResetTime: settings.tokenResetTime,
                queueType: settings.queueType,
                aiEnabled: settings.aiEnabled,
            };
            console.log("[Settings] Payload prepared:", payload);
            await setDoc(doc(db, "clinics", user.userId), payload, { merge: true });
            console.log("[Settings] setDoc completed");
            
            // Explicit clinic name mutation to guarantee name persistence
            // Only update name/clinicName to avoid schema field mismatches
            try {
                const resolvedClinicId = user.userId.startsWith("clinic-") ? user.userId.replace(/^clinic-/, "") : user.userId;
                await gqlClient.graphql({
                    query: /* GraphQL */ `mutation UpdateClinic($input: UpdateClinicInput!) { updateClinic(input: $input) { id name clinicName } }`,
                    variables: { input: { id: resolvedClinicId, name: settings.clinicName, clinicName: settings.clinicName } }
                });
                console.log("[Settings] Direct name mutation successful");
            } catch (nameErr) {
                console.warn("[Settings] Name mutation fallback failed:", nameErr);
            }

            // Sync the local session so the sidebar instantly reflects the change
            const session = getLocalSession();
            if (session) {
                setLocalSession({ ...session, username: settings.clinicName });
            }

            setSuccess(true);
            setTimeout(() => setSuccess(false), 2500);
            setLastSavedSettings(JSON.stringify(settings));
            setHasUnsavedChanges(false);
        } finally {
            setSaving(false);
        }
    };

    const handleLoadDemoData = async () => {
        if (!user) return;
        setIsDemoLoading(true);
        try {
            const batch = writeBatch(db);
            const doctorsRef = collection(db, "clinics", user.userId, "doctors");
            const doctorsSnapshot = await getDocs(doctorsRef) as any;
            const currentDoctorIds = doctorsSnapshot.docs?.map((d: any) => d.id) || [];
            const primaryDoctorId = currentDoctorIds[0] || "demo-doc-1";

            const patientsRef = collection(db, "clinics", user.userId, "patients");
            const demoPatients = [
                { name: "John Doe", phone: "9876543210", status: "WAITING", tokenPrefix: "A", tokenNumber: 1, checkedInAt: Date.now() - 3600000, doctorId: primaryDoctorId },
                { name: "Jane Smith", phone: "9876543211", status: "WAITING", tokenPrefix: "A", tokenNumber: 2, checkedInAt: Date.now() - 2400000, doctorId: primaryDoctorId },
                { name: "Robert Wilson", phone: "9876543212", status: "IN_PROGRESS", tokenPrefix: "B", tokenNumber: 1, checkedInAt: Date.now() - 5400000, doctorId: currentDoctorIds[1] || primaryDoctorId },
            ];

            for (const p of demoPatients) {
                const pRef = doc(patientsRef);
                batch.set(pRef, { ...p, id: pRef.id });
            }

            const logsRef = collection(db, "clinics", user.userId, "analytics_logs");
            for (let i = 0; i < 60; i++) {
                const logRef = doc(logsRef);
                batch.set(logRef, {
                    type: "CONSULTATION_END",
                    doctorId: primaryDoctorId,
                    duration: 10 + Math.floor(Math.random() * 10),
                    timestamp: Date.now() - (i * 86400000 / 2),
                });
            }

            const insightsRef = collection(db, "clinics", user.userId, "ai_insights");
            const insightRef = doc(insightsRef);
            batch.set(insightRef, {
                id: insightRef.id,
                title: "Optimized Slot Duration",
                content: "AI detected that your average consultation time is 14 minutes. We recommend increasing your slot duration from 10 to 15 minutes to reduce patient wait times by 12%.",
                type: "OPTIMIZATION",
                severity: "INFO",
                createdAt: Date.now()
            });

            await batch.commit();
            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
        } catch (err) {
            console.error("Error loading demo data:", err);
        } finally {
            setIsDemoLoading(false);
        }
    };

    const handleUpload = async (
        file: File | null | undefined,
        type: "logo" | "doctor",
    ) => {
        if (!file || !user) return;
        setSaving(true);
        try {
            const path = type === "logo" ? "clinic_logo" : "doctor_photo";
            const url = await uploadToStorage(`clinics/${user.userId}/${path}_${file.name}`, file);
            const patch =
                type === "logo"
                    ? { clinicLogoUri: url }
                    : { doctorPhotoUri: url };

            setSettings((prev) => ({
                ...prev,
                clinicLogoUri: type === "logo" ? url : prev.clinicLogoUri,
                doctorPhotoUri: type === "doctor" ? url : prev.doctorPhotoUri,
            }));
            await setDoc(doc(db, "clinics", user.userId), patch, { merge: true });
            setSuccess(true);
            setTimeout(() => setSuccess(false), 2500);
        } finally {
            setSaving(false);
        }
    };

    const planExpiry = useMemo(() => {
        if (!settings.planExpiryDate) return "";
        return new Date(settings.planExpiryDate).toLocaleDateString();
    }, [settings.planExpiryDate]);

    const isFreeTrial = settings.currentPlan === "FREE" && settings.signupDate > 0;
    const trialStart = isFreeTrial ? new Date(settings.signupDate) : null;
    const trialEnd = isFreeTrial && trialStart
        ? new Date(trialStart.getTime() + 30 * 24 * 60 * 60 * 1000)
        : null;
    const isTrialExpired = Boolean(isFreeTrial && trialEnd && Date.now() > trialEnd.getTime());
    const smsLimit = isFreeTrial ? 100 : settings.smsLimit;
    const patientsLimit = isFreeTrial ? 100 : settings.patientsLimit;

    const usageItems = [
        {
            label: "Patients",
            used: settings.patientsUsed,
            limit: patientsLimit,
        },
        {
            label: "SMS",
            used: settings.smsUsed,
            limit: smsLimit,
        },
        {
            label: "Doctors",
            used: doctors.length,
            limit: maxDoctors,
        },
        {
            label: "WhatsApp",
            used: settings.whatsappUsed,
            limit: settings.whatsappLimit,
            disabled: true,
        },
    ];
    const verifiedMobileDisplay = user?.mobile || settings.phone || "Not set";

    useEffect(() => {
        if (!lastSavedSettings) return;
        const current = JSON.stringify(settings);
        setHasUnsavedChanges(current !== lastSavedSettings);
    }, [settings, lastSavedSettings]);

    useEffect(() => {
        if (typeof window === "undefined") return;
        const onSync = (event: Event) => {
            const detail = (event as CustomEvent).detail || {};
            if (detail?.mode === "local_only" && detail?.collection === "clinics") {
                setSyncWarning("Saved locally. Cloud sync is unavailable due to backend authorization.");
            }
        };
        window.addEventListener("vizzi_db_sync", onSync as EventListener);
        return () => window.removeEventListener("vizzi_db_sync", onSync as EventListener);
    }, []);

    if (loading) return <div>Loading...</div>;

    const validateSmsClinicName = (value: string) => {
        if (!value) {
            setSmsClinicNameError("");
            return;
        }
        // Validating for CAPS followed by 1 Digit (e.g. RADHACLINIC1)
        const isValid = /^[A-Z]+[0-9]$/.test(value);
        setSmsClinicNameError(isValid ? "" : "Format: CAPS clinic name followed by 1 digit (e.g. RADHACLINIC1).");
    };

    // Account management handlers
    const handleEmailUpdate = async () => {
        if (!accountSettings.newEmail || !user) return;

        setAccountLoading(true);
        setAccountError("");
        setAccountSuccess("");

        try {
            // Import Amplify auth functions
            const { updateUserAttributes } = await import("aws-amplify/auth");

            // Update email attribute
            await updateUserAttributes({
                userAttributes: {
                    email: accountSettings.newEmail,
                },
            });

            setAccountSuccess("Verification code sent to your new email. Please check your inbox (including spam folder).");
            setShowEmailVerification(true);
        } catch (error: any) {
            console.error("Email update error:", error);
            setAccountError(error.message || "Failed to update email. Please try again.");
        } finally {
            setAccountLoading(false);
        }
    };

    const handleMobileUpdate = async () => {
        if (!accountSettings.newMobile) return;

        setAccountLoading(true);
        setAccountError("");
        setAccountSuccess("");

        try {
            // Update mobile in clinic settings
            if (!user) throw new Error("User not authenticated");
            await setDoc(doc(db, "clinics", user.userId), {
                phone: accountSettings.newMobile,
            }, { merge: true });

            setAccountSuccess("Mobile number updated successfully!");
            setAccountSettings(prev => ({ ...prev, newMobile: "" }));
        } catch (error: any) {
            console.error("Mobile update error:", error);
            setAccountError(error.message || "Failed to update mobile number. Please try again.");
        } finally {
            setAccountLoading(false);
        }
    };

    const verifyEmailOtp = async () => {
        if (!accountSettings.emailOtp || accountSettings.emailOtp.length !== 6) return;

        setAccountLoading(true);
        setAccountError("");

        try {
            // Import Amplify auth functions
            const { confirmUserAttribute } = await import("aws-amplify/auth");

            // Confirm email attribute
            await confirmUserAttribute({
                userAttributeKey: 'email',
                confirmationCode: accountSettings.emailOtp,
            });

            setAccountSuccess("Email updated successfully! Please login again with your new email.");
            setShowEmailVerification(false);
            setAccountSettings(prev => ({ ...prev, newEmail: "", emailOtp: "" }));
        } catch (error: any) {
            console.error("Email verification error:", error);
            setAccountError(error.message || "Invalid verification code. Please try again.");
        } finally {
            setAccountLoading(false);
        }
    };

    const verifyMobileOtp = async () => {
        // For mobile, we'll just close the modal as SMS verification is handled separately
        setAccountSuccess("Mobile number updated successfully!");
        setShowMobileVerification(false);
        setAccountSettings(prev => ({ ...prev, newMobile: "", mobileOtp: "" }));
    };

    return (
        <div className="space-y-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Clinic Settings</h1>
                    <p className="text-slate-500">Clinic profile, doctor management, voice automation, and messaging.</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                    <button
                        onClick={handleSave}
                        disabled={saving || !!smsClinicNameError}
                        className="btn-primary flex items-center gap-2"
                    >
                        <Save size={18} />
                        {saving ? "Saving..." : "Save All"}
                    </button>
                    {hasUnsavedChanges && (
                        <p className="text-xs text-amber-600">Unsaved changes. Click Save All.</p>
                    )}
                </div>
            </div>

            {success && (
                <div className="medical-card p-4 flex items-center gap-2 text-primary">
                    <CheckCircle2 size={18} />
                    <span className="text-sm font-medium">Settings saved successfully.</span>
                </div>
            )}
            {syncWarning && (
                <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] text-amber-700 border border-amber-200 bg-amber-50">
                    <AlertTriangle size={12} />
                    <span className="font-medium">{syncWarning}</span>
                </div>
            )}

            {/* Tab Navigation */}
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-[2rem] w-fit overflow-x-auto no-scrollbar">
                {tabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`flex items-center gap-2 px-6 py-3 rounded-2xl transition-all duration-300 whitespace-nowrap ${isActive
                                ? "bg-white text-primary shadow-md font-semibold"
                                : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
                                }`}
                        >
                            <Icon size={18} />
                            <span>{tab.label}</span>
                        </button>
                    );
                })}
            </div>

            {/* Tab Content */}
            <div className="min-h-[500px]">

                {/* Clinic Tab */}
                {activeTab === "clinic" && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className="medical-card p-6 lg:col-span-2 space-y-6">
                            <div className="flex items-center gap-2">
                                <Shield size={18} className="text-primary" />
                                <h2 className="text-lg font-semibold text-slate-900">Clinic Profile</h2>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-slate-700">Clinic Name</label>
                                    <input
                                        value={settings.clinicName}
                                        onChange={(e) => setSettings((prev) => ({ ...prev, clinicName: e.target.value }))}
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-slate-700">Clinic Address</label>
                                    <input
                                        value={settings.address}
                                        onChange={(e) => setSettings((prev) => ({ ...prev, address: e.target.value }))}
                                        placeholder="Plot 12, Sector 5..."
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-slate-700">City</label>
                                    <input
                                        value={settings.city}
                                        onChange={(e) => setSettings((prev) => ({ ...prev, city: e.target.value }))}
                                        placeholder="New Delhi"
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-slate-700">Timezone</label>
                                    <select
                                        value={settings.timezone}
                                        onChange={(e) => setSettings((prev) => ({ ...prev, timezone: e.target.value }))}
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2020%2020%22%3E%3Cpath%20stroke%3D%22%236b7280%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%221.5%22%20d%3D%22m6%208%204%204%204-4%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1.25rem_1.25rem] bg-[right_0.5rem_center] bg-no-repeat"
                                    >
                                        <option value="Asia/Kolkata">IST (India) - GMT+5:30</option>
                                        <option value="UTC">UTC (Universal)</option>
                                        <option value="GMT">GMT (London)</option>
                                        <option value="America/New_York">EST (New York) - GMT-5</option>
                                        <option value="Asia/Dubai">GST (Dubai) - GMT+4</option>
                                        <option value="Asia/Singapore">SGT (Singapore) - GMT+8</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-slate-700">Clinic Type</label>
                                    <select
                                        value={settings.clinicType}
                                        onChange={(e) => setSettings((prev) => ({ ...prev, clinicType: e.target.value }))}
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2020%2020%22%3E%3Cpath%20stroke%3D%22%236b7280%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%221.5%22%20d%3D%22m6%208%204%204%204-4%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1.25rem_1.25rem] bg-[right_0.5rem_center] bg-no-repeat"
                                    >
                                        <option value="">Select Clinic Type</option>
                                        <option value="General Practice">General Practice</option>
                                        <option value="Dental Clinic">Dental Clinic</option>
                                        <option value="Eye Clinic">Eye Clinic</option>
                                        <option value="Skin & Hair">Skin & Hair Clinic</option>
                                        <option value="Heart Specialist">Heart Specialist</option>
                                        <option value="Pediatrics">Pediatrics (Child Care)</option>
                                        <option value=" ENT Clinic">ENT Specialist</option>
                                        <option value="Gynecology">Gynecology</option>
                                        <option value="Orthopedic">Orthopedic</option>
                                        <option value="Physiotherapy">Physiotherapy</option>
                                        <option value="Diagnostic Center">Diagnostic Center</option>
                                        <option value="Other">Other / General</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-slate-700">Phone</label>
                                    <input
                                        value={settings.phone}
                                        onChange={(e) => setSettings((prev) => ({ ...prev, phone: e.target.value }))}
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-slate-700">Email</label>
                                    <input
                                        value={settings.email}
                                        onChange={(e) => setSettings((prev) => ({ ...prev, email: e.target.value }))}
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-100">
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-slate-700">Start Time</label>
                                    <input
                                        type="time"
                                        value={settings.startTime}
                                        onChange={(e) => setSettings((prev) => ({ ...prev, startTime: e.target.value }))}
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-slate-700">End Time</label>
                                    <input
                                        type="time"
                                        value={settings.endTime}
                                        onChange={(e) => setSettings((prev) => ({ ...prev, endTime: e.target.value }))}
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-slate-700">Break Start</label>
                                    <input
                                        type="time"
                                        value={settings.breakStartTime}
                                        onChange={(e) => setSettings((prev) => ({ ...prev, breakStartTime: e.target.value }))}
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-slate-700">Break End</label>
                                    <input
                                        type="time"
                                        value={settings.breakEndTime}
                                        onChange={(e) => setSettings((prev) => ({ ...prev, breakEndTime: e.target.value }))}
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="medical-card p-6 space-y-6">
                            <div className="flex items-center gap-2">
                                <Gauge size={18} className="text-primary" />
                                <h2 className="text-lg font-semibold text-slate-900">Growth & Usage</h2>
                            </div>
                            <div className="space-y-3">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-slate-500">Plan</span>
                                    <span className="font-semibold text-slate-900">{settings.currentPlan || "FREE"}</span>
                                </div>
                                {planExpiry && (
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-slate-500">Plan Expiry</span>
                                        <span className="font-semibold text-slate-900">{planExpiry}</span>
                                    </div>
                                )}
                                {isFreeTrial && trialStart && trialEnd && (
                                    <div className="bg-primary/5 rounded-xl p-3 border border-primary/10">
                                        <p className="text-xs text-primary font-medium">Trial End: {trialEnd.toLocaleDateString()}</p>
                                        <p className="text-[10px] text-slate-500 mt-1">Free trial includes 100 SMS and 100 patients for 30 days.</p>
                                    </div>
                                )}
                            </div>
                            <div className="space-y-3 pt-4 border-t border-slate-100">
                                {usageItems.map((item) => (
                                    <div key={item.label} className={`bg-slate-50 rounded-xl p-3 ${(item as any).disabled ? 'opacity-60 grayscale' : ''}`}>
                                        <div className="flex items-center justify-between text-sm">
                                            <div className="flex items-center gap-2">
                                                <span className="text-slate-600 font-medium">{item.label}</span>
                                                {(item as any).disabled && (
                                                    <span className="bg-slate-200 text-slate-500 text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full">Coming Soon</span>
                                                )}
                                            </div>
                                            <span className="font-semibold text-slate-900">{item.used} / {item.limit || "∞"}</span>
                                        </div>
                                        <div className="mt-2 h-1.5 rounded-full bg-slate-200">
                                            <div className="h-full rounded-full bg-primary transition-all" style={{ width: item.limit ? `${Math.min(100, Math.round((item.used / item.limit) * 100))}%` : "15%" }} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Doctors Tab */}
                {activeTab === "doctors" && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className="medical-card p-8 space-y-6">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Users size={18} className="text-primary" />
                                    <h2 className="text-lg font-semibold text-slate-900">Manage Doctors ({doctors.length}/{maxDoctors})</h2>
                                </div>
                                <button
                                    onClick={() => {
                                        if (!doctorsLoaded) return; // Prevent action if doctors are not loaded yet

                                        if (doctors.length >= maxDoctors) {
                                            const plan = settings.currentPlan || "FREE";
                                            alert(`Doctor limit reached (${maxDoctors}/${maxDoctors}) for ${plan} plan. Please upgrade your plan to add more doctors.`);
                                            return;
                                        }

                                        // Auto-suggest next available prefix (A, B, C...)
                                        const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
                                        const usedPrefixes = new Set(doctors.map(d => d.prefix.toUpperCase()));
                                        let suggested = "A";
                                        for (let i = 0; i < alphabet.length; i++) {
                                            if (!usedPrefixes.has(alphabet[i])) {
                                                suggested = alphabet[i];
                                                break;
                                            }
                                        }

                                        setNewDoctor(prev => ({ ...prev, prefix: suggested }));
                                        setPrefixError("");
                                        setShowAddDoctorModal(true);
                                    }}
                                    className={`btn-primary flex items-center gap-2 ${doctors.length >= maxDoctors ? 'opacity-60 grayscale-[0.5] cursor-not-allowed hover:bg-primary/90' : ''}`}
                                >
                                    <Plus size={18} /> Add Doctor
                                </button>
                            </div>

                            <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl flex items-center gap-3">
                                <Activity size={18} className="text-blue-600" />
                                <p className="text-xs text-blue-700 font-medium">Doctor queues are automatically synchronized with Vizzi kiosk and display systems.</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {doctors.map((doctor) => (
                                    <div key={doctor.id} className="p-5 border border-slate-100 rounded-3xl bg-white space-y-4 shadow-sm hover:shadow-md transition-all">
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-center gap-4">
                                                <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 overflow-hidden relative group">
                                                    {doctor.photoUrl ? (<Image src={doctor.photoUrl} alt={doctor.name} width={56} height={56} className="object-cover" />) : (<ImageIcon size={24} />)}
                                                    <label className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                                                        <input type="file" className="hidden" accept="image/*" onChange={(e) => handleDoctorPhotoUpload(e.target.files?.[0], doctor.id)} />
                                                        <Upload size={16} className="text-white" />
                                                    </label>
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-900">{doctor.name}</p>
                                                    <p className="text-xs font-semibold text-primary uppercase tracking-tight">{doctor.specialization || "General"}</p>
                                                    <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-bold uppercase mt-1 inline-block">Token: {doctor.prefix}</span>
                                                </div>
                                            </div>
                                            <button onClick={() => handleDeleteDoctor(doctor.id)} className="p-2 hover:bg-rose-50 text-slate-300 hover:text-rose-500 rounded-xl transition-all">
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                        
                                        {/* Doctor Status Toggle */}
                                        <div className="pt-3 border-t border-slate-100">
                                            <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                                                <Activity size={12} />
                                                Doctor Live Status
                                            </div>
                                            <div className="flex gap-1">
                                                {[
                                                    { label: "🟢 Available", value: "AVAILABLE", ringColor: "ring-green-200", textColor: "text-green-700", dot: "bg-green-500" },
                                                    { label: "🟡 On Break", value: "ON_BREAK", ringColor: "ring-amber-200", textColor: "text-amber-700", dot: "bg-amber-500" },
                                                    { label: "🔴 Busy", value: "BUSY", ringColor: "ring-rose-200", textColor: "text-rose-700", dot: "bg-rose-500" },
                                                    { label: "⚫ Offline", value: "OFFLINE", ringColor: "ring-slate-200", textColor: "text-slate-700", dot: "bg-slate-500" }
                                                ].map((item) => {
                                                    const currentStatus = doctor.active ? "AVAILABLE" : "OFFLINE";
                                                    const isActive = currentStatus === item.value;
                                                    return (
                                                        <button
                                                            key={item.value}
                                                            onClick={() => {
                                                                const newActive = item.value === "OFFLINE" ? false : true;
                                                                const newStatus = item.value === "OFFLINE" ? "OFFLINE" : "AVAILABLE";
                                                                handleUpdateDoctor(doctor.id, { 
                                                                    active: newActive,
                                                                    status: newStatus
                                                                });
                                                            }}
                                                            className={`relative z-10 px-2 py-1 rounded-lg flex items-center gap-1 text-[9px] font-black uppercase tracking-wider transition-all flex-1 justify-center ${isActive
                                                                ? `bg-white ${item.textColor} shadow-sm ring-1 ${item.ringColor}`
                                                                : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
                                                                }`}
                                                        >
                                                            {isActive && <span className={`w-1 h-1 rounded-full ${item.dot} animate-pulse shrink-0`} />}
                                                            {item.label}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Tokens & Messaging Tab */}
                {activeTab === "tokens" && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">

                        {/* Clinic-wide Token Settings */}
                        <div className="medical-card p-6 space-y-6">
                            <div className="flex items-center gap-2">
                                <KeyRound size={18} className="text-primary" />
                                <h2 className="text-lg font-semibold text-slate-900">Clinic Token Settings</h2>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-slate-700">Default Token Prefix</label>
                                    <input
                                        type="text"
                                        value={settings.tokenPrefix}
                                        onChange={(e) => {
                                            setSettings(prev => ({ ...prev, tokenPrefix: e.target.value.toUpperCase().slice(0, 2) }));
                                            setHasUnsavedChanges(true);
                                        }}
                                        maxLength={2}
                                        placeholder="e.g. A"
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 transition-all font-bold text-lg"
                                    />
                                    <p className="text-[10px] text-slate-500 font-medium italic">Fallback prefix if no doctor is assigned.</p>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-slate-700">Token Digits</label>
                                    <select
                                        value={settings.tokenDigits}
                                        onChange={(e) => {
                                            setSettings(prev => ({ ...prev, tokenDigits: Number(e.target.value) }));
                                            setHasUnsavedChanges(true);
                                        }}
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                                    >
                                        <option value={1}>1 (1, 2, 3...)</option>
                                        <option value={2}>2 (01, 02, 03...)</option>
                                        <option value={3}>3 (001, 002, 003...)</option>
                                    </select>
                                    <p className="text-[10px] text-slate-500 font-medium italic">Number of digits for numbering.</p>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-slate-700">Reset Frequency</label>
                                    <select
                                        value={settings.tokenResetTime}
                                        onChange={(e) => {
                                            setSettings(prev => ({ ...prev, tokenResetTime: e.target.value }));
                                            setHasUnsavedChanges(true);
                                        }}
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                                    >
                                        <option value="Daily">Daily</option>
                                        <option value="Weekly">Weekly</option>
                                        <option value="Monthly">Monthly</option>
                                    </select>
                                    <p className="text-[10px] text-slate-500 font-medium italic">When token numbers reset to 1.</p>
                                </div>
                            </div>
                        </div>

                        <div className="medical-card p-6 space-y-6">
                            <div className="flex items-center gap-2">
                                <Send size={18} className="text-primary" />
                                <h2 className="text-lg font-semibold text-slate-900">SMS Alerts</h2>
                            </div>
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <label className="text-sm font-semibold text-slate-700">SMS Sender ID (DLT Header)</label>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const base = (settings.clinicName || settings.name || "CLINIC")
                                                    .toUpperCase()
                                                    .replace(/[^A-Z]/g, "")
                                                    .slice(0, 11);
                                                setSettings(prev => ({ ...prev, smsClinicName: `${base}1` }));
                                                setSmsClinicNameError("");
                                            }}
                                            className="text-[10px] font-bold text-primary hover:text-primary-dark transition-colors uppercase tracking-wider"
                                        >
                                            Generate ID
                                        </button>
                                    </div>
                                    <input
                                        value={settings.smsClinicName}
                                        onChange={(e) => {
                                            const val = e.target.value.toUpperCase().replace(/\s/g, "");
                                            setSettings((prev) => ({ ...prev, smsClinicName: val }));
                                            validateSmsClinicName(val);
                                        }}
                                        maxLength={15}
                                        placeholder="e.g. SAPNACLINIC1"
                                        className={`w-full px-4 py-2.5 bg-slate-50 border rounded-xl outline-none transition-all ${smsClinicNameError ? "border-red-300 focus:ring-red-100" : "border-slate-200 focus:ring-primary/20"}`}
                                    />
                                    {smsClinicNameError && <p className="text-[10px] text-red-500 mt-1 ml-1">{smsClinicNameError}</p>}
                                    <p className="text-[10px] text-slate-400 ml-1">Must be exactly as approved in your DLT portal.</p>
                                </div>
                                <label className="flex items-center gap-3 p-4 bg-slate-50 border border-slate-200 rounded-2xl cursor-pointer hover:bg-slate-100/80 transition-all group">
                                    <div className="relative flex items-center justify-center">
                                        <input
                                            type="checkbox"
                                            checked={settings.smsEnabled}
                                            onChange={(e) => {
                                                if (!e.target.checked) {
                                                    setIsConfirmingDisable(true);
                                                } else {
                                                    setSettings((prev) => ({ ...prev, smsEnabled: true }));
                                                    setHasUnsavedChanges(true);
                                                }
                                            }}
                                            disabled={isTrialExpired && settings.currentPlan === "FREE"}
                                            className="peer h-5 w-5 rounded-md border-slate-300 text-primary focus:ring-primary transition-all cursor-pointer accent-primary"
                                        />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-sm font-black text-slate-800 uppercase tracking-tight group-hover:text-primary transition-colors">Enable SMS Tokens for patients</span>
                                        <span className="text-[10px] font-medium text-slate-500">Sends real-time token updates and turn alerts to patient mobiles.</span>
                                    </div>
                                </label>
                                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600 space-y-3">
                                    <div className="flex items-center gap-2 mb-1">
                                        <Shield size={14} className="text-primary" />
                                        <p className="font-bold text-slate-700 uppercase tracking-tight">Approved DLT Message Formats</p>
                                    </div>
                                    <div className="space-y-3 pt-2 border-t border-slate-200">
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase">Check-in Alert</p>
                                            <p className="p-2 bg-white rounded-lg border border-slate-100 text-[11px] leading-relaxed italic">
                                                "Your token number is <span className="text-primary font-bold">{settings.tokenPrefix || "A"}01</span> at <span className="text-primary font-bold">{settings.smsClinicName || "SAPNACLINIC1"}</span>. Please wait to be called."
                                            </p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase">Call Alert</p>
                                            <p className="p-2 bg-white rounded-lg border border-slate-100 text-[11px] leading-relaxed italic">
                                                "Your turn now. Token <span className="text-primary font-bold">{settings.tokenPrefix || "A"}01</span> at <span className="text-primary font-bold">{settings.smsClinicName || "SAPNACLINIC1"}</span>. Please visit the doctor."
                                            </p>
                                        </div>
                                    </div>
                                    <p className="text-[9px] text-slate-400 pt-2 text-center italic font-medium">
                                        Tokens and Clinic Names are dynamically inserted during transmission.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Voice Automation Tab */}
                {activeTab === "voice" && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className="medical-card p-6 space-y-6">
                            <div className="flex items-center gap-2">
                                <Volume2 size={18} className="text-primary" />
                                <h2 className="text-lg font-semibold text-slate-900">Announcement Settings</h2>
                            </div>
                            <div className="space-y-6">
                                <label className="flex items-center gap-2 text-sm text-slate-600">
                                    <input
                                        type="checkbox"
                                        checked={settings.voiceEnabled}
                                        onChange={(e) => setSettings((prev) => ({ ...prev, voiceEnabled: e.target.checked }))}
                                        className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                                    />
                                    Enable Voice Announcements
                                </label>

                                <div className="space-y-4 pt-4 border-t border-slate-100">
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <label className="text-sm font-semibold text-slate-700">Announcement Language</label>
                                            <div className="flex bg-slate-100 p-1 rounded-xl">
                                                <button
                                                    onClick={() => handleLanguageChange("en-IN")}
                                                    className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${settings.voiceLanguage?.startsWith("en") ? "bg-white text-primary shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                                                >
                                                    English
                                                </button>
                                                <button
                                                    onClick={() => handleLanguageChange("hi-IN")}
                                                    className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${settings.voiceLanguage?.startsWith("hi") ? "bg-white text-primary shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                                                >
                                                    Hindi
                                                </button>
                                            </div>
                                        </div>
                                        <p className="text-[10px] text-slate-500">Choosing a language will automatically reset templates to their defaults for that language.</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold text-slate-700">Check-in Template</label>
                                        <input
                                            value={settings.checkInAnnouncementTemplate}
                                            onChange={(e) => setSettings((prev) => ({ ...prev, checkInAnnouncementTemplate: e.target.value }))}
                                            placeholder="Welcome {name} to {clinic}. Token {token}."
                                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold text-slate-700">Queue Template</label>
                                        <input
                                            value={settings.announcementTemplate}
                                            onChange={(e) => setSettings((prev) => ({ ...prev, announcementTemplate: e.target.value }))}
                                            placeholder="Token {token} {name}, please go to {doctor} at {clinic}."
                                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                                        />
                                    </div>
                                </div>

                                <div className="pt-6 border-t border-slate-100 flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 mb-6">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-xl ${settings.voiceEngine === 'polly' ? 'bg-primary/10 text-primary' : 'bg-slate-200 text-slate-500'}`}>
                                            <Cpu size={20} />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-slate-800 tracking-tight">AI Voice Enhancement</p>
                                            <p className="text-[10px] text-slate-500 font-medium">Use Amazon Polly for high-quality Indian voices.</p>
                                        </div>
                                    </div>
                                    <div className="flex bg-slate-200 p-1 rounded-xl">
                                        <button
                                            onClick={() => setSettings(prev => ({ ...prev, voiceEngine: "browser" }))}
                                            className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${settings.voiceEngine === 'browser' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                        >
                                            Browser
                                        </button>
                                        <button
                                            onClick={() => setSettings(prev => ({ ...prev, voiceEngine: "polly" }))}
                                            className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${settings.voiceEngine === 'polly' ? 'bg-primary text-white shadow-lg' : 'text-slate-500 hover:text-slate-700'}`}
                                        >
                                            AWS Polly
                                        </button>
                                    </div>
                                </div>

                                <button
                                    onClick={() => handleTestVoice(settings.voiceLanguage?.startsWith("hi") ? "हिंदी आवाज़ का टेस्ट सफल रहा।" : "Voice test successful.")}
                                    className="btn-secondary w-full"
                                >
                                    Test Voice
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Branding Tab */}
                {activeTab === "branding" && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="medical-card p-8 flex flex-col items-center text-center space-y-6">
                                <div className="w-24 h-24 rounded-3xl bg-slate-50 border-2 border-dashed border-slate-200 flex items-center justify-center relative overflow-hidden group">
                                    {settings.clinicLogoUri
                                        ? (<Image src={settings.clinicLogoUri} alt={settings.clinicName || settings.name || "Vizzi AI"} width={96} height={96} className="object-contain" />) : (<ImageIcon size={32} className="text-slate-300" />)}
                                    <label className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                                        <input type="file" className="hidden" accept="image/*" onChange={(e) => handleUpload(e.target.files?.[0], "logo")} />
                                        <Upload size={20} className="text-white" />
                                    </label>
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-800">Clinic Logo</h3>
                                    <p className="text-xs text-slate-500 mt-1">Appears on patient kiosk and dashboard.</p>
                                </div>
                            </div>

                            <div className="medical-card p-8 flex flex-col items-center text-center space-y-6">
                                <div className="w-24 h-24 rounded-3xl bg-slate-50 border-2 border-dashed border-slate-200 flex items-center justify-center relative overflow-hidden group">
                                    {settings.doctorPhotoUri ? (<Image src={settings.doctorPhotoUri} alt="Staff" width={96} height={96} className="object-cover" />) : (<Users size={32} className="text-slate-300" />)}
                                    <label className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                                        <input type="file" className="hidden" accept="image/*" onChange={(e) => handleUpload(e.target.files?.[0], "doctor")} />
                                        <Upload size={20} className="text-white" />
                                    </label>
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-800">Default Staff Photo</h3>
                                    <p className="text-xs text-slate-500 mt-1">Fallback image for doctors without photos.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* AI Engine Tab */}
                {activeTab === "ai" && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className="medical-card p-6 space-y-6">
                            <div className="flex items-center gap-2">
                                <Cpu size={18} className="text-primary" />
                                <h2 className="text-lg font-semibold text-slate-900">AI Performance & Insights</h2>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl">
                                    <div className="flex items-center justify-between">
                                        <p className="text-xs font-bold text-emerald-800 uppercase tracking-widest">Status</p>
                                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                    </div>
                                    <p className="text-lg font-bold text-slate-900 mt-1">AI Connected</p>
                                    <p className="text-[10px] text-emerald-600 font-bold mt-1">AWS Bedrock • Claude 3.5</p>
                                </div>
                                <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl">
                                    <p className="text-xs font-bold text-blue-800 uppercase tracking-widest">Maturity</p>
                                    <p className="text-lg font-bold text-slate-900 mt-1">Early Learning</p>
                                    <p className="text-[10px] text-blue-600 font-bold mt-1">Records: 0 / 50 Needed</p>
                                </div>
                            </div>

                            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-bold text-slate-800">AI Queue Optimization</p>
                                        <p className="text-xs text-slate-500">Enable advanced wait time predictions.</p>
                                    </div>
                                    <button
                                        onClick={() => setSettings(prev => ({ ...prev, aiEnabled: !prev.aiEnabled }))}
                                        className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${settings.aiEnabled ? 'bg-primary text-white shadow-lg' : 'bg-slate-200 text-slate-500'}`}
                                    >
                                        {settings.aiEnabled ? 'ENABLED' : 'DISABLED'}
                                    </button>
                                </div>
                                <div className="pt-4 border-t border-slate-200">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-3">Learning Sources</p>
                                    <div className="grid grid-cols-2 gap-2">
                                        {['Patient queue logs', 'Wait time history', 'Appointment patterns', 'Communication data'].map(src => (
                                            <div key={src} className="flex items-center gap-2 text-xs text-slate-600">
                                                <div className="w-1 h-1 rounded-full bg-primary" /> {src}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="medical-card p-8 border-2 border-dashed border-primary/20 bg-primary/5 flex flex-col items-center text-center space-y-6">
                            <LifeBuoy size={32} className="text-primary animate-bounce-slow" />
                            <div>
                                <h3 className="text-lg font-bold text-slate-900">Experience Vizzi AI</h3>
                                <p className="text-sm text-slate-500 max-w-sm mx-auto mt-2">Populate your clinic with demo patient data, queue history, and AI insights to see how the system performs under load.</p>
                            </div>
                            <button
                                onClick={handleLoadDemoData}
                                disabled={isDemoLoading}
                                className="btn-primary flex items-center gap-2 px-10 shadow-xl"
                            >
                                {isDemoLoading ? (<div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />) : (<Database size={18} />)}
                                {isDemoLoading ? "Processing Dataset..." : "Load Demo Clinic Dataset"}
                            </button>
                        </div>
                    </div>
                )}

                {/* Account Tab */}
                {activeTab === "account" && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className="medical-card p-6 space-y-6">
                            <div className="flex items-center gap-2">
                                <User className="text-slate-700" size={20} />
                                <h2 className="text-lg font-bold text-slate-900">Account Settings</h2>
                            </div>

                            <div className="space-y-4">
                                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                                    <div className="flex items-start gap-2">
                                        <AlertTriangle className="text-amber-600 mt-0.5" size={16} />
                                        <div className="text-sm text-amber-800">
                                            <p className="font-semibold mb-1">Email Verification Issues</p>
                                            <p className="text-xs">If confirmation emails are going to junk, add our domain to your safe sender list. You can also update your email address here.</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Email Update Section */}
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2">
                                        <Mail className="text-slate-600" size={16} />
                                        <h3 className="text-sm font-semibold text-slate-700">Update Email Address</h3>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-xs font-medium text-slate-600">Current Email</label>
                                            <div className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-600">
                                                {user?.userId ? "Current User" : "Not available"}
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-xs font-medium text-slate-600">New Email</label>
                                            <input
                                                type="email"
                                                value={accountSettings.newEmail}
                                                onChange={(e) => setAccountSettings(prev => ({ ...prev, newEmail: e.target.value }))}
                                                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                                placeholder="Enter new email"
                                            />
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => handleEmailUpdate()}
                                        disabled={accountLoading || !accountSettings.newEmail}
                                        className="btn-primary px-6 py-2 text-sm"
                                    >
                                        {accountLoading ? "Processing..." : "Update Email"}
                                    </button>
                                </div>

                                {/* Mobile Update Section */}
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2">
                                        <Smartphone className="text-slate-600" size={16} />
                                        <h3 className="text-sm font-semibold text-slate-700">Update Mobile Number</h3>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-xs font-medium text-slate-600">Current Mobile</label>
                                            <div className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-600">
                                                {verifiedMobileDisplay}
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-xs font-medium text-slate-600">New Mobile</label>
                                            <input
                                                type="tel"
                                                value={accountSettings.newMobile}
                                                onChange={(e) => setAccountSettings(prev => ({ ...prev, newMobile: e.target.value }))}
                                                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                                placeholder="Enter new mobile"
                                            />
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => handleMobileUpdate()}
                                        disabled={accountLoading || !accountSettings.newMobile}
                                        className="btn-primary px-6 py-2 text-sm"
                                    >
                                        {accountLoading ? "Processing..." : "Update Mobile"}
                                    </button>
                                </div>

                                {/* Status Messages */}
                                {accountSuccess && (
                                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                                        <p className="text-sm text-emerald-700">{accountSuccess}</p>
                                    </div>
                                )}

                                {accountError && (
                                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                                        <p className="text-sm text-red-700">{accountError}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Add Doctor Modal */}
            {
                showAddDoctorModal && (
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                        <div className="bg-white rounded-[2.5rem] w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl animate-in fade-in zoom-in duration-300">
                            <div className="p-8 space-y-6">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-primary/10 rounded-xl text-primary"><Plus size={20} /></div>
                                        <h2 className="text-xl font-bold text-slate-900">Add New Doctor</h2>
                                    </div>
                                    <button onClick={() => setShowAddDoctorModal(false)} className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 transition-colors"><X size={20} /></button>
                                </div>

                                <form onSubmit={handleAddDoctor} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold text-slate-700">Doctor Name</label>
                                        <input required value={newDoctor.name} onChange={e => setNewDoctor(prev => ({ ...prev, name: e.target.value }))} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl" placeholder="Dr. Jane Smith" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold text-slate-700">Specialization</label>
                                        <input value={newDoctor.specialization} onChange={e => setNewDoctor(prev => ({ ...prev, specialization: e.target.value }))} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl" placeholder="e.g. Cardiologist" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold text-slate-700">Consultation Duration (min)</label>
                                        <input type="number" required value={newDoctor.slotDuration} onChange={e => setNewDoctor(prev => ({ ...prev, slotDuration: Number(e.target.value) }))} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold text-slate-700">Token Prefix</label>
                                        <input
                                            required
                                            value={newDoctor.prefix}
                                            onChange={e => {
                                                setNewDoctor(prev => ({ ...prev, prefix: e.target.value.toUpperCase() }));
                                                setPrefixError("");
                                            }}
                                            className={cn(
                                                "w-full px-4 py-2.5 bg-slate-50 border rounded-xl transition-colors",
                                                prefixError ? "border-red-300 ring-2 ring-red-50" : "border-slate-200"
                                            )}
                                            placeholder="e.g. A"
                                        />
                                        <p className="text-[10px] text-slate-500 font-medium ml-1">
                                            Tokens will be generated like <span className="text-primary font-bold">{newDoctor.prefix || "A"}01</span>, <span className="text-primary font-bold">{newDoctor.prefix || "A"}02</span>...
                                        </p>
                                        {prefixError && <p className="text-[11px] font-medium text-red-500 animate-in fade-in slide-in-from-top-1">{prefixError}</p>}
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold text-slate-700">Token Reset Time</label>
                                        <select
                                            value={settings.tokenResetTime}
                                            onChange={(e) => setSettings((prev) => ({ ...prev, tokenResetTime: e.target.value }))}
                                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2020%2020%22%3E%3Cpath%20stroke%3D%22%236b7280%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%221.5%22%20d%3D%22m6%208%204%204%204-4%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1.25rem_1.25rem] bg-[right_0.5rem_center] bg-no-repeat"
                                        >
                                            <option value="Daily">Daily</option>
                                            <option value="Weekly">Weekly</option>
                                            <option value="Monthly">Monthly</option>
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold text-slate-700">Queue Type</label>
                                        <select
                                            value={settings.queueType}
                                            onChange={(e) => setSettings((prev) => ({ ...prev, queueType: e.target.value }))}
                                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2020%2020%22%3E%3Cpath%20stroke%3D%22%236b7280%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%221.5%22%20d%3D%22m6%208%204%204%204-4%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1.25rem_1.25rem] bg-[right_0.5rem_center] bg-no-repeat"
                                        >
                                            <option value="Single Queue">Single Queue</option>
                                            <option value="Doctor-wise Queue">Doctor-wise Queue</option>
                                        </select>
                                    </div>

                                    <div className="md:col-span-2 grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-2xl">
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-slate-500 uppercase">Start Time</label>
                                            <input type="time" value={newDoctor.startTime} onChange={e => setNewDoctor(prev => ({ ...prev, startTime: e.target.value }))} className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-slate-500 uppercase">End Time</label>
                                            <input type="time" value={newDoctor.endTime} onChange={e => setNewDoctor(prev => ({ ...prev, endTime: e.target.value }))} className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-slate-500 uppercase">Break Start</label>
                                            <input type="time" value={newDoctor.breakStart} onChange={e => setNewDoctor(prev => ({ ...prev, breakStart: e.target.value }))} className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-slate-500 uppercase">Break End</label>
                                            <input type="time" value={newDoctor.breakEnd} onChange={e => setNewDoctor(prev => ({ ...prev, breakEnd: e.target.value }))} className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl" />
                                        </div>
                                    </div>

                                    <div className="md:col-span-2 flex items-center gap-6 p-4 border border-slate-100 rounded-2xl bg-slate-50/50">
                                        <div className="w-16 h-16 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-300 relative overflow-hidden group">
                                            {newDoctor.photoUrl ? (<Image src={newDoctor.photoUrl} alt="New Doctor" width={64} height={64} className="object-cover" />) : (<ImageIcon size={24} />)}
                                            <label className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                                                <input type="file" className="hidden" accept="image/*" onChange={(e) => handleDoctorPhotoUpload(e.target.files?.[0], "new")} />
                                                <Upload size={16} className="text-white" />
                                            </label>
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-slate-800">Doctor Profile Photo</p>
                                            <p className="text-[10px] text-slate-500">Optional: Upload a clear portrait photo.</p>
                                        </div>
                                    </div>

                                    <div className="md:col-span-2 flex items-center justify-end gap-3 pt-4 border-t">
                                        <button type="button" onClick={() => setShowAddDoctorModal(false)} className="btn-secondary px-8">Cancel</button>
                                        <button type="submit" disabled={doctorSaving} className="btn-primary px-10 shadow-lg shadow-primary/25">
                                            {doctorSaving ? "Saving..." : "Add Doctor"}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                )
            }
            {/* Premium SMS Disable Confirmation */}
            {
                isConfirmingDisable && (
                    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[200] flex items-center justify-center p-4">
                        <div className="bg-white rounded-[2.5rem] w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-300 border border-white/20">
                            <div className="p-8 text-center space-y-6">
                                <div className="w-20 h-20 bg-rose-50 rounded-3xl flex items-center justify-center text-rose-500 mx-auto ring-8 ring-rose-50/50">
                                    <Activity size={40} strokeWidth={2.5} className="animate-pulse" />
                                </div>

                                <div className="space-y-2">
                                    <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Disable SMS Alerts?</h3>
                                    <p className="text-sm text-slate-500 font-medium leading-relaxed px-4">
                                        Patients will <span className="text-rose-600 font-bold uppercase tracking-tight">no longer receive</span> token confirmations or turn-calling notifications via SMS. This will impact the digital-first clinic experience.
                                    </p>
                                </div>

                                <div className="grid grid-cols-2 gap-3 pt-2">
                                    <button
                                        onClick={() => setIsConfirmingDisable(false)}
                                        className="btn-secondary py-3.5 text-xs font-black uppercase tracking-widest border-slate-200 hover:bg-slate-50"
                                    >
                                        Keep Enabled
                                    </button>
                                    <button
                                        onClick={() => {
                                            setSettings(prev => ({ ...prev, smsEnabled: false }));
                                            setHasUnsavedChanges(true);
                                            setIsConfirmingDisable(false);
                                        }}
                                        className="bg-rose-600 hover:bg-rose-700 text-white py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-rose-200 transition-all active:scale-95"
                                    >
                                        Disable SMS
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
};


