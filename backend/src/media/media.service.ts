import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class MediaService {
  private s3: S3Client;
  private bucket: string;
  private publicUrl: string;

  constructor(private config: ConfigService) {
    const endpoint = config.get<string>('MINIO_ENDPOINT') || 'localhost';
    const port = config.get<number>('MINIO_PORT') || 9000;
    const useSsl = config.get<string>('MINIO_USE_SSL') === 'true';

    this.s3 = new S3Client({
      endpoint: `${useSsl ? 'https' : 'http'}://${endpoint}:${port}`,
      region: 'us-east-1',
      credentials: {
        accessKeyId: config.get<string>('MINIO_ACCESS_KEY') || 'minioadmin',
        secretAccessKey: config.get<string>('MINIO_SECRET_KEY') || 'minioadmin',
      },
      forcePathStyle: true,
    });

    this.bucket = config.get<string>('MINIO_BUCKET') || 'enjarole-media';
    this.publicUrl = config.get<string>('MINIO_PUBLIC_URL') || `http://localhost:9000/${this.bucket}`;
  }

  async getUploadUrl(filename: string, contentType: string) {
    const ext = filename.split('.').pop() || 'jpg';
    const key = `uploads/${uuidv4()}.${ext}`;

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(this.s3, command, { expiresIn: 3600 });
    const publicUrl = `${this.publicUrl}/${key}`;

    return { uploadUrl, publicUrl };
  }

  async uploadBuffer(buffer: Buffer, contentType: string, filename: string) {
    const ext = filename.split('.').pop() || 'jpg';
    const key = `uploads/${uuidv4()}.${ext}`;

    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType || 'application/octet-stream',
      }),
    );

    return { publicUrl: `${this.publicUrl}/${key}` };
  }
}
