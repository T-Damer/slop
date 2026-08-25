// Generated from games/traffic-jam/fixtures/conformance.json. Do not edit.
export const trafficConformanceFixture = {
  "schemaVersion": 1,
  "seed": "traffic-intro",
  "level": {
    "id": "traffic-intro",
    "board": {
      "width": 6,
      "height": 6
    },
    "vehicles": [
      {
        "id": "target",
        "axis": "horizontal",
        "position": {
          "x": 0,
          "y": 2
        },
        "length": 2,
        "preferredDelta": 4,
        "color": "coral",
        "isTarget": true
      },
      {
        "id": "gate",
        "axis": "vertical",
        "position": {
          "x": 2,
          "y": 0
        },
        "length": 3,
        "preferredDelta": 3,
        "color": "blue",
        "isTarget": false
      },
      {
        "id": "slider",
        "axis": "horizontal",
        "position": {
          "x": 2,
          "y": 3
        },
        "length": 2,
        "preferredDelta": 2,
        "color": "green",
        "isTarget": false
      },
      {
        "id": "decor",
        "axis": "vertical",
        "position": {
          "x": 5,
          "y": 0
        },
        "length": 2,
        "preferredDelta": 2,
        "color": "yellow",
        "isTarget": false
      }
    ]
  },
  "scenario": [
    {
      "commandId": "move-target-blocked",
      "vehicleId": "target",
      "delta": 4,
      "expectError": "grid.path_blocked"
    },
    {
      "commandId": "move-slider",
      "vehicleId": "slider",
      "delta": 2,
      "expectEvents": [
        "traffic.vehicle_moved"
      ]
    },
    {
      "commandId": "move-gate",
      "vehicleId": "gate",
      "delta": 3,
      "expectEvents": [
        "traffic.vehicle_moved"
      ]
    },
    {
      "commandId": "move-target",
      "vehicleId": "target",
      "delta": 4,
      "expectEvents": [
        "traffic.vehicle_moved",
        "traffic.level_completed"
      ]
    }
  ],
  "expected": {
    "status": "completed",
    "moveCount": 3,
    "revisionWithoutJoin": 6
  }
} as const;
