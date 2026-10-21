import { useId, type ReactNode } from "react";
import type { Candidate } from "./exerciseCatalog";

type Point = [number, number];
type Pose = {
  head: Point;
  back: Point[];
  arms: Point[][];
  legs: Point[][];
  load?: Point[];
};
const line = (points: Point[]) => points.map((p) => p.join(",")).join(" ");
function Person({ pose }: { pose: Pose }) {
  return (
    <g className="sketch-person">
      <circle cx={pose.head[0]} cy={pose.head[1]} r="8" />
      <polyline points={line(pose.back)} className="sketch-body" />
      {[...pose.arms, ...pose.legs].map((points, i) => (
        <polyline key={i} points={line(points)} />
      ))}
      {pose.load?.map(([x, y], i) => (
        <g className="sketch-weight" key={i} transform={`translate(${x},${y})`}>
          <path d="M-12 0H12M-10-6V6M10-6V6" />
        </g>
      ))}
    </g>
  );
}
function scene(
  c: Candidate,
  end: boolean,
): { pose: Pose; equipment?: ReactNode } {
  const id = c.id,
    p = c.pattern;
  const stand: Pose = {
    head: [82, 20],
    back: [
      [82, 31],
      [82, 48],
      [82, 82],
    ],
    arms: [
      [
        [82, 43],
        [87, 70],
        [89, 95],
      ],
    ],
    legs: [
      [
        [82, 82],
        [73, 105],
        [66, 130],
      ],
      [
        [82, 82],
        [93, 105],
        [102, 130],
      ],
    ],
  };
  const seat = <path d="M48 39V92H100M57 93V130M97 93V130" />;
  if (id === "push_up")
    return {
      pose: {
        head: [126, end ? 109 : 73],
        back: [
          [115, end ? 115 : 83],
          [75, end ? 112 : 93],
          [32, 126],
        ],
        arms: [
          [
            [113, end ? 115 : 84],
            [98, end ? 124 : 108],
            [117, 130],
          ],
        ],
        legs: [
          [
            [75, end ? 112 : 93],
            [51, 118],
            [28, 130],
          ],
        ],
      },
    };
  if (id === "leg_press")
    return {
      pose: {
        head: [24, 59],
        back: [
          [29, 69],
          [48, 94],
        ],
        arms: [
          [
            [30, 72],
            [40, 91],
            [54, 96],
          ],
        ],
        legs: [
          [
            [48, 94],
            [end ? 83 : 76, end ? 64 : 88],
            [end ? 114 : 91, end ? 40 : 61],
          ],
        ],
      },
      equipment: (
        <path
          d={`M12 68L40 104H65M40 104V130M68 119L140 24M${end ? 102 : 80} ${end ? 28 : 49}L${end ? 126 : 104} ${end ? 52 : 73}`}
        />
      ),
    };
  if (p === "knee-flexion" || p === "knee-extension") {
    if (id === "leg_curl")
      return {
        pose: {
          head: [25, 86],
          back: [
            [36, 94],
            [82, 94],
          ],
          arms: [
            [
              [37, 94],
              [42, 111],
              [56, 112],
            ],
          ],
          legs: [[[82, 94], [113, 94], end ? [116, 58] : [143, 99]]],
          load: [end ? [116, 58] : [143, 99]],
        },
        equipment: <path d="M27 102H116M39 102V130M105 102V130" />,
      };
    const straight = p === "knee-extension" ? end : !end;
    return {
      pose: {
        head: [63, 30],
        back: [
          [64, 42],
          [66, 86],
        ],
        arms: [
          [
            [65, 49],
            [52, 72],
            [57, 89],
          ],
        ],
        legs: [[[66, 86], [98, 94], straight ? [135, 91] : [106, 130]]],
        load: [straight ? [132, 92] : [106, 124]],
      },
      equipment: seat,
    };
  }
  if (p === "hip-extension" && id !== "cable_glute_kickback")
    return {
      pose: {
        head: [36, 64],
        back: [
          [47, 75],
          [81, end ? 74 : 104],
        ],
        arms: [
          [
            [49, 77],
            [65, end ? 75 : 99],
            [81, end ? 74 : 104],
          ],
        ],
        legs: [
          [
            [81, end ? 74 : 104],
            [115, 83],
            [119, 130],
          ],
        ],
        load: [[81, end ? 74 : 104]],
      },
      equipment: <path d="M22 84H58M29 84V130M51 84V130" />,
    };
  if (id === "cable_glute_kickback")
    return {
      pose: {
        head: [97, 29],
        back: [
          [91, 40],
          [78, 82],
        ],
        arms: [
          [
            [90, 45],
            [109, 56],
            [126, 51],
          ],
        ],
        legs: [
          [
            [78, 82],
            [77, 108],
            [75, 130],
          ],
          [
            [78, 82],
            [end ? 48 : 90, 106],
            [end ? 22 : 99, end ? 111 : 130],
          ],
        ],
      },
      equipment: <path d="M134 18V130H148M132 121L25 115" />,
    };
  if (p === "calf") {
    if (id === "seated_calf")
      return {
        pose: {
          head: [60, 29],
          back: [
            [61, 42],
            [64, 85],
          ],
          arms: [
            [
              [62, 50],
              [78, 76],
              [99, 83],
            ],
          ],
          legs: [
            [
              [64, 85],
              [99, 88],
              [105, end ? 119 : 130],
            ],
          ],
          load: [[97, 80]],
        },
        equipment: <path d="M45 92H82M53 92V130M84 132H132V141H84Z" />,
      };
    return {
      pose: {
        ...stand,
        head: [82, end ? 10 : 20],
        back: [
          [82, end ? 21 : 31],
          [82, end ? 38 : 48],
          [82, end ? 72 : 82],
        ],
        legs: [
          [
            [82, end ? 72 : 82],
            [73, end ? 95 : 105],
            [66, end ? 120 : 130],
          ],
          [
            [82, end ? 72 : 82],
            [93, end ? 95 : 105],
            [102, end ? 120 : 130],
          ],
        ],
      },
      equipment: <path d="M47 133H117V141H47ZM47 21H116M48 21V130" />,
    };
  }
  if (p === "leg-push" || p === "split-squat") {
    const bent = end;
    const pose: Pose = {
      head: bent ? [91, 46] : [82, 20],
      back: bent
        ? [
            [90, 57],
            [84, 72],
            [65, 91],
          ]
        : stand.back,
      arms:
        id === "goblet_squat"
          ? [
              [
                bent ? [87, 65] : [82, 44],
                bent ? [111, 80] : [105, 61],
                bent ? [102, 61] : [101, 43],
              ],
            ]
          : [
              [
                [bent ? 87 : 82, bent ? 65 : 43],
                [bent ? 77 : 70, bent ? 56 : 37],
                [bent ? 70 : 61, bent ? 61 : 42],
              ],
            ],
      legs:
        p === "split-squat"
          ? [
              [
                [bent ? 76 : 82, bent ? 91 : 82],
                [112, bent ? 103 : 106],
                [116, 130],
              ],
              [
                [bent ? 76 : 82, bent ? 91 : 82],
                [53, bent ? 123 : 106],
                [34, id === "bulgarian_split_squat" ? 95 : 130],
              ],
            ]
          : bent
            ? [
                [
                  [65, 91],
                  [106, 101],
                  [91, 130],
                ],
                [
                  [65, 91],
                  [90, 108],
                  [73, 130],
                ],
              ]
            : stand.legs,
      load:
        c.mode === "barbell"
          ? [[bent ? 87 : 82, bent ? 62 : 39]]
          : c.mode === "dumbbell"
            ? [[bent ? 102 : 101, bent ? 61 : 43]]
            : undefined,
    };
    if (p === "split-squat") {
      pose.arms = [
        [
          [bent ? 85 : 82, bent ? 64 : 43],
          [bent ? 92 : 89, bent ? 86 : 68],
          [bent ? 94 : 91, bent ? 109 : 94],
        ],
      ];
      pose.load = [[bent ? 94 : 91, bent ? 109 : 94]];
    }
    return {
      pose,
      equipment:
        id === "hack_squat" ? (
          <path d="M39 131L99 12M51 135L111 16M51 78L85 89M89 135H130" />
        ) : id === "bulgarian_split_squat" ? (
          <path d="M15 99H43M21 99V130M38 99V130" />
        ) : undefined,
    };
  }
  if (p === "hip-hinge" || p === "deadlift") {
    const bent = p === "deadlift" ? !end : end;
    return {
      pose: {
        head: bent ? [117, 60] : [82, 20],
        back: bent
          ? [
              [107, 71],
              [76, 86],
            ]
          : stand.back,
        arms: [
          bent
            ? [
                [106, 72],
                [108, 96],
                [110, 119],
              ]
            : [
                [82, 43],
                [89, 68],
                [91, 92],
              ],
        ],
        legs: bent
          ? [
              [
                [76, 86],
                [90, 109],
                [78, 130],
              ],
              [
                [76, 86],
                [101, 111],
                [104, 130],
              ],
            ]
          : stand.legs,
        load:
          c.mode === "bodyweight" ? undefined : [bent ? [110, 119] : [91, 92]],
      },
      equipment:
        id === "back_extension" ? (
          <path d="M63 88L87 91M75 90L44 130M55 130H117M93 132L103 108" />
        ) : undefined,
    };
  }
  if (p === "horizontal-push") {
    if (c.mode === "barbell" || c.mode === "dumbbell") {
      const incline = id.includes("incline");
      return {
        pose: {
          head: incline ? [115, 56] : [119, 87],
          back: incline
            ? [
                [105, 66],
                [69, 98],
              ]
            : [
                [108, 95],
                [67, 98],
              ],
          arms: [
            end
              ? [
                  [104, incline ? 66 : 95],
                  [105, 49],
                  [106, 25],
                ]
              : [
                  [104, incline ? 66 : 95],
                  [86, incline ? 83 : 80],
                  [87, incline ? 57 : 56],
                ],
          ],
          legs: [
            [
              [67, 98],
              [44, 111],
              [36, 130],
            ],
          ],
          load: [end ? [106, 25] : [87, incline ? 57 : 56]],
        },
        equipment: (
          <path
            d={
              incline
                ? "M61 105L121 56M61 105V130M100 80V130"
                : "M53 105H129M61 105V130M119 105V130"
            }
          />
        ),
      };
    }
    return {
      pose: {
        head: [66, 28],
        back: [
          [67, 40],
          [69, 86],
        ],
        arms: [
          end
            ? [
                [67, 48],
                [99, 60],
                [131, 61],
              ]
            : [
                [67, 48],
                [57, 75],
                [89, 68],
              ],
        ],
        legs: [
          [
            [69, 86],
            [107, 98],
            [111, 130],
          ],
        ],
        load: [end ? [131, 61] : [89, 68]],
      },
      equipment: <path d="M43 34V94H99M50 94V130M93 94V130M137 30V130" />,
    };
  }
  if (p === "horizontal-pull") {
    if (id === "barbell_row" || id === "dumbbell_row")
      return {
        pose: {
          head: [115, 51],
          back: [
            [104, 62],
            [70, 84],
          ],
          arms: [
            end
              ? [
                  [104, 63],
                  [77, 67],
                  [91, 80],
                ]
              : [
                  [104, 63],
                  [110, 90],
                  [111, 116],
                ],
          ],
          legs: [
            [
              [70, 84],
              [80, 106],
              [72, 130],
            ],
            [
              [70, 84],
              [96, 108],
              [108, 130],
            ],
          ],
          load: [end ? [91, 80] : [111, 116]],
        },
        equipment:
          id === "dumbbell_row" ? (
            <path d="M108 77H149M118 77V130M140 77V130" />
          ) : undefined,
      };
    return {
      pose: {
        head: [61, 27],
        back: [
          [62, 39],
          [65, 89],
        ],
        arms: [
          end
            ? [
                [63, 48],
                [86, 80],
                [73, 74],
              ]
            : [
                [63, 48],
                [98, 62],
                [130, 72],
              ],
        ],
        legs: [
          [
            [65, 89],
            [102, 101],
            [121, 130],
          ],
        ],
        load: [end ? [73, 74] : [130, 72]],
      },
      equipment: <path d="M46 95H83M56 95V130M142 28V130M140 74H89" />,
    };
  }
  if (p === "vertical-pull" || p === "knee-raise") {
    if (p === "knee-raise")
      return {
        pose: {
          head: [83, 28],
          back: [
            [83, 40],
            [83, 88],
          ],
          arms: [
            [
              [83, 46],
              [62, 30],
              [65, 8],
            ],
            [
              [83, 46],
              [105, 30],
              [102, 8],
            ],
          ],
          legs: [
            end
              ? [
                  [83, 88],
                  [114, 84],
                  [119, 111],
                ]
              : [
                  [83, 88],
                  [87, 112],
                  [87, 136],
                ],
          ],
        },
        equipment: <path d="M43 5H125M46 5V130M123 5V130" />,
      };
    const pullup = id === "pull_up" || id === "assisted_pull_up";
    return {
      pose: {
        head: [83, pullup && end ? 22 : 41],
        back: [
          [83, pullup && end ? 34 : 53],
          [83, pullup && end ? 79 : 96],
        ],
        arms: [
          end
            ? [
                [83, pullup ? 37 : 56],
                [58, 57],
                [63, pullup ? 10 : 43],
              ]
            : [
                [83, 55],
                [63, 32],
                [61, 10],
              ],
          end
            ? [
                [83, pullup ? 37 : 56],
                [108, 57],
                [103, pullup ? 10 : 43],
              ]
            : [
                [83, 55],
                [103, 32],
                [105, 10],
              ],
        ],
        legs: pullup
          ? [
              [
                [83, end ? 79 : 96],
                [76, 110],
                [94, 124],
              ],
            ]
          : [
              [
                [83, 96],
                [109, 100],
                [113, 130],
              ],
            ],
      },
      equipment: pullup ? (
        <path d="M42 8H125M45 8V130M122 8V130" />
      ) : (
        <path
          d={`M58 ${end ? 43 : 9}H108M40 9V132M40 9H83M71 105H112M77 105V130`}
        />
      ),
    };
  }
  if (p === "vertical-push")
    return {
      pose: {
        ...stand,
        head: [82, 39],
        back: [
          [82, 50],
          [82, 94],
        ],
        arms: [
          end
            ? [
                [82, 57],
                [66, 35],
                [66, 10],
              ]
            : [
                [82, 57],
                [56, 68],
                [56, 42],
              ],
          end
            ? [
                [82, 57],
                [104, 35],
                [104, 10],
              ]
            : [
                [82, 57],
                [111, 68],
                [111, 42],
              ],
        ],
        legs:
          id === "overhead_press"
            ? stand.legs
            : [
                [
                  [82, 94],
                  [111, 103],
                  [115, 130],
                ],
              ],
        load: end
          ? [
              [66, 10],
              [104, 10],
            ]
          : [
              [56, 42],
              [111, 42],
            ],
      },
      equipment: id === "overhead_press" ? undefined : seat,
    };
  if (p === "elbow-flexion")
    return {
      pose: {
        ...stand,
        arms: [[[82, 43], [87, 76], end ? [111, 52] : [91, 105]]],
        load: [end ? [111, 52] : [91, 105]],
      },
      equipment:
        c.mode === "machine" || !c.mode ? (
          <path d="M139 10V131M140 116L94 104" />
        ) : undefined,
    };
  if (p === "elbow-extension") {
    const overhead = id.includes("overhead") || id === "oh_extension";
    return {
      pose: {
        ...stand,
        arms: [
          overhead
            ? [[82, 45], [90, 16], end ? [94, -1] : [62, 25]]
            : [[82, 43], [87, 77], end ? [92, 105] : [113, 62]],
        ],
        load: [
          overhead ? (end ? [94, -1] : [62, 25]) : end ? [92, 105] : [113, 62],
        ],
      },
      equipment:
        c.mode === "dumbbell" ? undefined : (
          <path d="M140 5V131M140 5L114 61" />
        ),
    };
  }
  if (p === "lateral-raise" || p === "rear-delt" || p === "chest-fly")
    return {
      pose: {
        ...stand,
        arms: end
          ? [
              [
                [82, 44],
                [53, 55],
                [23, 58],
              ],
              [
                [82, 44],
                [112, 55],
                [142, 58],
              ],
            ]
          : p === "chest-fly"
            ? [
                [
                  [82, 44],
                  [61, 64],
                  [80, 79],
                ],
                [
                  [82, 44],
                  [104, 64],
                  [84, 79],
                ],
              ]
            : [
                [
                  [82, 44],
                  [62, 75],
                  [57, 105],
                ],
                [
                  [82, 44],
                  [103, 75],
                  [108, 105],
                ],
              ],
        load: end
          ? [
              [23, 58],
              [142, 58],
            ]
          : p === "chest-fly"
            ? [
                [80, 79],
                [84, 79],
              ]
            : [
                [57, 105],
                [108, 105],
              ],
      },
      equipment:
        c.mode === "dumbbell" ? undefined : (
          <path d="M14 20V131M151 20V131M16 20H149" />
        ),
    };
  if (p === "hip-abduction")
    return {
      pose: {
        ...stand,
        head: [82, 29],
        back: [
          [82, 41],
          [82, 86],
        ],
        arms: [
          [
            [82, 46],
            [62, 75],
            [60, 89],
          ],
          [
            [82, 46],
            [102, 75],
            [106, 89],
          ],
        ],
        legs: [
          [
            [82, 86],
            [end ? 48 : 73, 107],
            [end ? 42 : 69, 131],
          ],
          [
            [82, 86],
            [end ? 116 : 92, 107],
            [end ? 122 : 97, 131],
          ],
        ],
      },
      equipment: seat,
    };
  if (p === "trunk-flexion" || p === "trunk-machine")
    return {
      pose: {
        head: end ? [110, 80] : [83, 37],
        back: end
          ? [
              [100, 90],
              [80, 95],
              [63, 112],
            ]
          : [
              [83, 49],
              [72, 82],
              [63, 112],
            ],
        arms: [
          end
            ? [
                [100, 90],
                [113, 102],
                [111, 79],
              ]
            : [
                [82, 52],
                [104, 68],
                [95, 38],
              ],
        ],
        legs: [
          [
            [63, 112],
            [100, 130],
            [132, 130],
          ],
        ],
      },
      equipment: <path d="M143 6V130M142 6L96 37" />,
    };
  return {
    pose: {
      ...stand,
      arms: [
        end
          ? [
              [82, 44],
              [109, 59],
              [134, 62],
            ]
          : [
              [82, 44],
              [105, 74],
              [89, 65],
            ],
      ],
      load: [end ? [134, 62] : [89, 65]],
    },
    equipment: <path d="M147 25V132M145 63H110" />,
  };
}

/** Original, offline SVG movement diagrams, with two labelled positions. */
export function ExerciseSketch({
  exercise,
  compact = false,
}: {
  exercise: Candidate;
  compact?: boolean;
}) {
  const title = useId();
  return (
    <figure className={`exercise-sketch ${compact ? "compact" : ""}`}>
      <svg viewBox="0 0 360 190" role="img" aria-labelledby={title}>
        <title id={title}>
          {exercise.name}: shema začetnega in končnega položaja
        </title>
        <rect
          x="1"
          y="1"
          width="358"
          height="188"
          rx="16"
          className="sketch-background"
        />
        {[false, true].map((end, i) => {
          const { pose, equipment } = scene(exercise, end);
          return (
            <g key={i} transform={`translate(${i * 180 + 6},25)`}>
              <path d="M14 139H148" className="sketch-floor" />
              <g className="sketch-equipment">{equipment}</g>
              <Person pose={pose} />
              <text x="80" y="157" textAnchor="middle">
                {end ? "02 · Zaključek" : "01 · Začetek"}
              </text>
            </g>
          );
        })}
        <path d="M170 89H189M184 84L189 89L184 94" className="sketch-arrow" />
      </svg>
      {!compact && (
        <figcaption>
          Shematski prikaz giba. Nastavitve in obseg prilagodi svoji opremi.
        </figcaption>
      )}
    </figure>
  );
}
