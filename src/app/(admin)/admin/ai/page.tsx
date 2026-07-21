"use client";

import * as React from "react";
import { useQuery, useMutation } from "convex/react";
import { makeFunctionReference } from "convex/server";
import { Loader2 } from "lucide-react";
import { type ProviderConfig } from "@/lib/oracle/providers";
import { ProviderManager } from "@/components/ai-admin/provider-manager";
import { ModelRegistry } from "@/components/ai-admin/model-registry";
import { AITestingPanel } from "@/components/ai-admin/ai-testing-panel";
import { AISettingsPanel } from "@/components/ai-admin/ai-settings-panel";
import { FeatureProfilesPanel } from "@/components/ai-admin/feature-profiles-panel";
import { UserModelOptionsPanel } from "@/components/ai-admin/user-model-options-panel";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

const listProvidersRef = makeFunctionReference<"query">("aiGateway/admin:listProviders");
const upsertProviderRef = makeFunctionReference<"mutation">("aiGateway/admin:upsertProvider");
const disableProviderRef = makeFunctionReference<"mutation">("aiGateway/admin:disableProvider");

export default function AIAdminPage() {
  const providerRows = useQuery(listProvidersRef);
  const upsertProvider = useMutation(upsertProviderRef);
  const disableProvider = useMutation(disableProviderRef);

  const [providers, setProviders] = React.useState<ProviderConfig[]>([]);
  const [savingKey, setSavingKey] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!providerRows) return;
    setProviders(
      (providerRows as any[])
        .filter((provider: any) => provider.enabled)
        .map((provider: any) => ({
          id: provider.providerId,
          name: provider.name,
          type: provider.type,
          baseUrl: provider.baseUrl,
          apiKeyEnvVar: provider.apiKeyEnvVar,
          maxConcurrent: provider.maxConcurrent,
        })),
    );
  }, [providerRows]);

  async function saveProviders(providersToSave: ProviderConfig[]) {
    setSavingKey("providers");
    try {
      const nextProviderIds = new Set(providersToSave.map((provider) => provider.id));
      for (const provider of providersToSave) {
        await upsertProvider({
          providerId: provider.id,
          name: provider.name,
          type: provider.type,
          baseUrl: provider.baseUrl,
          apiKeyEnvVar: provider.apiKeyEnvVar,
          maxConcurrent: provider.maxConcurrent,
          enabled: true,
        });
      }
      for (const existing of providerRows ?? []) {
        if (existing.enabled && !nextProviderIds.has(existing.providerId)) {
          await disableProvider({ providerId: existing.providerId });
        }
      }
      setProviders(providersToSave);
      toast.success("Providers saved successfully");
    } catch (error: any) {
      toast.error(error?.message ?? "Failed to save provider config");
    } finally {
      setSavingKey(null);
    }
  }

  if (!providerRows) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl space-y-8">
      <div>
        <h1 className="text-2xl font-serif font-bold tracking-tight">
          AI Infrastructure
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Central management for AI providers, models, and inference settings.
          Configured providers are shared across all features (Oracle, Horoscope, future).
        </p>
      </div>

      <Tabs defaultValue="providers" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 gap-1 sm:grid-cols-6">
          <TabsTrigger value="providers">Providers</TabsTrigger>
          <TabsTrigger value="profiles">Profiles</TabsTrigger>
          <TabsTrigger value="user-models">User models</TabsTrigger>
          <TabsTrigger value="models">Models</TabsTrigger>
          <TabsTrigger value="testing">Testing</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="providers" className="space-y-4">
          <Card className="border-border/50 bg-card/50">
            <CardHeader>
              <CardTitle className="text-base">Inference Providers</CardTitle>
              <CardDescription>
                Configure API endpoints and authentication. All features share the same provider list.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ProviderManager
                providers={providers}
                onChange={setProviders}
                onSave={saveProviders}
                saving={savingKey === "providers"}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="profiles" className="space-y-4">
          <FeatureProfilesPanel />
        </TabsContent>

        <TabsContent value="user-models" className="space-y-4">
          <UserModelOptionsPanel providers={providers} />
        </TabsContent>

        <TabsContent value="models" className="space-y-4">
          <ModelRegistry providers={providers} />
        </TabsContent>

        <TabsContent value="testing" className="space-y-4">
          <AITestingPanel providers={providers} />
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <AISettingsPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
