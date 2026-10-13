// ============================================================================
//  Parametric Desktop Sign
//  Mirrors the web SignModeler. Built for the OpenSCAD Customizer and
//  MakerWorld's parametric "Make" flow — every tunable value is grouped below
//  and shows up as a slider / dropdown / checkbox.
//
//  A standing nameplate: raised text on a silhouette or plate body that stands
//  upright on a desk. Modelled lying on its back (face up, text raised in +Z) —
//  the print orientation, so it slices flat with no supports and takes a two-
//  colour filament swap at the base/text boundary. A wedge (or foot / brace)
//  gives the physical back-lean. The web modeler is the exact source of truth;
//  this mirror uses estimated text widths, so nudge the sizes for a perfect
//  match. Up to three text lines (the Customizer has no multi-line textbox).
// ============================================================================

/* [Text] */
// Line 1 of the name
line1 = "Ms.";
// Line 2 (leave blank for a single-line sign)
line2 = "Barnes";
// Line 3 (optional)
line3 = "";
// Font — MakerWorld's built-in fonts (render on MakerWorld's engine; desktop
// OpenSCAD falls back to its default font when the font isn't installed).
font = "DejaVu Sans:style=Bold";
// Cap height of the letters (mm)
text_size = 14;         // [4:0.5:40]
// Line spacing as a multiple of the text size
line_spacing = 1.1;     // [0.8:0.05:2]
// How far the letters stand off the front face (mm)
text_raise = 1.6;       // [0.4:0.1:8]
// Scale the text to fill the plate (plate + chart/manual only) so any name fits
fit_text = true;
// Gap between the text and the plate edge when fitting (mm)
text_margin = 3;        // [0:0.5:12]

/* [Sign Body] */
// Backing shape behind the text
base_style = "outline"; // [outline, plate, none]
// Panel thickness (mm)
sign_depth = 6;         // [2:0.5:40]
// OUTLINE: width of the halo hugging the whole word (mm)
outline_width = 3;      // [0.5:0.5:12]
// OUTLINE: fill the letter centres so only the outer contour shows (no holes)
outline_fill = true;
// OUTLINE: straight bottom lip below the letters, to stand on (mm)
bottom_margin = 3;      // [0:0.5:20]
// How the PLATE is sized
plate_sizing = "auto";  // [auto, chart, manual]
// PLATE length for manual sizing (mm)
plate_length = 90;      // [10:0.5:220]
// PLATE height (used by chart & manual) (mm)
plate_height = 24;      // [10:0.5:80]
// PLATE auto-mode gap between letters and edge (mm)
padding = 5;            // [0:0.5:25]
// PLATE corner rounding (mm)
corner_radius = 4;      // [0:0.5:30]

/* [Stand] */
// An L-foot stand: the panel leans back on a horizontal foot.
// Display angle when standing on the desk (degrees from vertical)
display_angle = 15;     // [0:1:45]
// Foot depth — how far the foot runs forward (mm)
foot_depth = 35;        // [8:1:80]
// Foot thickness — thickness of the foot shelf (mm)
foot_thickness = 4;     // [1:0.5:12]

/* [Logo] */
// Path to a logo file to emboss on the front face. SVG or DXF only — OpenSCAD
// can't trace a raster, so the web modeler handles PNG/JPG. Leave blank for none.
logo_file = "";
// Logo width as a percentage of the sign width
logo_size = 28;         // [5:1:100]
// Where the logo sits on the face: row (t/m/b) + column (l/c/r)
logo_anchor = "tr";     // [tl, tc, tr, ml, mc, mr, bl, bc, br]
// Nudge the logo left/right from its anchor (mm)
logo_offset_x = 0;      // [-100:0.5:100]
// Nudge the logo up/down from its anchor (mm)
logo_offset_y = 0;      // [-100:0.5:100]
// Rotate the logo (degrees)
logo_rotate = 0;        // [-180:1:180]
// How far the logo stands off the front face (mm)
logo_raise = 1.6;       // [0.4:0.1:8]

/* [Overall Size] */
// Scale the whole model. 100 = base size, 150 = 1.5x (default)
model_scale = 150;      // [50:5:400]

/* [Colours (preview only)] */
// Letter colour in the preview
text_color = "#ffffff";
// Base / stand colour in the preview
base_color = "#e11d63";

/* [Quality] */
// Smoothness of curves & circles
smoothness = 64;        // [24:8:160]

/* [Hidden] */
$fn = smoothness;

// ── Derived values ──────────────────────────────────────────────────────────
lines   = [for (s = [line1, line2, line3]) if (len(s) > 0) s];
nlines  = len(lines);
step    = text_size * line_spacing;
longest = max([for (s = lines) len(s)]);
// crude glyph-width estimate (the web app measures the real glyphs)
est_w   = longest * text_size * 0.62;
est_h   = nlines * text_size + (nlines - 1) * (step - text_size);

// chart cheat-sheet: plate length (mm) by character count of the longest line
function chart_len(n) =
      n <= 2 ? 25
    : n == 3 ? 35
    : n == 4 ? 42
    : n == 5 ? 48
    : n == 6 ? 50
    : n == 7 ? 60.57
    : n == 8 ? 61
    : n == 9 ? 77.82
    :          77.82 + (n - 9) * 16.82;

plate_L = (plate_sizing == "manual") ? plate_length
        : (plate_sizing == "chart")  ? chart_len(longest)
        :                              est_w + padding * 2;   // auto
plate_H = (plate_sizing == "auto") ? est_h + padding * 2 : plate_height;

has_body = (base_style != "none");
text_z   = has_body ? sign_depth : 0;

// bottom of the body in Y, used to seat the stand
body_bottom =
      (base_style == "plate") ? -plate_H / 2
    : (base_style == "outline") ? -(est_h / 2) - outline_width - bottom_margin
    :                             -(est_h / 2) - bottom_margin;

s = model_scale / 100;  // overall scale

// ── 2D building blocks ──────────────────────────────────────────────────────
// stacked, centred text lines
module text2d() {
    for (i = [0 : nlines - 1])
        translate([0, ((nlines - 1) / 2 - i) * step, 0])
            text(lines[i], size = text_size, font = font,
                 halign = "center", valign = "center");
}

// text scaled to fill a fixed plate (keeps aspect); raw size otherwise
module text2d_fitted() {
    if (base_style == "plate" && plate_sizing != "auto" && fit_text)
        resize([plate_L - 2 * text_margin, 0], auto = true) text2d();
    else
        text2d();
}

module rrect(w, h, r) {
    rr = max(0, min(r, w / 2, h / 2));
    offset(r = rr) square([max(0.01, w - 2 * rr), max(0.01, h - 2 * rr)], center = true);
}

// merged-glyph silhouette; fill closes the letter centres (dilate then erode)
module silhouette2d() {
    fill_r = text_size * 0.5;
    if (outline_fill)
        offset(r = outline_width) offset(delta = -fill_r) offset(delta = fill_r) text2d();
    else
        offset(r = outline_width) text2d();
}

// silhouette welded to a straight-bottomed lip so the sign stands flat
module outline2d() {
    lip_w = est_w + outline_width * 2;
    lip_top = -(est_h / 2);                       // just under the letters
    lip_bot = lip_top - outline_width - bottom_margin;
    union() {
        silhouette2d();
        translate([0, (lip_top + lip_bot) / 2, 0])
            square([lip_w, lip_top - lip_bot], center = true);
    }
}

module base2d() {
    if (base_style == "plate")   rrect(plate_L, plate_H, corner_radius);
    else if (base_style == "outline") outline2d();
    // "none" -> no backing
}

// ── Solids ────────────────────────────────────────────────────────────────
module body_solid() {
    linear_extrude(height = sign_depth) base2d();
}

module text_solid() {
    translate([0, 0, text_z])
        linear_extrude(height = text_raise) text2d_fitted();
}

// ── Logo ─────────────────────────────────────────────────────────────────────
body_w = (base_style == "plate") ? plate_L : est_w + outline_width * 2;
face_l = -body_w / 2;
face_r =  body_w / 2;
face_t = (base_style == "plate") ?  plate_H / 2 :  est_h / 2 + outline_width;
face_b = (base_style == "plate") ? -plate_H / 2 : -est_h / 2 - outline_width;
logo_margin = 2;
lrow = (len(logo_anchor) > 0) ? logo_anchor[0] : "m";
lcol = (len(logo_anchor) > 1) ? logo_anchor[1] : "c";
logo_x = (lcol == "l") ? face_l + logo_margin : (lcol == "r") ? face_r - logo_margin : 0;
logo_y = (lrow == "b") ? face_b + logo_margin : (lrow == "t") ? face_t - logo_margin : (face_t + face_b) / 2;

// Logo embossed on the front face. Center-anchored (approximate) — nudge with
// the offsets. SVG/DXF only; import() can't read a raster.
module logo_solid() {
    if (logo_file != "")
        translate([logo_x + logo_offset_x, logo_y + logo_offset_y, text_z])
            rotate([0, 0, logo_rotate])
                linear_extrude(height = logo_raise)
                    resize([logo_size / 100 * body_w, 0], auto = true)
                        import(file = logo_file, center = true);
}

// ── Assemble (L-foot stand) ─────────────────────────────────────────────────
// The panel (body + text + logo) sits at the FRONT of a flat foot and leans back
// over it; the foot runs backward underneath the lean for stability — an L in
// side view. (OpenSCAD is Z-up, so the panel is stood up here; the web app
// builds the same shape in its own frame.)
scale([s, s, s]) {
    // flat foot on the ground, running back (-Y) under the lean
    color(base_color)
        translate([0, (sign_depth - foot_depth) / 2, foot_thickness / 2])
            cube([body_w + 6, foot_depth + sign_depth, foot_thickness], center = true);
    // panel at the front, pivoted about its bottom-front edge, leaning back
    translate([0, sign_depth, foot_thickness])
        rotate([90 + display_angle, 0, 0])
            translate([0, -body_bottom, -sign_depth]) {
                if (has_body) color(base_color) body_solid();
                color(text_color) text_solid();
                color(text_color) logo_solid();
            }
}
