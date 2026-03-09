import Link from "next/link";

export default function ShippingPage() {
  return (
    <main className="min-h-screen bg-slate-50">
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <Link href="/" className="text-sm text-slate-500 hover:text-primary">← Back to home</Link>
        <h1 className="mt-4 text-3xl font-bold text-slate-900">Shipping and Delivery Policy</h1>
        <p className="mt-3 text-slate-600">Effective date: February 9, 2026</p>

        <div className="mt-10 space-y-8 text-sm text-slate-600">
          <section>
            <h2 className="text-lg font-semibold text-slate-900">Order Processing</h2>
            <p className="mt-2">Hardware orders are typically processed within 2 to 3 business days after payment confirmation.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900">Delivery Timelines</h2>
            <p className="mt-2">Delivery timelines vary by location. Most orders within India are delivered within 3 to 10 business days after dispatch.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900">Shipping Partners</h2>
            <p className="mt-2">We use trusted courier partners and provide tracking details by email once your order is dispatched.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900">Address Accuracy</h2>
            <p className="mt-2">Please ensure your shipping address and contact details are accurate. Delays caused by incorrect information are the customer’s responsibility.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900">Issues in Transit</h2>
            <p className="mt-2">If your package is delayed or arrives damaged, contact us within 7 days of delivery for assistance.</p>
          </section>
        </div>
      </section>
    </main>
  );
}
