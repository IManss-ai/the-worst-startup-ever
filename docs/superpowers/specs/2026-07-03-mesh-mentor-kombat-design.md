# MESH — Mentor Kombat (Worst Startup Ever hackathon)

## The startup lie
Founders receive contradictory advice from mentors. MESH is the world's first
**Mentorship Conflict Resolution Platform**: two disagreeing mentors fight in 3D;
the winner's advice becomes binding. We take 30% carry on winning advice.

## Scoring targets (nFactorial rubric, 100 pts)
- Tech (30): live 3D fighting engine (Three.js/R3F), rigged GLB mentors, live LLM
  trash-talk generation, TTS announcer, WebAudio SFX. Deployed on Vercel.
- Landing (20): Series-A parody — hero, fake metrics, pricing, testimonials, FAQ,
  privacy policy ("we do not store your mentor's shame").
- Absurdity (20): binding combat-resolved advice; Enterprise "Board Edition".
- Pitch (20): PITCH.md script + Q&A cheat sheet, stone-faced VC language.
- Bullshit (10): TAM $4.7B of wasted office hours; 14,000 conflicts resolved.

## Architecture
- Next.js App Router + React Three Fiber, deployed to Vercel early.
- `/` landing (static, no runtime deps that can fail).
- `/fight`: character select → arena. 2.5D fighter: move / punch / kick / special,
  HP 100, best-of-3 rounds, 60s timer.
- Controller abstraction: KeyboardController (WASD+FG vs Arrows+KL) and
  AIController share one interface → "AUTO" button = CPU vs CPU stage fallback.
- Fighters: rigged GLBs in `public/models/<id>.glb` (roster in `lib/mentors.ts`,
  single edit point). Missing model → procedural placeholder fighter, never crashes.
- Animation: GLB clips matched by name heuristics (idle/walk/punch/kick); else
  procedural transforms (lunge, bob, spin-on-KO).
- `/api/trashtalk`: Claude generates venture trash talk; baked-in fallback pool if
  no API key / failure. Client also has an offline pool. Spoken via speechSynthesis.
- SFX synthesized with WebAudio — zero external assets, nothing to 404 on stage.

## Constraints
- All code written during the event (rule 1) — small frequent commits.
- No mentor voice cloning (consent). Generic absurd TTS voices only.
- Demo must survive: auto-mode fallback, offline trash-talk pool, placeholder models.
