export type ClinicOperationalStatus = "OPEN" | "EMERGENCY_ONLY" | "CLOSED";
export type DoctorOperationalStatus = "AVAILABLE" | "ON_BREAK" | "BUSY" | "OFFLINE";

type DoctorLike = {
    id: string;
    name?: string;
    prefix?: string;
    active?: boolean;
    status?: string;
};

const RR_KEY_PREFIX = "vizzi_rr_doctor_";
const DOCTOR_STATUS_KEY_PREFIX = "vizzi_doctor_status_";
const CLINIC_STATUS_KEY_PREFIX = "vizzi_clinic_status_";

export const normalizeClinicStatus = (raw: string | undefined | null): ClinicOperationalStatus => {
    const value = String(raw || "OPEN").toUpperCase().trim();
    if (value === "EMERGENCY" || value === "EMERGENCY_ONLY") return "EMERGENCY_ONLY";
    if (value === "CLOSED") return "CLOSED";
    return "OPEN";
};

export const normalizeDoctorStatus = (doctor: DoctorLike): DoctorOperationalStatus => {
    const raw = String(doctor?.status || "").toUpperCase().trim();
    if (raw === "AVAILABLE" || raw === "ON_BREAK" || raw === "BUSY" || raw === "OFFLINE") return raw;
    if (doctor?.active === false) return "OFFLINE";
    return "AVAILABLE";
};

export const canReceiveNewPatients = (doctor: DoctorLike) => normalizeDoctorStatus(doctor) === "AVAILABLE";

export const sortDoctorsForAssignment = <T extends DoctorLike>(doctors: T[]): T[] => {
    return [...doctors].sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));
};

export const getRoundRobinPointer = (clinicId: string): string => {
    if (typeof window === "undefined" || !clinicId) return "";
    try {
        return localStorage.getItem(`${RR_KEY_PREFIX}${clinicId}`) || "";
    } catch {
        return "";
    }
};

export const setRoundRobinPointer = (clinicId: string, doctorId: string): void => {
    if (typeof window === "undefined" || !clinicId || !doctorId) return;
    try {
        localStorage.setItem(`${RR_KEY_PREFIX}${clinicId}`, doctorId);
    } catch {
        // Ignore localStorage failures.
    }
};

export const getDoctorStatusOverride = (
    clinicId: string,
    doctorId: string
): DoctorOperationalStatus | null => {
    if (typeof window === "undefined" || !clinicId || !doctorId) return null;
    try {
        const raw = localStorage.getItem(`${DOCTOR_STATUS_KEY_PREFIX}${clinicId}_${doctorId}`);
        if (!raw) return null;
        const normalized = raw.toUpperCase().trim();
        if (normalized === "AVAILABLE" || normalized === "ON_BREAK" || normalized === "BUSY" || normalized === "OFFLINE") {
            return normalized;
        }
        return null;
    } catch {
        return null;
    }
};

export const setDoctorStatusOverride = (
    clinicId: string,
    doctorId: string,
    status: DoctorOperationalStatus
): void => {
    if (typeof window === "undefined" || !clinicId || !doctorId) return;
    try {
        localStorage.setItem(`${DOCTOR_STATUS_KEY_PREFIX}${clinicId}_${doctorId}`, status);
    } catch {
        // Ignore localStorage failures.
    }
};

export const getClinicStatusOverride = (clinicId: string): ClinicOperationalStatus | null => {
    if (typeof window === "undefined" || !clinicId) return null;
    try {
        const raw = localStorage.getItem(`${CLINIC_STATUS_KEY_PREFIX}${clinicId}`);
        if (!raw) return null;
        return normalizeClinicStatus(raw);
    } catch {
        return null;
    }
};

export const setClinicStatusOverride = (clinicId: string, status: ClinicOperationalStatus): void => {
    if (typeof window === "undefined" || !clinicId) return;
    try {
        localStorage.setItem(`${CLINIC_STATUS_KEY_PREFIX}${clinicId}`, status);
    } catch {
        // Ignore localStorage failures.
    }
};

export const pickRoundRobinDoctor = <T extends DoctorLike>(
    clinicId: string,
    doctors: T[],
    preferredDoctorId?: string
): T | null => {
    const available = sortDoctorsForAssignment(doctors.filter(canReceiveNewPatients));
    if (!available.length) return null;

    if (preferredDoctorId) {
        const preferred = available.find((d) => d.id === preferredDoctorId);
        if (preferred) return preferred;
    }

    const pointer = getRoundRobinPointer(clinicId);
    if (!pointer) return available[0];

    const idx = available.findIndex((d) => d.id === pointer);
    if (idx < 0) return available[0];
    return available[(idx + 1) % available.length];
};
