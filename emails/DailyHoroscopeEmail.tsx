/**
 * DailyHoroscopeEmail.tsx — Morning horoscope for a specific zodiac sign.
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

interface DailyHoroscopeEmailProps {
    sign: string;
    horoscope: string;
    mood: string;
    luckyNumber: number;
    element: string;
    date: string;
}

export function DailyHoroscopeEmail({
    sign,
    horoscope,
    mood,
    luckyNumber,
    element,
    date,
}: DailyHoroscopeEmailProps) {
    const formattedDate = new Date(date).toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
    });

    return (
        <Html>
            <Head />
            <Body style={theme.baseStyles}>
                <Container style={{ maxWidth: "600px", margin: "0 auto", padding: "40px 20px" }}>

                    {/* Header */}
                    <Section style={{ textAlign: "center", marginBottom: "32px" }}>
                        <Text style={{ color: theme.colors.textMuted, fontSize: "11px", letterSpacing: "2px", textTransform: "uppercase", marginBottom: "8px" }}>
                            Daily Horoscope
                        </Text>
                        <Heading style={{
                            fontSize: "44px",
                            fontFamily: theme.fonts.heading,
                            color: theme.colors.text,
                            margin: "0 0 4px",
                        }}>
                            {sign}
                        </Heading>
                        <Text style={{ color: theme.colors.accent, fontSize: "16px", margin: "0" }}>
                            {formattedDate}
                        </Text>
                    </Section>

                    {/* Horoscope card */}
                    <Section style={{
                        backgroundColor: theme.colors.surface,
                        borderRadius: "16px",
                        padding: "32px",
                        border: `1px solid ${theme.colors.border}`,
                        marginBottom: "24px",
                    }}>
                        <Text style={{ color: theme.colors.brand, fontSize: "11px", letterSpacing: "2px", textTransform: "uppercase", marginBottom: "16px" }}>
                            The Stars Say
                        </Text>
                        <Text style={{
                            fontSize: "19px",
                            lineHeight: "1.75",
                            fontStyle: "italic",
                            color: theme.colors.text,
                        }}>
                            "{horoscope}"
                        </Text>
                    </Section>

                    {/* Quick stats row */}
                    <Section style={{
                        display: "flex",
                        gap: "12px",
                        marginBottom: "28px",
                    }}>
                        {[
                            { label: "Mood", value: mood },
                            { label: "Lucky #", value: luckyNumber.toString() },
                            { label: "Element", value: element },
                        ].map((stat) => (
                            <Section key={stat.label} style={{
                                flex: 1,
                                backgroundColor: theme.colors.surface,
                                borderRadius: "12px",
                                padding: "20px 12px",
                                textAlign: "center",
                                border: `1px solid ${theme.colors.border}`,
                            }}>
                                <Text style={{ fontSize: "11px", color: theme.colors.textMuted, textTransform: "uppercase", letterSpacing: "1px", marginBottom: "6px" }}>
                                    {stat.label}
                                </Text>
                                <Text style={{ fontSize: "20px", fontWeight: "700", color: theme.colors.accent, margin: "0" }}>
                                    {stat.value}
                                </Text>
                            </Section>
                        ))}
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
                            Read your full birth chart →
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