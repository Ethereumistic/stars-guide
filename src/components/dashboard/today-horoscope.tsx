"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useUserStore } from "@/store/use-user-store";
import { compositionalSigns } from "@/astrology/signs";
import { zodiacUIConfig } from "@/config/zodiac-ui";
import { elementUIConfig } from "@/config/elements-ui";
import { SignTitleBlock } from "@/components/learn/signs/sign-title-block";
import { SignSpecsGrid, HOUSE_NAMES } from "@/components/learn/signs/sign-specs-grid";
import { HoroscopeContentCard } from "@/components/horoscopes/horoscope-content-card";
import { DomainScoresGrid } from "@/components/horoscopes/domain-scores-grid";
import { motion } from "motion/react";
import { format } from "date-fns";
import { TbTriangleSquareCircle, TbCompass, TbSparkles } from "react-icons/tb";
import { planetUIConfig } from "@/config/planet-ui";

interface TodayHoroscopeProps {
  className?: string;
}

export function TodayHoroscope({ className = "" }: TodayHoroscopeProps) {
  const { user } = useUserStore();
  
  // Get user's sun sign
  const sunPlacement = user?.birthData?.placements?.find((p) => p.body === "Sun");
  const sunSign = sunPlacement?.sign || "";
  
  // Get sign data and UI config
  const sunData = compositionalSigns.find(s => s.name === sunSign);
  const sunUI = sunSign ? zodiacUIConfig[sunSign.toLowerCase()] : undefined;
  
  // Fetch today's horoscope for user's sun sign
  const todayStr = format(new Date(), "yyyy-MM-dd");
  const formattedSign = sunSign || "Aries";
  
  const horoscopeData = useQuery(api.horoscopes.queries.getTodayForSign, {
    sign: formattedSign,
  });
  
  const isLoading = horoscopeData === undefined;
  
  // Get element data for styling
  const elementUi = sunData ? elementUIConfig[sunData.element] : null;
  const styles = elementUi?.styles || { primary: "#ffffff", glow: "#ffffff" };
  
  // Handle missing data
  if (!sunData || !sunUI || !sunSign) {
    return null;
  }
  
  const houseIndex = compositionalSigns.findIndex(s => s.id === sunSign.toLowerCase());
  const planetUi = planetUIConfig[sunData.ruler.toLowerCase()];
  const elementIcon = elementUi?.icon;
  
  // Determine if we have v2 content for domain scores
  const horoscopeContent = horoscopeData && !horoscopeData.isPaywalled
    ? (horoscopeData as Record<string, any>)?.content
    : undefined;
  
  const isV2Content = horoscopeContent && 
    typeof horoscopeContent.hook === "string" && 
    typeof horoscopeContent.bodyText === "string";
  
  // Use AI-generated mantra if available, else static motto
  const displayMotto = isV2Content && horoscopeContent.mantra
    ? horoscopeContent.mantra
    : sunData.motto;
  
  // Static specs (fallback when no domain scores)
  const staticSpecs = [
    { 
      label: "Element", 
      value: sunData.element, 
      icon: elementIcon || TbSparkles, 
      subValue: "" 
    },
    { 
      label: "Modality", 
      value: sunData.modality, 
      icon: TbTriangleSquareCircle, 
      subValue: "" 
    },
    { 
      label: "Ruler", 
      value: sunData.ruler.charAt(0).toUpperCase() + sunData.ruler.slice(1), 
      icon: TbSparkles, 
      subValue: planetUi?.rulerSymbol || "" 
    },
    { 
      label: "House", 
      value: HOUSE_NAMES[houseIndex] || "", 
      icon: TbCompass, 
      subValue: "" 
    },
  ];
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1, ease: "easeOut" }}
      className={`relative ${className}`}
    >
      {/* Background glow effect */}
      <div className="fixed inset-0 z-0 pointer-events-none contain-strict">
        <div
          className="absolute top-[-10%] left-[0%] w-[140%] h-[140%] opacity-[0.15] mix-blend-screen"
          style={{
            background: `radial-gradient(circle at 50% 50%, ${styles.primary} 0%, transparent 60%)`
          }}
        />
      </div>
      
      {/* Main content */}
      <div className="relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
          {/* Left Column: Title Block + Specs */}
          <div className="lg:col-span-5 flex flex-col space-y-12">
            <SignTitleBlock
              variant="horoscopes"
              signName={sunData.name}
              subtitle={`Today // ${todayStr}`}
              motto={displayMotto}
              icon={<sunUI.icon className="absolute w-12 h-12 md:w-16 md:h-16 stroke-1" />}
              elementFrameUrl={elementUi?.frameUrl || ""}
              borderColor={styles.primary}
            />
            
            {/* Domain Scores or Static Specs */}
            {isV2Content && 
              horoscopeContent.domainScores && 
              Array.isArray(horoscopeContent.domainScores) && 
              horoscopeContent.domainScores.length >= 4 ? (
                <DomainScoresGrid
                  scores={horoscopeContent.domainScores.map((d: any) => ({ 
                    name: d.name, 
                    score: d.score 
                  }))}
                  accentColor={styles.primary}
                />
            ) : (
              <SignSpecsGrid specs={staticSpecs} />
            )}
          </div>
          
          {/* Right Column: Horoscope Content Card */}
          <div className="lg:col-span-7">
            <HoroscopeContentCard
              horoscopeData={horoscopeData}
              isLoading={isLoading}
              date={todayStr}
              sign={formattedSign}
              styles={styles}
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
}