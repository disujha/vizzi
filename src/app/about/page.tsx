import Link from "next/link";

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-slate-50">
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <Link href="/" className="text-sm text-slate-500 hover:text-primary">← Back to home</Link>
        <h1 className="mt-4 text-3xl font-bold text-slate-900">About Us</h1>
        <p className="mt-3 text-slate-600">Vizzi Clinic Receptionist is built by Rethela Technology.</p>

        <div className="mt-10 space-y-6 text-sm text-slate-600">
          <p>Rethela Technology builds intelligent clinic operations products that reduce front-desk overload and improve patient experiences. Vizzi combines AI-driven queue management, check-in automation, and connected devices to keep clinics running smoothly.</p>
          <p>We partner with doctors and clinics across India to deliver reliable hardware and software that scales with their needs.</p>
          <p>For partnerships or demos, contact us at enquiry@rethela.com.</p>
        </div>
      </section>
    </main>
  );
}
