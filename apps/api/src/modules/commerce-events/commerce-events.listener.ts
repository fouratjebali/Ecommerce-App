import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
  CART_UPDATED_EVENT,
  ORDER_CANCELLED_EVENT,
  ORDER_CREATED_EVENT,
  ORDER_ITEM_STATUS_UPDATED_EVENT,
} from './commerce-events.constants';

@Injectable()
export class CommerceEventsListener {
  private readonly logger = new Logger(CommerceEventsListener.name);

  @OnEvent(CART_UPDATED_EVENT)
  onCartUpdated(payload: { sessionId: string; itemCount: number }) {
    this.logger.log(
      `Cart ${payload.sessionId} updated with ${payload.itemCount} items.`,
    );
  }

  @OnEvent(ORDER_CREATED_EVENT)
  onOrderCreated(payload: {
    orderNumber: string;
    buyerId: string;
    totalInCents: number;
  }) {
    this.logger.log(
      `Order ${payload.orderNumber} created for buyer ${payload.buyerId} totaling ${payload.totalInCents} cents.`,
    );
  }

  @OnEvent(ORDER_CANCELLED_EVENT)
  onOrderCancelled(payload: { orderNumber: string; buyerId: string }) {
    this.logger.warn(
      `Order ${payload.orderNumber} cancelled by buyer ${payload.buyerId}.`,
    );
  }

  @OnEvent(ORDER_ITEM_STATUS_UPDATED_EVENT)
  onOrderItemStatusUpdated(payload: {
    orderNumber: string;
    itemId: string;
    status: string;
  }) {
    this.logger.log(
      `Order item ${payload.itemId} on ${payload.orderNumber} changed to ${payload.status}.`,
    );
  }
}
