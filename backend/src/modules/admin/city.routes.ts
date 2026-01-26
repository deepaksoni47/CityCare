import { Router } from "express";
import * as cityController from "./city.controller";
import { authenticate } from "../auth/auth.middleware";
import { handleValidationErrors } from "../../middlewares/validation.middleware";
import { apiRateLimiter } from "../../middlewares/rateLimiter.middleware";
import { body } from "express-validator";

const router = Router();

/**
 * @route   GET /api/cities
 * @desc    Get all cities
 * @access  Public
 */
router.get("/", apiRateLimiter, cityController.getCities);

/**
 * @route   POST /api/cities
 * @desc    Create a new city
 * @access  Private (Admin only)
 */
router.post(
  "/",
  authenticate,
  apiRateLimiter,
  body("name")
    .trim()
    .notEmpty()
    .withMessage("City name is required")
    .isLength({ max: 100 })
    .withMessage("City name must be less than 100 characters"),
  body("code")
    .trim()
    .notEmpty()
    .withMessage("City code is required")
    .isLength({ max: 10 })
    .withMessage("City code must be less than 10 characters"),
  body("state").trim().notEmpty().withMessage("State is required"),
  body("country").trim().notEmpty().withMessage("Country is required"),
  body("centerPoint.latitude")
    .optional()
    .isFloat({ min: -90, max: 90 })
    .withMessage("Invalid latitude"),
  body("centerPoint.longitude")
    .optional()
    .isFloat({ min: -180, max: 180 })
    .withMessage("Invalid longitude"),
  body("administratorEmail")
    .optional()
    .isEmail()
    .withMessage("Invalid email format"),
  handleValidationErrors,
  cityController.createCity,
);

/**
 * @route   GET /api/cities/:cityId
 * @desc    Get city by ID
 * @access  Public
 */
router.get("/:cityId", apiRateLimiter, cityController.getCityById);

/**
 * @route   GET /api/cities/:cityId/zones
 * @desc    Get all zones in a city
 * @access  Public
 */
router.get("/:cityId/zones", apiRateLimiter, cityController.getCityZones);

/**
 * @route   POST /api/cities/:cityId/zones
 * @desc    Create a new zone in a city
 * @access  Private (Admin)
 */
router.post(
  "/:cityId/zones",
  authenticate,
  apiRateLimiter,
  body("name").trim().notEmpty().withMessage("Zone name is required"),
  body("code").trim().notEmpty().withMessage("Zone code is required"),
  body("zoneType")
    .trim()
    .notEmpty()
    .withMessage("Zone type is required")
    .isIn([
      "residential",
      "commercial",
      "industrial",
      "public_service",
      "transportation",
      "utilities",
      "other",
    ])
    .withMessage("Invalid zone type"),
  body("centerPoint.latitude")
    .optional()
    .isFloat({ min: -90, max: 90 })
    .withMessage("Invalid latitude"),
  body("centerPoint.longitude")
    .optional()
    .isFloat({ min: -180, max: 180 })
    .withMessage("Invalid longitude"),
  handleValidationErrors,
  cityController.createZone,
);

/**
 * @route   GET /api/cities/:cityId/agencies
 * @desc    Get all agencies in a city
 * @access  Public
 */
router.get("/:cityId/agencies", apiRateLimiter, cityController.getCityAgencies);

/**
 * @route   POST /api/cities/:cityId/agencies
 * @desc    Create a new agency in a city
 * @access  Private (Admin)
 */
router.post(
  "/:cityId/agencies",
  authenticate,
  apiRateLimiter,
  body("name").trim().notEmpty().withMessage("Agency name is required"),
  body("code").trim().notEmpty().withMessage("Agency code is required"),
  body("type")
    .trim()
    .notEmpty()
    .withMessage("Agency type is required")
    .isIn([
      "water_supply",
      "electricity",
      "sanitation",
      "roads",
      "public_health",
      "transportation",
      "parks",
      "admin",
      "other",
    ])
    .withMessage("Invalid agency type"),
  body("email").optional().isEmail().withMessage("Invalid email format"),
  body("phone").optional().trim(),
  handleValidationErrors,
  cityController.createAgency,
);

export default router;
