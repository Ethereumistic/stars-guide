import { Logo } from "@/components/ui/logo-gradient";

export default function LogoPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background relative z-10">
      <Logo variant="logomark" className="[&_svg:not(:first-child)]:!text-[666px]" />
    </div>
  );
}

