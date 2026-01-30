# Design System: Celestial Art Nouveau

## **Aesthetic Philosophy**

stars.guide is a "Digital Sanctuary." It must feel ancient yet futuristic. It rejects the brutalism of Co-Star and the clutter of The Pattern.

## **Important Notes**

- Design stars.guide to look like the premium option. If Co-Star is the cool indie magazine, make stars.guide the Vogue or the National Geographic of the zodiac world.
- The shadcn-ui + tailwind v4 file is already set up with the color palette, typography and other design elements described below. This documents serves as a rough explanation of it.
- When creating/combining shadcn-ui components DO NOT add bonus tailwind css classes (rounded-xl, bg-black, text-white, etc) to the components. The components ARE already styled with the design system and work out of the box.

## **Visual Language**

- **Palette:** Deep Midnight Blue (almost black) paired with Warm Gold/Brass and Cream/Parchment. Starlight Gold (Foil textures), Pale Moon Silver. These colors are already set in the globals.css shadcn-ui + tailwind v4 file.
- To fill the "Warm/Luxurious/Authoritative" hole in the market (The "Celestial Navigator" vibe), this palette moves away from the stark blacks of Co-Star and the pop-purples of Sanctuary. Instead, it uses Deep Void Navy (the night sky), Starlight Cream (the stars), and Antique Gold (the compass).

- **Typography:**
    - *Headers:* A high-contrast, sharp Serif font (Cinzel). This evokes history and importance.
    - *Body:* A very clean, geometric Sans-Serif (Inter) to ensure it still feels like a modern tech product.
- **UI Principles:** "Calm Tech." No red notification badges (anxiety inducing). Use ambient animations (slow fades, glowing borders). Use italics for emphasis to give it a "whispered secret" vibe.

## **Imagery & UI Elements (The Guide)**

- **Motifs:** Instead of abstract blobs (Co-Star) or cartoons (Sanctuary), use fine-line illustrations.
- **Think:** Astrolabes, compass needles, constellations connected by thin gold lines, topography lines.
- **Texture:** Introduce subtle noise or grain over deep backgrounds to make it feel tactile, not flat and plastic.
- **Glassmorphism:** Use frosted glass effects for your UI cards. It looks like looking through a telescope lens.

## **Voice & Tone**

- **Tagline Idea:** "Navigate your fate." or "The map is written above."
- **Tone:** NOT "roasting" you (Co-Star) and NOT "chatting" with you (Sanctuary). The tone should be Mentorship. Calm, assuring, and directional.

## **Generative Art Tokens (Image Prompting)**

When sending requests to OpenRouter for images, use these consistent tokens to maintain brand identity:

- *Style:* "Art Nouveau style," "Alphonse Mucha influence," "Tarot Card composition."
- *Lighting:* "Ethereal lighting," "Cinematic," "Volumetric fog."
- *Textures:* "Gold foil," "Intricate linework," "Deep ink."
- *Negative Prompts:* "Photorealistic, 3D render, cartoon, blurry, text."

## **Accessibility**

- High contrast text options.
- Screen reader compatibility for all chart readings (Text-to-Speech is a future roadmap item).