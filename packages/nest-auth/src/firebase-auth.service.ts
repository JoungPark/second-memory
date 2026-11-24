import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '@second-memory/server-db';
import * as admin from 'firebase-admin';

export interface VerifiedFirebaseToken {
  firebaseUid: string;
  tenantId: string;
  userId: string;
}

@Injectable()
export class FirebaseAuthService {
  private initialized = false;

  constructor(
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
  ) {}

  async verifyIdToken(idToken: string): Promise<VerifiedFirebaseToken> {
    this.ensureInitialized();

    try {
      return await this.resolveIdentity(idToken);
    } catch {
      throw new UnauthorizedException('Invalid or expired Firebase ID token');
    }
  }

  async resolveIdentity(idToken: string): Promise<VerifiedFirebaseToken> {
    this.ensureInitialized();
    const decoded = await this.decodeIdToken(idToken);
    const { tenantId, userId } = await this.usersService.findOrCreateByFirebaseUid(decoded.uid, decoded.email);
    return { firebaseUid: decoded.uid, tenantId, userId };
  }

  private async decodeIdToken(idToken: string): Promise<admin.auth.DecodedIdToken> {
    try {
      return await admin.auth().verifyIdToken(idToken);
    } catch (error) {
      const code = (error as { code?: string } | undefined)?.code;
      if (
        code === 'auth/argument-error' ||
        code === 'auth/id-token-expired' ||
        code === 'auth/invalid-id-token' ||
        code === 'auth/id-token-revoked'
      ) {
        throw new UnauthorizedException('Invalid or expired Firebase ID token');
      }
      throw error;
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
}
