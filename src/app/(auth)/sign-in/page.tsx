"use client";

import { SignInForm } from "./sign-in-form";
import { PlanetShowcase } from "@/components/auth/planet-showcase";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "motion/react";

export default function SignInPage() {
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
            <div className="grid grid-cols-1 lg:grid-cols-7">
              {/* Form */}
              <div className="p-6 lg:p-8 col-span-3">
                <SignInForm bare />
              </div>

              {/* Planet Showcase */}
              <div className="hidden lg:block  col-span-4">
                <PlanetShowcase />
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
