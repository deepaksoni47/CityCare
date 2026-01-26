import { Request, Response } from "express";
import { City } from "../../models/City";
import { Zone } from "../../models/Zone";
import { Agency } from "../../models/Agency";

/**
 * Get all cities
 * GET /api/cities
 */
export async function getCities(_req: Request, res: Response) {
  try {
    const cities = await City.find()
      .select(
        "_id name code state country centerPoint area population timezone",
      )
      .limit(100);

    res.json({
      success: true,
      data: {
        cities,
        count: cities.length,
      },
    });
  } catch (error: unknown) {
    console.error("Get cities error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to fetch cities";
    res.status(500).json({
      error: "Failed to fetch cities",
      message: errorMessage,
    });
  }
}

/**
 * Get city by ID
 * GET /api/cities/:cityId
 */
export async function getCityById(req: Request, res: Response) {
  try {
    const { cityId } = req.params;

    const city = await City.findById(cityId);

    if (!city) {
      return res.status(404).json({
        error: "Not found",
        message: "City not found",
      });
    }

    // Get zones and agencies for this city
    const [zones, agencies] = await Promise.all([
      Zone.find({ cityId }).select("_id name code zoneType centerPoint area"),
      Agency.find({ cityId }).select("_id name code type"),
    ]);

    res.json({
      success: true,
      data: {
        city,
        zones,
        agencies,
      },
    });
  } catch (error: unknown) {
    console.error("Get city error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to fetch city";
    res.status(500).json({
      error: "Failed to fetch city",
      message: errorMessage,
    });
  }
}

/**
 * Create new city
 * POST /api/cities
 */
export async function createCity(req: Request, res: Response) {
  try {
    const {
      name,
      code,
      state,
      country,
      centerPoint,
      boundaries,
      administratorEmail,
    } = req.body;

    if (!name || !code || !state || !country) {
      return res.status(400).json({
        error: "Validation error",
        message: "name, code, state, and country are required",
      });
    }

    const city = new City({
      name,
      code,
      state,
      country,
      centerPoint: centerPoint || { latitude: 0, longitude: 0 },
      boundaries: boundaries || {
        northWest: { latitude: 0, longitude: 0 },
        northEast: { latitude: 0, longitude: 0 },
        southWest: { latitude: 0, longitude: 0 },
        southEast: { latitude: 0, longitude: 0 },
      },
      administratorEmail,
    });

    await city.save();

    res.status(201).json({
      success: true,
      data: {
        city,
      },
      message: "City created successfully",
    });
  } catch (error: unknown) {
    console.error("Create city error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to create city";
    res.status(500).json({
      error: "Failed to create city",
      message: errorMessage,
    });
  }
}

/**
 * Get zones in city
 * GET /api/cities/:cityId/zones
 */
export async function getCityZones(req: Request, res: Response) {
  try {
    const { cityId } = req.params;

    const zones = await Zone.find({ cityId }).sort({ name: 1 });

    res.json({
      success: true,
      data: {
        zones,
        count: zones.length,
      },
    });
  } catch (error: unknown) {
    console.error("Get city zones error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to fetch zones";
    res.status(500).json({
      error: "Failed to fetch zones",
      message: errorMessage,
    });
  }
}

/**
 * Create zone in city
 * POST /api/cities/:cityId/zones
 */
export async function createZone(req: Request, res: Response) {
  try {
    const { cityId } = req.params;
    const { name, code, zoneType, centerPoint, area, agencyId } = req.body;

    if (!name || !code || !zoneType) {
      return res.status(400).json({
        error: "Validation error",
        message: "name, code, and zoneType are required",
      });
    }

    const zone = new Zone({
      cityId,
      name,
      code,
      zoneType,
      centerPoint: centerPoint || { latitude: 0, longitude: 0 },
      area: area || 0,
      agencyId: agencyId || null,
    });

    await zone.save();

    res.status(201).json({
      success: true,
      data: {
        zone,
      },
      message: "Zone created successfully",
    });
  } catch (error: unknown) {
    console.error("Create zone error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to create zone";
    res.status(500).json({
      error: "Failed to create zone",
      message: errorMessage,
    });
  }
}

/**
 * Get agencies in city
 * GET /api/cities/:cityId/agencies
 */
export async function getCityAgencies(req: Request, res: Response) {
  try {
    const { cityId } = req.params;

    const agencies = await Agency.find({ cityId }).sort({ name: 1 });

    res.json({
      success: true,
      data: {
        agencies,
        count: agencies.length,
      },
    });
  } catch (error: unknown) {
    console.error("Get city agencies error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to fetch agencies";
    res.status(500).json({
      error: "Failed to fetch agencies",
      message: errorMessage,
    });
  }
}

/**
 * Create agency in city
 * POST /api/cities/:cityId/agencies
 */
export async function createAgency(req: Request, res: Response) {
  try {
    const { cityId } = req.params;
    const { name, code, type, contactPerson, email, phone } = req.body;

    if (!name || !code || !type) {
      return res.status(400).json({
        error: "Validation error",
        message: "name, code, and type are required",
      });
    }

    const agency = new Agency({
      cityId,
      name,
      code,
      type,
      contactPerson: contactPerson || null,
      email: email || null,
      phone: phone || null,
    });

    await agency.save();

    res.status(201).json({
      success: true,
      data: {
        agency,
      },
      message: "Agency created successfully",
    });
  } catch (error: unknown) {
    console.error("Create agency error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to create agency";
    res.status(500).json({
      error: "Failed to create agency",
      message: errorMessage,
    });
  }
}
