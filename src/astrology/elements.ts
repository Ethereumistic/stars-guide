export type ElementType = "Fire" | "Earth" | "Air" | "Water";

export const ELEMENT_CONTENT: Record<ElementType, { desc: string; keywords: string[] }> = {
    Fire: {
        desc: "Fire represents the vital impulse of energy and the spark of creation. It is the drive that moves all life toward growth, action, and the warmth of existence.",
        keywords: ["Vitality", "Intuition", "Action", "Inspiration"]
    },
    Earth: {
        desc: "Earth is the grounding foundation of reality and the manifest world. It represents the stability, endurance, and physical forms that allow life to take root and flourish.",
        keywords: ["Stability", "Manifestation", "Reliability", "Senses"]
    },
    Air: {
        desc: "Air is the breath of life and the bridge of communication. It represents the space where movement happens, the exchange of ideas, and the intellectual clarity that connects all things.",
        keywords: ["Intellect", "Connection", "Objectivity", "Flow"]
    },
    Water: {
        desc: "Water is the fluid depths of emotion and the intuitive flow of life. It represents the memory of existence, the nurturing tides of the soul, and the deep interconnectedness of all living beings.",
        keywords: ["Depth", "Intuition", "Healing", "Enigma"]
    }
};
