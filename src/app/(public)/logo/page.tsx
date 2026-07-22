import { Logo } from "@/components/ui/logo";

export default function LogoPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background relative z-10">
      <Logo variant="logomark" className="scale-1000" />
    </div>
  );
}
