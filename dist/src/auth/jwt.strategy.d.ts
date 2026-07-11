import { ConfigService } from '@nestjs/config';
import { Strategy } from 'passport-jwt';
import { PrismaService } from '../prisma/prisma.service';
export interface JwtPayload {
    sub: string;
    email: string;
    role: string;
}
declare const JwtStrategy_base: new (...args: [opt: import("passport-jwt").StrategyOptionsWithRequest] | [opt: import("passport-jwt").StrategyOptionsWithoutRequest]) => Strategy & {
    validate(...args: any[]): unknown;
};
export declare class JwtStrategy extends JwtStrategy_base {
    private prisma;
    constructor(config: ConfigService, prisma: PrismaService);
    validate(payload: JwtPayload): Promise<{
        id: string;
        email: string;
        fullName: string;
        avatarUrl: string | null;
        role: import("@prisma/client").$Enums.UserRole;
        xp: number;
        level: number;
        streakDays: number;
        isPremium: boolean;
    }>;
}
export {};
