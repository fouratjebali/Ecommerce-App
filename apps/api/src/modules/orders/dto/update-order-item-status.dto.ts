import { IsEnum } from 'class-validator';
import { OrderItemStatus } from '@prisma/client';

export class UpdateOrderItemStatusDto {
  @IsEnum(OrderItemStatus)
  status!: OrderItemStatus;
}
