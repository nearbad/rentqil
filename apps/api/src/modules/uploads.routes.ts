import { createWriteStream } from 'node:fs';
import { mkdir, unlink } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { pipeline } from 'node:stream/promises';
import path from 'node:path';
import type { FastifyInstance } from 'fastify';
import { errors } from '../lib/errors';
import { config } from '../config';

export const UPLOAD_DIR = path.resolve(process.cwd(), 'uploads');

const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

// venue photos land on the api disk (a docker volume in prod) and are
// served back from /uploads. Object storage can replace this later
// without touching the clients, they only ever see urls
export async function uploadsRoutes(app: FastifyInstance) {
  app.post('/uploads', { preHandler: app.requireRole('owner', 'admin') }, async (req) => {
    const file = await req.file();
    if (!file) throw errors.validation({ file: 'expected a multipart file field' });

    const ext = EXT_BY_MIME[file.mimetype];
    if (!ext) throw errors.validation({ file: 'only jpeg, png or webp images' });

    await mkdir(UPLOAD_DIR, { recursive: true });
    const name = randomBytes(12).toString('hex') + ext;
    const target = path.join(UPLOAD_DIR, name);
    await pipeline(file.file, createWriteStream(target));

    if (file.file.truncated) {
      // the multipart size limit chopped it, do not keep the partial file
      await unlink(target).catch(() => {});
      throw errors.validation({ file: 'image is larger than 5mb' });
    }

    return { url: `${config.publicApiUrl}/uploads/${name}` };
  });
}
