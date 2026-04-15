"use client"

export function GalacticGlow() {
    return (
        <div
            className="absolute top-[-30%] left-1/2 -translate-x-1/2 w-[150vw] h-[150vh] opacity-7 mix-blend-screen pointer-events-none blur-3xl"
            style={{
                background: `radial-gradient(circle at center, var(--galactic) 0%, transparent 60%)`
            }}
        />
    )
}
