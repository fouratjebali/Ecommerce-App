import { OrderStatus } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class UpdateAdminOrderStatusDto {
  @IsEnum(OrderStatus)
  status!: OrderStatus;
}
