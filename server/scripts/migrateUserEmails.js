import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { User } from '../models/User.js';

// Load environment variables
dotenv.config();

const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error('Error: MONGO_URI no está configurada en .env');
  process.exit(1);
}

async function migrateUserEmails() {
  try {
    console.log('Conectando a MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('✓ Conectado a MongoDB');

    // Find users without email
    const usersWithoutEmail = await User.find({ email: { $exists: false } });
    console.log(`\nEncontrados ${usersWithoutEmail.length} usuarios sin email`);

    if (usersWithoutEmail.length === 0) {
      console.log('No hay usuarios para migrar.');
      await mongoose.connection.close();
      return;
    }

    console.log('\nMigrando usuarios...');
    let migrated = 0;

    for (const user of usersWithoutEmail) {
      // Generate email based on username
      const generatedEmail = `${user.username}@legacy.elrinconespanol.local`;

      user.email = generatedEmail;
      await user.save();

      console.log(`✓ Usuario migrado: ${user.username} → ${generatedEmail}`);
      migrated++;
    }

    console.log(`\n✅ Migración completada: ${migrated} usuarios actualizados`);
    await mongoose.connection.close();
    console.log('Conexión cerrada');
  } catch (error) {
    console.error('❌ Error durante la migración:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

// Run migration
migrateUserEmails();
