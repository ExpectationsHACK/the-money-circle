import Link from "next/link";

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center bg-cream px-4 text-center">
      <div>
        <p className="font-display text-7xl font-bold text-gold">404</p>
        <h1 className="mt-3 font-display text-2xl font-bold">This page left the Circle.</h1>
        <Link href="/" className="mt-6 inline-block rounded-2xl bg-forest px-6 py-3 font-bold text-cream">Back home</Link>
      </div>
    </main>
  );
}
