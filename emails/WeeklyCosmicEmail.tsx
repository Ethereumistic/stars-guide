/**
 * WeeklyCosmicEmail.tsx — Saturday digest of planetary transits and cosmic weather.
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

interface Transit {
    planet: string;
    sign: string;
    aspect?: string;
    description: string;
}

interface WeeklyCosmicEmailProps {
    weekOf: string;
    highlights: Transit[];
    overallTheme: string;
    recommendedFocus: string;
}

export function WeeklyCosmicEmail({
    weekOf,
    highlights,
    overallTheme,
    recommendedFocus,
}: WeeklyCosmicEmailProps) {
    return (
        <Html>
            <Head />
            <Body style={baseStyles}>
                <Container style={{ maxWidth: "600px", margin: "0 auto", padding: "40px 20px" }}>

                    {/* Header */}
                    <Section style={{ textAlign: "center", marginBottom: "36px" }}>
                        <Text style={{ fontSize: "48px", margin: "0 0 12px" }}>🌌</Text>
                        <Heading style={{
                            fontSize: "32px",
                            fontFamily: theme.fonts.heading,
                            color: theme.colors.text,
                            margin: "0 0 8px",
                        }}>
                            Cosmic Weather
                        </Heading>
                        <Text style={{ color: theme.colors.textMuted, fontSize: "16px", margin: "0" }}>
                            Week of {weekOf}
                        </Text>
                    </Section>

                    {/* Theme card */}
                    <Section style={{
                        backgroundColor: theme.colors.surface,
                        borderRadius: "16px",
                        padding: "32px",
                        border: `1px solid ${theme.colors.border}`,
                        marginBottom: "24px",
                    }}>
                        <Text style={{ color: theme.colors.accent, fontSize: "11px", letterSpacing: "2px", textTransform: "uppercase", marginBottom: "16px" }}>
                            This Week's Vibe
                        </Text>
                        <Text style={{ fontSize: "18px", lineHeight: "1.7", fontStyle: "italic", color: theme.colors.text }}>
                            {overallTheme}
                        </Text>
                    </Section>

                    {/* Key transits */}
                    <Section style={{
                        backgroundColor: theme.colors.surface,
                        borderRadius: "16px",
                        padding: "32px",
                        border: `1px solid ${theme.colors.border}`,
                        marginBottom: "24px",
                    }}>
                        <Text style={{ color: theme.colors.brand, fontSize: "11px", letterSpacing: "2px", textTransform: "uppercase", marginBottom: "20px" }}>
                            Key Transits
                        </Text>

                        {highlights.map((transit, i) => (
                            <Section key={i} style={{
                                marginBottom: i < highlights.length - 1 ? "20px" : 0,
                                paddingBottom: i < highlights.length - 1 ? "20px" : 0,
                                borderBottom: i < highlights.length - 1 ? `1px solid ${theme.colors.border}` : "none",
                            }}>
                                <Text style={{ fontSize: "13px", fontWeight: "700", color: theme.colors.accent, margin: "0 0 6px" }}>
                                    {transit.planet}{transit.sign ? ` in ${transit.sign}` : ""}{transit.aspect ? ` ${transit.aspect}` : ""}
                                </Text>
                                <Text style={{ fontSize: "15px", lineHeight: "1.6", color: theme.colors.textMuted, margin: "0" }}>
                                    {transit.description}
                                </Text>
                            </Section>
                        ))}
                    </Section>

                    {/* Recommended focus */}
                    <Section style={{
                        backgroundColor: theme.colors.brandDark,
                        borderRadius: "16px",
                        padding: "28px 32px",
                        marginBottom: "28px",
                        border: `1px solid ${theme.colors.brand}`,
                    }}>
                        <Text style={{ fontSize: "11px", letterSpacing: "2px", textTransform: "uppercase", color: theme.colors.textMuted, marginBottom: "12px" }}>
                            Recommended Focus
                        </Text>
                        <Text style={{ fontSize: "16px", lineHeight: "1.7", color: theme.colors.text, margin: "0" }}>
                            {recommendedFocus}
                        </Text>
                    </Section>

                    {/* CTA */}
                    <Section style={{ textAlign: "center" }}>
                        <Button
                            href="https://stars.guide/cosmic-weather"
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
                            Explore Full Cosmic Weather →
                        </Button>
                    </Section>

                    {/* Footer */}
                    <Section style={{ textAlign: "center", marginTop: "48px", paddingTop: "24px", borderTop: `1px solid ${theme.colors.border}` }}>
                        <Text style={{ fontSize: "12px", color: theme.colors.textFaint }}>
                            <Link href="https://stars.guide/settings/emails" style={{ color: theme.colors.textMuted, textDecoration: "underline" }}>
                                Manage email preferences
                            </Link>
                            {" · "}
                            <Link href="https://stars.guide/unsubscribe?email={{email}}" style={{ color: theme.colors.textMuted, textDecoration: "underline" }}>
                                Unsubscribe
                            </Link>
                        </Text>
                    </Section>
                </Container>
            </Body>
        </Html>
    );
}