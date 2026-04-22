"use client";

export default function JournalSearchPage() {
    return (
        <div>
            <div className="mb-6">
                <h1 className="text-2xl font-serif font-bold text-white/90">Search</h1>
                <p className="mt-1 text-sm text-white/40">Find entries by mood, tag, date, or content</p>
            </div>

            <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="text-4xl mb-4">🔍</div>
                <h3 className="text-lg font-serif font-semibold text-white/60">Coming Soon</h3>
                <p className="text-sm text-white/30 mt-1 max-w-xs">
                    Full-text search with filters for mood zone, entry type, tags, date range, and moon phase.
                </p>
            </div>
        </div>
    );
}