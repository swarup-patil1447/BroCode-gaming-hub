import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting BroCode database seed...');

  // 1. Seed Owner Account
  const ownerPasswordHash = await bcrypt.hash('OwnerPass2026!', 10);
  const owner = await prisma.user.upsert({
    where: { employeeId: 'owner' },
    update: {
      password: ownerPasswordHash,
      isActive: true,
      mustChangePassword: false,
      role: 'OWNER',
    },
    create: {
      employeeId: 'owner',
      name: 'BroCode Owner',
      mobile: '+919999999999',
      password: ownerPasswordHash,
      role: 'OWNER',
      isActive: true,
      mustChangePassword: false,
    },
  });
  console.log(`✅ Seeded owner account (${owner.employeeId})`);

  // 2. Seed Employee Accounts
  const empPasswordHash = await bcrypt.hash('emp123', 10);
  const employees = [
    { employeeId: 'EMP001', name: 'Rohan Sharma', mobile: '+919000000001' },
    { employeeId: 'EMP002', name: 'Priya Verma', mobile: '+919000000002' },
  ];

  for (const emp of employees) {
    const created = await prisma.user.upsert({
      where: { employeeId: emp.employeeId },
      update: {
        password: empPasswordHash,
        isActive: true,
        role: 'EMPLOYEE',
      },
      create: {
        employeeId: emp.employeeId,
        name: emp.name,
        mobile: emp.mobile,
        password: empPasswordHash,
        role: 'EMPLOYEE',
        isActive: true,
        mustChangePassword: false,
      },
    });
    console.log(`✅ Seeded employee account (${created.employeeId})`);
  }

  // 3. Seed 8 Gaming Stations
  const stations = [
    { id: 1, tableNumber: 1, deviceType: 'PS5' },
    { id: 2, tableNumber: 2, deviceType: 'PS5' },
    { id: 3, tableNumber: 3, deviceType: 'PS4' },
    { id: 4, tableNumber: 4, deviceType: 'PS4' },
    { id: 5, tableNumber: 5, deviceType: 'CAR_SIMULATOR' },
    { id: 6, tableNumber: 6, deviceType: 'CAR_SIMULATOR' },
    { id: 7, tableNumber: 7, deviceType: 'PC' },
    { id: 8, tableNumber: 8, deviceType: 'PC' },
  ];

  for (const st of stations) {
    await prisma.station.upsert({
      where: { id: st.id },
      update: {
        tableNumber: st.tableNumber,
        deviceType: st.deviceType,
      },
      create: {
        id: st.id,
        tableNumber: st.tableNumber,
        deviceType: st.deviceType,
        status: 'AVAILABLE',
      },
    });
  }
  console.log('✅ Seeded 8 gaming stations');

  // 4. Seed Pricing Rules
  const pricing = [
    { deviceType: 'PS5', controllerCount: 1, hourlyRate: 90 },
    { deviceType: 'PS5', controllerCount: 2, hourlyRate: 140 },
    { deviceType: 'PS5', controllerCount: 3, hourlyRate: 190 },
    { deviceType: 'PS5', controllerCount: 4, hourlyRate: 240 },
    { deviceType: 'PS4', controllerCount: 1, hourlyRate: 70 },
    { deviceType: 'PS4', controllerCount: 2, hourlyRate: 110 },
    { deviceType: 'PS4', controllerCount: 3, hourlyRate: 150 },
    { deviceType: 'PS4', controllerCount: 4, hourlyRate: 190 },
    { deviceType: 'PC', controllerCount: 1, hourlyRate: 70 },
    { deviceType: 'CAR_SIMULATOR', controllerCount: 1, hourlyRate: 80 },
    { deviceType: 'SIMULATOR', controllerCount: 1, hourlyRate: 80 },
  ];

  for (const pr of pricing) {
    await prisma.pricingRule.upsert({
      where: {
        deviceType_controllerCount: {
          deviceType: pr.deviceType,
          controllerCount: pr.controllerCount,
        },
      },
      update: {
        hourlyRate: pr.hourlyRate,
      },
      create: {
        deviceType: pr.deviceType,
        controllerCount: pr.controllerCount,
        hourlyRate: pr.hourlyRate,
      },
    });
  }
  console.log('✅ Seeded pricing rules');

  // 5. Seed Food Items
  const foodItems = [
    { name: 'Veg Burger', category: 'SNACKS', price: 120 },
    { name: 'Chicken Burger', category: 'SNACKS', price: 160 },
    { name: 'French Fries', category: 'SNACKS', price: 80 },
    { name: 'Cold Drink (500ml)', category: 'BEVERAGES', price: 40 },
    { name: 'Mineral Water (1L)', category: 'BEVERAGES', price: 20 },
    { name: 'Red Bull', category: 'BEVERAGES', price: 125 },
  ];

  for (const food of foodItems) {
    const existing = await prisma.foodItem.findFirst({ where: { name: food.name } });
    if (!existing) {
      await prisma.foodItem.create({ data: food });
    }
  }
  console.log('✅ Seeded food items');

  console.log('🎉 Database seeding completed successfully.');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
