import "dotenv/config";
import { db } from "@/lib/db";
import { encryptSecret } from "@/lib/crypto";

// UAT helper: a system-wide CONNECTED provider pointing at the local mock LLM,
// so queued tasks execute end-to-end without a paid API key.
async function main() {
  const baseUrl = "http://localhost:11434/v1";
  const existing = await db.providerConnection.findFirst({ where: { companyId: null, displayName: "UAT Mock LLM" } });
  const data = {
    providerType: "OPENAI" as const,
    displayName: "UAT Mock LLM",
    baseUrl,
    encryptedCredentials: encryptSecret("sk-uat-mock-key"),
    status: "CONNECTED" as const,
    lastTestedAt: new Date(),
  };
  if (existing) {
    await db.providerConnection.update({ where: { id: existing.id }, data });
    console.log("updated mock provider", existing.id);
  } else {
    const c = await db.providerConnection.create({ data: { companyId: null, ...data } });
    console.log("created mock provider", c.id);
  }
  await db.$disconnect();
}
main();
