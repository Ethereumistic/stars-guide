"use client";

import * as React from "react";
import { useMutation, useQuery } from "convex/react";
import { Clock3, Eye, History, Loader2, Save } from "lucide-react";
import { api } from "../../../../../convex/_generated/api";
import { buildSystemPrompt } from "../../../../../lib/oracle/promptBuilder";
import {
  SAMPLE_NATAL_CONTEXT,
  SOUL_DOC_KEYS,
  type SoulDocKey,
} from "../../../../../lib/oracle/soul";
import { ORACLE_SAFETY_RULES } from "../../../../../lib/oracle/safetyRules";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export default function OracleSoulPage() {
  const docs = useQuery(api.oracle.soul.getAllSoulDocs);
  const [selectedKey, setSelectedKey] = React.useState<SoulDocKey>("soul_tone_voice");
  const [editorValues, setEditorValues] = React.useState<Record<string, string>>({});
  const [historyOpen, setHistoryOpen] = React.useState(false);
  const [previewOpen, setPreviewOpen] = React.useState(false);
  const [restoreVersion, setRestoreVersion] = React.useState<number | null>(null);
  const [saving, setSaving] = React.useState(false);

  const saveSoulDoc = useMutation(api.oracle.soul.saveSoulDoc);
  const restoreSoulDocVersion = useMutation(api.oracle.soul.restoreSoulDocVersion);
  const labelSoulDocVersion = useMutation(api.oracle.soul.labelSoulDocVersion);
  const versionHistory = useQuery(api.oracle.soul.getSoulDocVersionHistory, { key: selectedKey });

  React.useEffect(() => {
    if (!docs) {
      return;
    }

    setEditorValues((current) => {
      if (Object.keys(current).length > 0) {
        return current;
      }
      return Object.fromEntries(docs.map((doc) => [doc.key, doc.value]));
    });
  }, [docs]);

  if (!docs) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const selectedDoc = docs.find((doc) => doc.key === selectedKey) ?? docs[0];
  const previewDocs = Object.fromEntries(
    docs.map((doc) => [doc.key, editorValues[doc.key] ?? doc.value]),
  ) as Record<SoulDocKey, string>;
  const fullPromptPreview = buildSystemPrompt({ soulDocs: previewDocs });

  return (
    <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
      <Card className="h-fit border-border/50 bg-card/50">
        <CardHeader>
          <CardTitle className="text-base">Soul Documents</CardTitle>
          <CardDescription>
            Seven independent prompt documents. Tone & Voice is selected by default.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {docs.map((doc) => (
            <button
              key={doc.key}
              type="button"
              onClick={() => setSelectedKey(doc.key)}
              className={`w-full rounded-2xl border px-4 py-3 text-left transition-colors ${selectedKey === doc.key ? "border-galactic/40 bg-galactic/10" : "border-white/10 bg-black/10 hover:border-white/20"}`}
            >
              <p className="text-sm font-medium">{doc.label}</p>
              <p className="mt-1 text-xs text-muted-foreground">v{doc.version}</p>
            </button>
          ))}
        </CardContent>
      </Card>

      <Card className="border-border/50 bg-card/50">
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <CardTitle className="text-lg">{selectedDoc.label}</CardTitle>
                <Badge variant="outline">v{selectedDoc.version}</Badge>
              </div>
              <CardDescription className="mt-2">
                {selectedDoc.updatedAt
                  ? `Last saved ${new Date(selectedDoc.updatedAt).toLocaleString()} by ${selectedDoc.updatedBy ?? "unknown"}`
                  : "Not saved yet"}
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" className="gap-2" onClick={() => setHistoryOpen(true)}>
                <History className="h-4 w-4" />
                View History
              </Button>
              <Button variant="outline" className="gap-2" onClick={() => setPreviewOpen(true)}>
                <Eye className="h-4 w-4" />
                Preview in Full Prompt
              </Button>
              <Button
                className="gap-2"
                disabled={saving}
                onClick={async () => {
                  setSaving(true);
                  try {
                    const result = await saveSoulDoc({
                      key: selectedKey,
                      content: editorValues[selectedKey] ?? selectedDoc.value,
                    });
                    toast.success(`${selectedDoc.label} saved - v${result.version}`);
                  } catch (error: any) {
                    toast.error(error?.message ?? "Failed to save soul document");
                  } finally {
                    setSaving(false);
                  }
                }}
              >
                <Save className="h-4 w-4" />
                {saving ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            value={editorValues[selectedKey] ?? selectedDoc.value}
            onChange={(event) =>
              setEditorValues((current) => ({
                ...current,
                [selectedKey]: event.target.value,
              }))
            }
            className="min-h-[380px] border-white/10 bg-black/20 font-mono text-sm"
          />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{(editorValues[selectedKey] ?? selectedDoc.value).length} characters</span>
            <span>{Math.round((editorValues[selectedKey] ?? selectedDoc.value).length / 4)} token estimate</span>
          </div>

          <Accordion type="single" collapsible className="rounded-2xl border border-white/10 px-4">
            <AccordionItem value="guidance" className="border-none">
              <AccordionTrigger>Guidance</AccordionTrigger>
              <AccordionContent>
                <div className="space-y-3 text-sm text-muted-foreground">
                  <p>{selectedDoc.guidance.purpose}</p>
                  <div>
                    <p className="font-medium text-foreground">What belongs here</p>
                    {selectedDoc.guidance.belongs.map((item: string) => (
                      <p key={item}>- {item}</p>
                    ))}
                  </div>
                  <div>
                    <p className="font-medium text-foreground">What does not belong</p>
                    {selectedDoc.guidance.excludes.map((item: string) => (
                      <p key={item}>- {item}</p>
                    ))}
                  </div>
                  {selectedDoc.guidance.note ? <p>{selectedDoc.guidance.note}</p> : null}
                  {selectedDoc.guidance.warning ? <p className="text-amber-300">{selectedDoc.guidance.warning}</p> : null}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>

      <Sheet open={historyOpen} onOpenChange={setHistoryOpen}>
        <SheetContent side="right" className="w-full border-white/10 bg-background/95 sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>{selectedDoc.label} History</SheetTitle>
            <SheetDescription>Newest saved versions first. Restoring a version backs up the current draft first.</SheetDescription>
          </SheetHeader>
          <ScrollArea className="h-[calc(100vh-120px)] px-4 pb-6">
            <div className="space-y-4">
              {versionHistory?.map((version) => (
                <div key={version._id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-medium">v{version.version}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        <Clock3 className="mr-1 inline h-3 w-3" />
                        {new Date(version.savedAt).toLocaleString()} by {version.savedByEmail ?? "unknown"}
                      </p>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => setRestoreVersion(version.version)}>
                      Restore
                    </Button>
                  </div>
                  <Input
                    value={version.label ?? ""}
                    onChange={async (event) => {
                      await labelSoulDocVersion({ versionId: version._id, label: event.target.value });
                    }}
                    placeholder="Label this version"
                    className="mt-3 border-white/10 bg-black/20"
                  />
                  <details className="mt-3 rounded-xl border border-white/10 bg-black/20 p-3">
                    <summary className="cursor-pointer text-sm font-medium">Preview</summary>
                    <Textarea readOnly value={version.content} className="mt-3 min-h-[180px] border-white/10 bg-black/10 font-mono text-xs" />
                  </details>
                </div>
              ))}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-h-[90vh] max-w-5xl overflow-hidden border-white/10 bg-background/95">
          <DialogHeader>
            <DialogTitle>Full Prompt Preview</DialogTitle>
            <DialogDescription>
              This is the exact prompt stack Oracle will read before runtime context is appended.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[70vh] pr-4">
            <Accordion type="single" collapsible defaultValue="safety" className="rounded-2xl border border-white/10 px-4">
              <AccordionItem value="safety" className="border-none">
                <AccordionTrigger>Hardcoded Safety Rules (not editable)</AccordionTrigger>
                <AccordionContent>
                  <Textarea readOnly value={ORACLE_SAFETY_RULES} className="min-h-[220px] border-white/10 bg-black/20 font-mono text-xs" />
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            <div className="mt-4 space-y-4">
              {SOUL_DOC_KEYS.map((key) => {
                const doc = docs.find((item) => item.key === key)!;
                return (
                  <div key={key} className={`rounded-2xl border p-4 ${selectedKey === key ? "border-galactic/40 bg-galactic/5" : "border-white/10 bg-black/10"}`}>
                    <p className="mb-2 text-sm font-medium">{doc.label}</p>
                    <Textarea readOnly value={previewDocs[key]} className="min-h-[160px] border-white/10 bg-black/20 font-mono text-xs" />
                  </div>
                );
              })}
            </div>

            <div className="mt-4 rounded-2xl border border-white/10 bg-black/10 p-4">
              <p className="mb-2 text-sm font-medium">Sample Natal Context</p>
              <Textarea readOnly value={SAMPLE_NATAL_CONTEXT} className="min-h-[180px] border-white/10 bg-black/20 font-mono text-xs" />
            </div>

            <div className="mt-4 rounded-2xl border border-white/10 bg-black/10 p-4">
              <p className="mb-2 text-sm font-medium">Assembled System Prompt</p>
              <Textarea readOnly value={fullPromptPreview} className="min-h-[280px] border-white/10 bg-black/20 font-mono text-xs" />
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={restoreVersion !== null} onOpenChange={(open) => !open && setRestoreVersion(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Restore version</DialogTitle>
            <DialogDescription>
              Restore v{restoreVersion}? The current active version will be backed up first.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRestoreVersion(null)}>Cancel</Button>
            <Button
              onClick={async () => {
                if (!restoreVersion) {
                  return;
                }
                try {
                  const restoredContent = versionHistory?.find((version) => version.version === restoreVersion)?.content;
                  const result = await restoreSoulDocVersion({ key: selectedKey, version: restoreVersion });
                  if (restoredContent) {
                    setEditorValues((current) => ({
                      ...current,
                      [selectedKey]: restoredContent,
                    }));
                  }
                  toast.success(`${selectedDoc.label} restored - v${result.version}`);
                  setRestoreVersion(null);
                  setHistoryOpen(false);
                } catch (error: any) {
                  toast.error(error?.message ?? "Failed to restore version");
                }
              }}
            >
              Restore
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}


