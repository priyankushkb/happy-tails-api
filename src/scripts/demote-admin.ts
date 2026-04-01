import { prisma } from '../lib/prisma';

async function main() {
  const email = process.argv[2];

  if (!email) {
    throw new Error('Please provide an email');
  }

  const user = await prisma.user.findUnique({
    where: { email }
  });

  if (!user) {
    console.error(`No user found with email: ${email}`);
    process.exit(1);
  }

  await prisma.user.update({
    where: { email },
    data: { role: 'CUSTOMER' }
  });

  console.log(`Demoted ${email} to CUSTOMER`);
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });