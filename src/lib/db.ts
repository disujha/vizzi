/**
 * AWS Amplify / AppSync compatibility shim.
 *
 * Provides a Firestore-like API so existing pages need minimal changes.
 * All data is routed to AppSync GraphQL (same backend as vizzi_app).
 *
 * Collections mapped:
 *   clinics/{id}              → getClinic / updateClinic / createClinic
 *   clinics/{id}/queue        → QueuePatient (listQueuePatients)
 *   clinics/{id}/doctors      → AmplifyDoctor (listAmplifyDoctors)
 *   devices                   → DeviceModel
 */

import { generateClient } from "aws-amplify/api";
import { configureAmplify } from "@/lib/amplify";
import amplifyConfig from "@/amplifyconfiguration.json";

configureAmplify();
const client = generateClient();
const CAN_USE_SUBSCRIPTIONS =
    (amplifyConfig.aws_appsync_authenticationType || "").toUpperCase() !== "API_KEY";

const IS_DEV = typeof window !== "undefined" && (window.location.hostname === "localhost" || process.env.NODE_ENV === "development");

// ─── Field Mapping Helpers ─────────────────────────────────────────────────────

// Map various logo field names to the actual schema fields
const mapClinicFields = (data: Record<string, any>) => {
    const hasClinicLogoInput =
        Object.prototype.hasOwnProperty.call(data, "clinicLogoUri") ||
        Object.prototype.hasOwnProperty.call(data, "clinicLogoUrl") ||
        Object.prototype.hasOwnProperty.call(data, "logoUrl") ||
        Object.prototype.hasOwnProperty.call(data, "logoUri") ||
        Boolean(data.branding?.clinicLogoUrl) ||
        Boolean(data.branding?.logoUrl);
    const hasDoctorPhotoInput =
        Object.prototype.hasOwnProperty.call(data, "doctorPhotoUri") ||
        Object.prototype.hasOwnProperty.call(data, "doctorPhotoUrl") ||
        Object.prototype.hasOwnProperty.call(data, "photoUrl") ||
        Object.prototype.hasOwnProperty.call(data, "photoUri") ||
        Boolean(data.branding?.doctorPhotoUrl) ||
        Boolean(data.branding?.photoUrl);

    return {
        ...data,
        // Map all possible logo field names to clinicLogoUri
        ...(hasClinicLogoInput ? {
            clinicLogoUri: data.clinicLogoUri || data.clinicLogoUrl || data.logoUrl || data.logoUri || data.branding?.clinicLogoUrl || data.branding?.logoUrl || ""
        } : {}),
        // Map all possible photo field names to doctorPhotoUri
        ...(hasDoctorPhotoInput ? {
            doctorPhotoUri: data.doctorPhotoUri || data.doctorPhotoUrl || data.photoUrl || data.photoUri || data.branding?.doctorPhotoUrl || data.branding?.photoUrl || ""
        } : {}),
    };
};

// ─── GraphQL operations ────────────────────────────────────────────────────

const Q = {
    getClinic: /* GraphQL */ `query GetClinic($id: ID!) { getClinic(id: $id) { id name clinicName doctorName email phone status tokenPrefix tokenDigits voiceEnabled voiceLanguage voiceRate voicePitch voiceGender voiceName announcementTemplate checkInAnnouncementTemplate clinicLogoUri doctorPhotoUri smsClinicName } }`,
    updateClinic: /* GraphQL */ `mutation UpdateClinic($input: UpdateClinicInput!) { updateClinic(input: $input) { id } }`,
    createClinic: /* GraphQL */ `mutation CreateClinic($input: CreateClinicInput!) { createClinic(input: $input) { id } }`,
    listPatients: /* GraphQL */ `query ListQueuePatients($filter: ModelQueuePatientFilterInput) { listQueuePatients(filter: $filter) { items { id name tokenNumber mobileNumber status timestamp clinicId doctorId doctorName doctorPrefix appointmentDate appointmentTime isAppointment isEmergency lastCalledAt cancelledAt } } }`,
    createPatient: /* GraphQL */ `mutation CreateQueuePatient($input: CreateQueuePatientInput!) { createQueuePatient(input: $input) { id } }`,
    updatePatient: /* GraphQL */ `mutation UpdateQueuePatient($input: UpdateQueuePatientInput!) { updateQueuePatient(input: $input) { id } }`,
    listDoctors: /* GraphQL */ `query ListDoctors($filter: ModelDoctorFilterInput) { listDoctors(filter: $filter) { items { id name prefix active photoUrl clinicId createdAt updatedAt } } }`,
    createDoctor: /* GraphQL */ `mutation CreateDoctor($input: CreateDoctorInput!) { createDoctor(input: $input) { id name prefix active photoUrl clinicId createdAt updatedAt } }`,
    updateDoctor: /* GraphQL */ `mutation UpdateDoctor($input: UpdateDoctorInput!) { updateDoctor(input: $input) { id name prefix active photoUrl clinicId createdAt updatedAt } }`,
    deleteDoctor: /* GraphQL */ `mutation DeleteDoctor($input: DeleteDoctorInput!) { deleteDoctor(input: $input) { id } }`,
    listDevices: /* GraphQL */ `query ListDevices { __typename }`, // Disabled: DeviceModel not in schema
    updateDevice: /* GraphQL */ `mutation UpdateDevice { __typename }`, // Disabled: DeviceModel not in schema
    onUpdateClinic: /* GraphQL */ `subscription OnUpdateClinic { onUpdateClinic { id name clinicName doctorName status tokenPrefix tokenDigits smsClinicName clinicLogoUri doctorPhotoUri voiceEnabled voiceLanguage voiceRate voicePitch voiceGender voiceName announcementTemplate checkInAnnouncementTemplate } }`,
    onCreatePatient: /* GraphQL */ `subscription OnCreateQueuePatient { onCreateQueuePatient { id name tokenNumber mobileNumber status timestamp clinicId doctorId doctorName doctorPrefix appointmentDate appointmentTime isAppointment isEmergency lastCalledAt cancelledAt } }`,
    onUpdatePatient: /* GraphQL */ `subscription OnUpdateQueuePatient { onUpdateQueuePatient { id name tokenNumber mobileNumber status timestamp clinicId doctorId doctorName doctorPrefix appointmentDate appointmentTime isAppointment isEmergency lastCalledAt cancelledAt } }`,
};

// ─── Helpers ───────────────────────────────────────────────────────────────

function gqlCall(query: string, variables?: Record<string, any>) {
    return client.graphql({ query, variables }) as Promise<any>;
}

function isUnauthorizedGraphQLError(err: any): boolean {
    const message = String(err?.message || "").toLowerCase();
    if (message.includes("unauthorized") || message.includes("not authorized")) return true;
    const errors = Array.isArray(err?.errors) ? err.errors : [];
    return errors.some((e: any) => {
        const type = String(e?.errorType || "").toLowerCase();
        const msg = String(e?.message || "").toLowerCase();
        return type.includes("unauthorized") || msg.includes("not authorized");
    });
}

function subscribe(query: string, variables: Record<string, any> | undefined, next: (data: any) => void) {
    const sub = (client.graphql({ query, variables }) as any).subscribe({ next });
    return () => sub.unsubscribe();
}

function emitLocalOnlySync(collection: string) {
    if (typeof window === "undefined") return;
    window.dispatchEvent(new CustomEvent("vizzi_db_sync", {
        detail: { mode: "local_only", collection, at: Date.now() }
    }));
}

function newId() {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

// ─── doc() / collection() shim ─────────────────────────────────────────────

type DocRef = { path: string; id: string; clinicId?: string; collection: string; subId?: string };

function parseRef(path: string): DocRef {
    const parts = path.split("/");
    if (parts.length === 2) {
        return { path, collection: parts[0], id: parts[1] };
    }
    if (parts.length === 3) {
        return { path, collection: parts[2], id: "", clinicId: parts[1] };
    }
    if (parts.length === 4) {
        return { path, collection: parts[2], id: parts[3], clinicId: parts[1] };
    }
    return { path, collection: parts[0], id: parts[1] };
}

export function doc(dbOrPath: any, ...rest: string[]): DocRef {
    let path = typeof dbOrPath === "string" ? [dbOrPath, ...rest].join("/") : rest.join("/");
    const parts = path.split("/");
    if (parts.length === 1 || parts.length === 3) {
        path = `${path}/${newId()}`;
    }
    return parseRef(path);
}

export function collection(dbOrPath: any, ...rest: string[]) {
    const path = typeof dbOrPath === "string" ? [dbOrPath, ...rest].join("/") : rest.join("/");
    return path;
}

// ─── Local Storage Fallback for Dev ────────────────────────────────────────

function getLocal(key: string) {
    if (typeof window === "undefined") return null;
    const data = localStorage.getItem(`vizzi_${key}`);
    return data ? JSON.parse(data) : null;
}

function setLocal(key: string, data: any) {
    if (typeof window === "undefined") return;
    localStorage.setItem(`vizzi_${key}`, JSON.stringify(data));
    window.dispatchEvent(new CustomEvent('vizzi_db_update', { detail: { key, data } }));
}

// ─── getDoc ────────────────────────────────────────────────────────────────

export async function getDoc(ref: DocRef) {
    if (IS_DEV) {
        const localData = getLocal(ref.path);
        if (localData) return { exists: () => true, data: () => localData, id: ref.id };
    }
    if (ref.collection === "clinics" && !ref.clinicId) {
        try {
            const res = await gqlCall(Q.getClinic, { id: ref.id });
            const data = res?.data?.getClinic;
            return { exists: () => !!data, data: () => data, id: ref.id };
        } catch (e) {
            console.warn("DB getDoc failed, using local:", e);
            const localData = getLocal(ref.path);
            return { exists: () => !!localData, data: () => localData, id: ref.id };
        }
    }
    return { exists: () => false, data: () => null, id: ref.id };
}

// ─── setDoc ────────────────────────────────────────────────────────────────

export async function setDoc(ref: DocRef, data: Record<string, any>, options?: { merge?: boolean }) {
    // Map field names before processing
    const mappedData = ref.collection === "clinics" && !ref.clinicId ? mapClinicFields(data) : data;

    if (IS_DEV) {
        const existing = options?.merge ? getLocal(ref.path) || {} : {};
        setLocal(ref.path, { ...existing, ...mappedData });
    }
    if (ref.collection === "clinics" && !ref.clinicId) {
        console.log("[DB] setDoc clinic - attempting update for ID:", ref.id);
        try {
            const updateInput = { id: ref.id, ...strip(mappedData, "clinic") };
            console.log("[DB] Update input:", updateInput);
            await gqlCall(Q.updateClinic, { input: updateInput });
            console.log("[DB] Clinic update successful");
        } catch (e) {
            console.error("[DB] updateClinic error:", e);
            
            // Extract error details from GraphQL error structure
            const errors = (e as any)?.errors || [];
            const firstError = errors[0];
            const errorMessage = String(firstError?.message || e?.message || "").toLowerCase();
            const errorType = String(firstError?.errorType || "").toLowerCase();
            
            console.log("[DB] Error details - message:", errorMessage, "type:", errorType, "full error:", JSON.stringify(e, null, 2));
            
            // Check if it's a "not found" error
            const isNotFound = errorMessage.includes("not found") || 
                              errorMessage.includes("does not exist") ||
                              errorMessage.includes("no item found") ||
                              errorType.includes("notfound");
            
            console.log("[DB] Error analysis - isNotFound:", isNotFound);
            
            if (isNotFound) {
                // Record doesn't exist, try to create it
                console.log("[DB] Attempting to create clinic record");
                try { 
                    const createInput = { id: ref.id, ...strip(mappedData, "clinic") };
                    console.log("[DB] Create input:", createInput);
                    await gqlCall(Q.createClinic, { input: createInput }); 
                    console.log("[DB] Clinic create successful");
                    return; // Success!
                } catch (createErr) { 
                    console.error("[DB] createClinic failed:", createErr); 
                    if (isUnauthorizedGraphQLError(createErr)) {
                        console.warn("[DB] Authorization error on create - emitting local_only");
                        emitLocalOnlySync("clinics");
                    }
                }
            } else if (isUnauthorizedGraphQLError(e)) {
                // Real authorization error
                console.warn("[DB] Authorization error on update - emitting local_only");
                emitLocalOnlySync("clinics");
            } else {
                console.warn("DB updateClinic failed:", e);
            }
            
            if (!options?.merge) {
                // If not merge mode and update failed, try create as fallback
                console.log("[DB] Non-merge mode, trying create as fallback");
                try { await gqlCall(Q.createClinic, { input: { id: ref.id, ...strip(mappedData, "clinic") } }); } catch (err) { console.warn("DB setDoc failed:", err); }
            }
        }
    } else if (ref.collection === "queue" || ref.collection === "patients") {
        try {
            await gqlCall(Q.updatePatient, { input: { id: ref.id, ...strip(data, "patient"), clinicId: ref.clinicId } });
        } catch (e) {
            if (options?.merge) {
                if (!isUnauthorizedGraphQLError(e)) {
                    console.warn("DB updatePatient failed:", e);
                } else {
                    emitLocalOnlySync("patients");
                }
                return;
            }
            try { await gqlCall(Q.createPatient, { input: { id: ref.id || newId(), ...strip(data, "patient"), clinicId: ref.clinicId } }); } catch (err) { console.warn("DB setDoc failed:", err); }
        }
    } else if (ref.collection === "doctors") {
        try {
            await gqlCall(Q.updateDoctor, { input: { id: ref.id, ...strip(data, "doctor"), clinicId: ref.clinicId } });
        } catch (e) {
            if (options?.merge) {
                if (!isUnauthorizedGraphQLError(e)) {
                    console.warn("DB updateDoctor failed:", e);
                } else {
                    emitLocalOnlySync("doctors");
                }
                return;
            }
            try { await gqlCall(Q.createDoctor, { input: { id: ref.id || newId(), ...strip(data, "doctor"), clinicId: ref.clinicId } }); } catch (err) { console.warn("DB setDoc failed:", err); }
        }
    } else if (ref.collection === "devices") {
        try {
            await gqlCall(Q.updateDevice, { input: { id: ref.id, ...data } });
        } catch (e) {
            console.warn("DB updateDevice failed:", e);
        }
    }
}

// ─── updateDoc ─────────────────────────────────────────────────────────────

export async function updateDoc(ref: DocRef, data: Record<string, any>) {
    return setDoc(ref, data, { merge: true });
}

// ─── addDoc ────────────────────────────────────────────────────────────────

export async function addDoc(collectionPath: string, data: Record<string, any>) {
    const parts = collectionPath.split("/");
    const col = parts[parts.length - 1];
    const clinicId = parts[1];
    const id = newId();

    // Map field names before processing
    const mappedData = col === "clinics" ? mapClinicFields(data) : data;

    if (IS_DEV) {
        const path = `${collectionPath}/${id}`;
        setLocal(path, { id, ...mappedData, clinicId });
    }
    if (col === "queue" || col === "patients") {
        try { await gqlCall(Q.createPatient, { input: { id, ...strip(mappedData, "patient"), clinicId: clinicId } }); } catch (e) { console.warn("DB addDoc failed:", e); }
    } else if (col === "doctors") {
        try { await gqlCall(Q.createDoctor, { input: { id, ...strip(mappedData, "doctor"), clinicId: clinicId } }); } catch (e) { console.warn("DB addDoc failed:", e); }
    }
    return { id };
}

// ─── deleteDoc ─────────────────────────────────────────────────────────────

export async function deleteDoc(ref: DocRef) {
    if (IS_DEV) {
        localStorage.removeItem(`vizzi_${ref.path}`);
        window.dispatchEvent(new CustomEvent('vizzi_db_update', { detail: { key: ref.path, data: null } }));
    }
    if (ref.collection === "doctors") {
        try { await gqlCall(Q.deleteDoctor, { input: { id: ref.id } }); } catch (e) { console.warn("DB deleteDoc failed:", e); }
    }
}

// ─── getDocs ───────────────────────────────────────────────────────────────

export async function getDocs(q: any) {
    if (!q || !q._collection) return { forEach: () => { } };
    const parts = q._collection.split("/");
    const col = parts[parts.length - 1];
    let clinicId = parts.length > 1 ? parts[1] : undefined;

    if (!clinicId && q._constraints && Array.isArray(q._constraints)) {
        const clinicConstraint = q._constraints.find((c: any) => c.field === "clinicId" && c.op === "==");
        if (clinicConstraint) clinicId = clinicConstraint.value;
    }

    if (IS_DEV) {
        // Simple scan for demo purposes
        const items = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key?.startsWith(`vizzi_${q._collection}`)) {
                items.push(JSON.parse(localStorage.getItem(key)!));
            }
        }
        if (items.length > 0) return makeDocs(items);
    }

    if (!clinicId && col !== "devices") {
        console.warn(`[DB] getDocs: No clinicId for collection ${col}`);
        return makeDocs([]);
    }

    if (col === "devices") {
        try {
            const vars = { filter: { clinicId: { eq: clinicId } } };
            const res = await gqlCall(Q.listDevices, vars);
            const items = res?.data?.listDevices?.items || [];
            return makeDocs(items);
        } catch (e) {
            console.warn("[DB] getDocs devices failed:", JSON.stringify(e));
            return makeDocs([]);
        }
    } else if (col === "doctors") {
        try {
            const vars = { filter: { clinicId: { eq: clinicId } } };
            const res = await gqlCall(Q.listDoctors, vars);
            const items = res?.data?.listDoctors?.items || [];
            return makeDocs(items);
        } catch (e) {
            console.warn("[DB] getDocs doctors failed:", JSON.stringify(e));
            return makeDocs([]);
        }
    } else if (col === "queue" || col === "patients") {
        try {
            const vars = { filter: { clinicId: { eq: clinicId } } };
            const res = await gqlCall(Q.listPatients, vars);
            const items = res?.data?.listQueuePatients?.items || [];
            return makeDocs(items);
        } catch (e) {
            console.warn("[DB] getDocs patients failed:", JSON.stringify(e));
            return makeDocs([]);
        }
    }
    return makeDocs([]);
}

// ─── onSnapshot ────────────────────────────────────────────────────────────

export function onSnapshot(refOrQuery: any, callback: (snap: any) => void): () => void {
    const ref: DocRef = refOrQuery?._ref || refOrQuery;
    const isColQuery = !!refOrQuery?._collection;
    const colPath = isColQuery ? refOrQuery._collection : null;
    const col = ref?.collection || (colPath ? colPath.split("/").pop() : null);
    const clinicId = ref?.clinicId || (colPath ? colPath.split("/")[1] : null);
    const docId = ref?.id;

    const handleUpdate = (e: any) => {
        const { key, data } = e.detail;
        if (isColQuery && key.startsWith(colPath)) {
            getDocs(refOrQuery).then(callback);
        } else if (!isColQuery && key === ref.path) {
            callback({ exists: () => !!data, data: () => data, id: docId });
        }
    };

    if (IS_DEV) {
        window.addEventListener('vizzi_db_update', handleUpdate);
        // Only load local data if it's there, otherwise let GraphQL part take over
        getDocs(refOrQuery).then((snap: any) => {
            if (snap && snap.docs && snap.docs.length > 0) callback(snap);
        });
    }

    if (!IS_DEV || true) { // Always try subscriptions too if possible
        if (!isColQuery && col === "clinics" && !clinicId) {
            // Clinic doc snapshot
            if (IS_DEV) {
                const localData = getLocal(ref.path);
                if (localData) {
                    callback({ exists: () => true, data: () => localData, id: docId });
                }
            }
            gqlCall(Q.getClinic, { id: docId }).then((res: any) => {
                const data = res?.data?.getClinic;
                callback({ exists: () => !!data, data: () => data, id: docId });
            }).catch((err) => {
                console.warn("[DB] onSnapshot getClinic failed:", err);
                const localData = getLocal(ref.path);
                if (localData) {
                    callback({ exists: () => true, data: () => localData, id: docId });
                } else {
                    callback({ exists: () => false, data: () => null, id: docId });
                }
            });

            if (!CAN_USE_SUBSCRIPTIONS) {
                return () => {
                    if (IS_DEV) window.removeEventListener('vizzi_db_update', handleUpdate);
                };
            }

            try {
                const un = subscribe(Q.onUpdateClinic, undefined, ({ data }: any) => {
                    const d = data?.onUpdateClinic;
                    if (d && d.id === docId) callback({ exists: () => true, data: () => d, id: docId });
                });
                return () => {
                    if (IS_DEV) window.removeEventListener('vizzi_db_update', handleUpdate);
                    un();
                };
            } catch { }
        }

        if (isColQuery && (col === "queue" || col === "patients")) {
            gqlCall(Q.listPatients, { filter: { clinicId: { eq: clinicId } } }).then((res: any) => {
                const items = res?.data?.listQueuePatients?.items || [];
                callback(makeDocs(items));
            }).catch((err) => {
                const errorDetails = err?.errors ? JSON.stringify(err.errors) : (err?.message || "");
                const isUnauthorized = typeof errorDetails === "string" && (errorDetails.includes("Not Authorized") || errorDetails.includes("Unauthorized"));
                if (IS_DEV && isUnauthorized) {
                    console.warn("[DB] listPatients unauthorized. Falling back to local cache.");
                    getDocs(refOrQuery).then((snap: any) => {
                        if (snap?.docs?.length > 0) {
                            callback(snap);
                            return;
                        }
                        callback(makeDocs([]));
                    }).catch(() => callback(makeDocs([])));
                    return;
                }
                console.warn("[DB] onSnapshot listPatients initial failed:", err);
                callback(makeDocs([]));
            });

            if (!CAN_USE_SUBSCRIPTIONS) {
                return () => {
                    if (IS_DEV) window.removeEventListener('vizzi_db_update', handleUpdate);
                };
            }

            try {
                const unsub1 = subscribe(Q.onCreatePatient, undefined, ({ data }: any) => {
                    const p = data?.onCreateQueuePatient;
                    if (p && p.clinicId === clinicId) {
                        gqlCall(Q.listPatients, { filter: { clinicId: { eq: clinicId } } }).then((res: any) => {
                            const items = res?.data?.listQueuePatients?.items || [];
                            callback(makeDocs(items));
                        });
                    }
                });
                const unsub2 = subscribe(Q.onUpdatePatient, undefined, ({ data }: any) => {
                    const p = data?.onUpdateQueuePatient;
                    if (p && p.clinicId === clinicId) {
                        gqlCall(Q.listPatients, { filter: { clinicId: { eq: clinicId } } }).then((res: any) => {
                            const items = res?.data?.listQueuePatients?.items || [];
                            callback(makeDocs(items));
                        });
                    }
                });
                return () => {
                    if (IS_DEV) window.removeEventListener('vizzi_db_update', handleUpdate);
                    unsub1?.(); unsub2?.();
                };
            } catch { }
        }

        if (isColQuery && col === "doctors") {
            const refresh = () => {
                const vars = { filter: { clinicId: { eq: clinicId } } };
                if (!clinicId) {
                    console.warn("[DB] onSnapshot labels: No clinicId, skipping fetch.");
                    callback(makeDocs([]));
                    return;
                }
                console.log(`[DB] Refreshing doctors for ${clinicId}`, vars);
                gqlCall(Q.listDoctors, vars).then((res: any) => {
                    const items = res?.data?.listDoctors?.items || [];
                    console.log(`[DB] onSnapshot found ${items.length} doctors`);
                    callback(makeDocs(items));
                }).catch((err) => {
                    const errorDetails = err?.errors ? JSON.stringify(err.errors, null, 2) :
                        err?.message ? err.message : JSON.stringify(err, null, 2);
                    const isUnauthorized = typeof errorDetails === "string" && errorDetails.includes("Not Authorized to access listDoctors");
                    if (IS_DEV && isUnauthorized) {
                        console.warn("[DB] listDoctors unauthorized. Falling back to local cache.");
                        getDocs(refOrQuery).then((snap: any) => {
                            if (snap?.docs?.length > 0) {
                                callback(snap);
                                return;
                            }
                            callback(makeDocs([]));
                        }).catch(() => callback(makeDocs([])));
                        return;
                    }
                    console.error("[DB] listDoctors error:", errorDetails);
                    if (err?.stack) console.error("[DB] listDoctors stack:", err.stack);
                    callback(makeDocs([]));
                });
            };
            refresh();

            // Subscriptions removed for doctors as they are not supported by the schema
            return () => {
                if (IS_DEV) window.removeEventListener('vizzi_db_update', handleUpdate);
            };
        }
    }

    return () => {
        if (IS_DEV) window.removeEventListener('vizzi_db_update', handleUpdate);
    };
}

// ─── query / where / orderBy ───────────────────────────────────────────────
// These are used for collection-scoped queries. We return a tagged object
// so onSnapshot / getDocs can dispatch correctly.

export function query(collectionPath: string, ...args: any[]) {
    return { _collection: collectionPath, _constraints: args };
}

export function where(_field: string, _op: string, _value: any) {
    return { type: "where", field: _field, op: _op, value: _value };
}

export function orderBy(_field: string, _dir?: string) {
    return { type: "orderBy", field: _field, dir: _dir };
}

export function limit(_n: number) {
    return { type: "limit", n: _n };
}

// ─── writeBatch ────────────────────────────────────────────────────────────

export function writeBatch(_db: any) {
    const ops: (() => Promise<any>)[] = [];
    return {
        set(ref: DocRef, data: Record<string, any>, options?: any) { ops.push(() => setDoc(ref, data, options)); return this; },
        update(ref: DocRef, data: Record<string, any>) { ops.push(() => updateDoc(ref, data)); return this; },
        delete(ref: DocRef) { ops.push(() => deleteDoc(ref)); return this; },
        async commit() { for (const op of ops) await op(); },
    };
}

// ─── Storage upload shim (returns S3 path + URL) ──────────────────────────

export function uploadToStorage(path: string, file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const fallbackToBase64 = () => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        };

        if (IS_DEV) {
            return fallbackToBase64();
        }

        import("aws-amplify/storage").then(async ({ uploadData, getUrl }) => {
            try {
                await uploadData({ path, data: file });
                const { url } = await getUrl({ path });
                resolve(url.toString());
            } catch (err) {
                console.warn("S3 Upload failed, falling back to base64 encoding", err);
                fallbackToBase64();
            }
        }).catch(fallbackToBase64);
    });
}

// ─── Dummy exports for type compatibility ──────────────────────────────────

/** Not used in AppSync mode — just a namespace token */
export const db = {};
export const storage = {};
export const functions = {};

// ─── Internal helpers ──────────────────────────────────────────────────────

function makeDocs(items: any[]) {
    return {
        docs: items.map((item) => ({
            id: item.id,
            data: () => ({
                ...item,
                // UI expects these, so we provide defaults since they are missing from backend schema
                specialization: item.specialization || "General",
                slotDuration: Number(item.slotDuration || 10),
                startTime: item.startTime || "09:00",
                endTime: item.endTime || "17:00",
                breakStart: item.breakStart || "13:00",
                breakEnd: item.breakEnd || "14:00",
            }),
            exists: () => true,
        })),
        forEach(cb: (d: any) => void) {
            items.forEach((item) => cb({
                id: item.id,
                data: () => ({
                    ...item,
                    specialization: item.specialization || "General",
                    slotDuration: Number(item.slotDuration || 10),
                    startTime: item.startTime || "09:00",
                    endTime: item.endTime || "17:00",
                    breakStart: item.breakStart || "13:00",
                    breakEnd: item.breakEnd || "14:00",
                })
            }));
        },
    };
}

const ISO_DATE_FIELDS = ["signupDate", "planExpiryDate", "demoStartedAt", "lastHeartbeat", "createdAt", "updatedAt"];

const WHITELISTS: Record<string, string[]> = {
    clinic: ["id", "name", "clinicName", "doctorName", "doctorIds", "email", "phone", "clinicType", "tokenPrefix", "tokenDigits", "voiceEnabled", "voiceVolume", "voiceLanguage", "voiceRate", "voicePitch", "voiceGender", "voiceName", "announcementTemplate", "checkInAnnouncementTemplate", "clinicLogoUri", "doctorPhotoUri", "currentPlan", "smsUsed", "smsLimit", "whatsappUsed", "whatsappLimit", "patientsUsed", "patientsLimit", "planExpiryDate", "signupDate", "demoStartedAt", "startTime", "endTime", "breakStartTime", "breakEndTime", "status", "smsEnabled", "smsClinicName", "clinicLogoUrl", "logoUrl", "logoUri", "doctorPhotoUrl", "photoUrl", "photoUri"],
    patient: ["id", "clinicId", "name", "mobileNumber", "tokenNumber", "status", "timestamp", "doctorId", "doctorName", "doctorPrefix", "appointmentDate", "appointmentTime", "isAppointment", "isEmergency", "lastCalledAt", "cancelledAt"],
    doctor: ["id", "name", "prefix", "active", "photoUrl", "clinicId", "createdAt", "updatedAt"],
};

function strip(obj: Record<string, any>, type?: keyof typeof WHITELISTS): Record<string, any> {
    const out: Record<string, any> = {};
    const whitelist = type ? WHITELISTS[type] : null;

    for (const [k, v] of Object.entries(obj)) {
        if (v === undefined) continue;
        if (whitelist && !whitelist.includes(k)) continue;

        if (ISO_DATE_FIELDS.includes(k) && typeof v === "number" && v > 0) {
            out[k] = new Date(v).toISOString();
        } else if (v !== null && typeof v === "object" && typeof v.toMillis === "function") {
            out[k] = v.toMillis();
        } else {
            out[k] = v;
        }
    }
    return out;
}
