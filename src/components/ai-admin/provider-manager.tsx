"use client";

import * as React from "react";
import { Plus, Trash2, Save, Key, Network, Loader2 } from "lucide-react";

import {
  ProviderConfig,
  ProviderType,
  PROVIDER_TYPES,
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
  onSave: (providers: ProviderConfig[]) => void;
  saving: boolean;
}

const PROVIDER_TYPE_PRESETS: Record<
  ProviderType,
  { defaultName: string; defaultBaseUrl: string; defaultApiKeyEnvVar: string }
> = {
  openrouter: {
    defaultName: "OpenRouter",
    defaultBaseUrl: "https://openrouter.ai/api/v1",
    defaultApiKeyEnvVar: "OPENROUTER_API_KEY",
  },
  ollama: {
    defaultName: "Ollama",
    defaultBaseUrl: "http://localhost:11434/v1",
    defaultApiKeyEnvVar: "OLLAMA_API_KEY",
  },
  openai_compatible: {
    defaultName: "OpenAI Compatible",
    defaultBaseUrl: "https://api.openai.com/v1",
    defaultApiKeyEnvVar: "OPENAI_API_KEY",
  },
};

export function ProviderManager({ providers, onChange, onSave, saving }: ProviderManagerProps) {
  const [showAdd, setShowAdd] = React.useState(false);
  const [newType, setNewType] = React.useState<ProviderType>("openrouter");
  const [newId, setNewId] = React.useState("");
  const [newName, setNewName] = React.useState("");
  const [newBaseUrl, setNewBaseUrl] = React.useState("");
  const [newApiKeyEnvVar, setNewApiKeyEnvVar] = React.useState("");
  const [providerToDelete, setProviderToDelete] = React.useState<string | null>(null);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editName, setEditName] = React.useState("");
  const [editBaseUrl, setEditBaseUrl] = React.useState("");
  const [editApiKeyEnvVar, setEditApiKeyEnvVar] = React.useState("");

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
    const updated = [
      ...providers,
      {
        id: newId,
        type: newType,
        name: newName,
        baseUrl: newBaseUrl,
        apiKeyEnvVar: newApiKeyEnvVar,
      },
    ];
    onChange(updated);
    onSave(updated);
    setShowAdd(false);
  };

  const handleDelete = () => {
    if (providerToDelete) {
      const updated = providers.filter(p => p.id !== providerToDelete);
      onChange(updated);
      onSave(updated);
      setProviderToDelete(null);
    }
  };

  const startEdit = (p: ProviderConfig) => {
    setEditingId(p.id);
    setEditName(p.name);
    setEditBaseUrl(p.baseUrl);
    setEditApiKeyEnvVar(p.apiKeyEnvVar);
  };

  const handleEditSave = () => {
    if (!editingId) return;
    const updated = providers.map(p =>
      p.id === editingId
        ? { ...p, name: editName, baseUrl: editBaseUrl, apiKeyEnvVar: editApiKeyEnvVar }
        : p
    );
    onChange(updated);
    onSave(updated);
    setEditingId(null);
  };

  const hasChanges = providers.length > 0;

  return (
    <div className="space-y-4">
      {providers.map((p) => (
        <Card key={p.id} className="border-border/50 bg-card/50">
          <CardContent className="pt-6">
            {editingId === p.id ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Display Name</Label>
                    <Input
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      className="border-white/10 bg-black/20"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">API Key Env Var</Label>
                    <Input
                      value={editApiKeyEnvVar}
                      onChange={e => setEditApiKeyEnvVar(e.target.value)}
                      className="border-white/10 bg-black/20"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Base URL</Label>
                  <Input
                    value={editBaseUrl}
                    onChange={e => setEditBaseUrl(e.target.value)}
                    className="border-white/10 bg-black/20"
                  />
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleEditSave}>Save Changes</Button>
                  <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>Cancel</Button>
                </div>
              </div>
            ) : (
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
                      <span className="font-mono text-xs">{p.baseUrl}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Key className="w-4 h-4" />
                      <span className="font-mono text-xs">{p.apiKeyEnvVar || "(No API Key required)"}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-foreground"
                    onClick={() => startEdit(p)}
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                    onClick={() => setProviderToDelete(p.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      {providers.length === 0 && (
        <Card className="border-dashed border-border/50 bg-transparent">
          <CardContent className="flex flex-col items-center justify-center py-10 text-center">
            <p className="text-muted-foreground mb-2">No providers configured.</p>
            <p className="text-xs text-muted-foreground">Add an OpenRouter, Ollama, or OpenAI-compatible endpoint.</p>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-3">
        <Button
          variant="outline"
          className="flex-1 border-dashed"
          onClick={() => setShowAdd(true)}
        >
          <Plus className="w-4 h-4 mr-2" /> Add Provider
        </Button>
      </div>

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
                className="border-white/10 bg-black/20 font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">Used internally. Must be unique.</p>
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
                className="border-white/10 bg-black/20 font-mono text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label>
                API Key Env Var {newType === "ollama" ? "(Optional)" : ""}
              </Label>
              <Input
                value={newApiKeyEnvVar}
                onChange={e => setNewApiKeyEnvVar(e.target.value)}
                className="border-white/10 bg-black/20 font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Name of the environment variable. Never stored in DB.
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
              Are you sure you want to remove this provider? Model chains referencing this provider ID will fail.
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