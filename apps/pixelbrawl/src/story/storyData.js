import rosterData from "../engine/roster/roster.json";

const shared = {
  byte: {
    intro: "assets/story/byte/intro/",
    ending: "assets/story/byte/ending/",
    matchup: "assets/story/byte/matchups/"
  },
  vex: {
    intro: "assets/story/vex/intro/",
    ending: "assets/story/vex/ending/",
    matchup: "assets/story/vex/matchups/"
  },
  glitch: {
    intro: "assets/story/glitch/intro/",
    ending: "assets/story/glitch/ending/",
    matchup: "assets/story/glitch/matchups/"
  },
  brick: {
    intro: "assets/story/brick/intro/",
    ending: "assets/story/brick/ending/",
    matchup: "assets/story/brick/matchups/"
  }
};

const sharedPanels = {
  prefight: [
    "assets/story/shared/prefight_1.webp",
    "assets/story/shared/prefight_2.webp",
    "assets/story/shared/prefight_3.webp"
  ],
  postWin: [
    "assets/story/shared/post_win_1.webp",
    "assets/story/shared/post_win_2.webp"
  ],
  postLose: [
    "assets/story/shared/post_lose_1.webp",
    "assets/story/shared/post_lose_2.webp"
  ]
};

const asPanels = (lines, images) => lines.map((text, i) => ({ image: images[i % images.length], text: [text] }));

export const storyData = {
  fighters: {
    byte: {
      displayName: "BYTE",
      intro: [
        {
          image: `${shared.byte.intro}intro_1.webp`,
          text: ["BYTE: \"Calibrating breath, stance, and distance.\"", "No wasted movement enters the ring."]
        },
        {
          image: `${shared.byte.intro}intro_2.webp`,
          text: ["BYTE: \"Today, precision decides everything.\""]
        }
      ],
      ending: [
        {
          image: `${shared.byte.ending}ending_1.webp`,
          text: ["BYTE lowers their guard and bows.", "The crowd answers with a hush."]
        },
        {
          image: `${shared.byte.ending}ending_2.webp`,
          text: ["BYTE: \"Control is not silence. It is intent.\""]
        },
        {
          image: `${shared.byte.ending}ending_3.webp`,
          text: ["A final bracket appears.", "BYTE turns back toward the lights."]
        }
      ],
      genericPrefight: asPanels(
        [
          "BYTE: \"Guard first. Ego second.\"",
          "BYTE: \"Every opening has a cost.\"",
          "BYTE: \"Stay sharp. I won't repeat myself.\"",
          "BYTE: \"Measure once. Strike once.\"",
          "BYTE: \"I prefer clean rounds to loud ones.\"",
          "BYTE: \"Discipline outlasts talent.\""
        ],
        sharedPanels.prefight
      ),
      genericPostfightWin: asPanels(
        [
          "BYTE: \"Control maintained.\"",
          "BYTE: \"You forced good adjustments.\"",
          "BYTE: \"That was decided by timing.\"",
          "BYTE: \"You broke rhythm once. Not twice.\"",
          "BYTE: \"Respect. Now recover.\"",
          "BYTE: \"Precision over spectacle.\""
        ],
        sharedPanels.postWin
      ),
      genericPostfightLose: asPanels(
        [
          "BYTE: \"I drifted. I'll correct it.\"",
          "BYTE: \"Good read. I own that mistake.\"",
          "BYTE: \"The answer was there. I found it late.\"",
          "BYTE: \"Loss logged. Focus remains.\""
        ],
        sharedPanels.postLose
      ),
      linePools: {
        p1Lines: [
          "One clean exchange.",
          "Patience is my tempo.",
          "Your stance tells the truth.",
          "Hands high, center tight.",
          "No panic. No waste.",
          "You lean before you strike.",
          "Set the line and hold it.",
          "I don't chase. I place.",
          "Breathe. Read. Respond.",
          "Small errors lose rounds.",
          "I take what is earned.",
          "Distance is a contract.",
          "Guard is character.",
          "No shortcuts in this ring."
        ],
        winLines: [
          "Execution complete.",
          "The cleaner read won.",
          "Composure carried it.",
          "You made me sharpen.",
          "Solved in three steps.",
          "Discipline held.",
          "You pushed the pace well.",
          "Control restored.",
          "That's the standard.",
          "Measured and finished."
        ],
        loseLines: [
          "I gave away the angle.",
          "Too late on the adjustment.",
          "You took center well.",
          "I overcommitted once.",
          "I can answer that next time.",
          "Good pressure. Clean win.",
          "I missed the rhythm shift.",
          "That round is on me."
        ],
        tauntLines: [
          "Guard up if you value balance.",
          "You move like noise.",
          "You telegraph the second beat.",
          "Precision beats impulse.",
          "You start fast and fade.",
          "I can read this pace all night.",
          "Your feet betray you.",
          "You swing before you think.",
          "I don't need many openings.",
          "Try not to blink on impact."
        ]
      },
      matchups: {
        glitch: {
          prefight: [
            {
              image: `${shared.byte.matchup}glitch/prefight_1.webp`,
              text: [
                "BYTE: \"You keep calling chaos freedom.\"",
                "GLITCH: \"Freedom is what survives your rules.\"",
                "BYTE: \"Then let's test what survives.\""
              ]
            },
            {
              image: `${shared.byte.matchup}glitch/prefight_2.webp`,
              text: [
                "GLITCH: \"You still think clean code wins street fights?\"",
                "BYTE: \"Only one way to benchmark it.\""
              ]
            }
          ],
          postfightWin: [
            {
              image: `${shared.byte.matchup}glitch/post_win_1.webp`,
              text: ["BYTE: \"Static cleared.\"", "GLITCH smirks through split pixels."]
            }
          ],
          postfightLose: [
            {
              image: `${shared.byte.matchup}glitch/post_lose_1.webp`,
              text: ["GLITCH: \"You can't debug a ghost.\"", "BYTE: \"Then I adapt.\""]
            }
          ]
        }
      }
    },

    vex: {
      displayName: "VEX",
      intro: [
        {
          image: `${shared.vex.intro}intro_1.webp`,
          text: ["VEX steps forward like the arena was built for them.", "The crowd noise lifts with every stride."]
        },
        {
          image: `${shared.vex.intro}intro_2.webp`,
          text: ["VEX: \"I don't borrow moments. I take them.\""]
        }
      ],
      ending: [
        {
          image: `${shared.vex.ending}ending_1.webp`,
          text: ["VEX stands center stage, chin high.", "No apology in the posture."]
        },
        {
          image: `${shared.vex.ending}ending_2.webp`,
          text: ["VEX: \"Top spot today. Higher target tomorrow.\""]
        },
        {
          image: `${shared.vex.ending}ending_3.webp`,
          text: ["A fresh challenger list rolls in.", "VEX smiles like it's a gift."]
        }
      ],
      genericPrefight: asPanels(
        [
          "VEX: \"Let's make this loud.\"",
          "VEX: \"You brought your best, right?\"",
          "VEX: \"Stay in front of me if you can.\"",
          "VEX: \"I'm not here to edge out wins.\"",
          "VEX: \"Big stage, big pressure. Perfect.\"",
          "VEX: \"Keep up and this will be fun.\""
        ],
        sharedPanels.prefight
      ),
      genericPostfightWin: asPanels(
        [
          "VEX: \"That looked good from up here.\"",
          "VEX: \"You pushed me. Respect.\"",
          "VEX: \"I told you I'd set the pace.\"",
          "VEX: \"Pressure made the difference.\"",
          "VEX: \"Good fight. Better finish.\"",
          "VEX: \"Momentum is mine now.\""
        ],
        sharedPanels.postWin
      ),
      genericPostfightLose: asPanels(
        [
          "VEX: \"All right, that was clean.\"",
          "VEX: \"You got me this round.\"",
          "VEX: \"I gave you space and paid for it.\"",
          "VEX: \"Next time I close the door earlier.\""
        ],
        sharedPanels.postLose
      ),
      linePools: {
        p1Lines: [
          "Center ring is mine.",
          "Let's raise the tempo.",
          "You're about to feel pressure.",
          "I don't play not to lose.",
          "Eyes up. I'm moving first.",
          "The crowd loves commitment.",
          "I like high-risk rounds.",
          "Follow me if you can.",
          "No waiting, no fear.",
          "I'm already in your head.",
          "This is my kind of spotlight.",
          "You picked the wrong night.",
          "I close hard in round two.",
          "You won't set my pace.",
          "Make it dramatic."
        ],
        winLines: [
          "Stage belongs to me.",
          "That was a statement.",
          "I broke your rhythm early.",
          "Call that a headline finish.",
          "You made it fun.",
          "I can do this all bracket.",
          "Pressure wins championships.",
          "I stayed one step ahead.",
          "Good swing. Better answer.",
          "Crowd got what it came for."
        ],
        loseLines: [
          "I bit on that setup.",
          "You earned that spotlight.",
          "I chased too hard.",
          "You clipped my momentum.",
          "I got greedy.",
          "That counter was perfect.",
          "Fine. Run it back.",
          "I know exactly what to fix."
        ],
        tauntLines: [
          "You freezing already?",
          "Too slow for this pace.",
          "I can smell hesitation.",
          "You're reacting, not leading.",
          "Try to catch up.",
          "That guard is opening.",
          "You don't like pressure.",
          "I'm dictating this fight.",
          "You looked better in warmup.",
          "Keep swinging into my range."
        ]
      },
      matchups: {
        brick: {
          prefight: [
            {
              image: `${shared.vex.matchup}brick/prefight_1.webp`,
              text: [
                "VEX: \"You hit like a truck, I'll give you that.\"",
                "BRICK: \"Then don't stand still.\"",
                "VEX: \"I never do.\""
              ]
            },
            {
              image: `${shared.vex.matchup}brick/prefight_2.webp`,
              text: [
                "BRICK: \"I only need one grab.\"",
                "VEX: \"Then pray you touch me once.\""
              ]
            }
          ],
          postfightWin: [
            {
              image: `${shared.vex.matchup}brick/post_win_1.webp`,
              text: ["VEX: \"Speed breaks stone every time.\"", "BRICK exhales and nods once."]
            }
          ],
          postfightLose: [
            {
              image: `${shared.vex.matchup}brick/post_lose_1.webp`,
              text: ["BRICK: \"Too close is my world.\"", "VEX: \"Yeah. I felt it.\""]
            }
          ]
        }
      }
    },

    glitch: {
      displayName: "GLITCH",
      intro: [
        {
          image: `${shared.glitch.intro}intro_1.webp`,
          text: ["GLITCH arrives with a smile that doesn't match the eyes.", "The lights flicker out of sync."]
        },
        {
          image: `${shared.glitch.intro}intro_2.webp`,
          text: ["GLITCH: \"Let's ruin something expensive.\""]
        }
      ],
      ending: [
        {
          image: `${shared.glitch.ending}ending_1.webp`,
          text: ["GLITCH bows to no one.", "The camera feed tears and stitches itself."]
        },
        {
          image: `${shared.glitch.ending}ending_2.webp`,
          text: ["GLITCH: \"Control is just fear with better branding.\""]
        },
        {
          image: `${shared.glitch.ending}ending_3.webp`,
          text: ["A fake winner screen flashes.", "GLITCH laughs as alarms ring."]
        }
      ],
      genericPrefight: asPanels(
        [
          "GLITCH: \"Did anyone tell you the rules changed?\"",
          "GLITCH: \"I love predictable opponents.\"",
          "GLITCH: \"Come closer. I promise confusion.\"",
          "GLITCH: \"Your plan looks fragile.\"",
          "GLITCH: \"I break rhythm for a living.\"",
          "GLITCH: \"Let's see what panic looks like on you.\""
        ],
        sharedPanels.prefight
      ),
      genericPostfightWin: asPanels(
        [
          "GLITCH: \"That went exactly wrong for you.\"",
          "GLITCH: \"I barely tried to be fair.\"",
          "GLITCH: \"You lost track of me by round one.\"",
          "GLITCH: \"Beautiful chaos, no?\"",
          "GLITCH: \"You stepped into every trap.\"",
          "GLITCH: \"I can do meaner if you want.\""
        ],
        sharedPanels.postWin
      ),
      genericPostfightLose: asPanels(
        [
          "GLITCH: \"Cute. You survived my favorite setup.\"",
          "GLITCH: \"Okay, that counter was rude.\"",
          "GLITCH: \"Fine. I'll be less playful next time.\"",
          "GLITCH: \"You don't get to feel safe yet.\""
        ],
        sharedPanels.postLose
      ),
      linePools: {
        p1Lines: [
          "Let's desync your confidence.",
          "You trust patterns too much.",
          "I'll be where your read isn't.",
          "We can skip the fair part.",
          "You look stable. That's temporary.",
          "I brought extra bad decisions.",
          "I can fake this pace forever.",
          "Watch the wrong hand.",
          "You'll second-guess everything.",
          "I collect hesitation.",
          "This bracket needs sabotage.",
          "Try to pin smoke.",
          "I only play loaded games.",
          "Let's bend the script.",
          "Your timing is antique."
        ],
        winLines: [
          "Outplayed by static.",
          "I lied and you believed it.",
          "You chased shadows again.",
          "Deliciously messy.",
          "That trap still works.",
          "I break habits for sport.",
          "You couldn't lock me down.",
          "Chaos got the decision.",
          "I rewrote your tempo.",
          "You never found the real angle."
        ],
        loseLines: [
          "Ugh, clean fundamentals.",
          "You read through the noise.",
          "I got greedy with the bait.",
          "You refused the panic game.",
          "That was annoyingly disciplined.",
          "I left one pattern exposed.",
          "Fine, you solved this version.",
          "Next patch won't be so polite."
        ],
        tauntLines: [
          "Did your confidence just stutter?",
          "You're guessing now.",
          "Look left, lose right.",
          "You can't guard uncertainty.",
          "I can smell panic inputs.",
          "You still think this is honest?",
          "Every answer you have is late.",
          "I love when fighters chase ghosts.",
          "You brought rules to a glitch.",
          "Try again, maybe with luck."
        ]
      },
      matchups: {}
    },

    brick: {
      displayName: "BRICK",
      intro: [
        {
          image: `${shared.brick.intro}intro_1.webp`,
          text: ["BRICK enters like a closing door.", "The floor speaks first, then the fighter."]
        },
        {
          image: `${shared.brick.intro}intro_2.webp`,
          text: ["BRICK: \"Step in.\""]
        }
      ],
      ending: [
        {
          image: `${shared.brick.ending}ending_1.webp`,
          text: ["BRICK lifts a taped fist.", "No grin. No celebration."]
        },
        {
          image: `${shared.brick.ending}ending_2.webp`,
          text: ["BRICK: \"Talk less. Hit harder.\""]
        },
        {
          image: `${shared.brick.ending}ending_3.webp`,
          text: ["The lights dim around BRICK's silhouette.", "Nobody rushes the exit path."]
        }
      ],
      genericPrefight: asPanels(
        [
          "BRICK: \"Forward.\"",
          "BRICK: \"No dancing.\"",
          "BRICK: \"Come here.\"",
          "BRICK: \"I don't miss twice.\"",
          "BRICK: \"Short round.\"",
          "BRICK: \"You ready?\""
        ],
        sharedPanels.prefight
      ),
      genericPostfightWin: asPanels(
        [
          "BRICK: \"Done.\"",
          "BRICK: \"Too light.\"",
          "BRICK: \"Stayed inside. Won.\"",
          "BRICK: \"You broke first.\"",
          "BRICK: \"Heavy hands settle it.\"",
          "BRICK: \"Next.\""
        ],
        sharedPanels.postWin
      ),
      genericPostfightLose: asPanels(
        [
          "BRICK: \"Good one.\"",
          "BRICK: \"I was late.\"",
          "BRICK: \"You moved well.\"",
          "BRICK: \"Run it back.\""
        ],
        sharedPanels.postLose
      ),
      linePools: {
        p1Lines: [
          "Stand your ground.",
          "No room to run.",
          "Close distance. End it.",
          "I hit through guards.",
          "Keep it simple.",
          "You move, I follow.",
          "I'm not backing up.",
          "One grab changes everything.",
          "No wasted words.",
          "You feel that pressure?",
          "I like short fights.",
          "Stay close.",
          "Let's trade.",
          "I can do this all night.",
          "Brace."
        ],
        winLines: [
          "Too heavy.",
          "Stayed on you.",
          "That broke you.",
          "You folded.",
          "Pressure held.",
          "Simple win.",
          "Good chin. Not enough.",
          "You felt every shot.",
          "No escape once I close.",
          "Told you."
        ],
        loseLines: [
          "Missed my window.",
          "You were faster.",
          "I chased too straight.",
          "Good footwork.",
          "Should've cut you off.",
          "You earned it.",
          "Next time I catch you.",
          "I let you breathe."
        ],
        tauntLines: [
          "You can't keep distance forever.",
          "I break guards.",
          "You hit like paper.",
          "Stop moving and fight.",
          "I'll walk through that.",
          "You scare easy.",
          "Take one step back and lose.",
          "Stay there. I'll come.",
          "You don't like body shots.",
          "I'm still fresh."
        ]
      },
      matchups: {}
    }
  },

  stages: {
    neonDojo: {
      tagLines: [
        "Neon rain crawls across the glass.",
        "Arc signs buzz like angry insects.",
        "Puddles mirror every feint.",
        "Distant trains shake the alley floor.",
        "The dojo lights hum in electric blue.",
        "Every shadow looks one frame delayed."
      ]
    },
    streetAlley: {
      tagLines: [
        "Wet brick traps the crowd noise.",
        "An old sign flickers and dies again.",
        "Steam lifts from broken vents.",
        "Bottle glass crunches underfoot.",
        "Sirens fade somewhere beyond the block.",
        "Rainwater drags oil into rainbow streaks."
      ]
    },
    temple: {
      tagLines: [
        "Lantern smoke hangs in still air.",
        "Bells answer each distant impact.",
        "Stone steps keep their own memory.",
        "Prayer ribbons tremble in the draft.",
        "Torchlight cuts gold across old carvings.",
        "The silence feels heavier than armor."
      ]
    },
    octagon: {
      tagLines: [
        "Cage wire rattles with each collision.",
        "Camera flashes chase every angle.",
        "Commentary noise bleeds into static.",
        "Sponsor lights paint the canvas white.",
        "The timer horn echoes through steel.",
        "Somewhere, betting slips change hands."
      ]
    }
  },

  templates: {
    prefight: ["{P1} sizes up {P2}.", "{P1}: \"{P1_LINE}\"", "{P2}: \"{P2_LINE}\""],
    postfightWin: ["{P1}: \"{WIN_LINE}\"", "{P2} staggers back. The crowd reacts."],
    postfightLose: ["{P1}: \"{LOSE_LINE}\"", "{P2}: \"{TAUNT_LINE}\""]
  }
};

const scaffoldPool = (name, kind) => {
  if (kind === "p1Lines") return [`${name}: "Let's settle this."`, `${name}: "No wasted rounds."`, `${name}: "Stay focused."`];
  if (kind === "winLines") return ["Victory secured.", "That was clean.", "Pressure held."];
  if (kind === "loseLines") return ["You'll get no easy rematch.", "Good read.", "I'll adjust."];
  return ["You won't keep up.", "Show me your best.", "Too slow."];
};

const makeDefaultFighterStory = (id, displayName) => ({
  displayName,
  intro: [
    { image: `assets/story/${id}/intro/intro_1.webp`, text: [`${displayName} arrives in silence.`, "The arena waits."] }
  ],
  ending: [
    { image: `assets/story/${id}/ending/ending_1.webp`, text: [`${displayName} leaves with a hard-earned win.`] }
  ],
  genericPrefight: asPanels([`${displayName}: "Let's go."`, `${displayName}: "No holding back."`], sharedPanels.prefight),
  genericPostfightWin: asPanels([`${displayName}: "Done."`, `${displayName}: "Good fight."`], sharedPanels.postWin),
  genericPostfightLose: asPanels([`${displayName}: "Not enough today."`, `${displayName}: "Next time."`], sharedPanels.postLose),
  linePools: {
    p1Lines: scaffoldPool(displayName, "p1Lines"),
    winLines: scaffoldPool(displayName, "winLines"),
    loseLines: scaffoldPool(displayName, "loseLines"),
    tauntLines: scaffoldPool(displayName, "tauntLines")
  },
  matchups: {}
});

for (const [id, meta] of Object.entries(rosterData.fighters || {})) {
  if (!storyData.fighters[id]) {
    storyData.fighters[id] = makeDefaultFighterStory(id, meta.displayName || String(id).toUpperCase());
  }
}
