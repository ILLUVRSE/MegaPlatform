import { PrismaClient } from "@prisma/client";
import { PrismaCanonRepository } from "../media-corp-canon/src/index.ts";
import { PrismaMemoryStore } from "../media-corp-memory/src/index.ts";
import { runMediaCorpCycle } from "../media-corp-orchestrator/src/index.ts";

const prisma = new PrismaClient();

async function main() {
  const adminRole = await prisma.role.upsert({
    where: { name: "admin" },
    update: {},
    create: {
      name: "admin",
      permissions: ["admin:*", "shows:*", "seasons:*", "episodes:*", "users:*", "roles:*"]
    }
  });

  await prisma.role.upsert({
    where: { name: "creator" },
    update: {},
    create: {
      name: "creator",
      permissions: ["shows:read", "episodes:read", "studio:write"]
    }
  });

  await prisma.role.upsert({
    where: { name: "user" },
    update: {},
    create: {
      name: "user",
      permissions: ["shows:read"]
    }
  });

  const adminUser = await prisma.user.upsert({
    where: { email: "admin@illuvrse.local" },
    update: { role: "admin" },
    create: {
      email: "admin@illuvrse.local",
      name: "ILLUVRSE Admin",
      role: "admin"
    }
  });

  await prisma.user.upsert({
    where: { email: "user@illuvrse.local" },
    update: { role: "user" },
    create: {
      email: "user@illuvrse.local",
      name: "ILLUVRSE Viewer",
      role: "user"
    }
  });

  let watchUser = await prisma.user.findFirst({
    where: { role: "user" },
    orderBy: { createdAt: "asc" }
  });
  if (!watchUser) {
    watchUser = await prisma.user.create({
      data: {
        email: "viewer@illuvrse.local",
        name: "ILLUVRSE Viewer",
        role: "user"
      }
    });
  }

  const profile = await prisma.profile.upsert({
    where: { id: "seed-profile-1" },
    update: { userId: watchUser.id, name: "Ryan", isKids: false },
    create: {
      id: "seed-profile-1",
      userId: watchUser.id,
      name: "Ryan",
      avatarUrl: "https://placehold.co/120x120?text=R"
    }
  });

  await prisma.profile.upsert({
    where: { id: "seed-profile-2" },
    update: { userId: watchUser.id, name: "Kids", isKids: true },
    create: {
      id: "seed-profile-2",
      userId: watchUser.id,
      name: "Kids",
      avatarUrl: "https://placehold.co/120x120?text=K",
      isKids: true
    }
  });

  await prisma.profile.upsert({
    where: { id: "seed-profile-3" },
    update: { userId: watchUser.id, name: "Guest", isKids: false },
    create: {
      id: "seed-profile-3",
      userId: watchUser.id,
      name: "Guest",
      avatarUrl: "https://placehold.co/120x120?text=G"
    }
  });

  const show = await prisma.show.upsert({
    where: { slug: "nebula-nights" },
    update: {
      featured: true,
      trending: true,
      newRelease: true,
      heroPriority: 1,
      featuredRail: "EDITOR_PICKS",
      featuredRailOrder: 1,
      watchOrder: 1,
      maturityRating: "TV-14",
      genres: ["Sci-Fi", "Drama"],
      tags: ["Anthology", "Featured"],
      cast: ["Aria Voss", "Kellan Juno"]
    },
    create: {
      title: "Nebula Nights",
      slug: "nebula-nights",
      description: "A late-night sci-fi anthology with creator-led watch parties.",
      posterUrl: "https://placehold.co/420x600?text=Nebula+Nights",
      heroUrl: "https://placehold.co/1200x500?text=Nebula+Nights",
      featured: true,
      trending: true,
      newRelease: true,
      heroPriority: 1,
      featuredRail: "EDITOR_PICKS",
      featuredRailOrder: 1,
      watchOrder: 1,
      maturityRating: "TV-14",
      genres: ["Sci-Fi", "Drama"],
      tags: ["Anthology", "Featured"],
      cast: ["Aria Voss", "Kellan Juno"]
    }
  });

  const showTwo = await prisma.show.upsert({
    where: { slug: "orbit-city" },
    update: {
      featured: true,
      trending: true,
      heroPriority: 2,
      featuredRail: "EDITOR_PICKS",
      featuredRailOrder: 2,
      watchOrder: 2,
      maturityRating: "TV-16",
      genres: ["Action", "Sci-Fi"],
      tags: ["Detective", "Neon"],
      cast: ["Mira Cole", "Dex Orion"]
    },
    create: {
      title: "Orbit City",
      slug: "orbit-city",
      description: "A neon detective story orbiting a megastructure.",
      posterUrl: "https://placehold.co/420x600?text=Orbit+City",
      heroUrl: "https://placehold.co/1200x500?text=Orbit+City",
      featured: true,
      trending: true,
      heroPriority: 2,
      featuredRail: "EDITOR_PICKS",
      featuredRailOrder: 2,
      watchOrder: 2,
      maturityRating: "TV-16",
      genres: ["Action", "Sci-Fi"],
      tags: ["Detective", "Neon"],
      cast: ["Mira Cole", "Dex Orion"]
    }
  });

  const showThree = await prisma.show.upsert({
    where: { slug: "tidal-rangers" },
    update: {
      featured: true,
      newRelease: true,
      heroPriority: 3,
      featuredRail: "KIDS_SPOTLIGHT",
      featuredRailOrder: 1,
      watchOrder: 3,
      maturityRating: "TV-Y7",
      genres: ["Kids", "Adventure", "Comedy"],
      tags: ["Animation"],
      cast: ["Lumi", "Riff"]
    },
    create: {
      title: "Tidal Rangers",
      slug: "tidal-rangers",
      description: "Animated explorers on a waterworld, built for kids.",
      posterUrl: "https://placehold.co/420x600?text=Tidal+Rangers",
      heroUrl: "https://placehold.co/1200x500?text=Tidal+Rangers",
      featured: true,
      newRelease: true,
      heroPriority: 3,
      featuredRail: "KIDS_SPOTLIGHT",
      featuredRailOrder: 1,
      watchOrder: 3,
      maturityRating: "TV-Y7",
      genres: ["Kids", "Adventure", "Comedy"],
      tags: ["Animation"],
      cast: ["Lumi", "Riff"]
    }
  });

  const season = await prisma.season.upsert({
    where: { id: "seed-season-1" },
    update: {},
    create: {
      id: "seed-season-1",
      showId: show.id,
      number: 1,
      title: "Season One"
    }
  });

  await prisma.episode.upsert({
    where: { id: "seed-episode-1" },
    update: {},
    create: {
      id: "seed-episode-1",
      seasonId: season.id,
      title: "Starlight Broadcast",
      description: "The crew receives a broadcast that bends time.",
      lengthSeconds: 1380,
      assetUrl: "https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"
    }
  });

  await prisma.episode.upsert({
    where: { id: "seed-episode-2" },
    update: {},
    create: {
      id: "seed-episode-2",
      seasonId: season.id,
      title: "Echoes of Titan",
      description: "Signals from Titan reveal a second timeline.",
      lengthSeconds: 1420,
      assetUrl: "https://storage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4"
    }
  });

  const seasonTwo = await prisma.season.upsert({
    where: { id: "seed-season-2" },
    update: {},
    create: {
      id: "seed-season-2",
      showId: showTwo.id,
      number: 1,
      title: "Season One"
    }
  });

  await prisma.episode.upsert({
    where: { id: "seed-episode-3" },
    update: {},
    create: {
      id: "seed-episode-3",
      seasonId: seasonTwo.id,
      title: "Midnight Circuit",
      description: "A detective chases a rogue AI through the ring city.",
      lengthSeconds: 1500,
      assetUrl: "https://storage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4"
    }
  });

  await prisma.episode.upsert({
    where: { id: "seed-episode-4" },
    update: {},
    create: {
      id: "seed-episode-4",
      seasonId: seasonTwo.id,
      title: "Crystal Alley",
      description: "The case leads into the floating archives.",
      lengthSeconds: 1520,
      assetUrl: "https://storage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4"
    }
  });

  const seasonThree = await prisma.season.upsert({
    where: { id: "seed-season-3" },
    update: {},
    create: {
      id: "seed-season-3",
      showId: showThree.id,
      number: 1,
      title: "Season One"
    }
  });

  await prisma.episode.upsert({
    where: { id: "seed-episode-5" },
    update: {},
    create: {
      id: "seed-episode-5",
      seasonId: seasonThree.id,
      title: "Coral Command",
      description: "The Rangers map a hidden reef.",
      lengthSeconds: 980,
      assetUrl: "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4"
    }
  });

  await prisma.episode.upsert({
    where: { id: "seed-episode-6" },
    update: {},
    create: {
      id: "seed-episode-6",
      seasonId: seasonThree.id,
      title: "Storm Drifters",
      description: "A storm forces a new teamwork drill.",
      lengthSeconds: 1010,
      assetUrl: "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4"
    }
  });

  const channelSeeds = [
    {
      slug: "illuvrse-news",
      name: "ILLUVRSE News",
      description: "Breaking updates from across the metaverse.",
      category: "News",
      streamUrl: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
      logoUrl: "https://placehold.co/200x120?text=News",
      heroUrl: "https://placehold.co/1200x500?text=ILLUVRSE+News"
    },
    {
      slug: "arcade-live",
      name: "Arcade Live",
      description: "Competitive arcade tournaments and esports.",
      category: "Gaming",
      streamUrl: "https://test-streams.mux.dev/bbb-360p/bbb-360p.m3u8",
      logoUrl: "https://placehold.co/200x120?text=Arcade",
      heroUrl: "https://placehold.co/1200x500?text=Arcade+Live"
    },
    {
      slug: "kids-galaxy",
      name: "Kids Galaxy",
      description: "Animated adventures for younger explorers.",
      category: "Kids",
      streamUrl: "https://test-streams.mux.dev/test_001/stream.m3u8",
      logoUrl: "https://placehold.co/200x120?text=Kids",
      heroUrl: "https://placehold.co/1200x500?text=Kids+Galaxy"
    },
    {
      slug: "synthwave-tv",
      name: "Synthwave TV",
      description: "Retro-futuristic music videos and visuals.",
      category: "Music",
      streamUrl: "https://test-streams.mux.dev/dai-discontinuity-delta/manifest.m3u8",
      logoUrl: "https://placehold.co/200x120?text=Synth",
      heroUrl: "https://placehold.co/1200x500?text=Synthwave+TV"
    },
    {
      slug: "studio-spotlight",
      name: "Studio Spotlight",
      description: "Behind the scenes with ILLUVRSE creators.",
      category: "Entertainment",
      streamUrl: "https://test-streams.mux.dev/pts_shift/master.m3u8",
      logoUrl: "https://placehold.co/200x120?text=Spotlight",
      heroUrl: "https://placehold.co/1200x500?text=Studio+Spotlight"
    },
    {
      slug: "sports-grid",
      name: "Sports Grid",
      description: "Live scores and highlights.",
      category: "Sports",
      streamUrl: "https://test-streams.mux.dev/abr/master.m3u8",
      logoUrl: "https://placehold.co/200x120?text=Sports",
      heroUrl: "https://placehold.co/1200x500?text=Sports+Grid"
    }
  ];

  for (const channel of channelSeeds) {
    const record = await prisma.liveChannel.upsert({
      where: { slug: channel.slug },
      update: { ...channel, isVirtual: false },
      create: { ...channel, isVirtual: false }
    });

    await prisma.liveProgram.deleteMany({ where: { channelId: record.id } });
    const now = new Date();
    const nowStart = new Date(now.getTime() - 30 * 60 * 1000);
    const nowEnd = new Date(now.getTime() + 30 * 60 * 1000);
    const nextEnd = new Date(now.getTime() + 90 * 60 * 1000);

    await prisma.liveProgram.createMany({
      data: [
        {
          channelId: record.id,
          title: `${record.name} Live`,
          description: record.description ?? "Live now.",
          startsAt: nowStart,
          endsAt: nowEnd
        },
        {
          channelId: record.id,
          title: `${record.name} Up Next`,
          description: "Coming up next.",
          startsAt: nowEnd,
          endsAt: nextEnd
        }
      ]
    });
  }

  const virtualChannel = await prisma.liveChannel.upsert({
    where: { slug: "illuvrse-marathon" },
    update: {
      name: "ILLUVRSE Marathon",
      description: "Always-on rotation of ILLUVRSE originals.",
      category: "Marathon",
      streamUrl: null,
      logoUrl: "https://placehold.co/200x120?text=Marathon",
      heroUrl: "https://placehold.co/1200x500?text=ILLUVRSE+Marathon",
      isVirtual: true,
      defaultProgramDurationMin: 30
    },
    create: {
      slug: "illuvrse-marathon",
      name: "ILLUVRSE Marathon",
      description: "Always-on rotation of ILLUVRSE originals.",
      category: "Marathon",
      streamUrl: null,
      logoUrl: "https://placehold.co/200x120?text=Marathon",
      heroUrl: "https://placehold.co/1200x500?text=ILLUVRSE+Marathon",
      isVirtual: true,
      defaultProgramDurationMin: 30
    }
  });

  const episodes = await prisma.episode.findMany({ take: 6, orderBy: { createdAt: "asc" } });
  if (episodes.length > 0) {
    await prisma.liveProgram.deleteMany({ where: { channelId: virtualChannel.id } });
    const now = new Date();
    const start = new Date(now.getTime() - 15 * 60 * 1000);
    const programs = episodes.slice(0, 4).map((episode, idx) => ({
      channelId: virtualChannel.id,
      title: episode.title,
      description: episode.description,
      startsAt: new Date(start.getTime() + idx * 30 * 60 * 1000),
      endsAt: new Date(start.getTime() + (idx + 1) * 30 * 60 * 1000),
      episodeId: episode.id,
      order: idx + 1
    }));
    await prisma.liveProgram.createMany({ data: programs });

    await prisma.myListItem.upsert({
      where: { profileId_mediaType_showId: { profileId: profile.id, mediaType: "SHOW", showId: show.id } },
      update: {},
      create: { profileId: profile.id, mediaType: "SHOW", showId: show.id }
    });

    await prisma.watchProgress.upsert({
      where: { profileId_episodeId: { profileId: profile.id, episodeId: episodes[0].id } },
      update: { positionSec: 320, durationSec: episodes[0].lengthSeconds },
      create: { profileId: profile.id, episodeId: episodes[0].id, positionSec: 320, durationSec: episodes[0].lengthSeconds }
    });
  }

  await prisma.adminAudit.create({
    data: {
      adminId: adminUser.id,
      action: "seed:init",
      details: "Initial seed completed."
    }
  });

  const existingShorts = await prisma.shortPost.count();
  if (existingShorts === 0) {
    const project = await prisma.studioProject.create({
      data: {
        type: "SHORT",
        title: "Nebula Nights: Social Cut",
        description: "Seeded studio project for shorts feed.",
        status: "COMPLETED",
        createdById: adminUser.id
      }
    });

    await prisma.studioAsset.create({
      data: {
        projectId: project.id,
        kind: "SHORT_MP4",
        url: "https://cdn.illuvrse.dev/assets/nebula-nights-short.mp4",
        metaJson: { durationSec: 32 }
      }
    });

    await prisma.shortPost.createMany({
      data: [
        {
          projectId: project.id,
          title: "Nebula Nights: Social Cut",
          caption: "The broadcast that bends time.",
          mediaUrl: "https://cdn.illuvrse.dev/assets/nebula-nights-short.mp4",
          mediaType: "VIDEO",
          createdById: adminUser.id,
          publishedAt: new Date()
        },
        {
          title: "Echoes Meme Drop",
          caption: "When the timeline collapses 😵‍💫",
          mediaUrl: "https://placehold.co/640x640?text=Meme+Drop",
          mediaType: "IMAGE",
          createdById: adminUser.id,
          publishedAt: new Date()
        }
      ]
    });
  }

  const existingFeedPosts = await prisma.feedPost.count();
  if (existingFeedPosts === 0) {
    const seededShorts = await prisma.shortPost.findMany({
      orderBy: { publishedAt: "desc" },
      take: 4
    });
    const seededShows = await prisma.show.findMany({
      orderBy: { createdAt: "desc" },
      take: 2
    });
    const seededEpisodes = await prisma.episode.findMany({
      orderBy: { createdAt: "desc" },
      take: 2
    });
    const seededChannels = await prisma.liveChannel.findMany({
      where: { isActive: true },
      orderBy: { createdAt: "desc" },
      take: 2
    });

    const basePosts = await prisma.feedPost.createMany({
      data: [
        ...(seededShorts[0]
          ? [
              {
                type: "SHORT",
                shortPostId: seededShorts[0].id,
                authorId: adminUser.id,
                authorProfile: adminUser.name ?? "ILLUVRSE Admin",
                caption: "Fresh short drop from Studio.",
                isPinned: true,
                isFeatured: true,
                featuredRank: 100
              }
            ]
          : []),
        ...(seededShorts[1]
          ? [
              {
                type: seededShorts[1].mediaType === "IMAGE" ? "MEME" : "SHORT",
                shortPostId: seededShorts[1].id,
                authorId: adminUser.id,
                authorProfile: adminUser.name ?? "ILLUVRSE Admin",
                caption: seededShorts[1].caption
              }
            ]
          : []),
        ...(seededEpisodes[0]
          ? [
              {
                type: "WATCH_EPISODE",
                episodeId: seededEpisodes[0].id,
                authorId: adminUser.id,
                authorProfile: "Watch Team",
                caption: "Now streaming in Watch."
              }
            ]
          : []),
        ...(seededShows[0]
          ? [
              {
                type: "WATCH_SHOW",
                showId: seededShows[0].id,
                authorId: adminUser.id,
                authorProfile: "Watch Team",
                caption: "Featured show of the week."
              }
            ]
          : []),
        ...(seededChannels[0]
          ? [
              {
                type: "LIVE_CHANNEL",
                liveChannelId: seededChannels[0].id,
                authorId: adminUser.id,
                authorProfile: "Live Desk",
                caption: "Live now on ILLUVRSE TV."
              }
            ]
          : []),
        {
          type: "GAME",
          gameKey: "asteroid-dash",
          authorId: adminUser.id,
          authorProfile: "Arcade Team",
          caption: "Can you top the leaderboard?"
        },
        {
          type: "LINK",
          linkUrl: "https://illuvrse.local/watch",
          authorId: adminUser.id,
          authorProfile: "ILLUVRSE",
          caption: "Discover new premieres."
        },
        {
          type: "TEXT",
          authorId: adminUser.id,
          authorProfile: "ILLUVRSE",
          caption: "Welcome to the new social wall."
        }
      ]
    });

    if (basePosts.count > 0) {
      const topPost = await prisma.feedPost.findFirst({
        where: { type: "SHORT" },
        orderBy: { createdAt: "asc" }
      });
      if (topPost) {
        await prisma.feedPost.create({
          data: {
            type: "SHARE",
            shareOfId: topPost.id,
            authorId: adminUser.id,
            authorProfile: "Community",
            caption: "Reposting this one for everyone.",
            isFeatured: true,
            featuredRank: 50
          }
        });
        await prisma.feedPost.update({
          where: { id: topPost.id },
          data: { shareCount: { increment: 1 } }
        });
      }
    }
  }

  const existingUserGames = await prisma.userGame.count();
  if (existingUserGames === 0) {
    const buildThumbnail = (title: string, accent: string, bg: string) => {
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360">
<defs>
<linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
<stop offset="0%" stop-color="${bg}"/>
<stop offset="100%" stop-color="${accent}"/>
</linearGradient>
</defs>
<rect width="640" height="360" rx="28" fill="url(#g)"/>
<circle cx="520" cy="90" r="52" fill="rgba(255,255,255,0.2)"/>
<circle cx="120" cy="280" r="42" fill="rgba(255,255,255,0.12)"/>
<text x="40" y="200" font-family="Space Grotesk, sans-serif" font-size="38" fill="#ffffff" font-weight="700">${title}</text>
</svg>`;
      return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
    };

    await prisma.userGame.createMany({
      data: [
        {
          title: "Neon Pop Sprint",
          description: "Fast clicks, zero chill.",
          status: "PUBLISHED",
          version: 1,
          seed: "gamegrid-seed-pop",
          templateId: "CLICK_TARGETS",
          specJson: {
            id: "CLICK_TARGETS-gamegrid-seed-pop",
            seed: "gamegrid-seed-pop",
            templateId: "CLICK_TARGETS",
            title: "Neon Pop Sprint",
            tagline: "Pop pop pop.",
            instructions: "Click the targets quickly. Misses cost you time.",
            durationSeconds: 30,
            inputSchema: { keys: [], mouse: { enabled: true } },
            winCondition: { type: "targets", target: 20 },
            loseCondition: { type: "timer" },
            scoring: { mode: "winlose" },
            theme: {
              palette: "neon-burst",
              bgStyle: "grid-glow",
              sfxStyle: "synth-pop",
              particles: "spark"
            },
            params: {
              targetCount: 20,
              targetSize: 34,
              spawnInterval: 0.7,
              missPenaltySeconds: 1.2
            },
            modifiers: ["confettiOnSuccess"]
          },
          thumbnailUrl: buildThumbnail("Neon Pop Sprint", "#4ff3ff", "#0b0b1a"),
          publishedAt: new Date()
        },
        {
          title: "Brick Shatter",
          description: "Breakout, but make it spicy.",
          status: "PUBLISHED",
          version: 1,
          seed: "gamegrid-seed-brick",
          templateId: "BREAKOUT_MICRO",
          specJson: {
            id: "BREAKOUT_MICRO-gamegrid-seed-brick",
            seed: "gamegrid-seed-brick",
            templateId: "BREAKOUT_MICRO",
            title: "Brick Shatter",
            tagline: "Bounce, break, repeat.",
            instructions: "Move the paddle, break the bricks, don't drop the ball.",
            durationSeconds: 30,
            inputSchema: { keys: ["ArrowLeft", "ArrowRight", "KeyA", "KeyD"], mouse: { enabled: true } },
            winCondition: { type: "bricks", target: 14 },
            loseCondition: { type: "misses", maxMisses: 3 },
            scoring: { mode: "winlose" },
            theme: {
              palette: "mint-arcade",
              bgStyle: "scanlines",
              sfxStyle: "chiptune",
              particles: "confetti"
            },
            params: {
              bricksToClear: 14,
              paddleWidth: 170,
              ballSpeed: 240,
              maxMisses: 3
            },
            modifiers: ["pulsatingLights"]
          },
          thumbnailUrl: buildThumbnail("Brick Shatter", "#5effc3", "#0b1d1f"),
          publishedAt: new Date()
        }
      ]
    });
  }

  const mediaSnapshotCount = await prisma.mediaWorldStateSnapshot.count();
  if (mediaSnapshotCount === 0) {
    await runMediaCorpCycle({
      repository: new PrismaCanonRepository(prisma),
      memoryStore: new PrismaMemoryStore(prisma),
      now: "2026-03-07T12:30:00.000Z"
    });
  }

  console.log("Seed completed", { adminRoleId: adminRole.id, adminUserId: adminUser.id });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
