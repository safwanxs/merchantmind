import Navbar from "@/components/shared/Navbar";
import DashboardClient from "@/components/dashboard/DashboardClient";

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-canvas">
      <Navbar />

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
        <DashboardClient />
      </main>
    </div>
  );
}

