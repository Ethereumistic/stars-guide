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

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<ConvexAuthNextjsServerProvider>
			<html lang="en" suppressHydrationWarning>
				<body
					className={`${inter.variable} ${cinzel.variable} antialiased font-sans`}
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
