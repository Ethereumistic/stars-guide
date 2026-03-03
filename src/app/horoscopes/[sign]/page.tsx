import { redirect } from "next/navigation";
import { format } from "date-fns";

export default async function SignRootPage({ params }: { params: Promise<{ sign: string }> }) {
    const { sign } = await params;

    // Calculate today's date in strict YYYY-MM-DD format
    const today = new Date();
    const todayStr = format(today, "yyyy-MM-dd");

    // Instantly redirect to the date-specific route
    redirect(`/horoscopes/${sign.toLowerCase()}/${todayStr}`);
}
