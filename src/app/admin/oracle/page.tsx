"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
    Tag,
    MessageCircle,
    Puzzle,
    Users,
    Clock,
    Activity,
    Loader2,
} from "lucide-react";
import { GiCursedStar } from "react-icons/gi";
import Link from "next/link";

export default function OracleOverviewPage() {
    const categories = useQuery(api.oracle.categories.listAll);
    const settings = useQuery(api.oracle.settings.listAllSettings);

    const isLoading = categories === undefined || settings === undefined;

    // Extract key settings
    const getSetting = (key: string) =>
        settings?.find((s) => s.key === key)?.value;

    const oracleEnabled = getSetting("oracle_enabled") === "true";
    const modelA = getSetting("model_a") ?? "Not set";
    const modelB = getSetting("model_b") ?? "Not set";
    const modelC = getSetting("model_c") ?? "Not set";
    const temperature = getSetting("temperature") ?? "0.82";
    const maxTokens = getSetting("max_tokens") ?? "600";
    const soulPromptSetting = settings?.find((s) => s.key === "soul_prompt");
    const soulPromptLength = soulPromptSetting?.value?.length ?? 0;

    // Quota limits
    const quotaFree = getSetting("quota_limit_user") ?? "5";
    const quotaPopular = getSetting("quota_limit_popular") ?? "5";
    const quotaPremium = getSetting("quota_limit_premium") ?? "10";

    const activeCategories = categories?.filter((c) => c.isActive).length ?? 0;

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="space-y-8 max-w-6xl">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <GiCursedStar className="w-8 h-8 text-galactic" />
                    <div>
                        <h1 className="text-2xl font-serif font-bold">Oracle CMS</h1>
                        <p className="text-sm text-muted-foreground">
                            Manage Oracle content, prompts, and configuration
                        </p>
                    </div>
                </div>
                <Badge
                    variant={oracleEnabled ? "default" : "destructive"}
                    className={`text-sm px-4 py-1.5 ${oracleEnabled
                        ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                        : "bg-red-500/15 text-red-400 border-red-500/30"
                        }`}
                >
                    <div className={`w-2 h-2 rounded-full mr-2 ${oracleEnabled ? "bg-emerald-400 animate-pulse" : "bg-red-400"}`} />
                    {oracleEnabled ? "Oracle LIVE" : "Oracle OFFLINE"}
                </Badge>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="bg-card/50 border-border/50">
                    <CardHeader className="pb-2">
                        <CardDescription className="flex items-center gap-2">
                            <Tag className="w-3.5 h-3.5" />
                            Categories
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{activeCategories}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            {categories?.length ?? 0} total · {activeCategories} active
                        </p>
                    </CardContent>
                </Card>

                <Card className="bg-card/50 border-border/50">
                    <CardHeader className="pb-2">
                        <CardDescription className="flex items-center gap-2">
                            <Activity className="w-3.5 h-3.5" />
                            Primary Model
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="text-lg font-semibold truncate">{modelA.split("/").pop()}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            temp: {temperature} · max tokens: {maxTokens}
                        </p>
                    </CardContent>
                </Card>

                <Card className="bg-card/50 border-border/50">
                    <CardHeader className="pb-2">
                        <CardDescription className="flex items-center gap-2">
                            <Users className="w-3.5 h-3.5" />
                            Quota Limits
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-1">
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Free</span>
                                <span className="font-medium">{quotaFree} lifetime</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Popular</span>
                                <span className="font-medium">{quotaPopular}/day</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Premium</span>
                                <span className="font-medium">{quotaPremium}/day</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-card/50 border-border/50">
                    <CardHeader className="pb-2">
                        <CardDescription className="flex items-center gap-2">
                            <MessageCircle className="w-3.5 h-3.5" />
                            Soul Prompt
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{soulPromptLength}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            characters · {soulPromptSetting?.updatedAt
                                ? `Updated ${new Date(soulPromptSetting.updatedAt).toLocaleDateString()}`
                                : "Not set"}
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Model Fallback Chain */}
            <Card className="bg-card/50 border-border/50">
                <CardHeader>
                    <CardTitle className="text-base">Model Fallback Chain</CardTitle>
                    <CardDescription>
                        Oracle tries models in order — falls to next on failure
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
                        <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-4 py-2.5 flex-1 min-w-0">
                            <Badge variant="outline" className="shrink-0 border-emerald-500/50 text-emerald-400 text-[10px]">A</Badge>
                            <span className="text-sm font-medium truncate">{modelA}</span>
                        </div>
                        <span className="text-muted-foreground text-xs hidden sm:block">→</span>
                        <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-lg px-4 py-2.5 flex-1 min-w-0">
                            <Badge variant="outline" className="shrink-0 border-amber-500/50 text-amber-400 text-[10px]">B</Badge>
                            <span className="text-sm font-medium truncate">{modelB}</span>
                        </div>
                        <span className="text-muted-foreground text-xs hidden sm:block">→</span>
                        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2.5 flex-1 min-w-0">
                            <Badge variant="outline" className="shrink-0 border-red-500/50 text-red-400 text-[10px]">C</Badge>
                            <span className="text-sm font-medium truncate">{modelC}</span>
                        </div>
                        <span className="text-muted-foreground text-xs hidden sm:block">→</span>
                        <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 shrink-0">
                            <Badge variant="outline" className="shrink-0 border-white/30 text-white/50 text-[10px]">D</Badge>
                            <span className="text-sm text-muted-foreground">Hardcoded</span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Categories Grid */}
            <Card className="bg-card/50 border-border/50">
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle className="text-base">Categories</CardTitle>
                        <CardDescription>Oracle's 6 domain badges</CardDescription>
                    </div>
                    <Link
                        href="/admin/oracle/categories"
                        className="text-xs text-galactic hover:underline"
                    >
                        Manage →
                    </Link>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                        {categories?.map((cat) => (
                            <div
                                key={cat._id}
                                className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-opacity ${cat.isActive
                                    ? "border-white/10 bg-white/5"
                                    : "border-white/5 bg-white/2 opacity-40"
                                    }`}
                            >
                                <span className="text-2xl">{cat.icon}</span>
                                <span className="text-xs font-medium">{cat.name}</span>
                                {!cat.isActive && (
                                    <Badge variant="outline" className="text-[9px] border-white/20 text-white/30">
                                        Inactive
                                    </Badge>
                                )}
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Quick Links */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Link href="/admin/oracle/settings" className="group">
                    <Card className="bg-card/50 border-border/50 hover:border-galactic/30 transition-colors">
                        <CardContent className="pt-6 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-galactic/10 flex items-center justify-center group-hover:bg-galactic/20 transition-colors">
                                <Activity className="w-5 h-5 text-galactic" />
                            </div>
                            <div>
                                <p className="text-sm font-medium group-hover:text-galactic transition-colors">Edit Soul Prompt</p>
                                <p className="text-xs text-muted-foreground">Core personality & rules</p>
                            </div>
                        </CardContent>
                    </Card>
                </Link>
                <Link href="/admin/oracle/templates" className="group">
                    <Card className="bg-card/50 border-border/50 hover:border-galactic/30 transition-colors">
                        <CardContent className="pt-6 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-galactic/10 flex items-center justify-center group-hover:bg-galactic/20 transition-colors">
                                <MessageCircle className="w-5 h-5 text-galactic" />
                            </div>
                            <div>
                                <p className="text-sm font-medium group-hover:text-galactic transition-colors">Manage Templates</p>
                                <p className="text-xs text-muted-foreground">Template questions & injections</p>
                            </div>
                        </CardContent>
                    </Card>
                </Link>
                <Link href="/admin/oracle/context-injection" className="group">
                    <Card className="bg-card/50 border-border/50 hover:border-galactic/30 transition-colors">
                        <CardContent className="pt-6 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-galactic/10 flex items-center justify-center group-hover:bg-galactic/20 transition-colors">
                                <Puzzle className="w-5 h-5 text-galactic" />
                            </div>
                            <div>
                                <p className="text-sm font-medium group-hover:text-galactic transition-colors">Context & Injections</p>
                                <p className="text-xs text-muted-foreground">Category contexts & scenarios</p>
                            </div>
                        </CardContent>
                    </Card>
                </Link>
            </div>
        </div>
    );
}
