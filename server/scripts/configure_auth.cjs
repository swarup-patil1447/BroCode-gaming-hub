const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('--- Configuring BroCode Auth & Accounts ---');

  // 1. Update/Ensure Owner Account with OwnerPass2026!
  const ownerHashedPassword = await bcrypt.hash('OwnerPass2026!', 10);
  const owner = await prisma.user.upsert({
    where: { employeeId: 'owner' },
    update: {
      password: ownerHashedPassword,
      role: 'OWNER',
      isActive: true,
      mustChangePassword: false,
    },
    create: {
      employeeId: 'owner',
      name: 'BroCode Owner',
      mobile: '+919999999999',
      password: ownerHashedPassword,
      role: 'OWNER',
      isActive: true,
      mustChangePassword: false,
    },
  });
  console.log(`✅ Owner account updated: ID=${owner.id}, employeeId=${owner.employeeId}, isActive=${owner.isActive}, mustChangePassword=${owner.mustChangePassword}`);

  // 2. Ensure Employee EMP001 is active with emp123
  const empHashedPassword = await bcrypt.hash('emp123', 10);
  const emp1 = await prisma.user.upsert({
    where: { employeeId: 'EMP001' },
    update: {
      isActive: true,
      password: empHashedPassword,
      role: 'EMPLOYEE',
    },
    create: {
      employeeId: 'EMP001',
      name: 'Rohan Sharma',
      mobile: '+919000000001',
      password: empHashedPassword,
      role: 'EMPLOYEE',
      isActive: true,
      mustChangePassword: false,
    },
  });
  console.log(`✅ Employee EMP001 updated: ID=${emp1.id}, employeeId=${emp1.employeeId}, isActive=${emp1.isActive}`);

  // 3. Ensure Employee EMP002 is active with emp123
  const emp2 = await prisma.user.upsert({
    where: { employeeId: 'EMP002' },
    update: {
      isActive: true,
      password: empHashedPassword,
      role: 'EMPLOYEE',
    },
    create: {
      employeeId: 'EMP002',
      name: 'Priya Verma',
      mobile: '+919000000002',
      password: empHashedPassword,
      role: 'EMPLOYEE',
      isActive: true,
      mustChangePassword: false,
    },
  });
  console.log(`✅ Employee EMP002 updated: ID=${emp2.id}, employeeId=${emp2.employeeId}, isActive=${emp2.isActive}`);

  // Log audit
  await prisma.auditLog.create({
    data: {
      userId: owner.id,
      userName: owner.name,
      userEmpId: owner.employeeId,
      role: owner.role,
      action: 'AUTH_CONFIGURE',
      target: 'AUTH_SYSTEM',
      oldValue: null,
      newValue: 'Configured OwnerPass2026! and activated employee accounts EMP001, EMP002',
    },
  });

  console.log('\n--- Final User Status ---');
  const allUsers = await prisma.user.findMany({ select: { id: true, employeeId: true, role: true, isActive: true, mustChangePassword: true } });
  console.log(allUsers);
}

main()
  .catch((e) => {
    console.error('Error configuring auth:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
