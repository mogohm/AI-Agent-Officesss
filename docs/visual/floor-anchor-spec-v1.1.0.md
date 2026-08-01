# FloorAnchorSpec v1.1.0

Canonical 1600x600 structural frame for department floors.
Anchors are derived from a structural **edge profile**, never from furniture,
plants, light glows or city background.

```json
{
  "version": "1.1.0",
  "canvas": {
    "width": 1600,
    "height": 600
  },
  "coordinateSystem": {
    "origin": "top-left",
    "units": "pixels"
  },
  "structuralFrame": {
    "leftX": 0,
    "rightX": 1599,
    "wallTopY": 0,
    "slabTopY": 430,
    "slabBottomY": 599
  },
  "zones": {
    "safeFurniture": {
      "left": 40,
      "right": 1560,
      "top": 60,
      "bottom": 430
    },
    "workerBaseline": {
      "top": 430,
      "bottom": 560
    },
    "outerTransparentOrBackground": {
      "left": 0,
      "right": 1599,
      "top": 0,
      "bottom": 60
    },
    "labelExclusion": {
      "left": 0,
      "right": 1599,
      "top": 0,
      "bottom": 40
    }
  },
  "tolerances": {
    "horizontalAnchorPx": 2,
    "verticalAnchorPx": 2,
    "baselinePx": 12
  },
  "detectionMethod": {
    "type": "edge-profile",
    "confidenceThreshold": 0.5
  }
}
```
