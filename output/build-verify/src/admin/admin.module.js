"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminModule = void 0;
const common_1 = require("@nestjs/common");
const auth_module_1 = require("../auth/auth.module");
const admin_controller_1 = require("./admin.controller");
const admin_overview_service_1 = require("./admin-overview.service");
const admin_packages_service_1 = require("./admin-packages.service");
const admin_stats_service_1 = require("./admin-stats.service");
const admin_transactions_service_1 = require("./admin-transactions.service");
const admin_users_service_1 = require("./admin-users.service");
let AdminModule = class AdminModule {
};
exports.AdminModule = AdminModule;
exports.AdminModule = AdminModule = __decorate([
    (0, common_1.Module)({
        imports: [auth_module_1.AuthModule],
        controllers: [admin_controller_1.AdminController],
        providers: [
            admin_overview_service_1.AdminOverviewService,
            admin_transactions_service_1.AdminTransactionsService,
            admin_stats_service_1.AdminStatsService,
            admin_packages_service_1.AdminPackagesService,
            admin_users_service_1.AdminUsersService,
        ],
    })
], AdminModule);
//# sourceMappingURL=admin.module.js.map