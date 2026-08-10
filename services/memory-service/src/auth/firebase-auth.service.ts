import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';

export interface VerifiedFirebaseToken {
  firebaseUid: string;
  userId: string;
}

@Injectable()
export class FirebaseAuthService {
  private initialized = false;

  constructor(private readonly configService: ConfigService) {}

  async verifyIdToken(idToken: string): Promise<VerifiedFirebaseToken> {
    this.ensureInitialized();

    try {
      const decoded = await admin.auth().verifyIdToken(idToken);
      const firebaseUid = decoded.uid;

      return {
        firebaseUid,
        userId: await this.resolveUserId(firebaseUid),
      };
    } catch {
      throw new UnauthorizedException('Invalid or expired Firebase ID token');
    }
  }

  private ensureInitialized(): void {
    if (this.initialized) {
      return;
    }

    const projectId = this.configService.get<string>('firebase.projectId');

    if (!projectId) {
      throw new Error('FIREBASE_PROJECT_ID is required for Firebase token verification');
    }

    if (!admin.apps.length) {
      admin.initializeApp({ projectId });
    }

    this.initialized = true;
  }

  /**
   * Maps Firebase uid to internal user id.
   * Until USER persistence lands, firebase uid is used as the internal user id.
   */
  private async resolveUserId(firebaseUid: string): Promise<string> {
    return firebaseUid;
  }
}
