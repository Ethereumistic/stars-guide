"use client"

import { SignUpForm } from './sign-up-form'
import { PlanetShowcase } from '@/components/auth/planet-showcase'
import { Card, CardContent } from "@/components/ui/card"
import { motion } from "motion/react"

export default function SignUpPage() {
    return (
        <div className="min-h-[calc(100vh-5rem)] flex items-center justify-center px-4 py-12">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="w-full max-w-[880px]"
            >
                <Card className="border-primary/10 bg-background/60 backdrop-blur-xl shadow-2xl shadow-primary/10 overflow-hidden">
                    <CardContent className="p-0">
                        <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_320px]">
                            {/* Form */}
                            <div className="p-6 lg:p-8">
                                <SignUpForm bare />
                            </div>

                            {/* Divider */}
                            <div className="hidden lg:block relative">
                                <div className="absolute inset-y-8 left-1/2 -translate-x-1/2 w-px bg-border/30" />
                            </div>

                            {/* Planet Showcase */}
                            <div className="hidden lg:block bg-black/[0.08]">
                                <PlanetShowcase />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </motion.div>
        </div>
    )
}
