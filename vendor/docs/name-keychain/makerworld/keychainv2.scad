// ============================================================================
//  Parametric Name Keychain — v2.1
//  Mirrors the latest web KeychainModeler. Built for the OpenSCAD Customizer
//  and MakerWorld's parametric "Make" flow — every tunable value is grouped
//  below and shows up as a slider / dropdown / checkbox.
//
//  New in v2.1 (synced from the web app):
//   • Cheat-sheet plate sizing removed — Plate Sizing is now Auto (hug the
//     content + padding, the default) or Manual (exact length & width).
//     Fit-to-plate applies to Manual plates only.
//   • Optional SVG logo beside the text: pick before/after, its own height,
//     thickness, gap, and color. The logo joins the outline halo, the auto
//     plate footprint, and fit-to-plate scaling, just like the web app.
//     NOTE: MakerWorld customizer users can only use SVG files shipped with
//     the model (like the bundled font) — they can't upload their own.
//     Desktop OpenSCAD can point logo_file at any local path.
//     OpenSCAD can't measure an imported SVG, so set logo_aspect
//     (width ÷ height) to your logo's ratio for correct spacing; the logo
//     itself always keeps its true aspect (resize is uniform).
//
//  Carried over from v2:
//   • Text Bevel — puffed / chamfered letter edges (0 = flat sides, like v1)
//   • Fit-to-plate respects BOTH plate length and width (min of the two
//     scales, keeps aspect) when exact text metrics are available
//   • Google-font list (Bangers default) alongside the original MakerWorld
//     font list — pick whichever renders on your engine
//
//  Exact text measurement uses textmetrics() when the engine supports it
//  (MakerWorld's build does); on OpenSCAD 2021.01 and older it silently
//  falls back to the v1 estimate + resize() fit, so the file renders anywhere.
//
//  Outline style uses a true geometric offset() around the letters (and the
//  logo); the keyring is bonded to the body with a small neck so it never
//  detaches.
// ============================================================================

/* [Text] */
// Text shown on the keychain
text_str = "Claire";
// Font. First block = Google fonts (free, match the web preview); second block = MakerWorld's original list. Unavailable fonts fall back to the engine default.
font = "Bangers"; // [Bangers, Luckiest Guy, Titan One, Sigmar One, Chewy, Bungee, Permanent Marker, Pacifico, Lobster, Creepster, Press Start 2P, Bubblegum Sans, Modak, Bagel Fat One, Sniglet, Lilita One, Bowlby One SC, Shrikhand, Anton, Alfa Slab One, Archivo Black, Graduate, Kaushan Script, Audiowide, Liberation Sans:style=Bold, Rainy Days, Andoly Cookie, American Captain, Rakoon, Marker Felt, House Movements, Crash Mounty, Sign Painter, Ashton Royal, Beach Bar, High School, Bubble Gum, Jumping Unicorn, Kirsty, Avigea, Chocolate Sprinkle, Rumblekill, Things, Palm Spring, Riffic, Gravity, Smart Fox, Britannic, AR Julian, Spicy Chicken, Amity Jack, DK Jambo, Dephiana, Hello Dina, Special Season]
// Cap height of the letters (mm). Ignored on a manual plate when "fit text" is on.
text_size = 12;        // [4:0.5:40]
// How far the letters stand up off the base (mm)
text_thickness = 2;    // [0.5:0.5:15]
// Puff / round the letter edges (mm). 0 = straight sides
text_bevel = 0;        // [0:0.1:3]
// Scale the text (and logo) to fill the plate (manual plates only) so any name fits
fit_text = true;
// Gap between the text and the plate edge when fitting (mm)
text_margin = 3;       // [0:0.5:12]

/* [Logo] */
// SVG logo file next to this .scad ("" = no logo). MakerWorld: only files shipped with the model work — customizer users can't upload their own. Desktop OpenSCAD: any path.
logo_file = "";
// Which side of the text the logo sits on
logo_position = "before"; // [before, after]
// Logo height (mm); width follows the SVG's own aspect ratio
logo_size = 12;        // [3:0.5:50]
// How far the logo stands up off the base (mm)
logo_thickness = 4;    // [0.5:0.5:15]
// Gap between the logo and the text (mm)
logo_gap = 3;          // [0:0.5:20]
// Your logo's width ÷ height. OpenSCAD can't measure an SVG, so this drives the spacing / footprint math (the logo itself is never distorted). 1 = square.
logo_aspect = 1.0;     // [0.2:0.05:5]

/* [Base] */
// Backing shape behind the text
base_style = "outline"; // [plate, outline, none]
// Thickness of the backing / keyring layer (mm)
base_thickness = 3;    // [0.5:0.5:12]
// PLATE sizing: auto hugs the content + padding; manual uses exact length & width
plate_sizing = "auto"; // [auto, manual]
// PLATE length when sizing = manual (mm)
plate_length = 50;     // [10:0.5:160]
// PLATE width when sizing = manual (mm)
plate_width = 21.94;   // [10:0.5:60]
// PLATE padding around the content when sizing = auto (mm)
padding = 4;           // [0:0.5:25]
// PLATE corner rounding (mm)
corner_radius = 6;     // [0:0.5:25]
// OUTLINE: width of the halo hugging the letters (mm)
outline_width = 2.5;   // [0.5:0.5:12]
// OUTLINE: fill the letter centers so only the outer contour shows (no holes)
outline_fill = false;

/* [Overall Size] */
// Scale the whole model. 100 = designed size, 150 = 1.5x (default)
model_scale = 150;     // [50:5:300]

/* [Keyring] */
// Add a loop with a hole for the ring
show_keyring = true;
// Diameter of the hole (mm)
hole_diameter = 6;     // [1:0.5:25]
// Material thickness around the hole (mm)
ring_wall = 2.5;       // [0.5:0.5:12]
// Nudge the loop left/right from its default left-edge spot (mm)
hole_offset_x = 0;     // [-40:0.5:40]
// Nudge the loop up/down (mm)
hole_offset_y = 0;     // [-40:0.5:40]

/* [Colors] */
// Letter color
text_color = "white"; // [white, black, gray, silver, red, orange, gold, yellow, green, lime, teal, cyan, blue, navy, purple, magenta, pink, brown]
// Logo color
logo_color = "white"; // [white, black, gray, silver, red, orange, gold, yellow, green, lime, teal, cyan, blue, navy, purple, magenta, pink, brown]
// Base / keyring color
base_color = "purple"; // [white, black, gray, silver, red, orange, gold, yellow, green, lime, teal, cyan, blue, navy, purple, magenta, pink, brown]

/* [Quality] */
// Smoothness of curves & circles
smoothness = 72;       // [24:8:160]

/* [Hidden] */
$fn = smoothness;

nchars   = len(text_str);
has_logo = logo_file != "";
plate_L  = plate_length;
plate_W  = plate_width;

// ── Text measurement ────────────────────────────────────────────────────────
// textmetrics() gives the real ink bounding box on engines that have it
// (MakerWorld, recent OpenSCAD snapshots). The untaken ternary branch is never
// evaluated, so 2021.01 renders this file without warnings using the estimate.
has_metrics = version_num() > 20210100;
tm = (has_metrics && nchars > 0)
    ? textmetrics(text = text_str, size = text_size, font = font,
                  halign = "center", valign = "center")
    : undef;
raw_w = !is_undef(tm) ? tm.size[0] : nchars * text_size * 0.62;
raw_h = !is_undef(tm) ? tm.size[1] : text_size;
text_lft = !is_undef(tm) ? tm.position[0] : -raw_w / 2;               // ink left edge
text_rgt = !is_undef(tm) ? tm.position[0] + tm.size[0] : raw_w / 2;   // ink right edge

// ── Content row: text + optional logo, in raw (pre-fit) coordinates ────────
// The logo is resized uniformly to logo_size tall; logo_aspect only feeds the
// layout math (spacing, footprint, fit), never distorts the artwork.
logo_w  = logo_size * logo_aspect;
logo_cx = !has_logo ? 0
        : (logo_position == "before") ? text_lft - logo_gap - logo_w / 2
        :                               text_rgt + logo_gap + logo_w / 2;
c_lft = (has_logo && logo_position == "before") ? logo_cx - logo_w / 2 : text_lft;
c_rgt = (has_logo && logo_position == "after")  ? logo_cx + logo_w / 2 : text_rgt;
c_w   = c_rgt - c_lft;
c_h   = max(raw_h, has_logo ? logo_size : 0);
c_cx  = (c_lft + c_rgt) / 2;   // content center — recentred to x=0 when placed

// Fit-to-plate scale (manual plates only). With metrics this matches the web
// app: the whole content row (text + logo) scales by the min of the length &
// width factors, aspect kept. Without metrics we fall back to v1's
// resize()-based length fit on the text (logo rides along unscaled).
fit_on  = (base_style == "plate" && plate_sizing == "manual" && fit_text && nchars > 0);
inner_L = plate_L - 2 * text_margin;
inner_W = plate_W - 2 * text_margin;
fit_s   = (fit_on && !is_undef(tm)) ? min(inner_L / c_w, inner_W / c_h) : 1;
eff_w   = c_w * fit_s;         // content width after fitting

// Where the body's left edge sits, used to seat the keyring exactly.
ring_o = hole_diameter / 2 + ring_wall;
left_x = (base_style == "plate" && plate_sizing == "manual") ? -plate_L / 2
       : (base_style == "outline") ? -eff_w / 2 - outline_width
       : (base_style == "plate")   ? -eff_w / 2 - padding
       :                             -eff_w / 2;
kx = left_x - ring_o * 0.6 + hole_offset_x;    // loop center x
ky = hole_offset_y;                            // loop center y

has_body = (base_style != "none") || show_keyring;
text_z   = has_body ? base_thickness : 0;

s      = model_scale / 100;          // overall scale factor
fill_r = text_size * 0.5;            // radius used to close letter centers

// ── 2D building blocks ──────────────────────────────────────────────────────
module text2d() {
    text(text_str, size = text_size, font = font,
         halign = "center", valign = "center");
}

// Logo scaled uniformly to logo_size tall, centered beside the text
module logo2d() {
    if (has_logo)
        translate([logo_cx, 0])
            resize([0, logo_size], auto = true)
                import(logo_file, center = true);
}

// Placed = fit scale applied (about the origin) + content recentred on x=0.
// Metrics path scales uniformly by the exact factor; fallback path resizes
// the text to the plate length (v1 behavior) with the logo alongside.
module text2d_placed() {
    if (fit_on && !is_undef(tm))
        translate([-c_cx * fit_s, 0]) scale([fit_s, fit_s]) text2d();
    else if (fit_on)
        translate([-c_cx, 0]) resize([inner_L, 0], auto = true) text2d();
    else
        translate([-c_cx, 0]) text2d();
}

module logo2d_placed() {
    if (has_logo) {
        if (fit_on && !is_undef(tm))
            translate([-c_cx * fit_s, 0]) scale([fit_s, fit_s]) logo2d();
        else
            translate([-c_cx, 0]) logo2d();
    }
}

module content2d_placed() {
    text2d_placed();
    logo2d_placed();
}

module rrect(w, h, r) {
    rr = max(0, min(r, w / 2, h / 2));
    offset(r = rr)
        square([max(0.01, w - 2 * rr), max(0.01, h - 2 * rr)], center = true);
}

module base2d() {
    if (base_style == "plate") {
        if (plate_sizing == "auto") {
            cr = max(0, min(corner_radius, padding));
            offset(r = cr) offset(delta = padding - cr) hull() content2d_placed();
        } else {
            rrect(plate_L, plate_W, corner_radius);   // manual rectangle
        }
    } else if (base_style == "outline") {
        outline2d();
    }
    // "none" -> no backing
}

// Outline halo around the whole content row (text + logo). When outline_fill
// is on, the letter centers are closed first (dilate + erode) so only the
// outer contour remains — no inner holes.
module outline2d() {
    if (outline_fill)
        offset(r = outline_width) offset(delta = -fill_r) offset(delta = fill_r) content2d_placed();
    else
        offset(r = outline_width) content2d_placed();
}

// ring outer disc + a neck back to the body center (origin) so it always bonds
module keyring_outer2d() {
    translate([kx, ky]) circle(r = ring_o);
    hull() {
        translate([kx, ky]) circle(r = ring_o * 0.55);
        circle(r = ring_o * 0.55);
    }
}

// ── Solids ──────────────────────────────────────────────────────────────────
module base_solid() {
    linear_extrude(height = base_thickness)
        difference() {
            union() {
                base2d();
                if (show_keyring) keyring_outer2d();
            }
            if (show_keyring)
                translate([kx, ky]) circle(d = hole_diameter);
        }
}

// Letters. With text_bevel > 0 the sides get a pillow profile like the web
// preview: the mid-body bulges outward by the bevel amount and tapers back to
// the true outline at the top and bottom faces, built from stacked slices.
bev_steps = 3; // slices per tapered zone; keep small for render speed
bev_fn    = 24; // corner rounding of the bevel offsets (lower = faster render)
module text_solid() {
    bev = min(text_bevel, text_thickness * 0.45);
    translate([0, 0, text_z]) {
        if (bev <= 0) {
            linear_extrude(height = text_thickness) text2d_placed();
        } else {
            zt = bev / bev_steps;                 // one slice's height
            // bottom taper: outline -> outline + bev
            for (i = [0 : bev_steps - 1])
                translate([0, 0, i * zt])
                    linear_extrude(height = zt + 0.01)
                        offset(r = bev * (i + 0.5) / bev_steps, $fn = bev_fn) text2d_placed();
            // mid body at full bulge
            translate([0, 0, bev])
                linear_extrude(height = max(0.01, text_thickness - 2 * bev))
                    offset(r = bev, $fn = bev_fn) text2d_placed();
            // top taper: outline + bev -> outline
            for (i = [0 : bev_steps - 1])
                translate([0, 0, text_thickness - bev + i * zt])
                    linear_extrude(height = zt + 0.01)
                        offset(r = bev * (bev_steps - i - 0.5) / bev_steps, $fn = bev_fn) text2d_placed();
        }
    }
}

// Logo, extruded at its own thickness, resting on the base like the text
module logo_solid() {
    translate([0, 0, text_z])
        linear_extrude(height = logo_thickness)
            logo2d_placed();
}

// ── Assemble ────────────────────────────────────────────────────────────────
scale([s, s, s]) {
    if (has_body) color(base_color) base_solid();
    if (nchars > 0) color(text_color) text_solid();
    if (has_logo) color(logo_color) logo_solid();
}
