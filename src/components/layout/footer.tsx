"use client"

import * as React from "react"
import Link from "next/link"
import { Logo } from "@/components/ui/logo"
import { ThemeSwitch } from "@/components/ui/theme-switch"
import { GiStarsStack, GiCrystalBall, GiCoins, GiAstrolabe } from "react-icons/gi"
import { Mail, Facebook, Twitter, Instagram, X } from "lucide-react"
import { BsTwitterX, BsTiktok } from "react-icons/bs";
import { cn } from "@/lib/utils"
import { usePathname } from "next/navigation"
import { useConvexAuth } from "convex/react"
import { useUserStore } from "@/store/use-user-store"

const navItems = [
    { title: "Horoscopes", href: "/horoscopes", icon: GiStarsStack },
    { title: "Readings", href: "/readings", icon: GiCrystalBall },
    { title: "Pricing", href: "/pricing", icon: GiCoins },
    { title: "Natal Chart", href: "/onboarding", icon: GiAstrolabe },
]

const legalItems = [
    { title: "Privacy Policy", href: "/privacy" },
    { title: "Terms of Use", href: "/terms" },
    { title: "Cookie Policy", href: "/cookies" },
]

const socialLinks = [
    { icon: BsTwitterX, href: "https://twitter.com/starsguide", label: "Twitter" },
    { icon: BsTiktok, href: "https://tiktok.com/starsguide", label: "Tiktok" },
    { icon: Facebook, href: "https://github.com/Ethereumistic/stars-guide", label: "Facebook" },
    { icon: Instagram, href: "https://instagram.com/starsguide", label: "Instagram" },
]

export function Footer() {
    const pathname = usePathname()
    const { isAuthenticated: isAuthConvex } = useConvexAuth()
    const { user: currentUser } = useUserStore()
    const isAuthenticated = isAuthConvex && !!currentUser

    return (
        <footer className="w-full border-t border-primary/10 bg-background/50 backdrop-blur-sm">
            <div className="mx-auto max-w-[90rem] px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
                <div className="xl:grid xl:grid-cols-3 xl:gap-8">
                    {/* Brand Section */}
                    <div className="flex flex-col items-center text-center xl:items-start xl:text-left space-y-8">
                        <Link href="/" className="inline-block transition-transform duration-300 hover:scale-[1.02]">
                            <Logo size="sm" />
                        </Link>
                        <p className="max-w-xs text-sm text-muted-foreground font-sans italic">
                            Navigate your fate. The map is written above, and we are here to help you read it.
                        </p>
                        <div className="flex gap-4">
                            {socialLinks.map((item) => {
                                const Icon = item.icon
                                return (
                                    <a
                                        key={item.label}
                                        href={item.href}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-muted-foreground hover:text-primary transition-colors duration-300"
                                    >
                                        <span className="sr-only">{item.label}</span>
                                        <Icon className="size-5" />
                                    </a>
                                )
                            })}
                        </div>
                    </div>

                    {/* Navigation Links */}
                    <div className="mt-16 flex flex-col gap-12 xl:col-span-2 xl:mt-0 xl:grid xl:grid-cols-2 xl:gap-8">
                        <div className="grid grid-cols-2 gap-8 md:gap-8">
                            <div className="">
                                <h3 className="font-serif text-sm font-semibold uppercase tracking-wider text-foreground text-center xl:text-left ml-5 xl:ml-0 ">
                                    Sanctuary
                                </h3>
                                <ul className="mt-4 space-y-4 flex flex-col items-center xl:items-start">
                                    {navItems.map((item) => {
                                        const Icon = item.icon
                                        const isNatalChart = item.title === "Natal Chart"
                                        const href = isNatalChart
                                            ? (isAuthenticated ? "/natal-chart" : "/onboarding")
                                            : item.href
                                        const isActive = pathname === href

                                        return (
                                            <li key={item.title}>
                                                <Link
                                                    href={href}
                                                    className={cn(
                                                        "text-sm text-muted-foreground hover:text-primary transition-colors duration-300 font-sans flex items-center group/footer overflow-hidden",
                                                        isActive && "text-primary font-medium"
                                                    )}
                                                >
                                                    <div className={cn(
                                                        "flex items-center justify-center transition-all duration-500 ease-in-out w-5 mr-1.5",
                                                        isActive
                                                            ? "opacity-100 translate-x-0"
                                                            : "opacity-0 -translate-x-2 group-hover/footer:opacity-100 group-hover/footer:translate-x-0"
                                                    )}>
                                                        <Icon className="size-4 shrink-0" />
                                                    </div>
                                                    <span>{item.title}</span>
                                                </Link>
                                            </li>
                                        )
                                    })}
                                </ul>
                            </div>
                            <div className="">
                                <h3 className="font-serif text-sm font-semibold uppercase tracking-wider text-foreground text-center xl:text-left ml-5 xl:ml-0">
                                    Legal
                                </h3>
                                <ul className="mt-4 space-y-4 flex flex-col items-center xl:items-start">
                                    {legalItems.map((item) => (
                                        <li key={item.title}>
                                            <Link
                                                href={item.href}
                                                className="text-sm text-muted-foreground hover:text-primary transition-colors duration-300 font-sans flex items-center"
                                            >
                                                {/* Placeholder to match Sanctuary alignment */}
                                                <div className="w-5 mr-1.5 h-4 shrink-0" />
                                                <span>{item.title}</span>
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>

                        {/* Newsletter / Contact Section */}
                        <div className="flex flex-col items-center text-center xl:items-start xl:text-left justify-between">
                            <div className="w-full max-w-[21rem] flex flex-col items-center xl:items-start">
                                <h3 className="font-serif text-sm font-semibold uppercase tracking-wider text-foreground">
                                    Newsletter
                                </h3>
                                <p className="mt-4 text-sm text-muted-foreground font-sans">
                                    Join our cosmic mailing list for weekly celestial updates.
                                </p>
                                <form className="mt-4 flex flex-col sm:flex-row w-full gap-3">
                                    <input
                                        type="email"
                                        required
                                        className="w-full min-w-0 appearance-none rounded-md border border-primary/20 bg-background/50 px-4 py-2 text-sm text-foreground placeholder-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all font-sans text-center xl:text-left"
                                        placeholder="your@email.com"
                                    />
                                    <button
                                        type="submit"
                                        className="flex w-full items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-all sm:w-auto font-serif uppercase tracking-widest shrink-0"
                                    >
                                        Subscribe
                                    </button>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Bottom Row */}
                <div className="mt-12 border-t border-primary/10 pt-8 flex flex-col md:flex-row items-center justify-between gap-6">
                    <p className="text-xs text-muted-foreground font-sans">
                        &copy; {new Date().getFullYear()} stars.guide. All rights reserved. Crafting destinies one star at a time.
                    </p>
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground italic font-sans">
                            <Mail className="size-3" />
                            <span>oracle@stars.guide</span>
                        </div>
                        <ThemeSwitch />
                    </div>
                </div>
            </div>
        </footer>
    )
}
