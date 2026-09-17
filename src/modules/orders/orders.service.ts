import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { OrderStatus, PaymentMethod } from '../../generated/prisma';

@Injectable()
export class OrdersService {
  constructor(private prisma: PrismaService) {}

  private generateOrderNumber(): string {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(1000 + Math.random() * 9000);
    return `ORD-${timestamp}-${random}`;
  }

  async createOrder(userId: string, createOrderDto: CreateOrderDto) {
    if (!createOrderDto.items || createOrderDto.items.length === 0) {
      throw new BadRequestException('Order must contain at least 1 item.');
    }

    const orderItemsToProcess: {
      productId: string;
      quantity: number;
      product: any;
    }[] = [];

    // Process items sent directly from client (localStorage / app state)
    for (const itemDto of createOrderDto.items) {
      const product = await this.prisma.product.findUnique({
        where: { id: itemDto.productId },
      });

      if (!product) {
        throw new NotFoundException(
          `Product with ID "${itemDto.productId}" not found`,
        );
      }

      orderItemsToProcess.push({
        productId: product.id,
        quantity: itemDto.quantity,
        product,
      });
    }

    // Determine shipping address (smart fallback support)
    let shippingAddressJson: any = null;
    if (createOrderDto.addressId) {
      const address = await this.prisma.address.findFirst({
        where: { id: createOrderDto.addressId, userId },
      });
      if (address) {
        shippingAddressJson = {
          street: address.street,
          city: address.city,
          state: address.state,
          postalCode: address.postalCode,
          country: address.country,
        };
      } else if (createOrderDto.shippingAddressString) {
        shippingAddressJson = {
          fullAddress: createOrderDto.shippingAddressString,
        };
      } else {
        throw new NotFoundException(
          `Selected address ID "${createOrderDto.addressId}" not found for this user`,
        );
      }
    } else if (createOrderDto.shippingAddressString) {
      shippingAddressJson = {
        fullAddress: createOrderDto.shippingAddressString,
      };
    } else {
      const defaultAddress = await this.prisma.address.findFirst({
        where: { userId, isDefault: true },
      });
      if (defaultAddress) {
        shippingAddressJson = {
          street: defaultAddress.street,
          city: defaultAddress.city,
          state: defaultAddress.state,
          postalCode: defaultAddress.postalCode,
          country: defaultAddress.country,
        };
      } else {
        throw new BadRequestException(
          'Please provide a valid shipping address string or addressId',
        );
      }
    }

    // Check stock for all items
    for (const item of orderItemsToProcess) {
      if (item.product.stock < item.quantity) {
        throw new BadRequestException(
          `Item "${item.product.name}" is out of stock or has insufficient stock (available: ${item.product.stock}).`,
        );
      }
    }

    const totalAmount = orderItemsToProcess.reduce(
      (sum, item) => sum + item.product.price * item.quantity,
      0,
    );
    const roundedTotal = Math.round(totalAmount * 100) / 100;
    const orderNumber = this.generateOrderNumber();

    // Execute atomic transaction: Create Order, OrderItems, Payment, and deduct Stock
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          orderNumber,
          userId,
          totalAmount: roundedTotal,
          status: OrderStatus.PENDING,
          shippingAddress: shippingAddressJson,
          items: {
            create: orderItemsToProcess.map((item) => ({
              productId: item.productId,
              price: item.product.price,
              quantity: item.quantity,
            })),
          },
          payment: {
            create: {
              amount: roundedTotal,
              currency: 'USD',
              paymentMethod:
                createOrderDto.paymentMethod || PaymentMethod.BAKONG_KHQR,
              status: 'PENDING',
            },
          },
        },
        include: {
          items: {
            include: { product: true },
          },
          payment: true,
        },
      });

      // Deduct stock
      for (const item of orderItemsToProcess) {
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stock: {
              decrement: item.quantity,
            },
          },
        });
      }

      return order;
    });
  }

  async getUserOrders(userId: string) {
    return this.prisma.order.findMany({
      where: { userId },
      include: {
        items: {
          include: { product: true },
        },
        payment: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getOrderById(id: string, userId?: string) {
    const where: any = { id };
    if (userId) {
      where.userId = userId;
    }

    const order = await this.prisma.order.findFirst({
      where,
      include: {
        items: {
          include: { product: true },
        },
        payment: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return order;
  }

  async updateOrderStatus(
    orderId: string,
    updateStatusDto: UpdateOrderStatusDto,
  ) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return this.prisma.order.update({
      where: { id: orderId },
      data: { status: updateStatusDto.status },
      include: {
        items: true,
        payment: true,
      },
    });
  }

  async cancelOrder(orderId: string, userId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, userId },
      include: { items: true },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (
      order.status === OrderStatus.DELIVERED ||
      order.status === OrderStatus.SHIPPED
    ) {
      throw new BadRequestException(
        `Cannot cancel order with status ${order.status}`,
      );
    }

    // Restore stock atomically
    return this.prisma.$transaction(async (tx) => {
      const updatedOrder = await tx.order.update({
        where: { id: orderId },
        data: {
          status: OrderStatus.CANCELLED,
          payment: {
            update: {
              status: 'FAILED',
            },
          },
        },
        include: { payment: true },
      });

      for (const item of order.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } },
        });
      }

      return updatedOrder;
    });
  }

  async findAllOrders() {
    return this.prisma.order.findMany({
      include: {
        items: {
          include: { product: true },
        },
        payment: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
