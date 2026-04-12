/**
 * Copyright 2026 ResQ Software
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
 * Worker thread for LQIP generation.
 * Receives a WorkerTask, processes the image with sharp, and posts back
 * a WorkerResult or WorkerError.
 */

import { basename } from 'node:path';
import { parentPort } from 'node:worker_threads';
import sharp from 'sharp';

import type { WorkerMessage, WorkerTask } from './lqip.ts';

sharp.cache(false);

if (!parentPort) {
	throw new Error('lqip.worker.ts must be run as a worker thread');
}

parentPort.on('message', async (task: WorkerTask) => {
	try {
		const buf = await Bun.file(task.filePath).arrayBuffer();
		const img = sharp(buf);
		const { format } = await img.metadata();

		const lqipBuf = await img
			.resize({ width: task.width, height: task.height, fit: 'inside' })
			.toBuffer();

		const result: WorkerMessage = {
			ok: true,
			entry: {
				lqip: `data:image/${format};base64,${lqipBuf.toString('base64')}`,
				path: task.filePath,
				src: basename(task.filePath).replace(/\.[^.]+$/, ''),
				width: task.width,
				height: task.height,
			},
		};

		parentPort!.postMessage(result);
	} catch (err) {
		const error: WorkerMessage = {
			ok: false,
			error: err instanceof Error ? err.message : String(err),
			filePath: task.filePath,
		};

		parentPort!.postMessage(error);
	}
});
