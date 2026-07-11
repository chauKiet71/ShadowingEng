import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import type { Server, WebSocket } from 'ws';
import { ShadowingService } from './shadowing.service';

interface ClientMessage {
  type: 'start' | 'stop';
  expectedText?: string;
  audio?: string;
}

@WebSocketGateway({ path: '/api/shadowing' })
export class ShadowingGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(ShadowingGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(private shadowingService: ShadowingService) {}

  handleConnection(client: WebSocket) {
    client.send(
      JSON.stringify({
        type: 'connected',
        ready: this.shadowingService.isConfigured(),
      }),
    );

    client.on('message', (raw) => {
      void this.handleClientMessage(client, raw.toString());
    });
  }

  handleDisconnect() {
    this.logger.debug('Shadowing client disconnected');
  }

  private async handleClientMessage(client: WebSocket, raw: string) {
    let message: ClientMessage;
    try {
      message = JSON.parse(raw) as ClientMessage;
    } catch {
      client.send(
        JSON.stringify({ type: 'error', message: 'Tin nhắn không hợp lệ' }),
      );
      return;
    }

    if (message.type === 'start') {
      client.send(
        JSON.stringify({
          type: 'ready',
          expectedText: message.expectedText ?? '',
        }),
      );
      return;
    }

    if (message.type === 'stop') {
      if (!message.expectedText || !message.audio) {
        client.send(
          JSON.stringify({
            type: 'error',
            message: 'Thiếu dữ liệu ghi âm hoặc câu mẫu',
          }),
        );
        return;
      }

      try {
        client.send(JSON.stringify({ type: 'processing' }));
        const result = await this.shadowingService.scoreRecording(
          message.audio,
          message.expectedText,
        );
        client.send(JSON.stringify({ type: 'result', ...result }));
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : 'Không thể chấm điểm ghi âm';
        this.logger.error(errorMessage);
        client.send(JSON.stringify({ type: 'error', message: errorMessage }));
      }
    }
  }
}
