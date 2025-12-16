# Migration Scripts

This directory contains database migration scripts for updating the schema and data.

## Multi-Tenant Migration

### Overview

The `add-multi-tenant-fields.js` script migrates existing data to support the multi-tenant system by professor. It adds `ownerAdmin` and `isPublic` fields to all content models.

### What it does

1. **Users**: Sets `ownerAdmin` for admins (self-ownership) and students
2. **Videos**: Adds `ownerAdmin` and `isPublic` fields
3. **Games**: Adds `ownerAdmin` and `isPublic` fields
4. **Pages**: Adds `ownerAdmin` and `isPublic` fields
5. **UserGameStats**: Adds `ownerAdmin` field based on user's ownerAdmin
6. **GameAttempts**: Adds `ownerAdmin` field based on user's ownerAdmin

### Prerequisites

Before running this migration:

1. **Backup your database** - Always backup before running migrations!
2. Create a superadmin user if you want existing content to be assigned to them
3. Decide if existing content should be marked as public or assigned to admins

### Configuration

The migration uses environment variables for configuration:

- `MONGODB_URI` - Database connection string (default: `mongodb://localhost:27017/app-boys-games`)
- `SUPERADMIN_USERNAME` - Username of superadmin (default: `superadmin`)
- `MIGRATION_MARK_AS_PUBLIC` - If `true`, marks all existing content as public (default: `false`)
- `MIGRATION_DRY_RUN` - If `true`, shows what would be done without making changes (default: `false`)

### Usage

#### 1. Dry Run (Recommended First)

Test what the migration will do without making changes:

```bash
MIGRATION_DRY_RUN=true node server/migrations/add-multi-tenant-fields.js
```

#### 2. Mark Existing Content as Public

If you want existing content to be available to non-authenticated users:

```bash
MIGRATION_MARK_AS_PUBLIC=true node server/migrations/add-multi-tenant-fields.js
```

This will:
- Set `isPublic=true` and `ownerAdmin=null` for all existing content
- Allow non-authenticated users to access this content via `/public/*` endpoints

#### 3. Assign Existing Content to Superadmin

If you want existing content to be private and owned by a superadmin:

```bash
SUPERADMIN_USERNAME=your_superadmin node server/migrations/add-multi-tenant-fields.js
```

This will:
- Set `isPublic=false` and `ownerAdmin=superadmin_id` for all existing content
- Only the superadmin can see and manage this content

#### 4. Assign Existing Content to Content Creators

By default (without `MIGRATION_MARK_AS_PUBLIC`), the migration will:
- Try to assign content to its creator (if creator is an admin)
- Fall back to the first admin found
- Fall back to superadmin if specified

```bash
node server/migrations/add-multi-tenant-fields.js
```

### Example Scenarios

#### Scenario 1: New Platform with No Users Yet

```bash
# Just run the migration, it will set defaults
node server/migrations/add-multi-tenant-fields.js
```

#### Scenario 2: Existing Platform, Make All Content Public

```bash
# Mark all existing content as public for non-auth users
MIGRATION_MARK_AS_PUBLIC=true node server/migrations/add-multi-tenant-fields.js
```

#### Scenario 3: Existing Platform, Assign to Superadmin

```bash
# First create a superadmin user, then:
SUPERADMIN_USERNAME=admin node server/migrations/add-multi-tenant-fields.js
```

### After Migration

After running the migration successfully:

1. Verify the data:
   - Check that users have `ownerAdmin` set correctly
   - Check that content has `ownerAdmin` and `isPublic` set
   - Check that stats and attempts have `ownerAdmin` set

2. Test the application:
   - Test authenticated user access (should see only their admin's content)
   - Test public access (should see only `isPublic=true` content)
   - Test admin features (should only manage their own content)
   - Test superadmin features (should see all content)

3. Monitor for issues:
   - Check logs for any access errors
   - Verify rankings are scoped to ownerAdmin
   - Ensure students can only see their admin's content

### Rollback

If you need to rollback the migration, you can:

1. Restore from backup
2. Or manually remove the new fields:

```javascript
// In MongoDB shell or script
db.users.updateMany({}, { $unset: { ownerAdmin: "" } });
db.videos.updateMany({}, { $unset: { ownerAdmin: "", isPublic: "" } });
db.games.updateMany({}, { $unset: { ownerAdmin: "", isPublic: "" } });
db.pages.updateMany({}, { $unset: { ownerAdmin: "", isPublic: "" } });
db.usergamestats.updateMany({}, { $unset: { ownerAdmin: "" } });
db.gameattempts.updateMany({}, { $unset: { ownerAdmin: "" } });
```

### Troubleshooting

**Problem**: "No admin found to assign students to"
- **Solution**: Create at least one admin user before running the migration

**Problem**: "Cannot assign ownerAdmin to stat"
- **Solution**: Make sure all users have been migrated first

**Problem**: Content not appearing for users
- **Solution**: Verify `ownerAdmin` matches between user and content, check `isPublic` flags

**Problem**: Public content not accessible
- **Solution**: Ensure `isPublic=true` and `ownerAdmin=null` for public content
