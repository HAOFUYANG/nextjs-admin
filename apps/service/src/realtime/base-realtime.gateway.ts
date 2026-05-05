import { Logger } from '@nestjs/common';
import { OnGatewayInit } from '@nestjs/websockets';
import { Server } from 'socket.io';

export abstract class BaseRealtimeGateway implements OnGatewayInit {
  protected readonly logger = new Logger(this.constructor.name);

  afterInit(server?: Server) {
    const clients = server?.sockets?.sockets?.size ?? 0;
    this.logger.log(`gateway initialized, clients: ${clients}`);
    this.onGatewayReady(server);
  }

  protected abstract onGatewayReady(server?: Server): void;
}
