# Let's Make Studio — Mini Mic (version 1)

Our own modular mini microphone holder, made from scratch in code. It is the first Etsy file
kit in the plan (commercial licence, logo panel); if it sells, it becomes a Seller-plan modeler.

| Part | Colour (suggested) | Prints |
|---|---|---|
| Head: capsule with ribs and rings | silver | upright, no supports |
| Body: logo recess in front, mic pocket at the back | red | upright, no supports (the pocket roof is a short bridge) |
| Logo plate: blank, and a two-colour heart demo | white + red | flat |
| Handle: tapered, three grip rings | black | upright |
| Pin ×2: D-shaped, joins head↔body and body↔handle | black | lying on its flat side |
| Fit test: only the mic pocket, thin walls | any | opening up, about 20 minutes |

Nothing is glued: the D-shaped pins push into D-shaped sockets, so parts cannot spin and can be
swapped (new logo plate, other head, other colour).

## The mic numbers are not checked yet

`micW`, `micT`, `micD`, `clipSlot`, `clipWall` and `clipRelief` at the top of `src/build.ts` are
starting values only. Print the fit test with the real mic, change the numbers, build again, and
only then print the full holder or sell the file.

## Build

```bash
cd designs/mini-mic
npm install
npm run build        # writes out/ (3MF with every part on one plate, STL zip, fit test)
npm run build -- --check   # builds and checks every mesh, writes nothing
```

Shared geometry code in `src/shared/` is a copy of `packages/geometry/src/`: edit the package and
run `npm run sync-shared` in the hub, never edit the copy.

## Where the idea came from

Mini decorative mic holders are a popular MakerWorld category. We looked at two published models
(Hollyland and DJI Mic 2 versions) only to learn how big a mic pocket is and what their reviews
complain about (no assembly guide, lock too tight, wrong mic). None of their geometry is used:
both are licensed for personal use only.
