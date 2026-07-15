"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const core_1 = require("@nestjs/core");
const common_1 = require("@nestjs/common");
const platform_ws_1 = require("@nestjs/platform-ws");
const path_1 = require("path");
const app_module_1 = require("./app.module");
const database_sync_1 = require("./prisma/database-sync");
const global_exception_filter_1 = require("./common/filters/global-exception.filter");
async function bootstrap() {
    await (0, database_sync_1.syncDatabaseSchema)();
    const app = await core_1.NestFactory.create(app_module_1.AppModule, { rawBody: true });
    app.useWebSocketAdapter(new platform_ws_1.WsAdapter(app));
    app.setGlobalPrefix('api');
    app.useGlobalFilters(new global_exception_filter_1.GlobalExceptionFilter());
    app.useGlobalPipes(new common_1.ValidationPipe({ whitelist: true, transform: true }));
    const expressApp = app.getHttpAdapter().getInstance();
    expressApp.get(/^(?!\/api).*/, (req, res, next) => {
        if (req.path.match(/\.\w+$/))
            return next();
        res.sendFile((0, path_1.join)(process.cwd(), 'public', 'index.html'));
    });
    const port = process.env.PORT ?? 3000;
    await app.listen(port);
    console.log(`🚀 Shadowing ENGLISH running at http://localhost:${port}`);
}
bootstrap();
//# sourceMappingURL=main.js.map