import Link from "next/link";

export default function ContactPage() {
  return (
    <main className="min-h-screen bg-slate-50">
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <Link href="/" className="text-sm text-slate-500 hover:text-primary">← Back to home</Link>
        <h1 className="mt-4 text-3xl font-bold text-slate-900">Contact Us</h1>
        <p className="mt-3 text-slate-600">We are here to help with subscriptions, hardware, and support.</p>

        <div className="mt-10 space-y-6 text-sm text-slate-600">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Business Address</h2>
            <p className="mt-2">Rethela Technology</p>
            <p>WeWork NESCO IT Park, Building 4, North Wing,</p>
            <p>Western Express Hwy, Goregaon,</p>
            <p>Mumbai 400063</p>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-slate-900">Email</h2>
            <p className="mt-2">enquiry@rethela.com</p>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-slate-900">Phone</h2>
            <p className="mt-2">+91 9082205249</p>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-slate-900">WhatsApp</h2>
            <p className="mt-2">+91 9082205249</p>
          </div>
        </div>
      </section>
    </main>
  );
}
