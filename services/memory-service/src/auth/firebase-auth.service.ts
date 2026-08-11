import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';
import { UsersService } from '../users/users.service';

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
      const decoded = await admin.auth().verifyIdToken(idToken);
      const { tenantId, userId } = await this.usersService.findOrCreateByFirebaseUid(
        decoded.uid,
        decoded.email,
      );

      return {
        firebaseUid: decoded.uid,
        tenantId,
        userId,
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
}
