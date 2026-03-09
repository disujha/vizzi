"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { generateClient } from "aws-amplify/api";
import { db, collection, doc, getDoc, getDocs, setDoc, updateDoc, addDoc, deleteDoc, onSnapshot, query, where, orderBy, limit, writeBatch, uploadToStorage } from "@/lib/db";
import { sendCallSms } from "@/lib/sms";
import { useSearchParams } from "next/navigation";
import { normalizeDoctorStatus, getDoctorStatusOverride, setDoctorStatusOverride } from "@/lib/clinicQueue";
import {
    Plus,
    PhoneCall,
    CheckCircle2,
    AlertTriangle,
    Clock,
    Calendar,
    RefreshCcw,
    Users,
    MonitorUp,
    User,
    Sparkles,
    Activity,
    ArrowRight,
    UserPlus,
    Settings,
    Stethoscope,
    Search,
    Filter,
    Download,
    Upload,
    Edit,
    Trash2,
    Eye,
    X,
    ChevronDown,
    ChevronUp,
    Bell,
    Volume2,
    VolumeX,
    Pause,
    Play,
    SkipForward,
    Square,
    RefreshCw
} from "lucide-react";

const client = generateClient();

const UPDATE_PATIENT_MUTATION = /* GraphQL */ `
  mutation UpdatePatient(
    $input: UpdatePatientInput!
    $condition: ModelPatientConditionInput
  ) {
    updatePatient(input: $input, condition: $condition) {
      id
      status
      callAudioUrl
      lastCalledAt
    }
  }
`;

const STATUS_LABELS: Record<string, string> = {
    waiting: "Waiting",
    in_progress: "Serving",
    completed: "Completed",
    missed: "Skipped",
    not_responding: "No Response",
    cancelled: "Cancelled",
};

const STATUS_STYLES: Record<string, string> = {
    waiting: "bg-amber-50 text-amber-700 border-amber-200",
    in_progress: "bg-blue-50 text-blue-700 border-blue-200",
    missed: "bg-rose-50 text-rose-700 border-rose-200",
    not_responding: "bg-orange-50 text-orange-700 border-orange-200",
    completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
    cancelled: "bg-slate-100 text-slate-500 border-slate-200",
};

type Patient = {
    id: string;
    name: string;
    tokenNumber: string;
    mobileNumber: string;
    status: string;
    timestamp: number;
    cancelledAt?: number;
    isAppointment: boolean;
    isEmergency: boolean;
    appointmentDate: string;
    appointmentTime: string;
    lastCalledAt: number;
    doctorId?: string;
    doctorName?: string;
    doctorPrefix?: string;
    callAudioUrl?: string;
    clinicId?: string;
};

type Doctor = {
    id: string;
    name: string;
    prefix: string;
    active: boolean;
    status?: string;
};

const DEFAULT_PATIENT: Patient = {
    id: "",
    name: "",
    tokenNumber: "",
    mobileNumber: "",
    status: "waiting",
    timestamp: 0,
    cancelledAt: 0,
    isAppointment: false,
    isEmergency: false,
    appointmentDate: "",
    appointmentTime: "",
    lastCalledAt: 0,
    doctorId: "",
    doctorName: "",
    doctorPrefix: "",
};

const formatDateInput = (date: Date) =>
    date.toLocaleDateString("en-CA");

const getDayBounds = (dateStr: string) => {
    const [year, month, day] = dateStr.split("-").map(Number);
    const start = new Date(year, month - 1, day, 0, 0, 0, 0).getTime();
    const end = new Date(year, month - 1, day, 23, 59, 59, 999).getTime();
    return { start, end };
};

const formatTime = (timestamp: number) => {
    if (!timestamp) return "";
    return new Date(timestamp).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
    });
};

const formatDateTime = (timestamp: number) => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    const datePart = date.toLocaleDateString("en-CA");
    const timePart = date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
    });
    return `${datePart} ${timePart}`;
};

const toTitleCase = (value: string) =>
    value
        .trim()
        .toLowerCase()
        .replace(/\b\w/g, (char) => char.toUpperCase());

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
    const isAppointment = patient.isAppointment || Boolean(anyPatient.appointment) || Boolean(anyPatient.appointmentDate);
    if (isEmergency) return "E";
    if (isAppointment) return "A";
    return "W";
};

export default function PatientManagementPage() {
    const { user } = useAuth();
    const searchParams = useSearchParams();
    const urlDoctorId = searchParams.get('doctorId');
    const [clinicId, setClinicId] = useState<string>("");
    const [clinicName, setClinicName] = useState<string>("");
    const [smsClinicName, setSmsClinicName] = useState<string>("");
    const [doctorName, setDoctorName] = useState<string>("");
    const [clinicStatus, setClinicStatus] = useState<string>("OPEN");
    const [checkInEnabled, setCheckInEnabled] = useState<boolean>(true);
    const [smsEnabled, setSmsEnabled] = useState<boolean>(true);
    const [tokenPrefix, setTokenPrefix] = useState<string>("A");
    const [tokenDigits, setTokenDigits] = useState<number>(2);
    const [queueList, setQueueList] = useState<Patient[]>([]);
    const queueListRef = useRef<any[]>([]);
    const [doctors, setDoctors] = useState<any[]>([]);
    const [stats, setStats] = useState({ total: 0, waiting: 0, inProgress: 0, attention: 0 });
    const [nowServing, setNowServing] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState<string>(formatDateInput(new Date()));
    const [selectedDoctorId, setSelectedDoctorId] = useState<string>(urlDoctorId || "all");
    const [activeTab, setActiveTab] = useState<"queue" | "attention" | "completed">("queue");
    const [showAdd, setShowAdd] = useState(false);
    const [showPanelPreview, setShowPanelPreview] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
    const [showPatientDetails, setShowPatientDetails] = useState(false);
    const [soundEnabled, setSoundEnabled] = useState(true);
    const [queuePaused, setQueuePaused] = useState(false);
    const [autoCallEnabled, setAutoCallEnabled] = useState(false);

    // AI and Sync
    const [lastSyncTime, setLastSyncTime] = useState<string>("Syncing...");
    const [aiInsight, setAiInsight] = useState<string | null>(null);
    const [fetchingInsight, setFetchingInsight] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [formState, setFormState] = useState({
        name: "",
        mobileNumber: "",
        appointmentDate: formatDateInput(new Date()),
        appointmentTime: "09:00",
        isEmergency: false,
        doctorId: "",
    });

    const resolveClinicId = async () => {
        if (String(user?.userId || "").startsWith("clinic-")) return user?.userId || "";
        const email = (user?.email || (user?.username?.includes("@") ? user?.username : "") || "").toLowerCase();
        if (!user) return "";
        try {
            const res1 = await (client.graphql({ query: /* GraphQL */ `query GetClinic($id: ID!) { getClinic(id: ID!) { id } }`, variables: { id: user.userId } }) as any);
            if (res1?.data?.getClinic?.id) return res1.data.getClinic.id;
            if (email) {
                const res2 = await (client.graphql({ query: /* GraphQL */ `query GetClinic($id: ID!) { getClinic(id: ID!) { id } }`, variables: { id: email } }) as any);
                if (res2?.data?.getClinic?.id) return res2.data.getClinic.id;
                const res3 = await (client.graphql({ query: /* GraphQL */ `
                    query ListClinics($filter: ModelClinicFilterInput) {
                        listClinics(filter: $filter) {
                            items {
                                id name clinicName doctorName email status
                            }
                        }
                    }
                `, variables: { filter: { email: { eq: email } } } }) as any);
                const items = res3?.data?.listClinics?.items || [];
                if (items.length > 0) return items[0].id;
            }
        } catch (e) {
            console.warn("[Patient Management] Resolution failed:", e);
        }
        return user.userId;
    };

    useEffect(() => {
        if (!user) return;

        resolveClinicId().then(cid => {
            setClinicId(cid);
            const clinicRef = doc(db, "clinics", cid);
            const unsubscribe = onSnapshot(clinicRef, (snapshot) => {
                const data = snapshot.data() as any;
                if (!data) return;
                setClinicName(data.clinicName || data.name || "");
                setSmsClinicName(data.smsClinicName || "");
                setDoctorName(data.doctorName || "");
                setClinicStatus(data.status || data.clinicStatus || "OPEN");
                setCheckInEnabled(data.checkInEnabled ?? true);
                setSmsEnabled(data.smsEnabled ?? true);
                if (data.tokenPrefix) setTokenPrefix(data.tokenPrefix);
                if (data.tokenDigits) setTokenDigits(Number(data.tokenDigits));
            });
            return unsubscribe;
        }).then(unsub => {
            return () => unsub && (unsub as any)();
        });
    }, [user]);

    useEffect(() => {
        if (!user || !clinicId) return;
        const doctorsRef = collection(db, "clinics", user.userId, "doctors");
        const q = query(doctorsRef, orderBy("name", "asc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const items = (snapshot?.docs || []).map((docSnap: any) => {
                const data = docSnap.data() as any;
                const override = getDoctorStatusOverride(clinicId, docSnap.id) || getDoctorStatusOverride(user.userId, docSnap.id);
                return {
                    id: docSnap.id,
                    name: data.name || "",
                    prefix: (data.prefix || data.tokenPrefix || "A").toString().toUpperCase(),
                    active: data.active ?? true,
                    status: override || data.status || ((data.active ?? true) ? "AVAILABLE" : "OFFLINE"),
                } as Doctor;
            });
            console.log("[Patient Management] Doctors loaded:", items.length, items);
            setDoctors(items);
            
            // Set selected doctor from URL if available and valid
            if (urlDoctorId && items.find((d: Doctor) => d.id === urlDoctorId)) {
                setSelectedDoctorId(urlDoctorId);
            }
        });
        return unsubscribe;
    }, [user, clinicId, urlDoctorId]);

    useEffect(() => {
        if (!user || !clinicId) return;
        const queueRef = collection(db, "clinics", user.userId, "queue");
        const q = query(queueRef, orderBy("timestamp", "asc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const items = (snapshot?.docs || []).map((docSnap: any) => {
                const data = docSnap.data() as Partial<Patient>;
                const normalized = resolveVisitFlags(data);
                return {
                    ...DEFAULT_PATIENT,
                    ...data,
                    id: docSnap.id,
                    timestamp: toMillis(data.timestamp),
                    lastCalledAt: toMillis(data.lastCalledAt),
                    cancelledAt: toMillis(data.cancelledAt),
                    ...normalized,
                } as Patient;
            });
            console.log("[Patient Management] Raw items from DB:", items.length, items);
            
            // Cache patients when we have data, use cache when database is empty
            if (items.length > 0) {
                console.log("[Patient Management] Patients updated from DB:", items.length);
                const patientData = items;
                // Deduplicate and Set
                const uniquePatients = Array.from(new Map(patientData.map((item: any) => [item.id, item])).values());
                console.log("[Patient Management] Unique patients:", uniquePatients.length, uniquePatients);
                queueListRef.current = uniquePatients.sort((a: any, b: any) => (a.timestamp || 0) - (b.timestamp || 0));
                setQueueList([...queueListRef.current]);
                // Cache to localStorage
                try {
                    localStorage.setItem(`vizzi_patients_manage_${user.userId}`, JSON.stringify(queueListRef.current));
                } catch (e) {
                    console.warn("Failed to cache patients to localStorage:", e);
                }
            } else {
                // Try to get from localStorage cache
                try {
                    const saved = localStorage.getItem(`vizzi_patients_manage_${user.userId}`);
                    if (saved) {
                        const cached = JSON.parse(saved);
                        console.log("[Patient Management] Using cached patients:", cached.length);
                        queueListRef.current = cached;
                        setQueueList([...cached]);
                    } else {
                        console.log("[Patient Management] No patients available (DB empty, no cache)");
                        queueListRef.current = [];
                        setQueueList([]);
                    }
                } catch (e) {
                    console.warn("Failed to load patients from localStorage:", e);
                    queueListRef.current = [];
                    setQueueList([]);
                }
            }
            
            setLastSyncTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
            setLoading(false);
        });
        return () => unsubscribe();
    }, [user, clinicId]);

    useEffect(() => {
        if (!showAdd) return;
        setFormState((prev) => {
            if (doctors.length > 0 && !prev.doctorId) {
                // Use URL doctor if available, otherwise first active doctor
                const targetDoctor = urlDoctorId 
                    ? doctors.find((d: Doctor) => d.id === urlDoctorId)
                    : doctors.find((d) => d.active) || doctors[0];
                return { ...prev, appointmentDate: selectedDate, doctorId: targetDoctor?.id || "" };
            }
            return { ...prev, appointmentDate: selectedDate };
        });
    }, [selectedDate, showAdd, doctors, urlDoctorId]);

    const getDoctorById = (doctorId: string) => doctors.find((d) => d.id === doctorId) || null;

    const selectedBounds = useMemo(() => getDayBounds(selectedDate), [selectedDate]);

    const todayQueue = useMemo(() => {
        console.log("[Patient Management] Filtering queue:", {
            totalPatients: queueList.length,
            selectedDoctorId,
            selectedDate
        });
        
        const filtered = queueList.filter((patient) => {
            const anyPatient = patient as any;
            
            if (patient.status === "completed" || patient.status === "cancelled") {
                return false;
            }
            
            if (selectedDoctorId !== "all" && anyPatient.doctorId && anyPatient.doctorId !== selectedDoctorId) {
                return false;
            }
            
            const isAppointment = patient.isAppointment || Boolean(anyPatient.appointment) || Boolean(patient.appointmentDate);
            if (isAppointment && patient.appointmentDate) {
                return patient.appointmentDate === selectedDate;
            }
            
            return patient.timestamp >= selectedBounds.start && patient.timestamp <= selectedBounds.end;
        });
        
        console.log("[Patient Management] Filtered todayQueue:", filtered.length);
        return sortQueue(filtered);
    }, [queueList, selectedDate, selectedBounds.end, selectedBounds.start, selectedDoctorId]);

    const waitingCount = todayQueue.filter((p) => p.status === "waiting").length;
    const inProgressCount = todayQueue.filter((p) => p.status === "in_progress").length;
    const attentionCount = todayQueue.filter((p) => p.status === "missed" || p.status === "not_responding").length;

    const completedToday = queueList.filter((p) => {
        if (p.status !== "completed" && p.status !== "cancelled") return false;
        return p.timestamp >= selectedBounds.start && p.timestamp <= selectedBounds.end;
    });

    const generateNextToken = (doctorId: string | null, prefixOverride?: string) => {
        const { start, end } = getDayBounds(formatDateInput(new Date()));
        const count = queueList.filter((p) => {
            if (p.timestamp < start || p.timestamp > end) return false;
            if (doctorId && (p as any).doctorId) {
                return (p as any).doctorId === doctorId;
            }
            return !doctorId;
        }).length;
        const nextNumber = count + 1;
        const formattedNumber = String(nextNumber).padStart(tokenDigits, "0");
        const prefix = (prefixOverride || tokenPrefix || "A").toString().toUpperCase();
        return `${prefix}${formattedNumber}`;
    };

    const handleAddAppointment = async () => {
        if (!user || !clinicId) return;
        if (!formState.name.trim() || !formState.appointmentDate || !formState.appointmentTime) return;
        if (doctors.length > 0 && !formState.doctorId) return;
        setSubmitting(true);
        try {
            const queueRef = collection(db, "clinics", user.userId, "queue");
            const newRef = doc(queueRef);
            const doctor = getDoctorById(formState.doctorId);
            const tokenNumber = generateNextToken(doctor?.id || null, doctor?.prefix);
            const payload: Patient = {
                id: newRef.id,
                name: formState.name.trim(),
                mobileNumber: formState.mobileNumber.trim(),
                tokenNumber,
                doctorId: doctor?.id || "",
                doctorName: doctor?.name || "",
                doctorPrefix: doctor?.prefix || tokenPrefix,
                status: "waiting",
                timestamp: Date.now(),
                cancelledAt: 0,
                isAppointment: true,
                isEmergency: formState.isEmergency,
                appointmentDate: formState.appointmentDate,
                appointmentTime: formState.appointmentTime,
                lastCalledAt: 0,
                clinicId,
            };
            await setDoc(newRef, payload);
            setFormState({
                name: "",
                mobileNumber: "",
                appointmentDate: formatDateInput(new Date()),
                appointmentTime: "09:00",
                isEmergency: false,
                doctorId: "",
            });
            setShowAdd(false);
        } finally {
            setSubmitting(false);
        }
    };

    const handleCallNext = async (patient: Patient) => {
        if (!user) return;
        try {
            const patientRef = doc(db, "clinics", user.userId, "queue", patient.id);
            await updateDoc(patientRef, {
                status: "in_progress",
                lastCalledAt: Date.now(),
            });
            
            if (soundEnabled) {
                // Play notification sound
                const audio = new Audio('/notification.mp3');
                audio.play().catch(e => console.log("Audio play failed:", e));
            }
            
            if (smsEnabled && patient.mobileNumber) {
                await sendCallSms({
                    mobile: patient.mobileNumber,
                    token: patient.tokenNumber,
                    name: patient.name
                });
            }
        } catch (error) {
            console.error("Failed to call patient:", error);
        }
    };

    const handleComplete = async (patient: Patient) => {
        if (!user) return;
        try {
            const patientRef = doc(db, "clinics", user.userId, "queue", patient.id);
            await updateDoc(patientRef, {
                status: "completed",
            });
        } catch (error) {
            console.error("Failed to complete patient:", error);
        }
    };

    const handleNotResponding = async (patient: Patient) => {
        if (!user) return;
        try {
            const patientRef = doc(db, "clinics", user.userId, "queue", patient.id);
            await updateDoc(patientRef, {
                status: "not_responding",
            });
        } catch (error) {
            console.error("Failed to mark patient as not responding:", error);
        }
    };

    const handleSkip = async (patient: Patient) => {
        if (!user) return;
        try {
            const patientRef = doc(db, "clinics", user.userId, "queue", patient.id);
            await updateDoc(patientRef, {
                status: "missed",
            });
        } catch (error) {
            console.error("Failed to skip patient:", error);
        }
    };

    const handleDelete = async (patient: Patient) => {
        if (!user) return;
        if (!confirm(`Are you sure you want to remove ${patient.name || patient.mobileNumber || "this patient"} from the queue?`)) return;
        
        try {
            const patientRef = doc(db, "clinics", user.userId, "queue", patient.id);
            await deleteDoc(patientRef);
        } catch (error) {
            console.error("Failed to delete patient:", error);
        }
    };

    // Comprehensive Queue Control Functions
    const handlePauseQueue = async () => {
        setQueuePaused(true);
        // Could add notification to all waiting patients here
        console.log("Queue paused");
    };

    const handleResumeQueue = async () => {
        setQueuePaused(false);
        // Could add notification to all waiting patients here
        console.log("Queue resumed");
    };

    const handleCallNextInQueue = async () => {
        if (queuePaused || waitingCount === 0) return;
        
        const nextPatient = filteredPatients.find(p => p.status === "waiting");
        if (nextPatient) {
            await handleCallNext(nextPatient);
            
            // Auto-call next patient if enabled
            if (autoCallEnabled && waitingCount > 1) {
                setTimeout(() => {
                    const nextNextPatient = filteredPatients.find(p => p.status === "waiting" && p.id !== nextPatient.id);
                    if (nextNextPatient && !queuePaused) {
                        handleCallNext(nextNextPatient);
                    }
                }, 30000); // 30 seconds delay
            }
        }
    };

    const handleSkipCurrentPatient = async () => {
        const currentPatient = filteredPatients.find(p => p.status === "in_progress");
        if (currentPatient) {
            await handleSkip(currentPatient);
        }
    };

    const handleCompleteCurrentPatient = async () => {
        const currentPatient = filteredPatients.find(p => p.status === "in_progress");
        if (currentPatient) {
            await handleComplete(currentPatient);
        }
    };

    const filteredPatients = useMemo(() => {
        let filtered = todayQueue;
        
        if (searchQuery) {
            filtered = filtered.filter(patient => 
                patient.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                patient.mobileNumber.includes(searchQuery) ||
                patient.tokenNumber.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }
        
        return filtered;
    }, [todayQueue, searchQuery]);

    const selectedDoctor = doctors.find(d => d.id === selectedDoctorId);
    const selectedDoctorStatus = selectedDoctor ? normalizeDoctorStatus(selectedDoctor) : null;
    const queueBlockedByDoctorStatus = selectedDoctorStatus === "ON_BREAK" || selectedDoctorStatus === "OFFLINE";
    const normalizedClinicStatus = String(clinicStatus || "OPEN").toUpperCase() === "EMERGENCY" ? "EMERGENCY_ONLY" : String(clinicStatus || "OPEN").toUpperCase();
    const clinicOverrideActive = normalizedClinicStatus === "CLOSED" || normalizedClinicStatus === "EMERGENCY_ONLY";
    const clinicOverrideMessage =
        normalizedClinicStatus === "CLOSED"
            ? "Clinic is CLOSED. New kiosk check-ins are blocked for all doctors."
            : normalizedClinicStatus === "EMERGENCY_ONLY"
                ? "Clinic is in EMERGENCY_ONLY mode. Only emergency check-ins are allowed for all doctors."
                : "";

    const updateDoctorLiveStatus = async (doctorId: string, status: "AVAILABLE" | "ON_BREAK" | "BUSY" | "OFFLINE") => {
        if (!user || !clinicId) return;
        setDoctorStatusOverride(clinicId, doctorId, status);
        setDoctorStatusOverride(user.userId, doctorId, status);
        setDoctors((prev: any[]) =>
            prev.map((d: any) => d.id === doctorId ? { ...d, status, active: status !== "OFFLINE" } : d)
        );
        // Backend Doctor schema currently doesn't include `status`; persist `active` at least.
        await setDoc(doc(db, "clinics", user.userId, "doctors", doctorId), { active: status !== "OFFLINE" }, { merge: true });
        if (clinicId !== user.userId) {
            await setDoc(doc(db, "clinics", clinicId, "doctors", doctorId), { active: status !== "OFFLINE" }, { merge: true });
        }
    };

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header */}
            <div className="bg-white border-b border-slate-200">
                <div className="max-w-full px-6 py-6">
                    {/* Top Row: Title and Status */}
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                                <Users className="w-6 h-6 text-primary" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-slate-900">
                                    {selectedDoctor ? `${selectedDoctor.name}` : 'All Doctors'} - Patient Management
                                </h1>
                                <p className="text-sm text-slate-500">
                                    {filteredPatients.length} patients in queue • {waitingCount} waiting • {inProgressCount} serving
                                </p>
                            </div>
                        </div>
                        
                        {/* Status Indicators */}
                        <div className="flex items-center gap-6">
                            {clinicOverrideActive && (
                                <div className="flex items-center gap-2">
                                    <div className={`w-2 h-2 rounded-full ${normalizedClinicStatus === "EMERGENCY_ONLY" ? "bg-rose-500" : "bg-slate-500"} animate-pulse`} />
                                    <span className="text-sm font-medium text-slate-700">
                                        Clinic Override: {normalizedClinicStatus}
                                    </span>
                                </div>
                            )}
                            <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${queuePaused ? 'bg-amber-500' : 'bg-green-500'} animate-pulse`} />
                                <span className="text-sm font-medium text-slate-600">
                                    Queue: {queuePaused ? 'Paused' : 'Active'}
                                </span>
                            </div>
                            {selectedDoctor && (
                                <div className="flex items-center gap-2">
                                    <div className={`w-2 h-2 rounded-full ${selectedDoctorStatus === "AVAILABLE" ? "bg-emerald-500" : selectedDoctorStatus === "BUSY" ? "bg-blue-500" : selectedDoctorStatus === "ON_BREAK" ? "bg-amber-500" : "bg-slate-500"} animate-pulse`} />
                                    <span className="text-sm font-medium text-slate-600">
                                        Doctor: {selectedDoctorStatus}
                                    </span>
                                </div>
                            )}
                            {autoCallEnabled && (
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                                    <span className="text-sm font-medium text-slate-600">
                                        Auto Call: ON
                                    </span>
                                </div>
                            )}
                            <div className="text-sm text-slate-500">
                                Last sync: {lastSyncTime}
                            </div>
                        </div>
                    </div>
                    
                    {/* Second Row: Control Groups */}
                    <div className="flex items-center justify-between gap-6">
                        {/* Doctor Live Status */}
                        {selectedDoctor && (
                            <div className="flex items-center gap-3">
                                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Doctor Live Status</div>
                                <select
                                    value={selectedDoctorStatus || "AVAILABLE"}
                                    onChange={(e) => updateDoctorLiveStatus(
                                        selectedDoctor.id,
                                        e.target.value as "AVAILABLE" | "ON_BREAK" | "BUSY" | "OFFLINE"
                                    )}
                                    disabled={clinicOverrideActive}
                                    className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold uppercase tracking-wider focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                    <option value="AVAILABLE">Available</option>
                                    <option value="ON_BREAK">On Break</option>
                                    <option value="BUSY">Busy</option>
                                    <option value="OFFLINE">Offline</option>
                                </select>
                                {clinicOverrideActive && (
                                    <span className="text-[11px] font-semibold text-slate-500">
                                        Overridden by clinic status
                                    </span>
                                )}
                            </div>
                        )}

                        {/* Patient Actions */}
                        <div className="flex items-center gap-3">
                            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Patient Actions</div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={handleCallNextInQueue}
                                    disabled={queuePaused || queueBlockedByDoctorStatus || waitingCount === 0}
                                    className="btn-primary flex items-center gap-2 px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <PhoneCall className="w-4 h-4" />
                                    Call Next
                                </button>
                                
                                <button
                                    onClick={handleSkipCurrentPatient}
                                    disabled={inProgressCount === 0}
                                    className="btn-secondary flex items-center gap-2 px-3 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                    title="Skip Current Patient"
                                >
                                    <SkipForward className="w-4 h-4" />
                                    Skip
                                </button>
                                
                                <button
                                    onClick={handleCompleteCurrentPatient}
                                    disabled={inProgressCount === 0}
                                    className="btn-secondary flex items-center gap-2 px-3 py-2 disabled:opacity-50 disabled:cursor-not-allowed bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100"
                                    title="Complete Current Patient"
                                >
                                    <CheckCircle2 className="w-4 h-4" />
                                    Complete
                                </button>
                                
                                <button
                                    onClick={() => setShowAdd(true)}
                                    className="btn-secondary flex items-center gap-2 px-3 py-2"
                                >
                                    <Plus className="w-4 h-4" />
                                    Add
                                </button>
                            </div>
                        </div>
                    </div>
                    {clinicOverrideActive && (
                        <div className={`mt-4 rounded-xl border px-3 py-2 text-[11px] font-semibold ${normalizedClinicStatus === "EMERGENCY_ONLY" ? "border-rose-200 bg-rose-50 text-rose-800" : "border-slate-300 bg-slate-100 text-slate-700"}`}>
                            {clinicOverrideMessage}
                        </div>
                    )}
                </div>
            </div>

            {/* Filters and Stats */}
            <div className="max-w-full px-6 py-6">
                {/* Filters Row */}
                <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        {/* Date Filter */}
                        <div>
                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 block">Date</label>
                            <input
                                type="date"
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                            />
                        </div>

                        {/* Doctor Filter */}
                        <div>
                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 block">Doctor</label>
                            <select
                                value={selectedDoctorId}
                                onChange={(e) => setSelectedDoctorId(e.target.value)}
                                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                            >
                                <option value="all">All Doctors</option>
                                {doctors.filter((d) => d.active).map((doctor) => (
                                    <option key={doctor.id} value={doctor.id}>
                                        {doctor.name} · Token {doctor.prefix || "A"}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Search */}
                        <div className="md:col-span-2">
                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 block">Search Patients</label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search by name, mobile, or token..."
                                    className="w-full pl-10 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-white rounded-xl border border-slate-200 p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-2xl font-bold text-slate-900">{waitingCount}</p>
                                <p className="text-sm text-slate-500">Waiting</p>
                            </div>
                            <div className="w-12 h-12 bg-amber-50 rounded-lg flex items-center justify-center">
                                <Clock className="w-6 h-6 text-amber-600" />
                            </div>
                        </div>
                    </div>
                    
                    <div className="bg-white rounded-xl border border-slate-200 p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-2xl font-bold text-slate-900">{inProgressCount}</p>
                                <p className="text-sm text-slate-500">Serving</p>
                            </div>
                            <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
                                <PhoneCall className="w-6 h-6 text-blue-600" />
                            </div>
                        </div>
                    </div>
                    
                    <div className="bg-white rounded-xl border border-slate-200 p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-2xl font-bold text-slate-900">{attentionCount}</p>
                                <p className="text-sm text-slate-500">Attention</p>
                            </div>
                            <div className="w-12 h-12 bg-rose-50 rounded-lg flex items-center justify-center">
                                <AlertTriangle className="w-6 h-6 text-rose-600" />
                            </div>
                        </div>
                    </div>
                    
                    <div className="bg-white rounded-xl border border-slate-200 p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-2xl font-bold text-slate-900">{filteredPatients.length}</p>
                                <p className="text-sm text-slate-500">Total</p>
                            </div>
                            <div className="w-12 h-12 bg-slate-50 rounded-lg flex items-center justify-center">
                                <Users className="w-6 h-6 text-slate-600" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Now Serving Section */}
                {inProgressCount > 0 && (
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6 mb-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse" />
                                    <h3 className="text-lg font-semibold text-blue-900">Now Serving</h3>
                                </div>
                                {filteredPatients.filter(p => p.status === "in_progress").map((patient) => (
                                    <div key={patient.id} className="flex items-center gap-4">
                                        <div className="w-16 h-16 bg-blue-100 rounded-xl flex items-center justify-center">
                                            <span className="text-2xl font-bold text-blue-700">{patient.tokenNumber}</span>
                                        </div>
                                        <div>
                                            <p className="text-xl font-bold text-slate-900">{patient.name || patient.mobileNumber || "Walk-in"}</p>
                                            <p className="text-sm text-slate-600">
                                                {patient.doctorName || "Doctor"} • Waiting {Math.round((Date.now() - patient.timestamp) / 60000)}m
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={handleCompleteCurrentPatient}
                                    className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors flex items-center gap-2"
                                >
                                    <CheckCircle2 className="w-4 h-4" />
                                    Complete
                                </button>
                                <button
                                    onClick={handleSkipCurrentPatient}
                                    className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors flex items-center gap-2"
                                >
                                    <SkipForward className="w-4 h-4" />
                                    Skip
                                </button>
                                <button
                                    onClick={() => {
                                        const currentPatient = filteredPatients.find(p => p.status === "in_progress");
                                        if (currentPatient) {
                                            handleNotResponding(currentPatient);
                                        }
                                    }}
                                    className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors flex items-center gap-2"
                                >
                                    <AlertTriangle className="w-4 h-4" />
                                    No Response
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Patient Table */}
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                    <div className="p-4 border-b border-slate-200">
                        <h2 className="text-lg font-semibold text-slate-900">
                            {selectedDoctor ? `${selectedDoctor.name}'s Queue` : 'All Patients'} 
                            <span className="ml-2 text-sm text-slate-500">({filteredPatients.length} patients)</span>
                        </h2>
                    </div>
                    
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Token</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Patient</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Mobile</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Doctor</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Type</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Wait Time</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                                {filteredPatients.map((patient) => (
                                    <tr key={patient.id} className="hover:bg-slate-50">
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-slate-100 text-sm font-bold text-slate-700">
                                                    {patient.tokenNumber}
                                                </span>
                                                {patient.isEmergency && (
                                                    <AlertTriangle className="w-4 h-4 text-rose-500" />
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div>
                                                <div className="text-sm font-medium text-slate-900">
                                                    {patient.name || "Walk-in Patient"}
                                                </div>
                                                {patient.appointmentDate && patient.appointmentTime && (
                                                    <div className="text-xs text-slate-500">
                                                        {patient.appointmentDate} at {patient.appointmentTime}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="text-sm text-slate-600">
                                                {patient.mobileNumber || "-"}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="text-sm text-slate-600">
                                                {patient.doctorName || "-"}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <span className={`inline-flex items-center justify-center w-6 h-6 rounded text-xs font-medium ${
                                                    patient.isEmergency ? 'bg-rose-100 text-rose-700' :
                                                    patient.isAppointment ? 'bg-blue-100 text-blue-700' :
                                                    'bg-slate-100 text-slate-700'
                                                }`}>
                                                    {getVisitType(patient)}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="text-sm text-slate-600">
                                                {Math.round((Date.now() - patient.timestamp) / 60000)}m
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${STATUS_STYLES[patient.status] || STATUS_STYLES.waiting}`}>
                                                {STATUS_LABELS[patient.status] || patient.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                {patient.status === "waiting" && (
                                                    <button
                                                        onClick={() => handleCallNext(patient)}
                                                        className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                                                        title="Call Next"
                                                    >
                                                        <PhoneCall className="w-4 h-4" />
                                                    </button>
                                                )}
                                                {patient.status === "in_progress" && (
                                                    <>
                                                        <button
                                                            onClick={() => handleComplete(patient)}
                                                            className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                                                            title="Complete"
                                                        >
                                                            <CheckCircle2 className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleNotResponding(patient)}
                                                            className="p-1 text-orange-600 hover:bg-orange-50 rounded"
                                                            title="Not Responding"
                                                        >
                                                            <AlertTriangle className="w-4 h-4" />
                                                        </button>
                                                    </>
                                                )}
                                                {(patient.status === "waiting" || patient.status === "in_progress") && (
                                                    <button
                                                        onClick={() => handleSkip(patient)}
                                                        className="p-1 text-rose-600 hover:bg-rose-50 rounded"
                                                        title="Skip"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => handleDelete(patient)}
                                                    className="p-1 text-slate-600 hover:bg-slate-50 rounded"
                                                    title="Remove"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        
                        {filteredPatients.length === 0 && (
                            <div className="text-center py-12">
                                <Users className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                                <p className="text-sm font-medium text-slate-600">No patients found</p>
                                <p className="text-xs text-slate-400 mt-1">
                                    {searchQuery ? "Try adjusting your search or filters" : "Patients will appear here when checked in"}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Add Patient Modal */}
            {showAdd && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl max-w-md w-full p-6">
                        <h3 className="text-lg font-semibold text-slate-900 mb-4">Add New Patient</h3>
                        
                        <div className="space-y-4">
                            {doctors.length > 0 && (
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-slate-700">Doctor</label>
                                    <select
                                        value={formState.doctorId}
                                        onChange={(e) => setFormState((prev) => ({ ...prev, doctorId: e.target.value }))}
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                                    >
                                        {doctors.filter((d) => d.active).map((doctor) => (
                                            <option key={doctor.id} value={doctor.id}>
                                                {doctor.name} · Token {doctor.prefix || "A"}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}
                            
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-slate-700">Patient Name</label>
                                <input
                                    type="text"
                                    value={formState.name}
                                    onChange={(e) => setFormState((prev) => ({ ...prev, name: e.target.value }))}
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                                    placeholder="e.g. Priya Sharma"
                                />
                            </div>
                            
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-slate-700">Mobile Number</label>
                                <input
                                    type="text"
                                    value={formState.mobileNumber}
                                    onChange={(e) => setFormState((prev) => ({ ...prev, mobileNumber: e.target.value }))}
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                                    placeholder="e.g. 9876543210"
                                />
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-slate-700">Date</label>
                                    <input
                                        type="date"
                                        value={formState.appointmentDate}
                                        onChange={(e) => setFormState((prev) => ({ ...prev, appointmentDate: e.target.value }))}
                                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                                    />
                                </div>
                                
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-slate-700">Time</label>
                                    <input
                                        type="time"
                                        value={formState.appointmentTime}
                                        onChange={(e) => setFormState((prev) => ({ ...prev, appointmentTime: e.target.value }))}
                                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                                    />
                                </div>
                            </div>
                            
                            <div className="flex items-center justify-between">
                                <label className="flex items-center gap-2 text-sm text-slate-600">
                                    <input
                                        type="checkbox"
                                        checked={formState.isEmergency}
                                        onChange={(e) => setFormState((prev) => ({ ...prev, isEmergency: e.target.checked }))}
                                        className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                                    />
                                    Mark as emergency
                                </label>
                            </div>
                        </div>
                        
                        <div className="flex items-center justify-between gap-4 mt-6">
                            <button
                                onClick={() => setShowAdd(false)}
                                className="btn-secondary flex-1 py-2.5 text-sm font-bold"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleAddAppointment}
                                disabled={
                                    submitting ||
                                    !formState.name.trim() ||
                                    !formState.appointmentDate ||
                                    !formState.appointmentTime ||
                                    (doctors.length > 0 && !formState.doctorId)
                                }
                                className="btn-primary flex-1 py-2.5 text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {submitting ? "Adding..." : "Add Patient"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
