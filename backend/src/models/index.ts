/**
 * MongoDB Models - Export all Mongoose models
 */

export { City, type ICity } from "./City";
export { User, type IUser } from "./User";
export { Agency, type IAgency } from "./Agency";
export { Zone, type IZone } from "./Zone";
export { Issue, type IIssue } from "./Issue";
export { IssuePrediction, type IIssuePrediction } from "./IssuePrediction";
export { Badge, type IBadge } from "./Badge";
export { Vote, type IVote } from "./Vote";
export { Analytics, type IAnalytics } from "./Analytics";

// Backward compatibility aliases
export { Organization, type IOrganization } from "./Organization";
export { Department, type IDepartment } from "./Department";
export { Building, type IBuilding } from "./Building";
