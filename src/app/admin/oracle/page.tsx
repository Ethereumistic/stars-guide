"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { Loader2, Activity, FileText, Settings } from "lucide-react";
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
  const settings = useQuery(api.oracle.settings.listAllSettings);

  if (settings === undefined) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const getSetting = (key: string) => settings.find((setting) => setting.key === key)?.value;
  const oracleEnabled = getSetting("kill_switch") !== "true";
  const maxResponseTokens = getSetting("max_response_tokens") ?? "1000";
  const modelA = getSetting("model_a") ?? "google/gemini-2.5-flash";
  const soulDoc = getSetting("oracle_soul");
  const soulUpdateSetting = settings.find((s) => s.key === "oracle_soul");

  return (
    <div className="max-w-6xl space-y-8">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <GiCursedStar className="h-8 w-8 text-galactic" />
          <div>
            <h1 className="text-2xl font-serif font-bold">Oracle CMS</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Manage the Oracle soul document, runtime controls, and provider configuration.
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
              <Activity className="h-3.5 w-3.5" />
              Runtime Ceiling
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{maxResponseTokens}</div>
            <p className="mt-1 text-xs text-muted-foreground">
              max tokens on {modelA.split("/").pop()}
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/50">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <FileText className="h-3.5 w-3.5" />
              Soul Document
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{soulDoc ? "1" : "0"}</div>
            <p className="mt-1 text-xs text-muted-foreground">
              {soulDoc ? "Unified soul document active" : "No soul document saved"}
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
              {soulUpdateSetting?._creationTime
                ? new Date(soulUpdateSetting._creationTime).toLocaleDateString()
                : "Not saved"}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {soulUpdateSetting?.label ?? "No editor recorded"}
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/50">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Activity className="h-3.5 w-3.5" />
              Context Window
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{getSetting("max_context_messages") ?? "20"}</div>
            <p className="mt-1 text-xs text-muted-foreground">
              max history messages per prompt
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/50 bg-card/50">
        <CardHeader>
          <CardTitle className="text-base">Quick Links</CardTitle>
          <CardDescription>
            The Oracle admin surface.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[
              {
                href: "/admin/oracle/settings",
                icon: Settings,
                title: "Settings",
                copy: "Soul document, providers, model, limits, quotas, and ops.",
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