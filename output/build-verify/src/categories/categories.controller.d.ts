import { CategoriesService } from './categories.service';
export declare class CategoriesController {
    private categoriesService;
    constructor(categoriesService: CategoriesService);
    findAll(): Promise<{
        id: string;
        createdAt: Date;
        name: string;
        description: string | null;
        icon: string;
        iconColor: string;
        imageUrl: string | null;
        lessonCount: number;
        isPopular: boolean;
    }[]>;
    findPopular(): Promise<{
        id: string;
        createdAt: Date;
        name: string;
        description: string | null;
        icon: string;
        iconColor: string;
        imageUrl: string | null;
        lessonCount: number;
        isPopular: boolean;
    }[]>;
}
