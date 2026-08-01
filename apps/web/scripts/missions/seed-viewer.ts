import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

/** Seed the delivery VIEWER fixture so the RBAC E2E can actually run. */
const prisma = new PrismaClient();
(async () => {
  const email = "viewer@delivery.local";
  const passwordHash = await bcrypt.hash("viewer1234", 10);
  const user = await prisma.user.upsert({
    where: { email },
    update: { passwordHash },
    create: { email, name: "Delivery Viewer", passwordHash, globalRole: "USER" },
  });
  await prisma.deliveryMember.upsert({
    where: { userId: user.id }, update: { role: "VIEWER" }, create: { userId: user.id, role: "VIEWER" },
  });
  console.log(`viewer fixture: ${email} (deliveryRole=VIEWER, globalRole=${user.globalRole})`);
  await prisma.$disconnect();
})();
