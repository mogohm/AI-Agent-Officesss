import { z } from "zod";

/**
 * FloorAnchorSpec v1.1.0 schema. Structural anchors are a CONTRACT, so they are
 * validated rather than inferred from arbitrary foreground bounding boxes.
 */
export const FLOOR_ANCHOR_SPEC_VERSION = "1.1.0";

const rect = z.object({ left: z.number(), right: z.number(), top: z.number(), bottom: z.number() }).partial();

export const floorAnchorSpecSchema = z.object({
  version: z.string(),
  canvas: z.object({ width: z.literal(1600), height: z.literal(600) }),
  coordinateSystem: z.object({ origin: z.literal("top-left"), units: z.literal("pixels") }),
  structuralFrame: z.object({
    leftX: z.number(), rightX: z.number(),
    wallTopY: z.number(), slabTopY: z.number(), slabBottomY: z.number(),
  }),
  zones: z.object({
    safeFurniture: rect.optional(),
    workerBaseline: rect.optional(),
    outerTransparentOrBackground: rect.optional(),
    labelExclusion: rect.optional(),
  }).optional(),
  tolerances: z.object({
    horizontalAnchorPx: z.number(), verticalAnchorPx: z.number(), baselinePx: z.number(),
  }),
  detectionMethod: z.object({
    type: z.enum(["template-marker", "shared-shell", "edge-profile"]),
    confidenceThreshold: z.number().min(0).max(1),
  }),
});

export type FloorAnchorSpec = z.infer<typeof floorAnchorSpecSchema>;
