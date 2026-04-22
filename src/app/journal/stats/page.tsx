"use client";

export default function JournalStatsPage() {
    return (
        <div>
            <div className="mb-6">
                <h1 className="text-2xl font-serif font-bold text-white/90">Stats</h1>
                <p className="mt-1 text-sm text-white/40">Mood trends, emotion patterns, and astro correlations</p>
            </div>

            <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="text-4xl mb-4">📊</div>
                <h3 className="text-lg font-serif font-semibold text-white/60">Coming Soon</h3>
                <p className="text-sm text-white/30 mt-1 max-w-xs">
                    Mood trend charts, emotion heatmaps, entry frequency, and insights about your emotional patterns and astrology correlations.
                </p>
            </div>
        </div>
    );
}