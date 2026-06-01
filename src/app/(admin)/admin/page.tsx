"use client";

import Link from "next/link";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    GiCursedStar,
    GiScrollUnfurled,
    GiStarSwirl,
} from "react-icons/gi";
import {
    Sparkles,
    FileText,
    ClipboardCheck,
    Settings,
    Bug,
    Bell,
    Shield,
    Activity,
    BrainCircuit,
    Camera,
} from "lucide-react";

const tools = [
    // AI Infrastructure
    {
        section: "AI Infrastructure",
        icon: <BrainCircuit className="h-5 w-5 text-galactic" />,
        items: [
            {
                href: "/admin/ai",
                icon: BrainCircuit,
                title: "AI Infrastructure",
                copy: "Centralized management of AI providers, models, reasoning settings, and endpoint testing.",
            },
        ],
    },
    // Horoscope Engine
    {
        section: "Horoscope Engine",
        icon: <GiStarSwirl className="h-5 w-5 text-galactic" />,
        items: [
            {
                href: "/admin/horoscope",
                icon: Activity,
                title: "Daily Overview",
                copy: "View generation status for all 12 signs, inspect content, trigger recomputation.",
            },
            {
                href: "/admin/horoscope/context",
                icon: FileText,
                title: "Context Viewer",
                copy: "Inspect the daily astrology context: planet positions, aspects, retrogrades, themes.",
            },
            {
                href: "/admin/horoscope/generate",
                icon: Sparkles,
                title: "Generate Controls",
                copy: "Retry failed generations, override content, and manage the generation pipeline.",
            },
        ],
    },
    // Oracle CMS
    {
        section: "Oracle CMS",
        icon: <GiCursedStar className="h-5 w-5 text-galactic" />,
        items: [
            {
                href: "/admin/oracle",
                icon: Activity,
                title: "Oracle Overview",
                copy: "Runtime status, soul document health, and quick links.",
            },
            {
                href: "/admin/oracle/settings",
                icon: Settings,
                title: "Oracle Settings",
                copy: "Soul document, providers, model chain, limits, quotas, and ops.",
            },
            {
                href: "/admin/oracle/debug",
                icon: Bug,
                title: "Oracle Debug",
                copy: "Live inspection of sessions, prompts, tokens, and pipeline state.",
            },
        ],
    },
    // Journal CMS
    {
        section: "Journal CMS",
        icon: <GiScrollUnfurled className="h-5 w-5 text-galactic" />,
        items: [
            {
                href: "/admin/journal",
                icon: Activity,
                title: "Journal Overview",
                copy: "Journaling activity, consent stats, and system health.",
            },
            {
                href: "/admin/journal/settings",
                icon: Settings,
                title: "Journal Settings",
                copy: "Limits, feature toggles, prompt bank, and Oracle integration.",
            },
        ],
    },
    // Media
    {
        section: "Media",
        icon: <Camera className="h-5 w-5 text-galactic" />,
        items: [
            {
                href: "/admin/media/instagram",
                icon: Camera,
                title: "Instagram",
                copy: "Create and preview Instagram story/post assets for each zodiac sign.",
            },
        ],
    },
    // Moderation & Notifications
    {
        section: "Operations",
        icon: <Shield className="h-5 w-5 text-red-400" />,
        items: [
            {
                href: "/admin/ban",
                icon: Shield,
                title: "Username Bans",
                copy: "Regex patterns that block prohibited usernames.",
            },
            {
                href: "/admin/notifications",
                icon: Bell,
                title: "Notifications",
                copy: "Compose, schedule, and broadcast notifications to users.",
            },
        ],
    },
];

export default function AdminDashboardPage() {
    return (
        <div className="max-w-6xl space-y-10">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-serif font-bold tracking-tight">
                    Admin Dashboard
                </h1>
                <p className="text-muted-foreground mt-1">
                    All tools and systems at your disposal. Pick a section to get started.
                </p>
            </div>

            {/* Tool Sections */}
            {tools.map((section) => (
                <div key={section.section}>
                    <div className="flex items-center gap-2 mb-4">
                        {section.icon}
                        <h2 className="text-xl font-semibold">{section.section}</h2>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                        {section.items.map((item) => (
                            <Link key={item.href} href={item.href} className="group">
                                <Card className="h-full border-border/50 bg-card/50 backdrop-blur-sm hover:border-primary/30 transition-all duration-300">
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                                            <item.icon className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                                            {item.title}
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <CardDescription>{item.copy}</CardDescription>
                                    </CardContent>
                                </Card>
                            </Link>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}
