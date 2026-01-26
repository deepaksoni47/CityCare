import * as dotenv from "dotenv";
import path from "path";
import mongoose, { Schema } from "mongoose";
import { initializeMongoDB, closeMongoConnection } from "../config/mongodb";

// Load environment variables from repo root
dotenv.config({ path: path.join(__dirname, "../../../.env") });

interface BadgeDefinition {
  _id: string; // stable id
  name: string;
  description: string;
  icon?: string;
  category: "reporter" | "voter" | "resolver" | "community";
  criteria: {
    type:
      | "issues_reported"
      | "votes_cast"
      | "issues_resolved"
      | "helpful_votes_received";
    threshold: number;
    description: string;
    categories?: string[];
  };
  pointsAwarded: number;
  rarity: "common" | "rare" | "epic";
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const BadgeDefinitionSchema = new Schema<BadgeDefinition>(
  {
    _id: { type: String, required: true },
    name: { type: String, required: true },
    description: { type: String, required: true },
    icon: { type: String },
    category: {
      type: String,
      enum: ["reporter", "voter", "resolver", "community"],
      required: true,
      index: true,
    },
    criteria: { type: Schema.Types.Mixed, required: true },
    pointsAwarded: { type: Number, default: 0 },
    rarity: {
      type: String,
      enum: ["common", "rare", "epic"],
      default: "common",
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

const BadgeDefinitionModel =
  mongoose.models.BadgeDefinition ||
  mongoose.model<BadgeDefinition>(
    "BadgeDefinition",
    BadgeDefinitionSchema,
    "badge_definitions",
  );

/**
 * Seed city-themed badge definitions into MongoDB
 */
async function seedBadges() {
  console.warn("🏆 Seeding city-themed Hinglish badges to MongoDB...\n");

  const badges: BadgeDefinition[] = [
    // REPORTER BADGES
    {
      _id: "pehla_report",
      name: "Pehla Report",
      description: "Apni pehli shikayat darj karo",
      icon: "🎯",
      category: "reporter",
      criteria: {
        type: "issues_reported",
        threshold: 1,
        description: "Report 1 issue",
      },
      pointsAwarded: 10,
      rarity: "common",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      _id: "shehar_reporter",
      name: "Shehar Reporter",
      description: "10 city issues register karo",
      icon: "📝",
      category: "reporter",
      criteria: {
        type: "issues_reported",
        threshold: 10,
        description: "Report 10 issues",
      },
      pointsAwarded: 60,
      rarity: "common",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      _id: "city_yodha",
      name: "City Yodha",
      description: "25 tezz reports se shehar jagao",
      icon: "🛡️",
      category: "reporter",
      criteria: {
        type: "issues_reported",
        threshold: 25,
        description: "Report 25 issues",
      },
      pointsAwarded: 180,
      rarity: "rare",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      _id: "metro_sentinel",
      name: "Metro Sentinel",
      description: "100 reports – shehar suraksha squad",
      icon: "🏙️",
      category: "reporter",
      criteria: {
        type: "issues_reported",
        threshold: 100,
        description: "Report 100 issues",
      },
      pointsAwarded: 650,
      rarity: "epic",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },

    // VOTER BADGES
    {
      _id: "pehla_vote",
      name: "Pehla Vote",
      description: "Pehli baar vote karke priority set karo",
      icon: "🗳️",
      category: "voter",
      criteria: {
        type: "votes_cast",
        threshold: 1,
        description: "Vote on 1 issue",
      },
      pointsAwarded: 5,
      rarity: "common",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      _id: "gully_influencer",
      name: "Gully Influencer",
      description: "25 votes – galli ka mood set karo",
      icon: "📢",
      category: "voter",
      criteria: {
        type: "votes_cast",
        threshold: 25,
        description: "Vote on 25 issues",
      },
      pointsAwarded: 90,
      rarity: "common",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      _id: "awaaz_ka_captain",
      name: "Awaaz Ka Captain",
      description: "75 votes – shehar ki priority ghumao",
      icon: "🧭",
      category: "voter",
      criteria: {
        type: "votes_cast",
        threshold: 75,
        description: "Vote on 75 issues",
      },
      pointsAwarded: 220,
      rarity: "rare",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      _id: "janata_speaker",
      name: "Janata Speaker",
      description: "200 votes – sabki awaaz tumse",
      icon: "📣",
      category: "voter",
      criteria: {
        type: "votes_cast",
        threshold: 200,
        description: "Vote on 200 issues",
      },
      pointsAwarded: 500,
      rarity: "epic",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },

    // RESOLVER BADGES
    {
      _id: "fixer_bhai",
      name: "Fixer Bhai",
      description: "Pehla issue solve karne ka credit",
      icon: "🛠️",
      category: "resolver",
      criteria: {
        type: "issues_resolved",
        threshold: 1,
        description: "Resolve 1 issue",
      },
      pointsAwarded: 15,
      rarity: "common",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      _id: "nukkad_ninja",
      name: "Nukkad Ninja",
      description: "15 fixes – gali ka superhero",
      icon: "🥷",
      category: "resolver",
      criteria: {
        type: "issues_resolved",
        threshold: 15,
        description: "Resolve 15 issues",
      },
      pointsAwarded: 160,
      rarity: "common",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      _id: "shehar_sudharak",
      name: "Shehar Sudharak",
      description: "60 fixes – maintenance ka malik",
      icon: "⚡",
      category: "resolver",
      criteria: {
        type: "issues_resolved",
        threshold: 60,
        description: "Resolve 60 issues",
      },
      pointsAwarded: 420,
      rarity: "rare",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      _id: "city_samrat",
      name: "City Samrat",
      description: "200 fixes – shehar tumhare hawale",
      icon: "👑",
      category: "resolver",
      criteria: {
        type: "issues_resolved",
        threshold: 200,
        description: "Resolve 200 issues",
      },
      pointsAwarded: 900,
      rarity: "epic",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },

    // COMMUNITY BADGES
    {
      _id: "feedback_king",
      name: "Feedback King",
      description: "10 helpful votes – log tum par bharosa karte hain",
      icon: "💡",
      category: "community",
      criteria: {
        type: "helpful_votes_received",
        threshold: 10,
        description: "Receive 10 helpful votes",
      },
      pointsAwarded: 60,
      rarity: "common",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      _id: "chowk_champion",
      name: "Chowk Champion",
      description: "40 helpful votes – sabka guide",
      icon: "🧭",
      category: "community",
      criteria: {
        type: "helpful_votes_received",
        threshold: 40,
        description: "Receive 40 helpful votes",
      },
      pointsAwarded: 180,
      rarity: "common",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      _id: "mohalla_mentor",
      name: "Mohalla Mentor",
      description: "120 helpful votes – asli community hero",
      icon: "🤝",
      category: "community",
      criteria: {
        type: "helpful_votes_received",
        threshold: 120,
        description: "Receive 120 helpful votes",
      },
      pointsAwarded: 520,
      rarity: "epic",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  await BadgeDefinitionModel.deleteMany({});
  await BadgeDefinitionModel.insertMany(badges);

  console.warn(`✅ Seeded ${badges.length} city-themed badges into MongoDB`);
}

async function main() {
  try {
    if (!process.env.MONGODB_URI) {
      console.error("MONGODB_URI is not set. Please add it to your .env file.");
      process.exit(1);
    }

    await initializeMongoDB();
    await seedBadges();
    console.warn("🎉 Badge definitions seeding completed successfully");
  } catch (error) {
    console.error("❌ Error seeding badges:", error);
    process.exitCode = 1;
  } finally {
    await closeMongoConnection();
  }
}

main();
