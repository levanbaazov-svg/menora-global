# Online Cheder

Interactive demo of the Online Cheder platform — a full Jewish day-school
experience online: live davening and chavrusas, mastery-based lessons,
sugya maps, a "bring it to life" scene studio, tickets & raffle motivation,
and a per-child progress map.

- Stack: Next.js (App Router), Tailwind CSS v4, TypeScript.
- Demo state lives in localStorage — no backend required.
- The guide character image goes to `public/cheder/melamed.png`
  (an inline SVG stand-in renders until the file exists).

## Run

```
npm install
npm run dev
```

Open http://localhost:3000 (redirects to `/cheder`).
