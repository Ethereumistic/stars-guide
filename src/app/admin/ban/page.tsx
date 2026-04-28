"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Shield,
    Plus,
    Trash2,
    Loader2,
    Ban,
    TestTube,
    CheckCircle2,
    XCircle,
} from "lucide-react";
import { toast } from "sonner";

type PatternFormData = {
    pattern: string;
    description: string;
};

const emptyForm: PatternFormData = {
    pattern: "",
    description: "",
};

export default function BanPage() {
    const patterns = useQuery(api.usernameModeration.listBannedPatterns);
    const addPattern = useMutation(api.usernameModeration.addBannedPattern);
    const removePattern = useMutation(api.usernameModeration.removeBannedPattern);
    const seedPatterns = useMutation(api.usernameModeration.seedBannedPatterns);

    const [form, setForm] = useState<PatternFormData>({ ...emptyForm });
    const [isAdding, setIsAdding] = useState(false);
    const [isSeeding, setIsSeeding] = useState(false);
    const [testInput, setTestInput] = useState("");
    const [showForm, setShowForm] = useState(false);

    // ─── Test a username against the current patterns ───────────
    const testResult = (() => {
        if (!testInput.trim() || testInput.trim().length < 2 || !patterns) return null;
        const normalized = testInput.trim().toLowerCase();
        for (const p of patterns) {
            try {
                const regex = new RegExp(p.pattern, "i");
                if (regex.test(normalized)) {
                    return { matched: true as const, pattern: p };
                }
            } catch {
                continue;
            }
        }
        return { matched: false as const };
    })();

    // ─── Handlers ──────────────────────────────────────────────

    const handleAdd = async () => {
        if (!form.pattern.trim()) {
            toast.error("Pattern is required.");
            return;
        }
        try {
            new RegExp(form.pattern, "i");
        } catch {
            toast.error("Invalid regex pattern. Check your syntax.");
            return;
        }

        setIsAdding(true);
        try {
            await addPattern({
                pattern: form.pattern.trim(),
                description: form.description.trim() || undefined,
            });
            toast.success("Pattern added.");
            setForm({ ...emptyForm });
            setShowForm(false);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Failed to add pattern.");
        } finally {
            setIsAdding(false);
        }
    };

    const handleRemove = async (patternId: Id<"bannedPatterns">, desc: string) => {
        if (!confirm(`Delete "${desc}"? This cannot be undone.`)) return;
        try {
            await removePattern({ patternId });
            toast.success("Pattern deleted.");
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Failed to delete.");
        }
    };

    const handleSeed = async () => {
        if (!confirm("Seed the default banned patterns?")) return;
        setIsSeeding(true);
        try {
            const result = await seedPatterns();
            if (result.seeded) {
                toast.success(`Seeded ${result.count} patterns.`);
            } else {
                toast.info(result.reason ?? "Patterns already exist.");
            }
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Failed to seed.");
        } finally {
            setIsSeeding(false);
        }
    };

    return (
        <div className="space-y-8 max-w-5xl">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-2xl font-serif font-bold tracking-tight flex items-center gap-2">
                        <Ban className="h-6 w-6 text-red-400" />
                        Username Bans
                    </h1>
                    <p className="text-muted-foreground mt-1 text-sm max-w-xl">
                        Regex patterns that block prohibited usernames. Changes take effect immediately.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {patterns && patterns.length === 0 && (
                        <Button
                            variant="outline"
                            onClick={handleSeed}
                            disabled={isSeeding}
                            className="gap-1"
                        >
                            {isSeeding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" />}
                            Seed Defaults
                        </Button>
                    )}
                    <Button onClick={() => setShowForm(!showForm)} className="gap-1">
                        <Plus className="h-4 w-4" />
                        Add Pattern
                    </Button>
                </div>
            </div>

            {/* Add Pattern Form */}
            {showForm && (
                <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base">New Banned Pattern</CardTitle>
                        <CardDescription>
                            Use character classes like <code className="text-xs bg-muted px-1 py-0.5 rounded">{"[i1]"}</code> for
                            leet-speak, and <code className="text-xs bg-muted px-1 py-0.5 rounded">{"+"}</code> for repeated
                            letters (e.g. <code className="text-xs bg-muted px-1 py-0.5 rounded">{"[u@]+"}</code>).
                            No word boundaries needed — the whole username is the word.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="pattern">Regex Pattern</Label>
                            <Input
                                id="pattern"
                                value={form.pattern}
                                onChange={(e) => setForm({ ...form, pattern: e.target.value })}
                                placeholder='e.g. n[i1]+gg[e3a@4]+r?'
                                className="bg-background/50 font-mono text-sm"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="description">Description</Label>
                            <Input
                                id="description"
                                value={form.description}
                                onChange={(e) => setForm({ ...form, description: e.target.value })}
                                placeholder="e.g. N-word"
                                className="bg-background/50"
                            />
                        </div>
                        <div className="flex items-center gap-2 pt-2">
                            <Button onClick={handleAdd} disabled={isAdding} className="gap-1">
                                {isAdding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                                {isAdding ? "Adding..." : "Add Pattern"}
                            </Button>
                            <Button variant="ghost" onClick={() => { setShowForm(false); setForm({ ...emptyForm }); }}>
                                Cancel
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Test Username */}
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                        <TestTube className="h-4 w-4 text-blue-400" />
                        Test Username
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center gap-3">
                        <Input
                            value={testInput}
                            onChange={(e) => setTestInput(e.target.value)}
                            placeholder="Type a username to test..."
                            className="bg-background/50 font-mono text-sm max-w-sm"
                        />
                        {testResult && (
                            testResult.matched ? (
                                <div className="flex items-center gap-2">
                                    <XCircle className="h-5 w-5 text-red-400" />
                                    <span className="text-sm text-red-400 font-medium">BLOCKED</span>
                                    <span className="text-xs text-muted-foreground">
                                        by <code className="text-xs bg-muted px-1 py-0.5 rounded">{testResult.pattern.pattern}</code>
                                    </span>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                                    <span className="text-sm text-emerald-400 font-medium">CLEAN</span>
                                </div>
                            )
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Pattern List */}
            {patterns === undefined ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading...
                </div>
            ) : patterns.length === 0 ? (
                <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                    <CardContent className="py-8 text-center">
                        <Ban className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
                        <p className="text-sm text-muted-foreground">
                            No banned patterns yet. Click "Seed Defaults" to load the initial set.
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-3 md:grid-cols-2">
                    {patterns.map((p) => (
                        <Card key={p._id} className="border-border/50 bg-card/50 backdrop-blur-sm">
                            <CardContent className="pt-4 pb-3 space-y-2">
                                <div className="flex items-start justify-between gap-2">
                                    <code className="text-xs font-mono bg-muted px-2 py-1 rounded break-all">
                                        {p.pattern}
                                    </code>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleRemove(p._id, p.description || p.pattern)}
                                        className="h-7 w-7 shrink-0 text-red-400 hover:text-red-300"
                                    >
                                        <Trash2 className="h-3 w-3" />
                                    </Button>
                                </div>
                                {p.description && (
                                    <p className="text-xs text-muted-foreground">{p.description}</p>
                                )}
                                <span className="text-[10px] text-muted-foreground">
                                    Added {new Date(p.createdAt).toLocaleDateString()}
                                </span>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}