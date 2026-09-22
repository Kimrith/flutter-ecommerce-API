import 'dotenv/config';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, Role } from '../src/generated/prisma';
import * as bcrypt from 'bcrypt';

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Starting database seeding...');

  // 1. Seed Admin User
  const adminEmail = 'admin@gmail.com';
  const adminPassword = 'password123';
  const hashedPassword = await bcrypt.hash(adminPassword, 10);

  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (!existingAdmin) {
    const admin = await prisma.user.create({
      data: {
        name: 'Super Admin',
        email: adminEmail,
        password: hashedPassword,
        phone: '+85512345678',
        role: Role.ADMIN,
      },
    });
    console.log(`✅ Created Admin user: ${admin.email}`);
  } else {
    console.log(`ℹ️ Admin user already exists: ${adminEmail}`);
  }

  // 2. Seed Default User (Optional)
  const userEmail = 'user@gmail.com';
  const userPassword = 'password123';
  const hashedUserPassword = await bcrypt.hash(userPassword, 10);

  const existingUser = await prisma.user.findUnique({
    where: { email: userEmail },
  });

  if (!existingUser) {
    const user = await prisma.user.create({
      data: {
        name: 'Demo Customer',
        email: userEmail,
        password: hashedUserPassword,
        phone: '+85598765432',
        role: Role.USER,
      },
    });
    console.log(`✅ Created Customer user: ${user.email}`);
  } else {
    console.log(`ℹ️ Customer user already exists: ${userEmail}`);
  }

  // 3. Seed Default Categories
  const categoriesData = [
    {
      name: 'Electronics',
      slug: 'electronics',
      description: 'Smartphones, Laptops, Accessories, and Gadgets',
      image: 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=500',
    },
    {
      name: 'Fashion',
      slug: 'fashion',
      description: 'Clothes, Shoes, and Fashionable Accessories',
      image: 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=500',
    },
    {
      name: 'Home & Living',
      slug: 'home-living',
      description: 'Furniture, Decor, and Kitchenware',
      image: 'https://images.unsplash.com/photo-1484101403633-562f891dc89a?w=500',
    },
  ];

  for (const cat of categoriesData) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {},
      create: cat,
    });
  }
  console.log('✅ Categories seeded successfully.');

  console.log('🎉 Seeding completed!');
  console.log('------------------------------------------------');
  console.log(`🔐 Admin Credentials:`);
  console.log(`   Email:    ${adminEmail}`);
  console.log(`   Password: ${adminPassword}`);
  console.log(`------------------------------------------------`);
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed with error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
