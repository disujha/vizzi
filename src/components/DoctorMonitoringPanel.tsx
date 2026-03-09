"use client";

import { useMemo } from "react";
import { Users, Clock, Activity, AlertTriangle, PhoneCall, ArrowRight } from "lucide-react";

type Patient = {
    id: string;
    name: string;
    tokenNumber: string;
    mobileNumber: string;
    status: string;
    timestamp: number;
    doctorId?: string;
    doctorName?: string;
    isAppointment: boolean;
    isEmergency: boolean;
    appointmentDate: string;
    appointmentTime: string;
    lastCalledAt: number;
};

type Doctor = {
    id: string;
    name: string;
    prefix: string;
    active: boolean;
};

interface DoctorMonitoringPanelProps {
    doctors: Doctor[];
    patients: Patient[];
    onDoctorManage: (doctorId: string) => void;
}

const STATUS_LABELS: Record<string, string> = {
    waiting: "Waiting",
    in_progress: "Serving",
    completed: "Completed",
    missed: "Skipped",
    not_responding: "No Response",
    cancelled: "Cancelled",
};

const normalizePrefix = (value: string) => (value || "").trim().toUpperCase();

const patientBelongsToDoctor = (patient: Patient, doctor: Doctor) => {
    if (patient.doctorId && patient.doctorId === doctor.id) return true;
    const token = (patient.tokenNumber || "").trim().toUpperCase();
    const prefix = normalizePrefix(doctor.prefix || "");
    if (!token || !prefix) return false;
    return token.startsWith(prefix);
};

const getDoctorStats = (doctor: Doctor, patients: Patient[]) => {
    const doctorPatients = patients.filter((p) => patientBelongsToDoctor(p, doctor));
    const stats = {
        waiting: doctorPatients.filter(p => p.status === "waiting").length,
        inProgress: doctorPatients.filter(p => p.status === "in_progress").length,
        completed: doctorPatients.filter(p => p.status === "completed").length,
        attention: doctorPatients.filter(p => p.status === "missed" || p.status === "not_responding").length,
        total: doctorPatients.length,
    };
    
    // Calculate estimated wait time (assuming 10 minutes per patient)
    const avgConsultTime = 10; // minutes
    const estimatedWaitTime = stats.waiting * avgConsultTime;
    
    // Get current serving patient
    const nowServing = doctorPatients.find(p => p.status === "in_progress");
    
    // Get next up patient
    const nextUp = doctorPatients.find(p => p.status === "waiting");
    
    return { stats, estimatedWaitTime, nowServing, nextUp };
};

const formatWaitTime = (minutes: number) => {
    if (minutes < 60) {
        return `${minutes}m`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
};

const getProgressPercentage = (stats: any) => {
    const totalProcessed = stats.completed + stats.attention;
    const totalPatients = stats.total;
    if (totalPatients === 0) return 0;
    return Math.round((totalProcessed / totalPatients) * 100);
};

const getDoctorStatusColor = (stats: any) => {
    if (stats.inProgress > 0) return "border-blue-500 bg-blue-50";
    if (stats.waiting > 0) return "border-amber-500 bg-amber-50";
    if (stats.attention > 0) return "border-rose-500 bg-rose-50";
    return "border-slate-300 bg-slate-50";
};

const getDoctorStatusIcon = (stats: any) => {
    if (stats.inProgress > 0) return <PhoneCall className="w-4 h-4 text-blue-600" />;
    if (stats.waiting > 0) return <Clock className="w-4 h-4 text-amber-600" />;
    if (stats.attention > 0) return <AlertTriangle className="w-4 h-4 text-rose-600" />;
    return <Activity className="w-4 h-4 text-slate-600" />;
};

export default function DoctorMonitoringPanel({ doctors, patients, onDoctorManage }: DoctorMonitoringPanelProps) {
    const activeDoctors = doctors.filter(d => d.active);
    
    const overallStats = useMemo(() => {
        return {
            totalDoctors: activeDoctors.length,
            totalPatients: patients.length,
            totalWaiting: patients.filter(p => p.status === "waiting").length,
            totalServing: patients.filter(p => p.status === "in_progress").length,
            totalCompleted: patients.filter(p => p.status === "completed").length,
            totalAttention: patients.filter(p => p.status === "missed" || p.status === "not_responding").length,
        };
    }, [activeDoctors, patients]);

    return (
        <div className="space-y-6">
            {/* Overall Stats */}
            <div className="bg-gradient-to-r from-slate-50 to-white rounded-xl border border-slate-200 p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-slate-900">Clinic Overview</h3>
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                        <Activity className="w-4 h-4" />
                        Live Monitoring
                    </div>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div className="text-center">
                        <div className="text-2xl font-bold text-slate-900">{overallStats.totalDoctors}</div>
                        <div className="text-xs text-slate-500">Active Doctors</div>
                    </div>
                    <div className="text-center">
                        <div className="text-2xl font-bold text-amber-600">{overallStats.totalWaiting}</div>
                        <div className="text-xs text-slate-500">Waiting</div>
                    </div>
                    <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">{overallStats.totalServing}</div>
                        <div className="text-xs text-slate-500">Serving</div>
                    </div>
                    <div className="text-center">
                        <div className="text-2xl font-bold text-rose-600">{overallStats.totalAttention}</div>
                        <div className="text-xs text-slate-500">Attention</div>
                    </div>
                    <div className="text-center">
                        <div className="text-2xl font-bold text-emerald-600">{overallStats.totalCompleted}</div>
                        <div className="text-xs text-slate-500">Completed</div>
                    </div>
                </div>
            </div>

            {/* Doctor Monitoring Bars */}
            <div className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-900">Doctor Activity Monitor</h3>
                
                {activeDoctors.length === 0 ? (
                    <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
                        <Users className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                        <p className="text-lg font-semibold text-slate-600">No Active Doctors</p>
                        <p className="text-sm text-slate-400 mt-2">Add doctors to start monitoring their activity</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {activeDoctors.map((doctor) => {
                            const { stats, estimatedWaitTime, nowServing, nextUp } = getDoctorStats(doctor, patients);
                            const progressPercentage = getProgressPercentage(stats);
                            const statusColor = getDoctorStatusColor(stats);
                            const statusIcon = getDoctorStatusIcon(stats);
                            
                            return (
                                <div
                                    key={doctor.id}
                                    className={`bg-white rounded-xl border-2 ${statusColor} p-4 transition-all hover:shadow-md`}
                                >
                                    <div className="flex items-center justify-between">
                                        {/* Doctor Info */}
                                        <div className="flex items-center gap-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-12 h-12 bg-white rounded-lg border border-slate-200 flex items-center justify-center">
                                                    <span className="text-lg font-bold text-slate-700">{doctor.prefix || "A"}</span>
                                                </div>
                                                <div>
                                                    <h4 className="font-semibold text-slate-900">Dr. {doctor.name}</h4>
                                                    <div className="flex items-center gap-2 text-sm text-slate-500">
                                                        {statusIcon}
                                                        <span>
                                                            {stats.inProgress > 0 ? "Serving" : 
                                                             stats.waiting > 0 ? "Available" : 
                                                             stats.attention > 0 ? "Attention Needed" : "Idle"}
                                                        </span>
                                                        {stats.waiting > 0 && (
                                                            <span>• {estimatedWaitTime}m wait</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Current Status */}
                                        <div className="flex items-center gap-6">
                                            {/* Now Serving */}
                                            {nowServing && (
                                                <div className="flex items-center gap-2">
                                                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                                                        <span className="text-xs font-bold text-blue-700">{nowServing.tokenNumber}</span>
                                                    </div>
                                                    <div>
                                                        <div className="text-sm font-medium text-slate-900">{nowServing.name || "Patient"}</div>
                                                        <div className="text-xs text-slate-500">Now serving</div>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Next Up */}
                                            {nextUp && !nowServing && (
                                                <div className="flex items-center gap-2">
                                                    <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
                                                        <span className="text-xs font-bold text-amber-700">{nextUp.tokenNumber}</span>
                                                    </div>
                                                    <div>
                                                        <div className="text-sm font-medium text-slate-900">{nextUp.name || "Patient"}</div>
                                                        <div className="text-xs text-slate-500">Next up</div>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Stats */}
                                            <div className="flex items-center gap-4 text-sm">
                                                <div className="text-center">
                                                    <div className="font-bold text-slate-900">{stats.waiting}</div>
                                                    <div className="text-xs text-slate-500">Waiting</div>
                                                </div>
                                                <div className="text-center">
                                                    <div className="font-bold text-slate-900">{stats.inProgress}</div>
                                                    <div className="text-xs text-slate-500">Serving</div>
                                                </div>
                                                <div className="text-center">
                                                    <div className="font-bold text-slate-900">{stats.attention}</div>
                                                    <div className="text-xs text-slate-500">Attention</div>
                                                </div>
                                            </div>

                                            {/* Progress Bar */}
                                            <div className="w-24">
                                                <div className="text-xs text-slate-500 mb-1">Progress</div>
                                                <div className="w-full bg-slate-200 rounded-full h-2">
                                                    <div 
                                                        className="bg-emerald-500 h-2 rounded-full transition-all"
                                                        style={{ width: `${progressPercentage}%` }}
                                                    />
                                                </div>
                                                <div className="text-xs text-slate-500 mt-1">{progressPercentage}%</div>
                                            </div>

                                            {/* Manage Button */}
                                            <button
                                                onClick={() => onDoctorManage(doctor.id)}
                                                className="btn-primary flex items-center gap-2 px-4 py-2 text-sm"
                                            >
                                                Manage
                                                <ArrowRight className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
