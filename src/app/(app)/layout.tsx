import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { DeferredStarField } from "@/components/hero/deferred-stars";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative z-10 flex min-h-screen flex-col">
      <DeferredStarField />
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
