/**
 * ReengagementEmail.tsx — "We miss you" email for dormant users.
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
} from "@react-email/components";
import { theme } from "./theme";

interface ReengagementEmailProps {
    sign: string;
    daysAway: number;
}

export function ReengagementEmail({ sign, daysAway }: ReengagementEmailProps) {
    return (
        <Html>
            <Head />
            <Body style={theme.baseStyles}>
                <Container style={{ maxWidth: "600px", margin: "0 auto", padding: "40px 20px" }}>

                    {/* Header */}
                    <Section style={{ textAlign: "center", marginBottom: "36px" }}>
                        <Text style={{ fontSize: "48px", margin: "0 0 16px" }}>✨</Text>
                        <Heading style={{
                            fontSize: "32px",
                            fontFamily: theme.fonts.heading,
                            color: theme.colors.text,
                            margin: "0 0 8px",
                        }}>
                            The stars are calling you back
                        </Heading>
                        <Text style={{ color: theme.colors.textMuted, fontSize: "16px" }}>
                            {daysAway} days away — but the cosmos never forgets
                        </Text>
                    </Section>

                    {/* Main message */}
                    <Section style={{
                        backgroundColor: theme.colors.surface,
                        borderRadius: "16px",
                        padding: "40px 32px",
                        border: `1px solid ${theme.colors.border}`,
                        marginBottom: "28px",
                    }}>
                        <Text style={{ fontSize: "16px", lineHeight: "1.7", color: theme.colors.textMuted }}>
                            It's been {daysAway} days since you last visited stars.guide. Maybe life got busy — we get it. But the stars have been moving, and there's a whole week of cosmic energy with your name on it.
                        </Text>

                        <Text style={{ fontSize: "16px", lineHeight: "1.7", color: theme.colors.textMuted, marginTop: "16px" }}>
                            As a <strong style={{ color: theme.colors.accent }}>{sign}</strong>, this week's transits are especially meaningful for you.
                        </Text>

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
                                marginTop: "24px",
                            }}
                        >
                            See what's new for {sign} →
                        </Button>
                    </Section>

                    {/* Cosmic reminder */}
                    <Section style={{
                        backgroundColor: theme.colors.brandDark,
                        borderRadius: "12px",
                        padding: "24px 28px",
                        border: `1px solid ${theme.colors.brand}`,
                        marginBottom: "28px",
                    }}>
                        <Text style={{ fontSize: "14px", lineHeight: "1.6", color: theme.colors.text, fontStyle: "italic", margin: "0" }}>
                            "The cosmos doesn't wait — but it does forgive. Your stars are exactly where you left them."
                        </Text>
                    </Section>

                    {/* No pressure footer */}
                    <Text style={{ fontSize: "14px", color: theme.colors.textFaint, textAlign: "center", lineHeight: "1.6" }}>
                        If you'd rather not hear from us, we understand.
                        {" "}
                        <Link href="https://stars.guide/unsubscribe?email={{email}}" style={{ color: theme.colors.textMuted, textDecoration: "underline" }}>
                            Unsubscribe
                        </Link>
                        {" · "}
                        <Link href="https://stars.guide/settings/emails" style={{ color: theme.colors.textMuted, textDecoration: "underline" }}>
                            Change frequency
                        </Link>
                    </Text>
                </Container>
            </Body>
        </Html>
    );
}