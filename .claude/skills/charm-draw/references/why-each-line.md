# Why each prompt line is there

The charm is printed flat, 24–28 mm tall, 1 mm raised design on an 8 mm body, one filament per colour, on a 4-slot AMS.

| Prompt line | Reason |
|---|---|
| plain pure white background | The tracer treats white (or light grey checkerboard) connected to the picture's edge as empty. Anything else in the background becomes part of the bead. |
| flat solid colours, no gradients or shading | Every distinct shade becomes its own printable part. A gradient becomes dozens of slivers that are too thin to print. |
| at most 4 colours including the outline | 4-slot AMS. The body is printed in the outline colour (Kawaii) or the darkest colour (Christmas, Everyday Cute), so the outline costs no extra slot. |
| thick even outline, no hairlines | Lines thinner than about 0.8 mm at bead size (about 1/30 of the picture) break up or vanish when sliced. |
| chunky rounded shapes, no tiny details | Same reason; also, tiny islands of colour become loose fragments in the 3MF. |
| one connected silhouette | The Contour body follows the outline. Separate pieces either get bridged by a bar or fall off. |
| fills the frame | The bead is scaled to its height; a small drawing in a big frame prints small details even smaller. |
| no text, no border, no frame | Text is on the letter beads. A sticker border becomes a fifth colour and an unwanted halo. |
| square image | Thumbnails and the trace pipeline assume square; the modeler scales by height anyway. |
