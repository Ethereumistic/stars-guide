import type { Metadata } from "next";
import { Inter, Cinzel } from "next/font/google"; // Using Inter and Cinzel as per design doc
import { ThemeProvider } from "@/components/ui/theme-provider"
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import "./globals.css";

const inter = Inter({
	variable: "--font-sans",
	subsets: ["latin"],
});

const cinzel = Cinzel({
	variable: "--font-serif",
	subsets: ["latin"],
});

export const metadata: Metadata = {
	title: "stars.guide | Navigate your fate",
	description: "Celestial horoscopes and birth charts. Discover your destiny with stars.guide.",
	manifest: "/manifest.json",
};

import { ConvexAuthNextjsServerProvider } from "@convex-dev/auth/nextjs/server";
import { ConvexClientProvider } from "@/components/convex-client-provider";
import { UserSync } from "@/components/providers/user-sync";
import { ShootingStars } from "@/components/hero/shooting-stars";
import { StarsBackground } from "@/components/hero/stars-background";

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<ConvexAuthNextjsServerProvider>
			<html lang="en" suppressHydrationWarning>
				<body
					className={`${inter.variable} ${cinzel.variable} antialiased font-sans selection:bg-primary/20`}
				>
					<ConvexClientProvider>
						<UserSync />
						<ThemeProvider
							attribute="class"
							defaultTheme="dark"
							enableSystem
							disableTransitionOnChange
						>
							<div className="relative min-h-screen flex flex-col">
								<Navbar />
								<div className="fixed inset-0 z-0">
									<ShootingStars
										minSpeed={15}
										maxSpeed={35}
										minDelay={800}
										maxDelay={3000}
										starColor="#d4af37"
										trailColor="#8b7355"
									/>
									<StarsBackground
										starDensity={0.0002}
										allStarsTwinkle={true}
										twinkleProbability={0.8}
										minTwinkleSpeed={0.3}
										maxTwinkleSpeed={1.2}
									/>
									{/* <div className="absolute inset-0 bg-radial-[circle_at_50%_50%] from-transparent via-background/50 to-background opacity-50" /> */}
								</div>
								<main className="flex-1">{children}</main>
								<Footer />
							</div>
						</ThemeProvider>
					</ConvexClientProvider>
				</body>
			</html>
		</ConvexAuthNextjsServerProvider>
	);
}
