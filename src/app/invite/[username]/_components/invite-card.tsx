"use client";

import { useCallback, useEffect, useState, useMemo } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import { QRCodeSVG } from "qrcode.react";
import { TbX, TbCopy, TbCheck, TbShare } from "react-icons/tb";
import { FaInstagram, FaFacebookF, FaRedditAlien, FaDiscord, FaTiktok, FaWhatsapp } from "react-icons/fa";
import { FaXTwitter, FaVk } from "react-icons/fa6";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";
import { ArtNouveauBorder } from "@/components/ui/art-nouveau-border";
import { compositionalSigns } from "@/astrology/signs";
import { zodiacUIConfig } from "@/config/zodiac-ui";
import { planetUIConfig } from "@/config/planet-ui";
import { elementUIConfig } from "@/config/elements-ui";
import { Doc } from "../../../../../convex/_generated/dataModel";

interface InviteCardProps {
    user: Doc<"users">;
    inviteUrl: string;
}

const BIG_THREE = [
    { body: "Sun", key: "sun", label: "Sun" },
    { body: "Moon", key: "moon", label: "Moon" },
    { body: "Ascendant", key: "rising", label: "Asc" },
] as const;

function getSignForBody(
    birthData: Doc<"users">["birthData"],
    body: string,
) {
    const legacy = birthData?.placements?.find(
        (p: { body: string; sign: string; house: number }) => p.body === body,
    );
    if (legacy) return legacy.sign;

    if (body === "Ascendant" && birthData?.chart?.ascendant) {
        return compositionalSigns.find(
            (s) => s.id === birthData.chart!.ascendant!.signId,
        )?.name;
    }

    const id = body.toLowerCase().replace(/ /g, "_");
    const planet = birthData?.chart?.planets?.find(
        (p: {
            id: string;
            signId: string;
            houseId: number;
            longitude: number;
            retrograde: boolean;
            dignity: string | null;
        }) => p.id === id,
    );
    if (planet) {
        return compositionalSigns.find((s) => s.id === planet.signId)?.name;
    }

    return null;
}

// Social share platforms
const SOCIAL_PLATFORMS = [
    {
        id: "instagram",
        Icon: FaInstagram,
        label: "Share to Instagram",
        getUrl: () => "https://www.instagram.com/",
        className: "bg-gradient-to-tr from-yellow-400 via-orange-500 via-red-500 via-pink-500 to-purple-600",
        iconClassName: "text-white size-8",
    },
    {
        id: "facebook",
        Icon: FaFacebookF,
        label: "Share to Facebook",
        getUrl: (url: string) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
        className: "bg-[#1877F2]",
        iconClassName: "text-white size-6",
    },
    {
        id: "x",
        Icon: FaXTwitter,
        label: "Share to X",
        getUrl: (url: string) => `https://x.com/intent/post?url=${encodeURIComponent(url)}&text=${encodeURIComponent(`Join me on stars.guide ✨ ${url}`)}`,
        className: "bg-black",
        iconClassName: "text-white size-6",
    },
    {
        id: "reddit",
        Icon: FaRedditAlien,
        label: "Share to Reddit",
        getUrl: (url: string) => `https://www.reddit.com/submit?url=${encodeURIComponent(url)}&title=${encodeURIComponent(`Join me on stars.guide ✨`)}`,
        className: "bg-[#FF4500]",
        iconClassName: "text-white size-6",
    },
    {
        id: "whatsapp",
        Icon: FaWhatsapp,
        label: "Share to WhatsApp",
        getUrl: (url: string) => `https://wa.me/?text=${encodeURIComponent(`Join me on stars.guide and discover your cosmic blueprint! ✨ ${url}`)}`,
        className: "bg-[#25D366]",
        iconClassName: "text-white size-6",
    },
    {
        id: "discord",
        Icon: FaDiscord,
        label: "Share to Discord",
        getUrl: () => "https://discord.com/channels/@me",
        className: "bg-[#5865F2]",
        iconClassName: "text-white size-6",
    },
    {
        id: "tiktok",
        Icon: FaTiktok,
        label: "Share to TikTok",
        getUrl: () => "https://www.tiktok.com/",
        className: "bg-black",
        iconClassName: "text-white size-6",
    },
    {
        id: "vk",
        Icon: FaVk,
        label: "Share to VK",
        getUrl: (url: string) => `https://vk.com/share.php?url=${encodeURIComponent(url)}`,
        className: "bg-[#0077FF]",
        iconClassName: "text-white size-6",
    },
] as const;

export function InviteCard({ user, inviteUrl }: InviteCardProps) {
    const router = useRouter();
    const [copied, setCopied] = useState(false);
    const [themeColor, setThemeColor] = useState("#D4AF37");

    const birthData = user.birthData;

    // Sun sign for theme
    const sunSignName = birthData ? getSignForBody(birthData, "Sun") : null;
    const sunSign = compositionalSigns.find((s) => s.name === sunSignName);
    const sunElementUI = sunSign ? elementUIConfig[sunSign.element] : undefined;
    const sunSignUI = sunSign ? zodiacUIConfig[sunSign.id] : undefined;
    const ElementIcon = sunElementUI?.icon;
    const SunSignIcon = sunSignUI?.icon;
    const elementStyles = sunElementUI?.styles;

    // Ruling planet of the sun sign
    const rulerPlanetId = sunSign?.ruler || "sun";
    const rulerPlanetUI = planetUIConfig[rulerPlanetId];

    // Resolve CSS var for theme color
    useEffect(() => {
        if (sunElementUI?.styles.glow) {
            const varMatch = sunElementUI.styles.glow.match(
                /var\((--[^)]+)\)/,
            );
            if (varMatch) {
                const resolved = getComputedStyle(
                    document.documentElement,
                )
                    .getPropertyValue(varMatch[1])
                    .trim();
                if (resolved) setThemeColor(resolved);
            }
        }
    }, [sunElementUI?.styles.glow]);

    // Big Three placements
    const placements = useMemo(() => {
        return BIG_THREE.map(({ body, key, label }) => {
            const signName = birthData
                ? getSignForBody(birthData, body)
                : null;
            if (!signName) return null;

            const sign = compositionalSigns.find(
                (s) => s.name === signName,
            );
            if (!sign) return null;

            const signUi = zodiacUIConfig[sign.id];
            const elementUi = elementUIConfig[sign.element];
            const planetUi = planetUIConfig[key];
            const Icon = signUi?.icon;

            return { body, label, sign, signUi, elementUi, planetUi, Icon };
        }).filter(Boolean);
    }, [birthData]);

    const handleCopy = useCallback(() => {
        navigator.clipboard.writeText(inviteUrl).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    }, [inviteUrl]);

    const handleShare = useCallback(() => {
        if (navigator.share) {
            navigator.share({
                title: `${user.username}'s Stars Guide`,
                text: `Join me on stars.guide and discover your cosmic blueprint! ✨`,
                url: inviteUrl,
            });
        } else {
            handleCopy();
        }
    }, [inviteUrl, user.username, handleCopy]);

    return (
        /* Outer: full-height scrollable column, centred, safe padding for notch/status bar */
        <div className="w-full max-w-[420px] flex flex-col items-stretch">

            {/* Header: centered logo + close button */}
            <div className="fixed top-5 left-5 right-5 z-50 flex items-center justify-between pointer-events-none">
                {/* Spacer to center the logo */}
                <div className="w-10" />

                <Link href="/" className="pointer-events-auto">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.6, duration: 0.3 }}
                    >
                        <Logo size="sm" />
                    </motion.div>
                </Link>

                <motion.button
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.6, duration: 0.3 }}
                    onClick={() => router.push("/dashboard")}
                    className="pointer-events-auto w-10 h-10 flex items-center justify-center rounded-full bg-white/5 backdrop-blur-md border border-white/10 text-white/60 hover:text-white hover:bg-white/10 transition-all duration-200"
                    aria-label="Close"
                >
                    <TbX className="w-5 h-5" />
                </motion.button>
            </div>

            {/* ═══════════════════════════════════════════ */}
            {/* ═══ THE INVITE CARD ════════════════════════ */}
            {/* ═══════════════════════════════════════════ */}
            <ArtNouveauBorder variant="primary">
                <motion.div
                    initial={{ opacity: 0, y: 30, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                    className="relative rounded-3xl overflow-hidden border border-transparent flex flex-col"
                >
                    {/* ── Background layers ── */}
                    <div
                        className="absolute inset-0 backdrop-blur-[0.5px] rounded-3xl"
                        style={{
                            background: `linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.01) 100%)`,
                        }}
                    />
                    {elementStyles && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 0.2 }}
                            transition={{ duration: 1.2, delay: 0.5 }}
                            className="absolute inset-0"
                            style={{ background: elementStyles.gradient }}
                        />
                    )}
                    {elementStyles && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 0.3 }}
                            transition={{ duration: 1.2, delay: 0.5 }}
                            className="absolute top-1/2 right-0 -translate-y-1/2 w-40 h-40 rounded-full blur-2xl"
                            style={{ backgroundColor: elementStyles.glow }}
                        />
                    )}
                    {/* Subtle outer glow */}
                    <div
                        className="absolute inset-0 rounded-3xl pointer-events-none"
                        style={{
                            boxShadow: `0 0 40px ${themeColor}06, 0 20px 60px -20px rgba(0,0,0,0.4)`,
                        }}
                    />

                    {/* ── Content ── */}
                    <div className="relative z-10 flex flex-col">

                        {/* ═══════════════════════════════════ */}
                        {/* ═══ UPPER — Sign header ════════════ */}
                        {/* ═══════════════════════════════════ */}
                        <div className="relative overflow-hidden px-4 pt-5 pb-4 sm:px-5 sm:pt-6">
                            {/* Constellation watermark — bigger, centred, overflows section height */}
                            {sunSignUI?.constellationUrl && elementStyles && (
                                <div className="absolute inset-0 pointer-events-none overflow-visible">
                                    <motion.img
                                        src={sunSignUI.constellationUrl}
                                        alt=""
                                        initial={{ opacity: 0.08, right: "-20%", x: "0%" }}
                                        animate={{ opacity: 0.45, right: "46%", x: "50%" }}
                                        transition={{ duration: 1.4, delay: 0.6, ease: "easeOut" }}
                                        className="absolute top-1/2 -translate-y-1/2 object-contain"
                                        style={{
                                            height: "160%",
                                            filter: `drop-shadow(0 0 14px ${themeColor}) drop-shadow(0 0 28px ${themeColor}60)`,
                                        }}
                                        draggable={false}
                                    />
                                </div>
                            )}

                            <div className="relative z-10 flex items-center gap-3">
                                {/* Left: Text & Details */}
                                <div className="flex flex-col justify-center space-y-1 flex-1 min-w-0">
                                    {/* Element icon + dates */}
                                    <div className="flex items-center gap-1.5">
                                        {ElementIcon && elementStyles && (
                                            <ElementIcon
                                                className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0"
                                                style={{ color: elementStyles.primary }}
                                            />
                                        )}
                                        <motion.span
                                            initial={{ opacity: 0.6 }}
                                            animate={{ opacity: 0.8 }}
                                            transition={{ delay: 0.8, duration: 0.5 }}
                                            className="text-[8px] sm:text-[9px] font-sans uppercase tracking-[0.2em] truncate"
                                            style={{ color: elementStyles?.secondary }}
                                        >
                                            {sunSign?.dates}
                                        </motion.span>
                                    </div>

                                    {/* Sign name */}
                                    <motion.h2
                                        initial={{ color: elementStyles?.secondary }}
                                        animate={{ color: "#ffffff" }}
                                        transition={{ delay: 0.6, duration: 0.8 }}
                                        className="text-2xl sm:text-3xl font-serif tracking-wide leading-tight"
                                        style={{
                                            textShadow: `0 0 5px ${elementStyles?.glow}`,
                                        }}
                                    >
                                        {sunSign?.name}
                                    </motion.h2>

                                    {/* Archetype */}
                                    <motion.p
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ delay: 0.9, duration: 0.6 }}
                                        className="text-[9px] sm:text-xs font-sans text-amber-100/60 uppercase tracking-widest truncate"
                                    >
                                        {sunSign?.archetypeName}
                                    </motion.p>
                                </div>

                                {/* Right: Sign icon inside elemental frame — pulled a bit left via mr-2 */}
                                {SunSignIcon && elementStyles && sunElementUI?.frameUrl && (
                                    <motion.div
                                        initial={{ scale: 1, opacity: 0 }}
                                        animate={{ scale: 1.08, rotate: 1, opacity: 1 }}
                                        transition={{ delay: 0.5, duration: 0.8, ease: "easeOut" }}
                                        className="relative flex items-center justify-center w-[72px] h-[72px] sm:w-20 sm:h-20 shrink-0 mr-2"
                                    >
                                        {/* Elemental frame PNG */}
                                        <img
                                            src={sunElementUI.frameUrl}
                                            alt=""
                                            draggable={false}
                                            className="absolute inset-0 w-full h-full object-contain pointer-events-none select-none"
                                            style={{
                                                filter: `drop-shadow(0 0 6px ${elementStyles.glow}) drop-shadow(0 0 14px ${elementStyles.glow})`,
                                                opacity: 0.9,
                                            }}
                                        />
                                        {/* Sign icon centred inside frame */}
                                        <motion.div
                                            initial={{ color: "#fef3c7" }}
                                            animate={{ color: "#ffffff" }}
                                            transition={{ delay: 0.5, duration: 0.8 }}
                                            className="relative z-10"
                                        >
                                            <SunSignIcon
                                                className="w-8 h-8 sm:w-10 sm:h-10"
                                                style={{
                                                    filter: `drop-shadow(0 0 8px ${elementStyles.glow})`,
                                                }}
                                            />
                                        </motion.div>
                                    </motion.div>
                                )}
                            </div>
                        </div>

                        {/* Separator */}
                        <div
                            className="mx-6 h-px shrink-0"
                            style={{
                                background: `linear-gradient(to right, transparent, ${themeColor}18, transparent)`,
                            }}
                        />

                        {/* ═══════════════════════════════════════════ */}
                        {/* ═══ MIDDLE — Username + QR + Motto ══════════ */}
                        {/* ═══════════════════════════════════════════ */}
                        <div className="flex flex-col items-center gap-3 px-5 py-4 sm:py-5">

                            {/* Username */}
                            <motion.p
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.45, duration: 0.4 }}
                                className="relative z-10 text-lg sm:text-xl font-serif tracking-tight text-white"
                                style={{ textShadow: `0 0 16px rgba(255,255,255,0.1)` }}
                            >
                                {user.username}
                            </motion.p>

                            {/* QR Code + element glow — glow is a sibling inside this relative wrapper so it's always perfectly centred on the QR */}
                            <motion.div
                                initial={{ opacity: 0, scale: 0.85 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 0.35, duration: 0.5 }}
                                className="relative shrink-0 flex items-center justify-center"
                            >
                                {/* Element glow — absolutely centred on the QR */}
                                {elementStyles && (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.6 }}
                                        animate={{ opacity: 0.28, scale: 1 }}
                                        transition={{ duration: 1.6, delay: 0.4, ease: "easeOut" }}
                                        aria-hidden
                                        className="absolute pointer-events-none"
                                        style={{
                                            width: "280px",
                                            height: "280px",
                                            top: "50%",
                                            left: "50%",
                                            transform: "translate(-50%, -50%)",
                                            borderRadius: "50%",
                                            background: `radial-gradient(circle, ${elementStyles.glow} 0%, ${elementStyles.glow} 25%, transparent 70%)`,
                                            filter: "blur(36px)",
                                        }}
                                    />
                                )}

                                <QRCodeSVG
                                    value={inviteUrl}
                                    size={180}
                                    bgColor="transparent"
                                    fgColor="#FFFFFF"
                                    level="M"
                                    includeMargin={false}
                                    style={{
                                        display: "block",
                                        position: "relative",
                                        zIndex: 10,
                                        filter: "drop-shadow(0 0 12px rgba(255,255,255,0.08))",
                                    }}
                                />
                            </motion.div>

                            {/* Sign motto */}
                            {sunSign && (
                                <motion.p
                                    initial={{ opacity: 0, y: 6 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.7, duration: 0.5 }}
                                    className="relative z-10 text-center text-sm sm:text-base text-white/75 font-serif italic leading-snug px-2 max-w-[85%]"
                                >
                                    &ldquo;{sunSign.motto}&rdquo;
                                </motion.p>
                            )}
                        </div>

                        {/* Separator */}
                        <div
                            className="mx-6 h-px shrink-0"
                            style={{
                                background: `linear-gradient(to right, transparent, ${themeColor}18, transparent)`,
                            }}
                        />

                        {/* ═══════════════════════════════════════════ */}
                        {/* ═══ LOWER — URL + Share buttons ══════════ */}
                        {/* ═══════════════════════════════════════════ */}
                        <div className="flex flex-col items-center gap-3 px-4 pt-4 pb-5 sm:px-5 sm:pb-6">

                            {/* URL copy input */}
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.55, duration: 0.4 }}
                                className="relative w-full"
                            >
                                <input
                                    readOnly
                                    value={inviteUrl}
                                    className="w-full h-9 rounded-xl bg-white/[0.04] backdrop-blur-md border border-white/[0.08] pl-3 pr-10 text-[10px] font-mono text-white/50 focus:outline-none focus:border-white/15 select-all"
                                    onClick={(e) =>
                                        (e.target as HTMLInputElement).select()
                                    }
                                />
                                <button
                                    onClick={handleCopy}
                                    className="absolute right-1 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-all duration-200"
                                    aria-label="Copy invite link"
                                >
                                    <AnimatePresence mode="wait">
                                        {copied ? (
                                            <motion.div
                                                key="check"
                                                initial={{ scale: 0.5, opacity: 0 }}
                                                animate={{ scale: 1, opacity: 1 }}
                                                exit={{ scale: 0.5, opacity: 0 }}
                                            >
                                                <TbCheck
                                                    className="w-3.5 h-3.5"
                                                    style={{ color: themeColor }}
                                                />
                                            </motion.div>
                                        ) : (
                                            <motion.div
                                                key="copy"
                                                initial={{ scale: 0.5, opacity: 0 }}
                                                animate={{ scale: 1, opacity: 1 }}
                                                exit={{ scale: 0.5, opacity: 0 }}
                                            >
                                                <TbCopy className="w-3.5 h-3.5" />
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </button>
                            </motion.div>

                            {/* Social share icons — 2 rows of 4, equal sizing, always fits */}
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.65, duration: 0.4 }}
                                className="w-full"
                            >
                                <div className="grid grid-cols-8 gap-2">
                                    {SOCIAL_PLATFORMS.map(({ id, Icon, label, getUrl, className, iconClassName }) => (
                                        <button
                                            key={id}
                                            onClick={() => window.open(getUrl(inviteUrl), "_blank")}
                                            aria-label={label}
                                            className={`flex items-center justify-center w-10 h-10 rounded-xl ${className} transition-all duration-200 hover:brightness-110 active:scale-95`}
                                        >
                                            <Icon
                                                className={` transition-colors duration-200 ${iconClassName}`}
                                            />
                                        </button>
                                    ))}
                                </div>
                            </motion.div>

                            {/* Native share button (full width) */}
                            <motion.button
                                initial={{ opacity: 0, y: 6 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.75, duration: 0.4 }}
                                onClick={handleShare}
                                className="w-full h-9 flex items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.08] text-white/50 hover:text-white text-xs font-sans tracking-wider uppercase transition-all duration-200 active:scale-[0.98]"
                                aria-label="More share options"
                            >
                                <TbShare className="w-3.5 h-3.5" />
                                Share
                            </motion.button>
                        </div>
                    </div>
                </motion.div>
            </ArtNouveauBorder>
        </div>
    );
}
