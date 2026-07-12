#!/usr/bin/env bun

/**
 * Copyright 2026 ResQ Systems, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * LQIP (Low-Quality Image Placeholder) generator.
 *
 * Scans a directory for raster images and produces base64 data-URL
 * placeholders using a fixed-size worker pool for CPU-bound sharp work.
 *
 * Usage:
 *   bun scripts/lqip.ts <directory> <width>x<height> [--out <file>] [--concurrency <n>] [--batch <n>] [--sync]
 *
 * Examples:
 *   bun scripts/lqip.ts design/assets/images/png 15x15
 *   bun scripts/lqip.ts design/assets/images/png 15x15 --out design/assets/lqip.json
 *   bun scripts/lqip.ts design/assets/images/png 15x15 --out design/assets/lqip.json --sync
 *   bun scripts/lqip.ts design/assets/images/png 15x15 --concurrency 4 --batch 8
 */

import { Glob, file as bunFile } from "bun";
import { existsSync } from "node:fs";
import { cpus } from "node:os";
import { basename, resolve, relative } from "node:path";
import { Worker } from "node:worker_threads";

// ── Types ───────────────────────────────────────────────────────────────

interface LqipEntry {
	/** Base64 data URL of the low-quality placeholder. */
	lqip: string;
	/** Original file path. */
	path: string;
	/** Stem of the filename (no extension, no directory). */
	src: string;
	/** Placeholder width in pixels. */
	width: number;
	/** Placeholder height in pixels. */
	height: number;
}

/** Message sent to a worker. */
interface WorkerTask {
	filePath: string;
	storePath: string;
	width: number;
	height: number;
}

/** Message received from a worker. */
interface WorkerResult {
	ok: true;
	entry: LqipEntry;
}

interface WorkerError {
	ok: false;
	error: string;
	filePath: string;
}

type WorkerMessage = WorkerResult | WorkerError;

const IMAGE_EXTENSIONS = ["**/*.png", "**/*.jpg", "**/*.jpeg", "**/*.webp"] as const;

// ── Worker Pool ─────────────────────────────────────────────────────────

/**
 * Fixed-size pool of worker threads that process LQIP tasks.
 * Tasks are distributed round-robin; each worker processes one image at a time.
 */
class WorkerPool {
	private workers: Worker[] = [];
	private idleWorkers: Worker[] = [];
	private queue: Array<{
		task: WorkerTask;
		resolve: (msg: WorkerMessage) => void;
	}> = [];

	constructor(workerPath: string, poolSize: number) {
		for (let i = 0; i < poolSize; i++) {
			const w = new Worker(workerPath);
			this.workers.push(w);
			this.idleWorkers.push(w);
		}
	}

	/** Submit a task and get back a promise for the result. */
	submit(task: WorkerTask): Promise<WorkerMessage> {
		return new Promise((res) => {
			this.queue.push({ task, resolve: res });
			this.drain();
		});
	}

	/** Try to dispatch queued tasks to idle workers. */
	private drain(): void {
		while (this.queue.length > 0 && this.idleWorkers.length > 0) {
			const job = this.queue.shift()!;
			const worker = this.idleWorkers.pop()!;

			const handler = (msg: WorkerMessage) => {
				worker.off("message", handler);
				this.idleWorkers.push(worker);
				job.resolve(msg);
				this.drain();
			};

			worker.on("message", handler);
			worker.postMessage(job.task);
		}
	}

	/** Terminate all workers. */
	async shutdown(): Promise<void> {
		await Promise.all(this.workers.map((w) => w.terminate()));
		this.workers = [];
		this.idleWorkers = [];
	}
}

// ── Discovery ───────────────────────────────────────────────────────────

/** Discover image files in `dir` matching common raster extensions. */
async function discoverImages(dir: string): Promise<string[]> {
	const paths: string[] = [];

	for (const pattern of IMAGE_EXTENSIONS) {
		const glob = new Glob(pattern);
		for await (const file of glob.scan({ cwd: dir, absolute: true })) {
			paths.push(file);
		}
	}

	return paths.sort();
}

// ── Sync / Self-Healing ─────────────────────────────────────────────────

/** Load an existing LQIP JSON file, returning [] if it doesn't exist or is invalid. */
async function loadExistingLqip(outPath: string): Promise<LqipEntry[]> {
	if (!existsSync(outPath)) return [];

	try {
		const raw = await bunFile(outPath).text();
		const data: unknown = JSON.parse(raw);
		if (Array.isArray(data)) return data as LqipEntry[];

		const entries: LqipEntry[] = [];
		if (data && typeof data === "object") {
			for (const obj of Object.values(data)) {
				if (obj && typeof obj === "object") {
					for (const entry of Object.values(obj)) {
						entries.push(entry as LqipEntry);
					}
				}
			}
		}
		return entries;
	} catch {
		console.error(`⚠ Could not parse existing LQIP file: ${outPath}`);
		return [];
	}
}

interface SyncResult {
	/** Existing entries whose paths still exist on disk. */
	retained: LqipEntry[];
	/** Entries removed because the path no longer exists. */
	stale: LqipEntry[];
	/** New image paths not present in the existing data. */
	newPaths: string[];
}

/**
 * Diff existing LQIP entries against discovered image paths on disk.
 * Dimension-aware: only entries matching the current `width×height` are
 * considered for retain/prune. Entries at other dimensions are left untouched.
 */
function syncLqip(
	existingEntries: LqipEntry[],
	discoveredPaths: string[],
	width: number,
	height: number,
): SyncResult {
	const diskSet = new Set(discoveredPaths);

	// Partition existing entries by whether they match the current dimensions
	const sameDim: LqipEntry[] = [];
	const otherDim: LqipEntry[] = [];

	for (const entry of existingEntries) {
		if (entry.width === width && entry.height === height) {
			sameDim.push(entry);
		} else {
			otherDim.push(entry);
		}
	}

	const retained: LqipEntry[] = [];
	const stale: LqipEntry[] = [];

	for (const entry of sameDim) {
		if (diskSet.has(entry.path)) {
			retained.push(entry);
		} else {
			stale.push(entry);
		}
	}

	// Build set of paths already covered at this dimension
	const existingPathsAtDim = new Set(sameDim.map((e) => e.path));
	const newPaths = discoveredPaths.filter((p) => !existingPathsAtDim.has(p));

	// Entries at other dimensions are always retained (untouched)
	retained.push(...otherDim);

	return { retained, stale, newPaths };
}

// ── Batch helpers ───────────────────────────────────────────────────────

/** Split an array into chunks of `size`. */
function chunk<T>(arr: T[], size: number): T[][] {
	const out: T[][] = [];
	for (let i = 0; i < arr.length; i += size) {
		out.push(arr.slice(i, i + size));
	}
	return out;
}

/** Write LqipEntry array to disk as a 2D object for dot-notation access */
async function writeLqipFile(entries: LqipEntry[], outPath: string) {
	// Sort to ensure stable output
	const sorted = [...entries].sort((a, b) => a.path.localeCompare(b.path));

	const outObj: Record<string, Record<string, LqipEntry>> = {};
	const camelMap = new Map<string, string>();

	for (const entry of sorted) {
		const parts = entry.path.split("/");
		const filename = parts[parts.length - 1];

		// Convert filename (e.g. icon-dark-32x32.png) to camelCase (e.g. iconDark32x32Png)
		let camelName = filename
			.replace(/[-_.]([a-z0-9])/gi, (g) => g[1].toUpperCase())
			.replace(/[^a-zA-Z0-9]/g, "");

		// Valid identifiers can't start with a number
		if (/^[0-9]/.test(camelName)) {
			camelName = `img${camelName}`;
		}

		const dimKey = `x${entry.width}`;

		if (camelMap.has(camelName) && camelMap.get(camelName) !== entry.path) {
			console.error(
				`COLLISION DETECTED: ${camelName} -> ${camelMap.get(camelName)} AND ${entry.path}`,
			);
		}
		camelMap.set(camelName, entry.path);

		if (!outObj[camelName]) outObj[camelName] = {};
		outObj[camelName][dimKey] = entry;
	}

	const json = JSON.stringify(outObj, null, "\t");
	await Bun.write(outPath, json);
}

// ── CLI ─────────────────────────────────────────────────────────────────

if (import.meta.main) {
	const start = performance.now();
	const args = process.argv.slice(2);

	// Parse flags
	function flag(name: string, fallback: string): string {
		const idx = args.indexOf(name);
		if (idx === -1) return fallback;
		return args.splice(idx, 2)[1] ?? fallback;
	}

	function boolFlag(name: string): boolean {
		const idx = args.indexOf(name);
		if (idx === -1) return false;
		args.splice(idx, 1);
		return true;
	}

	const outPath = flag("--out", "");
	const concurrency = Number(flag("--concurrency", String(cpus().length)));
	const batchSize = Number(flag("--batch", "32"));
	const syncMode = boolFlag("--sync");

	const [directory, dimensions] = args;

	if (!directory || !dimensions) {
		console.error(
			"Usage: bun scripts/lqip.ts <directory> <width>x<height> [--out <file>] [--concurrency <n>] [--batch <n>] [--sync]",
		);
		process.exit(1);
	}

	if (syncMode && !outPath) {
		console.error("--sync requires --out <file> to read/write the existing LQIP data");
		process.exit(1);
	}

	const [w, h] = dimensions.split("x").map(Number);

	if (!w || !h || Number.isNaN(w) || Number.isNaN(h)) {
		console.error("Dimensions must be <width>x<height>, e.g. 15x15");
		process.exit(1);
	}

	const dir = resolve(directory);
	const images = await discoverImages(dir);

	if (images.length === 0) {
		console.error(`No images found in ${dir}`);
		process.exit(1);
	}

	const designDir = resolve("design");
	const imagesMap = images.map((absPath) => ({
		absolutePath: absPath,
		storePath: `./${relative(designDir, absPath).replace(/\\/g, "/")}`,
	}));
	const storePaths = imagesMap.map((img) => img.storePath);
	const storeToAbs = new Map(imagesMap.map((img) => [img.storePath, img.absolutePath]));

	// ── Sync mode: diff existing data against disk ────────────────────────
	let imagesToProcess: { filePath: string; storePath: string }[];
	let retainedEntries: LqipEntry[] = [];

	if (syncMode) {
		const existing = await loadExistingLqip(outPath);
		const { retained, stale, newPaths } = syncLqip(existing, storePaths, w, h);

		retainedEntries = retained;
		imagesToProcess = newPaths.map((sp) => ({ filePath: storeToAbs.get(sp)!, storePath: sp }));

		if (stale.length > 0) {
			console.error(`\n🗑  Pruning ${stale.length} stale entries:`);
			for (const entry of stale) {
				console.error(`   ${entry.src} → ${entry.path}`);
			}
		}

		console.error(`\n📊 Sync summary:`);
		console.error(`   Retained: ${retained.length}`);
		console.error(`   Pruned:   ${stale.length}`);
		console.error(`   New:      ${newPaths.length}`);

		if (newPaths.length === 0) {
			// Nothing new to process — just write the retained set (stale removed)
			await writeLqipFile(retained, outPath);

			const elapsed = ((performance.now() - start) / 1000).toFixed(2);
			console.error(
				`\nDone in ${elapsed}s — ${retained.length} entries (no new images to process)`,
			);
			process.exit(0);
		}
	} else {
		imagesToProcess = imagesMap.map((img) => ({
			filePath: img.absolutePath,
			storePath: img.storePath,
		}));
	}

	// ── Process images ────────────────────────────────────────────────────
	const poolSize = Math.min(concurrency, imagesToProcess.length);
	console.error(
		`\nProcessing ${imagesToProcess.length} images (pool: ${poolSize} workers, batch: ${batchSize})`,
	);

	const workerPath = new URL("./lqip.worker.ts", import.meta.url).pathname;
	const pool = new WorkerPool(workerPath, poolSize);

	const newResults: LqipEntry[] = [];
	const errors: string[] = [];
	let processed = 0;

	// Process in batches to control memory pressure on large directories
	const batches = chunk(imagesToProcess, batchSize);

	for (const batch of batches) {
		const batchResults = await Promise.all(
			batch.map((img) =>
				pool.submit({ filePath: img.filePath, storePath: img.storePath, width: w, height: h }),
			),
		);

		for (const msg of batchResults) {
			processed++;
			if (msg.ok) {
				newResults.push(msg.entry);
			} else {
				errors.push(`✗ ${basename(msg.filePath)}: ${msg.error}`);
				console.error(errors[errors.length - 1]);
			}
		}

		// Progress on stderr so stdout stays clean for JSON piping
		console.error(
			`  ${processed}/${imagesToProcess.length} (${Math.round((processed / imagesToProcess.length) * 100)}%)`,
		);
	}

	await pool.shutdown();

	// Merge retained (sync mode) with newly generated entries
	const results = [...retainedEntries, ...newResults];

	if (outPath) {
		await writeLqipFile(results, outPath);
		console.error(`Wrote ${results.length} entries → ${outPath}`);
	} else {
		console.log(JSON.stringify(results, null, "\t"));
	}

	const elapsed = ((performance.now() - start) / 1000).toFixed(2);
	console.error(
		`Done in ${elapsed}s — ${newResults.length} new, ${retainedEntries.length} retained, ${errors.length} failed`,
	);

	if (errors.length > 0) process.exit(2);
}

export { WorkerPool, discoverImages, loadExistingLqip, syncLqip };
export type { LqipEntry, SyncResult, WorkerMessage, WorkerTask };
