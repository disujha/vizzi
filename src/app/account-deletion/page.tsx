"use client";

import { db, collection, doc, getDoc, getDocs, setDoc, updateDoc, addDoc, deleteDoc, onSnapshot, query, where, orderBy, limit, writeBatch, uploadToStorage } from "@/lib/db";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { UserX } from "lucide-react";

export default function AccountDeletionPage() {
    const { user } = useAuth();
    const [clinicName, setClinicName] = useState("");
    const [doctorName, setDoctorName] = useState("");
    const [email, setEmail] = useState("");
    const [selectedReasons, setSelectedReasons] = useState<string[]>([]);
    const [confirmChecked, setConfirmChecked] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState("");

    const deletionReasons = useMemo(
        () => [
            "No longer using Vizzi",
            "Clinic closing or moving",
            "Switched to another system",
            "Too expensive",
            "Missing features",
            "Other",
        ],
        []
    );

    useEffect(() => {
        if (!user) return;
        setEmail(user.username || "");
    }, [user]);

    const submitDeletionRequest = async () => {
        setError("");
        if (!confirmChecked || selectedReasons.length === 0) return;
        const nextEmail = (email || "").trim();
        if (!nextEmail) {
            setError("Email is required to submit the request.");
            return;
        }
        if (!window.confirm("Are you sure you want to request account deletion? This will be processed after 15 days.")) {
            return;
        }
        setDeleting(true);
        try {
            const now = Date.now();
            await addDoc(collection(db, "account_deletion_requests"), {
                clinicId: user?.userId || "",
                doctorName: doctorName.trim() || "Doctor",
                clinicName: clinicName.trim() || "Clinic",
                email: nextEmail,
                reasons: selectedReasons,
                status: "pending",
                timestamp: now,
                scheduledFor: now + 15 * 24 * 60 * 60 * 1000,
                requestedBy: user ? "authenticated" : "public",
            });
            setSuccess(true);
        } catch (err: any) {
            setError(err?.message || "Unable to submit request. Please try again later.");
        } finally {
            setDeleting(false);
        }
    };

    return (
        <div className="mx-auto max-w-3xl space-y-6 py-10 px-4">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Account Deletion Request</h1>
                <p className="text-slate-500">Submit a deletion request. Processing starts after 15 days.</p>
            </div>

            <div className="medical-card p-6 space-y-4">
                <div className="flex items-center gap-2">
                    <UserX size={18} className="text-rose-600" />
                    <h2 className="text-lg font-semibold text-slate-900">Confirm Deletion</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Clinic Name</label>
                        <input
                            value={clinicName}
                            onChange={(e) => setClinicName(e.target.value)}
                            placeholder="Clinic name"
                            className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
                        />
                    </div>
                    <div>
                        <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Doctor Name</label>
                        <input
                            value={doctorName}
                            onChange={(e) => setDoctorName(e.target.value)}
                            placeholder="Doctor name"
                            className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
                        />
                    </div>
                </div>

                <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Registered Email</label>
                    <input
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@clinic.com"
                        className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
                    />
                    <p className="mt-2 text-xs text-slate-500">Enter the email address registered with your Vizzi account.</p>
                </div>

                <div className="rounded-2xl border border-slate-100 bg-white p-4">
                    <p className="text-sm font-semibold text-slate-900">Reason for deletion</p>
                    <p className="text-xs text-slate-500 mt-1">Select at least one reason.</p>
                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {deletionReasons.map((reason) => {
                            const checked = selectedReasons.includes(reason);
                            return (
                                <label
                                    key={reason}
                                    className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm ${
                                        checked ? "border-primary bg-primary/5 text-slate-900" : "border-slate-200 text-slate-600"
                                    }`}
                                >
                                    <input
                                        type="checkbox"
                                        checked={checked}
                                        onChange={(e) => {
                                            setSelectedReasons((prev) =>
                                                e.target.checked ? [...prev, reason] : prev.filter((item) => item !== reason)
                                            );
                                        }}
                                        className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                                    />
                                    {reason}
                                </label>
                            );
                        })}
                    </div>
                </div>

                <label className="flex items-start gap-3 text-sm text-slate-600">
                    <input
                        type="checkbox"
                        checked={confirmChecked}
                        onChange={(e) => setConfirmChecked(e.target.checked)}
                        className="mt-1 h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                    />
                    I understand this will permanently delete my clinic data after 15 days.
                </label>

                {error && <div className="text-sm text-rose-600">{error}</div>}
                {success && (
                    <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-3 text-sm text-emerald-700">
                        Request submitted. We will process it after 15 days.
                    </div>
                )}

                <button
                    onClick={submitDeletionRequest}
                    disabled={!confirmChecked || deleting || selectedReasons.length === 0}
                    className="btn-secondary inline-flex items-center gap-2"
                >
                    <UserX size={18} />
                    {deleting ? "Submitting..." : "Request Account Deletion"}
                </button>

                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm text-slate-600">
                    Deletion requests are verified and processed after 15 days. You can cancel the request by contacting
                    support before it is processed.
                </div>
            </div>
        </div>
    );
}






