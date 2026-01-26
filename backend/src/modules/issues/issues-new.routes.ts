import { Router } from "express";
import * as issuesController from "./issues-new.controller";
import { authenticate } from "../auth/auth.middleware";
import { handleValidationErrors } from "../../middlewares/validation.middleware";
import {
  authRateLimiter,
  apiRateLimiter,
} from "../../middlewares/rateLimiter.middleware";
import { body } from "express-validator";

const router = Router();

/**
 * @route   POST /api/issues
 * @desc    Create a new issue
 * @access  Private (All authenticated users)
 */
router.post(
  "/",
  authenticate,
  authRateLimiter,
  body("title")
    .trim()
    .notEmpty()
    .withMessage("Title is required")
    .isLength({ max: 200 })
    .withMessage("Title must be less than 200 characters"),
  body("description")
    .trim()
    .notEmpty()
    .withMessage("Description is required")
    .isLength({ max: 2000 })
    .withMessage("Description must be less than 2000 characters"),
  body("category")
    .trim()
    .notEmpty()
    .withMessage("Category is required")
    .isIn([
      "Roads",
      "Water",
      "Electricity",
      "Sanitation",
      "Parks",
      "Public_Health",
      "Transportation",
      "Streetlights",
      "Pollution",
      "Safety",
      "Other",
    ])
    .withMessage("Invalid category"),
  body("zoneId").trim().notEmpty().withMessage("Zone ID is required"),
  body("latitude")
    .isFloat({ min: -90, max: 90 })
    .withMessage("Invalid latitude"),
  body("longitude")
    .isFloat({ min: -180, max: 180 })
    .withMessage("Invalid longitude"),
  body("severity")
    .optional()
    .isInt({ min: 1, max: 10 })
    .withMessage("Severity must be between 1 and 10"),
  body("address")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Address must be less than 500 characters"),
  handleValidationErrors,
  issuesController.createNewIssue,
);

/**
 * @route   GET /api/issues
 * @desc    Get all issues with filters
 * @access  Private (All authenticated users)
 */
router.get(
  "/",
  authenticate,
  apiRateLimiter,
  body("page").optional().isInt({ min: 1 }).withMessage("Page must be >= 1"),
  body("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be between 1 and 100"),
  issuesController.getAllIssues,
);

/**
 * @route   GET /api/issues/:issueId
 * @desc    Get issue by ID
 * @access  Private (All authenticated users)
 */
router.get(
  "/:issueId",
  authenticate,
  apiRateLimiter,
  issuesController.getIssueById,
);

/**
 * @route   PUT /api/issues/:issueId
 * @desc    Update issue
 * @access  Private (Issue reporter, manager, admin)
 */
router.put(
  "/:issueId",
  authenticate,
  apiRateLimiter,
  body("title")
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage("Title must be less than 200 characters"),
  body("description")
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage("Description must be less than 2000 characters"),
  body("category")
    .optional()
    .trim()
    .isIn([
      "Roads",
      "Water",
      "Electricity",
      "Sanitation",
      "Parks",
      "Public_Health",
      "Transportation",
      "Streetlights",
      "Pollution",
      "Safety",
      "Other",
    ])
    .withMessage("Invalid category"),
  body("severity")
    .optional()
    .isInt({ min: 1, max: 10 })
    .withMessage("Severity must be between 1 and 10"),
  body("status")
    .optional()
    .isIn(["open", "in_progress", "resolved", "closed"])
    .withMessage("Invalid status"),
  handleValidationErrors,
  issuesController.updateIssue,
);

/**
 * @route   PATCH /api/issues/:issueId/resolve
 * @desc    Resolve issue
 * @access  Private (Officer, manager, admin only)
 */
router.patch(
  "/:issueId/resolve",
  authenticate,
  apiRateLimiter,
  body("resolutionNotes")
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage("Resolution notes must be less than 1000 characters"),
  handleValidationErrors,
  issuesController.resolveIssue,
);

/**
 * @route   DELETE /api/issues/:issueId
 * @desc    Delete issue
 * @access  Private (Issue reporter, manager, admin)
 */
router.delete(
  "/:issueId",
  authenticate,
  apiRateLimiter,
  issuesController.deleteIssue,
);

/**
 * @route   GET /api/issues/heatmap/:cityId
 * @desc    Get nearby issues for heatmap
 * @access  Private (All authenticated users)
 */
router.get(
  "/heatmap/:cityId",
  authenticate,
  apiRateLimiter,
  body("latitude")
    .isFloat({ min: -90, max: 90 })
    .withMessage("Invalid latitude"),
  body("longitude")
    .isFloat({ min: -180, max: 180 })
    .withMessage("Invalid longitude"),
  handleValidationErrors,
  issuesController.getNearbyIssues,
);

/**
 * @route   GET /api/issues/stats/:cityId
 * @desc    Get issue statistics
 * @access  Private (All authenticated users)
 */
router.get(
  "/stats/:cityId",
  authenticate,
  apiRateLimiter,
  issuesController.getIssueStats,
);

export default router;
