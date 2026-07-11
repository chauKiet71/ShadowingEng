import { DurationUnit, PackageStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
export interface PackagePayload {
    name: string;
    description?: string;
    price: number;
    duration: string;
    durationUnit?: DurationUnit;
    days?: number;
    months?: number;
    monthlyPrice?: number;
    originalPrice?: number | null;
    badge?: string | null;
    sortOrder?: number;
    icon?: string;
    status?: PackageStatus;
    isVisible?: boolean;
}
export declare class PackagesService {
    private prisma;
    constructor(prisma: PrismaService);
    private mapPackage;
    private resolveUnitPrice;
    findAll(params?: {
        status?: PackageStatus;
        visible?: boolean;
    }): Promise<{
        userCount: number;
    }[]>;
    findOne(id: string): Promise<{
        userCount: number;
    }>;
    create(data: PackagePayload): Promise<{
        status: import("@prisma/client").$Enums.PackageStatus;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
        price: number;
        duration: string;
        durationUnit: import("@prisma/client").$Enums.DurationUnit;
        days: number;
        months: number;
        monthlyPrice: number;
        originalPrice: number | null;
        badge: string | null;
        sortOrder: number;
        icon: string;
        isVisible: boolean;
        benefits: import("@prisma/client/runtime/client").JsonValue | null;
        limits: import("@prisma/client/runtime/client").JsonValue | null;
    }>;
    update(id: string, data: Partial<PackagePayload>): Promise<{
        status: import("@prisma/client").$Enums.PackageStatus;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
        price: number;
        duration: string;
        durationUnit: import("@prisma/client").$Enums.DurationUnit;
        days: number;
        months: number;
        monthlyPrice: number;
        originalPrice: number | null;
        badge: string | null;
        sortOrder: number;
        icon: string;
        isVisible: boolean;
        benefits: import("@prisma/client/runtime/client").JsonValue | null;
        limits: import("@prisma/client/runtime/client").JsonValue | null;
    }>;
    remove(id: string): Promise<{
        status: import("@prisma/client").$Enums.PackageStatus;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
        price: number;
        duration: string;
        durationUnit: import("@prisma/client").$Enums.DurationUnit;
        days: number;
        months: number;
        monthlyPrice: number;
        originalPrice: number | null;
        badge: string | null;
        sortOrder: number;
        icon: string;
        isVisible: boolean;
        benefits: import("@prisma/client/runtime/client").JsonValue | null;
        limits: import("@prisma/client/runtime/client").JsonValue | null;
    }>;
}
