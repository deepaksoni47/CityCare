# City Care Migration Checklist

## Firebase to MongoDB + OAuth Integration

**Database Migration & OAuth Feature Addition**

Last Updated: January 26, 2026

---

## 📋 Overview

This document tracks all changes required to:

1. **Migrate** database from Firebase to MongoDB ✅ COMPLETED
2. **Refactor** schema from campus-oriented to city-oriented ✅ COMPLETED
3. **Add OAuth** authentication (Google, GitHub) - IN PROGRESS
4. **Update** all infrastructure and dependencies

---

## ✅ Phase 1: Database & Schema Refactoring (COMPLETED)

### Models Refactored

- ✅ Organization → City (city/municipality focused)
- ✅ Department → Agency (government agency focus)
- ✅ Building → Zone (geographic zone/district)
- ✅ Room (removed - not applicable for city)
- ✅ User (updated with OAuth support and citizen/officer/manager/admin roles)
- ✅ Issue (updated with city-oriented categories)
- ✅ IssuePrediction (updated for city context)
- ✅ Badge (updated for citizen engagement)
- ✅ Analytics (updated with zone-based metrics)

### User Roles Changed

- ✅ student → citizen
- ✅ faculty → officer
- ✅ staff → officer
- ✅ facility_manager → manager
- ✅ admin → admin

### Issue Categories Updated

- ✅ Structural/Electrical/Plumbing/HVAC → Roads/Water/Electricity/Sanitation/Parks/Public_Health/Transportation/Streetlights/Pollution/Safety
- [ ] Update API response messages and descriptions
- [ ] Update email templates (if any)

---

## 🗄️ Phase 2: Firebase → MongoDB Migration

### Database Configuration Setup

- [ ] Create `backend/src/config/mongodb.ts` - MongoDB connection config
- [ ] Create `.env.example` entries for MongoDB connection string
- [ ] Set up MongoDB connection pooling configuration
- [ ] Create development MongoDB instance (local or Atlas)
- [ ] Create staging MongoDB instance
- [ ] Create production MongoDB instance

### Mongoose Schema Creation

- [ ] Create `backend/src/models/Organization.ts` - Organization schema (replaces `/organizations` Firestore collection)
- [ ] Create `backend/src/models/Department.ts` - Department schema
- [ ] Create `backend/src/models/Building.ts` - Building schema
- [ ] Create `backend/src/models/Room.ts` - Room schema
- [ ] Create `backend/src/models/Issue.ts` - Issue schema (main collection)
- [ ] Create `backend/src/models/User.ts` - User schema (for authentication)
- [ ] Create `backend/src/models/Badge.ts` - Badge/Rewards schema
- [ ] Create `backend/src/models/Vote.ts` - Voting schema
- [ ] Create `backend/src/models/Analytics.ts` - Analytics/Metrics schema
- [ ] Create `backend/src/models/RealtimeEvent.ts` - Real-time events schema
- [ ] Add indexes to all schemas for performance
- [ ] Add database constraints and validations

### Database Service Layer

- [ ] Create database service abstraction layer
- [ ] Implement connection management utilities
- [ ] Create transaction handling utilities
- [ ] Implement error handling for MongoDB operations
- [ ] Create database backup/restore utilities

### Authentication Migration

- [ ] Remove Firebase Admin SDK from auth middleware
- [ ] Implement MongoDB user authentication
- [ ] Create JWT token generation/validation
- [ ] Create password hashing utilities
- [ ] Update auth routes for MongoDB user model
- [ ] Migrate user roles and permissions system
- [ ] Implement session management with MongoDB

### API Routes & Controllers Update

- [ ] Update issues module - Change Firestore queries to MongoDB
- [ ] Update admin module - Update admin operations
- [ ] Update analytics module - Update query logic
- [ ] Update heatmap module - Update location queries
- [ ] Update priority module - Update calculation queries
- [ ] Update voting module - Update voting logic
- [ ] Update rewards module - Update rewards logic
- [ ] Update auth module - Complete auth rewrite

### Middleware Updates

- [ ] Update auth.ts middleware - Use MongoDB auth
- [ ] Update validation.middleware.ts - Ensure compatibility
- [ ] Update upload.middleware.ts - Remove Firebase Storage references
- [ ] Update rate limiting middleware if needed

### File Storage Migration

- [ ] Determine file storage solution (AWS S3, MinIO, Azure Blob, etc.)
- [ ] Create storage service configuration
- [ ] Update upload middleware for new storage
- [ ] Migrate image URLs from Firebase Storage
- [ ] Create upload/download utilities

### Data Migration

- [ ] Create script to export data from Firebase
- [ ] Create script to transform Firebase data to MongoDB format
- [ ] Create script to import transformed data into MongoDB
- [ ] Test data integrity after migration
- [ ] Implement rollback mechanism

### Testing & Validation

- [ ] Unit tests for MongoDB models
- [ ] Integration tests for API endpoints
- [ ] Test authentication flow end-to-end
- [ ] Test real-time functionality with MongoDB
- [ ] Test analytics queries performance
- [ ] Load testing with MongoDB
- [ ] Validate data consistency across all collections

---

## 🔌 Phase 3: Dependency & Infrastructure Updates

### Backend Dependencies

- [ ] Remove Firebase Admin SDK: `npm uninstall firebase-admin`
- [ ] Install MongoDB driver: `npm install mongodb`
- [ ] Install Mongoose: `npm install mongoose`
- [ ] Install JWT dependencies: `npm install jsonwebtoken bcryptjs`
- [ ] Install other required packages
- [ ] Update tsconfig if needed

### Environment Configuration

- [ ] Update .env files with MongoDB connection string
- [ ] Remove Firebase environment variables
- [ ] Add MongoDB-specific variables (timeouts, pool size, etc.)
- [ ] Update Docker environment configuration

### Docker & Deployment

- [ ] Update backend Dockerfile to remove Firebase dependencies
- [ ] Update docker-compose.yml to include MongoDB service
- [ ] Update docker-compose.prod.yml for production MongoDB
- [ ] Update Railway configuration for MongoDB
- [ ] Update Cloud Run configuration if needed

### Frontend Integration

- [ ] Update API calls to work with new authentication
- [ ] Remove Firebase SDK from frontend
- [ ] Update auth context/hooks for MongoDB auth
- [ ] Update environment variables in frontend config
- [ ] Update type definitions for API responses

---

## 📝 Phase 4: Type Definitions & Documentation

### TypeScript Updates

- [ ] Update `backend/src/types/index.ts` for MongoDB models
- [ ] Create interface definitions for all MongoDB documents
- [ ] Update API request/response types
- [ ] Update error handling types

### Documentation Updates

- [ ] Create MongoDB schema documentation
- [ ] Document authentication flow
- [ ] Document API changes
- [ ] Create migration guide for developers
- [ ] Document database backup procedures
- [ ] Update SECURITY.md for new auth approach

### Code Comments

- [ ] Add inline documentation for MongoDB operations
- [ ] Document schema relationships
- [ ] Document authentication implementation

---

## 🧪 Phase 5: Validation & Testing

### Pre-Production Testing

- [ ] Create test database environment
- [ ] Run full integration test suite
- [ ] Test user registration flow
- [ ] Test issue creation and retrieval
- [ ] Test heatmap data queries
- [ ] Test analytics calculations
- [ ] Test real-time updates
- [ ] Test authentication tokens
- [ ] Test file uploads to new storage
- [ ] Performance benchmarking vs Firebase

### Security Testing

- [ ] Validate JWT implementation
- [ ] Test password hashing
- [ ] Test authentication bypass attempts
- [ ] Test SQL injection (if applicable)
- [ ] Test access control enforcement
- [ ] Validate CORS configuration

### Staging Deployment

- [ ] Deploy to staging environment
- [ ] Run smoke tests in staging
- [ ] Performance testing in staging
- [ ] User acceptance testing

---

## 🚀 Phase 6: Deployment & Rollback

### Pre-Deployment Checklist

- [ ] Database backups in place
- [ ] Rollback plan documented
- [ ] Team trained on new system
- [ ] Monitoring/alerting configured
- [ ] Incident response plan ready

### Deployment

- [ ] Deploy backend with MongoDB
- [ ] Migrate production data
- [ ] Deploy frontend updates
- [ ] Verify all services running
- [ ] Monitor application health

### Post-Deployment

- [ ] Verify data integrity
- [ ] Monitor error rates
- [ ] Check performance metrics
- [ ] Collect user feedback
- [ ] Document any issues

---

## 🔄 Phase 7: Post-Migration Cleanup

### Removal & Deprecation

- [ ] Remove all Firebase Admin SDK references
- [ ] Remove old Firebase configuration files
- [ ] Clean up unused Firebase imports
- [ ] Remove temporary migration scripts (after verification)
- [ ] Archive old code if needed

### Optimization

- [ ] Optimize MongoDB indexes based on query patterns
- [ ] Review and optimize connection pooling
- [ ] Implement MongoDB caching strategies
- [ ] Optimize query performance
- [ ] Review and clean up code

### Documentation

- [ ] Update deployment documentation
- [ ] Update architecture documentation
- [ ] Create troubleshooting guide for MongoDB
- [ ] Document common issues and solutions

---

## 📊 Progress Tracking

| Phase | Component          | Status         | Notes   |
| ----- | ------------------ | -------------- | ------- |
| 1     | Rebranding         | ⏳ Not Started | Pending |
| 2     | MongoDB Config     | ⏳ Not Started | Pending |
| 2     | Mongoose Models    | ⏳ Not Started | Pending |
| 2     | Auth Migration     | ⏳ Not Started | Pending |
| 2     | API Updates        | ⏳ Not Started | Pending |
| 2     | Data Migration     | ⏳ Not Started | Pending |
| 3     | Dependencies       | ⏳ Not Started | Pending |
| 3     | Docker Setup       | ⏳ Not Started | Pending |
| 4     | TypeScript Updates | ⏳ Not Started | Pending |
| 5     | Testing            | ⏳ Not Started | Pending |
| 6     | Deployment         | ⏳ Not Started | Pending |
| 7     | Cleanup            | ⏳ Not Started | Pending |

---

## 🎯 Key Milestones

1. ✅ **Checklist Created** - January 26, 2026
2. ⏳ **MongoDB Config Complete** - Target: [TBD]
3. ⏳ **Schema Models Complete** - Target: [TBD]
4. ⏳ **Auth Migration Complete** - Target: [TBD]
5. ⏳ **API Routes Updated** - Target: [TBD]
6. ⏳ **Data Migration Tested** - Target: [TBD]
7. ⏳ **Production Deployment** - Target: [TBD]

---

## 📌 Important Notes

- **Backward Compatibility**: This is a major migration - expect breaking changes
- **Data Backup**: Always maintain backups during migration
- **Testing**: Thorough testing is critical before production deployment
- **User Communication**: Notify users about any service impacts
- **Rollback Plan**: Keep Firebase running until migration is verified

---

## 👥 Team Responsibilities

| Task                | Owner | Status |
| ------------------- | ----- | ------ |
| Rebranding          | [TBD] | ⏳     |
| MongoDB Setup       | [TBD] | ⏳     |
| Schema Design       | [TBD] | ⏳     |
| Auth Implementation | [TBD] | ⏳     |
| Testing             | [TBD] | ⏳     |
| Deployment          | [TBD] | ⏳     |

---

## 🔗 References

- [MongoDB Documentation](https://docs.mongodb.com/)
- [Mongoose Documentation](https://mongoosejs.com/)
- [JWT Best Practices](https://tools.ietf.org/html/rfc7519)
- [Database Migration Guide](./docs/DATABASE_ARCHITECTURE.md)

---

**Status**: 🔄 In Progress | Last Updated: January 26, 2026
