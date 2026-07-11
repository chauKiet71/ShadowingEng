"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcrypt = __importStar(require("bcrypt"));
const prisma = new client_1.PrismaClient();
async function main() {
    const hashedPassword = await bcrypt.hash('admin123', 10);
    await prisma.user.upsert({
        where: { email: 'admin@shadowing.com' },
        update: {},
        create: {
            email: 'admin@shadowing.com',
            fullName: 'Admin',
            password: hashedPassword,
            role: 'ADMIN',
            isPremium: true,
            xp: 5000,
            level: 10,
            streakDays: 30,
        },
    });
    const packages = await Promise.all([
        prisma.package.upsert({
            where: { id: 'pkg-1m' },
            update: {
                name: '1 Tháng',
                description: 'Gói Premium 1 tháng',
                price: 99000,
                duration: '1 tháng',
                months: 1,
                monthlyPrice: 99000,
                originalPrice: null,
                badge: null,
                sortOrder: 0,
                icon: 'crown',
                status: client_1.PackageStatus.ACTIVE,
                isVisible: true,
            },
            create: {
                id: 'pkg-1m',
                name: '1 Tháng',
                description: 'Gói Premium 1 tháng',
                price: 99000,
                duration: '1 tháng',
                months: 1,
                monthlyPrice: 99000,
                icon: 'crown',
                status: client_1.PackageStatus.ACTIVE,
                isVisible: true,
                sortOrder: 0,
            },
        }),
        prisma.package.upsert({
            where: { id: 'pkg-3m' },
            update: {
                name: '3 Tháng',
                description: 'Gói Premium 3 tháng',
                price: 207000,
                duration: '3 tháng',
                months: 3,
                monthlyPrice: 69000,
                originalPrice: 297000,
                badge: 'Tiết kiệm 33%',
                sortOrder: 1,
                icon: 'crown',
                status: client_1.PackageStatus.ACTIVE,
                isVisible: true,
            },
            create: {
                id: 'pkg-3m',
                name: '3 Tháng',
                description: 'Gói Premium 3 tháng',
                price: 207000,
                duration: '3 tháng',
                months: 3,
                monthlyPrice: 69000,
                originalPrice: 297000,
                badge: 'Tiết kiệm 33%',
                icon: 'crown',
                status: client_1.PackageStatus.ACTIVE,
                isVisible: true,
                sortOrder: 1,
            },
        }),
        prisma.package.upsert({
            where: { id: 'pkg-12m' },
            update: {
                name: '12 Tháng',
                description: 'Gói Premium 12 tháng',
                price: 588000,
                duration: '12 tháng',
                months: 12,
                monthlyPrice: 49000,
                originalPrice: 1188000,
                badge: 'Tiết kiệm 50%',
                sortOrder: 2,
                icon: 'crown',
                status: client_1.PackageStatus.ACTIVE,
                isVisible: true,
            },
            create: {
                id: 'pkg-12m',
                name: '12 Tháng',
                description: 'Gói Premium 12 tháng',
                price: 588000,
                duration: '12 tháng',
                months: 12,
                monthlyPrice: 49000,
                originalPrice: 1188000,
                badge: 'Tiết kiệm 50%',
                icon: 'crown',
                status: client_1.PackageStatus.ACTIVE,
                isVisible: true,
                sortOrder: 2,
            },
        }),
    ]);
    const categories = await Promise.all([
        prisma.category.create({
            data: {
                name: 'Du lịch & Khám phá',
                description: 'Khám phá thế giới qua tiếng Anh',
                icon: '🏔️',
                iconColor: 'bg-green-500',
                lessonCount: 28,
                isPopular: true,
            },
        }),
        prisma.category.create({
            data: {
                name: 'Cuộc sống hằng ngày',
                description: 'Giao tiếp trong đời sống thường nhật',
                icon: '🎧',
                iconColor: 'bg-purple-500',
                lessonCount: 35,
                isPopular: true,
            },
        }),
        prisma.category.create({
            data: {
                name: 'Công việc & Sự nghiệp',
                description: 'Tiếng Anh chuyên nghiệp',
                icon: '💼',
                iconColor: 'bg-teal-500',
                lessonCount: 22,
                isPopular: true,
            },
        }),
    ]);
    const lesson = await prisma.lesson.create({
        data: {
            title: 'Never Give Up',
            description: 'Motivational speech about perseverance',
            duration: 45,
            level: client_1.LessonLevel.INTERMEDIATE,
            topic: 'Motivation',
            categoryId: categories[0].id,
            isFeatured: true,
            transcripts: {
                create: [
                    {
                        orderIndex: 0,
                        englishText: 'Today is hard.',
                        vietnamese: 'Hôm nay thật khó khăn.',
                        startTime: 0,
                        endTime: 3,
                    },
                    {
                        orderIndex: 1,
                        englishText: 'Tomorrow will be worse.',
                        vietnamese: 'Ngày mai sẽ còn tệ hơn.',
                        startTime: 3,
                        endTime: 6,
                    },
                    {
                        orderIndex: 2,
                        englishText: 'But the day after tomorrow will be sunshine.',
                        vietnamese: 'Nhưng ngày kia sẽ có nắng.',
                        startTime: 6,
                        endTime: 12,
                    },
                ],
            },
        },
    });
    console.log('Seed completed:', { packages: packages.length, categories: categories.length, lesson: lesson.title });
}
main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
//# sourceMappingURL=seed.js.map