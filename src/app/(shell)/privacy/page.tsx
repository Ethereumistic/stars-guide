import { Card, CardContent } from "@/components/ui/card";
import { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
    title: "Privacy Policy | stars.guide",
    description: "Privacy Policy and Data Deletion instructions for stars.guide.",
};

export default function PrivacyPolicyPage() {
    return (
        <div className="container relative mx-auto max-w-4xl px-4 py-24 sm:py-32">
            <div className="mb-16 text-center">
                <h1 className="font-serif text-4xl font-bold tracking-tight sm:text-6xl text-foreground mb-6">
                    Privacy Policy
                </h1>
                <p className="font-sans text-lg text-muted-foreground/80">
                    Last Updated: March 2026
                </p>
            </div>

            <Card className="border-primary/20 bg-background/60 backdrop-blur-xl shadow-2xl shadow-primary/5">
                <CardContent className="p-8 sm:p-12 prose prose-zinc dark:prose-invert max-w-none font-sans text-muted-foreground">
                    <p className="lead text-foreground font-medium text-lg mb-8">
                        We value your privacy deeply. This Privacy Policy details how stars.guide collects, uses, and protects your personal information when you use our celestial application. We act in full compliance with the General Data Protection Regulation (GDPR) and other global privacy laws.
                    </p>

                    <h2 className="font-serif text-2xl font-bold text-foreground mt-12 mb-6 flex items-center gap-3">
                        <span className="text-primary hidden sm:inline">✧</span>
                        1. Data We Collect
                    </h2>
                    <p>We only collect the absolute minimum data required to provide you with accurate astrological charts and insights:</p>
                    <ul className="list-disc pl-6 space-y-2 marker:text-primary">
                        <li><strong className="text-foreground">Account Data:</strong> Email address, name, and profile imaging provided by OAuth providers (Google, X, Facebook) or email registration.</li>
                        <li><strong className="text-foreground">Astrological Data:</strong> Your date, time, and precise location of birth to calculate your celestial alignments.</li>
                        <li><strong className="text-foreground">Usage Data:</strong> Application settings, daily insight access logs, and subscription timestamps.</li>
                    </ul>

                    <h2 className="font-serif text-2xl font-bold text-foreground mt-12 mb-6 flex items-center gap-3">
                        <span className="text-primary hidden sm:inline">✧</span>
                        2. How We Use Your Data
                    </h2>
                    <p>Your data is used strictly to power your stars.guide experience:</p>
                    <ul className="list-disc pl-6 space-y-2 marker:text-primary">
                        <li>To authenticate your identity securely.</li>
                        <li>To calculate and generate your birth chart (Sun, Moon, Rising signs).</li>
                        <li>To provide personalized AI-generated horoscopes based strictly on your unique placements.</li>
                        <li>To process subscription payments securely via our payment gateway.</li>
                    </ul>
                    <p className="italic border-l-2 border-primary/30 pl-4 py-2 bg-primary/5 rounded-r">
                        We do not sell your personal data or birth information to third-party data brokers or advertisers.
                    </p>

                    <h2 id="facebook-data-deletion" className="font-serif text-2xl font-bold text-foreground mt-12 mb-6 flex items-center gap-3 scroll-m-24">
                        <span className="text-primary hidden sm:inline">✧</span>
                        3. Data Deletion Instructions
                    </h2>
                    <p>
                        stars.guide uses Social Login (OAuth 2.0) to provide a seamless authentication experience. You have the total right to request that we delete all data associated with your account, including data provided by Social Login providers.
                    </p>
                    <p>
                        To permanently delete your stars.guide account and obliterate all your data from our servers:
                    </p>
                    <div className="bg-background/80 border border-primary/20 rounded-lg p-6 my-6">
                        <ol className="list-decimal pl-6 space-y-3 font-medium text-foreground marker:text-primary">
                            <li>Send an email to <a href="mailto:support@stars.guide" className="text-primary hover:underline">support@stars.guide</a> from the email address connected to your account.</li>
                            <li>Use the subject line: <span className="bg-primary/10 px-2 py-1 rounded text-primary">Data Deletion Request</span></li>
                            <li>Include your full name and the email address used to register.</li>
                            <li>Our team will manually purge all records of your account, birth data, and OAuth associations within 2 business days and send you a confirmation email of the deletion.</li>
                        </ol>
                    </div>

                    <h2 className="font-serif text-2xl font-bold text-foreground mt-12 mb-6 flex items-center gap-3">
                        <span className="text-primary hidden sm:inline">✧</span>
                        4. GDPR & Your Rights
                    </h2>
                    <p>
                        If you are a resident of the European Economic Area (EEA), you have the following data protection rights:
                    </p>
                    <ul className="list-disc pl-6 space-y-2 marker:text-primary">
                        <li><strong className="text-foreground">Right of Access:</strong> You can request a copy of the personal data we hold about you.</li>
                        <li><strong className="text-foreground">Right to Rectification:</strong> You can edit your birth data directly from your dashboard settings.</li>
                        <li><strong className="text-foreground">Right to Erasure (Right to be Forgotten):</strong> You can request total deletion of your data (see Section 3).</li>
                        <li><strong className="text-foreground">Right to Data Portability:</strong> You have the right to receive your data in a structured, machine-readable format.</li>
                    </ul>

                    <h2 className="font-serif text-2xl font-bold text-foreground mt-12 mb-6 flex items-center gap-3">
                        <span className="text-primary hidden sm:inline">✧</span>
                        5. Log Data & Third Parties
                    </h2>
                    <p>
                        We use third-party services like Stripe (for subscription handling), AI Models (for generating text based on generic star placements, never raw personal identifying data), and Convex (for secure database hosting). These services comply with strict data protection and GDPR protocols.
                    </p>

                    <h2 className="font-serif text-2xl font-bold text-foreground mt-12 mb-6 flex items-center gap-3">
                        <span className="text-primary hidden sm:inline">✧</span>
                        6. Contact Us
                    </h2>
                    <p>
                        If you have inquiries regarding this Privacy Policy or your data, please contact our Data Protection Office at:
                    </p>
                    <Link href="mailto:support@stars.guide">
                        <Button variant="outline" className="mt-4 border-primary/20 hover:bg-primary/5">
                            support@stars.guide
                        </Button>
                    </Link>
                </CardContent>
            </Card>
        </div>
    );
}
