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
var SpeakingService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SpeakingService = exports.MAX_SPEAKING_DURATION_MS = exports.MAX_SPEAKING_AUDIO_BYTES = exports.FREE_SPEAKING_TURNS_PER_DAY = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const client_1 = require("@prisma/client");
const openai_1 = __importStar(require("openai"));
const prisma_service_1 = require("../prisma/prisma.service");
const speaking_scenarios_1 = require("./speaking-scenarios");
exports.FREE_SPEAKING_TURNS_PER_DAY = 3;
exports.MAX_SPEAKING_AUDIO_BYTES = 3.8 * 1024 * 1024;
exports.MAX_SPEAKING_DURATION_MS = 60_000;
const LEVEL_GUIDANCE = {
    A1: 'Use only A1 vocabulary and very short present-tense sentences.',
    A2: 'Use A2 vocabulary and simple past/present. Keep sentences short and clear.',
    B1: 'Use B1 vocabulary. Mix tenses naturally and ask practical follow-ups.',
    B2: 'Use B2 vocabulary and clearer arguments while staying conversational.',
    C1: 'Use C1 vocabulary and nuanced phrasing, still natural and concise.',
    C2: 'Use C2 vocabulary and near-native fluency without sounding academic.',
};
let SpeakingService = SpeakingService_1 = class SpeakingService {
    prisma;
    config;
    logger = new common_1.Logger(SpeakingService_1.name);
    openai = null;
    constructor(prisma, config) {
        this.prisma = prisma;
        this.config = config;
        const apiKey = this.config.get('OPENAI_API_KEY');
        if (apiKey) {
            this.openai = new openai_1.default({ apiKey });
        }
        else {
            this.logger.warn('OPENAI_API_KEY chưa cấu hình — luyện nói sẽ không tạo được phản hồi AI');
        }
    }
    async listScenarios() {
        await this.ensureCatalog();
        return this.prisma.speakingScenario.findMany({
            where: { isVisible: true },
            orderBy: { sortOrder: 'asc' },
            select: {
                id: true,
                slug: true,
                title: true,
                description: true,
                icon: true,
                color: true,
                learnerRole: true,
                aiRole: true,
                objective: true,
                minLevel: true,
                maxLevel: true,
                sortOrder: true,
            },
        });
    }
    async getQuota(userId) {
        const user = await this.prisma.user.findUniqueOrThrow({
            where: { id: userId },
            select: { isPremium: true, premiumExpiresAt: true },
        });
        const isPremium = this.resolvePremium(user);
        const usage = await this.getTodayUsage(userId);
        return {
            used: usage,
            limit: exports.FREE_SPEAKING_TURNS_PER_DAY,
            remaining: isPremium
                ? null
                : Math.max(0, exports.FREE_SPEAKING_TURNS_PER_DAY - usage),
            isPremium,
            resetsAt: this.nextResetAt().toISOString(),
        };
    }
    async createSession(userId, scenarioId, level, dialect) {
        this.ensureOpenAi();
        await this.ensureCatalog();
        const scenario = await this.prisma.speakingScenario.findFirst({
            where: { id: scenarioId, isVisible: true },
        });
        if (!scenario) {
            throw new common_1.NotFoundException('Không tìm thấy tình huống luyện nói');
        }
        const opening = await this.generateAiReply({
            scenarioTitle: scenario.title,
            learnerRole: scenario.learnerRole,
            aiRole: scenario.aiRole,
            objective: scenario.objective,
            openingHint: scenario.openingHint,
            level,
            history: [],
            learnerTranscript: null,
            isOpening: true,
        });
        const session = await this.prisma.speakingSession.create({
            data: {
                userId,
                scenarioId: scenario.id,
                level,
                dialect,
            },
        });
        const turn = await this.prisma.speakingTurn.create({
            data: {
                sessionId: session.id,
                turnIndex: 0,
                promptText: opening.aiReply,
                aiReply: opening.aiReply,
                suggestion: opening.suggestion,
                feedback: opening.feedback,
            },
        });
        const quota = await this.getQuota(userId);
        return {
            session: this.mapSession(session, scenario),
            turn: this.mapTurn(turn),
            quota,
        };
    }
    async getSession(userId, sessionId) {
        const session = await this.prisma.speakingSession.findFirst({
            where: { id: sessionId, userId },
            include: {
                scenario: true,
                turns: { orderBy: { turnIndex: 'asc' } },
            },
        });
        if (!session) {
            throw new common_1.NotFoundException('Không tìm thấy phiên luyện nói');
        }
        return {
            session: this.mapSession(session, session.scenario),
            turns: session.turns.map((turn) => this.mapTurn(turn)),
            quota: await this.getQuota(userId),
        };
    }
    async submitTurn(userId, sessionId, file, durationMs) {
        this.ensureOpenAi();
        if (!file?.buffer?.length) {
            throw new common_1.BadRequestException('Vui lòng gửi bản ghi âm');
        }
        if (file.size > exports.MAX_SPEAKING_AUDIO_BYTES) {
            throw new common_1.BadRequestException('File ghi âm vượt quá giới hạn cho phép');
        }
        if (!/^audio\/(webm|wav|mpeg|mp4|ogg|x-m4a|mp3)/i.test(file.mimetype) &&
            file.mimetype !== 'application/octet-stream') {
            throw new common_1.BadRequestException('Định dạng audio không được hỗ trợ');
        }
        if (typeof durationMs === 'number' &&
            durationMs > exports.MAX_SPEAKING_DURATION_MS + 1500) {
            throw new common_1.BadRequestException('Mỗi lượt nói tối đa 60 giây');
        }
        const session = await this.prisma.speakingSession.findFirst({
            where: { id: sessionId, userId },
            include: {
                scenario: true,
                turns: { orderBy: { turnIndex: 'asc' } },
            },
        });
        if (!session) {
            throw new common_1.NotFoundException('Không tìm thấy phiên luyện nói');
        }
        if (session.status !== client_1.SpeakingSessionStatus.ACTIVE) {
            throw new common_1.BadRequestException('Phiên luyện nói đã kết thúc');
        }
        await this.assertAndReserveQuota(userId);
        const latestPrompt = session.turns.at(-1)?.promptText ||
            session.turns.at(-1)?.aiReply ||
            session.scenario.openingHint;
        let transcription;
        try {
            transcription = await this.transcribeAudio(file);
        }
        catch (error) {
            await this.releaseQuotaReservation(userId);
            throw error;
        }
        if (!transcription.transcript) {
            await this.releaseQuotaReservation(userId);
            throw new common_1.BadRequestException('Không nhận diện được lời nói. Hãy thử ghi âm lại rõ hơn.');
        }
        const history = session.turns
            .filter((turn) => turn.aiReply || turn.transcript)
            .flatMap((turn) => {
            const items = [];
            if (turn.aiReply) {
                items.push({ role: 'assistant', content: turn.aiReply });
            }
            if (turn.transcript) {
                items.push({ role: 'user', content: turn.transcript });
            }
            return items;
        });
        let ai;
        try {
            ai = await this.generateAiReply({
                scenarioTitle: session.scenario.title,
                learnerRole: session.scenario.learnerRole,
                aiRole: session.scenario.aiRole,
                objective: session.scenario.objective,
                openingHint: session.scenario.openingHint,
                level: session.level,
                history,
                learnerTranscript: transcription.transcript,
                isOpening: false,
            });
        }
        catch (error) {
            await this.releaseQuotaReservation(userId);
            throw error;
        }
        const turnIndex = session.turnCount + 1;
        const [turn] = await this.prisma.$transaction([
            this.prisma.speakingTurn.create({
                data: {
                    sessionId: session.id,
                    turnIndex,
                    promptText: latestPrompt,
                    transcript: transcription.transcript,
                    suggestion: ai.suggestion,
                    feedback: ai.feedback,
                    aiReply: ai.aiReply,
                    durationMs: durationMs ?? null,
                    processingRaw: transcription.raw,
                },
            }),
            this.prisma.speakingSession.update({
                where: { id: session.id },
                data: { turnCount: turnIndex },
            }),
        ]);
        return {
            turn: this.mapTurn(turn),
            quota: await this.getQuota(userId),
        };
    }
    async completeSession(userId, sessionId) {
        const session = await this.prisma.speakingSession.findFirst({
            where: { id: sessionId, userId },
            include: {
                scenario: true,
                turns: { orderBy: { turnIndex: 'asc' } },
            },
        });
        if (!session) {
            throw new common_1.NotFoundException('Không tìm thấy phiên luyện nói');
        }
        const updated = session.status === client_1.SpeakingSessionStatus.COMPLETED
            ? session
            : await this.prisma.speakingSession.update({
                where: { id: session.id },
                data: {
                    status: client_1.SpeakingSessionStatus.COMPLETED,
                    completedAt: new Date(),
                },
                include: {
                    scenario: true,
                    turns: { orderBy: { turnIndex: 'asc' } },
                },
            });
        const scoredTurns = updated.turns.filter((turn) => turn.overall != null || turn.transcript);
        const avg = (picker) => {
            const values = scoredTurns
                .map(picker)
                .filter((value) => typeof value === 'number');
            if (!values.length)
                return null;
            return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
        };
        return {
            session: this.mapSession(updated, updated.scenario),
            turns: updated.turns.map((turn) => this.mapTurn(turn)),
            summary: {
                turnsSpoken: scoredTurns.length,
                averageOverall: avg((turn) => turn.overall),
                averagePronunciation: avg((turn) => turn.pronunciation),
                averageFluency: avg((turn) => turn.fluency),
                averageGrammar: avg((turn) => turn.grammar),
                averageVocabulary: avg((turn) => turn.vocabulary),
                averageCoherence: avg((turn) => turn.coherence),
            },
            quota: await this.getQuota(userId),
        };
    }
    async ensureCatalog() {
        for (const scenario of speaking_scenarios_1.SPEAKING_SCENARIOS) {
            await this.prisma.speakingScenario.upsert({
                where: { slug: scenario.slug },
                create: { ...scenario },
                update: {
                    title: scenario.title,
                    description: scenario.description,
                    icon: scenario.icon,
                    color: scenario.color,
                    learnerRole: scenario.learnerRole,
                    aiRole: scenario.aiRole,
                    objective: scenario.objective,
                    minLevel: scenario.minLevel,
                    maxLevel: scenario.maxLevel,
                    openingHint: scenario.openingHint,
                    sortOrder: scenario.sortOrder,
                    isVisible: true,
                },
            });
        }
    }
    resolvePremium(user) {
        if (!user.isPremium)
            return false;
        if (user.premiumExpiresAt && user.premiumExpiresAt <= new Date()) {
            return false;
        }
        return true;
    }
    usageDate() {
        const now = new Date();
        return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    }
    nextResetAt() {
        const date = this.usageDate();
        date.setUTCDate(date.getUTCDate() + 1);
        return date;
    }
    async getTodayUsage(userId) {
        const usage = await this.prisma.speakingDailyUsage.findUnique({
            where: {
                userId_usageDate: {
                    userId,
                    usageDate: this.usageDate(),
                },
            },
            select: { turnCount: true },
        });
        return usage?.turnCount ?? 0;
    }
    async assertAndReserveQuota(userId) {
        const user = await this.prisma.user.findUniqueOrThrow({
            where: { id: userId },
            select: { isPremium: true, premiumExpiresAt: true },
        });
        if (this.resolvePremium(user))
            return;
        const usageDate = this.usageDate();
        const reserved = await this.prisma.$transaction(async (tx) => {
            await tx.speakingDailyUsage.upsert({
                where: { userId_usageDate: { userId, usageDate } },
                create: { userId, usageDate, turnCount: 0 },
                update: {},
            });
            const updated = await tx.$queryRaw `
        UPDATE speaking_daily_usage
        SET turn_count = turn_count + 1, updated_at = NOW()
        WHERE user_id = ${userId}
          AND usage_date = ${usageDate}
          AND turn_count < ${exports.FREE_SPEAKING_TURNS_PER_DAY}
        RETURNING turn_count
      `;
            return updated[0] ?? null;
        });
        if (!reserved) {
            throw new common_1.ForbiddenException({
                statusCode: 403,
                message: 'Bạn đã hết 3 lượt luyện nói miễn phí hôm nay. Nâng cấp Premium để tiếp tục.',
                code: 'SPEAKING_QUOTA_EXCEEDED',
            });
        }
    }
    async releaseQuotaReservation(userId) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { isPremium: true, premiumExpiresAt: true },
        });
        if (!user || this.resolvePremium(user))
            return;
        const usageDate = this.usageDate();
        await this.prisma.$executeRaw `
      UPDATE speaking_daily_usage
      SET turn_count = GREATEST(turn_count - 1, 0), updated_at = NOW()
      WHERE user_id = ${userId} AND usage_date = ${usageDate}
    `;
    }
    async transcribeAudio(file) {
        this.ensureOpenAi();
        const audioFile = await (0, openai_1.toFile)(file.buffer, file.originalname || 'speaking.webm', { type: file.mimetype || 'audio/webm' });
        const transcription = await this.openai.audio.transcriptions.create({
            file: audioFile,
            model: this.config.get('SPEAKING_TRANSCRIPTION_MODEL')?.trim() ||
                'gpt-4o-mini-transcribe',
            language: 'en',
        });
        return {
            transcript: transcription.text.trim(),
            raw: {
                provider: 'openai',
                model: this.config.get('SPEAKING_TRANSCRIPTION_MODEL')?.trim() ||
                    'gpt-4o-mini-transcribe',
            },
        };
    }
    ensureOpenAi() {
        if (!this.openai) {
            throw new common_1.ServiceUnavailableException('OPENAI_API_KEY chưa được cấu hình trên server');
        }
    }
    async translateToVietnamese(text) {
        this.ensureOpenAi();
        try {
            const response = await this.openai.chat.completions.create({
                model: 'gpt-4o-mini',
                temperature: 0.1,
                max_tokens: 500,
                messages: [
                    {
                        role: 'system',
                        content: 'Translate the English text into natural Vietnamese. Return only the translation, no explanation or quotation marks.',
                    },
                    { role: 'user', content: text.trim() },
                ],
            });
            const translation = response.choices[0]?.message?.content?.trim();
            if (!translation) {
                throw new common_1.ServiceUnavailableException('AI không trả về bản dịch');
            }
            return { translation };
        }
        catch (error) {
            if (error instanceof common_1.ServiceUnavailableException)
                throw error;
            this.logger.error('OpenAI speaking translation failed', error);
            throw new common_1.ServiceUnavailableException('Không thể dịch lúc này. Vui lòng thử lại sau.');
        }
    }
    async generateAiReply(input) {
        this.ensureOpenAi();
        const system = [
            'You are an English speaking practice partner for Vietnamese learners.',
            `Stay in character as: ${input.aiRole}.`,
            `The learner is role-playing as: ${input.learnerRole}.`,
            `Scenario: ${input.scenarioTitle}.`,
            `Objective: ${input.objective}.`,
            `Learner CEFR level: ${input.level}. ${LEVEL_GUIDANCE[input.level]}`,
            'Return ONLY valid JSON with keys: aiReply, feedback, suggestion.',
            'aiReply: your next spoken line in English (1-3 short sentences), stay in role, ask one clear follow-up when natural.',
            'feedback: short Vietnamese feedback about the learner utterance and scores if provided.',
            'suggestion: one better English sentence the learner could say next time.',
            'No markdown. No extra keys.',
        ].join('\n');
        const userContent = input.isOpening
            ? `Start the role-play. Opening hint: ${input.openingHint}`
            : [
                `Learner said: ${input.learnerTranscript}`,
                input.scores
                    ? `Speaking scores (0-100): ${JSON.stringify(input.scores)}`
                    : '',
                'Respond in character and give concise coaching feedback.',
            ]
                .filter(Boolean)
                .join('\n');
        let response;
        try {
            response = await this.openai.chat.completions.create({
                model: 'gpt-4o-mini',
                temperature: 0.7,
                max_tokens: 250,
                response_format: { type: 'json_object' },
                messages: [
                    { role: 'system', content: system },
                    ...input.history.slice(-12),
                    { role: 'user', content: userContent },
                ],
            });
        }
        catch (error) {
            this.logger.error('OpenAI speaking reply failed', error);
            const status = typeof error === 'object' &&
                error &&
                'status' in error &&
                typeof error.status === 'number'
                ? error.status
                : undefined;
            if (status === 401 || status === 403) {
                throw new common_1.ServiceUnavailableException('OPENAI_API_KEY không hợp lệ hoặc đã hết hạn. Hãy cập nhật key trong .env rồi khởi động lại server.');
            }
            throw new common_1.ServiceUnavailableException('Không thể kết nối AI lúc này. Vui lòng thử lại sau.');
        }
        const text = response.choices[0]?.message?.content?.trim();
        if (!text) {
            throw new common_1.ServiceUnavailableException('AI không trả về nội dung');
        }
        let parsed;
        try {
            parsed = JSON.parse(text);
        }
        catch {
            throw new common_1.ServiceUnavailableException('AI trả về dữ liệu không hợp lệ');
        }
        const aiReply = parsed.aiReply?.trim();
        if (!aiReply) {
            throw new common_1.ServiceUnavailableException('AI không tạo được câu trả lời');
        }
        return {
            aiReply,
            feedback: parsed.feedback?.trim() || null,
            suggestion: parsed.suggestion?.trim() || null,
        };
    }
    mapSession(session, scenario) {
        return {
            id: session.id,
            level: session.level,
            dialect: session.dialect,
            status: session.status,
            turnCount: session.turnCount,
            createdAt: session.createdAt,
            completedAt: session.completedAt,
            scenario: {
                id: scenario.id,
                slug: scenario.slug,
                title: scenario.title,
                description: scenario.description,
                icon: scenario.icon,
                color: scenario.color,
                learnerRole: scenario.learnerRole,
                aiRole: scenario.aiRole,
                objective: scenario.objective,
            },
        };
    }
    mapTurn(turn) {
        return {
            id: turn.id,
            turnIndex: turn.turnIndex,
            promptText: turn.promptText,
            transcript: turn.transcript,
            suggestion: turn.suggestion,
            feedback: turn.feedback,
            aiReply: turn.aiReply,
            scores: {
                pronunciation: turn.pronunciation,
                fluency: turn.fluency,
                grammar: turn.grammar,
                vocabulary: turn.vocabulary,
                coherence: turn.coherence,
                overall: turn.overall,
                relevance: turn.relevance,
                cefrOverall: turn.cefrOverall,
            },
            durationMs: turn.durationMs,
            createdAt: turn.createdAt,
        };
    }
};
exports.SpeakingService = SpeakingService;
exports.SpeakingService = SpeakingService = SpeakingService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        config_1.ConfigService])
], SpeakingService);
//# sourceMappingURL=speaking.service.js.map