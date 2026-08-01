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
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
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
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var ShadowingService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ShadowingService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const openai_1 = __importStar(require("openai"));
const word_scorer_1 = require("./word-scorer");
let ShadowingService = ShadowingService_1 = class ShadowingService {
    config;
    logger = new common_1.Logger(ShadowingService_1.name);
    openai = null;
    constructor(config) {
        this.config = config;
        const apiKey = this.config.get('OPENAI_API_KEY');
        if (apiKey) {
            this.openai = new openai_1.default({ apiKey });
        }
        else {
            this.logger.warn('OPENAI_API_KEY chưa cấu hình — tính năng Shadowing STT sẽ không hoạt động');
        }
    }
    isConfigured() {
        return !!this.openai;
    }
    async scoreRecording(audioBase64, expectedText) {
        if (!this.openai) {
            throw new Error('OPENAI_API_KEY chưa được cấu hình trên server');
        }
        const buffer = Buffer.from(audioBase64, 'base64');
        if (buffer.length === 0) {
            throw new Error('Không nhận được dữ liệu ghi âm');
        }
        const file = await (0, openai_1.toFile)(buffer, 'recording.webm', { type: 'audio/webm' });
        const transcription = await this.openai.audio.transcriptions.create({
            file,
            model: 'whisper-1',
            language: 'en',
        });
        const transcript = transcription.text.trim();
        const words = (0, word_scorer_1.scoreTranscript)(expectedText, transcript);
        const correctCount = words.filter((w) => w.correct).length;
        const score = words.length > 0 ? Math.round((correctCount / words.length) * 100) : 0;
        return { transcript, words, score };
    }
};
exports.ShadowingService = ShadowingService;
exports.ShadowingService = ShadowingService = ShadowingService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], ShadowingService);
//# sourceMappingURL=shadowing.service.js.map