import type { Readable } from 'node:stream';

export interface StoredObject {
  body: Readable;
  contentType: string | undefined;
  contentLength: number | undefined;
}

export interface UploadObjectInput {
  key: string;
  body: Buffer;
  contentType: string;
}
