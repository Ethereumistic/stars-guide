"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, PenSquare, Search, X } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type SessionItem = {
    _id: string;
    title: string;
    titleIcon?: string | null;
    lastMessageAt: number;
};

type OracleChatSearchModalProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    sessions: SessionItem[];
    onNewChat: () => void;
};

function groupLabel(timestamp: number): string {
    const now = new Date();
    const target = new Date(timestamp);

    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfTarget = new Date(target.getFullYear(), target.getMonth(), target.getDate());
    const diffDays = Math.floor((startOfToday.getTime() - startOfTarget.getTime()) / 86_400_000);

    if (diffDays <= 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays <= 7) return "Previous 7 Days";
    return "Older";
}

export function OracleChatSearchModal({
    open,
    onOpenChange,
    sessions,
    onNewChat,
}: OracleChatSearchModalProps) {
    const router = useRouter();
    const [searchInput, setSearchInput] = React.useState("");
    const [debouncedTerm, setDebouncedTerm] = React.useState("");
    const inputRef = React.useRef<HTMLInputElement>(null);

    React.useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            const isK = event.key.toLowerCase() === "k";
            if (!isK) return;
            if (!(event.ctrlKey || event.metaKey)) return;
            event.preventDefault();
            onOpenChange(true);
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [onOpenChange]);

    React.useEffect(() => {
        if (!open) return;
        const t = window.setTimeout(() => inputRef.current?.focus(), 30);
        return () => window.clearTimeout(t);
    }, [open]);

    React.useEffect(() => {
        const timer = window.setTimeout(() => {
            setDebouncedTerm(searchInput.trim().toLowerCase());
        }, 2000);

        return () => window.clearTimeout(timer);
    }, [searchInput]);

    const isDebouncing = searchInput.trim().toLowerCase() !== debouncedTerm;

    const filteredSessions = React.useMemo(() => {
        if (!debouncedTerm) return sessions;
        return sessions.filter((session) =>
            session.title.toLowerCase().includes(debouncedTerm)
        );
    }, [sessions, debouncedTerm]);

    const grouped = React.useMemo(() => {
        const map = new Map<string, SessionItem[]>();
        for (const session of filteredSessions) {
            const label = groupLabel(session.lastMessageAt);
            const bucket = map.get(label) ?? [];
            bucket.push(session);
            map.set(label, bucket);
        }
        const order = ["Today", "Yesterday", "Previous 7 Days", "Older"];
        return order
            .filter((label) => map.has(label))
            .map((label) => ({ label, items: map.get(label)! }));
    }, [filteredSessions]);

    const handleOpenSession = (sessionId: string) => {
        onOpenChange(false);
        router.push(`/oracle/chat/${sessionId}`);
    };

    const handleNewChat = () => {
        onOpenChange(false);
        onNewChat();
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                showCloseButton={false}
                className="max-w-5xl border border-white/15 bg-zinc-900/95 p-0 text-white shadow-[0_20px_80px_rgba(0,0,0,0.6)] backdrop-blur-2xl"
            >
                <DialogTitle className="sr-only">Search chats</DialogTitle>
                <DialogDescription className="sr-only">
                    Search your Oracle conversations and open a chat.
                </DialogDescription>

                <div className="border-b border-white/10 px-5 py-4">
                    <div className="flex items-center gap-3">
                        <Search className="h-4 w-4 text-white/40" />
                        <Input
                            ref={inputRef}
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                            placeholder="Search chats..."
                            className="h-10 border-0 bg-transparent px-0 text-base text-white shadow-none placeholder:text-white/40 focus-visible:ring-0"
                        />
                        <button
                            type="button"
                            onClick={() => onOpenChange(false)}
                            className="rounded-md p-1.5 text-white/45 transition-colors hover:bg-white/10 hover:text-white"
                            aria-label="Close search"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                </div>

                <div className="max-h-[65vh] overflow-y-auto px-3 py-3">
                    <button
                        type="button"
                        onClick={handleNewChat}
                        className="mb-2 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-white/90 transition-colors hover:bg-white/8"
                    >
                        <PenSquare className="h-4 w-4" />
                        <span className="font-medium">New chat</span>
                    </button>

                    {isDebouncing && (
                        <div className="mb-3 flex items-center gap-2 px-3 text-xs uppercase tracking-wider text-white/45">
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            Searching...
                        </div>
                    )}

                    {!isDebouncing && grouped.length === 0 && (
                        <div className="px-3 py-6 text-sm text-white/45">
                            No chats found for "{searchInput.trim()}".
                        </div>
                    )}

                    {grouped.map((section) => (
                        <div key={section.label} className="mb-3">
                            <p className="px-3 pb-1 pt-2 text-xs text-white/45">{section.label}</p>
                            <div>
                                {section.items.map((session) => (
                                    <button
                                        key={session._id}
                                        type="button"
                                        onClick={() => handleOpenSession(session._id)}
                                        className={cn(
                                            "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors",
                                            "text-white/90 hover:bg-white/8"
                                        )}
                                    >
                                    <span className="shrink-0 text-base leading-none">{session.titleIcon ?? "✨"}</span>
                                        <span className="truncate">{session.title}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </DialogContent>
        </Dialog>
    );
}
