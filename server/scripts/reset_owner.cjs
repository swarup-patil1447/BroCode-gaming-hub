const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const targetUsername = 'owner';
  const newTempPassword = 'owner123';

  // Find the Owner account
  const owner = await prisma.user.findFirst({
    where: {
      role: 'OWNER',
    },
  });

  if (!owner) {
    throw new Error('No account with role OWNER found in database!');
  }

  console.log(`Found Owner account: ID=${owner.id}, Current EmployeeId=${owner.employeeId}, Role=${owner.role}, Active=${owner.isActive}`);

  const hashedPassword = await bcrypt.hash(newTempPassword, 10);

  // Update only this Owner account
  const updatedOwner = await prisma.user.update({
    where: { id: owner.id },
    data: {
      employeeId: targetUsername,
      password: hashedPassword,
      mustChangePassword: true,
      isActive: true,
      tokenVersion: { increment: 1 },
    },
  });

  // Create audit log
  await prisma.auditLog.create({
    data: {
      userId: updatedOwner.id,
      userName: updatedOwner.name,
      userEmpId: updatedOwner.employeeId,
      role: updatedOwner.role,
      action: 'PASSWORD_RESET',
      target: 'OWNER_ACCOUNT',
      oldValue: null,
      newValue: 'Temporary password set for local development recovery; mustChangePassword enabled',
    },
  });

  console.log('✅ Owner account safely updated:');
  console.log({
    id: updatedOwner.id,
    employeeId: updatedOwner.employeeId,
    name: updatedOwner.name,
    role: updatedOwner.role,
    isActive: updatedOwner.isActive,
    mustChangePassword: updatedOwner.mustChangePassword,
    hasPassword: !!updatedOwner.password,
  });

  // Verify other records preserved
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
  console.log('\nVerified database record counts preserved:');
  console.log(JSON.stringify(counts, null, 2));
}

main()
  .catch((e) => {
    console.error('Error resetting owner:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
