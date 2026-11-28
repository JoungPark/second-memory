import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { ResolveIdentityResponse } from '@second-memory/shared-types';
import * as admin from 'firebase-admin';
import { UsersService } from './postgres/users.service';

@Injectable()
export class FirebaseAuthService {
  private initialized = false;

  constructor(
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
  ) {}

  async resolveIdentity(idToken: string): Promise<ResolveIdentityResponse> {
    this.ensureInitialized();
    const decoded = await this.decodeIdToken(idToken);
    return this.usersService.findOrCreateByFirebaseUid(decoded.uid, decoded.email);
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
