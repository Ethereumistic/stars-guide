import { StarsBackground, ShootingStars } from "@/components/hero/stars-canvas";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative z-10 flex min-h-screen flex-col">
      <StarsBackground />
      <ShootingStars />
      {children}
    </div>
  );
}
