// scripts/sync-plugin-mirror.mjs
// Phase 2 plugin mirror sync.
//
// One-time / on-demand operation: mirror the upstream WWV marketplace
// (registry, manifests, plugin bundles) into ./public/wwv-mirror/ so the
// running app can fetch everything from same-origin instead of unpkg.com.
//
// Run with: node scripts/sync-plugin-mirror.mjs
//
// Environment overrides:
//   WWV_MIRROR_SOURCE         upstream marketplace base URL
//                             (default: https://marketplace.worldwideview.dev)
//   WWV_MIRROR_LOCAL_BASE     base URL the app uses to reach the mirror
//                             (default: http://localhost:3010/wwv-mirror)
//   WWV_MIRROR_KEEP_NPM       keep manifest.npmPackage in mirrored manifests
//                             (default: false — stripped so the install /
//                             seed paths don't rewrite entry back to unpkg)
//
// This is the only Phase 2 operation that touches the public internet.
// Once the mirror is populated, runtime never reaches out.

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..");
const mirrorRoot = join(repoRoot, "public", "wwv-mirror");

const UPSTREAM = (process.env.WWV_MIRROR_SOURCE || "https://marketplace.worldwideview.dev").replace(/\/+$/, "");
const LOCAL_BASE = (process.env.WWV_MIRROR_LOCAL_BASE || "http://localhost:3010/wwv-mirror").replace(/\/+$/, "");
const KEEP_NPM = process.env.WWV_MIRROR_KEEP_NPM === "true";

const startedAt = new Date().toISOString();
const mirrorManifest = {
    syncedAt: startedAt,
    upstream: UPSTREAM,
    localBase: LOCAL_BASE,
    files: [],
};

function ensureDir(path) {
    mkdirSync(path, { recursive: true });
}

function sha256(buf) {
    return createHash("sha256").update(buf).digest("hex");
}

async function fetchBytes(url, label) {
    const res = await fetch(url, { redirect: "follow" });
    if (!res.ok) throw new Error(`${label} ${url} -> HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    return buf;
}

function record(localRelPath, upstreamUrl, buf) {
    mirrorManifest.files.push({
        local: `/wwv-mirror/${localRelPath.replaceAll("\\", "/")}`,
        upstream: upstreamUrl,
        bytes: buf.length,
        sha256: sha256(buf),
    });
}

async function writeFromUrl(upstreamUrl, localRelPath, label) {
    const buf = await fetchBytes(upstreamUrl, label);
    const target = join(mirrorRoot, localRelPath);
    ensureDir(dirname(target));
    writeFileSync(target, buf);
    record(localRelPath, upstreamUrl, buf);
    return buf;
}

ensureDir(mirrorRoot);
console.log(`[mirror-sync] upstream:   ${UPSTREAM}`);
console.log(`[mirror-sync] local base: ${LOCAL_BASE}`);
console.log(`[mirror-sync] writing to: ${mirrorRoot}`);

// 1. Mirror the signed registry (list of verified plugin IDs).
console.log("[mirror-sync] step 1: registry");
const registryBuf = await writeFromUrl(`${UPSTREAM}/api/registry`, "api/registry", "registry");
writeFileSync(join(mirrorRoot, "registry.json"), registryBuf);
record("registry.json", `${UPSTREAM}/api/registry`, registryBuf);
const registry = JSON.parse(registryBuf.toString("utf8"));
console.log(`  signed registry: ${registry.plugins.length} plugin IDs, issued ${registry.issuedAt}`);

// 2. Mirror /api/plugins — the array form used by check-updates route.
// Stored at api/plugins-index.json because Next.js static serving can't have
// the same path be both a file (the index) and a directory (per-id manifests).
// A rewrite in next.config.ts maps /wwv-mirror/api/plugins -> plugins-index.json.
console.log("[mirror-sync] step 2: plugin index");
const pluginsBuf = await writeFromUrl(`${UPSTREAM}/api/plugins`, "api/plugins-index.json", "plugins-index");
const pluginsArr = JSON.parse(pluginsBuf.toString("utf8"));
console.log(`  index: ${pluginsArr.length} plugin manifests`);

// 3. Per-plugin: manifest + bundle.
console.log("[mirror-sync] step 3: per-plugin manifests + bundles");
const failures = [];
const rewrittenManifests = [];

for (const pluginId of registry.plugins) {
    const upstreamManifestUrl = `${UPSTREAM}/api/plugins/${pluginId}`;
    try {
        const manifestBuf = await fetchBytes(upstreamManifestUrl, `manifest:${pluginId}`);
        const manifest = JSON.parse(manifestBuf.toString("utf8"));
        if (!manifest.id) manifest.id = pluginId;

        // Download the bundle if it's npm-distributed.
        if (manifest.npmPackage) {
            const ver = manifest.version || "1.0.0";
            const bundleUpstream = `https://unpkg.com/${manifest.npmPackage}@${ver}/dist/frontend.mjs`;
            const bundleLocalRel = `plugins/${manifest.npmPackage}@${ver}/dist/frontend.mjs`;
            try {
                await writeFromUrl(bundleUpstream, bundleLocalRel, `bundle:${pluginId}`);
                // Rewrite the manifest so the loader pulls from the mirror.
                manifest.entry = `${LOCAL_BASE}/${bundleLocalRel}`;
                manifest.format = "bundle";
                if (!KEEP_NPM) {
                    // Strip npmPackage so the install/seed paths don't
                    // overwrite manifest.entry with the unpkg URL again.
                    delete manifest.npmPackage;
                }
            } catch (bundleErr) {
                console.warn(`  bundle FAIL for ${pluginId}: ${bundleErr.message}`);
                failures.push({ pluginId, kind: "bundle", error: bundleErr.message });
                // Keep going — the manifest still mirrors even if the bundle isn't fetchable.
            }
        }

        // Save the (possibly-rewritten) manifest.
        const finalBuf = Buffer.from(JSON.stringify(manifest, null, 2));
        const manifestLocalRel = `api/plugins/${pluginId}`;
        const manifestTarget = join(mirrorRoot, manifestLocalRel);
        ensureDir(dirname(manifestTarget));
        writeFileSync(manifestTarget, finalBuf);
        record(manifestLocalRel, upstreamManifestUrl, finalBuf);
        rewrittenManifests.push({ pluginId, entry: manifest.entry, format: manifest.format });
        process.stdout.write(".");
    } catch (e) {
        console.warn(`\n  manifest FAIL for ${pluginId}: ${e.message}`);
        failures.push({ pluginId, kind: "manifest", error: e.message });
    }
}
process.stdout.write("\n");

// 4. Rewrite the /api/plugins index file so check-updates sees mirrored versions.
//    The index file is just the array form; we keep it as-is from upstream.
//    No rewrite needed here — version comparison still works.

mirrorManifest.completedAt = new Date().toISOString();
mirrorManifest.pluginCount = rewrittenManifests.length;
mirrorManifest.failures = failures;
writeFileSync(join(mirrorRoot, "mirror-manifest.json"), JSON.stringify(mirrorManifest, null, 2));

console.log("");
console.log(`[mirror-sync] done. wrote ${mirrorManifest.files.length} files, ${rewrittenManifests.length} plugins mirrored.`);
if (failures.length) {
    console.log(`[mirror-sync] ${failures.length} failures:`);
    for (const f of failures) console.log(`  - ${f.pluginId} (${f.kind}): ${f.error}`);
    process.exit(1);
}
