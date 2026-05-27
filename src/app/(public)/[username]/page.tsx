"use client";

import { useQuery } from "convex/react";
import { api } from "@/../convex/_generated/api";
import { useParams, useRouter } from "next/navigation";
import { motion } from "motion/react";
import { useUserStore } from "@/store/use-user-store";
import { PageBreadcrumbs } from "@/components/layout/page-breadcrumbs";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from "@/components/ui/empty";
import { GiBlackHoleBolas } from "react-icons/gi";
import {
  Lock,
  Users,
  Globe,
  LogIn,
} from "lucide-react";
import { NatalChart } from "@/components/dashboard/natal-chart/natal-chart";
import { ElementalSpiderChart } from "@/components/dashboard/elemental-spider-chart";
import { PlanetsCarousel } from "@/components/dashboard/planets-carousel";
import { PageHeader } from "@/components/layout/page-header";
import type { StoredBirthData } from "@/lib/birth-chart/types";

export default function UserProfilePage() {
  const params = useParams<{ username: string }>();
  const router = useRouter();
  const { user: currentUser, isLoading: authLoading } = useUserStore();

  const username = params.username;

  const starsResult = useQuery(
    api.users.getStarsPageUser,
    currentUser !== undefined ? { username } : "skip",
  );

  // Auth loading
  if (authLoading || starsResult === undefined) {
    return (
      <div className="relative min-h-screen w-full text-foreground overflow-x-hidden">
        <div className="relative z-10 max-w-[1600px] mx-auto px-6 md:px-12 pt-8 pb-32">
          <div className="flex items-center justify-center min-h-[60vh]">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center gap-4"
            >
              <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              <span className="font-mono text-[10px] uppercase tracking-[0.4em] text-white/30">
                Loading chart
              </span>
            </motion.div>
          </div>
        </div>
      </div>
    );
  }

  // Not authenticated — must sign in
  if (starsResult.access === "unauthenticated") {
    return (
      <div className="relative min-h-screen w-full text-foreground overflow-x-hidden">
        <div className="relative z-10 max-w-[1600px] mx-auto px-6 md:px-12 pt-8 pb-32">
          <AccessDenied
            icon={<LogIn className="h-12 w-12 text-primary/40" />}
            title="Sign in required"
            description="You need to be signed in to view this birth chart."
            actionLabel="Sign In"
            onAction={() => router.push("/sign-in")}
          />
        </div>
      </div>
    );
  }

  // Not found
  if (starsResult.access === "not_found") {
    return (
      <div className="relative min-h-screen w-full text-foreground overflow-x-hidden">
        <div className="relative z-10 max-w-[1600px] mx-auto px-6 md:px-12 pt-8 pb-32">
          <Empty className="min-h-[70vh]">
            <EmptyMedia className="bg-transparent [&_svg]:!size-32">
              <GiBlackHoleBolas className="text-galactic drop-shadow-[0_0_48px_rgba(157,78,221,0.7)]" />
            </EmptyMedia>
            <EmptyTitle className="font-serif text-4xl md:text-5xl">
              Lost in the void
            </EmptyTitle>
            <EmptyDescription className="text-base md:text-lg">
              It seems the thing you are trying to find was sucked by a black
              hole.
            </EmptyDescription>
            <EmptyContent>
              <Button
                variant="default"
                onClick={() => router.push("/")}
                className="text-base px-6 py-3"
              >
                Go Home
              </Button>
            </EmptyContent>
          </Empty>
        </div>
      </div>
    );
  }

  // Private — no access
  if (starsResult.access === "private") {
    return (
      <div className="relative min-h-screen w-full text-foreground overflow-x-hidden">
        <div className="relative z-10 max-w-[1600px] mx-auto px-6 md:px-12 pt-8 pb-32">
          <AccessDenied
            icon={<Lock className="h-12 w-12 text-primary/40" />}
            title="Sorry, you don't have access"
            description="This user's birth chart is set to private and cannot be viewed by others."
            actionLabel="Go Home"
            onAction={() => router.push("/")}
          />
        </div>
      </div>
    );
  }

  // Friends only — not friends
  if (starsResult.access === "friends_only") {
    return (
      <div className="relative min-h-screen w-full text-foreground overflow-x-hidden">
        <div className="relative z-10 max-w-[1600px] mx-auto px-6 md:px-12 pt-8 pb-32">
          <AccessDenied
            icon={<Users className="h-12 w-12 text-primary/40" />}
            title="Sorry, you don't have access"
            description="This birth chart is only visible to friends. Send a friend request to gain access."
            actionLabel="Go Home"
            onAction={() => router.push("/")}
          />
        </div>
      </div>
    );
  }

  // Access granted!
  const { user: targetUser, birthData } = starsResult;
  const displayUsername = targetUser.username || "User";

  // Convert birthData to the format expected by dashboard components
  const formattedBirthData: StoredBirthData | null = birthData ? {
    date: birthData.date,
    time: birthData.time,
    location: {
      lat: birthData.location.lat,
      long: birthData.location.long,
      city: birthData.location.city || "",
      country: birthData.location.country || "",
    },
    placements: birthData.placements || [],
    chart: birthData.chart,
  } : null;

  return (
    <div className="relative min-h-screen w-full text-foreground overflow-x-hidden">
      {/* Ambient background */}
      <div className="fixed inset-0 z-0 pointer-events-none contain-strict">
        <div
          className="absolute top-[-10%] left-[0%] w-[140%] h-[140%] opacity-[0.08] mix-blend-screen"
          style={{
            background: `radial-gradient(circle at 30% 40%, oklch(0.5 0.2 240) 0%, transparent 55%)`,
          }}
        />
        <div
          className="absolute bottom-[-20%] right-[-10%] w-full h-full opacity-[0.06] mix-blend-screen"
          style={{
            background: `radial-gradient(circle at 70% 70%, oklch(0.8 0.1 60) 0%, transparent 50%)`,
          }}
        />
      </div>

      <div className="relative z-10 max-w-[1600px] mx-auto px-6 md:px-12 pt-8 pb-32">
        {/* Page Header */}
        <PageHeader
          breadcrumbs={[
            { label: "Home", href: "/" },
            { label: displayUsername },
          ]}
          title={`${displayUsername}'s Chart`}
          subtitle="Birth Profile"
          showElementFilter={false}
        />

        {/* Birth Chart Content */}
        {formattedBirthData ? (
          <div className="space-y-8">
            {/* Natal Chart (Birth Chart) — 1st */}
            <NatalChart birthData={formattedBirthData} />

            {/* Elemental Spider Chart — 2nd */}
            <ElementalSpiderChart birthData={formattedBirthData} delay={0.1} />

            {/* Planetary Placements Carousel */}
            {formattedBirthData.placements && formattedBirthData.placements.length > 0 && (
              <PlanetsCarousel placements={formattedBirthData.placements} delay={0.35} />
            )}
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="flex flex-col items-center justify-center py-24 text-white/40"
          >
            <Globe className="h-12 w-12 text-primary/30 mb-4" />
            <p className="font-sans text-sm">
              This user hasn&apos;t set up their birth data yet.
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
}

function AccessDenied({
  icon,
  title,
  description,
  actionLabel,
  onAction,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="flex flex-col items-center justify-center min-h-[60vh] text-center"
    >
      <div className="mb-6 p-6 rounded-full border border-white/10 bg-white/5">
        {icon}
      </div>
      <h2 className="font-serif text-2xl md:text-3xl text-white mb-3">
        {title}
      </h2>
      <p className="text-white/40 font-sans text-sm max-w-md mb-8">
        {description}
      </p>
      <Button
        variant="outline"
        onClick={onAction}
        className="border-primary/30 text-primary hover:bg-primary/10 hover:text-primary"
      >
        {actionLabel}
      </Button>
    </motion.div>
  );
}