"use client";

import { db, collection, doc, getDoc, getDocs, setDoc, updateDoc, addDoc, deleteDoc, onSnapshot, query, where, orderBy, limit, writeBatch, uploadToStorage } from "@/lib/db";

import { useEffect, useState } from "react";
import { LifeBuoy, Mail, MessageCircle, Send, UserX } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

type SupportMessage = {
  id: string;
  clinicId: string;
  doctorName: string;
  clinicName: string;
  message: string;
  response?: string | null;
  status: string;
  timestamp: number;
};

export default function SupportPage() {
  const { user } = useAuth();
  const [clinicName, setClinicName] = useState("");
  const [doctorName, setDoctorName] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [history, setHistory] = useState<SupportMessage[]>([]);
  const [deletionRequest, setDeletionRequest] = useState<any | null>(null);

  useEffect(() => {
    if (!user) return;
    const docRef = doc(db, "clinics", user.userId);
    getDoc(docRef).then((snap) => {
      if (!snap.exists()) return;
      const data = snap.data() as any;
      setClinicName(data.clinicName || data.name || "");
      setDoctorName(data.doctorName || "");
    });
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "support"),
      where("clinicId", "==", user.userId),
      orderBy("timestamp", "desc")
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map((docSnap: any) => {
        const data = docSnap.data() as any;
        return {
          id: docSnap.id,
          clinicId: data.clinicId || "",
          doctorName: data.doctorName || "",
          clinicName: data.clinicName || "",
          message: data.message || "",
          response: data.response || null,
          status: data.status || "pending",
          timestamp: Number(data.timestamp || 0),
        } as SupportMessage;
      });
      setHistory(items);
    });
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "account_deletion_requests"),
      where("clinicId", "==", user.userId),
      orderBy("timestamp", "desc"),
      limit(1)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const latest = snapshot.docs[0]?.data() || null;
      setDeletionRequest(latest);
    });
    return () => unsubscribe();
  }, [user]);

  const submitRequest = async () => {
    if (!user || !message.trim()) return;
    setSubmitting(true);
    try {
      await addDoc(collection(db, "support"), {
        clinicId: user.userId,
        doctorName: doctorName || "Doctor",
        clinicName: clinicName || "Clinic",
        message: message.trim(),
        response: null,
        status: "pending",
        timestamp: Date.now(),
      });
      setMessage("");
    } finally {
      setSubmitting(false);
    }
  };


  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Support</h1>
        <p className="text-slate-500">We are here to help with setup, billing, and device issues.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="medical-card p-6 space-y-4">
          <div className="flex items-center gap-2">
            <LifeBuoy size={18} className="text-primary" />
            <h2 className="text-lg font-semibold text-slate-900">Quick Support</h2>
          </div>
          <p className="text-sm text-slate-600">Reach us instantly through WhatsApp or email.</p>
          <div className="flex flex-wrap gap-3">
            <a
              href="https://api.whatsapp.com/send?phone=919082205249"
              target="_blank"
              rel="noreferrer"
              className="btn-primary flex items-center gap-2"
            >
              <MessageCircle size={18} />
              WhatsApp Support
            </a>
            <a
              href="mailto:support@rethela.com?subject=Support%20Request%20-%20Vizzi%20App"
              className="btn-secondary flex items-center gap-2"
            >
              <Mail size={18} />
              Email Support
            </a>
          </div>
          <div className="text-xs text-slate-500">
            WhatsApp: +91 9082205249 · Email: support@rethela.com
          </div>
        </div>

        <div className="medical-card p-6 space-y-4">
          <div className="flex items-center gap-2">
            <LifeBuoy size={18} className="text-primary" />
            <h2 className="text-lg font-semibold text-slate-900">Submit a Request</h2>
          </div>
          <p className="text-sm text-slate-600">
            Share your clinic name, device ID, and the issue so we can resolve it faster.
          </p>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Describe your issue"
            rows={4}
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl"
          />
          <button
            onClick={submitRequest}
            disabled={submitting || !message.trim()}
            className="btn-primary flex items-center gap-2"
          >
            <Send size={18} />
            {submitting ? "Sending..." : "Send Request"}
          </button>
        </div>
      </div>

      <div className="medical-card p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Support History</h2>
            <p className="text-xs text-slate-500">Track past requests and responses.</p>
          </div>
        </div>
        {history.length === 0 ? (
          <div className="text-sm text-slate-400">No support requests yet.</div>
        ) : (
          <div className="space-y-3">
            {history.map((item) => (
              <div key={item.id} className="medical-card p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-slate-900">{item.message}</p>
                  <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full ${item.status === "responded"
                    ? "bg-emerald-50 text-emerald-700"
                    : item.status === "closed"
                      ? "bg-slate-100 text-slate-500"
                      : "bg-amber-50 text-amber-700"
                    }`}>
                    {item.status}
                  </span>
                </div>
                {item.response && (
                  <div className="mt-2 text-xs text-slate-500">
                    Response: {item.response}
                  </div>
                )}
                <div className="mt-2 text-[11px] text-slate-400">
                  {item.timestamp ? new Date(item.timestamp).toLocaleString() : "--"}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div id="account-deletion" className="medical-card p-6 border-t-2 border-slate-100/50 mt-12 space-y-3">
        <div className="flex items-center gap-2">
          <UserX size={18} className="text-rose-600" />
          <h2 className="text-lg font-semibold text-slate-900">Account Deletion Request</h2>
        </div>
        <p className="text-sm text-slate-600">
          Need to delete your Vizzi account? Confirm below and we will process it after 15 days.
        </p>
        {deletionRequest ? (
          <div className="medical-card bg-slate-50/50 p-4 text-sm text-slate-600">
            <div className="font-semibold text-slate-900">Request submitted</div>
            <div className="mt-1">
              Status: <span className="font-semibold">{deletionRequest.status || "pending"}</span>
            </div>
            <div className="mt-1">
              Submitted: {deletionRequest.timestamp ? new Date(deletionRequest.timestamp).toLocaleString() : "--"}
            </div>
            <div className="mt-1">
              Scheduled for: {deletionRequest.scheduledFor ? new Date(deletionRequest.scheduledFor).toLocaleString() : "--"}
            </div>
          </div>
        ) : (
          <a
            href="/account-deletion"
            target="_blank"
            rel="noreferrer"
            className="btn-secondary inline-flex items-center gap-2"
          >
            <UserX size={18} />
            Open Deletion Request Page
          </a>
        )}
      </div>
    </div>
  );
}






