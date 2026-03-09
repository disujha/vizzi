"use client";

import { db, collection, doc, getDoc, getDocs, setDoc, updateDoc, addDoc, deleteDoc, onSnapshot, query, where, orderBy, limit, writeBatch, uploadToStorage } from "@/lib/db";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { generateClient } from "aws-amplify/api";
import { Save, Upload, Loader2, CheckCircle2 } from "lucide-react";
import Image from "next/image";

const client = generateClient();

const LIST_CLINICS = /* GraphQL */ `
  query ListClinics($filter: ModelClinicFilterInput) {
    listClinics(filter: $filter) {
      items {
        id name clinicName doctorName currentPlan 
        signupDate status email clinicLogoUri
      }
    }
  }
`;

export default function ProfilePage() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState(false);

    const [profile, setProfile] = useState({
        name: "",
        doctorName: "",
        clinicLogoUri: "",
    });

    useEffect(() => {
        if (!user) return;
        const clinicRef = doc(db, "clinics", user.userId);
        const unsubscribe = onSnapshot(clinicRef, (snapshot) => {
            const data = snapshot.data() as any;
            if (data) {
                setProfile({
                    name: data.clinicName || data.name || "",
                    doctorName: data.doctorName || "",
                    clinicLogoUri: data.clinicLogoUri || data.clinicLogoUrl || data.logoUrl || data.logoUri || data.branding?.clinicLogoUrl || ""
                });
            }
            setLoading(false);
        });
        return () => unsubscribe();
    }, [user]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        setSaving(true);
        try {
            await setDoc(doc(db, "clinics", user.userId), {
                id: user.userId,
                name: profile.name,
                clinicName: profile.name,
                doctorName: profile.doctorName,
                clinicLogoUri: profile.clinicLogoUri,
            }, { merge: true });
            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
        } catch (err) {
            console.error(err);
        } finally {
            setSaving(false);
        }
    };

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !user) return;

        setSaving(true);
        try {
            const url = await uploadToStorage(`logos/${user.userId}/${file.name}`, file);
            setProfile({ ...profile, clinicLogoUri: url });
        } catch (err) {
            console.error(err);
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div>Loading...</div>;

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Clinic Profile</h1>
                <p className="text-slate-500">Manage your clinic identity and receptionist personality.</p>
            </div>

            <div className="medical-card p-8">
                <form onSubmit={handleSave} className="space-y-6">
                    <div className="flex items-center space-x-8 pb-8 border-b border-slate-100">
                        <div className="relative group">
                            <div className="w-24 h-24 bg-slate-100 rounded-2xl flex items-center justify-center overflow-hidden border-2 border-slate-200">
                                {profile.clinicLogoUri ? (
                                    <Image src={profile.clinicLogoUri} alt="Logo" fill className="object-cover" />
                                ) : (
                                    <Upload className="text-slate-400" />
                                )}
                            </div>
                            <input
                                type="file"
                                onChange={handleLogoUpload}
                                className="absolute inset-0 opacity-0 cursor-pointer"
                                accept="image/*"
                            />
                            <div className="absolute -bottom-2 -right-2 bg-white shadow-md p-1.5 rounded-lg border border-slate-200">
                                <Upload size={14} className="text-primary" />
                            </div>
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-900">Clinic Logo</h3>
                            <p className="text-sm text-slate-500">Upload your clinic brand logo. Recommended size: 512x512px.</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-700">Clinic Name</label>
                            <input
                                type="text"
                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                                value={profile.name}
                                onChange={e => setProfile({ ...profile, name: e.target.value })}
                                placeholder="e.g. City Health Center"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-700">Doctor Name</label>
                            <input
                                type="text"
                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                                value={profile.doctorName}
                                onChange={e => setProfile({ ...profile, doctorName: e.target.value })}
                                placeholder="e.g. Dr. Jane Smith"
                            />
                        </div>
                    </div>

                    <div className="pt-6 flex items-center justify-between">
                        <div className="flex items-center space-x-2 text-primary">
                            {success && (
                                <>
                                    <CheckCircle2 size={18} />
                                    <span className="text-sm font-medium">Changes saved successfully</span>
                                </>
                            )}
                        </div>
                        <button
                            type="submit"
                            disabled={saving}
                            className="btn-primary flex items-center space-x-2 px-8"
                        >
                            {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                            <span>Save Changes</span>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}





