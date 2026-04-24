"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Logo } from "@/components/ui/logo"
import { ThemeSwitch } from "@/components/ui/theme-switch"
import { Button } from "@/components/ui/button"
import {
    NavigationMenu,
    NavigationMenuItem,
    NavigationMenuLink,
    NavigationMenuList,
    navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu"
import { cn } from "@/lib/utils"
import { Menu, X, LogIn, LogOut, User, Settings, Sparkles, Plus } from "lucide-react"
import { ButtonGroup, ButtonGroupText } from "@/components/ui/button-group"
import { GiStarsStack, GiCrystalBall, GiCoins, GiAstrolabe, GiCursedStar, GiScrollUnfurled, GiStarSwirl } from "react-icons/gi"
import { motion, AnimatePresence } from "motion/react"
import { useConvexAuth } from "convex/react"
import { useAuthActions } from "@convex-dev/auth/react"
import { useUserStore } from "@/store/use-user-store"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

const navItems = [
    { title: "Horoscopes", href: "/horoscopes", icon: GiStarsStack },
    { title: "Learn", href: "/learn", icon: GiAstrolabe },
    { title: "Oracle", href: "/oracle", icon: GiCursedStar },
    { title: "Journal", href: "/journal", icon: GiScrollUnfurled },
    { title: "Pricing", href: "/pricing", icon: GiCoins },
]

function StardustBadge({ stardust, href = "/pricing" }: { stardust: number; href?: string }) {
    return (
        <ButtonGroup className="h-9">
            <ButtonGroupText
                className="bg-gradient-to-r from-primary/[0.06] to-galactic/[0.04] border-primary/20 px-2.5 gap-1.5 shadow-none"
            >
                <GiStarSwirl className="size-4 text-primary drop-shadow-[0_0_8px_rgba(212,175,55,0.5)] shrink-0" />
                <span
                    className="text-sm font-serif font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-galactic tabular-nums"
                >
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
    )
}

export function Navbar() {
    const [scrolled, setScrolled] = React.useState(false)
    const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false)
    const pathname = usePathname()
    const isOracle = pathname.startsWith("/oracle") || pathname.startsWith("/journal")

    // Handle Scroll Effect
    React.useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 20)
        }
        window.addEventListener("scroll", handleScroll, { passive: true })
        return () => window.removeEventListener("scroll", handleScroll)
    }, [])


    // Lock body scroll when mobile menu is open
    React.useEffect(() => {
        if (isMobileMenuOpen) {
            document.body.style.overflow = "hidden"
        } else {
            document.body.style.overflow = "unset"
        }
    }, [isMobileMenuOpen])

    const { isAuthenticated: isAuthConvex } = useConvexAuth()
    const { signOut } = useAuthActions()
    const { user: currentUser } = useUserStore()
    const isAuthenticated = isAuthConvex && !!currentUser
    const hasBirthData = !!currentUser?.birthData

    // CTA logic based on auth and birthData
    const ctaLabel = isAuthenticated && hasBirthData ? "MY STARS" : "BIRTH CHART"
    const ctaHref = isAuthenticated
        ? hasBirthData
            ? "/dashboard"
            : "/onboarding"
        : "/onboarding"

    if (isOracle) return null

    return (
        <>
            <header
                className={cn(
                    "sticky top-0 z-50 w-full transition-all duration-500",
                    scrolled
                        ? " bg-background/60 backdrop-blur-sm py-2"
                        : "bg-transparent py-2"
                )}
            >
                <div className="mx-auto flex h-16 w-full max-w-[90rem] items-center px-4 sm:px-6 lg:px-8">
                    {/* --- Left Section: Logo --- */}
                    <div className="flex-1 flex items-center">
                        <Link href="/" className="transition-transform duration-300 hover:scale-[1.02] z-50 relative">
                            <Logo size="sm" />
                        </Link>
                    </div>

                    {/* --- Center Section: Desktop Nav links + CTA --- */}
                    <div className="hidden md:flex flex-1 justify-center">
                        <NavigationMenu>
                            <NavigationMenuList className="gap-8">
                                {navItems.map((item) => {
                                    const Icon = item.icon
                                    const isActive = pathname === item.href
                                    return (
                                        <NavigationMenuItem key={item.title}>
                                            <NavigationMenuLink asChild>
                                                <Link
                                                    href={item.href}
                                                    className={cn(
                                                        navigationMenuTriggerStyle(),
                                                        "bg-transparent hover:bg-accent/40 text-foreground/70 hover:text-primary transition-all duration-500 font-serif text-sm tracking-wide lowercase italic flex items-center group/nav overflow-hidden",
                                                        isActive && "text-primary font-medium"
                                                    )}
                                                >
                                                    <div className="flex items-center">
                                                        {/* Desktop Icon: Reserved space, fades in */}
                                                        <div className={cn(
                                                            "flex items-center justify-center transition-all duration-500 ease-in-out w-5 mr-1.5",
                                                            isActive
                                                                ? "opacity-100 translate-x-0"
                                                                : "opacity-0 -translate-x-2 group-hover/nav:opacity-100 group-hover/nav:translate-x-0"
                                                        )}>
                                                            <Icon className="size-4 shrink-0 text-primary" />
                                                        </div>

                                                        <span className="relative">
                                                            {item.title}
                                                        </span>
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
                                            <GiAstrolabe className="size-5 shrink-0" />
                                            <span>{ctaLabel}</span>
                                        </Link>
                                    </Button>
                                </NavigationMenuItem>
                            </NavigationMenuList>
                        </NavigationMenu>
                    </div>

                    {/* --- Right Section: Avatar + Stardust & Mobile Toggle --- */}
                    <div className="flex-1 flex items-center justify-end gap-3">
                        {/* Desktop: Authenticated user dropdown menu */}
                        {isAuthenticated && (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" className="hidden md:flex relative h-9 w-9 rounded-full ring-1 ring-white/10 hover:ring-primary/40 transition-all">
                                        <Avatar className="h-9 w-9">
                                            <AvatarImage src={currentUser?.image} alt={currentUser?.username ?? "User"} />
                                            <AvatarFallback className="bg-primary/10 text-primary text-xs font-serif">
                                                {currentUser?.username?.charAt(0)?.toUpperCase() ?? <User className="size-4" />}
                                            </AvatarFallback>
                                        </Avatar>
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent
                                    className="w-56 mt-1.5 border-white/10 bg-background/90 backdrop-blur-xl shadow-xl"
                                    align="end"
                                    sideOffset={8}
                                >
                                    <DropdownMenuLabel className="font-normal px-3 py-3">
                                        <div className="flex items-center gap-3">
                                            <Avatar className="h-8 w-8 ring-1 ring-white/10">
                                                <AvatarImage src={currentUser?.image} alt={currentUser?.username ?? "User"} />
                                                <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-serif">
                                                    {currentUser?.username?.charAt(0)?.toUpperCase() ?? "U"}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="flex flex-col min-w-0">
                                                <p className="text-sm font-serif truncate text-foreground">{currentUser?.username}</p>
                                                <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-white/40 truncate">
                                                    {currentUser?.email}
                                                </p>
                                            </div>
                                        </div>
                                    </DropdownMenuLabel>
                                    <DropdownMenuSeparator className="bg-white/10" />

                                    <DropdownMenuItem asChild className="gap-2.5 cursor-pointer px-3 py-2">
                                        <Link href="/settings" className="text-sm text-foreground/80 hover:text-primary transition-colors">
                                            <Settings className="size-4 text-primary/60" />
                                            <span className="font-sans italic">Settings</span>
                                        </Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem asChild className="gap-2.5 cursor-pointer px-3 py-2">
                                        <Link href="/pricing" className="text-sm text-galactic hover:text-galactic/80 transition-colors">
                                            <Sparkles className="size-4" />
                                            <span className="font-sans italic">Upgrade</span>
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
                            <div className="hidden md:flex">
                                <StardustBadge stardust={currentUser?.stardust ?? 0} />
                            </div>
                        )}

                        {/* Desktop: Unauthenticated sign-in icon */}
                        {!isAuthenticated && (
                            <Button
                                variant="ghost"
                                size="icon"
                                asChild
                                className="hidden md:flex text-foreground/70 hover:text-primary transition-colors"
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
                                className="md:hidden relative h-9 w-9 rounded-full ring-1 ring-white/10"
                                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                            >
                                {isMobileMenuOpen ? (
                                    <X className="size-5" />
                                ) : (
                                    <Avatar className="h-9 w-9">
                                        <AvatarImage src={currentUser?.image} alt={currentUser?.username ?? "User"} />
                                        <AvatarFallback className="bg-primary/10 text-primary text-xs font-serif">
                                            {currentUser?.username?.charAt(0)?.toUpperCase() ?? <User className="size-4" />}
                                        </AvatarFallback>
                                    </Avatar>
                                )}
                            </Button>
                        )}

                        {/* Mobile: Unauthenticated hamburger */}
                        {!isAuthenticated && (
                            <Button
                                variant="ghost"
                                size="icon"
                                className="md:hidden text-foreground/80 z-50 relative"
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
            <div
                className={cn(
                    "fixed inset-0 z-40 flex flex-col bg-background/95 backdrop-blur-xl transition-all duration-300 md:hidden",
                    isMobileMenuOpen
                        ? "opacity-100 translate-y-0"
                        : "opacity-0 -translate-y-full pointer-events-none"
                )}
            >
                {/* Spacer */}
                <div className="h-24" />

                <div className="flex flex-col gap-8 p-8 overflow-y-auto">

                    {/* Mobile Nav Container 
                        w-fit + mx-auto -> Centers the block horizontally
                        items-start -> Aligns the text to the left within that block
                    */}
                    <nav className="flex flex-col items-start gap-6 w-fit mx-auto">
                        {navItems.map((item) => {
                            const Icon = item.icon
                            const isActive = pathname === item.href
                            return (
                                <Link
                                    key={item.title}
                                    href={item.href}
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className={cn(
                                        "text-2xl font-serif italic text-foreground/80 hover:text-primary transition-all flex items-center group/nav",
                                        isActive && "text-primary font-medium"
                                    )}
                                >
                                    {/* Mobile Icon: Reserved fixed width (w-8) to prevent text jump */}
                                    <div className={cn(
                                        "flex items-center justify-center transition-all duration-500 ease-in-out w-8 mr-2",
                                        isActive
                                            ? "opacity-100 translate-x-0"
                                            : "opacity-0 -translate-x-2 group-hover/nav:opacity-100 group-hover/nav:translate-x-0"
                                    )}>
                                        <Icon className="size-6 shrink-0" />
                                    </div>
                                    {item.title}
                                </Link>
                            )
                        })}

                        {/* Mobile CTA Link */}
                        <Link
                            href={ctaHref}
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="text-2xl font-serif italic text-primary font-medium hover:text-primary/80 transition-all flex items-center group/nav mt-2"
                        >
                            <div className={cn(
                                "flex items-center justify-center transition-all duration-500 ease-in-out w-8 mr-2",
                                (pathname === "/onboarding" || pathname === "/dashboard" || pathname === "/natal-chart")
                                    ? "opacity-100 translate-x-0"
                                    : "opacity-0 -translate-x-2 group-hover/nav:opacity-100 group-hover/nav:translate-x-0"
                            )}>
                                <GiAstrolabe className="size-6 shrink-0" />
                            </div>
                            {ctaLabel}
                        </Link>

                        {/* Authenticated: Settings & Upgrade links */}
                        {isAuthenticated && (
                            <>
                                <Link
                                    href="/settings"
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className={cn(
                                        "text-2xl font-serif italic text-foreground/80 hover:text-primary transition-all flex items-center group/nav",
                                        pathname === "/settings" && "text-primary font-medium"
                                    )}
                                >
                                    <div className={cn(
                                        "flex items-center justify-center transition-all duration-500 ease-in-out w-8 mr-2",
                                        pathname === "/settings"
                                            ? "opacity-100 translate-x-0"
                                            : "opacity-0 -translate-x-2 group-hover/nav:opacity-100 group-hover/nav:translate-x-0"
                                    )}>
                                        <Settings className="size-6 shrink-0" />
                                    </div>
                                    Settings
                                </Link>
                                <Link
                                    href="/pricing"
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className="text-2xl font-serif italic text-galactic hover:text-galactic/80 transition-all flex items-center group/nav"
                                >
                                    <div className="flex items-center justify-center transition-all duration-500 ease-in-out w-8 mr-2 opacity-0 -translate-x-2 group-hover/nav:opacity-100 group-hover/nav:translate-x-0">
                                        <Sparkles className="size-6 shrink-0" />
                                    </div>
                                    Upgrade
                                </Link>
                            </>
                        )}
                    </nav>

                    <div className="w-full h-px bg-border/50 max-w-[200px] mx-auto" />

                    {/* Mobile menu footer: conditional on auth state */}
                    <div className="flex flex-col items-center gap-4 w-full">
                        {isAuthenticated ? (
                            // Authenticated: User card + sign out
                            <div className="w-full max-w-[260px] space-y-4">
                                <div className="flex items-center gap-3 px-2">
                                    <Avatar className="h-10 w-10 ring-1 ring-white/10">
                                        <AvatarImage src={currentUser?.image} alt={currentUser?.username ?? "User"} />
                                        <AvatarFallback className="bg-primary/10 text-primary text-sm font-serif">
                                            {currentUser?.username?.charAt(0)?.toUpperCase() ?? "U"}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="flex flex-col min-w-0">
                                        <p className="text-sm font-serif truncate text-foreground">{currentUser?.username}</p>
                                        <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-white/40 truncate">
                                            {currentUser?.email}
                                        </p>
                                    </div>
                                </div>
                                {/* Mobile: Stardust balance */}
                                <StardustBadge stardust={currentUser?.stardust ?? 0} />
                                <Button
                                    variant="ghost"
                                    size="lg"
                                    className="w-full text-destructive/80 hover:text-destructive hover:bg-destructive/10 font-sans italic"
                                    onClick={() => {
                                        setIsMobileMenuOpen(false)
                                        signOut()
                                    }}
                                >
                                    <LogOut className="mr-2 size-5" /> Sign Out
                                </Button>
                            </div>
                        ) : (
                            /* Unauthenticated: Sign In button */
                            <Button
                                variant="outline"
                                size="lg"
                                asChild
                                className="w-full max-w-[200px] font-serif tracking-wide"
                            >
                                <Link href="/sign-in" onClick={() => setIsMobileMenuOpen(false)}>
                                    <LogIn className="mr-2 size-5" /> Sign In
                                </Link>
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}


