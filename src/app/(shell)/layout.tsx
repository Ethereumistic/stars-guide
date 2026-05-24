import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";

export default function ShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative z-10 flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}