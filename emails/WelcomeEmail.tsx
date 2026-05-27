/**
 * WelcomeEmail.tsx — Day 0 onboarding email for new stars.guide users.
 */
import {
    Html,
    Head,
    Body,
    Container,
    Section,
    Text,
    Heading,
    Button,
    Link,
    Img,
} from "@react-email/components";
import { theme, baseStyles } from "./theme";

interface WelcomeEmailProps {
    userName?: string;
    sign: string;
}

export function WelcomeEmail({ userName, sign }: WelcomeEmailProps) {
    return (
        <Html>
            <Head />
            <Body style={baseStyles}>
                <Container style={{ maxWidth: "600px", margin: "0 auto", padding: "40px 20px" }}>

                    {/* Logo / Header */}
                    <Section style={{ textAlign: "center", marginBottom: "40px" }}>
                        <Text style={{ fontSize: "48px", margin: "0 0 16px" }}>✨</Text>
                        <Heading style={{
                            fontSize: "36px",
                            fontFamily: theme.fonts.heading,
                            color: theme.colors.text,
                            margin: "0 0 8px",
                        }}>
                            stars.guide
                        </Heading>
                        <Text style={{ color: theme.colors.textMuted, fontSize: "14px" }}>
                            Your personal astrology guide
                        </Text>
                    </Section>

                    {/* Main card */}
                    <Section style={{
                        backgroundColor: theme.colors.surface,
                        borderRadius: "16px",
                        padding: "40px 32px",
                        border: `1px solid ${theme.colors.border}`,
                        marginBottom: "32px",
                    }}>
                        <Text style={{ color: theme.colors.accent, fontSize: "12px", letterSpacing: "2px", textTransform: "uppercase", marginBottom: "16px" }}>
                            Welcome, {sign}
                        </Text>

                        <Heading style={{
                            fontSize: "28px",
                            fontFamily: theme.fonts.heading,
                            color: theme.colors.text,
                            margin: "0 0 20px",
                        }}>
                            {userName ? `Hey ${userName},` : "Hey there,"} your cosmic journey begins today.
                        </Heading>

                        <Text style={{ fontSize: "16px", lineHeight: "1.7", color: theme.colors.textMuted }}>
                            You've unlocked your birth chart — a map of the sky at the exact moment you were born. Every planet, every house, every aspect is now at your fingertips.
                        </Text>

                        <Text style={{ fontSize: "16px", lineHeight: "1.7", color: theme.colors.textMuted, marginTop: "16px" }}>
                            Here's what's waiting for you:
                        </Text>

                        <Section style={{ marginTop: "20px", marginBottom: "28px" }}>
                            {[
                                { emoji: "🌟", title: "Daily Horoscope", desc: "Personalized to your sign, delivered each morning" },
                                { emoji: "🔮", title: "AI Oracle", desc: "Ask anything — the stars will answer" },
                                { emoji: "📊", title: "Your Birth Chart", desc: "Deep-dive into placements, houses & aspects" },
                                { emoji: "🌌", title: "Cosmic Weather", desc: "What's happening in the sky right now" },
                            ].map((item) => (
                                <Section key={item.title} style={{
                                    display: "flex",
                                    alignItems: "flex-start",
                                    gap: "16px",
                                    marginBottom: "16px",
                                }}>
                                    <Text style={{ fontSize: "24px", margin: "0", width: "40px", textAlign: "center" }}>
                                        {item.emoji}
                                    </Text>
                                    <Section>
                                        <Text style={{ fontSize: "15px", fontWeight: "600", color: theme.colors.text, margin: "0 0 2px" }}>
                                            {item.title}
                                        </Text>
                                        <Text style={{ fontSize: "14px", color: theme.colors.textMuted, margin: "0" }}>
                                            {item.desc}
                                        </Text>
                                    </Section>
                                </Section>
                            ))}
                        </Section>

                        <Button
                            href="https://stars.guide/dashboard"
                            style={{
                                backgroundColor: theme.colors.brand,
                                color: "#ffffff",
                                padding: "14px 32px",
                                borderRadius: "8px",
                                fontSize: "16px",
                                fontWeight: "600",
                                textDecoration: "none",
                                display: "inline-block",
                            }}
                        >
                            Explore Your Chart →
                        </Button>
                    </Section>

                    {/* Sign-off */}
                    <Text style={{ fontSize: "14px", color: theme.colors.textMuted, textAlign: "center", lineHeight: "1.6" }}>
                        The stars have spoken. Welcome to stars.guide, {sign}.
                    </Text>

                    {/* Footer */}
                    <Section style={{ textAlign: "center", marginTop: "48px", paddingTop: "24px", borderTop: `1px solid ${theme.colors.border}` }}>
                        <Text style={{ fontSize: "12px", color: theme.colors.textFaint }}>
                            You're receiving this because you signed up for stars.guide.
                            <br />
                            <Link
                                href="https://stars.guide/settings/emails"
                                style={{ color: theme.colors.textMuted, textDecoration: "underline" }}
                            >
                                Manage email preferences
                            </Link>
                            {" · "}
                            <Link
                                href="https://stars.guide/unsubscribe?email={{email}}"
                                style={{ color: theme.colors.textMuted, textDecoration: "underline" }}
                            >
                                Unsubscribe
                            </Link>
                        </Text>
                    </Section>
                </Container>
            </Body>
        </Html>
    );
}