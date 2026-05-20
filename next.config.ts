import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	images: {
		remotePatterns: [
			{
				hostname: "cdn.jsdelivr.net",
				protocol: "https",
			}
		]
	},
	async redirects() {
		return [
			{
				source: "/journal/new",
				destination: "/journal?compose=true",
				permanent: true,
			},
			{
				source: "/journal/calendar",
				destination: "/journal?tab=calendar",
				permanent: true,
			},
			{
				source: "/journal/search",
				destination: "/journal?tab=search",
				permanent: true,
			},
			{
				source: "/journal/stats",
				destination: "/journal?tab=insights",
				permanent: true,
			},
			{
				source: "/journal/settings",
				destination: "/journal?tab=settings",
				permanent: true,
			},
		];
	},
};

export default nextConfig;

// added by create cloudflare to enable calling `getCloudflareContext()` in `next dev`
// import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
// initOpenNextCloudflareForDev();
