"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { compositionalSigns } from "@/astrology/signs";
import { zodiacUIConfig } from "@/config/zodiac-ui";
import { elementUIConfig } from "@/config/elements-ui";

const SIGN_CONTENT: Record<string, {
  compatibility: { best: string[]; challenging: string[]; description: string };
  career: { strengths: string[]; idealPaths: string[]; avoid: string };
  relationships: string;
  faqs: { q: string; a: string }[];
}> = {
  aries: {
    compatibility: {
      best: ["leo", "sagittarius", "gemini"],
      challenging: ["cancer", "capricorn", "libra"],
      description: "Aries thrives alongside bold, independent spirits who match their energy and aren't threatened by their direct nature. Fire signs and air signs with strong independent streaks make natural partners.",
    },
    career: {
      strengths: ["Rapid decision-making under pressure", "Competitive drive", "Comfortable with risk and ambiguity", "Leadership and team motivation"],
      idealPaths: ["Entrepreneurship", "Sales & Business Development", "Emergency Services", "Sports & Athletics", "Military & Law Enforcement"],
      avoid: "Repetitive micro-management roles or environments that require extended sitting and slow consensus-building without action.",
    },
    relationships: "In relationships, Aries brings passion, honesty, and spontaneous energy. Their challenge is tempering impulsivity with patience — they may rush into commitments before fully reading their partner. They need a partner who can handle their intensity without trying to dim their fire.",
    faqs: [
      { q: "What are Aries' key strengths?", a: "Aries excels at taking initiative, overcoming inertia, and motivating others. They are natural leaders who thrive in fast-paced, competitive environments." },
      { q: "Who is Aries most compatible with?", a: "Aries is most compatible with Leo and Sagittarius (shared fire energy) and Gemini (intellectual excitement). Libra and Cancer tend to present more challenges due to differing values around harmony and emotional expression." },
      { q: "What does Aries need in a relationship?", a: "Aries needs physical activity, honest communication, intellectual stimulation, and space to maintain their independence. A partner who tries to control or suppress them will trigger their instinctive resistance." },
      { q: "What is Aries' biggest weakness?", a: "Aries can be impulsive, impatient, and prone to burning out when they overextend themselves. Learning to sustain effort beyond the initial excitement is their primary growth edge." },
      { q: "What ruling planet influences Aries?", a: "Mars, the god of war, rules Aries. This gives them their drive, competitive edge, and at times, a sharp temper. It also rules physical energy, assertiveness, and the willingness to take the first step." },
    ],
  },
  taurus: {
    compatibility: {
      best: ["virgo", "capricorn", "cancer"],
      challenging: ["aquarius", "leo", "aries"],
      description: "Taurus seeks depth, loyalty, and sensory richness in relationships. Earth signs and water signs who value stability and consistent presence make ideal matches. Taurus will invest heavily in relationships but requires security before fully committing.",
    },
    career: {
      strengths: ["Sustained focus and follow-through", "Financial acumen and patience", "Practical problem-solving", "Building and maintaining systems"],
      idealPaths: ["Finance & Banking", "Real Estate", "Culinary Arts & Hospitality", "Agriculture & Botany", "Luxury Goods & Art"],
      avoid: "Highly volatile or unpredictable environments, or roles requiring rapid change of direction without clear justification.",
    },
    relationships: "Taurus approaches relationships with intention and depth — once they commit, they are among the most reliable and loyal partners in the zodiac. Their challenge is inflexibility; they can become stubborn when their comfort zone is threatened. They need to learn that growth sometimes requires discomfort.",
    faqs: [
      { q: "What are Taurus' key strengths?", a: "Taurus excels at endurance, building sustainable systems, and appreciating life's sensory pleasures. They are reliable workers who don't quit when things get difficult." },
      { q: "Who is Taurus most compatible with?", a: " Taurus is most compatible with Virgo and Capricorn (earth sign harmony) and Cancer (emotional depth meets stability). Leo and Aquarius tend to create friction through their different approaches to freedom and aesthetics." },
      { q: "What does Taurus need in a relationship?", a: "Taurus needs physical affection, shared material comfort,忠诚, and minimal unpredictability. They thrive with a partner who values quality and creates a stable home environment." },
      { q: "What is Taurus' biggest weakness?", a: "Taurus can be stubborn to the point of self-sabotage, resistant to change even when it's needed, and over-attached to comfort. Learning to adapt without abandoning their core values is their primary growth area." },
      { q: "What does Venus rule Taurus?", a: "Venus, the planet of beauty, love, and material values, rules Taurus. This explains their refined taste, their need for harmony in relationships, and their deep appreciation for art, food, and physical comfort." },
    ],
  },
  gemini: {
    compatibility: {
      best: ["libra", "aquarius", "aries"],
      challenging: ["virgo", "pisces", "scorpio"],
      description: "Gemini needs mental stimulation, variety, and social connection above all else. Air signs and fire signs with quick minds and flexible schedules make ideal partners. They need space to explore — both intellectually and socially.",
    },
    career: {
      strengths: ["Rapid learning and context-switching", "Verbal and written communication", "Multi-tasking and adapting to change", "Networking and making connections across domains"],
      idealPaths: ["Journalism & Media", "Sales & Marketing", "Teaching & Public Speaking", "Technology & Social Media", "Consulting & Research"],
      avoid: "Roles requiring sustained single-focus concentration, environments with extreme rigidity, or careers where they must commit to one narrow path permanently.",
    },
    relationships: "Gemini brings curiosity, wit, and social energy to relationships. They are excellent communicators who keep conversations alive. Their challenge is depth — they can skim the surface of emotions without going deep. They need a partner who can handle their social side without jealousy while also being willing to go to emotional places that require sustained vulnerability.",
    faqs: [
      { q: "What are Gemini's key strengths?", a: "Gemini excels at communication, rapid adaptation, connecting disparate ideas, and keeping social energy alive. They are natural networkers who thrive in dynamic environments." },
      { q: "Who is Gemini most compatible with?", a: "Gemini is most compatible with Libra and Aquarius (air sign harmony) and Aries (intellectual excitement). Virgo's need for order and Scorpio/Pisces' emotional depth tend to clash with Gemini's lighter approach." },
      { q: "What does Gemini need in a relationship?", a: "Gemini needs mental engagement, variety, social interaction, and freedom to maintain their wide circle of connections. They need a partner who is comfortable with their conversational, sometimes non-committal nature." },
      { q: "What is Gemini's biggest weakness?", a: "Gemini can be inconsistent, scattered, and struggle with depth and follow-through. They may avoid difficult emotional conversations in favor of lighter intellectual engagement. Their growth edge is commitment to depth." },
      { q: "What does Mercury rule Gemini?", a: "Mercury, the planet of communication and intellect, rules Gemini. This is why Gemini is so verbally agile, curious about everything, and needs constant mental stimulation — their ruling planet demands it." },
    ],
  },
  cancer: {
    compatibility: {
      best: ["scorpio", "pisces", "taurus"],
      challenging: ["aries", "libra", "capricorn"],
      description: "Cancer seeks deep emotional connection and security in relationships. Water signs and earth signs who value home, family, and emotional authenticity make ideal matches. Cancer will nurture a partner fiercely — but requires reciprocal care.",
    },
    career: {
      strengths: ["High emotional intelligence and reading the room", "Nurturing and supportive leadership", "Memory and attention to detail", "Creating safe, organized environments"],
      idealPaths: ["Healthcare & Nursing", "Real Estate & Property Management", "Culinary Arts", "Interior Design", "Social Work & Counseling", "Education (especially early childhood)"],
      avoid: "Highly impersonal or competitive corporate environments that lack team cohesion and require emotional detachment.",
    },
    relationships: "Cancer approaches relationships with deep emotional investment and fierce protectiveness. They are caretakers who will go to great lengths for their loved ones. Their challenge is boundary-setting — they can over-identify with their partner's emotional states and become controlling in the name of protection. They need to learn that love and control are not the same thing.",
    faqs: [
      { q: "What are Cancer's key strengths?", a: "Cancer excels at emotional intelligence, creating nurturing environments, protecting loved ones, and building deep loyalty. They have exceptional memory for emotional details and read people's needs accurately." },
      { q: "Who is Cancer most compatible with?", a: "Cancer is most compatible with Scorpio and Pisces (water sign depth) and Taurus (stability meets emotional warmth). Aries' directness and Libra's detachment tend to clash with Cancer's need for emotional security." },
      { q: "What does Cancer need in a relationship?", a: "Cancer needs emotional safety, reciprocal nurturing, a secure home base, and a partner who understands their need to protect and care. They need to feel needed without being controlled by fear." },
      { q: "What is Cancer's biggest weakness?", a: "Cancer can be moody, manipulative through guilt, and over-protective to the point of smothering. They may avoid confrontation by retreating emotionally. Their growth edge is healthy emotional boundaries." },
      { q: "What ruling planet influences Cancer?", a: "The Moon rules Cancer, governing emotions, intuition, and the need for security. This explains Cancer's emotional depth, their connection to home and family, and their moodiness — the Moon's phases directly affect their inner life." },
    ],
  },
  leo: {
    compatibility: {
      best: ["aries", "sagittarius", "gemini"],
      challenging: ["taurus", "scorpio", "capricorn"],
      description: "Leo thrives on admiration, creative expression, and grand gestures in relationships. Fire signs and air signs who appreciate their nature and aren't threatened by their need to be seen make ideal partners. Leo gives generously — but needs to feel appreciated.",
    },
    career: {
      strengths: ["Creative vision and big-picture thinking", "Inspiring and motivating teams", "Performance and public presence", "Generosity that builds loyalty in others"],
      idealPaths: ["Entertainment & Performing Arts", "Marketing & Brand Management", "Event Planning", "Photography & Film", "Politics & Public Speaking", "Creative Direction"],
      avoid: "Back-office roles that lack visibility, environments that don't appreciate their creative contributions, or positions that require anonymity.",
    },
    relationships: "Leo approaches relationships with warmth, drama, and absolute loyalty. They are generous partners who love to make their significant other feel special. Their challenge is managing ego — they need to be the best and may struggle when the spotlight shifts away. They need a partner who can appreciate their grand nature while also grounding their more extravagant impulses.",
    faqs: [
      { q: "What are Leo's key strengths?", a: "Leo excels at creative vision, inspiring others, commanding attention, and making people feel special. They are natural performers who light up any room they enter." },
      { q: "Who is Leo most compatible with?", a: "Leo is most compatible with Aries and Sagittarius (fire sign passion) and Gemini and Libra (air signs that appreciate their theatrical nature). Taurus' stubbornness and Scorpio's intensity can clash with Leo's need for adoration." },
      { q: "What does Leo need in a relationship?", a: "Leo needs genuine admiration, creative expression, generosity from their partner, and the freedom to be the center of attention. They thrive when their partner celebrates their wins and appreciates their dramatic flair." },
      { q: "What is Leo's biggest weakness?", a: "Leo can be self-centered, require constant validation, and struggle to share the spotlight. They may drama from boredom. Their growth edge is learning to value others without needing to be the star." },
      { q: "What ruling planet influences Leo?", a: "The Sun rules Leo, giving them their radiant energy, their sense of drama, and their need to shine. Like the Sun in the solar system, Leo positions themselves at the center — not out of arrogance, but because that's their nature." },
    ],
  },
  virgo: {
    compatibility: {
      best: ["taurus", "capricorn", "cancer"],
      challenging: ["gemini", "sagittarius", "pisces"],
      description: "Virgo seeks competence, refinement, and practical partnership in relationships. Earth signs and water signs who share their values of improvement and service make ideal matches. Virgo will invest in making relationships work — but needs a partner who meets their standards.",
    },
    career: {
      strengths: ["Systems thinking and process optimization", "Attention to detail and accuracy", "Practical problem-solving", "Reliable, methodical execution"],
      idealPaths: ["Healthcare & Medicine", "Accounting & Finance", "Engineering & Architecture", "Editing & Publishing", "Research & Analysis", "Quality Assurance"],
      avoid: "Roles requiring rapid high-level judgment without data, environments that reward chaos, or positions that require constant social interaction without substantive content.",
    },
    relationships: "Virgo approaches relationships with thoughtfulness, loyalty, and a desire to be of service. They analyze relationships carefully and may have high expectations. Their challenge is perfectionism — they can criticize endlessly while missing the bigger picture of love. They need a partner who can receive their feedback without feeling diminished, and who helps them see that not everything needs to be fixed.",
    faqs: [
      { q: "What are Virgo's key strengths?", a: "Virgo excels at analytical thinking, process improvement, attention to detail, and practical problem-solving. They are the sign that notices what others miss and finds functional solutions." },
      { q: "Who is Virgo most compatible with?", a: "Virgo is most compatible with Taurus and Capricorn (earth sign stability) and Cancer (emotional depth meets practical care). Gemini's scattered energy and Sagittarius' optimism about chaos tend to frustrate Virgo's need for order." },
      { q: "What does Virgo need in a relationship?", a: "Virgo needs intellectual engagement, practical demonstrations of care, a partner who maintains personal standards, and a relationship that grows and improves over time. They need space to be of service without being taken for granted." },
      { q: "What is Virgo's biggest weakness?", a: "Virgo can be hyper-critical, anxious, and stuck in analysis paralysis. They may struggle to accept imperfection in themselves and others. Their growth edge is learning to appreciate what is without needing to optimize it." },
      { q: "What does Mercury rule Virgo?", a: "Mercury, the planet of communication and intellect, rules Virgo (as it does Gemini). In Virgo, Mercury's energy expresses as analytical, precise, and service-oriented — Virgo thinks to serve, not just to exchange ideas." },
    ],
  },
  libra: {
    compatibility: {
      best: ["gemini", "aquarius", "leo"],
      challenging: ["cancer", "capricorn", "aries"],
      description: "Libra seeks intellectual connection, harmony, and aesthetic richness in relationships. Air signs and fire signs who value balance and social engagement make ideal matches. Libra will go to great lengths to maintain relationship harmony — but needs a partner who makes decisions.",
    },
    career: {
      strengths: ["Negotiation and finding middle ground", "Diplomatic communication", "Aesthetic sensibility and design awareness", "Reading and managing social dynamics"],
      idealPaths: ["Law & Mediation", "Art & Design", "Public Relations & Communications", "Fashion & Beauty", "Diplomacy & Foreign Affairs", "Human Resources"],
      avoid: "High-stakes decisions with no middle ground, roles that require quick unilateral judgment, or environments where personal aesthetics don't matter.",
    },
    relationships: "Libra approaches relationships with charm, thoughtfulness, and a genuine desire for partnership. They are naturally attentive partners who consider their significant other's needs. Their challenge is indecision — they can spend so much time weighing options that they don't make choices at all. They need a partner who can make decisions without being heavy-handed, and who helps them see that some choices can't be optimized away.",
    faqs: [
      { q: "What are Libra's key strengths?", a: "Libra excels at diplomacy, aesthetic refinement, negotiation, and understanding multiple perspectives. They are natural peacemakers who can find common ground where others see only conflict." },
      { q: "Who is Libra most compatible with?", a: "Libra is most compatible with Gemini and Aquarius (air sign intellectual connection) and Leo (creative energy meets social grace). Cancer's emotional intensity and Capricorn's rigidity tend to clash with Libra's need for lightness and balance." },
      { q: "What does Libra need in a relationship?", a: "Libra needs intellectual engagement, aesthetic harmony, social connection, and a partner who participates actively in the relationship. They need a partner who helps them make decisions without making them feel controlled." },
      { q: "What is Libra's biggest weakness?", a: "Libra can be indecisive, conflict-avoidant to a fault, and prone to people-pleasing at the expense of their own needs. They may suppress anger until it surfaces unexpectedly. Their growth edge is learning to make decisions with incomplete information." },
      { q: "What does Venus rule Libra?", a: "Venus, the planet of love, beauty, and values, rules Libra (as it does Taurus). In Libra, Venus expresses as a need for harmony in relationships, refined aesthetics, and intellectual connection as a form of attraction." },
    ],
  },
  scorpio: {
    compatibility: {
      best: ["cancer", "pisces", "virgo"],
      challenging: ["leo", "aquarius", "taurus"],
      description: "Scorpio seeks profound, transformative, and loyal partnerships in relationships. Water signs and earth signs who can handle emotional intensity and value depth over surface make ideal matches. Scorpio gives everything in relationships — but needs absolute commitment.",
    },
    career: {
      strengths: ["Investigative analysis and uncovering truth", "Strategic thinking and long-term planning", "Emotional resilience and crisis management", "Focus and intensity of purpose"],
      idealPaths: ["Research & Investigation", "Psychology & Therapy", "Finance & Forensic Accounting", "Strategic Consulting", "Healthcare & Surgery", "Security & Intelligence"],
      avoid: "Superficial or transparent corporate cultures, roles requiring constant small talk with no depth, or careers that require them to suppress their need for truth.",
    },
    relationships: "Scorpio approaches relationships with total commitment and profound emotional depth. Once they trust you, they are among the most loyal partners in the zodiac. Their challenge is jealousy and control — their intensity can become possessive if they feel threatened. They need a partner who is equally committed and comfortable with emotional depth, and who understands that Scorpio's need for privacy isn't secrecy — it's self-protection.",
    faqs: [
      { q: "What are Scorpio's key strengths?", a: "Scorpio excels at deep investigation, emotional resilience, strategic thinking, and total commitment. They are the zodiac's detectives who don't stop until they find the truth." },
      { q: "Who is Scorpio most compatible with?", a: "Scorpio is most compatible with Cancer and Pisces (water sign emotional depth) and Virgo (analytical intensity meets emotional care). Leo's need for attention and Aquarius' emotional detachment tend to clash with Scorpio's need for intimacy." },
      { q: "What does Scorpio need in a relationship?", a: "Scorpio needs absolute emotional commitment, truth and transparency, profound intimacy, and a partner who doesn't flinch when things get intense. They need a relationship that matches their depth." },
      { q: "What is Scorpio's biggest weakness?", a: "Scorpio can be jealous, controlling, vengeful when hurt, and prone to staying in emotional pain too long. They may push people away before they can be abandoned. Their growth edge is learning to trust without needing total control." },
      { q: "What ruling planets influence Scorpio?", a: "Scorpio is traditionally ruled by Mars (energy and drive) but is more commonly associated with modern ruler Pluto (transformation and depth). This dual rulership explains Scorpio's intensity, their regenerative capacity, and their association with the deepest parts of human experience." },
    ],
  },
  sagittarius: {
    compatibility: {
      best: ["aries", "leo", "libra"],
      challenging: ["virgo", "pisces", "cancer"],
      description: "Sagittarius seeks freedom, adventure, and philosophical depth in relationships. Fire signs and air signs who share their optimism and need for growth make ideal matches. Sagittarius is generous and fun-loving — but needs space to breathe.",
    },
    career: {
      strengths: ["Big-picture vision and strategic optimism", "Cross-cultural communication", "Teaching and inspiring others", "Comfortable with risk and uncertainty"],
      idealPaths: ["Travel & Tourism", "Higher Education & Academia", "Publishing & Journalism", "Philosophy & Ethics Consulting", "International Business", "Athletics & Adventure Sports"],
      avoid: "Repetitive environments with no growth, roles requiring rigid schedules, or positions that require them to suppress their opinions to maintain harmony.",
    },
    relationships: "Sagittarius approaches relationships with enthusiasm, honesty, and a genuine love of adventure. They are optimistic partners who bring joy and spontaneity to connections. Their challenge is commitment — their love of freedom can make long-term partnerships feel confining. They need a partner who gives them room to explore without making them feel guilty, and who can match their intellectual energy.",
    faqs: [
      { q: "What are Sagittarius' key strengths?", a: "Sagittarius excels at big-picture thinking, inspiring optimism, cross-cultural communication, and maintaining a positive outlook even in difficult situations. They are natural philosophers who make learning feel exciting." },
      { q: "Who is Sagittarius most compatible with?", a: "Sagittarius is most compatible with Aries and Leo (fire sign energy) and Libra (intellectual excitement meets social grace). Virgo's attention to detail and Pisces' emotional depth tend to clash with Sagittarius' need for optimism and space." },
      { q: "What does Sagittarius need in a relationship?", a: "Sagittarius needs intellectual growth, physical freedom (travel, adventure), honest communication, and a partner who doesn't try to limit their exploration. They need someone who is happy to explore alongside them." },
      { q: "What is Sagittarius' biggest weakness?", a: "Sagittarius can be blunt to the point of hurtful, commitment-averse, and prone to over-promising. They may avoid difficult emotional conversations by retreating into philosophical abstraction. Their growth edge is learning to commit without losing themselves." },
      { q: "What ruling planet influences Sagittarius?", a: "Jupiter, the planet of expansion, growth, and wisdom, rules Sagittarius. This explains their love of exploration, their philosophical optimism, and their constant drive toward bigger experiences and broader understanding." },
    ],
  },
  capricorn: {
    compatibility: {
      best: ["taurus", "virgo", "cancer"],
      challenging: ["aries", "libra", "sagittarius"],
      description: "Capricorn seeks structured, ambitious, and achievement-oriented partnerships. Earth signs and water signs who share their values of discipline and long-term planning make ideal matches. Capricorn will build something lasting — but needs a partner who respects their ambitions.",
    },
    career: {
      strengths: ["Long-term strategic planning and execution", "Discipline and delayed gratification", "Structural thinking and organizational skills", "Unwavering focus on goals"],
      idealPaths: ["Business & Management Consulting", "Finance & Investment Banking", "Law & Politics", "Engineering & Architecture", "Military & Military Strategy", "Real Estate Development"],
      avoid: "Highly chaotic or unstructured environments, roles with no clear path to advancement, or positions that reward luck over effort.",
    },
    relationships: "Capricorn approaches relationships with seriousness and long-term intention. They don't do casual — when they commit, they're in it for the building phase. Their challenge is emotional expression — they can be reserved, rigid, or overly focused on achievement at the expense of emotional connection. They need a partner who helps them see that vulnerability isn't weakness, and that rest and play are part of a well-lived life.",
    faqs: [
      { q: "What are Capricorn's key strengths?", a: "Capricorn excels at long-term planning, disciplined execution, structural thinking, and achieving difficult goals through sustained effort. They are the zodiac's builders who don't stop until the job is done." },
      { q: "Who is Capricorn most compatible with?", a: "Capricorn is most compatible with Taurus and Virgo (earth sign stability) and Cancer (emotional depth meets practical care). Aries' impulsiveness, Libra's indecision, and Sagittarius' chaos tend to clash with Capricorn's need for order and commitment." },
      { q: "What does Capricorn need in a relationship?", a: "Capricorn needs mutual ambition and respect, a partner who supports their long-term goals, clear structure and commitment, and emotional as well as practical partnership. They need someone who respects their need to build without undermining their confidence." },
      { q: "What is Capricorn's biggest weakness?", a: "Capricorn can be emotionally reserved to the point of coldness, over-worked to the point of burnout, and so focused on achievement that they miss the present. They may equate their worth with productivity. Their growth edge is learning to value rest and emotional connection as much as achievement." },
      { q: "What ruling planet influences Capricorn?", a: "Saturn, the planet of discipline, responsibility, and time, rules Capricorn. This explains their drive for structure, their mature perspective, and their understanding that great things require sustained effort over time." },
    ],
  },
  aquarius: {
    compatibility: {
      best: ["gemini", "libra", "sagittarius"],
      challenging: ["taurus", "scorpio", "cancer"],
      description: "Aquarius seeks intellectual freedom, humanitarian connection, and innovative thinking in relationships. Air signs and fire signs who share their progressive values and need for independence make ideal matches. Aquarius is genuinely unique — they need a partner who celebrates their eccentricities.",
    },
    career: {
      strengths: ["Systems-level and innovative thinking", "Comfortable working independently", "Forward-looking vision and strategic disruption", "Humanitarian concern and collective organizing"],
      idealPaths: ["Technology & Software Development", "Social Entrepreneurship", "Activism & Advocacy", "Science & Research", "Aviation & Space Industries", "Philosophy & Futurism"],
      avoid: "Highly traditional or hierarchical structures that don't reward innovation, roles requiring sustained emotional intimacy, or positions that require following the crowd.",
    },
    relationships: "Aquarius approaches relationships with intellectual engagement and genuine care for humanity. They are not possessive partners — they need room to breathe and maintain their individuality. Their challenge is intimacy — they can keep emotional distance even in close relationships. They need a partner who understands that their detachment isn't rejection, and who helps them connect emotionally without making them feel trapped.",
    faqs: [
      { q: "What are Aquarius' key strengths?", a: "Aquarius excels at innovative thinking, systems-level analysis, forward-looking vision, and staying true to their beliefs even under social pressure. They are natural revolutionaries who see what others haven't imagined yet." },
      { q: "Who is Aquarius most compatible with?", a: "Aquarius is most compatible with Gemini and Libra (air sign intellectual connection) and Sagittarius (progressive values meets love of freedom). Taurus' need for stability, Scorpio's emotional intensity, and Cancer's need for closeness tend to clash with Aquarius' need for space and intellectual freedom." },
      { q: "What does Aquarius need in a relationship?", a: "Aquarius needs intellectual engagement, freedom and space to maintain individuality, a partner who shares their progressive values, and minimal emotional pressure. They need someone who understands that they can care deeply while also needing independence." },
      { q: "What is Aquarius' biggest weakness?", a: "Aquarius can be emotionally detached to the point of coldness, rebellious for its own sake, and struggle with deep intimate connection. They may prioritize ideas over people's feelings. Their growth edge is learning to connect emotionally without retreating into pure intellect." },
      { q: "What ruling planets influence Aquarius?", a: "Aquarius is traditionally ruled by Saturn (structure and discipline) but is more commonly associated with modern ruler Uranus (revolution and innovation). This dual rulership explains Aquarius' combination of structural thinking with radical, forward-looking ideas." },
    ],
  },
  pisces: {
    compatibility: {
      best: ["cancer", "scorpio", "taurus"],
      challenging: ["gemini", "sagittarius", "leo"],
      description: "Pisces seeks transcendent, empathetic, and spiritually deep connections in relationships. Water signs and earth signs who value emotional authenticity and artistic expression make ideal matches. Pisces loves profoundly — but needs a partner who can hold their sensitivity without trying to fix it.",
    },
    career: {
      strengths: ["Intuitive understanding and empathic connection", "Creative expression in all forms", "Spiritual and philosophical depth", "Adaptable and fluid approach to challenges"],
      idealPaths: ["Arts & Creative Writing", "Music & Performance", "Therapy & Counseling", "Spiritual Practice & Chaplaincy", "Film & Photography", "Healing Arts (Reiki, Yoga Instruction)"],
      avoid: "Highly rational, data-driven, or competitive corporate environments; roles requiring emotional hardening or rigid structure without creative outlet.",
    },
    relationships: "Pisces approaches relationships with deep emotional sensitivity, empathy, and romantic idealism. They love with their whole being and feel things at extraordinary depth. Their challenge is boundaries — they can absorb others' emotions, lose themselves in relationships, or use fantasy to avoid difficult realities. They need a partner who is emotionally strong enough to handle their sensitivity without overwhelming them, and who helps them maintain healthy limits.",
    faqs: [
      { q: "What are Pisces' key strengths?", a: "Pisces excels at empathy, creative expression, spiritual intuition, and connecting with the deeper currents of human experience. They are the zodiac's artists and mystics who translate feeling into meaningful form." },
      { q: "Who is Pisces most compatible with?", a: "Pisces is most compatible with Cancer and Scorpio (water sign emotional depth) and Taurus (stability meets creative harmony). Gemini's scattered energy, Sagittarius' bluntness, and Leo's need for attention tend to clash with Pisces' need for depth and sensitivity." },
      { q: "What does Pisces need in a relationship?", a: "Pisces needs emotional intimacy and creative connection, a partner who respects their sensitive nature without trying to harden them, spiritual or artistic engagement, and space to feel everything fully. They need someone who doesn't dismiss their emotional depth." },
      { q: "What is Pisces' biggest weakness?", a: "Pisces can be escapist, overly idealistic, prone to victim mentality, and struggle to maintain healthy boundaries. They may avoid difficult realities through fantasy or substance use. Their growth edge is learning to be compassionate without losing themselves." },
      { q: "What ruling planets influence Pisces?", a: "Pisces is traditionally ruled by Jupiter (expansion and wisdom) but is more commonly associated with modern ruler Neptune (transcendence and spirituality). This dual rulership explains Pisces' combination of philosophical depth, artistic sensitivity, and tendency to dissolve boundaries." },
    ],
  },
};

interface SignSEOContentProps {
  signId: string;
}

export function SignSEOContent({ signId }: SignSEOContentProps) {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [openTab, setOpenTab] = useState<"compatibility" | "career" | "relationships">("compatibility");

  const content = SIGN_CONTENT[signId];
  if (!content) return null;

  const signData = compositionalSigns.find((s) => s.id === signId);
  if (!signData) return null;

  const ui = zodiacUIConfig[signId];
  const elementUi = elementUIConfig[signData.element];
  const styles = elementUi.styles;

  return (
    <div className="border-t border-white/10 mt-24 pt-16">
      {/* Section Header */}
      <div className="text-center mb-16">
        <span className="font-mono text-[10px] uppercase tracking-[0.4em] text-white/40 block mb-4">
          Complete {signData.name} Guide
        </span>
        <h2 className="text-4xl md:text-5xl font-serif text-white mb-4">
          Everything About {signData.name}
        </h2>
        <p className="text-white/60 max-w-2xl mx-auto">
          Deep-dive guides covering compatibility, career guidance, relationship dynamics, and frequently asked questions about {signData.name}.
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 mb-12 overflow-x-auto pb-2">
        {(["compatibility", "career", "relationships"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setOpenTab(tab)}
            className={`px-6 py-3 rounded-sm font-mono text-xs uppercase tracking-widest transition-colors whitespace-nowrap ${
              openTab === tab
                ? "text-white"
                : "text-white/40 hover:text-white/60"
            }`}
            style={openTab === tab ? { borderBottom: `2px solid ${styles.primary}` } : {}}
          >
            {tab === "compatibility" ? "Compatibility" : tab === "career" ? "Career" : "Relationships"}
          </button>
        ))}
      </div>

      {/* Compatibility Tab */}
      <AnimatePresence>
        {openTab === "compatibility" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-8"
          >
            {/* Best Matches */}
            <div className="border border-white/10 bg-black/50 rounded-md p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-3 h-3 rounded-full bg-green-500/80" />
                <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/40">
                  Best Compatibility
                </span>
              </div>
              <div className="space-y-4">
                {content.compatibility.best.map((matchId) => {
                  const matchSign = compositionalSigns.find((s) => s.id === matchId);
                  const matchUi = zodiacUIConfig[matchId];
                  if (!matchSign || !matchUi) return null;
                  return (
                    <div key={matchId} className="flex items-center gap-4">
                      <div
                        className="w-12 h-12 rounded-full flex items-center justify-center text-2xl"
                        style={{ background: `${styles.primary}20`, border: `1px solid ${styles.primary}40` }}
                      >
                        {matchUi.icon && <matchUi.icon className="size-5" />}
                      </div>
                      <div>
                        <p className="text-white font-medium">{matchSign.name}</p>
                        <p className="text-white/40 text-xs">{matchSign.dates}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Challenging Matches */}
            <div className="border border-white/10 bg-black/50 rounded-md p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-3 h-3 rounded-full bg-orange-500/80" />
                <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/40">
                  Growth Opportunities
                </span>
              </div>
              <div className="space-y-4">
                {content.compatibility.challenging.map((matchId) => {
                  const matchSign = compositionalSigns.find((s) => s.id === matchId);
                  const matchUi = zodiacUIConfig[matchId];
                  if (!matchSign || !matchUi) return null;
                  return (
                    <div key={matchId} className="flex items-center gap-4">
                      <div
                        className="w-12 h-12 rounded-full flex items-center justify-center text-2xl"
                        style={{ background: `${styles.primary}10`, border: `1px solid ${styles.primary}20` }}
                      >
                        {matchUi.icon && <matchUi.icon className="size-5" />}
                      </div>
                      <div>
                        <p className="text-white font-medium">{matchSign.name}</p>
                        <p className="text-white/40 text-xs">{matchSign.dates}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Description */}
            <div className="border border-white/10 bg-black/50 rounded-md p-8">
              <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/40 block mb-4">
                Relationship Style
              </span>
              <p className="text-white/70 leading-relaxed text-sm">
                {content.compatibility.description}
              </p>
              <div className="mt-6 pt-6 border-t border-white/10">
                <p className="text-white/40 text-xs mb-2">Element</p>
                <p className="text-white font-medium">{signData.element} — {signData.modality}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Career Tab */}
      <AnimatePresence>
        {openTab === "career" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-8"
          >
            <div className="border border-white/10 bg-black/50 rounded-md p-8">
              <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/40 block mb-4">
                Key Strengths
              </span>
              <ul className="space-y-3">
                {content.career.strengths.map((s, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-white/70">
                    <span style={{ color: styles.primary }} className="mt-1">✦</span>
                    {s}
                  </li>
                ))}
              </ul>
            </div>

            <div className="border border-white/10 bg-black/50 rounded-md p-8">
              <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/40 block mb-4">
                Ideal Career Paths
              </span>
              <div className="space-y-3">
                {content.career.idealPaths.map((path, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm text-white/70">
                    <span
                      className="w-6 h-6 rounded-sm flex items-center justify-center text-xs font-mono"
                      style={{ background: `${styles.primary}20`, color: styles.primary }}
                    >
                      {i + 1}
                    </span>
                    {path}
                  </div>
                ))}
              </div>
            </div>

            <div className="border border-white/10 bg-black/50 rounded-md p-8">
              <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/40 block mb-4">
                Watch Out For
              </span>
              <p className="text-white/70 leading-relaxed text-sm mb-6">
                {content.career.avoid}
              </p>
              <div className="pt-6 border-t border-white/10">
                <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/40 block mb-2">
                  Ruling Planet
                </span>
                <p className="text-white font-medium capitalize">
                  {signData.ruler}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Relationships Tab */}
      <AnimatePresence>
        {openTab === "relationships" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="max-w-3xl mx-auto"
          >
            <div className="border border-white/10 bg-black/50 rounded-md p-8 md:p-12">
              <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/40 block mb-6">
                Relationship Dynamics
              </span>
              <p className="text-white/70 leading-relaxed text-lg font-serif">
                &ldquo;{content.relationships}&rdquo;
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FAQ Section */}
      <div className="mt-24 border border-white/10 bg-black/50 rounded-md p-8">
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-3xl font-serif text-white">Frequently Asked Questions</h3>
          <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/40">
            {signData.name}
          </span>
        </div>
        <div className="space-y-4">
          {content.faqs.map((faq, i) => (
            <div key={i} className="border-b border-white/10 last:border-0">
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full flex items-center justify-between py-5 text-left"
              >
                <span className="text-white font-medium pr-4">{faq.q}</span>
                <span className="text-white/40 text-xl shrink-0">{openFaq === i ? "−" : "+"}</span>
              </button>
              <AnimatePresence>
                {openFaq === i && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <p className="text-white/60 pb-5 leading-relaxed">{faq.a}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </div>

      {/* Internal Links */}
      <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Daily Horoscope", href: `/dashboard` },
          { label: "Birth Chart", href: `/onboarding` },
          { label: "Compatibility", href: `/learn/signs` },
          { label: "Cosmic Weather", href: `/dashboard` },
        ].map((link) => (
          <a
            key={link.href}
            href={link.href}
            className="border border-white/10 bg-black/30 rounded-sm p-4 text-center hover:border-primary/40 transition-colors group"
          >
            <span className="text-white/60 text-sm group-hover:text-primary transition-colors">
              {link.label} →
            </span>
          </a>
        ))}
      </div>
    </div>
  );
}