import * as dotenv from "dotenv";
import path from "path";
import { initializeMongoDB, closeMongoConnection } from "../config/mongodb";
import { City } from "../models/City";
import { Zone } from "../models/Zone";
import { User } from "../models/User";
import { Issue } from "../models/Issue";
import {
  priorityEngine,
  PriorityInput,
} from "../modules/priority/priority-engine";
import { IssueCategory, IssuePriority } from "../types";

// Load environment variables from repo root
dotenv.config({ path: path.join(__dirname, "../../../.env") });

type IssueCategorySchema =
  | "Roads"
  | "Water"
  | "Electricity"
  | "Sanitation"
  | "Parks"
  | "Public_Health"
  | "Transportation"
  | "Streetlights"
  | "Pollution"
  | "Safety"
  | "Other";

interface SeedZone {
  code: string;
  name: string;
  zoneType:
    | "residential"
    | "commercial"
    | "industrial"
    | "public_service"
    | "transportation"
    | "utilities"
    | "other";
  centerPoint: { latitude: number; longitude: number };
  area: number;
  population?: number;
  status?: "active" | "under_maintenance" | "inactive";
}

interface SeedIssue {
  title: string;
  description: string;
  category: IssueCategorySchema;
  severity: number;
  location: { latitude: number; longitude: number; address?: string };
  zoneCode: string;
  reportedByRole: "citizen" | "officer" | "manager" | "admin";
  submissionType?: "text" | "voice" | "image" | "mixed";
  occupancy?: number;
  blocksAccess?: boolean;
  safetyRisk?: boolean;
  criticalInfrastructure?: boolean;
  affectsAcademics?: boolean;
  examPeriod?: boolean;
  isRecurring?: boolean;
  previousOccurrences?: number;
  estimatedCost?: number;
  affectedPeople?: number;
}

function mapToPriorityCategory(category: IssueCategorySchema): IssueCategory {
  switch (category) {
    case "Roads":
    case "Streetlights":
    case "Transportation":
      return IssueCategory.SAFETY;
    case "Water":
      return IssueCategory.PLUMBING;
    case "Electricity":
      return IssueCategory.ELECTRICAL;
    case "Sanitation":
      return IssueCategory.CLEANLINESS;
    case "Pollution":
      return IssueCategory.MAINTENANCE;
    case "Safety":
      return IssueCategory.SAFETY;
    default:
      return IssueCategory.OTHER;
  }
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

async function upsertReporter(cityId: string) {
  const reporterEmail = "citizen.bilaspur@citycare.local";

  const reporter = await User.findOneAndUpdate(
    { email: reporterEmail, cityId },
    {
      cityId,
      email: reporterEmail,
      name: "Bilaspur Citizen Reporter",
      role: "citizen",
      isVerified: true,
      isActive: true,
      permissions: {
        canReportIssues: true,
        canResolveIssues: false,
        canAssignIssues: false,
        canViewAllIssues: true,
        canManageUsers: false,
        canGenerateReports: false,
      },
      preferences: {
        notifications: true,
        emailAlerts: true,
        receiveUpdates: true,
      },
      updatedAt: new Date(),
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  console.log(`Reporter ready: ${reporter.email}`);
  return reporter._id.toString();
}

function buildPriorityInput(issue: SeedIssue, zoneId: string): PriorityInput {
  return {
    category: mapToPriorityCategory(issue.category),
    severity: issue.severity,
    description: issue.description,
    zoneId,
    occupancy: issue.occupancy ?? issue.affectedPeople,
    reportedAt: new Date(),
    blocksAccess: issue.blocksAccess,
    safetyRisk: issue.safetyRisk,
    criticalInfrastructure: issue.criticalInfrastructure,
    affectsAcademics: issue.affectsAcademics,
    examPeriod: issue.examPeriod,
    isRecurring: issue.isRecurring,
    previousOccurrences: issue.previousOccurrences,
  };
}

function priorityToSeverity(priority: IssuePriority): number {
  switch (priority) {
    case IssuePriority.CRITICAL:
      return 9;
    case IssuePriority.HIGH:
      return 7;
    case IssuePriority.MEDIUM:
      return 5;
    default:
      return 3;
  }
}

async function seedIssues(
  cityId: string,
  zoneMap: Record<string, string>,
  reporterId: string,
) {
  const issues: SeedIssue[] = [
    {
      title: "Major potholes near Koni market junction",
      description:
        "Deep potholes causing traffic slowdown and bike skidding risk near the Koni market T-junction. Water accumulates after rain and visibility is poor at night.",
      category: "Roads",
      severity: 8,
      location: {
        latitude: 22.1316,
        longitude: 82.1364,
        address: "Koni Market Junction",
      },
      zoneCode: "KONI",
      reportedByRole: "citizen",
      occupancy: 300,
      blocksAccess: true,
      safetyRisk: true,
      criticalInfrastructure: false,
      estimatedCost: 150000,
      affectedPeople: 1200,
    },
    {
      title: "Burst water pipeline near Seepat Road",
      description:
        "Continuous water leakage from a damaged main line opposite the polytechnic gate on Seepat Road. Road surface eroding and nearby shops flooded during peak hours.",
      category: "Water",
      severity: 9,
      location: {
        latitude: 22.1349,
        longitude: 82.1491,
        address: "Seepat Road - Polytechnic Gate",
      },
      zoneCode: "SEEPAT",
      reportedByRole: "citizen",
      occupancy: 500,
      blocksAccess: true,
      safetyRisk: true,
      criticalInfrastructure: true,
      estimatedCost: 220000,
      affectedPeople: 2000,
      isRecurring: true,
      previousOccurrences: 3,
    },
    {
      title: "Streetlight outage across hostel stretch",
      description:
        "Multiple consecutive streetlights are non-functional along the hostel stretch leading to campus gate, creating dark patches and safety concerns after 7 PM.",
      category: "Streetlights",
      severity: 6,
      location: {
        latitude: 22.1297,
        longitude: 82.1388,
        address: "Hostel Road to Campus Gate",
      },
      zoneCode: "KONI",
      reportedByRole: "citizen",
      occupancy: 200,
      blocksAccess: false,
      safetyRisk: true,
      criticalInfrastructure: true,
      estimatedCost: 80000,
      affectedPeople: 900,
    },
    {
      title: "Garbage overflow near Civic Center bus stop",
      description:
        "Garbage bins overflowing with scattered waste attracting stray animals near the main bus stop, emitting foul odor and blocking pedestrian movement.",
      category: "Sanitation",
      severity: 6,
      location: {
        latitude: 22.091,
        longitude: 82.1461,
        address: "Civic Center Bus Stop",
      },
      zoneCode: "CIVIC",
      reportedByRole: "citizen",
      occupancy: 150,
      blocksAccess: true,
      safetyRisk: false,
      criticalInfrastructure: false,
      estimatedCost: 25000,
      affectedPeople: 600,
    },
    {
      title: "Pedestrian safety risk near Bilaspur railway station",
      description:
        "Unmarked pedestrian crossing and broken median near the station exit causing frequent near-misses during evening rush; autos parking haphazardly reduce visibility.",
      category: "Safety",
      severity: 9,
      location: {
        latitude: 22.0794,
        longitude: 82.1549,
        address: "Railway Station Exit",
      },
      zoneCode: "RAILWAY",
      reportedByRole: "citizen",
      occupancy: 700,
      blocksAccess: true,
      safetyRisk: true,
      criticalInfrastructure: true,
      estimatedCost: 180000,
      affectedPeople: 3000,
      examPeriod: false,
    },
  ];

  for (const issue of issues) {
    const zoneId = zoneMap[issue.zoneCode];
    if (!zoneId) {
      console.warn(
        `Zone code ${issue.zoneCode} not found, skipping issue ${issue.title}`,
      );
      continue;
    }

    const priorityInput = buildPriorityInput(issue, zoneId);
    const priorityResult = priorityEngine.calculatePriority(priorityInput);

    const severity =
      issue.severity || priorityToSeverity(priorityResult.priority);

    const payload = {
      cityId,
      zoneId,
      title: issue.title,
      description: issue.description,
      category: issue.category,
      severity,
      status: "open" as const,
      priority: priorityResult.priority,
      location: issue.location,
      submissionType: issue.submissionType || "text",
      reportedBy: reporterId,
      reportedByRole: issue.reportedByRole,
      estimatedCost: issue.estimatedCost,
      affectedPeople: issue.affectedPeople,
      aiRiskScore: priorityResult.score,
      aiSummary: `Priority ${priorityResult.priority} (score ${priorityResult.score}/100). ${priorityResult.reasoning.slice(0, 3).join(" | ")}`,
      aiRecommendations: priorityResult.reasoning,
      estimatedResolutionTime: priorityResult.recommendedSLA,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const existing = await Issue.findOne({
      title: issue.title,
      cityId,
      zoneId,
    });

    if (existing) {
      await Issue.updateOne({ _id: existing._id }, payload);
      console.log(
        `Updated issue: ${issue.title} | priority=${priorityResult.priority} score=${priorityResult.score}`,
      );
    } else {
      await Issue.create(payload);
      console.log(
        `Inserted issue: ${issue.title} | priority=${priorityResult.priority} score=${priorityResult.score}`,
      );
    }
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
    const reporterId = await upsertReporter(city._id.toString());

    await seedIssues(city._id.toString(), zoneMap, reporterId);

    console.log("Seeding completed for Bilaspur with priority scores.");
  } catch (error) {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  } finally {
    await closeMongoConnection();
  }
}

main();
