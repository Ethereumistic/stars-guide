"use client";

import * as React from "react";
import { useMutation, useQuery } from "convex/react";
import { Eye, Loader2, Save } from "lucide-react";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";
import { buildSystemPrompt } from "../../../../../lib/oracle/promptBuilder";
import { ORACLE_FEATURES } from "@/lib/oracle/features";
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export default function OracleContextInjectionPage() {
  const categories = useQuery(api.oracle.categories.listAll);
  const templates = useQuery(api.oracle.templates.listAll, {});
  const categoryContexts = useQuery(api.oracle.injections.listAllCategoryContexts);
  const soulDocs = useQuery(api.oracle.soul.getAllSoulDocs);
  const featureInjections = useQuery(api.oracle.injections.listAllFeatureInjections);
  const saveCategoryContext = useMutation(api.oracle.injections.saveCategoryContext);
  const saveScenarioInjection = useMutation(api.oracle.injections.saveScenarioInjection);
  const saveFeatureInjection = useMutation(api.oracle.injections.saveFeatureInjection);

  const [contextEdits, setContextEdits] = React.useState<Record<string, string>>({});
  const [selectedTemplateId, setSelectedTemplateId] = React.useState<string>("");
  const [selectedFeatureKey, setSelectedFeatureKey] = React.useState<string>("");
  const [injectionMode, setInjectionMode] = React.useState<"structured" | "raw">("structured");
  const [toneModifier, setToneModifier] = React.useState("");
  const [psychologicalFrame, setPsychologicalFrame] = React.useState("");
  const [avoid, setAvoid] = React.useState("");
  const [emphasize, setEmphasize] = React.useState("");
  const [openingGuide, setOpeningGuide] = React.useState("");
  const [rawInjection, setRawInjection] = React.useState("");
  const [featureInjectionText, setFeatureInjectionText] = React.useState("");
  const [previewOpen, setPreviewOpen] = React.useState(false);
  const [previewText, setPreviewText] = React.useState("");

  const existingInjection = useQuery(
    api.oracle.injections.getScenarioInjection,
    selectedTemplateId ? { templateId: selectedTemplateId as Id<"oracle_templates"> } : "skip",
  );

  const existingFeatureInjection = useQuery(
    api.oracle.injections.getFeatureInjection,
    selectedFeatureKey ? { featureKey: selectedFeatureKey } : "skip",
  );

  React.useEffect(() => {
    if (categoryContexts && Object.keys(contextEdits).length === 0) {
      setContextEdits(Object.fromEntries(categoryContexts.map((item) => [item.categoryId, item.contextText])));
    }
  }, [categoryContexts, contextEdits]);

  React.useEffect(() => {
    if (existingInjection === undefined) {
      return;
    }
    if (!existingInjection) {
      setInjectionMode("structured");
      setToneModifier("");
      setPsychologicalFrame("");
      setAvoid("");
      setEmphasize("");
      setOpeningGuide("");
      setRawInjection("");
      return;
    }

    setInjectionMode(existingInjection.useRawText ? "raw" : "structured");
    setToneModifier(existingInjection.toneModifier);
    setPsychologicalFrame(existingInjection.psychologicalFrame);
    setAvoid(existingInjection.avoid);
    setEmphasize(existingInjection.emphasize);
    setOpeningGuide(existingInjection.openingAcknowledgmentGuide);
    setRawInjection(existingInjection.rawInjectionText ?? "");
  }, [existingInjection]);

  React.useEffect(() => {
    if (existingFeatureInjection === undefined) {
      return;
    }

    setFeatureInjectionText(existingFeatureInjection?.contextText ?? "");
  }, [existingFeatureInjection]);

  if (!categories || !templates || !categoryContexts || !soulDocs || !featureInjections) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const soulDocRecord = Object.fromEntries(soulDocs.map((doc) => [doc.key, doc.value])) as any;
  const selectedFeatureRecord = ORACLE_FEATURES.find((feature) => feature.key === selectedFeatureKey) ?? null;
  const selectedFeatureVersion = featureInjections.find((item) => item.featureKey === selectedFeatureKey)?.version;

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-serif font-bold">Context & Injections</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Category framing, per-template scenario layers, and feature-specific instruction blocks.
        </p>
      </div>

      <Tabs defaultValue="contexts" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="contexts">Category Contexts</TabsTrigger>
          <TabsTrigger value="injections">Scenario Injections</TabsTrigger>
          <TabsTrigger value="features">Feature Injections</TabsTrigger>
        </TabsList>

        <TabsContent value="contexts" className="space-y-4">
          {categories.filter((category) => category.isActive).map((category) => {
            const existing = categoryContexts.find((item) => item.categoryId === category._id);
            return (
              <Card key={category._id} className="border-border/50 bg-card/50">
                <CardHeader>
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <CardTitle className="text-base">{category.icon} {category.name}</CardTitle>
                      <CardDescription>{category.description}</CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      {existing ? <Badge variant="outline">v{existing.version}</Badge> : null}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setPreviewText(
                            buildSystemPrompt({
                              soulDocs: soulDocRecord,
                              categoryContext: contextEdits[category._id] ?? "",
                            }),
                          );
                          setPreviewOpen(true);
                        }}
                      >
                        <Eye className="mr-2 h-3.5 w-3.5" /> Preview
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Textarea
                    value={contextEdits[category._id] ?? ""}
                    onChange={(event) => setContextEdits((current) => ({ ...current, [category._id]: event.target.value }))}
                    className="min-h-[140px] border-white/10 bg-black/20 font-mono text-sm"
                  />
                  <div className="flex justify-end">
                    <Button
                      className="gap-2"
                      onClick={async () => {
                        await saveCategoryContext({ categoryId: category._id, contextText: contextEdits[category._id] ?? "" });
                        toast.success(`${category.name} context saved`);
                      }}
                    >
                      <Save className="h-4 w-4" /> Save
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        <TabsContent value="injections" className="space-y-4">
          <Card className="border-border/50 bg-card/50">
            <CardHeader>
              <CardTitle className="text-base">Injection Editor</CardTitle>
              <CardDescription>
                Select a template and define the scenario-specific behavioral modifier.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Template</Label>
                <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                  <SelectTrigger className="border-white/10 bg-black/20">
                    <SelectValue placeholder="Select a template" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.filter((template) => template.isActive).map((template) => (
                      <SelectItem key={template._id} value={template._id}>
                        {template.questionText}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedTemplateId ? (
                <>
                  <div className="flex gap-2">
                    <Button variant={injectionMode === "structured" ? "default" : "outline"} onClick={() => setInjectionMode("structured")}>Structured</Button>
                    <Button variant={injectionMode === "raw" ? "default" : "outline"} onClick={() => setInjectionMode("raw")}>Raw</Button>
                  </div>

                  {injectionMode === "structured" ? (
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Tone Modifier</Label>
                        <Input value={toneModifier} onChange={(event) => setToneModifier(event.target.value)} className="border-white/10 bg-black/20" />
                      </div>
                      <div className="space-y-2">
                        <Label>Psychological Frame</Label>
                        <Input value={psychologicalFrame} onChange={(event) => setPsychologicalFrame(event.target.value)} className="border-white/10 bg-black/20" />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <Label>Avoid</Label>
                        <Textarea value={avoid} onChange={(event) => setAvoid(event.target.value)} className="min-h-[90px] border-white/10 bg-black/20" />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <Label>Emphasize</Label>
                        <Textarea value={emphasize} onChange={(event) => setEmphasize(event.target.value)} className="min-h-[90px] border-white/10 bg-black/20" />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <Label>Opening Guide</Label>
                        <Textarea value={openingGuide} onChange={(event) => setOpeningGuide(event.target.value)} className="min-h-[90px] border-white/10 bg-black/20" />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Label>Raw Injection</Label>
                      <Textarea value={rawInjection} onChange={(event) => setRawInjection(event.target.value)} className="min-h-[220px] border-white/10 bg-black/20 font-mono text-sm" />
                    </div>
                  )}

                  <div className="flex justify-between gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        const scenarioInjection = injectionMode === "raw"
                          ? { toneModifier: "", psychologicalFrame: "", avoid: "", emphasize: "", openingAcknowledgmentGuide: "", rawInjectionText: rawInjection, useRawText: true }
                          : { toneModifier, psychologicalFrame, avoid, emphasize, openingAcknowledgmentGuide: openingGuide, rawInjectionText: undefined, useRawText: false };
                        setPreviewText(buildSystemPrompt({ soulDocs: soulDocRecord, scenarioInjection }));
                        setPreviewOpen(true);
                      }}
                    >
                      <Eye className="mr-2 h-3.5 w-3.5" /> Preview
                    </Button>
                    <Button
                      onClick={async () => {
                        await saveScenarioInjection({
                          templateId: selectedTemplateId as Id<"oracle_templates">,
                          toneModifier: injectionMode === "structured" ? toneModifier : "",
                          psychologicalFrame: injectionMode === "structured" ? psychologicalFrame : "",
                          avoid: injectionMode === "structured" ? avoid : "",
                          emphasize: injectionMode === "structured" ? emphasize : "",
                          openingAcknowledgmentGuide: injectionMode === "structured" ? openingGuide : "",
                          rawInjectionText: injectionMode === "raw" ? rawInjection : undefined,
                          useRawText: injectionMode === "raw",
                        });
                        toast.success("Scenario injection saved");
                      }}
                    >
                      <Save className="mr-2 h-4 w-4" /> Save Injection
                    </Button>
                  </div>
                </>
              ) : null}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="features" className="space-y-4">
          <Card className="border-border/50 bg-card/50">
            <CardHeader>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-base">Feature Injection Editor</CardTitle>
                  <CardDescription>
                    Define the instruction block that is injected when a specific Oracle feature is active.
                  </CardDescription>
                </div>
                {selectedFeatureVersion ? <Badge variant="outline">v{selectedFeatureVersion}</Badge> : null}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Feature</Label>
                <Select value={selectedFeatureKey} onValueChange={setSelectedFeatureKey}>
                  <SelectTrigger className="border-white/10 bg-black/20">
                    <SelectValue placeholder="Select a feature" />
                  </SelectTrigger>
                  <SelectContent>
                    {ORACLE_FEATURES.filter((feature) => feature.key !== "attach_files").map((feature) => (
                      <SelectItem key={feature.key} value={feature.key}>
                        {feature.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedFeatureRecord ? (
                <>
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-white/70">
                    <p className="font-medium text-white">{selectedFeatureRecord.label}</p>
                    <p className="mt-1 text-white/55">{selectedFeatureRecord.description}</p>
                    <p className="mt-2 text-xs uppercase tracking-[0.22em] text-white/35">
                      {selectedFeatureRecord.implemented ? "Implemented" : "Coming soon"}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Feature Injection</Label>
                    <Textarea
                      value={featureInjectionText}
                      onChange={(event) => setFeatureInjectionText(event.target.value)}
                      className="min-h-[260px] border-white/10 bg-black/20 font-mono text-sm"
                    />
                  </div>

                  <div className="flex justify-between gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setPreviewText(buildSystemPrompt({
                          soulDocs: soulDocRecord,
                          featureInjection: featureInjectionText,
                        }));
                        setPreviewOpen(true);
                      }}
                    >
                      <Eye className="mr-2 h-3.5 w-3.5" /> Preview
                    </Button>
                    <Button
                      onClick={async () => {
                        await saveFeatureInjection({
                          featureKey: selectedFeatureKey,
                          contextText: featureInjectionText,
                        });
                        toast.success(`${selectedFeatureRecord.label} injection saved`);
                      }}
                    >
                      <Save className="mr-2 h-4 w-4" /> Save Feature Injection
                    </Button>
                  </div>
                </>
              ) : null}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-4xl border-white/10 bg-background/95">
          <DialogHeader>
            <DialogTitle>Prompt Preview</DialogTitle>
            <DialogDescription>Structured soul docs plus the layer you are editing.</DialogDescription>
          </DialogHeader>
          <Textarea readOnly value={previewText} className="min-h-[480px] border-white/10 bg-black/20 font-mono text-xs" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
