import { Readable } from 'node:stream';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { ErrorCode } from '../../common/constants/error-codes';
import { AppException } from '../../common/exceptions/app.exception';
import { storageConfig } from '../../config/storage.config';
import type { StoredObject, UploadObjectInput } from './types/storage.types';

@Injectable()
export class StorageService {
  /** Null when no S3 settings are configured; storage calls then fail with 503. */
  private readonly client: S3Client | null;
  private readonly bucket: string;

  constructor(@Inject(storageConfig.KEY) config: ConfigType<typeof storageConfig>) {
    this.bucket = config.bucket;
    this.client = config.configured
      ? new S3Client({
          endpoint: config.endpoint,
          region: config.region,
          forcePathStyle: true,
          credentials: { accessKeyId: config.accessKey, secretAccessKey: config.secretKey },
        })
      : null;
  }

  async upload({ key, body, contentType }: UploadObjectInput): Promise<void> {
    await this.s3().send(
      new PutObjectCommand({ Bucket: this.bucket, Key: key, Body: body, ContentType: contentType }),
    );
  }

  async download(key: string): Promise<StoredObject> {
    const result = await this.s3().send(new GetObjectCommand({ Bucket: this.bucket, Key: key }));
    if (!(result.Body instanceof Readable)) {
      throw new AppException(ErrorCode.NOT_FOUND, 'File not found', HttpStatus.NOT_FOUND);
    }
    return {
      body: result.Body,
      contentType: result.ContentType,
      contentLength: result.ContentLength,
    };
  }

  async remove(key: string): Promise<void> {
    await this.s3().send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }

  private s3(): S3Client {
    if (!this.client) {
      throw new AppException(
        ErrorCode.SERVICE_UNAVAILABLE,
        'Document storage is not configured',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
    return this.client;
  }
}
