"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { ArrowLeft, Loader2, MoreHorizontal, Pencil, Pin, PinOff, Sparkles, Trash2 } from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const { api: convexApi } = require("../../../../convex/_generated/api") as any;
const journalEntriesApi = convexApi.journal.entries;

interface DetailPanelProps { entryId: string | null; open: boolean; onClose: () => void; editMode?: boolean; className?: string; }

export function DetailPanel({ entryId, open, onClose, editMode = false, className }: DetailPanelProps) {
  const router = useRouter();
  const entry = useQuery(journalEntriesApi.getEntry, entryId ? { entryId } : "skip") as any;
  const updateEntry = useMutation(journalEntriesApi.updateEntry);
  const deleteEntry = useMutation(journalEntriesApi.deleteEntry);
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [editing, setEditing] = React.useState(editMode);
  const [draft, setDraft] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  React.useEffect(() => { if (open) setEditing(editMode); }, [open, editMode, entryId]);
  React.useEffect(() => { if (entry?.content !== undefined) setDraft(entry.content); }, [entry?.content]);
  if (!entryId) return null;

  async function remove() {
    if (!entryId) return;
    setDeleting(true);
    try { await deleteEntry({ entryId: entryId as any }); onClose(); }
    finally { setDeleting(false); setConfirmDelete(false); }
  }

  async function saveEdit() {
    if (!entryId || !draft.trim()) return;
    setSaving(true);
    try { await updateEntry({ entryId, content: draft.trim() }); setEditing(false); router.replace(`/journal?entry=${entryId}`); }
    finally { setSaving(false); }
  }

  return <>
    <Sheet open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
      <SheetContent side="right" className={cn("w-full overflow-y-auto border-l border-white/[0.08] bg-[#0b0e19] p-0 sm:max-w-xl", className)}>
        {entry === undefined ? <div className="flex h-full items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-white/30" /></div> : !entry ? <div className="p-8 text-white/40">This reflection no longer exists.</div> : editing ? <div className="flex min-h-full flex-col">
          <header className="flex h-16 shrink-0 items-center justify-between border-b border-white/[0.07] px-5"><button onClick={() => setEditing(false)} className="text-sm text-white/40 hover:text-white/80">Cancel</button><span className="font-serif text-sm text-white/70">Edit reflection</span><button onClick={() => void saveEdit()} disabled={!draft.trim() || saving} className="inline-flex h-9 items-center gap-2 rounded-full bg-[#b8a2ff] px-4 text-sm font-semibold text-[#171326] disabled:opacity-40">{saving && <Loader2 className="h-4 w-4 animate-spin" />}Save</button></header>
          <div className="flex-1 bg-[#f2efe8] p-6 sm:p-10"><textarea autoFocus value={draft} onChange={(event) => setDraft(event.target.value)} className="min-h-[70vh] w-full resize-none bg-transparent font-serif text-lg leading-9 text-[#252238] outline-none" /></div>
        </div> : <article>
          <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-white/[0.07] bg-[#0b0e19]/90 px-5 backdrop-blur-xl">
            <button onClick={onClose} className="flex items-center gap-2 text-sm text-white/40 hover:text-white/80"><ArrowLeft className="h-4 w-4" />Back</button>
            <DropdownMenu><DropdownMenuTrigger asChild><button aria-label="Entry actions" className="grid h-9 w-9 place-items-center rounded-full text-white/40 hover:bg-white/5 hover:text-white"><MoreHorizontal className="h-5 w-5" /></button></DropdownMenuTrigger><DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setEditing(true)}><Pencil className="mr-2 h-4 w-4" />Edit</DropdownMenuItem>
              <DropdownMenuItem onClick={() => updateEntry({ entryId: entryId as any, isPinned: !entry.isPinned })}>{entry.isPinned ? <PinOff className="mr-2 h-4 w-4" /> : <Pin className="mr-2 h-4 w-4" />}{entry.isPinned ? "Unpin" : "Pin"}</DropdownMenuItem>
              <DropdownMenuSeparator /><DropdownMenuItem className="text-red-400 focus:text-red-400" onClick={() => setConfirmDelete(true)}><Trash2 className="mr-2 h-4 w-4" />Delete</DropdownMenuItem>
            </DropdownMenuContent></DropdownMenu>
          </header>
          <div className="px-6 py-9 sm:px-10 sm:py-12">
            <time className="text-xs uppercase tracking-[0.16em] text-white/30">{new Date(entry.createdAt).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</time>
            {entry.title && <h1 className="mt-5 font-serif text-3xl text-white">{entry.title}</h1>}
            <div className="mt-7 whitespace-pre-wrap font-serif text-lg leading-9 text-white/75">{entry.content || entry.gratitudeItems?.join("\n")}</div>
            <div className="mt-12 border-t border-white/[0.08] pt-6"><button onClick={() => router.push(`/oracle/new?journalEntryId=${entryId}`)} className="inline-flex h-10 items-center gap-2 rounded-full border border-[#a995f2]/25 px-4 text-sm text-[#b9aaf5] hover:bg-[#a995f2]/10"><Sparkles className="h-4 w-4" />Reflect with Oracle</button></div>
          </div>
        </article>}
      </SheetContent>
    </Sheet>
    <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}><DialogContent><DialogHeader><DialogTitle>Delete this reflection?</DialogTitle><DialogDescription>This cannot be undone.</DialogDescription></DialogHeader><DialogFooter><Button variant="outline" onClick={() => setConfirmDelete(false)}>Keep it</Button><Button variant="destructive" disabled={deleting} onClick={() => void remove()}>{deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Delete</Button></DialogFooter></DialogContent></Dialog>
  </>;
}
