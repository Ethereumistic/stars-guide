import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";

export default function ShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
    </>
  );
}