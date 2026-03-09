"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { generateClient } from "aws-amplify/api";
import { db, collection, doc, getDoc, getDocs, setDoc, updateDoc, addDoc, deleteDoc, onSnapshot, query, where, orderBy, limit, writeBatch, uploadToStorage } from "@/lib/db";
import { sendCallSms } from "@/lib/sms";
import Link from "next/link";
import DoctorMonitoringPanel from "@/components/DoctorMonitoringPanel";
import { normalizeClinicStatus, normalizeDoctorStatus, pickRoundRobinDoctor, setRoundRobinPointer } from "@/lib/clinicQueue";
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
    ExternalLink,
    ArrowUp,
    ArrowDown,
    Trash2,
    ChevronUp,
    ChevronDown,
    GripVertical
} from "lucide-react";

const client = generateClient();

const LIST_CLINICS = /* GraphQL */ `
  query ListClinics($filter: ModelClinicFilterInput) {
    listClinics(filter: $filter) {
      items {
        id name clinicName doctorName email status
      }
    }
  }
`;

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
    symptoms?: string;
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

export default function PatientsPage() {
    const { user } = useAuth();
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
    const [selectedDoctorId, setSelectedDoctorId] = useState<string>("all");
    const [activeTab, setActiveTab] = useState<"queue" | "attention" | "completed">("queue");
    const [showAdd, setShowAdd] = useState(false);
    const [showPanelPreview, setShowPanelPreview] = useState(false);

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
        symptoms: "",
    });

    const [deletingId, setDeletingId] = useState<string | null>(null);

    const resolveClinicId = async () => {
        if (String(user?.userId || "").startsWith("clinic-")) return user?.userId || "";
        const email = (user?.email || (user?.username?.includes("@") ? user?.username : "") || "").toLowerCase();
        if (!user) return "";
        try {
            const res1 = await (client.graphql({ query: /* GraphQL */ `query GetClinic($id: ID!) { getClinic(id: $id) { id } }`, variables: { id: user.userId } }) as any);
            if (res1?.data?.getClinic?.id) return res1.data.getClinic.id;
            if (email) {
                const res2 = await (client.graphql({ query: /* GraphQL */ `query GetClinic($id: ID!) { getClinic(id: $id) { id } }`, variables: { id: email } }) as any);
                if (res2?.data?.getClinic?.id) return res2.data.getClinic.id;
                const res3 = await (client.graphql({ query: LIST_CLINICS, variables: { filter: { email: { eq: email } } } }) as any);
                const items = res3?.data?.listClinics?.items || [];
                if (items.length > 0) return items[0].id;
            }
        } catch (e) {
            console.warn("[Patients] Resolution failed:", e);
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
        const doctorsRef = collection(db, "clinics", clinicId, "doctors");
        const q = query(doctorsRef, orderBy("name", "asc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const items = (snapshot?.docs || []).map((docSnap: any) => {
                const data = docSnap.data() as any;
                return {
                    id: docSnap.id,
                    name: data.name || "",
                    prefix: (data.prefix || data.tokenPrefix || "A").toString().toUpperCase(),
                    active: data.active ?? true,
                    status: data.status || ((data.active ?? true) ? "AVAILABLE" : "OFFLINE"),
                } as Doctor;
            });
            console.log("[Patients] Doctors loaded:", items.length, items);
            setDoctors(items);
        });
        return unsubscribe;
    }, [user, clinicId]);

    useEffect(() => {
        if (!user || !clinicId) return;
        const queueRef = collection(db, "clinics", clinicId, "queue");
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
            console.log("[Patients] Raw items from DB:", items.length, items);

            // Cache patients when we have data, use cache when database is empty
            if (items.length > 0) {
                console.log("[Patients] Patients updated from DB:", items.length);
                const patientData = items;
                // Deduplicate and Set
                const uniquePatients = Array.from(new Map(patientData.map((item: any) => [item.id, item])).values());
                console.log("[Patients] Unique patients:", uniquePatients.length, uniquePatients);
                queueListRef.current = uniquePatients.sort((a: any, b: any) => (a.timestamp || 0) - (b.timestamp || 0));
                setQueueList([...queueListRef.current]);
                // Cache to localStorage
                try {
                    localStorage.setItem(`vizzi_patients_queue_${user.userId}`, JSON.stringify(queueListRef.current));
                } catch (e) {
                    console.warn("Failed to cache patients to localStorage:", e);
                }
            } else {
                // Try to get from localStorage cache
                try {
                    const saved = localStorage.getItem(`vizzi_patients_queue_${user.userId}`);
                    if (saved) {
                        const cached = JSON.parse(saved);
                        console.log("[Patients] Using cached patients:", cached.length);
                        queueListRef.current = cached;
                        setQueueList([...cached]);
                    } else {
                        console.log("[Patients] No patients available (DB empty, no cache)");
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
                const firstActive = doctors.find((d) => d.active) || doctors[0];
                return { ...prev, appointmentDate: selectedDate, doctorId: firstActive?.id || "" };
            }
            return { ...prev, appointmentDate: selectedDate };
        });
    }, [selectedDate, showAdd, doctors]);

    const getDoctorById = (doctorId: string) => doctors.find((d) => d.id === doctorId) || null;
    const clinicOperationalStatus = normalizeClinicStatus(clinicStatus);

    // Group patients by doctor
    const getPatientsByDoctor = (doctorId: string) => {
        const filtered = todayQueue.filter(patient => {
            if (selectedDoctorId !== "all" && selectedDoctorId !== doctorId) return false;
            return patient.doctorId === doctorId;
        });
        return filtered;
    };

    const getDoctorStats = (doctorId: string) => {
        const doctorPatients = getPatientsByDoctor(doctorId);
        const stats = {
            waiting: doctorPatients.filter(p => p.status === "waiting").length,
            inProgress: doctorPatients.filter(p => p.status === "in_progress").length,
            completed: doctorPatients.filter(p => p.status === "completed").length,
            attention: doctorPatients.filter(p => p.status === "missed" || p.status === "not_responding").length,
            total: doctorPatients.length
        };
        return stats;
    };

    const handleCallNextForDoctor = async (doctorId: string) => {
        if (!user) return;
        const doctorPatients = getPatientsByDoctor(doctorId);
        const nextPatient = doctorPatients.find((p) => p.status === "waiting");
        if (!nextPatient) return;

        // Complete current serving patient for this doctor if any
        const currentServing = doctorPatients.find(p => p.status === "in_progress");
        const batch = writeBatch(db);
        if (currentServing) {
            const currentRef = doc(db, "clinics", clinicId, "queue", currentServing.id);
            batch.update(currentRef, { status: "completed" });
        }
        const nextRef = doc(db, "clinics", clinicId, "queue", nextPatient.id);
        batch.update(nextRef, { status: "in_progress", lastCalledAt: Date.now() });
        await batch.commit();
    };

    const selectedBounds = useMemo(() => getDayBounds(selectedDate), [selectedDate]);

    const todayQueue = useMemo(() => {
        console.log("[Patients] Filtering queue:", {
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

        console.log("[Patients] Filtered todayQueue:", filtered.length);
        return sortQueue(filtered);
    }, [queueList, selectedDate, selectedBounds.end, selectedBounds.start, selectedDoctorId]);

    const waitingCount = todayQueue.filter((p) => p.status === "waiting").length;
    const inProgressCount = todayQueue.filter((p) => p.status === "in_progress").length;
    const attentionCount = todayQueue.filter((p) => p.status === "missed" || p.status === "not_responding").length;

    const completedToday = queueList.filter((p) => {
        if (p.status !== "completed" && p.status !== "cancelled") return false;
        return p.timestamp >= selectedBounds.start && p.timestamp <= selectedBounds.end;
    });

    const queueListFiltered = todayQueue.filter((p) => p.status === "waiting" || p.status === "in_progress");
    const attentionList = todayQueue.filter((p) => p.status === "missed" || p.status === "not_responding");

    const displayedPatients = activeTab === "queue" ? queueListFiltered : activeTab === "attention" ? attentionList : completedToday;

    const currentNowServing = todayQueue.find((p) => p.status === "in_progress") || null;

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

    const handleStatusUpdate = async (patientId: string, status: string, extra?: Record<string, any>) => {
        if (!user || !clinicId) return;
        const patientRef = doc(db, "clinics", clinicId, "queue", patientId);
        await updateDoc(patientRef, {
            status,
            ...extra,
        });
    };

    const handleAttend = async (patient: Patient) => {
        if (!user || !clinicId) return;

        const originalStatus = patient.status;
        const tempList = [...queueListRef.current];
        const index = tempList.findIndex(p => p.id === patient.id);
        if (index !== -1) {
            tempList[index] = { ...tempList[index], status: "in_progress", lastCalledAt: Date.now() };
            queueListRef.current = tempList;
            setQueueList([...tempList]);

            try {
                // Determine voice logic
                let callAudioUrl = patient.callAudioUrl;
                if (!callAudioUrl) {
                    const prompt = `Token number ${patient.tokenNumber}. ${patient.name || "Patient"}, please proceed to the doctor.`;
                    const res = await fetch("/api/polly", { method: "POST", body: JSON.stringify({ text: prompt, usePro: true }) });
                    const data = await res.json();
                    callAudioUrl = data.audioUrl;
                }

                // Call patient via AppSync Update
                await (client.graphql({
                    query: UPDATE_PATIENT_MUTATION,
                    variables: { input: { id: patient.id, status: "in_progress", callAudioUrl, lastCalledAt: new Date().toISOString() } }
                }) as any);

                // Write locally for immediate kiosk reaction
                const batch = writeBatch(db);
                batch.set(doc(db, "clinics", clinicId, "queue", patient.id), { status: "in_progress", callAudioUrl, lastCalledAt: Date.now() }, { merge: true });
                await batch.commit();

                // Trigger SMS Turn-calling via MSG91
                if (patient.mobileNumber) {
                    await sendCallSms({
                        mobile: patient.mobileNumber,
                        token: patient.tokenNumber,
                        name: patient.name,
                        clinicName: smsClinicName || clinicName,
                        enabled: smsEnabled
                    });
                }

            } catch (error) {
                console.error("Error calling patient:", error);
                const rollBack = [...queueListRef.current];
                const rIndex = rollBack.findIndex(p => p.id === patient.id);
                if (rIndex !== -1) {
                    rollBack[rIndex] = { ...rollBack[rIndex], status: originalStatus };
                    queueListRef.current = rollBack;
                    setQueueList([...rollBack]);
                }
            }
        }
    };
    const handleComplete = (patient: Patient) => handleStatusUpdate(patient.id, "completed");
    const handleNoShow = (patient: Patient) => {
        if (window.confirm(`Mark ${patient.name || "patient"} as No Show?`)) {
            handleStatusUpdate(patient.id, "missed");
        }
    };
    const handleNotResponding = (patient: Patient) => {
        if (window.confirm(`Mark ${patient.name || "patient"} as Not Responding?`)) {
            handleStatusUpdate(patient.id, "not_responding");
        }
    };
    const handleCancel = (patient: Patient) => {
        if (window.confirm(`Are you sure you want to cancel the appointment for ${patient.name || "patient"}?`)) {
            handleStatusUpdate(patient.id, "cancelled", { cancelledAt: Date.now() });
        }
    };

    const handleCallNext = async () => {
        if (!user || !clinicId) return;
        const nextPatient = queueListFiltered.find((p) => p.status === "waiting");
        if (!nextPatient) return;

        const batch = writeBatch(db);
        if (currentNowServing) {
            const currentRef = doc(db, "queue_patients", currentNowServing.id);
            batch.update(currentRef, { status: "completed" });
        }
        const nextRef = doc(db, "queue_patients", nextPatient.id);
        batch.update(nextRef, { status: "in_progress", lastCalledAt: Date.now() });
        await batch.commit();
    };

    const handleAddAppointment = async () => {
        if (!user || !clinicId) return;
        if (!formState.name.trim() || !formState.appointmentDate || !formState.appointmentTime) return;
        if (clinicOperationalStatus === "CLOSED") return;
        if (clinicOperationalStatus === "EMERGENCY_ONLY" && !formState.isEmergency) {
            setAiInsight("Clinic is in emergency-only mode. Mark patient as emergency to proceed.");
            return;
        }
        setSubmitting(true);
        try {
            const queueRef = collection(db, "clinics", clinicId, "queue");
            const newRef = doc(queueRef);
            const preferredDoctor = formState.doctorId ? getDoctorById(formState.doctorId) : null;
            const doctor = pickRoundRobinDoctor(clinicId, doctors, preferredDoctor?.id);
            if (!doctor) {
                setAiInsight("All doctors currently busy");
            } else {
                setRoundRobinPointer(clinicId, doctor.id);
            }
            const tokenNumber = generateNextToken(doctor?.id || null, doctor?.prefix);
            const payload: Patient = {
                id: newRef.id,
                clinicId: clinicId, // Add clinicId
                name: formState.name.trim(),
                mobileNumber: formState.mobileNumber.trim(),
                tokenNumber,
                doctorId: doctor?.id || "",
                doctorName: doctor?.name || "",
                doctorPrefix: doctor?.prefix || tokenPrefix,
                status: "waiting",
                timestamp: Date.now(),
                isAppointment: true,
                isEmergency: formState.isEmergency,
                appointmentDate: formState.appointmentDate,
                appointmentTime: formState.appointmentTime,
                lastCalledAt: 0,
                symptoms: formState.symptoms.trim(),
            };
            await setDoc(newRef, payload);
            setFormState({
                name: "",
                mobileNumber: "",
                appointmentDate: selectedDate,
                appointmentTime: "09:00",
                isEmergency: false,
                doctorId: "",
                symptoms: "",
            });
            setShowAdd(false);
        } finally {
            setSubmitting(false);
        }
    };

    const updateClinicStatus = async (status: "OPEN" | "EMERGENCY_ONLY" | "CLOSED") => {
        if (!user || !clinicId) return;
        setClinicStatus(status);
        const batch = writeBatch(db);
        const clinicIds = Array.from(new Set([clinicId, user.userId].filter(Boolean)));
        clinicIds.forEach((id) => {
            batch.set(doc(db, "clinics", id), { clinicStatus: status, status }, { merge: true });
        });

        // Sync down to all devices locally just in case
        const seenDeviceIds = new Set<string>();
        for (const id of clinicIds) {
            const devicesQuery = query(collection(db, "devices"), where("clinicId", "==", id));
            const devicesSnap = await getDocs(devicesQuery);
            devicesSnap.forEach((device) => {
                if (seenDeviceIds.has(device.id)) return;
                seenDeviceIds.add(device.id);
                batch.set(doc(db, "devices", device.id), { status }, { merge: true });
            });
        }
        await batch.commit();
    };

    const updateCheckInEnabled = async (enabled: boolean) => {
        if (!user || !clinicId) return;
        setCheckInEnabled(enabled);
        const clinicRef = doc(db, "clinics", clinicId);
        await setDoc(clinicRef, { checkInEnabled: enabled }, { merge: true });
    };

    const handleMovePatient = async (patientId: string, direction: "up" | "down", doctorId: string) => {
        if (!clinicId) return;
        const doctorQueue = todayQueue.filter(p => (p.doctorId === doctorId || (!p.doctorId && doctorId === "")));
        const index = doctorQueue.findIndex(p => p.id === patientId);
        if (index === -1) return;

        let targetIndex = direction === "up" ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= doctorQueue.length) return;

        const currentPatient = doctorQueue[index];
        const targetPatient = doctorQueue[targetIndex];

        // Swap timestamps to reorder
        const batch = writeBatch(db);
        const ref1 = doc(db, "clinics", clinicId, "queue", currentPatient.id);
        const ref2 = doc(db, "clinics", clinicId, "queue", targetPatient.id);

        batch.update(ref1, { timestamp: targetPatient.timestamp });
        batch.update(ref2, { timestamp: currentPatient.timestamp });
        await batch.commit();
    };

    const handleToggleEmergency = async (patientId: string, currentStatus: boolean) => {
        if (!clinicId) return;
        const ref = doc(db, "clinics", clinicId, "queue", patientId);
        await updateDoc(ref, { isEmergency: !currentStatus });
    };

    const handleDeletePatient = async (patientId: string) => {
        if (!clinicId) return;
        const ref = doc(db, "clinics", clinicId, "queue", patientId);
        await deleteDoc(ref);
        setDeletingId(null);
    };

    useEffect(() => {
        if (!user || !clinicId || !queueList.length) return;
        const availableDoctors = doctors.filter((d) => normalizeDoctorStatus(d) === "AVAILABLE");
        if (!availableDoctors.length) return;

        const needsReassignment = queueList.filter((p) => {
            if (p.status !== "waiting") return false;
            if (!p.doctorId) return true;
            const currentDoctor = doctors.find((d) => d.id === p.doctorId);
            return !currentDoctor || normalizeDoctorStatus(currentDoctor) !== "AVAILABLE";
        });
        if (!needsReassignment.length) return;

        const reassign = async () => {
            const batch = writeBatch(db);
            let changed = false;
            needsReassignment.forEach((patient) => {
                const nextDoctor = pickRoundRobinDoctor(clinicId, availableDoctors);
                if (!nextDoctor) return;
                changed = true;
                setRoundRobinPointer(clinicId, nextDoctor.id);
                batch.set(
                    doc(db, "clinics", clinicId, "queue", patient.id),
                    {
                        doctorId: nextDoctor.id,
                        doctorName: nextDoctor.name || "",
                        doctorPrefix: nextDoctor.prefix || tokenPrefix,
                    },
                    { merge: true }
                );
            });
            if (changed) await batch.commit();
        };
        reassign().catch((err) => console.warn("[Patients] Queue recalculation failed:", err));
    }, [user, clinicId, doctors, queueList, tokenPrefix]);

    if (!user) return null;

    return (
        <div className="space-y-6 max-w-6xl mx-auto">
            <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
                <div className="flex-1 w-full">
                    <h1 className="text-2xl font-bold text-slate-900 mb-4">
                        Patient Management
                    </h1>

                    <div className="flex flex-col lg:flex-row lg:items-center gap-4 w-full">
                        <div className="flex-1">
                            <p className="text-sm font-semibold text-slate-500 mb-2">
                                {clinicName ? toTitleCase(clinicName) : "Your Clinic"} · {doctorName ? toTitleCase(doctorName) : `Dr. ${toTitleCase((user?.email || user?.username)?.split("@")[0] || "Doctor")}`}
                            </p>

                            {/* Live Sync Indicator */}
                            <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100/60 px-3 py-1 rounded-full uppercase tracking-widest mb-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                                Live Sync: {lastSyncTime}
                            </div>

                            {/* AI Assistant Insight */}
                            <div className="bg-white border border-slate-200 rounded-xl px-4 py-2 flex items-center gap-3 shadow-sm">
                                <Sparkles size={14} className="text-indigo-500 animate-pulse" />
                                {fetchingInsight ? (
                                    <div className="h-3 bg-slate-100 rounded w-48 animate-pulse" />
                                ) : (
                                    <p className="text-[11px] font-bold text-slate-600">
                                        <span className="text-indigo-600 mr-1 italic">Vizzi AI:</span>
                                        {aiInsight || (waitingCount === 0
                                            ? "Queue is empty. Running smoothly."
                                            : `Tracking ${waitingCount} waiting patients. Prepare triage.`)}
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Status Toggles */}
                        <div className="bg-white border border-slate-200/60 rounded-2xl p-4 shadow-sm lg:w-auto">
                            <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">
                                <Activity size={12} />
                                Clinic Live Status
                                <span className="bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-sm lowercase font-medium tracking-normal border border-slate-200 ml-1">
                                    Synced
                                </span>
                            </div>
                            <div className="flex flex-wrap bg-slate-100 p-1 rounded-xl border border-slate-200/50">
                                {[
                                    { label: "Open", value: "OPEN", ringColor: "ring-emerald-200", textColor: "text-emerald-700", dot: "bg-emerald-500" },
                                    { label: "Emergency Only", value: "EMERGENCY_ONLY", ringColor: "ring-rose-200", textColor: "text-rose-700", dot: "bg-rose-500" },
                                    { label: "Closed", value: "CLOSED", ringColor: "ring-slate-200", textColor: "text-slate-700", dot: "bg-slate-500" },
                                ].map((item) => {
                                    const isActive = normalizeClinicStatus(clinicStatus) === item.value;
                                    return (
                                        <button
                                            key={item.value}
                                            onClick={() => updateClinicStatus(item.value as "OPEN" | "EMERGENCY_ONLY" | "CLOSED")}
                                            className={`relative z-10 px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider transition-all flex-1 lg:flex-none justify-center ${isActive
                                                ? `bg-white ${item.textColor} shadow-sm ring-1 ${item.ringColor}`
                                                : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
                                                }`}
                                        >
                                            {isActive && <span className={`w-1.5 h-1.5 rounded-full ${item.dot} animate-pulse shrink-0`} />}
                                            {item.label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {showAdd && (
                <div className="medical-card p-6 space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold text-slate-900">Add Appointment</h2>
                        <button
                            onClick={() => setShowAdd(false)}
                            className="text-xs text-slate-400 hover:text-slate-600"
                        >
                            Close
                        </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {doctors.length > 0 && (
                            <div className="space-y-2 md:col-span-2">
                                <label className="text-sm font-semibold text-slate-700">Doctor</label>
                                <select
                                    value={formState.doctorId}
                                    onChange={(e) => setFormState((prev) => ({ ...prev, doctorId: e.target.value }))}
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                                >
                                    <option value="">Auto assign available doctor</option>
                                    {doctors.filter((d) => d.active).map((doctor) => (
                                        <option key={doctor.id} value={doctor.id}>
                                            {doctor.name || "Doctor"} · Token {doctor.prefix || "A"} · {normalizeDoctorStatus(doctor)}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-700">Patient Name</label>
                            <input
                                type="text"
                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                                value={formState.name}
                                onChange={(e) => setFormState((prev) => ({ ...prev, name: e.target.value }))}
                                placeholder="e.g. Priya Sharma"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-700">Mobile Number</label>
                            <input
                                type="text"
                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                                value={formState.mobileNumber}
                                onChange={(e) => setFormState((prev) => ({ ...prev, mobileNumber: e.target.value }))}
                                placeholder="e.g. 9876543210"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-700">Appointment Date</label>
                            <input
                                type="date"
                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                                value={formState.appointmentDate}
                                onChange={(e) => setFormState((prev) => ({ ...prev, appointmentDate: e.target.value }))}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-700">Appointment Time</label>
                            <input
                                type="time"
                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                                value={formState.appointmentTime}
                                onChange={(e) => setFormState((prev) => ({ ...prev, appointmentTime: e.target.value }))}
                            />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                            <label className="text-sm font-semibold text-slate-700">Symptoms / Complaints</label>
                            <textarea
                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all resize-none h-20"
                                value={formState.symptoms}
                                onChange={(e) => setFormState((prev) => ({ ...prev, symptoms: e.target.value }))}
                                placeholder="e.g. Chronic cough, fever since 2 days..."
                            />
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <label className="flex items-center gap-2 text-sm text-slate-600">
                            <input
                                type="checkbox"
                                checked={formState.isEmergency}
                                onChange={(e) => setFormState((prev) => ({ ...prev, isEmergency: e.target.checked }))}
                                className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                            />
                            Mark as emergency
                        </label>
                        <button
                            onClick={handleAddAppointment}
                            disabled={
                                submitting ||
                                !formState.name.trim() ||
                                !formState.appointmentDate ||
                                !formState.appointmentTime
                            }
                            className="btn-primary flex items-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {submitting ? "Adding..." : "Add to Queue"}
                        </button>
                    </div>
                </div>
            )}

            {/* Doctor Monitoring Panel */}
            <DoctorMonitoringPanel
                doctors={doctors}
                patients={todayQueue}
                onDoctorManage={(doctorId) => window.open(`/dashboard/patients-manage?doctorId=${doctorId}`, '_blank')}
            />

            {/* Patient Monitoring Section (Segmented by Doctor) */}
            <div className="space-y-8">
                <div className="flex items-center gap-2 mb-4">
                    <MonitorUp size={20} className="text-primary" />
                    <h2 className="text-xl font-bold text-slate-900">Patient Monitoring</h2>
                    <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full ml-2">Today</span>
                </div>

                {doctors.length > 0 ? (
                    doctors.map((doctor) => {
                        const doctorPatients = [...todayQueue, ...completedToday].filter(p => p.doctorId === doctor.id);
                        if (doctorPatients.length === 0) return null;

                        return (
                            <div key={doctor.id} className="medical-card p-6 border-l-4 border-l-primary/40">
                                <div className="flex items-center justify-between mb-6">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-primary/10 rounded-lg">
                                            <Stethoscope size={18} className="text-primary" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-slate-900">{doctor.name}</h3>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Token Prefix: {doctor.prefix || "A"}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="text-right">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Queue Status</p>
                                            <p className="text-xs font-bold text-primary">{doctorPatients.filter(p => p.status === 'waiting').length} Waiting</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="overflow-x-auto">
                                    <table className="min-w-full text-left">
                                        <thead>
                                            <tr className="border-b border-slate-100">
                                                <th className="pb-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Token</th>
                                                <th className="pb-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Patient</th>
                                                <th className="pb-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Mobile</th>
                                                <th className="pb-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Symptoms</th>
                                                <th className="pb-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Time</th>
                                                <th className="pb-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50">
                                            {doctorPatients.sort((a, b) => {
                                                if (a.status === "completed" && b.status !== "completed") return 1;
                                                if (a.status !== "completed" && b.status === "completed") return -1;
                                                return a.timestamp - b.timestamp;
                                            }).map((p, idx, arr) => (
                                                <tr key={p.id} className={`group hover:bg-slate-50/50 transition-colors ${p.status === 'completed' ? 'opacity-60' : ''}`}>
                                                    <td className="py-4 font-bold text-primary">
                                                        <div className="flex items-center gap-2">
                                                            {p.isEmergency && (
                                                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" title="Emergency" />
                                                            )}
                                                            {p.tokenNumber}
                                                        </div>
                                                    </td>
                                                    <td className="py-4">
                                                        <p className="font-bold text-slate-900">{p.name || "Unknown"}</p>
                                                        {p.isEmergency && <span className="text-[9px] font-black text-rose-500 uppercase tracking-tighter">Emergency</span>}
                                                    </td>
                                                    <td className="py-4 text-slate-500 font-medium text-xs">{p.mobileNumber}</td>
                                                    <td className="py-4 max-w-[150px]">
                                                        <p className="text-xs text-slate-600 line-clamp-1 italic" title={p.symptoms}>
                                                            {p.symptoms || "No symptoms recorded"}
                                                        </p>
                                                    </td>
                                                    <td className="py-4 text-xs text-slate-400 font-bold">{formatTime(p.timestamp)}</td>
                                                    <td className="py-4">
                                                        <div className="flex items-center justify-end gap-1">
                                                            {p.status !== 'completed' && (
                                                                <>
                                                                    <button
                                                                        onClick={() => handleAttend(p)}
                                                                        disabled={p.status === 'in_progress'}
                                                                        className={`p-1.5 rounded-lg transition-colors ${p.status === 'in_progress' ? 'bg-amber-100 text-amber-600' : 'bg-primary/10 text-primary hover:bg-primary/20'}`}
                                                                        title="Call Patient"
                                                                    >
                                                                        <PhoneCall size={14} />
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleToggleEmergency(p.id, p.isEmergency)}
                                                                        className={`p-1.5 rounded-lg transition-colors ${p.isEmergency ? 'bg-rose-100 text-rose-600' : 'text-slate-400 hover:bg-slate-100'}`}
                                                                        title="Toggle Emergency"
                                                                    >
                                                                        <AlertTriangle size={14} />
                                                                    </button>
                                                                    <div className="flex flex-col">
                                                                        <button
                                                                            onClick={() => handleMovePatient(p.id, "up", doctor.id)}
                                                                            disabled={idx === 0}
                                                                            className="p-1 text-slate-400 hover:text-primary disabled:opacity-30"
                                                                            title="Move Up"
                                                                        >
                                                                            <ChevronUp size={14} />
                                                                        </button>
                                                                        <button
                                                                            onClick={() => handleMovePatient(p.id, "down", doctor.id)}
                                                                            disabled={idx === arr.length - 1 || arr[idx + 1].status === 'completed'}
                                                                            className="p-1 text-slate-400 hover:text-primary disabled:opacity-30"
                                                                            title="Move Down"
                                                                        >
                                                                            <ChevronDown size={14} />
                                                                        </button>
                                                                    </div>
                                                                </>
                                                            )}
                                                            {deletingId !== p.id ? (
                                                                <button
                                                                    onClick={() => setDeletingId(p.id)}
                                                                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                                                    title="Remove from Queue"
                                                                >
                                                                    <Trash2 size={14} />
                                                                </button>
                                                            ) : (
                                                                <div className="flex items-center gap-1 animate-in slide-in-from-right-2 duration-300">
                                                                    <span className="text-[9px] font-bold text-rose-500 uppercase tracking-tighter mr-1">Confirm?</span>
                                                                    <button
                                                                        onClick={() => handleDeletePatient(p.id)}
                                                                        className="px-2 py-1 bg-rose-500 text-white text-[10px] font-bold rounded-lg hover:bg-rose-600 transition-colors"
                                                                    >
                                                                        YES
                                                                    </button>
                                                                    <button
                                                                        onClick={() => setDeletingId(null)}
                                                                        className="px-2 py-1 bg-slate-100 text-slate-500 text-[10px] font-bold rounded-lg hover:bg-slate-200 transition-colors"
                                                                    >
                                                                        NO
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <div className="medical-card p-12 text-center bg-slate-50/50 border-dashed">
                        <Users size={48} className="text-slate-200 mx-auto mb-4" />
                        <p className="text-slate-500">No active patient activity for today.</p>
                    </div>
                )}
            </div>

            {/* No Doctors Added */}
            {
                doctors.length === 0 && (
                    <div className="medical-card p-12 text-center">
                        <Stethoscope size={64} className="text-slate-200 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-slate-800 mb-2">No Doctors Added</h3>
                        <p className="text-sm text-slate-500 mb-6">Add doctors in clinic settings to manage patient queues per doctor</p>
                        <button
                            onClick={() => window.location.href = "/dashboard/settings?tab=doctors"}
                            className="btn-primary flex items-center gap-2 mx-auto"
                        >
                            <UserPlus size={18} />
                            Add Doctor
                        </button>
                    </div>
                )
            }
        </div >
    );
}


