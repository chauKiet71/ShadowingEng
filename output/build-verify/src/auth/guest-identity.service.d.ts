import { PrismaService } from '../prisma/prisma.service';
export declare const GUEST_EMAIL_SUFFIX = "@guest.hihienglish.local";
export declare class GuestIdentityService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    resolveUserId(authenticatedUser: {
        id: string;
    } | null | undefined, guestToken: string | undefined): Promise<string>;
}
