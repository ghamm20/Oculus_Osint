// One-shot owner provisioning for Phase 1 verification.
// Mirrors the /setup server action exactly: bcryptjs.hashSync + prisma.user.create.
// Reads OWNER_NAME / OWNER_EMAIL / OWNER_PASSWORD / DATABASE_URL from env.
import fs from "node:fs";
import { PrismaClient } from "../src/generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";
import pkg from "pg";
const { Pool } = pkg;
import { hashSync } from "bcryptjs";

// Inherit DATABASE_URL from .env / .env.local if not set.
function loadEnv(file) {
    if (!fs.existsSync(file)) return;
    for (const line of fs.readFileSync(file, "utf8").split("\n")) {
        const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
        if (!m) continue;
        let v = m[2] || "";
        if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
        if (!process.env[m[1]]) process.env[m[1]] = v;
    }
}
loadEnv(".env");
loadEnv(".env.local");

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const name = process.env.OWNER_NAME || "Owner";
const email = process.env.OWNER_EMAIL || "owner@oculus.local";
const password = process.env.OWNER_PASSWORD || "oculusphase1!";

const existing = await prisma.user.count();
if (existing > 0) {
    const e = await prisma.user.findFirst();
    console.log(`Existing user found (${e.email}). Skipping create.`);
} else {
    const hashedPassword = hashSync(password, 12);
    const u = await prisma.user.create({
        data: { name, email, hashedPassword, role: "admin" },
    });
    console.log(`Created owner: ${u.email} (id=${u.id}, role=${u.role})`);
}

await prisma.$disconnect();
await pool.end();
