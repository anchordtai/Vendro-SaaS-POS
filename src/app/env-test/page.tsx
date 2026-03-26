"use client";

import { useEffect, useState } from "react";

export default function EnvTest() {
  const [envVars, setEnvVars] = useState({});

  useEffect(() => {
    setEnvVars({
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "***SET***" : "NOT SET",
      NODE_ENV: process.env.NODE_ENV
    });
  }, []);

  return (
    <div style={{ padding: "20px", fontFamily: "monospace" }}>
      <h2>Environment Variables Test</h2>
      <pre>{JSON.stringify(envVars, null, 2)}</pre>
      
      {process.env.NEXT_PUBLIC_SUPABASE_URL?.includes("placeholder") && (
        <div style={{ color: "red", marginTop: "20px" }}>
          ❌ ISSUE: Still using placeholder URL! Check your .env.local file.
        </div>
      )}
      
      {process.env.NEXT_PUBLIC_SUPABASE_URL?.includes("vlksqjwupktmvypfmfur") && (
        <div style={{ color: "green", marginTop: "20px" }}>
          ✅ Environment variables are correctly loaded!
        </div>
      )}
      
      {!process.env.NEXT_PUBLIC_SUPABASE_URL && (
        <div style={{ color: "orange", marginTop: "20px" }}>
          ⚠️ Environment variables not found. Check your .env.local file.
        </div>
      )}
    </div>
  );
}
