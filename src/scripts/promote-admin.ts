import { prisma } from '../lib/prisma';

async function main() {
  const email = process.argv[2];

  if (!email) {
    throw new Error('Please provide an email. Example: npm run admin:promote -- you@example.com');
  }

  const user = await prisma.user.update({
    where: { email },
    data: { role: 'ADMIN' }
  });

  console.log(`Promoted ${user.email} to ADMIN`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });