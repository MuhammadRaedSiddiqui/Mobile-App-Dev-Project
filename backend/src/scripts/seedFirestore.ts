/**
 * Seed script for Firestore - populates a live Firebase project with demo data.
 *
 * Usage:
 *   MOCK_MODE=false NODE_ENV=development npm run seed:firestore
 *
 * Requirements:
 * - MOCK_MODE must be false
 * - Firebase credentials must be configured
 * - Firestore database must exist
 *
 * This script is idempotent - it can be run multiple times safely.
 */

import { config } from '../config/env';
import { initFirebase, getDb } from '../config/firebase';
import { createListing, createUser } from '../services/firestore';
import { FieldValue } from 'firebase-admin/firestore';

// Demo categories
const CATEGORIES = [
  { categoryId: 'one-bed', name: '1-Bed Flats', slug: 'one-bed', iconName: 'bed', sortOrder: 1 },
  { categoryId: 'portion', name: 'Portions', slug: 'portion', iconName: 'home', sortOrder: 2 },
  { categoryId: 'shared', name: 'Shared / Roommate', slug: 'shared', iconName: 'users', sortOrder: 3 },
  { categoryId: 'studio', name: 'Studios', slug: 'studio', iconName: 'square', sortOrder: 4 },
];

// Demo users
const DEMO_USERS = [
  {
    uid: 'seeker-ayesha',
    email: 'ayesha@example.com',
    displayName: 'Ayesha Khan',
    role: 'seeker' as const,
    verificationStatus: 'verified' as const,
    isActive: true,
  },
  {
    uid: 'seeker-raed',
    email: 'raed@example.com',
    displayName: 'Raed',
    role: 'seeker' as const,
    verificationStatus: 'unverified' as const,
    isActive: true,
  },
  {
    uid: 'agent-danish',
    email: 'danish@example.com',
    displayName: 'Danish Ahmed',
    role: 'agent' as const,
    phone: '0300-1234567',
    verificationStatus: 'verified' as const,
    isActive: true,
  },
  {
    uid: 'agent-sara',
    email: 'sara@example.com',
    displayName: 'Sara Malik',
    role: 'agent' as const,
    phone: '0321-7654321',
    verificationStatus: 'verified' as const,
    isActive: true,
  },
];

// Helper to calculate dates
const daysAgo = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
};

// Demo listings
const DEMO_LISTINGS = [
  {
    listingId: 'lst-001',
    agentId: 'agent-danish',
    categoryId: 'one-bed',
    title: '1-Bed Flat, Block 13, Gulshan-e-Iqbal',
    description: 'Bright 1-bedroom flat with a small balcony, close to public transport.',
    price: 38000,
    priceType: 'monthly' as const,
    area: 650,
    bedrooms: 1,
    bathrooms: 1,
    imageUrls: ['https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=800&q=70'],
    location: {
      lat: 24.9213,
      lng: 67.0871,
      address: 'Block 13, Gulshan-e-Iqbal',
      city: 'Karachi',
      area: 'Gulshan-e-Iqbal',
    },
    locationTags: ['near-transport', 'balcony', 'water-24-7', 'fiber-internet'],
    geohash: '7ww0j',
    status: 'active' as const,
    viewCount: 214,
    lastVerifiedAt: daysAgo(2),
    cost: {
      rent: 38000,
      depositMonths: 2,
      monthlyMaintenance: 2500,
      estimatedUtilities: 6500,
    },
  },
  {
    listingId: 'lst-002',
    agentId: 'agent-sara',
    categoryId: 'studio',
    title: 'Studio, Johar Town Block 15',
    description: 'Compact fully-furnished studio, ideal for a single professional.',
    price: 26000,
    priceType: 'monthly' as const,
    area: 420,
    bathrooms: 1,
    imageUrls: ['https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=800&q=70'],
    location: {
      lat: 24.9156,
      lng: 67.1301,
      address: 'Block 15, Gulistan-e-Johar',
      city: 'Karachi',
      area: 'Gulistan-e-Johar',
    },
    locationTags: ['furnished', 'loadshedding-low'],
    geohash: '7ww1k',
    status: 'active' as const,
    viewCount: 132,
    lastVerifiedAt: daysAgo(4),
    cost: {
      rent: 26000,
      depositMonths: 1,
      monthlyMaintenance: 1800,
      estimatedUtilities: 4200,
    },
  },
];

async function seedFirestore() {
  console.log('🌱 Starting Firestore seed...\n');

  // Validate we're not in mock mode
  if (config.mockMode) {
    console.error('❌ Error: Cannot seed Firestore in mock mode.');
    console.error('   Set MOCK_MODE=false in your .env file.\n');
    process.exit(1);
  }

  // Initialize Firebase
  try {
    initFirebase();
    const db = getDb();

    if (!db) {
      console.error('❌ Error: Firestore not initialized.');
      console.error('   Check your Firebase credentials.\n');
      process.exit(1);
    }

    console.log('✓ Connected to Firestore\n');
  } catch (error) {
    console.error('❌ Error initializing Firebase:', error);
    process.exit(1);
  }

  const db = getDb()!;

  try {
    // Seed categories
    console.log('📁 Seeding categories...');
    for (const category of CATEGORIES) {
      await db.collection('categories').doc(category.categoryId).set({
        ...category,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      console.log(`   ✓ ${category.name}`);
    }
    console.log('');

    // Seed users
    console.log('👥 Seeding users...');
    for (const userData of DEMO_USERS) {
      await createUser(userData.uid, userData);
      console.log(`   ✓ ${userData.displayName} (${userData.role})`);
    }
    console.log('');

    // Seed listings
    console.log('🏠 Seeding listings...');
    for (const listingData of DEMO_LISTINGS) {
      await createListing(listingData);
      console.log(`   ✓ ${listingData.title}`);
    }
    console.log('');

    console.log('✅ Seed complete!\n');
    console.log('Next steps:');
    console.log('  1. Deploy Firestore security rules: firebase deploy --only firestore:rules');
    console.log('  2. Deploy Firestore indexes: firebase deploy --only firestore:indexes');
    console.log('  3. Deploy Storage rules: firebase deploy --only storage');
    console.log('  4. Test your backend with MOCK_MODE=false\n');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Seed failed:', error);
    process.exit(1);
  }
}

// Run the seed
seedFirestore();
