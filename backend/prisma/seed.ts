import { PrismaClient, Role, InquiryStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('password123', 10);

  const alice = await prisma.user.upsert({
    where: { email: 'alice@coffeeninja.lk' },
    update: {},
    create: {
      name: 'Alice Perera',
      email: 'alice@coffeeninja.lk',
      passwordHash,
      role: Role.STAFF,
    },
  });

  const bob = await prisma.user.upsert({
    where: { email: 'bob@coffeeninja.lk' },
    update: {},
    create: {
      name: 'Bob Silva',
      email: 'bob@coffeeninja.lk',
      passwordHash,
      role: Role.STAFF,
    },
  });

  await prisma.user.upsert({
    where: { email: 'admin@coffeeninja.lk' },
    update: {},
    create: {
      name: 'Nadia Fernando (Admin)',
      email: 'admin@coffeeninja.lk',
      passwordHash,
      role: Role.ADMIN,
    },
  });

  const existingCount = await prisma.inquiry.count();
  if (existingCount === 0) {
    await prisma.inquiry.createMany({
      data: [
        {
          customerName: 'Kasun Jayawardena',
          customerContact: 'kasun@example.com',
          subject: 'Invoice discrepancy for March',
          description: 'Customer reported being billed twice for the monthly maintenance plan.',
          status: InquiryStatus.NEW,
          createdById: alice.id,
        },
        {
          customerName: 'Dilini Rodrigo',
          customerContact: '+94 77 123 4567',
          subject: 'Request for service upgrade',
          description: 'Wants to upgrade from Basic to Priority support starting next week.',
          status: InquiryStatus.IN_PROGRESS,
          createdById: alice.id,
        },
        {
          customerName: 'Ruwan Bandara',
          customerContact: 'ruwan.b@example.com',
          subject: 'Account access issue',
          description: 'Unable to reset portal password; reset link expired immediately.',
          status: InquiryStatus.NEW,
          createdById: bob.id,
        },
      ],
    });
  }

  console.log('Database seeded successfully!');
  console.log('Test accounts (password: password123):');
  console.log('- alice@coffeeninja.lk (STAFF)');
  console.log('- bob@coffeeninja.lk (STAFF)');
  console.log('- admin@coffeeninja.lk (ADMIN)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });