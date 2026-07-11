import { PackageStatus } from '@prisma/client';
import { PackagesService } from './packages.service';
import type { PackagePayload } from './packages.service';
export declare class PackagesController {
    private packagesService;
    constructor(packagesService: PackagesService);
    findAll(status?: PackageStatus, visible?: string): Promise<{
        userCount: number;
    }[]>;
    findOne(id: string): Promise<{
        userCount: number;
    }>;
    create(body: PackagePayload): Promise<{
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
    update(id: string, body: Partial<PackagePayload>): Promise<{
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
