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
import { Menu, X, LogIn, LogOut, User } from "lucide-react"
import { GiStarsStack, GiCrystalBall, GiCoins, GiAstrolabe } from "react-icons/gi"
import { motion } from "motion/react"
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
    { title: "Readings", href: "/readings", icon: GiCrystalBall },
    { title: "Pricing", href: "/pricing", icon: GiCoins },
]

export function Navbar() {
    const [scrolled, setScrolled] = React.useState(false)
    const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false)
    const pathname = usePathname()

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
    const { user: currentUser, isLoading } = useUserStore()

    // We can use either or both, but the store is now our primary source for UI
    const isAuthenticated = isAuthConvex && !!currentUser

    return (
        <header
            className={cn(
                "sticky top-0 z-50 w-full transition-all duration-500",
                scrolled
                    ? " bg-background/60 backdrop-blur-sm py-2"
                    : "bg-transparent py-2"
            )}
        >
            <div className="mx-auto flex max-w-[90rem] h-16 items-center px-4 sm:px-6 lg:px-8">
                {/* --- Left Section: Logo --- */}
                <div className="flex-1 flex items-center">
                    <Link href="/" className="transition-transform duration-300 hover:scale-[1.02] z-50 relative">
                        <Logo size="sm" />
                    </Link>
                </div>

                {/* --- Center Section: Desktop Nav links --- */}
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
                                                    "bg-transparent hover:bg-accent/40 text-foreground/70 hover:text-primary transition-all duration-500 font-sans text-sm tracking-wide lowercase italic flex items-center group/nav overflow-hidden",
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
                                                        <motion.span
                                                            className="absolute -bottom-1 left-0 h-px bg-primary/50"
                                                            initial={false}
                                                            animate={{ width: isActive ? "100%" : "0%" }}
                                                            transition={{ duration: 0.3 }}
                                                        />
                                                    </span>
                                                </div>
                                            </Link>
                                        </NavigationMenuLink>
                                    </NavigationMenuItem>
                                );
                            })}
                        </NavigationMenuList>
                    </NavigationMenu>
                </div>

                {/* --- Right Section: Buttons & Mobile Toggle --- */}
                <div className="flex-1 flex items-center justify-end gap-3">
                    <div className="hidden sm:flex items-center gap-3">

                        {/* CTA - Natal Chart - ALWAYS VISIBLE ICON */}
                        <Button
                            variant="default"
                            size="default"
                            asChild
                            className="hidden font-serif sm:inline-flex uppercase tracking-wider group/cta shadow-lg hover:shadow-primary/20"
                        >
                            <Link href={isAuthenticated ? "/natal-chart" : "/onboarding"} className="flex items-center gap-2">
                                <GiAstrolabe className="size-5 shrink-0" />
                                <span>Natal Chart</span>
                            </Link>
                        </Button>
                    </div>

                    {isAuthenticated ? (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                                    <Avatar className="h-10 w-10 border border-primary/20">
                                        <AvatarImage src={currentUser?.image} alt={currentUser?.name ?? "User"} />
                                        <AvatarFallback className="bg-primary/5 text-primary">
                                            {currentUser?.name?.charAt(0) ?? <User className="size-5" />}
                                        </AvatarFallback>
                                    </Avatar>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-56 mt-2 border-primary/20 bg-background/95 backdrop-blur-xl" align="end" forceMount>
                                <DropdownMenuLabel className="font-normal">
                                    <div className="flex flex-col space-y-1">
                                        <p className="text-sm font-medium leading-none font-sans">{currentUser?.name}</p>
                                        <p className="text-xs leading-none text-muted-foreground font-sans">
                                            {currentUser?.email}
                                        </p>
                                    </div>
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator className="bg-primary/10" />
                                <DropdownMenuItem asChild>
                                    <Link href="/dashboard" className="cursor-pointer font-sans italic">
                                        Dashboard
                                    </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                    <Link href="/settings" className="cursor-pointer font-sans italic">
                                        Settings
                                    </Link>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator className="bg-primary/10" />
                                <DropdownMenuItem
                                    className="cursor-pointer text-destructive focus:text-destructive font-sans italic"
                                    onClick={() => signOut()}
                                >
                                    <LogOut className="mr-2 h-4 w-4" />
                                    <span>Sign Out</span>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    ) : (
                        <Button
                            variant="ghost"
                            size="icon"
                            asChild
                            className="text-foreground/70 hover:text-primary transition-colors"
                        >
                            <Link href="/sign-in">
                                <LogIn className="size-5" />
                                <span className="sr-only">Sign In</span>
                            </Link>
                        </Button>
                    )}

                    {/* Mobile Menu Toggle */}
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
                </div>
            </div>
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
                            href={isAuthenticated ? "/natal-chart" : "/onboarding"}
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="text-2xl font-serif italic text-primary font-medium hover:text-primary/80 transition-all flex items-center group/nav mt-2"
                        >
                            <div className={cn(
                                "flex items-center justify-center transition-all duration-500 ease-in-out w-8 mr-2",
                                (pathname === "/onboarding" || pathname === "/natal-chart")
                                    ? "opacity-100 translate-x-0"
                                    : "opacity-0 -translate-x-2 group-hover/nav:opacity-100 group-hover/nav:translate-x-0"
                            )}>
                                <GiAstrolabe className="size-6 shrink-0" />
                            </div>
                            Natal Chart
                        </Link>
                    </nav>

                    <div className="w-full h-px bg-border/50 max-w-[200px] mx-auto" />

                    <div className="flex flex-col items-center gap-4 w-full">
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

                        <div className="flex items-center gap-4">
                            <span className="text-sm text-muted-foreground">Switch Theme</span>
                            <ThemeSwitch />
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
}