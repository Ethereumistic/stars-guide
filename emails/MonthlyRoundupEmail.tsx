/**
 * MonthlyRoundupEmail.tsx — End-of-month highlight recap.
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
import { theme, baseStyles } from "./theme";

interface MonthlyRoundupEmailProps {
    month: string;
    year: number;
    sign: string;
    highlights: string[];
    nextMonthPreview: string;
    unsubToken?: string;
}

export function MonthlyRoundupEmail({
    month,
    year,
    sign,
    highlights,
    nextMonthPreview,
    unsubToken,
}: MonthlyRoundupEmailProps) {
    return (
        <Html>
            <Head />
            <Body style={baseStyles}>
                <Container style={{ maxWidth: "600px", margin: "0 auto", padding: "40px 20px" }}>

                    {/* Header */}
                    <Section style={{ textAlign: "center", marginBottom: "36px" }}>
                        <Text style={{ fontSize: "48px", margin: "0 0 12px" }}>🌕</Text>
                        <Heading style={{
                            fontSize: "32px",
                            fontFamily: theme.fonts.heading,
                            color: theme.colors.text,
                            margin: "0 0 4px",
                        }}>
                            {month} {year} Roundup
                        </Heading>
                        <Text style={{ color: theme.colors.accent, fontSize: "18px" }}>
                            {sign}
                        </Text>
                    </Section>

                    {/* Intro */}
                    <Section style={{
                        backgroundColor: theme.colors.surface,
                        borderRadius: "16px",
                        padding: "32px",
                        border: `1px solid ${theme.colors.border}`,
                        marginBottom: "24px",
                    }}>
                        <Text style={{ fontSize: "16px", lineHeight: "1.7", color: theme.colors.textMuted }}>
                            Here's what moved for you this month:
                        </Text>
                    </Section>

                    {/* Highlights */}
                    <Section style={{
                        backgroundColor: theme.colors.surface,
                        borderRadius: "16px",
                        padding: "32px",
                        border: `1px solid ${theme.colors.border}`,
                        marginBottom: "24px",
                    }}>
                        <Text style={{ color: theme.colors.brand, fontSize: "11px", letterSpacing: "2px", textTransform: "uppercase", marginBottom: "20px" }}>
                            Your Top Moments
                        </Text>

                        {highlights.map((item, i) => (
                            <Section key={i} style={{
                                display: "flex",
                                gap: "16px",
                                marginBottom: i < highlights.length - 1 ? "20px" : 0,
                                paddingBottom: i < highlights.length - 1 ? "20px" : 0,
                                borderBottom: i < highlights.length - 1 ? `1px solid ${theme.colors.border}` : "none",
                            }}>
                                <Text style={{ fontSize: "20px", margin: "0", flexShrink: 0 }}>✨</Text>
                                <Text style={{ fontSize: "15px", lineHeight: "1.6", color: theme.colors.textMuted, margin: "0" }}>
                                    {item}
                                </Text>
                            </Section>
                        ))}
                    </Section>

                    {/* Next month preview */}
                    <Section style={{
                        backgroundColor: theme.colors.brandDark,
                        borderRadius: "16px",
                        padding: "28px 32px",
                        border: `1px solid ${theme.colors.brand}`,
                        marginBottom: "28px",
                    }}>
                        <Text style={{ fontSize: "11px", letterSpacing: "2px", textTransform: "uppercase", color: theme.colors.accent, marginBottom: "12px" }}>
                            Coming Next Month
                        </Text>
                        <Text style={{ fontSize: "16px", lineHeight: "1.7", color: theme.colors.text, margin: "0" }}>
                            {nextMonthPreview}
                        </Text>
                    </Section>

                    {/* CTA */}
                    <Section style={{ textAlign: "center" }}>
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
                            See your full birth chart →
                        </Button>
                    </Section>

                    {/* Footer */}
                    <Section style={{ textAlign: "center", marginTop: "48px", paddingTop: "24px", borderTop: `1px solid ${theme.colors.border}` }}>
                        <Text style={{ fontSize: "12px", color: theme.colors.textFaint }}>
                            <Link href="https://stars.guide/settings/emails" style={{ color: theme.colors.textMuted, textDecoration: "underline" }}>
                                Manage email preferences
                            </Link>
                            {" · "}
                            <Link href={unsubToken ? `https://stars.guide/unsubscribe?token=${unsubToken}` : "https://stars.guide/settings/emails"} style={{ color: theme.colors.textMuted, textDecoration: "underline" }}>
                                Unsubscribe
                            </Link>
                        </Text>
                    </Section>
                </Container>
            </Body>
        </Html>
    );
}