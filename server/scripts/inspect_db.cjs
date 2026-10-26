const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany();
  console.log('=== USERS IN DATABASE ===');
  for (const u of users) {
    console.log({
      id: u.id,
      employeeId: u.employeeId,
      name: u.name,
      mobile: u.mobile,
      role: u.role,
      isActive: u.isActive,
      mustChangePassword: u.mustChangePassword,
      hasPassword: !!u.password,
      passwordLen: u.password ? u.password.length : 0,
    });
  }

  const counts = {
    users: await prisma.user.count(),
    stations: await prisma.station.count(),
    pricingRules: await prisma.pricingRule.count(),
    foodItems: await prisma.foodItem.count(),
    bookings: await prisma.booking.count(),
    payments: await prisma.payment.count(),
    auditLogs: await prisma.auditLog.count(),
    notifications: await prisma.notification.count(),
  };
  console.log('\n=== RECORD COUNTS ===');
  console.log(JSON.stringify(counts, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
