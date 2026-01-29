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

interface SeedIssue {
  title: string;
  description: string;
  category: IssueCategorySchema;
  severity?: number;
  location: { latitude: number; longitude: number; address?: string };
  zoneCode: string;
  reportedByEmail: string;
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

async function getCityAndZones() {
  const city = await City.findOne({ code: "BSP" });
  if (!city) {
    throw new Error("City BSP not found. Run seed-core-demo.ts first.");
  }

  const zones = await Zone.find({ cityId: city._id });
  const zoneMap = zones.reduce<Record<string, string>>((acc, z) => {
    acc[z.code] = z._id.toString();
    return acc;
  }, {});

  return { city, zoneMap };
}

async function ensureReporterUsers(cityId: string) {
  const reporters = [
    {
      email: "citizen.demo@citycare.local",
      name: "Community Reporter",
      role: "citizen" as const,
      password: "Citizen@123",
    },
    {
      email: "admin@citycare.local",
      name: "City Administrator",
      role: "admin" as const,
      password: "Admin@123",
    },
  ];

  const map: Record<string, string> = {};

  for (const user of reporters) {
    const saved = await User.findOneAndUpdate(
      { email: user.email, cityId },
      {
        cityId,
        email: user.email,
        name: user.name,
        role: user.role,
        password: user.password,
        isActive: true,
        isVerified: true,
        permissions: {
          canCreateIssues: true,
          canResolveIssues: user.role !== "citizen",
          // Only admins in this seed can assign; reporters/managers aren't created here
          canAssignIssues: user.role === "admin",
          canViewAllIssues: true,
          canManageUsers: user.role === "admin",
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

    map[user.email] = saved._id.toString();
    console.warn(`Reporter ready: ${user.email}`);
  }

  return map;
}

async function seedIssues() {
  const { city, zoneMap } = await getCityAndZones();
  const reporterMap = await ensureReporterUsers(city._id.toString());

  const issues: SeedIssue[] = [
    {
      title: "Potholes causing bike skids near Koni market",
      description:
        "Cluster of deep potholes with stagnant water, vehicles swerving into opposite lane during evening rush.",
      category: "Roads",
      severity: 8,
      location: {
        latitude: 22.1316,
        longitude: 82.1364,
        address: "Koni Market Junction",
      },
      zoneCode: "KONI",
      reportedByEmail: "citizen.demo@citycare.local",
      reportedByRole: "citizen",
      occupancy: 300,
      blocksAccess: true,
      safetyRisk: true,
      estimatedCost: 150000,
      affectedPeople: 1200,
    },
    {
      title: "Main water line leak near Seepat Road",
      description:
        "Pressurized leak flooding service lane; road shoulder eroding and shops getting waterlogged during peak hours.",
      category: "Water",
      severity: 9,
      location: {
        latitude: 22.1349,
        longitude: 82.1491,
        address: "Seepat Road - Polytechnic Gate",
      },
      zoneCode: "SEEPAT",
      reportedByEmail: "citizen.demo@citycare.local",
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
      title: "Streetlight outage on hostel approach road",
      description:
        "Four consecutive poles dark after 7 PM; pedestrians using phone flashlights, high stray-dog activity reported.",
      category: "Streetlights",
      severity: 6,
      location: {
        latitude: 22.1297,
        longitude: 82.1388,
        address: "Hostel Road to Campus Gate",
      },
      zoneCode: "KONI",
      reportedByEmail: "citizen.demo@citycare.local",
      reportedByRole: "citizen",
      occupancy: 200,
      safetyRisk: true,
      criticalInfrastructure: true,
      estimatedCost: 80000,
      affectedPeople: 900,
    },
    {
      title: "Garbage overflow at Civic Center bus stop",
      description:
        "Two bins overflowing, stray dogs tearing bags, foul odor affecting commuters and nearby shops.",
      category: "Sanitation",
      severity: 6,
      location: {
        latitude: 22.091,
        longitude: 82.1461,
        address: "Civic Center Bus Stop",
      },
      zoneCode: "CIVIC",
      reportedByEmail: "admin@citycare.local",
      reportedByRole: "admin",
      occupancy: 150,
      blocksAccess: true,
      estimatedCost: 25000,
      affectedPeople: 600,
    },
    {
      title: "Pedestrian risk near Bilaspur railway station exit",
      description:
        "Broken median and no zebra crossing; frequent near-misses as autos cut across during evening rush.",
      category: "Safety",
      severity: 9,
      location: {
        latitude: 22.0794,
        longitude: 82.1549,
        address: "Railway Station Exit",
      },
      zoneCode: "RAILWAY",
      reportedByEmail: "citizen.demo@citycare.local",
      reportedByRole: "citizen",
      occupancy: 700,
      blocksAccess: true,
      safetyRisk: true,
      criticalInfrastructure: true,
      estimatedCost: 180000,
      affectedPeople: 3000,
    },
    {
      title: "Low-hanging power cable near Koni school gate",
      description:
        "Distribution line sagging over pedestrian path, sparks observed in rain; school children at risk.",
      category: "Electricity",
      location: {
        latitude: 22.1331,
        longitude: 82.1402,
        address: "Koni School Gate",
      },
      zoneCode: "KONI",
      reportedByEmail: "officer.pwd@citycare.local",
      reportedByRole: "officer",
      safetyRisk: true,
      criticalInfrastructure: true,
      estimatedCost: 90000,
      affectedPeople: 450,
    },
    {
      title: "Drain choke causing waterlogging on Seepat lane",
      description:
        "Side drain blocked with debris; ankle-deep water after every shower, shops reporting mosquito rise.",
      category: "Sanitation",
      location: {
        latitude: 22.1355,
        longitude: 82.1509,
        address: "Seepat Service Lane",
      },
      zoneCode: "SEEPAT",
      reportedByEmail: "citizen.demo@citycare.local",
      reportedByRole: "citizen",
      blocksAccess: true,
      safetyRisk: false,
      estimatedCost: 40000,
      affectedPeople: 750,
      isRecurring: true,
      previousOccurrences: 2,
    },
    {
      title: "Park lights and benches damaged at Civic Center",
      description:
        "Half the pathway lights are out and two benches broken; evening walkers avoid dark patch.",
      category: "Parks",
      location: {
        latitude: 22.0898,
        longitude: 82.147,
        address: "Civic Center Park",
      },
      zoneCode: "CIVIC",
      reportedByEmail: "citizen.demo@citycare.local",
      reportedByRole: "citizen",
      safetyRisk: true,
      affectedPeople: 300,
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

    const reporterId = reporterMap[issue.reportedByEmail];
    if (!reporterId) {
      console.warn(
        `Reporter ${issue.reportedByEmail} not found, skipping issue ${issue.title}`,
      );
      continue;
    }

    const priorityInput = buildPriorityInput(issue, zoneId);
    const priorityResult = priorityEngine.calculatePriority(priorityInput);
    const severity =
      issue.severity || priorityToSeverity(priorityResult.priority);

    const payload = {
      cityId: city._id,
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
      aiSummary: `Priority ${priorityResult.priority} (score ${priorityResult.score}/100). ${priorityResult.reasoning
        .slice(0, 3)
        .join(" | ")}`,
      aiRecommendations: priorityResult.reasoning,
      estimatedResolutionTime: priorityResult.recommendedSLA,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const existing = await Issue.findOne({
      title: issue.title,
      cityId: city._id,
      zoneId,
    });

    if (existing) {
      await Issue.updateOne({ _id: existing._id }, payload);
      console.warn(
        `Updated issue: ${issue.title} | priority=${priorityResult.priority} score=${priorityResult.score}`,
      );
    } else {
      await Issue.create(payload);
      console.warn(
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
    await seedIssues();
    console.warn("Demo issues seeded with priority scores.");
  } catch (error) {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  } finally {
    await closeMongoConnection();
  }
}

main();
