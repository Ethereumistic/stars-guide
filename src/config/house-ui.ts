export interface HouseUIConfig {
    id: number;
    themeColor: string;
}

// Minimal implementation to establish the domain split
export const houseUIConfig: Record<number, HouseUIConfig> = {
    1: { id: 1, themeColor: "var(--fire-primary)" },
    2: { id: 2, themeColor: "var(--earth-primary)" },
    3: { id: 3, themeColor: "var(--air-primary)" },
    4: { id: 4, themeColor: "var(--water-primary)" },
    5: { id: 5, themeColor: "var(--fire-secondary)" },
    6: { id: 6, themeColor: "var(--earth-secondary)" },
    7: { id: 7, themeColor: "var(--air-secondary)" },
    8: { id: 8, themeColor: "var(--water-secondary)" },
    9: { id: 9, themeColor: "var(--fire-primary)" },
    10: { id: 10, themeColor: "var(--earth-primary)" },
    11: { id: 11, themeColor: "var(--air-primary)" },
    12: { id: 12, themeColor: "var(--water-primary)" }
};
