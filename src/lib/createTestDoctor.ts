/**
 * Create Test Doctor in Firestore
 */
import { collection, doc, setDoc, db } from "@/lib/db";

export const createTestDoctor = async (userId: string) => {
  try {
    const doctorsRef = collection(db, "clinics", userId, "doctors");
    const doctorRef = doc(doctorsRef);
    
    const testDoctor = {
      id: doctorRef.id,
      name: "Test Doctor",
      prefix: "DOC",
      active: true,
      status: "ONLINE",
      createdAt: new Date().toISOString()
    };
    
    await setDoc(doctorRef, testDoctor);
    console.log("Test doctor created:", testDoctor);
    return testDoctor;
  } catch (error) {
    console.error("Failed to create test doctor:", error);
    throw error;
  }
};

// Usage in browser console:
// createTestDoctor("clinic-8585810708")
