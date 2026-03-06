"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { Loader2, Activity, FileText, MessageCircle, Puzzle, Settings, Tag } from "lucide-react";
import { GiCursedStar } from "react-icons/gi";
import { api } from "../../../../convex/_generated/api";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function OracleOverviewPage() {
  const categories = useQuery(api.oracle.categories.listAll);
  const settings = useQuery(api.oracle.settings.listAllSettings);
  const soulDocs = useQuery(api.oracle.soul.getAllSoulDocs);

  if (categories === undefined || settings === undefined || soulDocs === undefined) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const getSetting = (key: string) => settings.find((setting) => setting.key === key)?.value;
  const oracleEnabled = getSetting("kill_switch") !== "true";
  const activeCategories = categories.filter((category) => category.isActive).length;
  const hardLimit = getSetting("tokens_hard_limit") ?? "1000";
  const modelA = getSetting("model_a") ?? "google/gemini-2.5-flash";
  const latestSoulUpdate = [...soulDocs]
    .filter((doc) => doc.updatedAt)
    .sort((left, right) => (right.updatedAt ?? 0) - (left.updatedAt ?? 0))[0];

  return (
    <div className="max-w-6xl space-y-8">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <GiCursedStar className="h-8 w-8 text-galactic" />
          <div>
            <h1 className="text-2xl font-serif font-bold">Oracle CMS</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Manage prompt architecture, soul documents, and runtime controls.
            </p>
          </div>
        </div>
        <Badge
          variant={oracleEnabled ? "default" : "destructive"}
          className={oracleEnabled
            ? "border-emerald-500/30 bg-emerald-500/15 px-4 py-1.5 text-emerald-400"
            : "border-red-500/30 bg-red-500/15 px-4 py-1.5 text-red-400"}
        >
          <span className={`mr-2 h-2 w-2 rounded-full ${oracleEnabled ? "bg-emerald-400" : "bg-red-400"}`} />
          {oracleEnabled ? "Oracle LIVE" : "Oracle OFFLINE"}
        </Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="border-border/50 bg-card/50">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Tag className="h-3.5 w-3.5" />
              Categories
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{activeCategories}</div>
            <p className="mt-1 text-xs text-muted-foreground">
              {categories.length} total configured categories
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/50">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Activity className="h-3.5 w-3.5" />
              Runtime Ceiling
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{hardLimit}</div>
            <p className="mt-1 text-xs text-muted-foreground">
              hard-limit tokens on {modelA.split("/").pop()}
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/50">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <FileText className="h-3.5 w-3.5" />
              Soul Documents
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{soulDocs.length}</div>
            <p className="mt-1 text-xs text-muted-foreground">
              {latestSoulUpdate?.label ?? "No soul doc saved yet"}
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/50">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Settings className="h-3.5 w-3.5" />
              Last Soul Update
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-semibold">
              {latestSoulUpdate?.updatedAt
                ? new Date(latestSoulUpdate.updatedAt).toLocaleDateString()
                : "Not saved"}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {latestSoulUpdate?.updatedBy ?? "No editor recorded"}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/50 bg-card/50">
        <CardHeader>
          <CardTitle className="text-base">Quick Links</CardTitle>
          <CardDescription>
            The highest-leverage parts of the Oracle admin surface.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[
              {
                href: "/admin/oracle/soul",
                icon: FileText,
                title: "Soul Documents",
                copy: "Edit the seven core prompt documents.",
              },
              {
                href: "/admin/oracle/settings",
                icon: Settings,
                title: "Settings",
                copy: "Tune models, token tiers, quotas, and ops.",
              },
              {
                href: "/admin/oracle/templates",
                icon: MessageCircle,
                title: "Templates",
                copy: "Manage seeded question entry points.",
              },
              {
                href: "/admin/oracle/context-injection",
                icon: Puzzle,
                title: "Context & Injections",
                copy: "Control category framing and scenario layers.",
              },
            ].map((item) => (
              <Link key={item.href} href={item.href} className="group">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 transition-colors hover:border-galactic/40 hover:bg-galactic/5">
                  <item.icon className="mb-3 h-5 w-5 text-galactic" />
                  <p className="text-sm font-medium group-hover:text-galactic">{item.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{item.copy}</p>
                </div>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
