import { OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import type { Server, WebSocket } from 'ws';
import { ShadowingService } from './shadowing.service';
export declare class ShadowingGateway implements OnGatewayConnection, OnGatewayDisconnect {
    private shadowingService;
    private readonly logger;
    server: Server;
    constructor(shadowingService: ShadowingService);
    handleConnection(client: WebSocket): void;
    handleDisconnect(): void;
    private handleClientMessage;
}
