"use client";

import * as React from "react";
import { useQuery, useMutation } from "convex/react";
import { Loader2 } from "lucide-react";
import { api } from "../../../../convex/_generated/api";
import {
  parseProvidersConfig,
  type ProviderConfig,
} from "@/lib/oracle/providers";
import { ProviderManager } from "@/components/ai-admin/provider-manager";
import { ModelRegistry } from "@/components/ai-admin/model-registry";
import { AITestingPanel } from "@/components/ai-admin/ai-testing-panel";
import { AISettingsPanel } from "@/components/ai-admin/ai-settings-panel";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

export default function AIAdminPage() {
  const settings = useQuery(api.oracle.settings.listAllSettings);
  const upsertProviders = useMutation(api.oracle.upsertProviders.upsertProvidersConfig);

  const [providers, setProviders] = React.useState<ProviderConfig[]>([]);
  const [savingKey, setSavingKey] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!settings) return;
    const get = (key: string) =>
      settings.find((s: { key: string; value: string }) => s.key === key)?.value;
    setProviders(parseProvidersConfig(get("providers_config")));
  }, [settings]);

  async function saveProviders(providersToSave: ProviderConfig[]) {
    setSavingKey("providers");
    try {
      // Also save the current model chain so it doesn't get wiped
      const get = (key: string) =>
        settings?.find((s: { key: string; value: string }) => s.key === key)?.value;
      const modelChainRaw = get("model_chain") ?? "[]";
      await upsertProviders({
        providersConfig: JSON.stringify(providersToSave),
        modelChain: modelChainRaw,
      });
      setProviders(providersToSave);
      toast.success("Providers saved successfully");
    } catch (error: any) {
      toast.error(error?.message ?? "Failed to save provider config");
    } finally {
      setSavingKey(null);
    }
  }

  if (!settings) {
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
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="providers">Providers</TabsTrigger>
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