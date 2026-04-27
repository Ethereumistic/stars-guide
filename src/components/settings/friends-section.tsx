"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useUserStore } from "@/store/use-user-store";
import { SettingsSection } from "./settings-section";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";
import {
    Loader2,
    UserMinus,
    Check,
    X as XIcon,
    Send,
    User,
    Copy,
    CheckCheck,
    Link2,
    Clock,
    Gift,
} from "lucide-react";
import { toast } from "sonner";
import { TbUsers } from "react-icons/tb";
import { GiStarSwirl } from "react-icons/gi";

interface FriendsSectionProps {
    delay?: number;
}

type AddMode = "username" | "email" | "phone";
type FriendsTab = "friends" | "pending" | "sent" | "referrals";

export function FriendsSection({ delay = 0 }: FriendsSectionProps) {
    const [identifier, setIdentifier] = useState("");
    const [addMode, setAddMode] = useState<AddMode>("username");
    const [activeTab, setActiveTab] = useState<FriendsTab>("friends");

    const sendRequest = useMutation(api.friends.sendRequest);
    const acceptRequest = useMutation(api.friends.acceptRequest);
    const declineRequest = useMutation(api.friends.declineRequest);
    const removeFriend = useMutation(api.friends.removeFriend);

    const friends = useQuery(api.friends.listFriends);
    const pending = useQuery(api.friends.listPending);
    const sent = useQuery(api.friends.listSent);

    const [sending, setSending] = useState(false);
    const [removingId, setRemovingId] = useState<string | null>(null);

    async function handleSendRequest(e: React.FormEvent) {
        e.preventDefault();
        const trimmed = identifier.trim();
        if (!trimmed) return;

        setSending(true);
        try {
            await sendRequest({ identifier: trimmed, identifierType: addMode });
            toast.success("Friend request sent!");
            setIdentifier("");
        } catch (err: any) {
            toast.error(err.message ?? "Failed to send request");
        } finally {
            setSending(false);
        }
    }

    async function handleAccept(friendshipId: string) {
        try {
            await acceptRequest({ friendshipId: friendshipId as any });
            toast.success("Friend request accepted!");
        } catch (err: any) {
            toast.error(err.message ?? "Failed to accept");
        }
    }

    async function handleDecline(friendshipId: string) {
        try {
            await declineRequest({ friendshipId: friendshipId as any });
        } catch (err: any) {
            toast.error(err.message ?? "Failed to decline");
        }
    }

    async function handleRemove(friendshipId: string) {
        setRemovingId(friendshipId);
        try {
            await removeFriend({ friendshipId: friendshipId as any });
            toast.success("Friend removed");
        } catch (err: any) {
            toast.error(err.message ?? "Failed to remove friend");
        } finally {
            setRemovingId(null);
        }
    }

    const pendingCount = pending?.length ?? 0;
    const myReferrals = useQuery(api.referrals.listMyReferrals);
    const { user } = useUserStore();

    const referralLink = typeof window !== "undefined" && user?.username
        ? `${window.location.origin}/invite/${user.username}`
        : "";

    const placeholders: Record<AddMode, string> = {
        username: "stellar_scorpio",
        email: "friend@example.com",
        phone: "+1 555 0123",
    };

    return (
        <SettingsSection
            icon={<TbUsers className="h-5 w-5" />}
            title="Friends"
            description="Friends & Family"
            delay={delay}
        >
            <div className="space-y-6">
                {/* ─── Add Friend ─── */}
                <div className="space-y-3">
                    <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/40 block">
                        Add friend
                    </span>
                    <form onSubmit={handleSendRequest} className="flex gap-2">
                        <div className="flex-1 flex gap-2">
                            <div className="flex items-center gap-0.5 border border-white/10 rounded-md bg-white/[0.02] p-0.5">
                                {(["username", "email", "phone"] as AddMode[]).map((mode) => (
                                    <button
                                        key={mode}
                                        type="button"
                                        onClick={() => setAddMode(mode)}
                                        className={cn(
                                            "px-2 py-1 text-[10px] font-mono uppercase tracking-wider rounded transition-all",
                                            addMode === mode
                                                ? "bg-white/10 text-white"
                                                : "text-white/30 hover:text-white/50"
                                        )}
                                    >
                                        {mode}
                                    </button>
                                ))}
                            </div>
                            <Input
                                value={identifier}
                                onChange={(e) => setIdentifier(e.target.value)}
                                placeholder={placeholders[addMode]}
                                className="flex-1 border-white/10 bg-white/[0.02] text-white placeholder:text-white/20 text-sm"
                                disabled={sending}
                            />
                        </div>
                        <Button
                            type="submit"
                            size="sm"
                            disabled={sending || !identifier.trim()}
                            className="shrink-0 gap-1.5"
                        >
                            {sending ? (
                                <Loader2 className="size-3.5 animate-spin" />
                            ) : (
                                <Send className="size-3.5" />
                            )}
                            <span className="hidden sm:inline">Send</span>
                        </Button>
                    </form>
                </div>

                {/* ─── Tabs ─── */}
                <div className="flex items-center gap-1 border-b border-white/10">
                    {([
                        { key: "friends" as const, label: "Friends", count: friends?.length },
                        { key: "pending" as const, label: "Pending", count: pendingCount },
                        { key: "sent" as const, label: "Sent", count: sent?.length },
                        { key: "referrals" as const, label: "Referrals", count: myReferrals?.stats?.total },
                    ]).map((tab) => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={cn(
                                "relative px-4 py-2.5 text-[10px] font-mono uppercase tracking-[0.2em] transition-colors",
                                activeTab === tab.key
                                    ? "text-white"
                                    : "text-white/30 hover:text-white/50"
                            )}
                        >
                            <span>{tab.label}</span>
                            {tab.count !== undefined && tab.count > 0 && (
                                <Badge
                                    variant="secondary"
                                    className="ml-1.5 min-w-[18px] h-[16px] px-1 text-[9px] font-mono bg-white/10 text-white/60 border-0"
                                >
                                    {tab.count}
                                </Badge>
                            )}
                            {activeTab === tab.key && (
                                <motion.div
                                    layoutId="friendsTabIndicator"
                                    className="absolute bottom-0 left-0 right-0 h-px bg-primary"
                                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                                />
                            )}
                        </button>
                    ))}
                </div>

                {/* ─── Tab Content ─── */}
                <ScrollArea className="max-h-[400px]">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeTab}
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -6 }}
                            transition={{ duration: 0.2 }}
                        >
                            {activeTab === "friends" && (
                                <FriendList
                                    friends={friends as any[] | undefined}
                                    onRemove={handleRemove}
                                    removingId={removingId}
                                    emptyMessage="No friends yet — send a request above!"
                                />
                            )}
                            {activeTab === "pending" && (
                                <PendingList
                                    requests={pending as any[] | undefined}
                                    onAccept={handleAccept}
                                    onDecline={handleDecline}
                                    emptyMessage="No pending requests"
                                />
                            )}
                            {activeTab === "sent" && (
                                <SentList
                                    requests={sent as any[] | undefined}
                                    emptyMessage="No sent requests"
                                />
                            )}
                            {activeTab === "referrals" && (
                                <ReferralsTab
                                    referrals={myReferrals}
                                    referralLink={referralLink}
                                />
                            )}
                        </motion.div>
                    </AnimatePresence>
                </ScrollArea>
            </div>
        </SettingsSection>
    );
}

/* ─── Sub-components ─── */

function UserRow({ username, image, children }: {
    username?: string; image?: string; children: React.ReactNode;
}) {
    return (
        <div className="flex items-center gap-3 py-2.5 px-2 rounded-md hover:bg-white/[0.02] transition-colors">
            <Avatar className="size-8 border border-white/10">
                <AvatarImage src={image} />
                <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-serif">
                    {username?.charAt(0)?.toUpperCase() ?? <User className="size-3" />}
                </AvatarFallback>
            </Avatar>
            <span className="flex-1 text-sm font-sans text-white/70 truncate">
                @{username ?? "unknown"}
            </span>
            {children}
        </div>
    );
}

function FriendList({ friends, onRemove, removingId, emptyMessage }: {
    friends: any[] | undefined; onRemove: (id: string) => void;
    removingId: string | null; emptyMessage: string;
}) {
    if (friends === undefined) {
        return <div className="space-y-2">{[1, 2, 3].map((i) => (
            <div key={i} className="h-10 rounded-md bg-white/[0.03] animate-pulse" />
        ))}</div>;
    }
    if (friends.length === 0) return <EmptyState message={emptyMessage} />;
    return (
        <div className="space-y-0.5">
            {friends.map((f: any) => (
                <UserRow key={f.friendshipId} username={f.user.username} image={f.user.image ?? undefined}>
                    <Button variant="ghost" size="sm"
                        onClick={() => onRemove(f.friendshipId)}
                        disabled={removingId === f.friendshipId}
                        className="h-7 px-2 text-white/30 hover:text-destructive/70 text-[10px] font-mono uppercase tracking-wider gap-1"
                    >
                        {removingId === f.friendshipId ? <Loader2 className="size-3 animate-spin" /> : <UserMinus className="size-3" />}
                    </Button>
                </UserRow>
            ))}
        </div>
    );
}

function PendingList({ requests, onAccept, onDecline, emptyMessage }: {
    requests: any[] | undefined; onAccept: (id: string) => void;
    onDecline: (id: string) => void; emptyMessage: string;
}) {
    if (requests === undefined) {
        return <div className="space-y-2">{[1, 2].map((i) => (
            <div key={i} className="h-10 rounded-md bg-white/[0.03] animate-pulse" />
        ))}</div>;
    }
    if (requests.length === 0) return <EmptyState message={emptyMessage} />;
    return (
        <div className="space-y-0.5">
            {requests.map((r: any) => (
                <UserRow key={r.friendshipId} username={r.user.username} image={r.user.image ?? undefined}>
                    <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" onClick={() => onAccept(r.friendshipId)}
                            className="h-7 w-7 p-0 text-green-400/60 hover:text-green-400">
                            <Check className="size-3.5" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => onDecline(r.friendshipId)}
                            className="h-7 w-7 p-0 text-white/30 hover:text-destructive/70">
                            <XIcon className="size-3.5" />
                        </Button>
                    </div>
                </UserRow>
            ))}
        </div>
    );
}

function SentList({ requests, emptyMessage }: {
    requests: any[] | undefined; emptyMessage: string;
}) {
    if (requests === undefined) {
        return <div className="space-y-2">{[1, 2].map((i) => (
            <div key={i} className="h-10 rounded-md bg-white/[0.03] animate-pulse" />
        ))}</div>;
    }
    if (requests.length === 0) return <EmptyState message={emptyMessage} />;
    return (
        <div className="space-y-0.5">
            {requests.map((r: any) => (
                <UserRow key={r.friendshipId} username={r.user.username} image={r.user.image ?? undefined}>
                    <Badge variant="outline" className="text-[9px] font-mono uppercase tracking-wider text-white/30 border-white/10">
                        Pending
                    </Badge>
                </UserRow>
            ))}
        </div>
    );
}

/* ─── Referrals Tab ─── */

function ReferralsTab({ referrals, referralLink }: {
    referrals: {
        referrals: Array<{
            referralId: string;
            status: "pending" | "completed";
            rewardAmount: number;
            createdAt: number;
            referee: { _id: string; username?: string; image?: string } | null;
        }>;
        stats: { total: number; pending: number; completed: number; stardustEarned: number };
    } | undefined;
    referralLink: string;
}) {
    const [copied, setCopied] = useState(false);

    async function handleCopyLink() {
        if (!referralLink) return;
        try {
            await navigator.clipboard.writeText(referralLink);
            setCopied(true);
            toast.success("Invite link copied!");
            setTimeout(() => setCopied(false), 2000);
        } catch {
            toast.error("Failed to copy link");
        }
    }

    return (
        <div className="space-y-5">
            {/* ─── Referral Link ─── */}
            <div className="space-y-3">
                <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/40 block">
                    Your invite link
                </span>
                <div className="flex gap-2">
                    <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-md border border-white/10 bg-white/[0.02] text-sm text-white/50 font-mono truncate">
                        <Link2 className="size-3.5 shrink-0 text-white/20" />
                        <span className="truncate">{referralLink || "Loading..."}</span>
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCopyLink}
                        disabled={!referralLink}
                        className="shrink-0 gap-1.5 border-white/10 bg-white/[0.02] hover:bg-white/[0.06] text-white/60 hover:text-white"
                    >
                        {copied ? <CheckCheck className="size-3.5 text-green-400" /> : <Copy className="size-3.5" />}
                        <span className="hidden sm:inline">{copied ? "Copied" : "Copy"}</span>
                    </Button>
                </div>
            </div>

            {/* ─── Stats Cards ─── */}
            {referrals && (
                <div className="grid grid-cols-3 gap-2">
                    <div className="flex flex-col items-center gap-1 p-3 rounded-md border border-white/[0.06] bg-white/[0.01]">
                        <span className="font-serif text-lg text-white">{referrals.stats.total}</span>
                        <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-white/30">Invited</span>
                    </div>
                    <div className="flex flex-col items-center gap-1 p-3 rounded-md border border-white/[0.06] bg-white/[0.01]">
                        <div className="flex items-center gap-1">
                            <Check className="size-3 text-green-400/70" />
                            <span className="font-serif text-lg text-white">{referrals.stats.completed}</span>
                        </div>
                        <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-white/30">Completed</span>
                    </div>
                    <div className="flex flex-col items-center gap-1 p-3 rounded-md border border-white/[0.06] bg-white/[0.01]">
                        <div className="flex items-center gap-1">
                            <GiStarSwirl className="size-3 text-primary/70" />
                            <span className="font-serif text-lg text-white">{referrals.stats.stardustEarned}</span>
                        </div>
                        <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-white/30">Stardust</span>
                    </div>
                </div>
            )}

            {/* ─── Referral List ─── */}
            <div className="space-y-1">
                <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/40 block">
                    People you&apos;ve invited
                </span>
                {referrals === undefined ? (
                    <div className="space-y-2">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="h-10 rounded-md bg-white/[0.03] animate-pulse" />
                        ))}
                    </div>
                ) : referrals.referrals.length === 0 ? (
                    <div className="py-8 text-center">
                        <Gift className="size-8 text-white/10 mx-auto mb-3" />
                        <p className="text-xs text-white/25 font-sans">Share your invite link to earn stardust!</p>
                        <p className="text-[10px] text-white/15 font-sans mt-1">You get 1 stardust per completed referral</p>
                    </div>
                ) : (
                    <div className="space-y-0.5">
                        {referrals.referrals.map((ref) => (
                            <div
                                key={ref.referralId}
                                className="flex items-center gap-3 py-2.5 px-2 rounded-md hover:bg-white/[0.02] transition-colors"
                            >
                                <Avatar className="size-8 border border-white/10">
                                    <AvatarImage src={ref.referee?.image ?? undefined} />
                                    <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-serif">
                                        {ref.referee?.username?.charAt(0)?.toUpperCase() ?? <User className="size-3" />}
                                    </AvatarFallback>
                                </Avatar>
                                <span className="flex-1 text-sm font-sans text-white/70 truncate">
                                    @{ref.referee?.username ?? "unknown"}
                                </span>
                                <div className="flex items-center gap-2">
                                    {ref.status === "pending" ? (
                                        <Badge
                                            variant="outline"
                                            className="text-[9px] font-mono uppercase tracking-wider text-amber-400/60 border-amber-400/20 bg-amber-400/5 gap-1"
                                        >
                                            <Clock className="size-2.5" />
                                            Pending
                                        </Badge>
                                    ) : (
                                        <Badge
                                            variant="outline"
                                            className="text-[9px] font-mono uppercase tracking-wider text-green-400/60 border-green-400/20 bg-green-400/5 gap-1"
                                        >
                                            <GiStarSwirl className="size-2.5" />
                                            +{ref.rewardAmount}
                                        </Badge>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

function EmptyState({ message }: { message: string }) {
    return <div className="py-10 text-center"><p className="text-xs text-white/25 font-sans">{message}</p></div>;
}
