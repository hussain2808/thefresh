import { UnauthorizedException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { AuthService } from './auth.service';

// AuthService's constructor references FirebaseAdminService's type for Nest's decorator
// metadata, which forces this import to exist at runtime. Auto-mock it so the real
// firebase-admin SDK (which pulls in an ESM-only `jose` dependency jest can't parse) never loads.
jest.mock('./firebase/firebase-admin.service', () => ({ FirebaseAdminService: jest.fn() }));

function buildUser(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'user-1',
    email: null,
    phone: '+971500000000',
    passwordHash: null,
    firebaseUid: null,
    name: 'Customer',
    role: UserRole.CUSTOMER,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('AuthService', () => {
  let usersService: {
    findByEmail: jest.Mock;
    findByPhone: jest.Mock;
    findByFirebaseUid: jest.Mock;
    findById: jest.Mock;
    linkFirebaseUid: jest.Mock;
    create: jest.Mock;
  };
  let jwtService: { sign: jest.Mock };
  let configService: { get: jest.Mock };
  let firebaseAdminService: { verifyIdToken: jest.Mock };
  let prisma: {
    refreshToken: {
      findUnique: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
      create: jest.Mock;
    };
  };
  let authService: AuthService;

  beforeEach(() => {
    usersService = {
      findByEmail: jest.fn(),
      findByPhone: jest.fn(),
      findByFirebaseUid: jest.fn(),
      findById: jest.fn(),
      linkFirebaseUid: jest.fn(),
      create: jest.fn(),
    };
    jwtService = { sign: jest.fn().mockReturnValue('signed.access.token') };
    configService = {
      get: jest.fn((_key: string, fallback?: string) => fallback),
    };
    firebaseAdminService = { verifyIdToken: jest.fn() };
    prisma = {
      refreshToken: {
        findUnique: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        create: jest.fn().mockResolvedValue(undefined),
      },
    };

    authService = new AuthService(
      usersService as any,
      jwtService as any,
      configService as any,
      firebaseAdminService as any,
      prisma as any,
    );
  });

  describe('loginWithFirebase', () => {
    it('creates a new CUSTOMER user when no match exists by uid or phone', async () => {
      firebaseAdminService.verifyIdToken.mockResolvedValue({ uid: 'fb-uid-1', phone_number: '+971500000000' });
      usersService.findByFirebaseUid.mockResolvedValue(null);
      usersService.findByPhone.mockResolvedValue(null);
      const created = buildUser({ firebaseUid: 'fb-uid-1' });
      usersService.create.mockResolvedValue(created);

      const result = await authService.loginWithFirebase('valid-id-token');

      expect(usersService.create).toHaveBeenCalledWith(
        expect.objectContaining({ phone: '+971500000000', firebaseUid: 'fb-uid-1', role: UserRole.CUSTOMER }),
      );
      expect(result.user.id).toBe(created.id);
      expect(result.accessToken).toBe('signed.access.token');
      expect(prisma.refreshToken.create).toHaveBeenCalled();
    });

    it('links the firebase uid to an existing phone-matched account instead of creating a duplicate', async () => {
      firebaseAdminService.verifyIdToken.mockResolvedValue({ uid: 'fb-uid-2', phone_number: '+971500000001' });
      const existing = buildUser({ id: 'user-2', phone: '+971500000001', firebaseUid: null });
      usersService.findByFirebaseUid.mockResolvedValue(null);
      usersService.findByPhone.mockResolvedValue(existing);
      usersService.linkFirebaseUid.mockResolvedValue({ ...existing, firebaseUid: 'fb-uid-2' });

      const result = await authService.loginWithFirebase('valid-id-token');

      expect(usersService.create).not.toHaveBeenCalled();
      expect(usersService.linkFirebaseUid).toHaveBeenCalledWith('user-2', 'fb-uid-2');
      expect(result.user.id).toBe('user-2');
    });

    it('rejects a firebase token that has no verified phone number', async () => {
      firebaseAdminService.verifyIdToken.mockResolvedValue({ uid: 'fb-uid-3', phone_number: undefined });

      await expect(authService.loginWithFirebase('valid-id-token')).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('refresh', () => {
    it('rejects an unknown or revoked/expired refresh token', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue(null);

      await expect(authService.refresh('bogus-token')).rejects.toThrow(UnauthorizedException);

      prisma.refreshToken.findUnique.mockResolvedValue({
        id: 'rt-1',
        userId: 'user-1',
        revokedAt: new Date(),
        expiresAt: new Date(Date.now() + 1_000_000),
      });
      await expect(authService.refresh('revoked-token')).rejects.toThrow(UnauthorizedException);

      prisma.refreshToken.findUnique.mockResolvedValue({
        id: 'rt-2',
        userId: 'user-1',
        revokedAt: null,
        expiresAt: new Date(Date.now() - 1_000),
      });
      await expect(authService.refresh('expired-token')).rejects.toThrow(UnauthorizedException);
    });

    it('rotates a valid refresh token: revokes the old one and issues a new pair', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue({
        id: 'rt-3',
        userId: 'user-1',
        revokedAt: null,
        expiresAt: new Date(Date.now() + 1_000_000),
      });
      usersService.findById.mockResolvedValue(buildUser());

      const result = await authService.refresh('valid-refresh-token');

      expect(prisma.refreshToken.update).toHaveBeenCalledWith({
        where: { id: 'rt-3' },
        data: { revokedAt: expect.any(Date) },
      });
      expect(prisma.refreshToken.create).toHaveBeenCalled();
      expect(result.accessToken).toBe('signed.access.token');
      expect(typeof result.refreshToken).toBe('string');
      expect(result.refreshToken).not.toBe('valid-refresh-token');
    });
  });

  describe('login', () => {
    it('rejects an account that has no password set (e.g. a firebase-only account)', async () => {
      usersService.findByEmail.mockResolvedValue(buildUser({ email: 'a@b.com', passwordHash: null }));

      await expect(authService.login({ email: 'a@b.com', password: 'whatever' })).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
