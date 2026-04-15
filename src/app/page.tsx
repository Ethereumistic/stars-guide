import { Hero } from "@/components/hero/hero";
import { RetrogradeBanner } from "@/components/landing/retrograde-banner";
import { CosmicToday } from "@/components/landing/cosmic-today";
import { LiveSkyRadar } from "@/components/landing/live-sky-radar";
import { FeatureShowcase } from "@/components/landing/feature-showcase";
import { SocialProof } from "@/components/landing/social-proof";
import { FinalCTA } from "@/components/landing/final-cta";

export default function Home() {
	return (
		<main className="relative z-10 flex flex-col">
			<Hero />

			<div className="max-w-[1600px] mx-auto w-full px-6 md:px-12 py-24 md:py-32 space-y-24 md:space-y-32">
				<RetrogradeBanner />
				<CosmicToday />
				<LiveSkyRadar />
			</div>

			<div className="max-w-[1600px] mx-auto w-full px-6 md:px-12 py-24 md:py-32 space-y-24 md:space-y-32">
				<FeatureShowcase />
			</div>

			<div className="max-w-[1600px] mx-auto w-full px-6 md:px-12 py-24 md:py-32 space-y-24 md:space-y-32">
				<SocialProof />
			</div>

			<div className="max-w-[1600px] mx-auto w-full px-6 md:px-12 py-24 md:py-32 space-y-24 md:space-y-32">
				<FinalCTA />
			</div>
		</main>
	);
}
