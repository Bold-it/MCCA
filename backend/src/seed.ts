import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting database seeding for demo environment...');

  // 1. Clear existing database tables in correct dependency order
  console.log('Cleaning existing data...');
  await prisma.session.deleteMany();
  await prisma.authEvent.deleteMany();
  await prisma.alert.deleteMany();
  await prisma.iotDevice.deleteMany();
  await prisma.biometricTemplate.deleteMany();
  await prisma.user.deleteMany();

  // 2. Hash default PIN (123456)
  const pin = '123456';
  const pinHash = await bcrypt.hash(pin, 12);
  console.log('Hashed default PIN.');

  // 3. Create Demo User
  const demoUser = await prisma.user.create({
    data: {
      name: 'Demo User',
      email: 'demo@mmca.com',
      pinHash,
      enrolledMethods: ['PIN', 'FINGERPRINT', 'FACE'],
    },
  });
  console.log(`Created user: ${demoUser.name} (${demoUser.email})`);

  // 4. Create Demo IoT Devices
  const devices = [
    {
      name: 'Home Smart Hub',
      type: 'HUB',
      platform: 'smartthings',
      status: 'CONNECTED',
    },
    {
      name: 'Demo Smart Watch',
      type: 'WEARABLE',
      platform: 'wearos',
      status: 'CONNECTED',
    },
    {
      name: 'Demo Smart TV',
      type: 'TV',
      platform: 'androidtv',
      status: 'CONNECTED',
    },
  ];

  for (const device of devices) {
    const createdDevice = await prisma.iotDevice.create({
      data: {
        userId: demoUser.id,
        name: device.name,
        type: device.type,
        platform: device.platform,
        status: device.status,
      },
    });
    console.log(`Created IoT device: ${createdDevice.name} (${createdDevice.type})`);
  }

  console.log('Database seeding completed successfully! Ready for presentation.');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
