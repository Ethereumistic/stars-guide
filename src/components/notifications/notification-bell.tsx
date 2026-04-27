"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { UserPlus, UserCheck } from "lucide-react";
import { GiStarSwirl } from "react-icons/gi";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";

const typeIcons: Record<string, React.ReactNode> = {
    referral_completed: <GiStarSwirl className="size-3.5 text-primary" />,
    friend_request: <UserPlus className="size-3.5 text-blue-400" />,
    friend_accepted: <UserCheck className="size-3.5 text-green-400" />,
};

const typeLabels: Record<string, string> = {
    referral_completed: "Referral",
    friend_request: "Friend Request",
    friend_accepted: "Friend Accepted",
};

export function NotificationBell({ className }: { className?: string }) {
    const notifications = useQuery(api.notifications.list);
    const unreadCount = useQuery(api.notifications.unreadCount);
    const markRead = useMutation(api.notifications.markRead);
    const markAllRead = useMutation(api.notifications.markAllRead);

    const count = unreadCount ?? 0;

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className={cn("relative text-foreground/60 hover:text-primary transition-colors", className)}
                >
                    <Bell className="size-4" />
                    {count > 0 && (
                        <motion.span
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="absolute -top-0.5 -right-0.5 flex items-center justify-center"
                        >
                            <Badge
                                variant="destructive"
                                className="min-w-[18px] h-[18px] px-1 text-[10px] font-mono leading-none p-0 flex items-center justify-center"
                            >
                                {count > 99 ? "99+" : count}
                            </Badge>
                        </motion.span>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent
                align="end"
                sideOffset={8}
                className="w-80 p-0 border-white/10 bg-background/95 backdrop-blur-xl shadow-xl"
            >
                <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                    <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/40">
                        Notifications
                    </span>
                    {count > 0 && (
                        <button
                            onClick={() => markAllRead()}
                            className="text-[10px] text-primary/70 hover:text-primary font-mono uppercase tracking-wider transition-colors"
                        >
                            Mark all read
                        </button>
                    )}
                </div>
                <ScrollArea className="max-h-[320px]">
                    {!notifications || notifications.length === 0 ? (
                        <div className="py-10 flex flex-col items-center gap-2 text-white/25">
                            <Bell className="size-5" />
                            <span className="text-xs font-sans">No notifications yet</span>
                        </div>
                    ) : (
                        <div className="flex flex-col">
                            <AnimatePresence>
                                {notifications.map((n: any) => (
                                    <motion.button
                                        key={n._id}
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        onClick={() => {
                                            if (!n.read) markRead({ notificationId: n._id });
                                        }}
                                        className={cn(
                                            "flex items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-white/3 w-full",
                                            !n.read && "bg-white/[0.02]"
                                        )}
                                    >
                                        <div className="mt-0.5 shrink-0">
                                            {typeIcons[n.type] ?? <Bell className="size-3.5 text-white/30" />}
                                        </div>
                                        <div className="flex-1 min-w-0 space-y-1">
                                            <div className="flex items-center gap-2">
                                                <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-white/30">
                                                    {typeLabels[n.type] ?? n.type}
                                                </span>
                                                {!n.read && (
                                                    <span className="size-1.5 rounded-full bg-primary shrink-0" />
                                                )}
                                            </div>
                                            <p className="text-xs text-white/60 leading-relaxed font-sans">
                                                {n.message}
                                            </p>
                                        </div>
                                        {!n.read && (
                                            <span className="mt-2 size-1.5 rounded-full bg-primary/60 shrink-0" />
                                        )}
                                    </motion.button>
                                ))}
                            </AnimatePresence>
                        </div>
                    )}
                </ScrollArea>
            </PopoverContent>
        </Popover>
    );
}
