import fs from 'fs';
import initSqlJs from 'sql.js';
import { prisma } from '../lib/prisma';

type Row = Record<string, unknown>;

function readAll(db: any, table: string): Row[] {
  const result = db.exec(`SELECT * FROM "${table}"`);
  if (!result.length) return [];

  const columns: string[] = result[0].columns;
  const values: unknown[][] = result[0].values;

  return values.map((row) =>
    Object.fromEntries(columns.map((column, index) => [column, row[index]]))
  );
}

function asString(value: unknown): string {
  return value == null ? '' : String(value);
}

function asNullableString(value: unknown): string | null {
  return value == null ? null : String(value);
}

function asDate(value: unknown): Date {
  if (value == null) {
    return new Date();
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }

  if (typeof value === 'number') {
    const numericDate = new Date(value);
    if (!Number.isNaN(numericDate.getTime())) {
      return numericDate;
    }
  }

  const stringValue = String(value).trim();

  if (!stringValue) {
    return new Date();
  }

  const directDate = new Date(stringValue);
  if (!Number.isNaN(directDate.getTime())) {
    return directDate;
  }

  const sqliteLikeDate = new Date(stringValue.replace(' ', 'T') + 'Z');
  if (!Number.isNaN(sqliteLikeDate.getTime())) {
    return sqliteLikeDate;
  }

  throw new Error(`Invalid date value encountered during import: ${JSON.stringify(value)}`);
}

async function main() {
  const sqlitePath = process.argv[2] || 'prisma/dev.sqlite.backup.db';

  if (!fs.existsSync(sqlitePath)) {
    throw new Error(`SQLite backup not found at: ${sqlitePath}`);
  }

  const SQL = await initSqlJs({});
  const fileBuffer = fs.readFileSync(sqlitePath);
  const sqliteDb = new SQL.Database(fileBuffer);

  const users = readAll(sqliteDb, 'User');
  const pets = readAll(sqliteDb, 'Pet');
  const bookings = readAll(sqliteDb, 'Booking');
  const messages = readAll(sqliteDb, 'Message');
  const auditLogs = readAll(sqliteDb, 'AuditLog');

  console.log(`Found ${users.length} users`);
  console.log(`Found ${pets.length} pets`);
  console.log(`Found ${bookings.length} bookings`);
  console.log(`Found ${messages.length} messages`);
  console.log(`Found ${auditLogs.length} audit logs`);

  for (const user of users) {
    await prisma.user.upsert({
      where: { email: asString(user.email) },
      update: {
        fullName: asString(user.fullName),
        phone: asNullableString(user.phone),
        passwordHash: asString(user.passwordHash),
        role: asString(user.role) as 'CUSTOMER' | 'ADMIN',
        createdAt: asDate(user.createdAt),
        updatedAt: asDate(user.updatedAt),
      },
      create: {
        id: asString(user.id),
        fullName: asString(user.fullName),
        email: asString(user.email),
        phone: asNullableString(user.phone),
        passwordHash: asString(user.passwordHash),
        role: asString(user.role) as 'CUSTOMER' | 'ADMIN',
        createdAt: asDate(user.createdAt),
        updatedAt: asDate(user.updatedAt),
      },
    });
  }

  for (const pet of pets) {
    await prisma.pet.create({
      data: {
        id: asString(pet.id),
        ownerId: asString(pet.ownerId),
        name: asString(pet.name),
        breed: asString(pet.breed),
        age: asString(pet.age),
        photoUrl: asNullableString(pet.photoUrl),
        createdAt: asDate(pet.createdAt),
        updatedAt: asDate(pet.updatedAt),
      },
    });
  }

  for (const booking of bookings) {
    await prisma.booking.create({
      data: {
        id: asString(booking.id),
        ownerId: asString(booking.ownerId),
        petId: asString(booking.petId),
        startDate: asString(booking.startDate),
        endDate: asString(booking.endDate),
        notes: asString(booking.notes),
        status: asString(booking.status) as
          | 'PENDING'
          | 'CONFIRMED'
          | 'DECLINED'
          | 'COMPLETED'
          | 'CANCELLED',
        createdAt: asDate(booking.createdAt),
        updatedAt: asDate(booking.updatedAt),
      },
    });
  }

  for (const message of messages) {
    await prisma.message.create({
      data: {
        id: asString(message.id),
        bookingId: asString(message.bookingId),
        sender: asString(message.sender),
        text: asString(message.text),
        createdAt: asDate(message.createdAt),
      },
    });
  }

  for (const auditLog of auditLogs) {
    await prisma.auditLog.create({
      data: {
        id: asString(auditLog.id),
        actorUserId: asNullableString(auditLog.actorUserId),
        action: asString(auditLog.action),
        entityType: asString(auditLog.entityType),
        entityId: asNullableString(auditLog.entityId),
        details: asNullableString(auditLog.details),
        createdAt: asDate(auditLog.createdAt),
      },
    });
  }

  console.log('SQLite to PostgreSQL import complete');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });