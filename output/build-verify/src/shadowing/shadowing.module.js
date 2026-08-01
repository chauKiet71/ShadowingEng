"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ShadowingModule = void 0;
const common_1 = require("@nestjs/common");
const shadowing_gateway_1 = require("./shadowing.gateway");
const shadowing_service_1 = require("./shadowing.service");
let ShadowingModule = class ShadowingModule {
};
exports.ShadowingModule = ShadowingModule;
exports.ShadowingModule = ShadowingModule = __decorate([
    (0, common_1.Module)({
        providers: [shadowing_gateway_1.ShadowingGateway, shadowing_service_1.ShadowingService],
    })
], ShadowingModule);
//# sourceMappingURL=shadowing.module.js.map