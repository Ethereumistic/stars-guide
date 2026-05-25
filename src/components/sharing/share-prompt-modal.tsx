"use client";

import { useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { FaInstagram, FaWhatsapp, FaXTwitter } from "react-icons/fa6";
import { TbCopy, TbX } from "react-icons/tb";
import { openShareDialog, ShareType, SharePlatform } from "@/lib/sharing";
import { toast } from "sonner";

interface SharePromptModalProps {
  type: ShareType;
  open: boolean;
  onClose: () => void;
  sign?: string;
  date?: string;
  username?: string;
  partnerSign?: string;
}

const PLATFORM_CONFIGS: Array<{
  id: SharePlatform;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
  className: string;
}> = [
  {
    id: "instagram",
    label: "Instagram",
    Icon: FaInstagram,
    className: "bg-gradient-to-tr from-yellow-400 via-orange-500 via-red-500 via-pink-500 to-purple-600",
  },
  {
    id: "whatsapp",
    label: "WhatsApp",
    Icon: FaWhatsapp,
    className: "bg-[#25D366]",
  },
  {
    id: "twitter",
    label: "X",
    Icon: FaXTwitter,
    className: "bg-black",
  },
  {
    id: "copy",
    label: "Copy Link",
    Icon: TbCopy,
    className: "bg-white/10 border border-white/20",
  },
];

const HEADLINES: Record<ShareType, string> = {
  birth_chart: "Share Your Cosmic Blueprint",
  horoscope: "Share Today's Horoscope",
  compatibility: "Share Your Match",
  journal: "Share Your Journey",
  profile: "Share Your Profile",
};

const SUBTEXTS: Record<ShareType, string> = {
  birth_chart: "Let your friends discover what the stars have to say about them.",
  horoscope: "Spread the cosmic wisdom — someone needs to hear this today.",
  compatibility: "See if your cosmic connection matches theirs!",
  journal: "Your astrology journey inspires others to start their own.",
  profile: "Let the cosmos speak for you.",
};

export function SharePromptModal({
  type,
  open,
  onClose,
  sign,
  date,
  username,
  partnerSign,
}: SharePromptModalProps) {
  const handleShare = useCallback(
    async (platform: SharePlatform) => {
      const params = {
        type,
        sign,
        date,
        username,
        partnerSign,
        utmSource: platform,
      };

      if (platform === "copy") {
        openShareDialog("copy", params);
        toast.success("Link copied to clipboard!");
      } else {
        openShareDialog(platform, params);
      }
      onClose();
    },
    [type, sign, date, username, partnerSign, onClose],
  );

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed bottom-0 left-0 right-0 z-50 pb-8 px-4 pointer-events-none"
          >
            <div
              className="max-w-md mx-auto rounded-3xl overflow-hidden pointer-events-auto"
              style={{
                background: "linear-gradient(180deg, #141420 0%, #0A0A1A 100%)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 pt-6 pb-4">
                <div>
                  <h2 className="text-lg font-serif text-white">
                    {HEADLINES[type]}
                  </h2>
                  <p className="text-sm text-white/50 mt-1">
                    {SUBTEXTS[type]}
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 text-white/40 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <TbX className="w-4 h-4" />
                </button>
              </div>

              {/* Platform buttons */}
              <div className="flex items-center justify-center gap-3 px-6 pb-6">
                {PLATFORM_CONFIGS.map(({ id, label, Icon, className }) => (
                  <button
                    key={id}
                    onClick={() => handleShare(id)}
                    className={`flex flex-col items-center gap-1.5 px-4 py-3 rounded-2xl transition-transform active:scale-95 ${className}`}
                  >
                    <Icon className="w-5 h-5 text-white" />
                    <span className="text-[10px] font-medium text-white/80">{label}</span>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}