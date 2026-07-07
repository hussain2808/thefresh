import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post } from '@nestjs/common';
import { CartId } from '../../common/decorators/cart-id.decorator';
import { CartService } from './cart.service';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';

// Guest-accessible by design — the cart is keyed by X-Cart-Id, not a user.
// Auth is only enforced at checkout (see OrdersController).
@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  getCart(@CartId() cartId: string) {
    return this.cartService.getCart(cartId);
  }

  @Post('items')
  addItem(@CartId() cartId: string, @Body() dto: AddCartItemDto) {
    return this.cartService.addItem(cartId, dto);
  }

  @Patch('items/:itemId')
  updateItem(@CartId() cartId: string, @Param('itemId') itemId: string, @Body() dto: UpdateCartItemDto) {
    return this.cartService.updateItem(cartId, itemId, dto);
  }

  @Delete('items/:itemId')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeItem(@CartId() cartId: string, @Param('itemId') itemId: string) {
    return this.cartService.removeItem(cartId, itemId);
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  clearCart(@CartId() cartId: string) {
    return this.cartService.clear(cartId);
  }
}
