import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { App, cert, getApps, initializeApp } from 'firebase-admin/app';
import { DecodedIdToken, getAuth } from 'firebase-admin/auth';

@Injectable()
export class FirebaseAdminService {
  private app: App | null = null;

  constructor(private readonly configService: ConfigService) {}

  verifyIdToken(idToken: string): Promise<DecodedIdToken> {
    return getAuth(this.getApp()).verifyIdToken(idToken);
  }

  // Lazy: building the credential eagerly (e.g. in onModuleInit) would crash
  // the whole API at boot if FIREBASE_* env vars aren't set yet, taking down
  // every other module along with it. Deferring means only firebase login
  // requests fail until it's configured.
  private getApp(): App {
    if (this.app) {
      return this.app;
    }

    const existingApps = getApps();
    if (existingApps.length > 0) {
      this.app = existingApps[0];
      return this.app;
    }

    const projectId = this.configService.get<string>('FIREBASE_PROJECT_ID');
    const clientEmail = this.configService.get<string>('FIREBASE_CLIENT_EMAIL');
    const privateKey = this.configService.get<string>('FIREBASE_PRIVATE_KEY')?.replace(/\\n/g, '\n');
    if (!projectId || !clientEmail || !privateKey) {
      throw new ServiceUnavailableException('Firebase phone login is not configured on this environment');
    }

    this.app = initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
    return this.app;
  }
}
