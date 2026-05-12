"use client";

import { useCallback, useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { QRCodeSVG } from "qrcode.react";
import { TbX, TbCopy, TbCheck, TbShare } from "react-icons/tb";
import { FaInstagram, FaFacebookF, FaRedditAlien, FaDiscord, FaTiktok, FaWhatsapp } from "react-icons/fa";
import { FaXTwitter, FaVk } from "react-icons/fa6";
import { Button } from "@/components/ui/button";
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
        <div
            className="w-full max-w-[420px] flex flex-col gap-2"
            style={{ height: "calc(100dvh - 6rem)" }}
        >
            {/* Close button — fixed top right */}
            <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.6, duration: 0.3 }}
                onClick={() => router.push("/dashboard")}
                className="fixed top-5 right-5 z-50 w-10 h-10 flex items-center justify-center rounded-full bg-white/5 backdrop-blur-md border border-white/10 text-white/60 hover:text-white hover:bg-white/10 transition-all duration-200"
                aria-label="Close"
            >
                <TbX className="w-5 h-5" />
            </motion.button>

            {/* ═══════════════════════════════════════════ */}
            {/* ═══ THE INVITE CARD ════════════════════════ */}
            {/* ═══════════════════════════════════════════ */}
            <motion.div
                initial={{ opacity: 0, y: 30, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                className="relative flex-1 min-h-0 rounded-3xl overflow-hidden border border-border/30"
            >
                {/* ── Background: glass morphism (matches compact-sign-card exactly) ── */}
                {/* Transparent glass gradient — no opaque dark fill, lets starfield through */}
                <div
                    className="absolute inset-0 backdrop-blur-[0.5px] rounded-3xl"
                    style={{
                        background: `linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.01) 100%)`,
                    }}
                />
                {/* Element gradient overlay — whole card (matches compact-sign-card hover state) */}
                {elementStyles && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 0.2 }}
                        transition={{ duration: 1.2, delay: 0.5 }}
                        className="absolute inset-0"
                        style={{ background: elementStyles.gradient }}
                    />
                )}
                {/* Radial glow — whole card (matches compact-sign-card hover) */}
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
                {/* Top accent line */}
                <div
                    className="absolute top-0 left-[15%] right-[15%] h-px z-20"
                    style={{
                        background: `linear-gradient(to right, transparent, ${themeColor}40, transparent)`,
                    }}
                />
                {/* Bottom accent line */}
                <div
                    className="absolute bottom-0 left-[15%] right-[15%] h-px z-20"
                    style={{
                        background: `linear-gradient(to right, transparent, ${themeColor}20, transparent)`,
                    }}
                />

                {/* ── Content: 3 equal thirds ────────── */}
                <div className="relative z-10 h-full grid grid-rows-[1fr_auto_1fr_auto_1fr]">

                    {/* ═══════════════════════════════════ */}
                    {/* ═══ UPPER THIRD ════════════════════ */}
                    {/* ═══ (Compact-sign-card layout, animates from unhovered → hovered) ═══ */}
                    {/* ═══════════════════════════════════ */}
                    <div className="relative overflow-hidden">
                        {/* Constellation watermark — animates from hidden right to center (matches compact-sign-card hover) */}
                        {sunSignUI?.constellationUrl && elementStyles && (
                            <div className="absolute inset-0 pointer-events-none">
                                <motion.img
                                    src={sunSignUI.constellationUrl}
                                    alt=""
                                    initial={{ opacity: 0.1, right: "-20%", x: "0%" }}
                                    animate={{ opacity: 0.4, right: "50%", x: "50%" }}
                                    transition={{ duration: 1.4, delay: 0.6, ease: "easeOut" }}
                                    className="absolute top-1/2 -translate-y-1/2 h-full object-contain"
                                    style={{
                                        filter: `drop-shadow(0 0 10px ${themeColor})`,
                                    }}
                                    draggable={false}
                                />
                            </div>
                        )}

                        {/* ── Content: Left text + Right icon (compact-sign-card layout) ── */}
                        <div className="relative z-10 h-full flex items-center justify-between px-4 sm:px-5">
                            {/* Left: Text & Details */}
                            <div className="flex flex-col justify-center space-y-1 max-w-[60%]">
                                {/* Element icon + dates */}
                                <div className="flex items-center gap-1.5">
                                    {ElementIcon && elementStyles && (
                                        <ElementIcon
                                            className="w-3 h-3 sm:w-3.5 sm:h-3.5"
                                            style={{ color: elementStyles.primary }}
                                        />
                                    )}
                                    <motion.span
                                        initial={{ opacity: 0.6 }}
                                        animate={{ opacity: 0.8 }}
                                        transition={{ delay: 0.8, duration: 0.5 }}
                                        className="text-[8px] sm:text-[9px] font-sans uppercase tracking-[0.2em]"
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
                                    className="text-xl sm:text-2xl md:text-3xl font-serif tracking-wide leading-tight"
                                    style={{
                                        textShadow: `0 0 5px ${elementStyles?.glow}`,
                                    }}
                                >
                                    {sunSign?.name}
                                </motion.h2>

                                {/* Archetype — fades in (matches hover reveal) */}
                                <motion.p
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 0.9, duration: 0.6 }}
                                    className="text-[9px] sm:text-xs font-sans text-amber-100/60 uppercase tracking-widest truncate"
                                >
                                    {sunSign?.archetypeName}
                                </motion.p>
                            </div>

                            {/* Right: Sign icon (animates like hover: scale + slight rotate) */}
                            {SunSignIcon && elementStyles && (
                                <motion.div
                                    initial={{ scale: 1 }}
                                    animate={{ scale: 1.1, rotate: 1 }}
                                    transition={{ delay: 0.5, duration: 0.8, ease: "easeOut" }}
                                    className="relative flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 shrink-0"
                                >
                                    <motion.div
                                        initial={{ color: "#fef3c7" }}
                                        animate={{ color: "#ffffff" }}
                                        transition={{ delay: 0.5, duration: 0.8 }}
                                    >
                                        <SunSignIcon
                                            className="w-8 h-8 sm:w-12 sm:h-12"
                                            style={{
                                                filter: `drop-shadow(0 0 8px ${elementStyles.glow})`,
                                            }}
                                        />
                                    </motion.div>
                                </motion.div>
                            )}
                        </div>


                    </div>

                    {/* Separator: upper → middle */}
                    <div
                        className="mx-8 my-3 h-px shrink-0"
                        style={{
                            background: `linear-gradient(to right, transparent, ${themeColor}18, transparent)`,
                        }}
                    />

                    {/* ═══════════════════════════════════ */}
                    {/* ═══ MIDDLE THIRD — QR CODE + MOTTO ═ */}
                    {/* ═══════════════════════════════════ */}
                    <div className="flex flex-col items-center justify-center relative gap-4 sm:gap-5">
                        {/* Username — above QR */}
                        <motion.p
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.45, duration: 0.4 }}
                            className="text-base sm:text-4xl font-serif tracking-tight text-white"
                            style={{
                                textShadow: `0 0 16px rgba(255,255,255,0.1)`,
                            }}
                        >
                            {user.username}
                        </motion.p>

                        <motion.div
                            initial={{ opacity: 0, scale: 0.85 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.35, duration: 0.5 }}
                            className="aspect-square max-h-[70%] max-w-[234px] sm:max-w-[260px]"
                        >
                            <QRCodeSVG
                                value={inviteUrl}
                                size={256}
                                bgColor="transparent"
                                fgColor="#FFFFFF"
                                level="M"
                                includeMargin={false}
                                style={{
                                    width: "100%",
                                    height: "100%",
                                    filter: "drop-shadow(0 0 12px rgba(255,255,255,0.08))",
                                }}
                            />
                        </motion.div>


                        {/* Sign motto — below QR, in quotes, font-serif */}
                        {sunSign && (
                            <motion.p
                                initial={{ opacity: 0, y: 6 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.7, duration: 0.5 }}
                                className="text-center text-base sm:text-xl text-white/90 font-serif italic leading-snug px-6 max-w-[90%]"
                            >
                                &ldquo;{sunSign.motto}&rdquo;
                            </motion.p>
                        )}
                    </div>

                    {/* Separator: middle → lower */}
                    <div
                        className="mx-8 my-3 h-px shrink-0"
                        style={{
                            background: `linear-gradient(to right, transparent, ${themeColor}18, transparent)`,
                        }}
                    />

                    {/* ═══════════════════════════════════ */}
                    {/* ═══ LOWER THIRD — COPY URL + SHARE ICONS ═════ */}
                    {/* ═══════════════════════════════════ */}
                    <div className="flex flex-col items-center justify-center gap-3 px-5 py-3 relative">
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

                        {/* Social share icons row */}
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.65, duration: 0.4 }}
                            className="flex flex-row items-center justify-center gap-2"
                        >
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={() => window.open(`https://www.instagram.com/`, '_blank')}
                                className=" text-[#E4405F] hover:text-[#E4405F] hover:border-[#E4405F]/30 hover:bg-[#E4405F]/10"
                                aria-label="Share to Instagram"
                            >
                                <FaInstagram className="size-8" />
                            </Button>
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={() => window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(inviteUrl)}`, '_blank')}
                                className=" text-[#1877F2] hover:text-[#1877F2] hover:border-[#1877F2]/30 hover:bg-[#1877F2]/10"
                                aria-label="Share to Facebook"
                            >
                                <FaFacebookF className="size-6" />
                            </Button>
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={() => window.open(`https://x.com/intent/post?url=${encodeURIComponent(inviteUrl)}&text=${encodeURIComponent(`Join me on stars.guide ✨ ${inviteUrl}`)}`, '_blank')}
                                className=" text-white hover:text-white hover:border-white/20 hover:bg-white/10"
                                aria-label="Share to X"
                            >
                                <FaXTwitter className="size-6" />
                            </Button>
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={() => window.open(`https://www.reddit.com/submit?url=${encodeURIComponent(inviteUrl)}&title=${encodeURIComponent(`Join me on stars.guide ✨`)}`, '_blank')}
                                className=" text-[#FF4500] hover:text-[#FF4500] hover:border-[#FF4500]/30 hover:bg-[#FF4500]/10"
                                aria-label="Share to Reddit"
                            >
                                <FaRedditAlien className="size-7" />
                            </Button>
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={() => window.open(`https://discord.com/channels/@me`, '_blank')}
                                className=" text-[#5865F2] hover:text-[#5865F2] hover:border-[#5865F2]/30 hover:bg-[#5865F2]/10"
                                aria-label="Share to Discord"
                            >
                                <FaDiscord className="size-7" />
                            </Button>
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={() => window.open(`https://www.tiktok.com/`, '_blank')}
                                className=" text-white hover:text-white hover:border-white/20 hover:bg-white/10"
                                aria-label="Share to TikTok"
                            >
                                <FaTiktok className="size-6" />
                            </Button>
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(`Join me on stars.guide and discover your cosmic blueprint! ✨ ${inviteUrl}`)}`, '_blank')}
                                className="text-[#25D366] hover:text-[#25D366] hover:border-[#25D366]/30 hover:bg-[#25D366]/10"
                                aria-label="Share to WhatsApp"
                            >
                                <FaWhatsapp className="size-7" />
                            </Button>

                            <Button
                                variant="outline"
                                size="icon"
                                onClick={() => window.open(`https://vk.com/share.php?url=${encodeURIComponent(inviteUrl)}`, '_blank')}
                                className=" text-[#0077FF] hover:text-[#0077FF] hover:border-[#0077FF]/30 hover:bg-[#0077FF]/10"
                                aria-label="Share to VK"
                            >
                                <FaVk className="size-7" />
                            </Button>
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={() => {
                                    if (navigator.share) {
                                        navigator.share({
                                            title: `${user.username}'s Stars Guide`,
                                            text: `Join me on stars.guide and discover your cosmic blueprint! ✨`,
                                            url: inviteUrl,
                                        });
                                    }
                                }}
                                className=" text-white/50 hover:text-white hover:border-white/20 hover:bg-white/10"
                                aria-label="More share options"
                            >
                                <TbShare className="size-5" />
                            </Button>
                        </motion.div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
