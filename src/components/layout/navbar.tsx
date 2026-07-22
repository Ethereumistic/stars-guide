"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/ui/logo";
import { ThemeSwitch } from "@/components/ui/theme-switch";
import { Button } from "@/components/ui/button";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import { cn } from "@/lib/utils";
import {
  Menu,
  X,
  LogIn,
  LogOut,
  User,
  Settings,
  Plus,
  Bell,
  UserPlus,
  UserCheck,
  XIcon,
} from "lucide-react";
import { ButtonGroup, ButtonGroupText } from "@/components/ui/button-group";
import {
  GiStarsStack,
  GiCrystalBall,
  GiCoins,
  GiMazeCornea,
  GiCursedStar,
  GiScrollUnfurled,
  GiStarSwirl,
  GiSpellBook,
} from "react-icons/gi";
import { motion, AnimatePresence } from "motion/react";
import { useConvexAuth, useQuery, useMutation } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { useUserStore } from "@/store/use-user-store";
import { api } from "../../../convex/_generated/api";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Separator } from "../ui/separator";

const navItems = [
  { title: "Horoscopes", href: "/horoscopes", icon: GiStarsStack },
  { title: "Learn", href: "/learn", icon: GiSpellBook },
  { title: "Oracle", href: "/oracle", icon: GiCursedStar },
  { title: "Journal", href: "/journal", icon: GiScrollUnfurled },
  { title: "Pricing", href: "/pricing", icon: GiCoins },
];

function StardustBadge({
  stardust,
  href = "/pricing",
}: {
  stardust: number;
  href?: string;
}) {
  return (
    <ButtonGroup className="h-9">
      <ButtonGroupText className="bg-gradient-to-r from-primary/[0.06] to-galactic/[0.04] border-primary/20 px-2.5 gap-1.5 shadow-none">
        <GiStarSwirl className="size-4 text-primary drop-shadow-[0_0_8px_rgba(212,175,55,0.5)] shrink-0" />
        <span className="text-sm font-serif font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-galactic tabular-nums">
          {stardust.toLocaleString()}
        </span>
      </ButtonGroupText>
      <Button
        variant="galactic"
        size="icon"
        asChild
        className="h-full w-8  text-primary/70 hover:text-primary transition-colors"
      >
        <Link href={href}>
          <Plus className="size-3.5" />
          <span className="sr-only">Get more Star Dust</span>
        </Link>
      </Button>
    </ButtonGroup>
  );
}

const notificationTypeIcons: Record<string, React.ReactNode> = {
  referral_completed: <GiStarSwirl className="size-3.5 text-primary" />,
  friend_request: <UserPlus className="size-3.5 text-blue-400" />,
  friend_accepted: <UserCheck className="size-3.5 text-green-400" />,
  admin_broadcast: <Bell className="size-3.5 text-amber-400" />,
};

const notificationTypeLabels: Record<string, string> = {
  referral_completed: "Referral",
  friend_request: "Friend Request",
  friend_accepted: "Friend Accepted",
  admin_broadcast: "Announcement",
};

function UserMenuNotifications() {
  // @ts-ignore - TS2589: Convex generated type instantiation is excessively deep
  const notifications = useQuery(api.notifications.queries.list);
  const markRead = useMutation(api.notifications.queries.markRead);
  const markAllRead = useMutation(api.notifications.queries.markAllRead);
  const dismissNotification = useMutation(
    api.notifications.queries.dismissNotification,
  );
  // @ts-ignore - TS2589: Convex generated type instantiation is excessively deep
  const unreadCount = useQuery(api.notifications.queries.unreadCount) ?? 0;
  const hasNotifications = notifications && notifications.length > 0;
  const [open, setOpen] = React.useState(false);

  // Auto-open when notifications exist
  React.useEffect(() => {
    if (hasNotifications) setOpen(true);
  }, [hasNotifications]);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="w-full flex items-center gap-2.5 px-3 py-2 rounded-sm hover:bg-white/[0.03] transition-colors cursor-pointer">
        <Bell className="size-4 shrink-0 text-primary" />
        <span className="text-sm font-serif italic text-foreground/80">
          Notifications
        </span>
        {unreadCount > 0 && (
          <span className="flex items-center justify-center min-w-[16px] h-[16px] px-1 rounded-full bg-galactic text-white text-[9px] font-mono leading-none">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
        <svg
          className={cn(
            "size-4 shrink-0 text-foreground/40 ml-auto transition-transform duration-200",
            open && "rotate-180",
          )}
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="flex flex-col">
          {/* Mark all read */}
          {unreadCount > 0 && (
            <div className="flex justify-start px-3 pb-1">
              <button
                onClick={() => markAllRead()}
                className="text-[10px] text-primary/70 hover:text-primary font-mono uppercase tracking-wider transition-colors"
              >
                Mark all read
              </button>
            </div>
          )}

          <ScrollArea
            className="max-h-[40vh] w-full pr-1"
            style={{ height: hasNotifications ? Math.min(256, Math.max(64, notifications.length * 72)) : 64 }}
            type="auto"
          >
            {!hasNotifications ? (
              <div className="py-4 flex flex-col items-center gap-1.5 text-white/25">
                <Bell className="size-4" />
                <span className="text-[11px] font-sans">No notifications yet</span>
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
                        "flex items-start gap-3 px-3 py-2 text-left transition-colors hover:bg-white/[0.03] rounded-sm w-full group/notif",
                        !n.read && "bg-white/[0.02]",
                      )}
                    >
                      <div className="mt-0.5 shrink-0">
                        {notificationTypeIcons[n.type] ?? (
                          <Bell className="size-3.5 text-white/30" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0 space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-white/30">
                            {notificationTypeLabels[n.type] ?? n.type}
                          </span>
                          {!n.read && (
                            <span className="size-1.5 rounded-full bg-primary shrink-0" />
                          )}
                        </div>
                        <p className="text-xs text-white/60 leading-relaxed font-sans">
                          {n.message}
                        </p>
                      </div>
                      <button
                        className="h-5 w-5 shrink-0 rounded-sm flex items-center justify-center text-white/0 group-hover/notif:text-white/20 hover:!text-destructive transition-colors mt-0.5"
                        onClick={(e) => {
                          e.stopPropagation();
                          dismissNotification({ notificationId: n._id });
                        }}
                      >
                        <XIcon className="size-3" />
                      </button>
                    </motion.button>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </ScrollArea>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

function MobileNotifications() {
  const [open, setOpen] = React.useState(false);
  // @ts-ignore - TS2589: Convex generated type instantiation is excessively deep
  const notifications = useQuery(api.notifications.queries.list);
  const markRead = useMutation(api.notifications.queries.markRead);
  const markAllRead = useMutation(api.notifications.queries.markAllRead);
  const dismissNotification = useMutation(
    api.notifications.queries.dismissNotification,
  );
  // @ts-ignore - TS2589: Convex generated type instantiation is excessively deep
  const unreadCount = useQuery(api.notifications.queries.unreadCount) ?? 0;
  const hasNotifications = notifications && notifications.length > 0;

  return (
    <Collapsible open={open && hasNotifications} onOpenChange={setOpen}>
      <CollapsibleTrigger
        disabled={!hasNotifications}
        className={cn(
          "w-full flex items-center gap-2.5 transition-all",
          hasNotifications ? "cursor-pointer" : "opacity-40 cursor-default",
        )}
      >
        <Bell className="size-6 shrink-0 text-primary" />
        <span className="text-2xl font-serif italic text-foreground/80">
          Notifications
        </span>
        {unreadCount > 0 && (
          <span className="flex items-center justify-center min-w-[16px] h-[16px] px-1 rounded-full bg-galactic text-white text-[9px] font-mono leading-none">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
        {hasNotifications && (
          <svg
            className={cn(
              "size-5 shrink-0 text-foreground/40 transition-transform duration-200",
              open && "rotate-180",
            )}
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        )}
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="flex flex-col">
          {/* Mark all read */}
          {unreadCount > 0 && (
            <div className="flex justify-start px-2 pb-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  markAllRead();
                }}
                className="text-[10px] text-primary/70 hover:text-primary font-mono uppercase tracking-wider transition-colors"
              >
                Mark all read
              </button>
            </div>
          )}

          <ScrollArea
            className="max-h-[40vh] w-full pr-1"
            style={{ height: Math.min(256, Math.max(64, (notifications?.length ?? 0) * 72)) }}
            type="auto"
          >
            <div className="flex flex-col gap-1">
              <AnimatePresence>
                {notifications?.map((n: any) => (
                  <motion.button
                    key={n._id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    onClick={() => {
                      if (!n.read) markRead({ notificationId: n._id });
                    }}
                    className={cn(
                      "flex items-center gap-2.5 px-2 py-2 text-left transition-colors hover:bg-white/[0.03] rounded-sm w-full group/notif",
                      !n.read && "bg-white/[0.02]",
                    )}
                  >
                    <div className="shrink-0">
                      {notificationTypeIcons[n.type] ?? (
                        <Bell className="size-3.5 text-white/30" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span
                        className={cn(
                          "text-lg font-serif italic leading-snug",
                          !n.read ? "text-foreground/80" : "text-foreground/50",
                        )}
                      >
                        {n.message}
                      </span>
                    </div>
                    <button
                      className="h-5 w-5 shrink-0 rounded-sm flex items-center justify-center text-white/0 group-hover/notif:text-white/20 hover:!text-destructive transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        dismissNotification({ notificationId: n._id });
                      }}
                    >
                      <XIcon className="size-3" />
                    </button>
                  </motion.button>
                ))}
              </AnimatePresence>
            </div>
          </ScrollArea>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export function Navbar() {
  const [scrolled, setScrolled] = React.useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const pathname = usePathname();

  // Handle Scroll Effect
  React.useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Lock body scroll when mobile menu is open
  React.useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
  }, [isMobileMenuOpen]);

  const { isAuthenticated: isAuthConvex } = useConvexAuth();
  const { signOut } = useAuthActions();
  const { user: currentUser } = useUserStore();
  const isAuthenticated = isAuthConvex && !!currentUser;
  const hasBirthData = !!currentUser?.birthData;
  // @ts-ignore - TS2589: Convex generated type instantiation is excessively deep
  const unreadCount = useQuery(api.notifications.queries.unreadCount) ?? 0;

  // CTA logic based on auth and birthData
  const ctaLabel = isAuthenticated && hasBirthData ? "MY STARS" : "BIRTH CHART";
  const ctaHref = isAuthenticated
    ? hasBirthData
      ? "/dashboard"
      : "/onboarding"
    : "/onboarding";

  return (
    <>
      <header
        className={cn(
          "sticky top-0 z-[57] w-full transition-all duration-500",
          scrolled
            ? " bg-background/60 backdrop-blur-sm py-2"
            : "bg-transparent py-2",
        )}
      >
        <div className="mx-auto flex h-16 w-full max-w-[90rem] items-center px-4 sm:px-6 lg:px-8">
          {/* --- Left Section: Logo --- */}
          <div className="flex-1 flex items-center">
            <Link
              href="/"
              className="transition-transform duration-300 hover:scale-[1.02] z-50 relative"
            >
              <Logo size="sm" />
            </Link>
          </div>

          {/* --- Center Section: Desktop Nav links + CTA --- */}
          <div className="hidden lg:flex flex-1 justify-center">
            <NavigationMenu>
              <NavigationMenuList className="gap-5">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;
                  return (
                    <NavigationMenuItem key={item.title}>
                      <NavigationMenuLink asChild>
                        <Link
                          href={item.href}
                          className={cn(
                            navigationMenuTriggerStyle(),
                            "bg-transparent hover:bg-transparent text-white/80 hover:text-primary transition-all duration-500 font-serif text-sm tracking-wide uppercase italic flex items-center group/nav overflow-hidden text-nowrap",
                            isActive && "text-primary font-medium",
                          )}
                        >
                          <div className="flex items-center">
                            {/* Desktop Icon: Reserved space, fades in */}
                            <div
                              className={cn(
                                "flex items-center justify-center transition-all duration-500 ease-in-out w-5 mr-1.5",
                                isActive
                                  ? "opacity-100 translate-x-0"
                                  : "opacity-0 -translate-x-2 group-hover/nav:opacity-100 group-hover/nav:translate-x-0",
                              )}
                            >
                              <Icon className="size-4 shrink-0 text-primary" />
                            </div>

                            <span className="relative">{item.title}</span>
                          </div>
                        </Link>
                      </NavigationMenuLink>
                    </NavigationMenuItem>
                  );
                })}

                {/* CTA - Conditional based on auth/birthData */}
                <NavigationMenuItem>
                  <Button
                    variant="default"
                    size="default"
                    asChild
                    className="font-serif uppercase tracking-wider group/cta shadow-lg hover:shadow-primary/20"
                  >
                    <Link href={ctaHref} className="flex items-center gap-2">
                      <GiMazeCornea className="size-5 shrink-0" />
                      <span>{ctaLabel}</span>
                    </Link>
                  </Button>
                </NavigationMenuItem>
              </NavigationMenuList>
            </NavigationMenu>
          </div>

          {/* --- Right Section: Avatar + Stardust & Mobile Toggle --- */}
          <div className="flex-1 flex items-center justify-end gap-3">
            {/* Desktop: Authenticated user dropdown menu with notification badge on avatar */}
            {isAuthenticated && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="hidden lg:flex relative h-9 w-9 rounded-full ring-1 ring-white/10 hover:ring-primary/40 transition-all"
                  >
                    <Avatar className="h-9 w-9">
                      <AvatarImage
                        src={currentUser?.image}
                        alt={currentUser?.username ?? "User"}
                      />
                      <AvatarFallback className="bg-primary/10 text-primary text-xs font-serif">
                        {currentUser?.username?.charAt(0)?.toUpperCase() ?? (
                          <User className="size-4" />
                        )}
                      </AvatarFallback>
                    </Avatar>
                    {unreadCount > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-galactic text-white text-[10px] font-mono leading-none">
                        {unreadCount > 99 ? "99+" : unreadCount}
                      </span>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  className="mt-1.5 max-h-[min(42rem,var(--radix-dropdown-menu-content-available-height))] w-80 overflow-hidden border-white/10 bg-background/90 p-0 shadow-xl backdrop-blur-xl"
                  align="end"
                  sideOffset={8}
                >
                  {/* User info — clickable row leading to /settings */}
                  <DropdownMenuItem
                    asChild
                    className="cursor-pointer px-3 py-3"
                  >
                    <Link
                      href="/settings"
                      className="flex items-center gap-3 w-full"
                    >
                      <Avatar className="h-8 w-8 ring-1 ring-white/10 shrink-0">
                        <AvatarImage
                          src={currentUser?.image}
                          alt={currentUser?.username ?? "User"}
                        />
                        <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-serif">
                          {currentUser?.username?.charAt(0)?.toUpperCase() ??
                            "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col min-w-0 flex-1">
                        <p className="text-sm font-serif truncate text-foreground">
                          {currentUser?.username}
                        </p>
                        <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-white/40 truncate">
                          {currentUser?.email}
                        </p>
                      </div>
                      <Settings className="size-4 text-foreground/30 hover:text-primary transition-colors shrink-0" />
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-white/10" />

                  {/* ─── Inline Notifications ─── */}
                  <UserMenuNotifications />

                  <DropdownMenuItem
                    asChild
                    className="gap-2.5 cursor-pointer px-3 py-2"
                  >
                    <Link
                      href="/pricing"
                      className="text-sm text-foreground/80 hover:text-primary transition-colors"
                    >
                      <GiStarSwirl className="size-4 text-primary" />
                      <span className="font-serif italic">Upgrade</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    asChild
                    className="gap-2.5 cursor-pointer px-3 py-2"
                  >
                    <Link
                      href={`/invite/${currentUser?.username}`}
                      className="text-sm text-foreground/80 hover:text-primary transition-colors"
                    >
                      <UserPlus className="size-4 text-primary" />
                      <span className="font-serif italic">Invite</span>
                    </Link>
                  </DropdownMenuItem>

                  <DropdownMenuSeparator className="bg-white/10" />

                  <DropdownMenuItem
                    className="gap-2.5 cursor-pointer px-3 py-2 text-sm text-destructive/80 hover:text-destructive focus:text-destructive"
                    onClick={() => signOut()}
                  >
                    <LogOut className="size-4" />
                    <span className="font-sans italic">Sign Out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* Desktop: Stardust badge — right of avatar, end of navbar */}
            {isAuthenticated && (
              <div className="hidden lg:flex">
                <StardustBadge stardust={currentUser?.stardust ?? 0} />
              </div>
            )}

            {/* Desktop: Unauthenticated sign-in icon */}
            {!isAuthenticated && (
              <Button
                variant="ghost"
                size="icon"
                asChild
                className="hidden lg:flex text-foreground/70 hover:text-primary transition-colors"
              >
                <Link href="/sign-in">
                  <LogIn className="size-5" />
                  <span className="sr-only">Sign In</span>
                </Link>
              </Button>
            )}

            {/* Mobile: Authenticated avatar opens mobile menu instead of dropdown */}
            {isAuthenticated && (
              <Button
                variant="ghost"
                className="lg:hidden relative h-9 w-9 rounded-full ring-1 ring-white/10"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              >
                {isMobileMenuOpen ? (
                  <X className="size-5" />
                ) : (
                  <>
                    <Avatar className="h-9 w-9">
                      <AvatarImage
                        src={currentUser?.image}
                        alt={currentUser?.username ?? "User"}
                      />
                      <AvatarFallback className="bg-primary/10 text-primary text-xs font-serif">
                        {currentUser?.username?.charAt(0)?.toUpperCase() ?? (
                          <User className="size-4" />
                        )}
                      </AvatarFallback>
                    </Avatar>
                    {unreadCount > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-galactic text-white text-[10px] font-mono leading-none">
                        {unreadCount > 99 ? "99+" : unreadCount}
                      </span>
                    )}
                  </>
                )}
              </Button>
            )}

            {/* Mobile: Unauthenticated hamburger */}
            {!isAuthenticated && (
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden text-foreground/80 z-50 relative"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              >
                {isMobileMenuOpen ? (
                  <X className="size-6" />
                ) : (
                  <Menu className="size-6" />
                )}
              </Button>
            )}
          </div>
        </div>
      </header>
      {/* --- Mobile Menu Overlay --- */}
      {/* Backdrop: 40% left side with blur */}
      <div
        className={cn(
          "fixed inset-0 z-[55] bg-background/20 backdrop-blur-xl transition-opacity duration-300 lg:hidden",
          isMobileMenuOpen ? "opacity-100" : "opacity-0 pointer-events-none",
        )}
        onClick={() => setIsMobileMenuOpen(false)}
      />
      {/* Menu Panel: 60% from the right */}
      <div
        className={cn(
          "fixed inset-y-0 right-0 z-[56] w-full flex flex-col bg-background/95 backdrop-blur-xl transition-transform duration-300 lg:hidden",
          isMobileMenuOpen
            ? "translate-x-0"
            : "translate-x-full pointer-events-none",
        )}
      >
        {/* Spacer for navbar height */}
        <div className="h-16" />

        {/* ── Scrollable content area ── */}
        <div className="flex flex-col gap-6 p-6 overflow-y-auto flex-1">
          <div className="flex flex-col gap-6 items-start w-fit mx-auto">
            {/* Top bar: user info & settings + stardust (authenticated only) */}
            {isAuthenticated && (
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  className="flex items-center gap-2.5 h-auto py-2 px-1.5 hover:bg-white/[0.03] shrink-0"
                  asChild
                >
                  <Link
                    href="/settings"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <Avatar className=" ring-1 ring-white/10">
                      <AvatarImage
                        src={currentUser?.image}
                        alt={currentUser?.username ?? "User"}
                      />
                      <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-serif">
                        {currentUser?.username?.charAt(0)?.toUpperCase() ?? "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col items-start min-w-0">
                      <p className="text-sm font-serif truncate text-foreground leading-tight">
                        {currentUser?.username}
                      </p>
                      <p className="text-[9px] font-mono uppercase tracking-[0.15em] text-white/35 truncate">
                        {currentUser?.email}
                      </p>
                    </div>
                    <Settings className="size-3.5 text-foreground/40 shrink-0 ml-0.5" />
                  </Link>
                </Button>

                <div className="shrink-0">
                  <StardustBadge stardust={currentUser?.stardust ?? 0} />
                </div>
              </div>
            )}

            <div className="w-full border-b border-white/5" />

            {/* Authenticated: Notifications collapsible */}
            {isAuthenticated && <MobileNotifications />}

            <div className="w-full border-b border-white/5" />

            {/* Nav buttons */}
            <nav className="flex flex-col items-start gap-5">
              {navItems
                .filter((item) => item.title !== "Horoscopes")
                .map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.title}
                      href={item.href}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={cn(
                        "text-2xl font-serif italic text-white/80 hover:text-primary transition-all flex items-center gap-2.5 text-nowrap",
                        isActive && "text-primary font-medium",
                      )}
                    >
                      <Icon className="size-6 shrink-0 text-primary" />
                      {item.title}
                    </Link>
                  );
                })}

              {/* Horoscopes - just above CTA */}
              {(() => {
                const item = navItems.find((i) => i.title === "Horoscopes")!;
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    href={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={cn(
                      "text-2xl font-serif italic text-foreground/80 hover:text-primary transition-all flex items-center gap-2.5 text-nowrap",
                      isActive && "text-primary font-medium",
                    )}
                  >
                    <Icon className="size-6 shrink-0 text-primary" />
                    {item.title}
                  </Link>
                );
              })()}

              {/* Mobile CTA Link */}
              <Link
                href={ctaHref}
                onClick={() => setIsMobileMenuOpen(false)}
                className={cn(
                  "text-2xl font-serif italic transition-all flex items-center gap-2.5 mt-2 text-nowrap",
                  pathname === "/onboarding" ||
                    pathname === "/dashboard" ||
                    pathname === "/natal-chart"
                    ? "text-primary font-medium"
                    : "text-foreground/80 hover:text-primary",
                )}
              >
                <GiMazeCornea className="size-6 shrink-0 text-primary" />
                {ctaLabel}
              </Link>

              {/* Invite Link */}
              {isAuthenticated && (
                <Link
                  href={`/invite/${currentUser?.username}`}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="text-2xl font-serif italic text-white/80 hover:text-primary transition-all flex items-center gap-2.5 text-nowrap"
                >
                  <UserPlus className="size-6 shrink-0 text-primary" />
                  Invite
                </Link>
              )}
            </nav>
          </div>
        </div>

        {/* ── Footer ── */}
        {isAuthenticated ? (
          <div className="p-6 pt-0 flex justify-center">
            <Button
              variant="outline"
              size="lg"
              className="w-full max-w-xs font-sans italic text-destructive/80 hover:text-destructive border-destructive/20 hover:border-destructive/40 hover:bg-destructive/10"
              onClick={() => {
                setIsMobileMenuOpen(false);
                signOut();
              }}
            >
              <LogOut className="mr-2 size-5" /> Sign Out
            </Button>
          </div>
        ) : (
          <div className="p-6 pt-0 flex flex-col gap-2 items-center max-w-xs mx-auto w-full">
            <Button
              variant="outline"
              size="lg"
              asChild
              className="w-full font-serif uppercase"
            >
              <Link href="/sign-in" onClick={() => setIsMobileMenuOpen(false)}>
                <LogIn className="mr-2 size-5" /> Sign In
              </Link>
            </Button>
            <Button size="lg" asChild className="w-full font-serif uppercase">
              <Link href="/sign-up" onClick={() => setIsMobileMenuOpen(false)}>
                <UserPlus className="mr-2 size-5" /> Create Account
              </Link>
            </Button>
          </div>
        )}
      </div>
    </>
  );
}
