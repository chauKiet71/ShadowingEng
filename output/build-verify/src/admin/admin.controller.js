"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminController = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const admin_guard_1 = require("../auth/admin.guard");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const admin_overview_service_1 = require("./admin-overview.service");
const admin_packages_service_1 = require("./admin-packages.service");
const admin_stats_service_1 = require("./admin-stats.service");
const admin_transactions_service_1 = require("./admin-transactions.service");
const admin_users_service_1 = require("./admin-users.service");
const update_admin_user_premium_dto_1 = require("./dto/update-admin-user-premium.dto");
let AdminController = class AdminController {
    overviewService;
    transactionsService;
    statsService;
    packagesService;
    usersService;
    constructor(overviewService, transactionsService, statsService, packagesService, usersService) {
        this.overviewService = overviewService;
        this.transactionsService = transactionsService;
        this.statsService = statsService;
        this.packagesService = packagesService;
        this.usersService = usersService;
    }
    getOverview() {
        return this.overviewService.getOverview();
    }
    getStats(range, from, to) {
        const allowed = ['7d', '30d', '90d', 'custom'];
        const parsed = allowed.includes(range)
            ? range
            : '30d';
        return this.statsService.getStats({
            range: parsed,
            from,
            to,
        });
    }
    listPackageSubscribers(id) {
        return this.packagesService.listSubscribers(id);
    }
    updateUserPremium(id, body) {
        return this.usersService.updatePremium(id, body);
    }
    getTransactionStats() {
        return this.transactionsService.getStats();
    }
    listTransactions(page, limit, status, search) {
        const allowed = Object.values(client_1.PaymentStatus);
        const parsedStatus = status && allowed.includes(status)
            ? status
            : undefined;
        return this.transactionsService.list({
            page: page ? Number(page) : 1,
            limit: limit ? Number(limit) : 10,
            status: parsedStatus,
            search,
        });
    }
};
exports.AdminController = AdminController;
__decorate([
    (0, common_1.Get)('overview'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "getOverview", null);
__decorate([
    (0, common_1.Get)('stats'),
    __param(0, (0, common_1.Query)('range')),
    __param(1, (0, common_1.Query)('from')),
    __param(2, (0, common_1.Query)('to')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "getStats", null);
__decorate([
    (0, common_1.Get)('packages/:id/subscribers'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "listPackageSubscribers", null);
__decorate([
    (0, common_1.Patch)('users/:id/premium'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_admin_user_premium_dto_1.UpdateAdminUserPremiumDto]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "updateUserPremium", null);
__decorate([
    (0, common_1.Get)('transactions/stats'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "getTransactionStats", null);
__decorate([
    (0, common_1.Get)('transactions'),
    __param(0, (0, common_1.Query)('page')),
    __param(1, (0, common_1.Query)('limit')),
    __param(2, (0, common_1.Query)('status')),
    __param(3, (0, common_1.Query)('search')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "listTransactions", null);
exports.AdminController = AdminController = __decorate([
    (0, common_1.Controller)('admin'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, admin_guard_1.AdminGuard),
    __metadata("design:paramtypes", [admin_overview_service_1.AdminOverviewService,
        admin_transactions_service_1.AdminTransactionsService,
        admin_stats_service_1.AdminStatsService,
        admin_packages_service_1.AdminPackagesService,
        admin_users_service_1.AdminUsersService])
], AdminController);
//# sourceMappingURL=admin.controller.js.map