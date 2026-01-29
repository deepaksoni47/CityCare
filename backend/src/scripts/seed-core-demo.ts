import * as dotenv from "dotenv";
import path from "path";
import { initializeMongoDB, closeMongoConnection } from "../config/mongodb";
import { City } from "../models/City";
import { Zone } from "../models/Zone";
import { Agency } from "../models/Agency";
import { User } from "../models/User";

// Load environment variables from repo root
dotenv.config({ path: path.join(__dirname, "../../../.env") });

type ZoneType =
  | "residential"
  | "commercial"
  | "industrial"
  | "public_service"
  | "transportation"
  | "utilities"
  | "other";

interface SeedZone {
  code: string;
  name: string;
  zoneType: ZoneType;
  centerPoint: { latitude: number; longitude: number };
  area: number;
  population?: number;
  status?: "active" | "under_maintenance" | "inactive";
}

interface SeedAgency {
  code: string;
  name: string;
  type:
    | "water_supply"
    | "electricity"
    | "sanitation"
    | "roads"
    | "public_health"
    | "transportation"
    | "parks"
    | "admin"
    | "other";
  contactEmail?: string;
  contactPhone?: string;
}

interface SeedUser {
  name: string;
  email: string;
  role: "citizen" | "officer" | "manager" | "admin";
  password?: string;
  agencyCode?: string;
}

async function upsertCity() {
  const cityCode = "BSP";
  const centerLatitude = 22.1310849;
  const centerLongitude = 82.1375011;

  const city = await City.findOneAndUpdate(
    { code: cityCode },
    {
      name: "Bilaspur",
      code: cityCode,
      state: "Chhattisgarh",
      country: "India",
      centerPoint: { latitude: centerLatitude, longitude: centerLongitude },
      boundaries: {
        northWest: {
          latitude: centerLatitude + 0.02,
          longitude: centerLongitude - 0.02,
        },
        northEast: {
          latitude: centerLatitude + 0.02,
          longitude: centerLongitude + 0.02,
        },
        southWest: {
          latitude: centerLatitude - 0.02,
          longitude: centerLongitude - 0.02,
        },
        southEast: {
          latitude: centerLatitude - 0.02,
          longitude: centerLongitude + 0.02,
        },
      },
      population: 450000,
      area: 162,
      administratorEmail: "admin@bilaspur-citycare.local",
      administratorPhone: "+91-99999-00000",
      website: "https://bilaspur.gov.in",
      timezone: "Asia/Kolkata",
      isActive: true,
      updatedAt: new Date(),
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  console.log(`City ready: ${city.name} (${city.code})`);
  return city;
}

async function upsertZones(cityId: string) {
  const zones: SeedZone[] = [
    {
      code: "KONI",
      name: "Koni Campus and Market",
      zoneType: "residential",
      centerPoint: { latitude: 22.1310849, longitude: 82.1375011 },
      area: 8,
      population: 55000,
    },
    {
      code: "SEEPAT",
      name: "Seepat Road Corridor",
      zoneType: "transportation",
      centerPoint: { latitude: 22.1345, longitude: 82.1512 },
      area: 12,
      population: 80000,
    },
    {
      code: "RAILWAY",
      name: "Railway Station and Bus Stand",
      zoneType: "transportation",
      centerPoint: { latitude: 22.0789, longitude: 82.1554 },
      area: 10,
      population: 120000,
    },
    {
      code: "CIVIC",
      name: "Civic Center",
      zoneType: "commercial",
      centerPoint: { latitude: 22.0905, longitude: 82.1467 },
      area: 6,
      population: 60000,
    },
  ];

  const savedZones = [] as { code: string; id: string }[];

  for (const zone of zones) {
    const saved = await Zone.findOneAndUpdate(
      { code: zone.code, cityId },
      {
        ...zone,
        cityId,
        status: zone.status || "active",
        updatedAt: new Date(),
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    savedZones.push({ code: zone.code, id: saved._id.toString() });
    console.log(`Zone ready: ${zone.code} - ${zone.name}`);
  }

  return savedZones.reduce<Record<string, string>>((acc, z) => {
    acc[z.code] = z.id;
    return acc;
  }, {});
}

async function upsertAgencies(cityId: string) {
  const agencies: SeedAgency[] = [
    {
      code: "PWD",
      name: "Public Works Department",
      type: "roads",
      contactEmail: "pwd@bilaspur.gov.in",
      contactPhone: "+91-88888-00001",
    },
    {
      code: "WATER",
      name: "Water Supply Division",
      type: "water_supply",
      contactEmail: "water@bilaspur.gov.in",
      contactPhone: "+91-88888-00002",
    },
    {
      code: "CLEAN",
      name: "Sanitation and Waste",
      type: "sanitation",
      contactEmail: "sanitation@bilaspur.gov.in",
      contactPhone: "+91-88888-00003",
    },
    {
      code: "POWER",
      name: "Electricity Board",
      type: "electricity",
      contactEmail: "power@bilaspur.gov.in",
      contactPhone: "+91-88888-00004",
    },
    {
      code: "TRANS",
      name: "Transport Authority",
      type: "transportation",
      contactEmail: "transport@bilaspur.gov.in",
      contactPhone: "+91-88888-00005",
    },
  ];

  const savedAgencies = [] as { code: string; id: string }[];

  for (const agency of agencies) {
    const saved = await Agency.findOneAndUpdate(
      { code: agency.code, cityId },
      {
        ...agency,
        cityId,
        isActive: true,
        updatedAt: new Date(),
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    savedAgencies.push({ code: agency.code, id: saved._id.toString() });
    console.log(`Agency ready: ${agency.code} - ${agency.name}`);
  }

  return savedAgencies.reduce<Record<string, string>>((acc, a) => {
    acc[a.code] = a.id;
    return acc;
  }, {});
}

async function upsertUsers(cityId: string, agencyMap: Record<string, string>) {
  const users: SeedUser[] = [
    {
      name: "City Administrator",
      email: "admin@citycare.local",
      role: "admin",
      password: "Admin@123",
    },
    {
      name: "Roads Officer",
      email: "officer.pwd@citycare.local",
      role: "officer",
      password: "Officer@123",
      agencyCode: "PWD",
    },
    {
      name: "Water Manager",
      email: "manager.water@citycare.local",
      role: "manager",
      password: "Manager@123",
      agencyCode: "WATER",
    },
    {
      name: "Community Reporter",
      email: "citizen.demo@citycare.local",
      role: "citizen",
      password: "Citizen@123",
    },
  ];

  for (const user of users) {
    const agencyId = user.agencyCode ? agencyMap[user.agencyCode] : undefined;

    // Find existing user or create new one
    let userDoc = await User.findOne({
      email: user.email,
      cityId,
    });

    if (!userDoc) {
      // Create new user - this will trigger the pre-save hook to hash password
      userDoc = new User({
        cityId,
        email: user.email,
        name: user.name,
        role: user.role,
        agencyId,
        isVerified: true,
        isActive: true,
        password: user.password,
        permissions: {
          canCreateIssues: true,
          canResolveIssues: user.role !== "citizen",
          canAssignIssues: user.role === "admin" || user.role === "manager",
          canViewAllIssues: true,
          canManageUsers: user.role === "admin",
        },
        preferences: {
          notifications: true,
          emailAlerts: true,
          receiveUpdates: true,
        },
        updatedAt: new Date(),
      });
      await userDoc.save();
    } else {
      // Update existing user, but reset password
      userDoc.name = user.name;
      userDoc.role = user.role;
      userDoc.agencyId = agencyId;
      userDoc.isVerified = true;
      userDoc.isActive = true;
      if (user.password) {
        userDoc.password = user.password; // Will be hashed by pre-save hook
      }
      userDoc.permissions = {
        canCreateIssues: true,
        canResolveIssues: user.role !== "citizen",
        canAssignIssues: user.role === "admin" || user.role === "manager",
        canViewAllIssues: true,
        canManageUsers: user.role === "admin",
      };
      userDoc.preferences = {
        notifications: true,
        emailAlerts: true,
        receiveUpdates: true,
      };
      userDoc.updatedAt = new Date();
      await userDoc.save();
    }

    console.log(`User ready: ${user.email}`);
  }
}

async function main() {
  try {
    if (!process.env.MONGODB_URI) {
      console.error("MONGODB_URI is not set. Please add it to your .env file.");
      process.exit(1);
    }

    await initializeMongoDB();

    const city = await upsertCity();
    const zoneMap = await upsertZones(city._id.toString());
    const agencyMap = await upsertAgencies(city._id.toString());
    await upsertUsers(city._id.toString(), agencyMap);

    console.log("Core demo seed completed.");
    console.log("Zone codes -> IDs:", zoneMap);
    console.log("Agency codes -> IDs:", agencyMap);
  } catch (error) {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  } finally {
    await closeMongoConnection();
  }
}

main();
