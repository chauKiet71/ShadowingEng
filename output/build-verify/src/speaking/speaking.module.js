"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SpeakingModule = void 0;
const common_1 = require("@nestjs/common");
const auth_module_1 = require("../auth/auth.module");
const speaking_controller_1 = require("./speaking.controller");
const speaking_service_1 = require("./speaking.service");
let SpeakingModule = class SpeakingModule {
};
exports.SpeakingModule = SpeakingModule;
exports.SpeakingModule = SpeakingModule = __decorate([
    (0, common_1.Module)({
        imports: [auth_module_1.AuthModule],
        controllers: [speaking_controller_1.SpeakingController],
        providers: [speaking_service_1.SpeakingService],
    })
], SpeakingModule);
//# sourceMappingURL=speaking.module.js.map