import { Card, CardContent } from "@/components/ui/card";
import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
    title: "Terms of Service | stars.guide",
    description: "Terms of Service for stars.guide users.",
};

export default function TermsOfServicePage() {
    return (
        <div className="container relative mx-auto max-w-4xl px-4 py-24 sm:py-32">
            <div className="mb-16 text-center">
                <h1 className="font-serif text-4xl font-bold tracking-tight sm:text-6xl text-foreground mb-6">
                    Terms of Service
                </h1>
                <p className="font-sans text-lg text-muted-foreground/80">
                    Last Updated: March 2026
                </p>
            </div>

            <Card className="border-primary/20 bg-background/60 backdrop-blur-xl shadow-2xl shadow-primary/5">
                <CardContent className="p-8 sm:p-12 prose prose-zinc dark:prose-invert max-w-none font-sans text-muted-foreground">
                    <p className="lead text-foreground font-medium text-lg mb-8">
                        Welcome to stars.guide. By accessing or using our application, you agree to be bound by these Terms of Service. Please read them carefully.
                    </p>

                    <h2 className="font-serif text-2xl font-bold text-foreground mt-12 mb-6 flex items-center gap-3">
                        <span className="text-primary hidden sm:inline">✧</span>
                        1. Acceptance of Terms
                    </h2>
                    <p>
                        By creating an account, accessing, or using stars.guide (the "Service"), you agree to these Terms of Service and our <Link href="/privacy" className="text-primary hover:underline italic">Privacy Policy</Link>. If you do not agree to these terms, please do not use our Service.
                    </p>

                    <h2 className="font-serif text-2xl font-bold text-foreground mt-12 mb-6 flex items-center gap-3">
                        <span className="text-primary hidden sm:inline">✧</span>
                        2. User Accounts & Subscriptions
                    </h2>
                    <p>
                        To use certain features of the Service, you must register for an account. You are responsible for maintaining the confidentiality of your account credentials.
                    </p>
                    <ul className="list-disc pl-6 space-y-2 marker:text-primary">
                        <li>You must provide accurate, current, and complete information, particularly regarding birth data, which is essential for accurate astrological calculations.</li>
                        <li>Subscriptions automatically renew unless canceled prior to the renewal date.</li>
                        <li>Payments are non-refundable except where required by law.</li>
                    </ul>

                    <h2 className="font-serif text-2xl font-bold text-foreground mt-12 mb-6 flex items-center gap-3">
                        <span className="text-primary hidden sm:inline">✧</span>
                        3. AI Generative Content
                    </h2>
                    <p>
                        stars.guide uses advanced Artificial Intelligence models to generate interpretations, horoscopes, and celestial insights.
                    </p>
                    <ul className="list-disc pl-6 space-y-2 marker:text-primary">
                        <li>The astrological insights provided are for <strong className="text-foreground">entertainment and self-reflection purposes only</strong>.</li>
                        <li>Do not rely on AI-generated insights for psychological, medical, legal, or financial decisions.</li>
                        <li>We do not guarantee the absolute accuracy or "truth" of any generated astrological forecast.</li>
                    </ul>

                    <h2 className="font-serif text-2xl font-bold text-foreground mt-12 mb-6 flex items-center gap-3">
                        <span className="text-primary hidden sm:inline">✧</span>
                        4. Intellectual Property
                    </h2>
                    <p>
                        All original content, designs, texts, graphics, and underlying code on stars.guide are the exclusive property of stars.guide and are protected by international copyright and trademark laws. You may not copy, reproduce, or distribute our proprietary application interfaces or astronomical calculation algorithms.
                    </p>

                    <h2 className="font-serif text-2xl font-bold text-foreground mt-12 mb-6 flex items-center gap-3">
                        <span className="text-primary hidden sm:inline">✧</span>
                        5. User Conduct
                    </h2>
                    <p>
                        You agree not to:
                    </p>
                    <ul className="list-disc pl-6 space-y-2 marker:text-primary">
                        <li>Use the Service for any illegal or unauthorized purpose.</li>
                        <li>Attempt to reverse engineer, scrape, or exploit the AI endpoints of the Service.</li>
                        <li>Share your premium account access with unauthorized third parties.</li>
                    </ul>

                    <h2 className="font-serif text-2xl font-bold text-foreground mt-12 mb-6 flex items-center gap-3">
                        <span className="text-primary hidden sm:inline">✧</span>
                        6. Termination
                    </h2>
                    <p>
                        We reserve the right to suspend or terminate your account at any time, without prior notice or liability, for any reason, including if you breach these Terms. Upon termination, your right to use the Service will immediately cease.
                    </p>

                    <h2 className="font-serif text-2xl font-bold text-foreground mt-12 mb-6 flex items-center gap-3">
                        <span className="text-primary hidden sm:inline">✧</span>
                        7. Contact Us
                    </h2>
                    <p>
                        If you have any questions about these Terms, please contact us at: <a href="mailto:support@stars.guide" className="text-primary hover:underline font-medium">support@stars.guide</a>
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
