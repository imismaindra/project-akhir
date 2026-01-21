import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50/50 dark:bg-gray-950/50 p-4">
      <div className="text-center space-y-6 max-w-2xl">
        <h1 className="text-5xl font-extrabold tracking-tight sm:text-6xl text-primary">
          Selamat Datang di <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">StatusShare</span>
        </h1>
        <p className="text-xl text-muted-foreground">
          Platform modern untuk berbagi aktivitas dan status Anda dengan aman dan cepat.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
          <Link href="/login">
            <Button size="lg" className="w-full sm:w-auto px-10 py-6 text-lg rounded-xl shadow-lg transition-all hover:scale-105">
              Login
            </Button>
          </Link>
          <Link href="/register">
            <Button size="lg" variant="outline" className="w-full sm:w-auto px-10 py-6 text-lg rounded-xl shadow-lg transition-all hover:scale-105 bg-white/50 dark:bg-gray-900/50">
              Daftar Sekarang
            </Button>
          </Link>
        </div>
      </div>
      
      {/* Visual background element */}
      <div className="absolute top-0 -z-10 h-full w-full bg-white dark:bg-gray-950">
        <div className="absolute bottom-auto left-auto right-0 top-0 h-[500px] w-[500px] -translate-x-[30%] translate-y-[20%] rounded-full bg-blue-500/10 opacity-50 blur-[80px]"></div>
        <div className="absolute bottom-0 left-0 right-auto top-auto h-[500px] w-[500px] translate-x-[30%] -translate-y-[20%] rounded-full bg-indigo-500/10 opacity-50 blur-[80px]"></div>
      </div>
    </div>
  );
}
