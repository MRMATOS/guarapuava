"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import { Key } from "@/components/ui/Key";

export function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    try {
      setLoading(true);
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL ||
          "https://ufjvqciyrtpfpetpgavf.supabase.co",
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
      );
      await supabase.auth.signOut();
      router.push("/");
      router.refresh();
    } catch {
      window.location.href = "/auth/logout";
    }
  };

  return (
    <Key
      type="button"
      onClick={handleLogout}
      disabled={loading}
      className="px-3 text-[13px] font-semibold text-coral hover:text-coral-deep"
      title="Encerrar sessão de administrador"
    >
      {loading ? "Saindo..." : "Sair"}
    </Key>
  );
}
