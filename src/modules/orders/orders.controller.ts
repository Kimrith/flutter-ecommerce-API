import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../generated/prisma';

@ApiTags('Orders')
@ApiBearerAuth()
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @ApiOperation({ summary: 'Create order from current shopping cart' })
  async createOrder(
    @CurrentUser('id') userId: string,
    @Body() createOrderDto: CreateOrderDto,
  ) {
    return this.ordersService.createOrder(userId, createOrderDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get current user order history' })
  async getUserOrders(@CurrentUser('id') userId: string) {
    return this.ordersService.getUserOrders(userId);
  }

  @Get('admin/all')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get all system orders (Admin only)' })
  async findAllOrders() {
    return this.ordersService.findAllOrders();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get order details by ID' })
  async getOrderById(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    const userIdFilter = user.role === Role.ADMIN ? undefined : user.id;
    return this.ordersService.getOrderById(id, userIdFilter);
  }

  @Patch(':id/status')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Update order status (Admin only)' })
  async updateOrderStatus(
    @Param('id') id: string,
    @Body() updateStatusDto: UpdateOrderStatusDto,
  ) {
    return this.ordersService.updateOrderStatus(id, updateStatusDto);
  }

  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Cancel an order' })
  async cancelOrder(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.ordersService.cancelOrder(id, userId);
  }
}
