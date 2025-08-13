import fetch from "node-fetch";

const SANDBOX_URL = "http://localhost:5000";

export async function startSandboxRun(args: {
  jobId: string;
  language: "js" | "ts" | "py";
  source: string;
}) {
  try {
    const res = await fetch(`${SANDBOX_URL}/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(args),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("sandbox /run failed:", res.status, text);
    }
  } catch (error) {
    console.error("sandbox /run error:", error);
  }
}
