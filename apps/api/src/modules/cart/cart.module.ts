import { Module } from '@nestjs/common';
import { CartController } from './cart.controller';
import { CartService } from './cart.service';
import { CartStoreService } from './cart-store.service';
import { InventoryReservationsService } from './inventory-reservations.service';

@Module({
  controllers: [CartController],
  providers: [CartStoreService, InventoryReservationsService, CartService],
  exports: [CartService, InventoryReservationsService],
})
export class CartModule {}
