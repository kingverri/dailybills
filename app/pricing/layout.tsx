export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto min-h-dvh w-full max-w-7xl px-4 pb-16 pt-5 sm:px-6 lg:pt-8">
      {children}
    </main>
  );
}
