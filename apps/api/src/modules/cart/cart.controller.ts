import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CartService } from './cart.service';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { ApplyCouponDto } from './dto/apply-coupon.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';

@ApiTags('Cart')
@Controller({ path: 'cart', version: '1' })
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  @ApiOperation({ summary: 'Get the current cart session' })
  getCart(@Headers('x-cart-session') sessionId: string) {
    return this.cartService.getCart(sessionId);
  }

  @Post('items')
  @ApiOperation({ summary: 'Add a product to the cart session' })
  addItem(
    @Headers('x-cart-session') sessionId: string,
    @Body() dto: AddCartItemDto,
  ) {
    return this.cartService.addItem(sessionId, dto);
  }

  @Patch('items/:productId')
  @ApiOperation({ summary: 'Update a cart item quantity' })
  updateItemQuantity(
    @Headers('x-cart-session') sessionId: string,
    @Param('productId') productId: string,
    @Body() dto: UpdateCartItemDto,
  ) {
    return this.cartService.updateItemQuantity(sessionId, productId, dto);
  }

  @Delete('items/:productId')
  @ApiOperation({ summary: 'Remove a product from the cart session' })
  removeItem(
    @Headers('x-cart-session') sessionId: string,
    @Param('productId') productId: string,
  ) {
    return this.cartService.removeItem(sessionId, productId);
  }

  @Post('coupons/apply')
  @ApiOperation({ summary: 'Apply a coupon to the cart session' })
  applyCoupon(
    @Headers('x-cart-session') sessionId: string,
    @Body() dto: ApplyCouponDto,
  ) {
    return this.cartService.applyCoupon(sessionId, dto);
  }

  @Delete('coupons')
  @ApiOperation({ summary: 'Remove the applied coupon from the cart session' })
  clearCoupon(@Headers('x-cart-session') sessionId: string) {
    return this.cartService.clearCoupon(sessionId);
  }

  @Delete()
  @ApiOperation({ summary: 'Clear the entire cart session' })
  clearCart(@Headers('x-cart-session') sessionId: string) {
    return this.cartService.clearCart(sessionId);
  }
}
