"use client";

import * as React from "react";
import { Plus, Trash2, Link as LinkIcon, Key, Network } from "lucide-react";

import {
  ProviderConfig,
  ProviderType,
  PROVIDER_TYPES,
  PROVIDER_TYPE_PRESETS,
  PROVIDER_TYPE_INFO,
} from "@/lib/oracle/providers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ProviderManagerProps {
  providers: ProviderConfig[];
  onChange: (providers: ProviderConfig[]) => void;
}

export function ProviderManager({ providers, onChange }: ProviderManagerProps) {
  const [showAdd, setShowAdd] = React.useState(false);
  const [newType, setNewType] = React.useState<ProviderType>("openrouter");
  const [newId, setNewId] = React.useState("");
  const [newName, setNewName] = React.useState("");
  const [newBaseUrl, setNewBaseUrl] = React.useState("");
  const [newApiKeyEnvVar, setNewApiKeyEnvVar] = React.useState("");
  const [providerToDelete, setProviderToDelete] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (showAdd) {
      const preset = PROVIDER_TYPE_PRESETS[newType];
      let baseId = newType;
      let counter = 1;
      while (providers.some(p => p.id === (counter === 1 ? baseId : `${baseId}_${counter}`))) {
        counter++;
      }
      setNewId(counter === 1 ? baseId : `${baseId}_${counter}`);
      setNewName(preset.defaultName + (counter > 1 ? ` ${counter}` : ""));
      setNewBaseUrl(preset.defaultBaseUrl);
      setNewApiKeyEnvVar(preset.defaultApiKeyEnvVar);
    }
  }, [showAdd, newType, providers]);

  const handleAdd = () => {
    if (!newId || !newName || !newBaseUrl || (!newApiKeyEnvVar && newType !== "ollama")) {
      return;
    }
    onChange([
      ...providers,
      {
        id: newId,
        type: newType,
        name: newName,
        baseUrl: newBaseUrl,
        apiKeyEnvVar: newApiKeyEnvVar,
      },
    ]);
    setShowAdd(false);
  };

  const handleDelete = () => {
    if (providerToDelete) {
      onChange(providers.filter(p => p.id !== providerToDelete));
      setProviderToDelete(null);
    }
  };

  return (
    <div className="space-y-4">
      {providers.map((p) => (
        <Card key={p.id} className="border-border/50 bg-card/50">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-semibold text-lg">{p.name}</h3>
                  <Badge variant="secondary" className="text-xs">
                    {PROVIDER_TYPE_INFO[p.type].label}
                  </Badge>
                  <Badge variant="outline" className="text-xs text-muted-foreground border-white/10">
                    ID: {p.id}
                  </Badge>
                </div>
                <div className="space-y-1 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Network className="w-4 h-4" />
                    <span>{p.baseUrl}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Key className="w-4 h-4" />
                    <span>{p.apiKeyEnvVar || "(No API Key required)"}</span>
                  </div>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                onClick={() => setProviderToDelete(p.id)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}

      {providers.length === 0 && (
        <Card className="border-dashed border-border/50 bg-transparent">
          <CardContent className="flex flex-col items-center justify-center py-10 text-center">
            <p className="text-muted-foreground mb-4">No providers configured.</p>
          </CardContent>
        </Card>
      )}

      <Button
        variant="outline"
        className="w-full border-dashed"
        onClick={() => setShowAdd(true)}
      >
        <Plus className="w-4 h-4 mr-2" /> Add Provider
      </Button>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add Provider</DialogTitle>
            <DialogDescription>
              Configure a new inference provider endpoint.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Provider Type</Label>
              <Select value={newType} onValueChange={(val: ProviderType) => setNewType(val)}>
                <SelectTrigger className="border-white/10 bg-black/20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROVIDER_TYPES.map(type => (
                    <SelectItem key={type} value={type}>
                      {PROVIDER_TYPE_INFO[type].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {PROVIDER_TYPE_INFO[newType].description}
              </p>
            </div>

            <div className="space-y-2">
              <Label>Internal ID</Label>
              <Input
                value={newId}
                onChange={e => setNewId(e.target.value)}
                className="border-white/10 bg-black/20"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Display Name</Label>
              <Input
                value={newName}
                onChange={e => setNewName(e.target.value)}
                className="border-white/10 bg-black/20"
              />
            </div>

            <div className="space-y-2">
              <Label>Base URL</Label>
              <Input
                value={newBaseUrl}
                onChange={e => setNewBaseUrl(e.target.value)}
                className="border-white/10 bg-black/20"
              />
            </div>

            <div className="space-y-2">
              <Label>
                API Key Env Var {newType === "ollama" ? "(Optional)" : ""}
              </Label>
              <Input
                value={newApiKeyEnvVar}
                onChange={e => setNewApiKeyEnvVar(e.target.value)}
                className="border-white/10 bg-black/20"
              />
              <p className="text-xs text-muted-foreground">
                Name of the environment variable (e.g. OLLAMA_API_KEY).
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button onClick={handleAdd}>Add Provider</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!providerToDelete} onOpenChange={(open) => !open && setProviderToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Provider</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove this provider? Models referencing this provider ID in the chain will fail validation.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setProviderToDelete(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
