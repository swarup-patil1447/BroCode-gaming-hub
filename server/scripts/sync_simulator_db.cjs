const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Synchronizing stations and pricing rules for car simulator...');

  // 1. Update station records 5 & 6 to CAR_SIMULATOR
  const updatedStations = await prisma.station.updateMany({
    where: { id: { in: [5, 6] } },
    data: { deviceType: 'CAR_SIMULATOR' },
  });
  console.log(`Updated ${updatedStations.count} station(s) to CAR_SIMULATOR`);

  // 2. Check existing pricing rules for CAR_SIMULATOR and SIMULATOR
  const carSimRule = await prisma.pricingRule.findFirst({
    where: { deviceType: 'CAR_SIMULATOR', controllerCount: 1 },
  });
  const legacySimRule = await prisma.pricingRule.findFirst({
    where: { deviceType: 'SIMULATOR', controllerCount: 1 },
  });

  const rateToUse = carSimRule?.hourlyRate || legacySimRule?.hourlyRate || 100;

  // Upsert CAR_SIMULATOR
  await prisma.pricingRule.upsert({
    where: {
      deviceType_controllerCount: {
        deviceType: 'CAR_SIMULATOR',
        controllerCount: 1,
      },
    },
    update: { hourlyRate: rateToUse },
    create: {
      deviceType: 'CAR_SIMULATOR',
      controllerCount: 1,
      hourlyRate: rateToUse,
    },
  });

  // Also sync SIMULATOR record so any legacy queries find the exact same rate
  await prisma.pricingRule.upsert({
    where: {
      deviceType_controllerCount: {
        deviceType: 'SIMULATOR',
        controllerCount: 1,
      },
    },
    update: { hourlyRate: rateToUse },
    create: {
      deviceType: 'SIMULATOR',
      controllerCount: 1,
      hourlyRate: rateToUse,
    },
  });

  console.log(`Synchronized pricing rules to ₹${rateToUse}/hr`);

  const stations = await prisma.station.findMany({ where: { id: { in: [5, 6] } } });
  console.log('Stations 5 & 6 now:', stations);

  const rules = await prisma.pricingRule.findMany({
    where: { deviceType: { in: ['CAR_SIMULATOR', 'SIMULATOR'] } },
  });
  console.log('Simulator pricing rules now:', rules);
}

main()
  .catch((e) => {
    console.error('Error syncing DB:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
