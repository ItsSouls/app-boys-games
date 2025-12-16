#!/usr/bin/env node
/**
 * Migration script: Add multi-tenant fields (ownerAdmin, isPublic)
 *
 * This script migrates existing data to the multi-tenant system:
 * 1. Updates Videos, Games, Pages with ownerAdmin and isPublic
 * 2. Updates Users to ensure students have ownerAdmin and admins own themselves
 * 3. Updates UserGameStats and GameAttempt with ownerAdmin
 *
 * Run with: node server/migrations/add-multi-tenant-fields.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { User } from '../models/User.js';
import { Video } from '../models/Video.js';
import { Game } from '../models/Game.js';
import { Page } from '../models/Page.js';
import { UserGameStats } from '../models/UserGameStats.js';
import { GameAttempt } from '../models/GameAttempt.js';

// Load environment variables
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/app-boys-games';
const SUPERADMIN_USERNAME = process.env.SUPERADMIN_USERNAME || 'superadmin';

// Migration options
const MARK_EXISTING_CONTENT_AS_PUBLIC = process.env.MIGRATION_MARK_AS_PUBLIC === 'true';
const DRY_RUN = process.env.MIGRATION_DRY_RUN === 'true';

async function connectDB() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✓ Connected to MongoDB');
  } catch (error) {
    console.error('✗ Error connecting to MongoDB:', error);
    process.exit(1);
  }
}

async function disconnectDB() {
  await mongoose.disconnect();
  console.log('✓ Disconnected from MongoDB');
}

/**
 * Step 1: Migrate Users
 * - Admins: set ownerAdmin = their own _id (self-ownership)
 * - Students without ownerAdmin: need manual assignment or default to first admin
 */
async function migrateUsers() {
  console.log('\n📊 Step 1: Migrating Users...');

  try {
    // Find all admins without ownerAdmin
    const adminsWithoutOwner = await User.find({
      role: 'admin',
      ownerAdmin: { $exists: false }
    });

    console.log(`  Found ${adminsWithoutOwner.length} admins without ownerAdmin`);

    if (!DRY_RUN && adminsWithoutOwner.length > 0) {
      for (const admin of adminsWithoutOwner) {
        admin.ownerAdmin = admin._id;
        await admin.save();
        console.log(`  ✓ Admin "${admin.username}" now owns themselves`);
      }
    }

    // Find students without ownerAdmin
    const studentsWithoutOwner = await User.find({
      role: 'user',
      ownerAdmin: { $exists: false }
    });

    console.log(`  Found ${studentsWithoutOwner.length} students without ownerAdmin`);

    if (studentsWithoutOwner.length > 0) {
      // Get first admin as default
      const defaultAdmin = await User.findOne({ role: 'admin' });

      if (!defaultAdmin) {
        console.log('  ⚠️  WARNING: No admin found to assign students to');
        console.log('  ⚠️  Please create an admin first or manually assign ownerAdmin to students');
      } else {
        console.log(`  ℹ️  Students will be assigned to admin: ${defaultAdmin.username}`);

        if (!DRY_RUN) {
          for (const student of studentsWithoutOwner) {
            student.ownerAdmin = defaultAdmin._id;
            await student.save();
            console.log(`  ✓ Student "${student.username}" assigned to admin "${defaultAdmin.username}"`);
          }
        }
      }
    }

    console.log('✓ Users migration completed');
  } catch (error) {
    console.error('✗ Error migrating users:', error);
    throw error;
  }
}

/**
 * Step 2: Migrate Videos
 * - Set ownerAdmin and isPublic based on configuration
 */
async function migrateVideos() {
  console.log('\n📊 Step 2: Migrating Videos...');

  try {
    const videosWithoutOwner = await Video.find({
      ownerAdmin: { $exists: false }
    });

    console.log(`  Found ${videosWithoutOwner.length} videos without ownerAdmin`);

    if (!DRY_RUN && videosWithoutOwner.length > 0) {
      const superadmin = await User.findOne({ username: SUPERADMIN_USERNAME });

      for (const video of videosWithoutOwner) {
        if (MARK_EXISTING_CONTENT_AS_PUBLIC) {
          // Mark as public content
          video.isPublic = true;
          video.ownerAdmin = null;
          console.log(`  ✓ Video "${video.title}" marked as public`);
        } else if (superadmin) {
          // Assign to superadmin
          video.isPublic = false;
          video.ownerAdmin = superadmin._id;
          console.log(`  ✓ Video "${video.title}" assigned to superadmin`);
        } else {
          // Assign to video creator or first admin
          const creator = await User.findById(video.createdBy);
          if (creator && creator.role === 'admin') {
            video.isPublic = false;
            video.ownerAdmin = creator._id;
            console.log(`  ✓ Video "${video.title}" assigned to creator admin`);
          } else {
            const firstAdmin = await User.findOne({ role: 'admin' });
            if (firstAdmin) {
              video.isPublic = false;
              video.ownerAdmin = firstAdmin._id;
              console.log(`  ✓ Video "${video.title}" assigned to first admin`);
            } else {
              console.log(`  ⚠️  WARNING: No admin found for video "${video.title}"`);
              continue;
            }
          }
        }

        await video.save();
      }
    }

    console.log('✓ Videos migration completed');
  } catch (error) {
    console.error('✗ Error migrating videos:', error);
    throw error;
  }
}

/**
 * Step 3: Migrate Games
 * - Set ownerAdmin and isPublic based on configuration
 */
async function migrateGames() {
  console.log('\n📊 Step 3: Migrating Games...');

  try {
    const gamesWithoutOwner = await Game.find({
      ownerAdmin: { $exists: false }
    });

    console.log(`  Found ${gamesWithoutOwner.length} games without ownerAdmin`);

    if (!DRY_RUN && gamesWithoutOwner.length > 0) {
      const superadmin = await User.findOne({ username: SUPERADMIN_USERNAME });

      for (const game of gamesWithoutOwner) {
        if (MARK_EXISTING_CONTENT_AS_PUBLIC) {
          // Mark as public content
          game.isPublic = true;
          game.ownerAdmin = null;
          console.log(`  ✓ Game "${game.title}" marked as public`);
        } else if (superadmin) {
          // Assign to superadmin
          game.isPublic = false;
          game.ownerAdmin = superadmin._id;
          console.log(`  ✓ Game "${game.title}" assigned to superadmin`);
        } else {
          // Assign to game creator or first admin
          const creator = await User.findById(game.createdBy);
          if (creator && creator.role === 'admin') {
            game.isPublic = false;
            game.ownerAdmin = creator._id;
            console.log(`  ✓ Game "${game.title}" assigned to creator admin`);
          } else {
            const firstAdmin = await User.findOne({ role: 'admin' });
            if (firstAdmin) {
              game.isPublic = false;
              game.ownerAdmin = firstAdmin._id;
              console.log(`  ✓ Game "${game.title}" assigned to first admin`);
            } else {
              console.log(`  ⚠️  WARNING: No admin found for game "${game.title}"`);
              continue;
            }
          }
        }

        await game.save();
      }
    }

    console.log('✓ Games migration completed');
  } catch (error) {
    console.error('✗ Error migrating games:', error);
    throw error;
  }
}

/**
 * Step 4: Migrate Pages
 * - Set ownerAdmin and isPublic based on configuration
 */
async function migratePages() {
  console.log('\n📊 Step 4: Migrating Pages...');

  try {
    const pagesWithoutOwner = await Page.find({
      ownerAdmin: { $exists: false }
    });

    console.log(`  Found ${pagesWithoutOwner.length} pages without ownerAdmin`);

    if (!DRY_RUN && pagesWithoutOwner.length > 0) {
      const superadmin = await User.findOne({ username: SUPERADMIN_USERNAME });

      for (const page of pagesWithoutOwner) {
        if (MARK_EXISTING_CONTENT_AS_PUBLIC) {
          // Mark as public content
          page.isPublic = true;
          page.ownerAdmin = null;
          console.log(`  ✓ Page "${page.topic}" marked as public`);
        } else if (superadmin) {
          // Assign to superadmin
          page.isPublic = false;
          page.ownerAdmin = superadmin._id;
          console.log(`  ✓ Page "${page.topic}" assigned to superadmin`);
        } else {
          // Assign to page creator or first admin
          const creator = await User.findById(page.createdBy);
          if (creator && creator.role === 'admin') {
            page.isPublic = false;
            page.ownerAdmin = creator._id;
            console.log(`  ✓ Page "${page.topic}" assigned to creator admin`);
          } else {
            const firstAdmin = await User.findOne({ role: 'admin' });
            if (firstAdmin) {
              page.isPublic = false;
              page.ownerAdmin = firstAdmin._id;
              console.log(`  ✓ Page "${page.topic}" assigned to first admin`);
            } else {
              console.log(`  ⚠️  WARNING: No admin found for page "${page.topic}"`);
              continue;
            }
          }
        }

        await page.save();
      }
    }

    console.log('✓ Pages migration completed');
  } catch (error) {
    console.error('✗ Error migrating pages:', error);
    throw error;
  }
}

/**
 * Step 5: Migrate UserGameStats
 * - Set ownerAdmin based on user's ownerAdmin
 */
async function migrateUserGameStats() {
  console.log('\n📊 Step 5: Migrating UserGameStats...');

  try {
    const statsWithoutOwner = await UserGameStats.find({
      ownerAdmin: { $exists: false }
    });

    console.log(`  Found ${statsWithoutOwner.length} stats without ownerAdmin`);

    if (!DRY_RUN && statsWithoutOwner.length > 0) {
      for (const stat of statsWithoutOwner) {
        const user = await User.findById(stat.user);
        if (user && user.ownerAdmin) {
          stat.ownerAdmin = user.ownerAdmin;
          await stat.save();
          console.log(`  ✓ Stat for user "${user.username}" assigned ownerAdmin`);
        } else {
          console.log(`  ⚠️  WARNING: Cannot assign ownerAdmin to stat (user not found or user has no ownerAdmin)`);
        }
      }
    }

    console.log('✓ UserGameStats migration completed');
  } catch (error) {
    console.error('✗ Error migrating user game stats:', error);
    throw error;
  }
}

/**
 * Step 6: Migrate GameAttempt
 * - Set ownerAdmin based on user's ownerAdmin
 */
async function migrateGameAttempts() {
  console.log('\n📊 Step 6: Migrating GameAttempts...');

  try {
    const attemptsWithoutOwner = await GameAttempt.find({
      ownerAdmin: { $exists: false }
    });

    console.log(`  Found ${attemptsWithoutOwner.length} attempts without ownerAdmin`);

    if (!DRY_RUN && attemptsWithoutOwner.length > 0) {
      for (const attempt of attemptsWithoutOwner) {
        if (!attempt.user) {
          // Anonymous attempt, keep ownerAdmin as null
          attempt.ownerAdmin = null;
          await attempt.save();
          console.log(`  ✓ Anonymous attempt kept without ownerAdmin`);
        } else {
          const user = await User.findById(attempt.user);
          if (user && user.ownerAdmin) {
            attempt.ownerAdmin = user.ownerAdmin;
            await attempt.save();
            console.log(`  ✓ Attempt for user "${user.username}" assigned ownerAdmin`);
          } else {
            console.log(`  ⚠️  WARNING: Cannot assign ownerAdmin to attempt (user not found or user has no ownerAdmin)`);
          }
        }
      }
    }

    console.log('✓ GameAttempts migration completed');
  } catch (error) {
    console.error('✗ Error migrating game attempts:', error);
    throw error;
  }
}

/**
 * Main migration function
 */
async function runMigration() {
  console.log('🚀 Starting multi-tenant migration...');
  console.log(`   MongoDB URI: ${MONGODB_URI}`);
  console.log(`   Superadmin Username: ${SUPERADMIN_USERNAME}`);
  console.log(`   Mark existing content as public: ${MARK_EXISTING_CONTENT_AS_PUBLIC}`);
  console.log(`   Dry run mode: ${DRY_RUN}`);

  if (DRY_RUN) {
    console.log('\n⚠️  DRY RUN MODE - No changes will be made to the database');
  }

  console.log('\n' + '='.repeat(60));

  try {
    await connectDB();

    await migrateUsers();
    await migrateVideos();
    await migrateGames();
    await migratePages();
    await migrateUserGameStats();
    await migrateGameAttempts();

    console.log('\n' + '='.repeat(60));
    console.log('✓ Migration completed successfully!');

    if (DRY_RUN) {
      console.log('\n⚠️  This was a DRY RUN. Set MIGRATION_DRY_RUN=false to apply changes.');
    }
  } catch (error) {
    console.error('\n✗ Migration failed:', error);
    process.exit(1);
  } finally {
    await disconnectDB();
  }
}

// Run migration
runMigration();
